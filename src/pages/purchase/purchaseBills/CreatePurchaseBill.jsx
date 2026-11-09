import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { Button, Checkbox, DocumentLayout, FormGrid, Input, Section, Textarea, TotalsPanel, TotalsRow, useShortcuts } from '@/components/ui';
import PurchaseToaster from '../components/PurchaseToaster';
import PurchaseLineEditor from '../components/PurchaseLineEditor';
import SupplierPicker from '../components/SupplierPicker';
import { TotalsEditor } from '../components/Totals';
import { Field, FormError, PageLoading, StatusBadge } from '../components/ui';
import useSupplierInfo from '../components/useSupplierInfo';
import { notify, notifyError } from '../components/toast';
import {
  addDaysISO,
  computeTotals,
  decId,
  docPricing,
  emptyLine,
  errMsg,
  fmtDate,
  formatINR,
  inferOverallDiscount,
  lineFromDoc,
  linesToPayload,
  num,
  refId,
  supplierName,
  toInputDate,
  todayISO,
  validateLines,
  viewPath,
} from '../components/helpers';
import { confirmPurchaseBill, createPurchaseBill, fetchPurchaseBill, updatePurchaseBill } from './services/purchaseBillSlice';
import PriceChangeConfirm from '../components/PriceChangeConfirm';
import { firstBarcodeProblem, priceChangesOf, stockInCheck, stockInFromSaved, stockInPayload, useStockInPricing } from '../components/stockInPricing';

/**
 * A direct purchase bill (walk-in purchases, services, expenses). Goods ordered on a purchase
 * order come in with the order's "Save & Receive", which makes its own bill.
 */
function PurchaseBillForm({ doc, init }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const saving = useSelector((state) => state.purchaseBill.saving);
  const isEdit = !!doc;
  // An old draft made from goods receipts: its goods are already in stock.
  const fromGrn = !!(doc && (doc.grnIds || []).length);

  const [supplier, setSupplier] = useState(() =>
    doc ? { value: refId(doc.supplierId), label: supplierName(doc) } : init?.supplierId ? { value: init.supplierId, label: '' } : null
  );
  const [supplierBillNo, setSupplierBillNo] = useState(() => doc?.supplierBillNo || '');
  const [billDate, setBillDate] = useState(() => (doc ? toInputDate(doc.billDate) : todayISO()));
  const [dueManual, setDueManual] = useState(() => (doc ? toInputDate(doc.dueDate) : ''));
  const [dueTouched, setDueTouched] = useState(() => !!doc);
  const [lines, setLines] = useState(() =>
    doc ? doc.items.map((i) => (fromGrn ? lineFromDoc(i) : { ...lineFromDoc(i), ...stockInFromSaved(i) })) : [emptyLine()]
  );
  const [updateStock, setUpdateStock] = useState(() => (doc ? doc.updateStock !== false : true));
  const [overallDiscountPercent, setOverallDiscountPercent] = useState(() => (doc ? inferOverallDiscount(doc) : 0));
  const [otherCharges, setOtherCharges] = useState(() => (doc ? num(doc.otherCharges) : 0));
  const [roundOff, setRoundOff] = useState(() => (doc ? num(doc.roundOff) !== 0 : true));
  const [notes, setNotes] = useState(() => doc?.notes || '');
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');
  const [showPriceDetails, setShowPriceDetails] = useState(false);
  const [showMore, setShowMore] = useState(() => !!(doc && (doc.updateStock === false || doc.notes)));

  const { info: supplierInfo, loading: supplierLoading } = useSupplierInfo(supplier?.value);
  const terms = supplierInfo ? num(supplierInfo.paymentTermsDays) : null;
  const dueDate = dueTouched ? dueManual : terms !== null ? addDaysISO(billDate, terms) : '';

  // A bill that puts goods into stock brings in new batches → SP, MRP (required), batch,
  // expiry, low-stock alert.
  const pricing = useStockInPricing(lines.map((l) => l.productId));
  const stockInOn = !fromGrn && updateStock;
  // a barcode in use / on hold elsewhere blocks "Save bill" (a draft may still be saved)
  const barcodeBlock = stockInOn ? firstBarcodeProblem(lines) : '';
  const infoOf = (l) => pricing.prices[String(l.productId)];
  const baseCost = (l) => (num(l.rate) * (1 - num(l.discountPercent) / 100)) / (l.units.find((u) => u.unit === l.unit)?.factor || 1);
  const [pendingChanges, setPendingChanges] = useState([]);

  // GST from the GST master (the server uses the same). Old GRN drafts: the GRN's GST.
  const gstLines = useMemo(
    () =>
      fromGrn
        ? lines
        : lines.map((l) => {
            const info = pricing.prices[String(l.productId)];
            return info && info.gstRate !== undefined ? { ...l, taxPercent: num(info.gstRate) } : l;
          }),
    [fromGrn, lines, pricing.prices]
  );
  const totals = useMemo(
    () => computeTotals(gstLines, { overallDiscountPercent, otherCharges, roundOff, isInterState: doc ? !!doc.isInterState : undefined }),
    [gstLines, overallDiscountPercent, otherCharges, roundOff, doc]
  );

  const save = (status) => {
    setSubmitted(true);
    let problem;
    if (!supplier?.value) problem = 'Select a supplier.';
    else if (dueDate && billDate && dueDate < billDate) problem = 'Due date cannot be before the bill date.';
    else problem = validateLines(lines);
    if (!problem) problem = lines.filter((l) => l.productId && !(num(l.rate) > 0)).map((l) => `Enter the cost price for "${l.productName}".`)[0] || '';
    if (!problem && stockInOn) problem = lines.filter((l) => l.productId).map((l) => stockInCheck(l, infoOf(l), baseCost(l)).error).find(Boolean) || '';
    if (!problem && stockInOn && status === 'confirmed') problem = firstBarcodeProblem(lines);
    setFormError(problem);
    if (problem) {
      notifyError(problem);
      return;
    }
    // Changed SP: confirm "₹A → ₹B from today" before the goods are put into stock.
    const changes = stockInOn && status === 'confirmed' ? priceChangesOf(lines, pricing.prices) : [];
    if (changes.length) {
      setPendingChanges(changes);
      return;
    }
    persist(status);
  };

  const persist = async (status) => {
    setPendingChanges([]);
    const used = lines.filter((l) => l.productId);
    // stock-in: GST % is not asked — the server takes it from the product
    const items = linesToPayload(used).map((item, i) => {
      if (!stockInOn) return item;
      const l = used[i];
      const out = { ...item, ...stockInPayload(l, infoOf(l)) };
      if (l.lowStockAlert !== '' && l.lowStockAlert !== null && l.lowStockAlert !== undefined) out.lowStockAlert = num(l.lowStockAlert);
      delete out.taxPercent;
      return out;
    });
    const payload = {
      supplierId: supplier.value,
      supplierBillNo: supplierBillNo.trim(),
      billDate,
      dueDate: dueDate || null,
      updateStock: fromGrn ? false : updateStock,
      items,
      ...docPricing({ overallDiscountPercent, otherCharges, roundOff }),
      notes,
    };

    try {
      let saved;
      if (isEdit) {
        const res = await dispatch(updatePurchaseBill({ id: doc._id, payload })).unwrap();
        saved = res?.data;
        if (status === 'confirmed') {
          const conf = await dispatch(confirmPurchaseBill(doc._id)).unwrap();
          saved = conf?.data || saved;
          notify(conf?.message || 'Bill saved');
        } else {
          notify(res?.message || 'Bill updated');
        }
      } else {
        const res = await dispatch(createPurchaseBill({ ...payload, status })).unwrap();
        saved = res?.data;
        notify(res?.message || (status === 'draft' ? 'Saved — finish it later' : 'Bill saved'));
      }
      // The bill screen has the "Pay this bill" panel.
      navigate(viewPath('bills', saved?._id || doc._id), { replace: true });
    } catch (e) {
      const msg = errMsg(e);
      setFormError(msg);
      notifyError(msg);
    }
  };

  const stockNote = fromGrn
    ? 'These goods are already in stock from an old goods receipt.'
    : updateStock
      ? 'The items will be added to stock when you save.'
      : 'The items will not be added to stock.';

  const addLine = () => setLines((ls) => [...ls, emptyLine()]);
  useShortcuts({ ...(fromGrn ? {} : { F2: addLine }), 'mod+s': () => !saving && save('draft') });

  const saveButton = (className) => (
    <Button
      onClick={() => save('confirmed')}
      disabled={!!barcodeBlock}
      loading={saving}
      title={barcodeBlock || undefined}
      startIcon={<CheckCircle2 />}
      className={className}
    >
      Save bill
    </Button>
  );

  return (
    <DocumentLayout
      header={{
        title: isEdit ? 'Edit bill' : 'Record a purchase bill',
        docNo: isEdit ? doc.billNumber : undefined,
        description: isEdit ? undefined : (
          <>
            For goods you ordered on a purchase, open the purchase and use <span className="font-semibold text-ink">Save &amp; Receive</span> — it records the bill for you.
          </>
        ),
        actions: (
          <>
            {isEdit && <StatusBadge status={doc.status} size="lg" />}
            <Button variant="ghost" onClick={() => navigate(-1)} className="hidden sm:inline-flex">
              Cancel
            </Button>
            <Button variant="secondary" onClick={() => save('draft')} disabled={saving} startIcon={<Save />}>
              Save &amp; finish later
            </Button>
            {saveButton('hidden lg:inline-flex')}
          </>
        ),
      }}
      summary={
        <TotalsPanel
          title="Total"
          totalLabel="Total to pay (incl. GST)"
          total={formatINR(totals.totalAmount)}
          note={`${stockNote}${fromGrn ? '' : ' F2 adds an item ·'} Ctrl S saves for later.`}
        >
          {dueDate && <TotalsRow label="Pay by" value={fmtDate(dueDate)} />}
          <Button
            variant="link"
            size="xs"
            onClick={() => setShowPriceDetails((v) => !v)}
            startIcon={showPriceDetails ? <ChevronUp /> : <ChevronDown />}
            className="self-start text-highlight"
          >
            {showPriceDetails ? 'Hide price details' : 'Price details, discount & freight'}
          </Button>
          {showPriceDetails && (
            <TotalsEditor
              totals={totals}
              overallDiscountPercent={overallDiscountPercent}
              onOverallDiscountChange={setOverallDiscountPercent}
              otherCharges={otherCharges}
              onOtherChargesChange={setOtherCharges}
              roundOff={roundOff}
              onRoundOffChange={setRoundOff}
              showTotal={false}
            />
          )}
        </TotalsPanel>
      }
      mobileBar={{ label: 'Total to pay', value: formatINR(totals.totalAmount), action: saveButton() }}
    >
      <FormError message={formError} />

      <Section title="Bill details" description="Who sent the bill and when it is due.">
        <div className="flex flex-col gap-4">
          <Field label="Supplier" required error={submitted && !supplier?.value ? 'Select a supplier' : ''}>
            <SupplierPicker
              value={supplier}
              onChange={(opt) => setSupplier(opt ? { value: opt.value, label: opt.label } : null)}
              info={supplierInfo}
              infoLoading={supplierLoading}
              error={submitted && !supplier?.value}
            />
          </Field>
          {supplierInfo && !supplierInfo.gstin && (
            <p className="m-0 rounded-control bg-warning-soft px-3.5 py-2.5 text-xs font-medium text-warning">
              This supplier has no GSTIN, so the GST you pay cannot be claimed back. It is added to the item cost.
            </p>
          )}
          <FormGrid cols={3}>
            <Field label="Bill number on the supplier's bill" hint="Helps catch the same bill entered twice.">
              <Input value={supplierBillNo} maxLength={50} onChange={(e) => setSupplierBillNo(e.target.value)} placeholder="e.g. INV/2026/0451" />
            </Field>
            <Field label="Bill date" required>
              <Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
            </Field>
            <Field
              label="Pay by"
              hint={
                dueTouched
                  ? terms !== null
                    ? (
                      <Button variant="link" size="xs" onClick={() => setDueTouched(false)}>
                        Use supplier&apos;s {terms}-day credit again
                      </Button>
                    )
                    : null
                  : terms !== null
                    ? `Bill date + ${terms} days credit from this supplier`
                    : 'Set automatically from the supplier’s credit days'
              }
            >
              <Input
                type="date"
                value={dueDate}
                min={billDate}
                onChange={(e) => {
                  setDueTouched(true);
                  setDueManual(e.target.value);
                }}
              />
            </Field>
          </FormGrid>
        </div>
      </Section>

      <Section title="Items on the bill" description="Cost price is per unit before GST; GST comes from the product." bodyClassName="px-3 sm:px-4">
        <PurchaseLineEditor
          lines={lines}
          onChange={setLines}
          submitted={submitted}
          options={
            fromGrn
              ? { lockProducts: true }
              : {
                  gstRates: pricing.prices,
                  ...(stockInOn ? { stockIn: { prices: pricing.prices, canUpdatePrices: pricing.canUpdatePrices } } : {}),
                  addShortcut: 'F2',
                }
          }
        />
      </Section>

      <div className="flex flex-col gap-3">
        <Button
          variant="link"
          size="sm"
          onClick={() => setShowMore((v) => !v)}
          startIcon={showMore ? <ChevronUp /> : <ChevronDown />}
          className="self-start"
        >
          {showMore ? 'Hide more options' : 'More options (note, stock)'}
        </Button>
        {showMore && (
          <Section>
            <div className="flex flex-col gap-4">
              {!fromGrn && (
                <Checkbox
                  checked={!updateStock}
                  onChange={(checked) => setUpdateStock(!checked)}
                  label="Don't add these items to stock"
                  description="For bills like repairs, services or shop expenses."
                />
              )}
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Note (optional) — anything to remember about this bill" />
            </div>
          </Section>
        )}
      </div>

      <PriceChangeConfirm changes={pendingChanges} onClose={() => setPendingChanges([])} onConfirm={() => persist('confirmed')} isLoading={saving} />
      <PurchaseToaster />
    </DocumentLayout>
  );
}

/**
 * purchase/bills/create   (optional location.state = { supplierId })
 * purchase/bills/edit/:id
 */
export default function CreatePurchaseBill() {
  const { id: encryptedId } = useParams();
  const id = decId(encryptedId);
  const location = useLocation();
  const dispatch = useDispatch();
  const { current, currentError } = useSelector((state) => state.purchaseBill);
  const [init] = useState(() => location.state || null);

  useEffect(() => {
    if (id) dispatch(fetchPurchaseBill(id));
  }, [dispatch, id]);

  if (!encryptedId) return <PurchaseBillForm key="new" doc={null} init={init} />;
  if (!id) return <PageLoading title="Edit bill" error="This link is not valid." />;
  if (!current || current._id !== id) return <PageLoading title="Edit bill" error={currentError} />;
  if (current.status !== 'draft') return <PageLoading title={`Bill ${current.billNumber}`} error="Only draft bills can be edited." />;
  return <PurchaseBillForm key={current._id} doc={current} init={null} />;
}

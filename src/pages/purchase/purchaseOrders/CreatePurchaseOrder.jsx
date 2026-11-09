import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { PackageCheck, Save } from 'lucide-react';
import { Button, DocumentLayout, FormGrid, Input, Section, Textarea, TotalsPanel, useShortcuts } from '@/components/ui';
import PurchaseToaster from '../components/PurchaseToaster';
import PurchaseLineEditor from '../components/PurchaseLineEditor';
import SupplierPicker from '../components/SupplierPicker';
import { TotalsEditor } from '../components/Totals';
import { Field, FormError, PageLoading, StatusBadge } from '../components/ui';
import useSupplierInfo from '../components/useSupplierInfo';
import PriceChangeConfirm from '../components/PriceChangeConfirm';
import { firstBarcodeProblem, priceChangesOf, stockInCheck, stockInFromSaved, stockInPayload, useStockInPricing } from '../components/stockInPricing';
import { notify, notifyError } from '../components/toast';
import {
  addDaysISO,
  computeTotals,
  decId,
  docPricing,
  emptyLine,
  errMsg,
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
import { createPurchaseOrder, fetchPurchaseOrder, updatePurchaseOrder } from './services/purchaseOrderSlice';

/** Draft, or an old "sent" order with nothing received yet — both can still be edited and received. */
const isOpenDraft = (po) => po.status === 'draft' || (po.status === 'sent' && !po.purchaseBillId && (po.items || []).every((i) => !(num(i.receivedQty) > 0)));

/**
 * Purchase form.
 * - Save as Draft: nothing moves.
 * - Save & Receive: the goods go into stock (batch, MRP, SP, expiry from the lines) and a
 *   purchase bill linked to this order is recorded (supplier balance goes up).
 */
function PurchaseOrderForm({ doc }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const saving = useSelector((state) => state.purchaseOrder.saving);
  const isEdit = !!doc;

  const [supplier, setSupplier] = useState(() => (doc ? { value: refId(doc.supplierId), label: supplierName(doc) } : null));
  const [poDate, setPoDate] = useState(() => (doc ? toInputDate(doc.poDate) : todayISO()));
  const [expectedDate, setExpectedDate] = useState(() => (doc ? toInputDate(doc.expectedDate) : ''));
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState(() => doc?.supplierInvoiceNo || '');
  const [supplierInvoiceDate, setSupplierInvoiceDate] = useState(() => (doc ? toInputDate(doc.supplierInvoiceDate) : ''));
  const [dueManual, setDueManual] = useState(() => (doc ? toInputDate(doc.dueDate) : ''));
  const [dueTouched, setDueTouched] = useState(() => !!doc?.dueDate);
  const [lines, setLines] = useState(() => (doc ? doc.items.map((i) => ({ ...lineFromDoc(i), ...stockInFromSaved(i) })) : [emptyLine()]));
  // a barcode in use / on hold elsewhere blocks Save & Receive (a draft may still be saved)
  const barcodeBlock = firstBarcodeProblem(lines);
  const [overallDiscountPercent, setOverallDiscountPercent] = useState(() => (doc ? inferOverallDiscount(doc) : 0));
  const [otherCharges, setOtherCharges] = useState(() => (doc ? num(doc.otherCharges) : 0));
  const [roundOff, setRoundOff] = useState(() => (doc ? num(doc.roundOff) !== 0 : true));
  const [notes, setNotes] = useState(() => doc?.notes || '');
  const [terms, setTerms] = useState(() => doc?.terms || '');
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');
  const [pendingChanges, setPendingChanges] = useState([]);

  const { info: supplierInfo, loading: supplierLoading } = useSupplierInfo(supplier?.value);
  const creditDays = supplierInfo ? num(supplierInfo.paymentTermsDays) : null;
  const invoiceDay = supplierInvoiceDate || poDate;
  const dueDate = dueTouched ? dueManual : creditDays !== null ? addDaysISO(invoiceDay, creditDays) : '';

  // The goods come in with this order: SP, MRP (required to receive), batch, expiry, low-stock
  // alert per line; GST from the GST master (the server uses the same).
  const pricing = useStockInPricing(lines.map((l) => l.productId));
  const infoOf = (l) => pricing.prices[String(l.productId)];
  const baseCost = (l) => (num(l.rate) * (1 - num(l.discountPercent) / 100)) / (l.units.find((u) => u.unit === l.unit)?.factor || 1);
  const gstLines = useMemo(
    () =>
      lines.map((l) => {
        const info = pricing.prices[String(l.productId)];
        return info && info.gstRate !== undefined ? { ...l, taxPercent: num(info.gstRate) } : l;
      }),
    [lines, pricing.prices]
  );
  const totals = useMemo(
    () => computeTotals(gstLines, { overallDiscountPercent, otherCharges, roundOff, isInterState: doc ? !!doc.isInterState : undefined }),
    [gstLines, overallDiscountPercent, otherCharges, roundOff, doc]
  );

  const save = (action) => {
    setSubmitted(true);
    let problem;
    if (!supplier?.value) problem = 'Select a supplier.';
    else if (expectedDate && poDate && expectedDate < poDate) problem = 'Expected delivery date cannot be before the purchase date.';
    else if (dueDate && invoiceDay && dueDate < invoiceDay) problem = 'Due date cannot be before the invoice date.';
    else problem = validateLines(lines);
    if (!problem) problem = lines.filter((l) => l.productId && !(num(l.rate) > 0)).map((l) => `Enter the cost price for "${l.productName}".`)[0] || '';
    // Receiving brings in new batches: MRP needed, SP checked.
    if (!problem && action === 'receive') problem = lines.filter((l) => l.productId).map((l) => stockInCheck(l, infoOf(l), baseCost(l)).error).find(Boolean) || '';
    if (!problem && action === 'receive') problem = firstBarcodeProblem(lines);
    setFormError(problem);
    if (problem) {
      notifyError(problem);
      return;
    }
    // Changed SP: confirm "₹A → ₹B from today" before the goods are put into stock.
    const changes = action === 'receive' ? priceChangesOf(lines, pricing.prices) : [];
    if (changes.length) {
      setPendingChanges(changes);
      return;
    }
    persist(action);
  };

  const persist = async (action) => {
    setPendingChanges([]);
    const used = lines.filter((l) => l.productId);
    // GST % is not sent — the server takes it from the GST master
    const items = linesToPayload(used).map((item, i) => {
      const l = used[i];
      const out = { ...item, ...stockInPayload(l, infoOf(l)) };
      if (l.lowStockAlert !== '' && l.lowStockAlert !== null && l.lowStockAlert !== undefined) out.lowStockAlert = num(l.lowStockAlert);
      delete out.taxPercent;
      return out;
    });
    const payload = {
      supplierId: supplier.value,
      poDate,
      expectedDate: expectedDate || null,
      supplierInvoiceNo: supplierInvoiceNo.trim(),
      supplierInvoiceDate: supplierInvoiceDate || null,
      dueDate: dueDate || null,
      items,
      ...docPricing({ overallDiscountPercent, otherCharges, roundOff }),
      notes,
      terms,
      action,
    };

    try {
      const res = isEdit
        ? await dispatch(updatePurchaseOrder({ id: doc._id, payload })).unwrap()
        : await dispatch(createPurchaseOrder(payload)).unwrap();
      const saved = res?.data;
      notify(res?.message || (action === 'receive' ? 'Purchase received' : 'Draft saved'));
      navigate(viewPath('orders', saved?._id || doc._id), { replace: true });
    } catch (e) {
      const msg = errMsg(e);
      setFormError(msg);
      notifyError(msg);
    }
  };

  const addLine = () => setLines((ls) => [...ls, emptyLine()]);
  useShortcuts({ F2: addLine, 'mod+s': () => !saving && save('draft') });

  const receiveButton = (className) => (
    <Button
      onClick={() => save('receive')}
      disabled={!!barcodeBlock}
      loading={saving}
      title={barcodeBlock || undefined}
      startIcon={<PackageCheck />}
      className={className}
    >
      Save &amp; Receive
    </Button>
  );

  return (
    <DocumentLayout
      header={{
        title: isEdit ? 'Edit purchase' : 'New purchase',
        docNo: isEdit ? doc.poNumber : undefined,
        actions: (
          <>
            {isEdit && <StatusBadge status={doc.status} size="lg" />}
            <Button variant="ghost" onClick={() => navigate(-1)} className="hidden sm:inline-flex">
              Cancel
            </Button>
            <Button variant="secondary" onClick={() => save('draft')} disabled={saving} startIcon={<Save />}>
              Save as Draft
            </Button>
            {receiveButton('hidden lg:inline-flex')}
          </>
        ),
      }}
      summary={
        <TotalsPanel
          title="Order summary"
          total={formatINR(totals.totalAmount)}
          note="Save & Receive puts the goods into stock and records the supplier's bill. A draft moves no stock. F2 adds an item · Ctrl S saves a draft."
        >
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
        </TotalsPanel>
      }
      mobileBar={{ label: 'Total', value: formatINR(totals.totalAmount), action: receiveButton() }}
    >
      <FormError message={formError} />

      <Section title="Supplier" description="Who you're buying from and when you need it.">
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
          <FormGrid cols={3}>
            <Field label="Purchase date" required>
              <Input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} />
            </Field>
            <Field label="Expected delivery">
              <Input type="date" value={expectedDate} min={poDate} onChange={(e) => setExpectedDate(e.target.value)} />
            </Field>
            <Field
              label="Pay by"
              hint={
                dueTouched
                  ? creditDays !== null
                    ? <Button variant="link" size="xs" className="font-semibold" onClick={() => setDueTouched(false)}>Use supplier&apos;s {creditDays}-day credit again</Button>
                    : null
                  : creditDays !== null
                    ? `Invoice date + ${creditDays} days credit from this supplier`
                    : 'Set automatically from the supplier’s credit days'
              }
            >
              <Input
                type="date"
                value={dueDate}
                min={invoiceDay}
                onChange={(e) => {
                  setDueTouched(true);
                  setDueManual(e.target.value);
                }}
              />
            </Field>
            <Field label="Supplier invoice no." hint="From the supplier's bill. Helps catch the same bill entered twice.">
              <Input value={supplierInvoiceNo} maxLength={50} onChange={(e) => setSupplierInvoiceNo(e.target.value)} placeholder="e.g. INV/2026/0451" />
            </Field>
            <Field label="Supplier invoice date">
              <Input type="date" value={supplierInvoiceDate} onChange={(e) => setSupplierInvoiceDate(e.target.value)} />
            </Field>
          </FormGrid>
        </div>
      </Section>

      <Section title="Items" description="Cost price is per unit before GST; GST comes from the product." bodyClassName="px-3 sm:px-4">
        <PurchaseLineEditor
          lines={lines}
          onChange={setLines}
          submitted={submitted}
          options={{ gstRates: pricing.prices, stockIn: { prices: pricing.prices, canUpdatePrices: pricing.canUpdatePrices }, addShortcut: 'F2' }}
        />
      </Section>

      <Section title="Notes & terms" description="Printed on the purchase.">
        <FormGrid cols={2}>
          <Field label="Notes for supplier">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Delivery instructions, contact person..." />
          </Field>
          <Field label="Terms & conditions">
            <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={3} placeholder="Payment terms, packing, warranty..." />
          </Field>
        </FormGrid>
      </Section>

      <PriceChangeConfirm changes={pendingChanges} onClose={() => setPendingChanges([])} onConfirm={() => persist('receive')} isLoading={saving} />
      <PurchaseToaster />
    </DocumentLayout>
  );
}

/**
 * purchase/orders/create
 * purchase/orders/edit/:id   (drafts; old "sent" orders with nothing received)
 */
export default function CreatePurchaseOrder() {
  const { id: encryptedId } = useParams();
  const id = decId(encryptedId);
  const dispatch = useDispatch();
  const { current, currentError } = useSelector((state) => state.purchaseOrder);

  useEffect(() => {
    if (id) dispatch(fetchPurchaseOrder(id));
  }, [dispatch, id]);

  if (!encryptedId) return <PurchaseOrderForm key="new" doc={null} />;
  if (!id) return <PageLoading title="Edit purchase" error="This link is not valid." />;
  if (!current || current._id !== id) return <PageLoading title="Edit purchase" error={currentError} />;
  if (!isOpenDraft(current)) {
    return <PageLoading title={`Purchase ${current.poNumber}`} error={`A ${current.status.replace('_', ' ')} purchase can't be edited.`} />;
  }
  return <PurchaseOrderForm key={current._id} doc={current} />;
}

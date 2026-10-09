import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Save } from 'lucide-react';
import Button from '@/components/inputs/Button';
import { Input } from '@/components/inputs/Input';
import PurchaseToaster from '../components/PurchaseToaster';
import PurchaseLineEditor from '../components/PurchaseLineEditor';
import SupplierPicker from '../components/SupplierPicker';
import { TotalsEditor } from '../components/Totals';
import { EmptyState, Field, FormError, NativeSelect, PageLoading, PageShell, Section, StatusBadge, TextArea } from '../components/ui';
import useApi from '../components/useApi';
import useStores from '../components/useStores';
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
  productTax,
  refId,
  supplierName,
  toInputDate,
  todayISO,
  validateLines,
  viewPath,
} from '../components/helpers';
import { getGoodsReceiptByIdApi, getGoodsReceiptsApi } from '../goodsReceipts/services/goodsReceiptService';
import { confirmPurchaseBill, createPurchaseBill, fetchPurchaseBill, updatePurchaseBill } from './services/purchaseBillSlice';

/** Bill lines from a posted GRN: accepted qty, unit cost as rate, product GST. */
const loadGrn = async (grnId) => {
  const res = await getGoodsReceiptByIdApi(grnId);
  const grn = res?.data;
  const lines = (grn?.items || [])
    .filter((i) => num(i.acceptedQty) > 0)
    .map((i) => {
      const p = typeof i.productId === 'object' ? i.productId : null;
      return {
        ...emptyLine(),
        grnId,
        productId: refId(i.productId),
        productName: i.productName,
        sku: i.sku || p?.sku || '',
        hsnCode: p?.hsnSacCode || '',
        unit: i.unit,
        units: [{ unit: i.unit, factor: num(i.unitFactor) || 1 }],
        qty: num(i.acceptedQty),
        rate: num(i.unitCost),
        taxPercent: p ? productTax(p) : '',
      };
    });
  return { grn, lines };
};

function PurchaseBillForm({ doc, init }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const saving = useSelector((state) => state.purchaseBill.saving);
  const { options: storeOptions, defaultId: defaultStoreId, loading: storesLoading } = useStores();
  const isEdit = !!doc;

  const initGrnIds = doc ? (doc.grnIds || []).map(refId) : init?.grnIds || [];
  const [supplier, setSupplier] = useState(() =>
    doc ? { value: refId(doc.supplierId), label: supplierName(doc) } : init?.supplierId ? { value: init.supplierId, label: '' } : null
  );
  const [storeId, setStoreId] = useState(() => (doc ? refId(doc.storeId) : init?.storeId || ''));
  const [supplierBillNo, setSupplierBillNo] = useState(() => doc?.supplierBillNo || '');
  const [billDate, setBillDate] = useState(() => (doc ? toInputDate(doc.billDate) : todayISO()));
  const [dueManual, setDueManual] = useState(() => (doc ? toInputDate(doc.dueDate) : ''));
  const [dueTouched, setDueTouched] = useState(() => !!doc);
  const [mode, setMode] = useState(() => (initGrnIds.length ? 'grn' : 'direct'));
  const [selectedGrns, setSelectedGrns] = useState(() => initGrnIds);
  const [grnLines, setGrnLines] = useState(() => (doc && initGrnIds.length ? doc.items.map((i) => ({ ...lineFromDoc(i), grnId: '__doc' })) : []));
  const [grnLoading, setGrnLoading] = useState(() => (!doc && initGrnIds.length > 0 ? initGrnIds : []));
  const [directLines, setDirectLines] = useState(() => (doc && !initGrnIds.length ? doc.items.map(lineFromDoc) : [emptyLine()]));
  const [updateStock, setUpdateStock] = useState(() => (doc ? doc.updateStock !== false : true));
  const [overallDiscountPercent, setOverallDiscountPercent] = useState(() => (doc ? inferOverallDiscount(doc) : 0));
  const [otherCharges, setOtherCharges] = useState(() => (doc ? num(doc.otherCharges) : 0));
  const [roundOff, setRoundOff] = useState(() => (doc ? num(doc.roundOff) !== 0 : true));
  const [notes, setNotes] = useState(() => doc?.notes || '');
  const [purchaseOrderId] = useState(() => (doc ? refId(doc.purchaseOrderId) : init?.purchaseOrderId || ''));
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  const { info: supplierInfo, loading: supplierLoading } = useSupplierInfo(supplier?.value);
  const effectiveStoreId = storeId || defaultStoreId;
  const terms = supplierInfo ? num(supplierInfo.paymentTermsDays) : null;
  const dueDate = dueTouched ? dueManual : terms !== null ? addDaysISO(billDate, terms) : '';

  const { data: unbilledRes, loading: unbilledLoading } = useApi(mode === 'grn' && supplier?.value ? `unbilled:${supplier.value}` : null, () =>
    getGoodsReceiptsApi({ unbilled: true, supplierId: supplier.value, page: 1, limit: 100, sort: 'grnDate', order: 'asc' })
  );
  const unbilled = unbilledRes?.data || [];

  // GRNs handed over from the GRN screen: load their lines once.
  useEffect(() => {
    if (doc || !initGrnIds.length) return undefined;
    let alive = true;
    Promise.all(initGrnIds.map((gid) => loadGrn(gid).catch(() => null))).then((results) => {
      if (!alive) return;
      const ok = results.filter(Boolean);
      setGrnLines(ok.flatMap((r) => r.lines));
      setGrnLoading([]);
      const first = ok[0]?.grn;
      if (first?.supplierInvoiceNo) setSupplierBillNo((v) => v || first.supplierInvoiceNo);
      if (first?.supplierInvoiceDate) setBillDate(toInputDate(first.supplierInvoiceDate));
      if (ok.length < results.length) notifyError('Some goods receipts could not be loaded.');
    });
    return () => {
      alive = false;
    };
    // Runs once for the receipts passed in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleGrn = async (grn) => {
    const id = grn._id;
    if (selectedGrns.includes(id)) {
      const rest = selectedGrns.filter((g) => g !== id);
      setSelectedGrns(rest);
      if (grnLines.some((l) => l.grnId === '__doc')) {
        // Editing a saved draft: rebuild lines from the remaining receipts.
        setGrnLines([]);
        setGrnLoading(rest);
        const results = await Promise.all(rest.map((gid) => loadGrn(gid).catch(() => null)));
        setGrnLines(results.filter(Boolean).flatMap((r) => r.lines));
        setGrnLoading([]);
      } else {
        setGrnLines((prev) => prev.filter((l) => l.grnId !== id));
      }
      return;
    }
    setSelectedGrns((prev) => [...prev, id]);
    setGrnLoading((prev) => [...prev, id]);
    try {
      const { lines } = await loadGrn(id);
      setGrnLines((prev) => [...prev, ...lines]);
      if (!supplierBillNo && grn.supplierInvoiceNo) setSupplierBillNo(grn.supplierInvoiceNo);
      if (!storeId && grn.storeId) setStoreId(refId(grn.storeId));
    } catch (e) {
      setSelectedGrns((prev) => prev.filter((g) => g !== id));
      notifyError(errMsg(e, 'Could not load the goods receipt.'));
    } finally {
      setGrnLoading((prev) => prev.filter((g) => g !== id));
    }
  };

  const changeSupplier = (opt) => {
    setSupplier(opt ? { value: opt.value, label: opt.label } : null);
    setSelectedGrns([]);
    setGrnLines([]);
  };

  const lines = mode === 'grn' ? grnLines : directLines;
  const setLines = mode === 'grn' ? setGrnLines : setDirectLines;

  const totals = useMemo(
    () => computeTotals(lines, { overallDiscountPercent, otherCharges, roundOff, isInterState: doc ? !!doc.isInterState : undefined }),
    [lines, overallDiscountPercent, otherCharges, roundOff, doc]
  );

  const save = async (status) => {
    setSubmitted(true);
    let problem;
    if (!supplier?.value) problem = 'Select a supplier.';
    else if (!effectiveStoreId) problem = 'Select a store.';
    else if (mode === 'grn' && !selectedGrns.length) problem = 'Select at least one goods receipt, or switch to direct entry.';
    else if (grnLoading.length) problem = 'Goods receipt lines are still loading.';
    else if (dueDate && billDate && dueDate < billDate) problem = 'Due date cannot be before the bill date.';
    else problem = validateLines(lines);
    setFormError(problem);
    if (problem) {
      notifyError(problem);
      return;
    }

    const payload = {
      supplierId: supplier.value,
      storeId: effectiveStoreId,
      supplierBillNo: supplierBillNo.trim(),
      billDate,
      dueDate: dueDate || null,
      purchaseOrderId: purchaseOrderId || null,
      grnIds: mode === 'grn' ? selectedGrns : [],
      updateStock: mode === 'direct' ? updateStock : false,
      items: linesToPayload(lines),
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
          notify(conf?.message || 'Bill confirmed');
        } else {
          notify(res?.message || 'Bill updated');
        }
      } else {
        const res = await dispatch(createPurchaseBill({ ...payload, status })).unwrap();
        saved = res?.data;
        notify(res?.message || (status === 'draft' ? 'Bill saved as draft' : 'Bill recorded'));
      }
      navigate(viewPath('bills', saved?._id || doc._id), { replace: true });
    } catch (e) {
      const msg = errMsg(e);
      setFormError(msg);
      notifyError(msg);
    }
  };

  const modeBtn = (value, label) => (
    <button
      type="button"
      onClick={() => setMode(value)}
      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
        mode === value ? 'bg-indigo-600 text-white shadow-sm' : 'text-[var(--vs-text-secondary)] hover:bg-[var(--vs-bg-secondary)]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <PageShell title={isEdit ? `Edit bill - ${doc.billNumber}` : 'Record purchase bill'}>
      {isEdit && (
        <div>
          <StatusBadge status={doc.status} size="lg" />
        </div>
      )}
      <FormError message={formError} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Section title="Bill details" className="lg:col-span-2" bodyClassName="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Supplier" required className="md:col-span-2">
            <SupplierPicker value={supplier} onChange={changeSupplier} info={supplierInfo} infoLoading={supplierLoading} error={submitted && !supplier?.value} />
          </Field>
          <Field label="Supplier's bill number" hint="As printed on the supplier's invoice. Used to catch duplicates.">
            <Input value={supplierBillNo} maxLength={50} onChange={(e) => setSupplierBillNo(e.target.value)} placeholder="e.g. INV/2026/0451" />
          </Field>
          <Field label="Store" required>
            <NativeSelect
              value={effectiveStoreId}
              onChange={setStoreId}
              error={submitted && !effectiveStoreId}
              options={[{ value: '', label: storesLoading ? 'Loading stores...' : 'Select store' }, ...storeOptions]}
            />
          </Field>
          <Field label="Bill date" required>
            <Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
          </Field>
          <Field
            label="Due date"
            hint={
              dueTouched
                ? terms !== null
                  ? <button type="button" className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer" onClick={() => setDueTouched(false)}>Reset to supplier terms ({terms} days)</button>
                  : null
                : terms !== null
                  ? `Bill date + ${terms} day credit period`
                  : 'Worked out from the supplier’s credit period'
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
        </Section>

        <Section title="Summary" bodyClassName="p-4 flex flex-col gap-4">
          <TotalsEditor
            totals={totals}
            overallDiscountPercent={overallDiscountPercent}
            onOverallDiscountChange={setOverallDiscountPercent}
            otherCharges={otherCharges}
            onOtherChargesChange={setOtherCharges}
            roundOff={roundOff}
            onRoundOffChange={setRoundOff}
          />
          {supplierInfo && !supplierInfo.gstin && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">Unregistered supplier: GST paid is added to stock cost (no input tax credit).</p>
          )}
          <div className="flex flex-col gap-2 border-t border-[var(--vs-border)] pt-4">
            <Button onClick={() => save('confirmed')} disabled={saving} className="w-full" startIcon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}>
              Save bill
            </Button>
            <Button variant="outline" onClick={() => save('draft')} disabled={saving} className="w-full" startIcon={<Save className="w-4 h-4" />}>
              Save draft
            </Button>
            <p className="text-[11px] text-[var(--vs-text-secondary)]">
              Saving the bill adds it to what you owe the supplier{mode === 'direct' && updateStock ? ' and puts the goods into stock' : ''}.
            </p>
          </div>
        </Section>
      </div>

      <Section
        title="Items"
        bodyClassName="p-3 sm:p-4 flex flex-col gap-4"
        rightNode={
          <div className="inline-flex gap-1 rounded-xl border border-[var(--vs-border)] p-1 bg-[var(--vs-bg-primary)]">
            {modeBtn('grn', 'From goods receipts')}
            {modeBtn('direct', 'Direct entry')}
          </div>
        }
      >
        {mode === 'grn' ? (
          <>
            {!supplier?.value ? (
              <EmptyState>Select a supplier to see goods received from them that are not billed yet.</EmptyState>
            ) : unbilledLoading ? (
              <EmptyState>Loading goods receipts...</EmptyState>
            ) : unbilled.length === 0 ? (
              <EmptyState>No posted, unbilled goods receipts for this supplier. Use direct entry instead.</EmptyState>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {unbilled.map((g) => {
                  const on = selectedGrns.includes(g._id);
                  const busy = grnLoading.includes(g._id);
                  return (
                    <label
                      key={g._id}
                      className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                        on ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-500/10' : 'border-[var(--vs-border)] hover:bg-[var(--vs-bg-secondary)]'
                      }`}
                    >
                      <input type="checkbox" checked={on} disabled={busy} onChange={() => toggleGrn(g)} className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600" />
                      <div className="flex-1 min-w-0 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-semibold">{g.grnNumber}</span>
                          <span className="font-semibold">{formatINR(g.totalValue)}</span>
                        </div>
                        <div className="text-[11px] text-[var(--vs-text-secondary)]">
                          {fmtDate(g.grnDate)} · {g.storeId?.name || g.storeSnapshot?.name || ''} · {g.items?.length || 0} items
                          {g.supplierInvoiceNo ? ` · Inv ${g.supplierInvoiceNo}` : ''}
                          {g.poNumber ? ` · ${g.poNumber}` : ''}
                        </div>
                        {busy && <div className="text-[11px] text-indigo-600 dark:text-indigo-400">Loading lines...</div>}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
            {grnLines.length > 0 && (
              <PurchaseLineEditor lines={grnLines} onChange={setLines} storeId={effectiveStoreId} submitted={submitted} options={{ lockProducts: true }} />
            )}
            {grnLines.length > 0 && (
              <p className="text-[11px] text-[var(--vs-text-secondary)]">
                These goods are already in stock from the receipts. Check rates and GST against the supplier&apos;s bill; quantities come from the accepted quantities.
              </p>
            )}
          </>
        ) : (
          <>
            <label className="flex items-start gap-2 text-sm cursor-pointer rounded-xl border border-[var(--vs-border)] px-3 py-2.5">
              <input type="checkbox" checked={updateStock} onChange={(e) => setUpdateStock(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600" />
              <span>
                <span className="font-semibold">Add goods to stock</span>
                <span className="block text-[11px] text-[var(--vs-text-secondary)]">
                  Tick this when no goods receipt was made for these items.
                </span>
              </span>
            </label>
            <PurchaseLineEditor lines={directLines} onChange={setLines} storeId={effectiveStoreId} submitted={submitted} />
          </>
        )}
      </Section>

      <Section title="Notes">
        <TextArea value={notes} onChange={setNotes} rows={2} placeholder="Anything to remember about this bill" />
      </Section>
      <PurchaseToaster />
    </PageShell>
  );
}

/**
 * purchase/bills/create   (optional location.state = { supplierId, storeId, grnIds: [], purchaseOrderId })
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

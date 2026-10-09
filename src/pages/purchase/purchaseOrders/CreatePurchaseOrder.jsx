import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Loader2, Save, Send } from 'lucide-react';
import Button from '@/components/inputs/Button';
import { Input } from '@/components/inputs/Input';
import PurchaseToaster from '../components/PurchaseToaster';
import PurchaseLineEditor from '../components/PurchaseLineEditor';
import SupplierPicker from '../components/SupplierPicker';
import { TotalsEditor } from '../components/Totals';
import { Field, FormError, NativeSelect, PageLoading, PageShell, Section, StatusBadge, TextArea } from '../components/ui';
import useStores from '../components/useStores';
import useSupplierInfo from '../components/useSupplierInfo';
import { getProductApi } from '../components/lookupService';
import { notify, notifyError } from '../components/toast';
import {
  applyProduct,
  computeTotals,
  decId,
  docPricing,
  emptyLine,
  errMsg,
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
import { createPurchaseOrder, fetchPurchaseOrder, setPurchaseOrderStatus, updatePurchaseOrder } from './services/purchaseOrderSlice';

/** Lines sent by the Reorder Report: [{ productId, productName, qty, rate }] */
const linesFromPrefill = (prefill) => {
  const items = (prefill?.items || []).filter((i) => i?.productId);
  if (!items.length) return [emptyLine()];
  return items.map((i) => ({
    ...emptyLine(),
    productId: i.productId,
    productName: i.productName || 'Product',
    qty: num(i.qty) || 1,
    rate: num(i.rate),
    needsMeta: true,
  }));
};

function PurchaseOrderForm({ doc, prefill }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const saving = useSelector((state) => state.purchaseOrder.saving);
  const { options: storeOptions, defaultId: defaultStoreId, loading: storesLoading } = useStores();
  const isEdit = !!doc;

  const [supplier, setSupplier] = useState(() =>
    doc ? { value: refId(doc.supplierId), label: supplierName(doc) } : prefill?.supplierId ? { value: prefill.supplierId, label: '' } : null
  );
  const [storeId, setStoreId] = useState(() => (doc ? refId(doc.storeId) : prefill?.storeId || ''));
  const [poDate, setPoDate] = useState(() => (doc ? toInputDate(doc.poDate) : todayISO()));
  const [expectedDate, setExpectedDate] = useState(() => (doc ? toInputDate(doc.expectedDate) : ''));
  const [lines, setLines] = useState(() => (doc ? doc.items.map(lineFromDoc) : linesFromPrefill(prefill)));
  const [overallDiscountPercent, setOverallDiscountPercent] = useState(() => (doc ? inferOverallDiscount(doc) : 0));
  const [otherCharges, setOtherCharges] = useState(() => (doc ? num(doc.otherCharges) : 0));
  const [roundOff, setRoundOff] = useState(() => (doc ? num(doc.roundOff) !== 0 : true));
  const [notes, setNotes] = useState(() => doc?.notes || '');
  const [terms, setTerms] = useState(() => doc?.terms || '');
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  const { info: supplierInfo, loading: supplierLoading } = useSupplierInfo(supplier?.value);
  const effectiveStoreId = storeId || defaultStoreId;

  // Lines prefilled from the Reorder Report only carry id / name / qty / rate:
  // load each product once for its unit, pack units, GST and HSN.
  useEffect(() => {
    const ids = [...new Set(lines.filter((l) => l.needsMeta).map((l) => l.productId))];
    if (!ids.length) return undefined;
    let alive = true;
    Promise.all(ids.map((pid) => getProductApi(pid).catch(() => null))).then((products) => {
      if (!alive) return;
      const byId = new Map(products.filter(Boolean).map((p) => [String(p._id), p]));
      setLines((prev) =>
        prev.map((l) => {
          if (!l.needsMeta) return l;
          const p = byId.get(String(l.productId));
          if (!p) return { ...l, needsMeta: false };
          const filled = applyProduct(l, p, { keepQtyRate: true });
          return { ...filled, needsMeta: false, rate: num(l.rate) || num(p.lastPurchasePrice) || num(p.costPrice) };
        })
      );
    });
    return () => {
      alive = false;
    };
    // Runs once for the prefilled lines.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(
    () => computeTotals(lines, { overallDiscountPercent, otherCharges, roundOff, isInterState: doc ? !!doc.isInterState : undefined }),
    [lines, overallDiscountPercent, otherCharges, roundOff, doc]
  );

  const save = async (markSent) => {
    setSubmitted(true);
    let problem;
    if (!supplier?.value) problem = 'Select a supplier.';
    else if (!effectiveStoreId) problem = 'Select the store the goods should be delivered to.';
    else if (expectedDate && poDate && expectedDate < poDate) problem = 'Expected delivery date cannot be before the order date.';
    else problem = validateLines(lines);
    setFormError(problem);
    if (problem) {
      notifyError(problem);
      return;
    }

    const payload = {
      supplierId: supplier.value,
      storeId: effectiveStoreId,
      poDate,
      expectedDate: expectedDate || null,
      items: linesToPayload(lines),
      ...docPricing({ overallDiscountPercent, otherCharges, roundOff }),
      notes,
      terms,
    };

    try {
      let saved;
      if (isEdit) {
        const res = await dispatch(updatePurchaseOrder({ id: doc._id, payload })).unwrap();
        saved = res?.data;
        if (markSent && doc.status === 'draft') {
          await dispatch(setPurchaseOrderStatus({ id: doc._id, status: 'sent' })).unwrap();
        }
        notify(markSent && doc.status === 'draft' ? 'Purchase order updated and marked as sent' : res?.message || 'Purchase order updated');
      } else {
        const res = await dispatch(createPurchaseOrder({ ...payload, status: markSent ? 'sent' : 'draft' })).unwrap();
        saved = res?.data;
        notify(markSent ? `Purchase order ${saved?.poNumber || ''} saved and marked as sent` : `Draft ${saved?.poNumber || ''} saved`);
      }
      navigate(viewPath('orders', saved?._id || doc._id), { replace: true });
    } catch (e) {
      const msg = errMsg(e);
      setFormError(msg);
      notifyError(msg);
    }
  };

  const title = isEdit ? `Edit purchase order - ${doc.poNumber}` : 'New purchase order';

  return (
    <PageShell title={title}>
      {isEdit && (
        <div className="flex items-center gap-2 text-sm">
          <StatusBadge status={doc.status} size="lg" />
          {doc.status === 'sent' && <span className="text-[var(--vs-text-secondary)]">This order was already sent. Let the supplier know about your changes.</span>}
        </div>
      )}
      {prefill?.items?.length > 0 && !isEdit && (
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/60 dark:bg-indigo-500/10 px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300">
          {prefill.items.length} item(s) added from the reorder report. Check quantities and rates before saving.
        </div>
      )}
      <FormError message={formError} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Section title="Order details" className="lg:col-span-2" bodyClassName="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Supplier" required className="md:col-span-2" error={submitted && !supplier?.value ? 'Select a supplier' : ''}>
            <SupplierPicker
              value={supplier}
              onChange={(opt) => setSupplier(opt ? { value: opt.value, label: opt.label } : null)}
              info={supplierInfo}
              infoLoading={supplierLoading}
              error={submitted && !supplier?.value}
            />
          </Field>
          <Field label="Deliver to store" required hint="Goods received against this order go into this store.">
            <NativeSelect
              value={effectiveStoreId}
              onChange={setStoreId}
              error={submitted && !effectiveStoreId}
              options={[{ value: '', label: storesLoading ? 'Loading stores...' : 'Select store' }, ...storeOptions]}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Order date" required>
              <Input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} />
            </Field>
            <Field label="Expected delivery">
              <Input type="date" value={expectedDate} min={poDate} onChange={(e) => setExpectedDate(e.target.value)} />
            </Field>
          </div>
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
          <div className="flex flex-col gap-2 border-t border-[var(--vs-border)] pt-4">
            {(!isEdit || doc.status === 'draft') && (
              <Button onClick={() => save(true)} disabled={saving} className="w-full" startIcon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}>
                Save &amp; mark sent
              </Button>
            )}
            <Button
              variant={!isEdit || doc.status === 'draft' ? 'outline' : 'primary'}
              onClick={() => save(false)}
              disabled={saving}
              className="w-full"
              startIcon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            >
              {isEdit && doc.status !== 'draft' ? 'Save changes' : 'Save draft'}
            </Button>
          </div>
        </Section>
      </div>

      <Section title="Items" bodyClassName="p-3 sm:p-4">
        <PurchaseLineEditor lines={lines} onChange={setLines} storeId={effectiveStoreId} submitted={submitted} />
      </Section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title="Notes for supplier">
          <TextArea value={notes} onChange={setNotes} rows={3} placeholder="Delivery instructions, contact person..." />
        </Section>
        <Section title="Terms & conditions">
          <TextArea value={terms} onChange={setTerms} rows={3} placeholder="Payment terms, packing, warranty..." />
        </Section>
      </div>
      <PurchaseToaster />
    </PageShell>
  );
}

/**
 * purchase/orders/create   (optional location.state.prefill = { supplierId?, storeId?, items: [{ productId, productName, qty, rate }] })
 * purchase/orders/edit/:id
 */
export default function CreatePurchaseOrder() {
  const { id: encryptedId } = useParams();
  const id = decId(encryptedId);
  const location = useLocation();
  const dispatch = useDispatch();
  const { current, currentError } = useSelector((state) => state.purchaseOrder);
  const [prefill] = useState(() => location.state?.prefill || null);

  useEffect(() => {
    if (id) dispatch(fetchPurchaseOrder(id));
  }, [dispatch, id]);

  if (!encryptedId) return <PurchaseOrderForm key="new" doc={null} prefill={prefill} />;
  if (!id) return <PageLoading title="Edit purchase order" error="This link is not valid." />;
  if (!current || current._id !== id) return <PageLoading title="Edit purchase order" error={currentError} />;
  if (!['draft', 'sent'].includes(current.status)) {
    return <PageLoading title={`Purchase order ${current.poNumber}`} error={`A ${current.status.replace('_', ' ')} purchase order can't be edited.`} />;
  }
  return <PurchaseOrderForm key={current._id} doc={current} prefill={null} />;
}

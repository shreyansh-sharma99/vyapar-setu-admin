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
import { Field, FormError, NativeSelect, PageLoading, PageShell, Section, StatusBadge, TextArea } from '../components/ui';
import useApi from '../components/useApi';
import useStores from '../components/useStores';
import useSupplierInfo from '../components/useSupplierInfo';
import { notify, notifyError } from '../components/toast';
import {
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
import { getPurchaseBillByIdApi, getPurchaseBillsApi } from '../purchaseBills/services/purchaseBillService';
import { confirmPurchaseReturn, createPurchaseReturn, fetchPurchaseReturn, updatePurchaseReturn } from './services/purchaseReturnSlice';

const billLines = (bill) =>
  (bill?.items || []).map((i) => ({ ...lineFromDoc(i), fromBucket: 'sellable', reason: '' }));

function PurchaseReturnForm({ doc, init }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const saving = useSelector((state) => state.purchaseReturn.saving);
  const { options: storeOptions, defaultId: defaultStoreId, loading: storesLoading } = useStores();
  const isEdit = !!doc;

  const [supplier, setSupplier] = useState(() =>
    doc ? { value: refId(doc.supplierId), label: supplierName(doc) } : init?.supplierId ? { value: init.supplierId, label: '' } : null
  );
  const [storeId, setStoreId] = useState(() => (doc ? refId(doc.storeId) : init?.storeId || ''));
  const [billId, setBillId] = useState(() => (doc ? refId(doc.purchaseBillId) : init?.purchaseBillId || ''));
  const [billInfo, setBillInfo] = useState(() => (doc?.purchaseBillId && typeof doc.purchaseBillId === 'object' ? doc.purchaseBillId : null));
  const [billLoading, setBillLoading] = useState(() => !doc && !!init?.purchaseBillId);
  const [returnDate, setReturnDate] = useState(() => (doc ? toInputDate(doc.returnDate) : todayISO()));
  const [lines, setLines] = useState(() => (doc ? doc.items.map(lineFromDoc) : [emptyLine()]));
  const [overallDiscountPercent, setOverallDiscountPercent] = useState(() => (doc ? inferOverallDiscount(doc) : 0));
  const [otherCharges, setOtherCharges] = useState(() => (doc ? num(doc.otherCharges) : 0));
  const [roundOff, setRoundOff] = useState(() => (doc ? num(doc.roundOff) !== 0 : true));
  const [notes, setNotes] = useState(() => doc?.notes || '');
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  const { info: supplierInfo, loading: supplierLoading } = useSupplierInfo(supplier?.value);
  const effectiveStoreId = storeId || defaultStoreId;

  const { data: billsRes } = useApi(supplier?.value ? `bills:${supplier.value}` : null, () =>
    getPurchaseBillsApi({ supplierId: supplier.value, status: 'unpaid,partially_paid,paid', page: 1, limit: 100, sort: 'billDate', order: 'desc' })
  );
  const billOptions = (billsRes?.data || []).map((b) => ({
    value: b._id,
    label: `${b.billNumber}${b.supplierBillNo ? ` (${b.supplierBillNo})` : ''} · ${fmtDate(b.billDate)} · ${formatINR(b.totalAmount)}`,
  }));
  if (billId && !billOptions.some((o) => o.value === billId)) {
    billOptions.unshift({ value: billId, label: billInfo?.billNumber || 'Linked bill' });
  }

  const applyBill = (bill) => {
    setBillInfo(bill);
    setLines(billLines(bill).length ? billLines(bill) : [emptyLine()]);
    if (bill?.storeId) setStoreId(refId(bill.storeId));
  };

  // Bill handed over from the bill screen: load its lines once.
  useEffect(() => {
    if (doc || !init?.purchaseBillId) return undefined;
    let alive = true;
    getPurchaseBillByIdApi(init.purchaseBillId)
      .then((res) => {
        if (alive) applyBill(res?.data);
      })
      .catch((e) => {
        if (alive) notifyError(errMsg(e, 'Could not load the bill.'));
      })
      .finally(() => {
        if (alive) setBillLoading(false);
      });
    return () => {
      alive = false;
    };
    // Runs once for the bill passed in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickBill = async (value) => {
    setBillId(value);
    if (!value) {
      setBillInfo(null);
      return;
    }
    setBillLoading(true);
    try {
      const res = await getPurchaseBillByIdApi(value);
      applyBill(res?.data);
      notify('Bill items loaded. Remove what you are not returning and set the quantities.', 'info');
    } catch (e) {
      notifyError(errMsg(e, 'Could not load the bill.'));
    } finally {
      setBillLoading(false);
    }
  };

  const changeSupplier = (opt) => {
    setSupplier(opt ? { value: opt.value, label: opt.label } : null);
    setBillId('');
    setBillInfo(null);
  };

  const totals = useMemo(
    () => computeTotals(lines, { overallDiscountPercent, otherCharges, roundOff, isInterState: doc ? !!doc.isInterState : undefined }),
    [lines, overallDiscountPercent, otherCharges, roundOff, doc]
  );

  const save = async (status) => {
    setSubmitted(true);
    let problem;
    if (!supplier?.value) problem = 'Select a supplier.';
    else if (!effectiveStoreId) problem = 'Select the store the goods leave from.';
    else if (billLoading) problem = 'Bill items are still loading.';
    else problem = validateLines(lines);
    setFormError(problem);
    if (problem) {
      notifyError(problem);
      return;
    }
    const payload = {
      supplierId: supplier.value,
      storeId: effectiveStoreId,
      purchaseBillId: billId || null,
      returnDate,
      items: linesToPayload(lines, { bucket: true }),
      ...docPricing({ overallDiscountPercent, otherCharges, roundOff }),
      notes,
    };
    try {
      let saved;
      if (isEdit) {
        const res = await dispatch(updatePurchaseReturn({ id: doc._id, payload })).unwrap();
        saved = res?.data;
        if (status === 'confirmed') {
          const conf = await dispatch(confirmPurchaseReturn(doc._id)).unwrap();
          notify(conf?.message || 'Purchase return confirmed');
        } else {
          notify(res?.message || 'Purchase return updated');
        }
      } else {
        const res = await dispatch(createPurchaseReturn({ ...payload, status })).unwrap();
        saved = res?.data;
        notify(res?.message || (status === 'draft' ? 'Purchase return saved as draft' : 'Purchase return confirmed'));
      }
      navigate(viewPath('returns', saved?._id || doc._id), { replace: true });
    } catch (e) {
      const msg = errMsg(e);
      setFormError(msg);
      notifyError(msg);
    }
  };

  return (
    <PageShell title={isEdit ? `Edit return - ${doc.returnNumber}` : 'New purchase return'} description="Goods going back to the supplier (debit note)">
      {isEdit && (
        <div>
          <StatusBadge status={doc.status} size="lg" />
        </div>
      )}
      <FormError message={formError} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Section title="Return details" className="lg:col-span-2" bodyClassName="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Supplier" required className="md:col-span-2">
            <SupplierPicker value={supplier} onChange={changeSupplier} info={supplierInfo} infoLoading={supplierLoading} error={submitted && !supplier?.value} />
          </Field>
          <Field label="Against bill (optional)" hint={billLoading ? 'Loading bill items...' : 'Linking a bill reduces that bill’s balance when the return is confirmed.'}>
            <NativeSelect
              value={billId}
              onChange={pickBill}
              disabled={!supplier?.value || billLoading}
              options={[{ value: '', label: supplier?.value ? 'No bill (reduce overall payable)' : 'Select a supplier first' }, ...billOptions]}
            />
          </Field>
          <Field label="Return from store" required hint="Stock is taken out of this store.">
            <NativeSelect
              value={effectiveStoreId}
              onChange={setStoreId}
              error={submitted && !effectiveStoreId}
              options={[{ value: '', label: storesLoading ? 'Loading stores...' : 'Select store' }, ...storeOptions]}
            />
          </Field>
          <Field label="Return date" required>
            <Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
          </Field>
          {billInfo && (
            <div className="md:col-span-2 rounded-lg bg-[var(--vs-bg-secondary)] border border-[var(--vs-border)] px-3 py-2 text-xs text-[var(--vs-text-secondary)] flex flex-wrap gap-x-4 gap-y-1">
              <span>
                Bill <strong className="font-mono text-[var(--vs-text-primary)]">{billInfo.billNumber}</strong>
              </span>
              {billInfo.billDate && <span>Dated {fmtDate(billInfo.billDate)}</span>}
              {billInfo.totalAmount !== undefined && <span>Total {formatINR(billInfo.totalAmount)}</span>}
              {billInfo.balanceAmount !== undefined && <span>Balance {formatINR(billInfo.balanceAmount)}</span>}
            </div>
          )}
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
            <Button onClick={() => save('confirmed')} disabled={saving} className="w-full" startIcon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}>
              Confirm return
            </Button>
            <Button variant="outline" onClick={() => save('draft')} disabled={saving} className="w-full" startIcon={<Save className="w-4 h-4" />}>
              Save draft
            </Button>
            <p className="text-[11px] text-[var(--vs-text-secondary)]">Confirming takes the goods out of stock and reduces what you owe the supplier.</p>
          </div>
        </Section>
      </div>

      <Section title="Items being returned" bodyClassName="p-3 sm:p-4">
        <PurchaseLineEditor lines={lines} onChange={setLines} storeId={effectiveStoreId} submitted={submitted} options={{ bucket: true }} />
      </Section>

      <Section title="Notes">
        <TextArea value={notes} onChange={setNotes} rows={2} placeholder="Reason for return, courier details..." />
      </Section>
      <PurchaseToaster />
    </PageShell>
  );
}

/**
 * purchase/returns/create   (optional location.state = { supplierId, storeId, purchaseBillId })
 * purchase/returns/edit/:id
 */
export default function CreatePurchaseReturn() {
  const { id: encryptedId } = useParams();
  const id = decId(encryptedId);
  const location = useLocation();
  const dispatch = useDispatch();
  const { current, currentError } = useSelector((state) => state.purchaseReturn);
  const [init] = useState(() => location.state || null);

  useEffect(() => {
    if (id) dispatch(fetchPurchaseReturn(id));
  }, [dispatch, id]);

  if (!encryptedId) return <PurchaseReturnForm key="new" doc={null} init={init} />;
  if (!id) return <PageLoading title="Edit purchase return" error="This link is not valid." />;
  if (!current || current._id !== id) return <PageLoading title="Edit purchase return" error={currentError} />;
  if (current.status !== 'draft') return <PageLoading title={`Return ${current.returnNumber}`} error="Only draft returns can be edited." />;
  return <PurchaseReturnForm key={current._id} doc={current} init={null} />;
}

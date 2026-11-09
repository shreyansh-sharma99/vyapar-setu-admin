import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Save } from 'lucide-react';
import { Button, DocumentLayout, FormGrid, Input, Section, Select, Textarea, TotalsInput, TotalsPanel, TotalsRow, useShortcuts } from '@/components/ui';
import PurchaseToaster from '../components/PurchaseToaster';
import PurchaseLineEditor from '../components/PurchaseLineEditor';
import SupplierPicker from '../components/SupplierPicker';
import { TotalsEditor } from '../components/Totals';
import { Field, FormError, PageLoading, StatusBadge } from '../components/ui';
import useApi from '../components/useApi';
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
  (bill?.items || []).map((i) => ({ ...lineFromDoc(i), fromBucket: 'auto', reason: '' }));

function PurchaseReturnForm({ doc, init }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const saving = useSelector((state) => state.purchaseReturn.saving);
  const isEdit = !!doc;

  const [supplier, setSupplier] = useState(() =>
    doc ? { value: refId(doc.supplierId), label: supplierName(doc) } : init?.supplierId ? { value: init.supplierId, label: '' } : null
  );
  const [billId, setBillId] = useState(() => (doc ? refId(doc.purchaseBillId) : init?.purchaseBillId || ''));
  const [billInfo, setBillInfo] = useState(() => (doc?.purchaseBillId && typeof doc.purchaseBillId === 'object' ? doc.purchaseBillId : null));
  const [billLoading, setBillLoading] = useState(() => !doc && !!init?.purchaseBillId);
  const [returnDate, setReturnDate] = useState(() => (doc ? toInputDate(doc.returnDate) : todayISO()));
  const [lines, setLines] = useState(() => (doc ? doc.items.map(lineFromDoc) : [emptyLine()]));
  const [overallDiscountPercent, setOverallDiscountPercent] = useState(() => (doc ? inferOverallDiscount(doc) : 0));
  const [otherCharges, setOtherCharges] = useState(() => (doc ? num(doc.otherCharges) : 0));
  const [roundOff, setRoundOff] = useState(() => (doc ? num(doc.roundOff) !== 0 : true));
  const [notes, setNotes] = useState(() => doc?.notes || '');
  // What the supplier will give back. Empty = cost + GST (follows the total); a smaller amount is a loss.
  const [agreedInput, setAgreedInput] = useState(() =>
    doc && doc.agreedAmount !== null && doc.agreedAmount !== undefined && Math.abs(num(doc.agreedAmount) - num(doc.totalAmount)) > 0.009 ? String(doc.agreedAmount) : ''
  );
  const [submitted, setSubmitted] = useState(false);
  // one click = one return: a key made once for this form (the server returns the same
  // return for a repeat), and the buttons lock from the first click
  const [requestKey] = useState(() => (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`));
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const { info: supplierInfo, loading: supplierLoading } = useSupplierInfo(supplier?.value);

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

  const goodsValue = num(totals.totalAmount);
  const agreed = agreedInput === '' ? goodsValue : num(agreedInput);
  const loss = Math.max(0, Math.round((goodsValue - agreed) * 100) / 100);

  const save = async (status) => {
    if (busyRef.current) return;
    setSubmitted(true);
    let problem;
    if (agreedInput !== '' && agreed > goodsValue + 0.009) problem = `The supplier can give at most ${formatINR(goodsValue)} (cost + GST).`;
    else if (!supplier?.value) problem = 'Select a supplier.';
    else if (billLoading) problem = 'Bill items are still loading.';
    else problem = validateLines(lines);
    setFormError(problem);
    if (problem) {
      notifyError(problem);
      return;
    }
    const payload = {
      supplierId: supplier.value,
      purchaseBillId: billId || null,
      returnDate,
      items: linesToPayload(lines, { bucket: true }),
      agreedAmount: agreedInput === '' ? null : agreed,
      ...docPricing({ overallDiscountPercent, otherCharges, roundOff }),
      notes,
    };
    busyRef.current = true;
    setBusy(true);
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
        const res = await dispatch(createPurchaseReturn({ ...payload, status, requestKey })).unwrap();
        saved = res?.data;
        notify(res?.message || (status === 'draft' ? 'Purchase return saved as draft' : 'Purchase return confirmed'));
      }
      navigate(viewPath('returns', saved?._id || doc._id), { replace: true });
    } catch (e) {
      busyRef.current = false;
      setBusy(false);
      const msg = errMsg(e);
      setFormError(msg);
      notifyError(msg);
    }
  };

  const addLine = () => setLines((ls) => [...ls, emptyLine()]);
  useShortcuts({ F2: addLine, 'mod+s': () => !saving && !busy && save('draft') });

  const confirmButton = (className) => (
    <Button onClick={() => save('confirmed')} disabled={busy} loading={saving} startIcon={<CheckCircle2 />} className={className}>
      Confirm return
    </Button>
  );

  return (
    <DocumentLayout
      header={{
        title: isEdit ? 'Edit return' : 'New purchase return',
        docNo: isEdit ? doc.returnNumber : undefined,
        description: 'Goods going back to the supplier (debit note)',
        actions: (
          <>
            {isEdit && <StatusBadge status={doc.status} size="lg" />}
            <Button variant="ghost" onClick={() => navigate(-1)} className="hidden sm:inline-flex">
              Cancel
            </Button>
            <Button variant="secondary" onClick={() => save('draft')} disabled={saving || busy} startIcon={<Save />}>
              Save draft
            </Button>
            {confirmButton('hidden lg:inline-flex')}
          </>
        ),
      }}
      summary={
        <TotalsPanel
          title="Summary"
          total={formatINR(totals.totalAmount)}
          footer={
            <div className="flex flex-col gap-2.5 border-t border-dashed border-nav-ink/20 pt-3">
              <TotalsRow label="Supplier will give (₹)">
                <TotalsInput
                  min="0"
                  step="0.01"
                  aria-label="Supplier will give"
                  value={agreedInput === '' ? (goodsValue ? goodsValue.toFixed(2) : '') : agreedInput}
                  onChange={(e) => setAgreedInput(e.target.value)}
                  className={`w-32 font-bold ${agreed > goodsValue + 0.009 ? 'border-danger' : ''}`}
                />
              </TotalsRow>
              {agreedInput === '' && <p className="m-0 text-[11px] text-nav-ink/70">Cost + GST of the goods. Change it if the supplier gives less.</p>}
              {loss > 0 && <TotalsRow label="Loss on this return" value={formatINR(loss)} tone="danger" />}
              {agreedInput !== '' && (
                <Button variant="link" size="xs" onClick={() => setAgreedInput('')} className="self-start text-highlight">
                  Use cost + GST again
                </Button>
              )}
              <p className="m-0 text-[11px] leading-relaxed text-nav-ink/70">
                Confirming takes the goods out of stock and reduces what you owe the supplier by the amount they give. F2 adds an item · Ctrl S saves a draft.
              </p>
            </div>
          }
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
      mobileBar={{ label: 'Total', value: formatINR(totals.totalAmount), action: confirmButton() }}
    >
      <FormError message={formError} />

      <Section title="Return details" description="Who the goods go back to, and against which bill.">
        <div className="flex flex-col gap-4">
          <Field label="Supplier" required error={submitted && !supplier?.value ? 'Select a supplier' : ''}>
            <SupplierPicker value={supplier} onChange={changeSupplier} info={supplierInfo} infoLoading={supplierLoading} error={submitted && !supplier?.value} />
          </Field>
          <FormGrid cols={2}>
            <Field label="Against bill (optional)" hint={billLoading ? 'Loading bill items...' : 'Linking a bill reduces that bill’s balance when the return is confirmed.'}>
              <Select
                value={billId}
                onChange={pickBill}
                disabled={!supplier?.value || billLoading}
                loading={billLoading}
                options={[{ value: '', label: supplier?.value ? 'No bill (reduce overall payable)' : 'Select a supplier first' }, ...billOptions]}
              />
            </Field>
            <Field label="Return date" required>
              <Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
            </Field>
          </FormGrid>
          {billInfo && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-control bg-fill px-3.5 py-2.5 text-xs text-ink-muted">
              <span>
                Bill <strong className="font-mono text-ink">{billInfo.billNumber}</strong>
              </span>
              {billInfo.billDate && <span>Dated {fmtDate(billInfo.billDate)}</span>}
              {billInfo.totalAmount !== undefined && <span>Total {formatINR(billInfo.totalAmount)}</span>}
              {billInfo.balanceAmount !== undefined && <span>Balance {formatINR(billInfo.balanceAmount)}</span>}
            </div>
          )}
        </div>
      </Section>

      <Section title="Items being returned" bodyClassName="px-3 sm:px-4">
        <PurchaseLineEditor lines={lines} onChange={setLines} submitted={submitted} options={{ bucket: true, addShortcut: 'F2' }} />
      </Section>

      <Section title="Notes">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Reason for return, courier details..." />
      </Section>
      <PurchaseToaster />
    </DocumentLayout>
  );
}

/**
 * purchase/returns/create   (optional location.state = { supplierId, purchaseBillId })
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

import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, ChevronDown, ChevronUp, Loader2, RotateCcw } from 'lucide-react';
import Button from '@/components/inputs/Button';
import { Input } from '@/components/inputs/Input';
import PurchaseToaster from '../components/PurchaseToaster';
import SupplierPicker from '../components/SupplierPicker';
import PayMethodPicker from '../components/PayMethodPicker';
import { EmptyState, Field, FormError, PageShell, Section, TextArea } from '../components/ui';
import useApi from '../components/useApi';
import useSupplierInfo from '../components/useSupplierInfo';
import { notify, notifyError } from '../components/toast';
import { errMsg, fmtDate, formatINR, isOverdue, num, round2, todayISO, viewPath } from '../components/helpers';
import { getSupplierOpenBillsApi } from '../suppliers/services/supplierService';
import { createPaymentOut } from './services/paymentOutSlice';

/** Spread an amount over bills, oldest first. Returns { billId: amount }. */
const oldestFirst = (bills, amount) => {
  let left = round2(amount);
  const out = {};
  for (const b of bills) {
    if (left <= 0) break;
    const take = round2(Math.min(left, num(b.balanceAmount)));
    if (take > 0) out[b._id] = take;
    left = round2(left - take);
  }
  return out;
};

const chipCls = (on) =>
  `px-4 h-10 rounded-full border text-sm font-semibold transition-colors cursor-pointer ${
    on ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300' : 'border-[var(--vs-border)] hover:bg-[var(--vs-bg-secondary)]'
  }`;

const payInput = 'h-9 w-full sm:w-32 rounded-lg border bg-white dark:bg-white/5 px-2 text-right text-sm text-gray-900 dark:!text-white outline-none focus:border-indigo-500/60';

/** purchase/payments/create   (optional location.state = { supplierId, purchaseBillId, amount }) */
export default function CreatePaymentOut() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const saving = useSelector((state) => state.paymentOut.saving);

  const [init] = useState(() => location.state || null);
  const [supplier, setSupplier] = useState(() => (init?.supplierId ? { value: init.supplierId, label: '' } : null));
  const [amount, setAmount] = useState(() => (num(init?.amount) > 0 ? String(round2(init.amount)) : ''));
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(() => todayISO());
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [showBank, setShowBank] = useState(false);
  // null = split automatically (oldest bill first); an object = the user changed the split.
  const [manual, setManual] = useState(() =>
    init?.purchaseBillId && num(init?.amount) > 0 ? { [init.purchaseBillId]: String(round2(init.amount)) } : null
  );
  const [formError, setFormError] = useState('');

  const { info: supplierInfo, loading: supplierLoading } = useSupplierInfo(supplier?.value);
  const { data: billsRes, loading: billsLoading, error: billsError } = useApi(supplier?.value ? `open:${supplier.value}` : null, () => getSupplierOpenBillsApi(supplier.value));
  const bills = useMemo(() => billsRes?.data || [], [billsRes]);
  const totalDue = round2(bills.reduce((s, b) => s + num(b.balanceAmount), 0));
  const lateBills = bills.filter((b) => isOverdue(b.dueDate, b.balanceAmount));

  const payAmount = num(amount);
  const auto = useMemo(() => oldestFirst(bills, payAmount), [bills, payAmount]);
  const allocFor = (b) => (manual ? manual[b._id] ?? '' : auto[b._id] ? String(auto[b._id]) : '');
  const totalAllocated = round2(bills.reduce((s, b) => s + num(allocFor(b)), 0));
  const advance = round2(Math.max(0, payAmount - totalAllocated));
  const overAllocated = totalAllocated > payAmount + 0.001;
  const rowError = (b) => num(allocFor(b)) > num(b.balanceAmount) + 0.001;
  const leftAfter = round2(Math.max(0, totalDue - totalAllocated));

  const changeSupplier = (opt) => {
    setSupplier(opt ? { value: opt.value, label: opt.label } : null);
    setManual(null);
  };

  const pickAmount = (value) => {
    setAmount(String(round2(value)));
    setManual(null);
  };

  const editRow = (b, value) => {
    // Start from what is shown now, then change this one bill.
    const base = manual || Object.fromEntries(bills.map((x) => [x._id, auto[x._id] ? String(auto[x._id]) : '']));
    setManual({ ...base, [b._id]: value });
  };

  const submit = async (e) => {
    e.preventDefault();
    let problem = '';
    if (!supplier?.value) problem = 'Choose the supplier you paid.';
    else if (payAmount <= 0) problem = 'Enter how much you paid.';
    else if (bills.some(rowError)) problem = 'One bill has more money than it needs. Check the "Paying now" column.';
    else if (overAllocated) problem = `The bills add up to ${formatINR(totalAllocated)}, but you are paying ${formatINR(payAmount)}.`;
    setFormError(problem);
    if (problem) {
      notifyError(problem);
      return;
    }
    const payload = {
      supplierId: supplier.value,
      paymentDate,
      amount: round2(payAmount),
      paymentMethod,
      reference: paymentMethod === 'cash' ? '' : reference.trim(),
      notes,
      allocations: bills.filter((b) => num(allocFor(b)) > 0).map((b) => ({ purchaseBillId: b._id, amount: round2(allocFor(b)) })),
    };
    try {
      const res = await dispatch(createPaymentOut(payload)).unwrap();
      notify(res?.message || `Payment of ${formatINR(payAmount)} saved`);
      navigate(viewPath('payments', res?.data?._id), { replace: true });
    } catch (err) {
      const msg = errMsg(err);
      setFormError(msg);
      notifyError(msg);
    }
  };

  const bank = supplierInfo?.bankDetails || {};
  const hasBank = !!(bank.accountNumber || bank.upiId);
  const oldest = bills[0];

  return (
    <PageShell title="Pay a supplier">
      <form onSubmit={submit} className="flex flex-col gap-5">
        <FormError message={formError} />

        {/* 1. Who */}
        <Section title="1. Who did you pay?" bodyClassName="p-4 flex flex-col gap-3">
          <SupplierPicker value={supplier} onChange={changeSupplier} info={supplierInfo} infoLoading={supplierLoading} error={!!formError && !supplier?.value} />
          {supplier?.value && !billsLoading && (
            <div className="rounded-xl border border-[var(--vs-border)] bg-[var(--vs-bg-secondary)] px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-sm">
                {bills.length ? (
                  <>
                    <span className="font-semibold">{bills.length} unpaid {bills.length === 1 ? 'bill' : 'bills'}</span>
                    {lateBills.length > 0 && <span className="text-rose-600 dark:text-rose-400"> · {lateBills.length} late</span>}
                  </>
                ) : (
                  <span className="text-[var(--vs-text-secondary)]">No unpaid bills — the payment will be kept as an advance.</span>
                )}
                {hasBank && (
                  <button type="button" onClick={() => setShowBank((v) => !v)} className="ml-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                    {showBank ? 'Hide bank / UPI' : 'Show bank / UPI'}
                  </button>
                )}
              </div>
              <div className="text-right">
                <div className="text-[11px] text-[var(--vs-text-secondary)]">You owe</div>
                <div className="text-xl font-bold font-mono">{formatINR(totalDue)}</div>
              </div>
            </div>
          )}
          {showBank && hasBank && (
            <div className="rounded-xl border border-[var(--vs-border)] p-3 text-xs grid grid-cols-1 sm:grid-cols-2 gap-1">
              {bank.accountName && <span>Name: {bank.accountName}</span>}
              {bank.accountNumber && <span className="font-mono">A/c: {bank.accountNumber}</span>}
              {bank.ifsc && <span className="font-mono">IFSC: {bank.ifsc}</span>}
              {bank.bankName && <span>Bank: {bank.bankName}</span>}
              {bank.upiId && <span className="font-mono">UPI: {bank.upiId}</span>}
            </div>
          )}
        </Section>

        {/* 2. How much */}
        <Section title="2. How much did you pay?" bodyClassName="p-4 flex flex-col gap-3">
          {totalDue > 0 && (
            <div className="flex flex-wrap gap-2">
              <button type="button" className={chipCls(payAmount === totalDue)} onClick={() => pickAmount(totalDue)}>
                Full amount {formatINR(totalDue)}
              </button>
              {bills.length > 1 && oldest && (
                <button type="button" className={chipCls(payAmount === num(oldest.balanceAmount))} onClick={() => pickAmount(oldest.balanceAmount)}>
                  Oldest bill {formatINR(oldest.balanceAmount)}
                </button>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
            <Field label="Amount (₹)" required>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                placeholder="0.00"
                onChange={(e) => {
                  setAmount(e.target.value);
                  setManual(null);
                }}
                className="!text-lg !font-bold"
              />
            </Field>
            <Field label="Paid on">
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </Field>
          </div>
        </Section>

        {/* 3. How */}
        <Section title="3. How did you pay?" bodyClassName="p-4">
          <PayMethodPicker method={paymentMethod} onMethodChange={setPaymentMethod} reference={reference} onReferenceChange={setReference} />
        </Section>

        {/* 4. Which bills */}
        {supplier?.value && (
          <Section
            title="4. Bills this payment clears"
            bodyClassName="p-3 sm:p-4 flex flex-col gap-3"
            rightNode={
              manual ? (
                <button type="button" onClick={() => setManual(null)} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                  <RotateCcw className="w-3.5 h-3.5" /> Oldest bills first
                </button>
              ) : null
            }
          >
            {billsLoading ? (
              <EmptyState>Loading bills...</EmptyState>
            ) : billsError ? (
              <EmptyState>{billsError}</EmptyState>
            ) : bills.length === 0 ? (
              <EmptyState>No unpaid bills. The whole payment will be kept as an advance and used for the next bill.</EmptyState>
            ) : (
              <>
                <p className="text-xs text-[var(--vs-text-secondary)]">
                  {manual ? 'You changed how the money is split.' : 'The money goes to the oldest bills first. Change any amount if you want.'}
                </p>
                <div className="rounded-xl border border-[var(--vs-border)] divide-y divide-[var(--vs-border)]">
                  <div className="hidden sm:grid grid-cols-[1.4fr_1fr_1fr_auto] gap-3 px-3 py-2 bg-[var(--vs-bg-secondary)] text-[11px] font-bold uppercase tracking-wider text-[var(--vs-text-secondary)] rounded-t-xl">
                    <span>Bill</span>
                    <span>Pay by</span>
                    <span className="text-right">Still to pay</span>
                    <span className="text-right sm:w-32">Paying now</span>
                  </div>
                  {bills.map((b) => {
                    const late = isOverdue(b.dueDate, b.balanceAmount);
                    const bad = rowError(b);
                    const now = num(allocFor(b));
                    const cleared = now > 0 && Math.abs(now - num(b.balanceAmount)) < 0.01;
                    return (
                      <div key={b._id} className="grid grid-cols-2 sm:grid-cols-[1.4fr_1fr_1fr_auto] gap-x-3 gap-y-1 px-3 py-2.5 items-center text-sm">
                        <div className="min-w-0">
                          <div className="font-mono font-semibold">{b.billNumber}</div>
                          <div className="text-[11px] text-[var(--vs-text-secondary)] truncate">
                            {fmtDate(b.billDate)}
                            {b.supplierBillNo ? ` · their no. ${b.supplierBillNo}` : ''}
                          </div>
                        </div>
                        <div className={late ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}>
                          {fmtDate(b.dueDate || b.billDate)}
                          {late && <span className="ml-1 text-[10px] uppercase">late</span>}
                        </div>
                        <div className="sm:text-right font-mono">{formatINR(b.balanceAmount)}</div>
                        <div className="sm:text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={allocFor(b)}
                            onChange={(e) => editRow(b, e.target.value)}
                            className={`${payInput} ${bad ? 'border-red-500' : 'border-gray-200 dark:border-white/10'}`}
                          />
                          {bad ? (
                            <div className="text-[10px] text-red-500 mt-0.5">More than this bill needs</div>
                          ) : cleared ? (
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-semibold">Fully paid</div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Section>
        )}

        {/* Result + save */}
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/60 dark:bg-indigo-500/10 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm flex flex-col gap-0.5">
            <span className="font-semibold">
              You pay {formatINR(payAmount)}
              {supplier?.value && bills.length > 0 && <> · still owed after this: {formatINR(leftAfter)}</>}
            </span>
            {advance > 0 && (
              <span className="text-amber-700 dark:text-amber-400">{formatINR(advance)} extra is kept as an advance and used for this supplier&apos;s next bill.</span>
            )}
            {overAllocated && <span className="text-rose-600 dark:text-rose-400">The bills add up to more than you are paying.</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(-1)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} startIcon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}>
              Save payment
            </Button>
          </div>
        </div>

        <div>
          <button type="button" onClick={() => setShowNotes((v) => !v)} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
            {showNotes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showNotes ? 'Hide note' : 'Add a note'}
          </button>
          {showNotes && <TextArea className="mt-2" value={notes} onChange={setNotes} rows={2} placeholder="Anything to remember about this payment" />}
        </div>
      </form>
      <PurchaseToaster />
    </PageShell>
  );
}

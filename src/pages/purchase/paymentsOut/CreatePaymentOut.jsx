import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, Loader2, RefreshCw } from 'lucide-react';
import Button from '@/components/inputs/Button';
import { Input } from '@/components/inputs/Input';
import PurchaseToaster from '../components/PurchaseToaster';
import SupplierPicker from '../components/SupplierPicker';
import { EmptyState, Field, FormError, NativeSelect, PageShell, Section, TextArea } from '../components/ui';
import useApi from '../components/useApi';
import useSupplierInfo from '../components/useSupplierInfo';
import { notify, notifyError } from '../components/toast';
import { PAYMENT_METHODS, errMsg, fmtDate, formatINR, isOverdue, num, round2, todayISO, viewPath } from '../components/helpers';
import { getSupplierOpenBillsApi } from '../suppliers/services/supplierService';
import { createPaymentOut } from './services/paymentOutSlice';

const cellInput =
  'h-9 w-32 rounded-lg border bg-white dark:bg-white/5 px-2 text-right text-sm text-gray-900 dark:!text-white outline-none focus:border-indigo-500/60';

/** purchase/payments/create   (optional location.state = { supplierId, purchaseBillId, amount }) */
export default function CreatePaymentOut() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const saving = useSelector((state) => state.paymentOut.saving);

  const [init] = useState(() => location.state || null);
  const [supplier, setSupplier] = useState(() => (init?.supplierId ? { value: init.supplierId, label: '' } : null));
  const [amount, setAmount] = useState(() => (num(init?.amount) > 0 ? String(round2(init.amount)) : ''));
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentDate, setPaymentDate] = useState(() => todayISO());
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [allocations, setAllocations] = useState(() =>
    init?.purchaseBillId && num(init?.amount) > 0 ? { [init.purchaseBillId]: String(round2(init.amount)) } : {}
  );
  const [formError, setFormError] = useState('');

  const { info: supplierInfo, loading: supplierLoading } = useSupplierInfo(supplier?.value);
  const { data: billsRes, loading: billsLoading, error: billsError } = useApi(supplier?.value ? `open:${supplier.value}` : null, () => getSupplierOpenBillsApi(supplier.value));
  const bills = billsRes?.data || [];
  const totalDue = bills.reduce((s, b) => s + num(b.balanceAmount), 0);

  // Only allocations to bills that are actually open count.
  const allocFor = (b) => allocations[b._id] ?? '';
  const totalAllocated = round2(bills.reduce((s, b) => s + num(allocations[b._id]), 0));
  const payAmount = num(amount);
  const advance = round2(Math.max(0, payAmount - totalAllocated));
  const overAllocated = totalAllocated > payAmount + 0.001;
  const rowError = (b) => num(allocations[b._id]) > num(b.balanceAmount) + 0.001;

  const changeSupplier = (opt) => {
    setSupplier(opt ? { value: opt.value, label: opt.label } : null);
    setAllocations({});
  };

  const autoAllocate = () => {
    let left = payAmount;
    if (left <= 0) {
      // No amount yet: pay everything that is due.
      left = round2(totalDue);
      setAmount(String(left));
    }
    const next = {};
    for (const b of bills) {
      if (left <= 0) break;
      const take = round2(Math.min(left, num(b.balanceAmount)));
      if (take > 0) next[b._id] = String(take);
      left = round2(left - take);
    }
    setAllocations(next);
  };

  const submit = async (e) => {
    e.preventDefault();
    let problem = '';
    if (!supplier?.value) problem = 'Select a supplier.';
    else if (payAmount <= 0) problem = 'Enter the amount paid.';
    else if (bills.some(rowError)) problem = 'An allocation is more than the balance due on that bill.';
    else if (overAllocated) problem = `Allocated ${formatINR(totalAllocated)} is more than the payment of ${formatINR(payAmount)}.`;
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
      reference: reference.trim(),
      notes,
      allocations: bills.filter((b) => num(allocations[b._id]) > 0).map((b) => ({ purchaseBillId: b._id, amount: round2(allocations[b._id]) })),
    };
    try {
      const res = await dispatch(createPaymentOut(payload)).unwrap();
      notify(res?.message || 'Payment recorded');
      navigate(viewPath('payments', res?.data?._id), { replace: true });
    } catch (err) {
      const msg = errMsg(err);
      setFormError(msg);
      notifyError(msg);
    }
  };

  const bank = supplierInfo?.bankDetails || {};

  return (
    <PageShell title="Pay supplier">
      <form onSubmit={submit} className="flex flex-col gap-6">
        <FormError message={formError} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Section title="Payment details" className="lg:col-span-2" bodyClassName="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Supplier" required className="md:col-span-2">
              <SupplierPicker value={supplier} onChange={changeSupplier} info={supplierInfo} infoLoading={supplierLoading} error={!!formError && !supplier?.value} />
            </Field>
            <Field label="Amount paid (₹)" required>
              <Input type="number" min="0.01" step="0.01" value={amount} placeholder="0.00" onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label="Payment date" required>
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </Field>
            <Field label="Payment method" required>
              <NativeSelect value={paymentMethod} onChange={setPaymentMethod} options={PAYMENT_METHODS} />
            </Field>
            <Field label="Reference" hint="UTR, cheque number or transaction id">
              <Input value={reference} maxLength={60} onChange={(e) => setReference(e.target.value)} placeholder="e.g. UTR123456789" />
            </Field>
            <Field label="Notes" className="md:col-span-2">
              <TextArea value={notes} onChange={setNotes} rows={2} placeholder="Optional" />
            </Field>
          </Section>

          <Section title="Summary" bodyClassName="p-4 flex flex-col gap-3 text-sm">
            <div className="flex justify-between text-[var(--vs-text-secondary)]">
              <span>Payment</span>
              <span className="font-mono">{formatINR(payAmount)}</span>
            </div>
            <div className="flex justify-between text-[var(--vs-text-secondary)]">
              <span>Applied to bills</span>
              <span className={`font-mono ${overAllocated ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400'}`}>{formatINR(totalAllocated)}</span>
            </div>
            <div className="flex justify-between border-t border-[var(--vs-border)] pt-3 font-bold">
              <span>Kept as advance</span>
              <span className="font-mono text-amber-600 dark:text-amber-400">{formatINR(advance)}</span>
            </div>
            <p className="text-[11px] text-[var(--vs-text-secondary)]">Any amount not applied to a bill is saved as an advance and reduces what you owe this supplier.</p>
            {supplierInfo && (bank.accountNumber || bank.upiId) && (
              <div className="rounded-lg bg-[var(--vs-bg-secondary)] border border-[var(--vs-border)] p-3 text-xs flex flex-col gap-1">
                <span className="font-bold uppercase tracking-widest text-[10px] text-[var(--vs-text-secondary)]">Supplier bank details</span>
                {bank.accountName && <span>{bank.accountName}</span>}
                {bank.accountNumber && <span className="font-mono">A/c {bank.accountNumber}</span>}
                {bank.ifsc && <span className="font-mono">IFSC {bank.ifsc}</span>}
                {bank.bankName && <span>{bank.bankName}</span>}
                {bank.upiId && <span className="font-mono">UPI {bank.upiId}</span>}
              </div>
            )}
            <div className="flex flex-col gap-2 border-t border-[var(--vs-border)] pt-4">
              <Button type="submit" disabled={saving} className="w-full" startIcon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}>
                Save payment
              </Button>
              <Button variant="outline" onClick={() => navigate(-1)} disabled={saving} className="w-full">
                Cancel
              </Button>
            </div>
          </Section>
        </div>

        {supplier?.value && (
          <Section
            title="Apply to bills"
            bodyClassName="p-3 sm:p-4 flex flex-col gap-3"
            rightNode={
              bills.length > 0 ? (
                <Button size="sm" onClick={autoAllocate} startIcon={<RefreshCw className="w-4 h-4" />}>
                  Auto allocate (oldest first)
                </Button>
              ) : null
            }
          >
            {billsLoading ? (
              <EmptyState>Loading open bills...</EmptyState>
            ) : billsError ? (
              <EmptyState>{billsError}</EmptyState>
            ) : bills.length === 0 ? (
              <EmptyState>No unpaid bills for this supplier. The whole payment will be kept as an advance.</EmptyState>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[var(--vs-border)]">
                <table className="w-full text-sm border-collapse min-w-[760px]">
                  <thead className="bg-[var(--vs-bg-secondary)]">
                    <tr className="text-[11px] font-bold uppercase tracking-wider text-[var(--vs-text-secondary)]">
                      <th className="py-2.5 px-3 text-left">Bill</th>
                      <th className="py-2.5 px-3 text-left">Bill date</th>
                      <th className="py-2.5 px-3 text-left">Due date</th>
                      <th className="py-2.5 px-3 text-right">Bill total</th>
                      <th className="py-2.5 px-3 text-right">Balance due</th>
                      <th className="py-2.5 px-3 text-right">Pay now (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map((b) => {
                      const late = isOverdue(b.dueDate, b.balanceAmount);
                      const bad = rowError(b);
                      return (
                        <tr key={b._id} className="border-t border-[var(--vs-border)]">
                          <td className="py-2 px-3">
                            <div className="font-mono font-semibold">{b.billNumber}</div>
                            {b.supplierBillNo && <div className="text-[11px] text-[var(--vs-text-secondary)]">Supplier no. {b.supplierBillNo}</div>}
                          </td>
                          <td className="py-2 px-3">{fmtDate(b.billDate)}</td>
                          <td className={`py-2 px-3 ${late ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}`}>
                            {fmtDate(b.dueDate)}
                            {late && <span className="block text-[10px] uppercase">Overdue</span>}
                          </td>
                          <td className="py-2 px-3 text-right">{formatINR(b.totalAmount)}</td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              title="Pay the full balance"
                              onClick={() => setAllocations((prev) => ({ ...prev, [b._id]: String(round2(b.balanceAmount)) }))}
                              className="font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                            >
                              {formatINR(b.balanceAmount)}
                            </button>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={allocFor(b)}
                              onChange={(e) => setAllocations((prev) => ({ ...prev, [b._id]: e.target.value }))}
                              className={`${cellInput} ${bad ? 'border-red-500' : 'border-gray-200 dark:border-white/10'}`}
                            />
                            {bad && <div className="text-[10px] text-red-500 mt-0.5">More than due</div>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-[var(--vs-bg-secondary)] font-semibold">
                    <tr className="border-t border-[var(--vs-border)]">
                      <td className="py-2.5 px-3" colSpan={4}>
                        Total
                      </td>
                      <td className="py-2.5 px-3 text-right">{formatINR(totalDue)}</td>
                      <td className={`py-2.5 px-3 text-right ${overAllocated ? 'text-rose-600 dark:text-rose-400' : ''}`}>{formatINR(totalAllocated)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Section>
        )}
      </form>
      <PurchaseToaster />
    </PageShell>
  );
}

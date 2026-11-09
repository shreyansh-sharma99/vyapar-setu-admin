import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, Check, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import {
  Badge,
  Button,
  DocumentLayout,
  EmptyState,
  FormGrid,
  Input,
  LINE_TD,
  LINE_TH,
  LineItemsTable,
  LineRow,
  MoneyInput,
  PaymentPicker,
  Section,
  Spinner,
  Textarea,
  TotalsPanel,
  TotalsRow,
} from '@/components/ui';
import PurchaseToaster from '../components/PurchaseToaster';
import SupplierPicker from '../components/SupplierPicker';
import { Field, FormError } from '../components/ui';
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

  const saveButton = (className) => (
    <Button type="submit" loading={saving} startIcon={<Check />} className={className}>
      Save payment
    </Button>
  );

  return (
    <>
      <form onSubmit={submit}>
        <DocumentLayout
          header={{
            title: 'Pay a supplier',
            actions: (
              <>
                <Button variant="ghost" onClick={() => navigate(-1)} disabled={saving}>
                  Cancel
                </Button>
                {saveButton('hidden lg:inline-flex')}
              </>
            ),
          }}
          summary={
            <TotalsPanel title="Payment" totalLabel="You pay" total={formatINR(payAmount)}>
              {supplier?.value && bills.length > 0 && <TotalsRow label="Still owed after this" value={formatINR(leftAfter)} />}
              {advance > 0 && (
                <p className="m-0 text-xs leading-relaxed text-highlight">
                  {formatINR(advance)} extra is kept as an advance and used for this supplier&apos;s next bill.
                </p>
              )}
              {overAllocated && <p className="m-0 text-xs font-semibold text-danger-soft">The bills add up to more than you are paying.</p>}
            </TotalsPanel>
          }
          mobileBar={{ label: 'You pay', value: formatINR(payAmount), action: saveButton() }}
        >
          <FormError message={formError} />

          {/* 1. Who */}
          <Section title="1. Who did you pay?">
            <div className="flex flex-col gap-3">
              <SupplierPicker value={supplier} onChange={changeSupplier} info={supplierInfo} infoLoading={supplierLoading} error={!!formError && !supplier?.value} />
              {supplier?.value && !billsLoading && (
                <div className="flex flex-col gap-2 rounded-control bg-fill px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-ink">
                    {bills.length ? (
                      <>
                        <span className="font-semibold">{bills.length} unpaid {bills.length === 1 ? 'bill' : 'bills'}</span>
                        {lateBills.length > 0 && <span className="font-semibold text-danger"> · {lateBills.length} late</span>}
                      </>
                    ) : (
                      <span className="text-ink-muted">No unpaid bills — the payment will be kept as an advance.</span>
                    )}
                    {hasBank && (
                      <Button variant="link" size="xs" onClick={() => setShowBank((v) => !v)} className="ml-2">
                        {showBank ? 'Hide bank / UPI' : 'Show bank / UPI'}
                      </Button>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-ink-subtle">You owe</div>
                    <div className="text-xl font-extrabold tabular-nums text-ink">{formatINR(totalDue)}</div>
                  </div>
                </div>
              )}
              {showBank && hasBank && (
                <div className="grid grid-cols-1 gap-1 rounded-control bg-fill-2 p-3 text-xs text-ink-muted sm:grid-cols-2">
                  {bank.accountName && <span>Name: {bank.accountName}</span>}
                  {bank.accountNumber && <span className="font-mono">A/c: {bank.accountNumber}</span>}
                  {bank.ifsc && <span className="font-mono">IFSC: {bank.ifsc}</span>}
                  {bank.bankName && <span>Bank: {bank.bankName}</span>}
                  {bank.upiId && <span className="font-mono">UPI: {bank.upiId}</span>}
                </div>
              )}
            </div>
          </Section>

          {/* 2. How much */}
          <Section title="2. How much did you pay?">
            <div className="flex flex-col gap-4">
              {totalDue > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button variant={payAmount === totalDue ? 'soft' : 'secondary'} aria-pressed={payAmount === totalDue} onClick={() => pickAmount(totalDue)}>
                    Full amount {formatINR(totalDue)}
                  </Button>
                  {bills.length > 1 && oldest && (
                    <Button
                      variant={payAmount === num(oldest.balanceAmount) ? 'soft' : 'secondary'}
                      aria-pressed={payAmount === num(oldest.balanceAmount)}
                      onClick={() => pickAmount(oldest.balanceAmount)}
                    >
                      Oldest bill {formatINR(oldest.balanceAmount)}
                    </Button>
                  )}
                </div>
              )}
              <FormGrid cols={2} className="max-w-xl">
                <Field label="Amount (₹)" required>
                  <MoneyInput
                    size="lg"
                    value={amount}
                    placeholder="0.00"
                    onChange={(value) => {
                      setAmount(value);
                      setManual(null);
                    }}
                    className="font-bold"
                  />
                </Field>
                <Field label="Paid on">
                  <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                </Field>
              </FormGrid>
            </div>
          </Section>

          {/* 3. How */}
          <Section title="3. How did you pay?">
            <PaymentPicker method={paymentMethod} onMethodChange={setPaymentMethod} reference={reference} onReferenceChange={setReference} />
          </Section>

          {/* 4. Which bills */}
          {supplier?.value && (
            <Section
              title="4. Bills this payment clears"
              actions={
                manual ? (
                  <Button variant="link" size="xs" startIcon={<RotateCcw />} onClick={() => setManual(null)}>
                    Oldest bills first
                  </Button>
                ) : null
              }
              bodyClassName="px-3 sm:px-4"
            >
              {billsLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner label="Loading bills..." />
                </div>
              ) : billsError ? (
                <EmptyState icon={AlertTriangle} text={billsError} className="py-8" />
              ) : bills.length === 0 ? (
                <EmptyState text="No unpaid bills. The whole payment will be kept as an advance and used for the next bill." className="py-8" />
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="m-0 px-2 text-xs text-ink-muted">
                    {manual ? 'You changed how the money is split.' : 'The money goes to the oldest bills first. Change any amount if you want.'}
                  </p>
                  <LineItemsTable
                    minWidth={560}
                    head={
                      <tr>
                        <th className={LINE_TH}>Bill</th>
                        <th className={LINE_TH}>Pay by</th>
                        <th className={`${LINE_TH} text-right`}>Still to pay</th>
                        <th className={`${LINE_TH} w-40 text-right`}>Paying now</th>
                      </tr>
                    }
                  >
                    {bills.map((b) => {
                      const late = isOverdue(b.dueDate, b.balanceAmount);
                      const bad = rowError(b);
                      const now = num(allocFor(b));
                      const cleared = now > 0 && Math.abs(now - num(b.balanceAmount)) < 0.01;
                      return (
                        <LineRow key={b._id} tone={bad ? 'danger' : undefined}>
                          <td className={LINE_TD}>
                            <div className="font-mono font-semibold">{b.billNumber}</div>
                            <div className="truncate text-[11px] text-ink-subtle">
                              {fmtDate(b.billDate)}
                              {b.supplierBillNo ? ` · their no. ${b.supplierBillNo}` : ''}
                            </div>
                          </td>
                          <td className={`${LINE_TD} whitespace-nowrap ${late ? 'font-semibold text-danger' : ''}`}>
                            {fmtDate(b.dueDate || b.billDate)}
                            {late && (
                              <Badge tone="danger" className="ml-1.5 uppercase">
                                late
                              </Badge>
                            )}
                          </td>
                          <td className={`${LINE_TD} text-right tabular-nums`}>{formatINR(b.balanceAmount)}</td>
                          <td className={`${LINE_TD} text-right`}>
                            <Input
                              size="sm"
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              aria-label={`Paying now for ${b.billNumber}`}
                              value={allocFor(b)}
                              onChange={(e) => editRow(b, e.target.value)}
                              invalid={bad}
                              className="text-right tabular-nums"
                            />
                            {bad ? (
                              <div className="mt-1 text-[11px] font-medium text-danger">More than this bill needs</div>
                            ) : cleared ? (
                              <div className="mt-1 text-[11px] font-semibold text-success">Fully paid</div>
                            ) : null}
                          </td>
                        </LineRow>
                      );
                    })}
                  </LineItemsTable>
                </div>
              )}
            </Section>
          )}

          <div className="flex flex-col gap-2">
            <Button
              variant="link"
              size="sm"
              onClick={() => setShowNotes((v) => !v)}
              startIcon={showNotes ? <ChevronUp /> : <ChevronDown />}
              className="self-start"
            >
              {showNotes ? 'Hide note' : 'Add a note'}
            </Button>
            {showNotes && <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Anything to remember about this payment" />}
          </div>
        </DocumentLayout>
      </form>
      <PurchaseToaster />
    </>
  );
}

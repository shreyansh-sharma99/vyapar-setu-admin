import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Check } from 'lucide-react';
import { Alert, Button, Field, FormGrid, Input, MoneyInput, Section } from '@/components/ui';
import PayMethodPicker from './PayMethodPicker';
import { notify, notifyError } from './toast';
import { errMsg, formatINR, num, refId, round2, todayISO } from './helpers';
import { createPaymentOut } from '../paymentsOut/services/paymentOutSlice';

/** Pay a purchase bill right here: amount, date (today), how. `title` defaults to "Pay this bill". */
export default function PayBillPanel({ bill, onPaid, title = 'Pay this bill' }) {
  const dispatch = useDispatch();
  const saving = useSelector((state) => state.paymentOut?.saving);
  const balance = round2(bill.balanceAmount);
  const [amount, setAmount] = useState(String(balance));
  const [paymentDate, setPaymentDate] = useState(() => todayISO());
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');

  const pay = num(amount);
  const extra = round2(Math.max(0, pay - balance));

  const save = async () => {
    if (!(pay > 0)) {
      setError('Enter how much you paid.');
      return;
    }
    setError('');
    try {
      const res = await dispatch(
        createPaymentOut({
          supplierId: refId(bill.supplierId),
          paymentDate,
          amount: round2(pay),
          paymentMethod: method,
          reference: method === 'cash' ? '' : reference.trim(),
          notes: '',
          allocations: [{ purchaseBillId: bill._id, amount: round2(Math.min(pay, balance)) }],
        })
      ).unwrap();
      notify(res?.message || `Payment of ${formatINR(pay)} saved`);
      onPaid();
    } catch (e) {
      const msg = errMsg(e);
      setError(msg);
      notifyError(msg);
    }
  };

  return (
    <Section title={title} bodyClassName="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={pay === balance ? 'soft' : 'secondary'} aria-pressed={pay === balance} className="rounded-chip" onClick={() => setAmount(String(balance))}>
          Full {formatINR(balance)}
        </Button>
      </div>
      <FormGrid cols={2}>
        <Field label="Amount (₹)" required>
          <MoneyInput min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Pay date">
          <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
        </Field>
      </FormGrid>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-ink">How did you pay?</span>
        <PayMethodPicker method={method} onMethodChange={setMethod} reference={reference} onReferenceChange={setReference} compact />
      </div>
      {pay > 0 && pay < balance && <p className="m-0 text-xs text-ink-muted">{formatINR(round2(balance - pay))} will still be left to pay on this bill.</p>}
      {extra > 0 && <Alert tone="warning">{formatINR(extra)} extra is kept as an advance for this supplier&apos;s next bill.</Alert>}
      {error && <Alert tone="danger">{error}</Alert>}
      <Button onClick={save} loading={saving} disabled={saving} fullWidth startIcon={<Check />}>
        Save payment
      </Button>
    </Section>
  );
}

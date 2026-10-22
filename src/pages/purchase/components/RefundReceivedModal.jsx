import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import Button from '@/components/inputs/Button';
import { Input } from '@/components/inputs/Input';
import PayMethodPicker from './PayMethodPicker';
import { Field, Modal } from './ui';
import { notify, notifyError } from './toast';
import { errMsg, formatINR, num, returnRefundLeft, supplierName, todayISO } from './helpers';
import { recordReturnRefundApi } from '../purchaseReturns/services/purchaseReturnService';

/**
 * "Did the supplier give the money back?" for one return. Mount it only while
 * open (or with a key) so the amount starts from what is left each time.
 */
export default function RefundReceivedModal({ ret, onClose, onDone }) {
  const left = returnRefundLeft(ret);
  const [amount, setAmount] = useState(String(left));
  const [date, setDate] = useState(() => todayISO());
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const value = num(amount);

  const confirm = async () => {
    if (!(value > 0)) {
      setError('Enter the amount you received.');
      return;
    }
    if (value > left + 0.009) {
      setError(`Only ${formatINR(left)} is left to receive.`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await recordReturnRefundApi(ret._id, { amount: value, date, method, reference: method === 'cash' ? '' : reference.trim() });
      notify(res?.message || `${formatINR(value)} received`);
      onDone?.(res?.data);
    } catch (e) {
      const msg = errMsg(e);
      setError(msg);
      notifyError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={saving ? undefined : onClose}
      title="Money received back?"
      subtitle={`${ret.returnNumber} · ${supplierName(ret)}`}
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Not yet
          </Button>
          <Button onClick={confirm} disabled={saving} startIcon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}>
            Yes, received
          </Button>
        </>
      }
    >
      <p className="text-sm">
        {supplierName(ret)} has to give back <span className="font-bold">{formatINR(left)}</span> for these goods. Did you get it?
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount received (₹)" required>
          <Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="!font-bold" />
        </Field>
        <Field label="Received on">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">How did they pay?</span>
        <PayMethodPicker method={method} onMethodChange={setMethod} reference={reference} onReferenceChange={setReference} compact />
      </div>
      {value > 0 && value < left && <p className="text-xs text-[var(--vs-text-secondary)]">{formatINR(Math.round((left - value) * 100) / 100)} will still be pending.</p>}
      {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </Modal>
  );
}

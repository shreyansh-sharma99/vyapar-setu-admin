import { useState } from 'react';
import { Check } from 'lucide-react';
import { Alert, Button, Field, FormGrid, Input, Modal } from '@/components/ui';
import PayMethodPicker from './PayMethodPicker';
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
      hideClose={saving}
      closeOnBackdrop={!saving}
      title="Money received back?"
      subtitle={`${ret.returnNumber} · ${supplierName(ret)}`}
      size="lg"
      bodyClassName="flex flex-col gap-4"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Not yet
          </Button>
          <Button onClick={confirm} loading={saving} startIcon={<Check />}>
            Yes, received
          </Button>
        </>
      }
    >
      <p className="m-0 text-sm text-ink-muted">
        {supplierName(ret)} has to give back <span className="font-bold tabular-nums text-ink">{formatINR(left)}</span> for these goods. Did you get it?
      </p>
      <FormGrid cols={2}>
        <Field label="Amount received (₹)" required>
          <Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="text-right font-bold tabular-nums" />
        </Field>
        <Field label="Received on">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </FormGrid>
      <div className="flex flex-col">
        <span className="mb-2 text-[13px] font-semibold text-ink-muted">How did they pay?</span>
        <PayMethodPicker method={method} onMethodChange={setMethod} reference={reference} onReferenceChange={setReference} compact />
      </div>
      {value > 0 && value < left && <p className="m-0 text-xs text-ink-subtle">{formatINR(Math.round((left - value) * 100) / 100)} will still be pending.</p>}
      {error && <Alert tone="danger">{error}</Alert>}
    </Modal>
  );
}

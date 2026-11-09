import { useState } from 'react';
import { Banknote, Building2, CreditCard, FileText, MoreHorizontal, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Field } from './Field';
import { Input } from './Input';
import { FOCUS_RING } from './styles';

const MAIN = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'upi', label: 'UPI', icon: Smartphone },
  { value: 'bank_transfer', label: 'Bank transfer', icon: Building2 },
  { value: 'cheque', label: 'Cheque', icon: FileText },
];
const MORE = [
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'other', label: 'Other', icon: MoreHorizontal },
];
const REFERENCE_LABEL = {
  upi: 'UPI transaction ID',
  bank_transfer: 'UTR / transaction number',
  cheque: 'Cheque number',
  card: 'Card transaction reference',
  other: 'Reference',
};

/**
 * "How was it paid?" — method chips (Cash, UPI, Bank transfer, Cheque, then Card / Other)
 * and the reference box for anything that isn't cash.
 *   <PaymentPicker method onMethodChange reference onReferenceChange compact />
 */
function PaymentPicker({ method, onMethodChange, reference, onReferenceChange, compact = false }) {
  const [showMore, setShowMore] = useState(false);
  const moreShown = showMore || MORE.some((m) => m.value === method);
  const grid = compact ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-2 gap-2 sm:grid-cols-4';

  const chip = ({ value, label, icon: Icon }) => {
    const on = method === value;
    return (
      <button
        key={value}
        type="button"
        role="radio"
        aria-checked={on}
        onClick={() => onMethodChange(value)}
        className={cn(
          'flex h-11 items-center justify-center gap-2 rounded-control px-3 text-sm font-semibold transition-colors',
          on ? 'bg-highlight text-white shadow-card' : 'bg-fill text-ink-muted hover:text-ink',
          FOCUS_RING
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Payment method" className="flex flex-col gap-2">
        <div className={grid}>{MAIN.map(chip)}</div>
        {moreShown && <div className={grid}>{MORE.map(chip)}</div>}
      </div>
      {!moreShown && (
        <button type="button" onClick={() => setShowMore(true)} className="self-start text-xs font-semibold text-brand-ink hover:underline">
          Card or other way
        </button>
      )}
      {method !== 'cash' && (
        <Field label={REFERENCE_LABEL[method]} hint="Optional. Helps match the payment with your bank statement.">
          <Input value={reference} maxLength={60} onChange={(e) => onReferenceChange(e.target.value)} placeholder="Optional" />
        </Field>
      )}
    </div>
  );
}

export default PaymentPicker;
export { PaymentPicker };

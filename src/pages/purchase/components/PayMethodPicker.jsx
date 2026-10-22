import { useState } from 'react';
import { Banknote, Building2, CreditCard, FileText, MoreHorizontal, Smartphone } from 'lucide-react';
import { Input } from '@/components/inputs/Input';
import { Field } from './ui';

/** Big buttons for the usual ways of paying; card / other stay under "Card or other way". */
const METHODS = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'upi', label: 'UPI', icon: Smartphone },
  { value: 'bank_transfer', label: 'Bank transfer', icon: Building2 },
  { value: 'cheque', label: 'Cheque', icon: FileText },
];
const MORE_METHODS = [
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

const tileCls = (on) =>
  `flex flex-col items-center justify-center gap-1 h-16 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
    on ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 ring-1 ring-indigo-500' : 'border-[var(--vs-border)] hover:bg-[var(--vs-bg-secondary)]'
  }`;

/**
 * "How did you pay?" — method tiles + the reference box for non-cash payments.
 * `compact` puts the four main tiles in two columns (narrow side panels).
 */
export default function PayMethodPicker({ method, onMethodChange, reference, onReferenceChange, compact = false }) {
  const [showMore, setShowMore] = useState(false);
  const moreShown = showMore || MORE_METHODS.some((m) => m.value === method);
  const grid = compact ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-2 sm:grid-cols-4 gap-2';

  const tile = ({ value, label, icon: Icon }) => (
    <button key={value} type="button" className={tileCls(method === value)} onClick={() => onMethodChange(value)}>
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className={grid}>{METHODS.map(tile)}</div>
      {moreShown ? (
        <div className={grid}>{MORE_METHODS.map(tile)}</div>
      ) : (
        <button type="button" onClick={() => setShowMore(true)} className="self-start text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
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

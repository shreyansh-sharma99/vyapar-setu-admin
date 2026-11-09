import { AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui';

export const FieldError = ({ children }) =>
  children ? (
    <span role="alert" className="mt-1.5 flex items-center gap-1 text-xs font-medium text-danger">
      <AlertCircle className="size-3.5 shrink-0" />
      {children}
    </span>
  ) : null;

export const FieldHint = ({ children }) => (children ? <span className="mt-1.5 block text-xs text-ink-subtle">{children}</span> : null);

const TONE = { green: 'success', amber: 'warning', violet: 'primary', red: 'danger', gray: 'neutral' };

/** Preview count chips (Badge tones): [{ label, tone: green | amber | violet | red | gray }]. */
export const PreviewChips = ({ chips = [] }) => (
  <div className="flex flex-wrap gap-2">
    {chips.map((c) => (
      <Badge key={c.label} tone={TONE[c.tone] || 'neutral'} className="tabular-nums">
        {c.label}
      </Badge>
    ))}
  </div>
);

/** Preview heading with count chips and the Apply button. */
export const PreviewSummary = ({ title, chips = [], action }) => (
  <div className="flex flex-col gap-2">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="m-0 !text-[15px] !font-extrabold text-ink">{title}</h3>
      {action}
    </div>
    <PreviewChips chips={chips} />
  </div>
);

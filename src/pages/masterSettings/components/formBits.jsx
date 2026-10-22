import { AlertCircle } from 'lucide-react';

export const FieldError = ({ children }) =>
  children ? (
    <span className="text-[11px] font-medium text-rose-500 mt-1 flex items-center gap-1">
      <AlertCircle className="w-3 h-3 shrink-0" />
      {children}
    </span>
  ) : null;

export const FieldHint = ({ children }) =>
  children ? <span className="text-[11px] text-[var(--vs-text-secondary)] mt-1 block">{children}</span> : null;

const TONE = {
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  violet: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  gray: 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400',
};

/** Preview heading with count chips and the Apply button. */
export const PreviewSummary = ({ title, chips = [], action }) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <h4 className="text-sm font-bold text-[var(--vs-text-primary)] m-0">{title}</h4>
      {action}
    </div>
    <div className="flex flex-wrap gap-2 text-xs">
      {chips.map((c) => (
        <span key={c.label} className={`px-2.5 py-1 rounded-full font-semibold ${TONE[c.tone] || TONE.gray}`}>
          {c.label}
        </span>
      ))}
    </div>
  </div>
);

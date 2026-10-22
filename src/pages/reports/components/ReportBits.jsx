import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import Button from '@/components/inputs/Button';
import { Label } from '@/components/inputs/Label';
import DatePicker from '@/components/inputs/Datepicker';
import { inr } from '../services/pricingReportService';

/** From / To dates + Apply / Reset, with optional extra filters on the left. */
export function DateFilterBar({ idPrefix, value, defaults, onApply, children }) {
  const [from, setFrom] = useState(value.dateFrom);
  const [to, setTo] = useState(value.dateTo);
  const [resetKey, setResetKey] = useState(0);
  return (
    <div className="mb-5 bg-[var(--vs-bg-secondary)] p-3 sm:p-4 rounded-xl border border-[var(--vs-border)]">
      <div className="flex flex-wrap items-end gap-3 sm:gap-4">
        {children}
        <div className="w-40 sm:w-44">
          <Label className="!text-[11px] font-bold text-[var(--vs-text-secondary)] uppercase">From Date</Label>
          <DatePicker key={`f${resetKey}`} id={`${idPrefix}From`} placeholder="YYYY-MM-DD" defaultDate={from} onChange={(d, s) => setFrom(s)} />
        </div>
        <div className="w-40 sm:w-44">
          <Label className="!text-[11px] font-bold text-[var(--vs-text-secondary)] uppercase">To Date</Label>
          <DatePicker key={`t${resetKey}`} id={`${idPrefix}To`} placeholder="YYYY-MM-DD" defaultDate={to} onChange={(d, s) => setTo(s)} />
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => onApply({ dateFrom: from, dateTo: to })} className="h-9 px-4 text-xs font-bold">
            Apply Filter
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setFrom(defaults.dateFrom);
              setTo(defaults.dateTo);
              setResetKey((k) => k + 1);
              onApply(defaults);
            }}
            className="h-9 px-3 text-xs"
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ReportError({ message }) {
  if (!message) return null;
  return (
    <div className="mb-4 p-3 rounded-xl border border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-950/30 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
      <AlertCircle className="w-4 h-4 shrink-0" /> {message}
    </div>
  );
}

/** Profit-coloured amount. */
export const Money = ({ value, tone = false }) => (
  <span className={tone ? (Number(value) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400') : ''}>{inr(value)}</span>
);

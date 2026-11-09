import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { CalendarDays, RotateCcw } from 'lucide-react';
import { Alert, Button, Card, DateRangePicker, Label, Segmented, StatCard } from '@/components/ui';
import { cn } from '@/lib/utils';
import { currentFy, inr } from '../services/pricingReportService';

const ISO = 'YYYY-MM-DD';

/** Quick periods, as YYYY-MM-DD strings (the same strings the reports send). */
const quickRanges = () => {
  const today = dayjs();
  const lastMonth = today.subtract(1, 'month');
  return [
    { value: 'today', label: 'Today', dateFrom: today.format(ISO), dateTo: today.format(ISO) },
    { value: 'month', label: 'This month', dateFrom: today.startOf('month').format(ISO), dateTo: today.endOf('month').format(ISO) },
    { value: 'lastMonth', label: 'Last month', dateFrom: lastMonth.startOf('month').format(ISO), dateTo: lastMonth.endOf('month').format(ISO) },
    { value: 'fy', label: 'This FY', ...currentFy() },
  ];
};

const toDay = (s) => (s ? dayjs(s) : null);
const showDay = (s) => (s ? dayjs(s).format('D MMM YYYY') : '…');

/**
 * Period filter for every report: quick-range chips (Today · This month · Last month · This FY · Custom),
 * a date range picker for Custom, and Reset when the period is not the report's default.
 * Extra filters (product, person, group by) go in as children, on the left.
 * onApply({ dateFrom, dateTo }) runs as soon as a period is picked; onReset defaults to onApply(defaults).
 */
export function DateFilterBar({ idPrefix, value, defaults, onApply, onReset, children }) {
  const ranges = useMemo(() => quickRanges(), []);
  const matched = ranges.find((r) => r.dateFrom === value.dateFrom && r.dateTo === value.dateTo)?.value;
  const [custom, setCustom] = useState(false);
  const active = custom || !matched ? 'custom' : matched;
  const isDefault = value.dateFrom === defaults.dateFrom && value.dateTo === defaults.dateTo;

  const pick = (v) => {
    if (v === 'custom') {
      setCustom(true);
      return;
    }
    const r = ranges.find((x) => x.value === v);
    setCustom(false);
    onApply({ dateFrom: r.dateFrom, dateTo: r.dateTo });
  };

  const reset = () => {
    setCustom(false);
    if (onReset) onReset();
    else onApply(defaults);
  };

  return (
    <Card padding="sm" className="flex flex-wrap items-end gap-x-4 gap-y-3">
      {children}
      <div className="flex min-w-0 max-w-full flex-col">
        <Label className="inline-flex flex-wrap items-center gap-x-2">
          Period
          {active !== 'custom' && (
            <span className="inline-flex items-center gap-1 font-medium text-ink-subtle tabular-nums">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              {showDay(value.dateFrom)} – {showDay(value.dateTo)}
            </span>
          )}
        </Label>
        <div className="max-w-full overflow-x-auto">
          <Segmented
            aria-label="Period"
            options={[...ranges.map(({ value: v, label }) => ({ value: v, label })), { value: 'custom', label: 'Custom' }]}
            value={active}
            onChange={pick}
          />
        </div>
      </div>
      {active === 'custom' && (
        <div className="flex w-full flex-col sm:w-72">
          <Label htmlFor={`${idPrefix}Range`}>From – to</Label>
          <DateRangePicker
            id={`${idPrefix}Range`}
            value={[toDay(value.dateFrom), toDay(value.dateTo)]}
            onChange={(dates) =>
              onApply({ dateFrom: dates?.[0] ? dates[0].format(ISO) : '', dateTo: dates?.[1] ? dates[1].format(ISO) : '' })
            }
          />
        </div>
      )}
      {!isDefault && (
        <Button variant="ghost" size="sm" startIcon={<RotateCcw />} onClick={reset} className="mb-1 ml-auto">
          Reset
        </Button>
      )}
    </Card>
  );
}

const STAT_COLS = {
  1: 'sm:grid-cols-2 lg:grid-cols-3',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-2 xl:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  6: 'sm:grid-cols-3 xl:grid-cols-6', // one line on a wide screen
};

/** Row of StatCards: stats = [{ label, value, icon, tone, chip, chipTone }]. */
export function StatRow({ stats, className }) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:gap-4', STAT_COLS[stats.length] ?? 'sm:grid-cols-2 xl:grid-cols-4', className)}>
      {stats.map((s) => (
        <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} tone={s.tone} chip={s.chip} chipTone={s.chipTone} />
      ))}
    </div>
  );
}

export function ReportError({ message }) {
  if (!message) return null;
  return <Alert tone="danger">{message}</Alert>;
}

/** Profit-coloured amount. */
export const Money = ({ value, tone = false }) => (
  <span className={cn('tabular-nums', tone && (Number(value) < 0 ? 'text-danger' : 'text-success'))}>{inr(value)}</span>
);

import { formatINR, num } from './helpers';
import { TD } from './itemTable';
import { Button, Checkbox } from '@/components/ui';
import { LINE_TF } from '@/components/ui/styles';

/** "Excl. GST | Incl. GST" switch for the Amount column. */
export function GstModeToggle({ value, onChange }) {
  const btn = (mode, label) => (
    <Button
      variant={value === mode ? 'primary' : 'ghost'}
      size="xs"
      aria-pressed={value === mode}
      onClick={() => onChange(mode)}
      className="!h-auto !rounded-none !px-1.5 !py-0.5 !text-[10px] font-bold normal-case tracking-normal !shadow-none"
    >
      {label}
    </Button>
  );
  return (
    <span className="inline-flex rounded-md border border-line overflow-hidden ml-1.5 align-middle" role="group" aria-label="Show amounts with or without GST">
      {btn('excl', 'Excl. GST')}
      {btn('incl', 'Incl. GST')}
    </span>
  );
}

/** Amount header: label + the GST toggle. */
export function AmountHead({ className, mode, onModeChange }) {
  return (
    <th className={`${className} text-right`}>
      <span className="inline-flex items-center justify-end gap-1 flex-wrap">
        Amount
        <GstModeToggle value={mode} onChange={onModeChange} />
      </span>
    </th>
  );
}

/** Amount cell for one line in the chosen mode. */
export function AmountCell({ value, mode, has = true }) {
  return (
    <td className={`${TD} pt-4 text-right font-semibold whitespace-nowrap text-brand-ink`}>
      {has ? formatINR(mode === 'incl' ? value.incl : value.excl) : '—'}
    </td>
  );
}

/** Profit per piece (on SP, else MRP) and for the line. */
export function ProfitCell({ profit, pieces }) {
  if (!profit) {
    return (
      <td className={`${TD} pt-4 text-right text-xs`}>
        <span className="text-ink-subtle">—</span>
      </td>
    );
  }
  const tone = profit.perUnit < 0 ? 'text-danger' : 'text-success';
  return (
    <td className={`${TD} pt-3 text-right text-xs whitespace-nowrap`}>
      <div className="flex flex-col">
        <span className={`font-semibold ${tone}`}>{formatINR(profit.perUnit)}/pc</span>
        <span className="text-[10px] text-ink-subtle">on {profit.basis}</span>
        {num(pieces) > 0 && (
          <span className={`text-[10px] ${tone}`}>
            × {num(pieces)} = {formatINR(profit.perUnit * num(pieces))}
          </span>
        )}
      </div>
    </td>
  );
}

/** Total of the amount column, with the GST breakdown under it. */
export function TotalAmountCell({ totals, mode }) {
  return (
    <td className={`${LINE_TF} text-right whitespace-nowrap`}>
      <div className="flex flex-col items-end">
        <span className="text-base font-bold text-brand-ink">{formatINR(mode === 'incl' ? totals.incl : totals.excl)}</span>
        <span className="text-[10px] text-ink-subtle">
          {formatINR(totals.excl)} + {formatINR(totals.gst)} GST
        </span>
        <span className="text-[10px] font-semibold text-ink">= {formatINR(totals.incl)} incl. GST</span>
      </div>
    </td>
  );
}

/** Profit total for the footer. */
export function TotalProfitCell({ totals }) {
  const tone = totals.profit < 0 ? 'text-danger' : 'text-success';
  return (
    <td className={`${LINE_TF} text-right whitespace-nowrap text-xs`}>
      {totals.hasProfit ? <span className={`font-bold ${tone}`}>{formatINR(totals.profit)}</span> : <span className="text-ink-subtle">—</span>}
    </td>
  );
}

/**
 * Under the SP of a stock-in line: "Also make default price" — shown only when the SP differs
 * from the default and the user may change prices. Without it the SP is for this batch only.
 */
export function DefaultPriceTick({ line, changed, canUpdate, onChange }) {
  if (!changed || !canUpdate) return null;
  return (
    <span className="mt-1 flex" title="Also make this the Price master (default) price from today">
      <Checkbox
        checked={!!line.setAsDefault}
        onChange={(checked) => onChange({ setAsDefault: checked })}
        wrapperClassName="gap-1.5"
        className="!size-3.5 !rounded"
        label={<span className="block text-[10px] font-normal leading-tight text-ink-subtle">Also make default price</span>}
      />
    </span>
  );
}

/** GST % cell (from the product / document, read-only). */
export function GstCell({ taxPercent, has = true }) {
  return (
    <td className={`${TD} pt-4 text-center text-xs font-semibold whitespace-nowrap`} title="From the product (set when the product was added)">
      {!has ? '—' : num(taxPercent) > 0 ? `${num(taxPercent)}%` : <span className="font-normal text-ink-subtle">No GST</span>}
    </td>
  );
}

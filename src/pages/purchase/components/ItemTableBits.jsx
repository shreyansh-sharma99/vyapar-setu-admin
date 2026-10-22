import { formatINR, num } from './helpers';
import { TD } from './itemTable';

/** "Excl. GST | Incl. GST" switch for the Amount column. */
export function GstModeToggle({ value, onChange }) {
  const btn = (mode, label) => (
    <button
      type="button"
      onClick={() => onChange(mode)}
      className={`px-1.5 py-0.5 text-[10px] font-bold normal-case tracking-normal cursor-pointer ${
        value === mode ? 'bg-indigo-600 text-white' : 'text-[var(--vs-text-secondary)] hover:bg-[var(--vs-bg-primary)]'
      }`}
    >
      {label}
    </button>
  );
  return (
    <span className="inline-flex rounded-md border border-[var(--vs-border)] overflow-hidden ml-1.5 align-middle" role="group" aria-label="Show amounts with or without GST">
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
    <td className={`${TD} pt-4 text-right font-semibold whitespace-nowrap text-indigo-600 dark:text-indigo-400`}>
      {has ? formatINR(mode === 'incl' ? value.incl : value.excl) : '—'}
    </td>
  );
}

/** Profit per piece (on SP, else MRP) and for the line. */
export function ProfitCell({ profit, pieces }) {
  if (!profit) {
    return (
      <td className={`${TD} pt-4 text-right text-xs`}>
        <span className="text-[var(--vs-text-secondary)]">—</span>
      </td>
    );
  }
  const tone = profit.perUnit < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';
  return (
    <td className={`${TD} pt-3 text-right text-xs whitespace-nowrap`}>
      <div className="flex flex-col">
        <span className={`font-semibold ${tone}`}>{formatINR(profit.perUnit)}/pc</span>
        <span className="text-[10px] text-[var(--vs-text-secondary)]">on {profit.basis}</span>
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
    <td className={`${TD} text-right whitespace-nowrap`}>
      <div className="flex flex-col items-end">
        <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">{formatINR(mode === 'incl' ? totals.incl : totals.excl)}</span>
        <span className="text-[10px] text-[var(--vs-text-secondary)]">
          {formatINR(totals.excl)} + {formatINR(totals.gst)} GST
        </span>
        <span className="text-[10px] font-semibold text-[var(--vs-text-primary)]">= {formatINR(totals.incl)} incl. GST</span>
      </div>
    </td>
  );
}

/** Profit total for the footer. */
export function TotalProfitCell({ totals }) {
  const tone = totals.profit < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';
  return (
    <td className={`${TD} text-right whitespace-nowrap text-xs`}>
      {totals.hasProfit ? <span className={`font-bold ${tone}`}>{formatINR(totals.profit)}</span> : <span className="text-[var(--vs-text-secondary)]">—</span>}
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
    <label className="mt-1 flex items-start gap-1 text-[10px] leading-tight text-[var(--vs-text-secondary)] cursor-pointer select-none" title="Also make this the Price master (default) price from today">
      <input type="checkbox" checked={!!line.setAsDefault} onChange={(e) => onChange({ setAsDefault: e.target.checked })} className="h-3 w-3 mt-px cursor-pointer" />
      Also make default price
    </label>
  );
}

/** GST % cell (from the product / document, read-only). */
export function GstCell({ taxPercent, has = true }) {
  return (
    <td className={`${TD} pt-4 text-center text-xs font-semibold whitespace-nowrap`} title="From the product (set when the product was added)">
      {!has ? '—' : num(taxPercent) > 0 ? `${num(taxPercent)}%` : <span className="font-normal text-[var(--vs-text-secondary)]">No GST</span>}
    </td>
  );
}

import { AlertTriangle, Lock, TrendingUp } from 'lucide-react';
import { formatINR, num } from './helpers';
import { priceCheck, shownMrp, shownSp, spChanged, stockInCheck } from './stockInPricing';

/** Header cells for the new-batch columns. showSp = false hides SP, GST and the price check. */
export function StockInHeads({ th, showSp = true }) {
  return (
    <>
      <th className={`${th} w-36`}>Batch / expiry</th>
      <th className={`${th} w-28`}>
        MRP / pc (₹) <span className="text-rose-500">*</span>
      </th>
      {showSp && <th className={`${th} w-32`}>Selling price / pc (₹)</th>}
      {showSp && <th className={`${th} w-20 text-center`}>GST</th>}
      {showSp && <th className={`${th} w-44`}>Discount · Profit</th>}
    </>
  );
}

/** SP input, its GST breakdown and notes (changed / MRP went up / above MRP). */
function SpCell({ line, info, sp, check, calc, canEditSp, onChange, showError, td, cellInput }) {
  const changed = spChanged(line, info);
  const aboveMrp = showError && /Selling price/.test(check.error);
  const noPriceYet = info && !(num(info.sellingPrice) > 0) && !line.spTouched;
  return (
    <td className={td}>
      <div className="relative">
        <input
          type="number"
          min="0"
          step="0.01"
          value={noPriceYet ? '' : sp}
          disabled={!line.productId || !canEditSp}
          placeholder={noPriceYet ? 'Not set yet' : ''}
          title={canEditSp ? 'Change it to set a new selling price from today' : 'Only users who can edit products may change the selling price'}
          onChange={(e) => onChange({ sellingPrice: e.target.value, spTouched: true })}
          className={`${cellInput} disabled:opacity-60 ${changed ? '!border-indigo-500 font-semibold' : ''} ${aboveMrp ? '!border-red-500' : ''}`}
        />
        {!canEditSp && line.productId && <Lock className="w-3 h-3 absolute right-2 top-3 text-gray-400" />}
      </div>
      {calc && calc.spIncl > 0 && calc.gstRate > 0 && (
        <div className="text-[10px] text-[var(--vs-text-secondary)] mt-0.5 whitespace-nowrap">
          {calc.inclusive
            ? `= ${formatINR(calc.spExcl)} + ${formatINR(calc.gstAmount)} GST`
            : `+ ${calc.gstRate}% GST = ${formatINR(calc.spIncl)}`}
        </div>
      )}
      {changed && <div className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">New price from today</div>}
      {!changed && check.hint && canEditSp && (
        <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
          <TrendingUp className="w-3 h-3 shrink-0" /> {check.hint}
        </div>
      )}
      {aboveMrp && <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">Above MRP</div>}
    </td>
  );
}

/** Discount the customer gets off the MRP, and profit over the cost (per pc and for the line). */
function PriceCheckCell({ calc, qtyBase, td }) {
  if (!calc) return <td className={td} />;
  const profitTone = calc.profit === null ? '' : calc.profit < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';
  return (
    <td className={`${td} text-[11px] leading-snug whitespace-nowrap`}>
      <div>
        <span className="text-[var(--vs-text-secondary)]">Off MRP: </span>
        {calc.discountAmount === null ? '—' : <span className="font-semibold">{formatINR(calc.discountAmount)} ({calc.discountPercent}%)</span>}
      </div>
      <div>
        <span className="text-[var(--vs-text-secondary)]">Profit: </span>
        {calc.profit === null ? (
          '—'
        ) : (
          <span className={`font-semibold ${profitTone}`}>
            {formatINR(calc.profit)}/pc ({calc.profitPercent}%)
          </span>
        )}
      </div>
      {calc.profit !== null && num(qtyBase) > 0 && (
        <div className="text-[var(--vs-text-secondary)]">
          Line: <span className={`font-semibold ${profitTone}`}>{formatINR(calc.profit * num(qtyBase))}</span>
        </div>
      )}
    </td>
  );
}

/**
 * Body cells for one stock-in line: batch no + expiry, MRP (required), selling price
 * (with its GST breakdown), GST % from the product, discount off MRP and profit.
 * `info` = the product's row from /lookups/pricing; `costPerBase` = cost per pc, before GST;
 * `qtyBase` = pcs on the line (for the line profit).
 * showSp = false hides SP, GST and the price check (dated pricing off: the SP would not be used).
 */
export function StockInCells({ line, info, costPerBase, qtyBase = 0, canEditSp, onChange, submitted, td, cellInput, showSp = true }) {
  const disabled = !line.productId;
  const mrp = shownMrp(line, info);
  const sp = shownSp(line, info);
  const check = stockInCheck(line, info, costPerBase);
  const calc = priceCheck(line, info, costPerBase);
  const showError = submitted || line.mrpTouched || line.spTouched;

  return (
    <>
      <td className={td}>
        <input
          type="text"
          value={line.batchNo ?? ''}
          maxLength={60}
          disabled={disabled}
          placeholder="Batch no"
          onChange={(e) => onChange({ batchNo: e.target.value })}
          className={`${cellInput} disabled:opacity-50`}
        />
        <input
          type="date"
          value={line.expiryDate ?? ''}
          disabled={disabled}
          title="Expiry date"
          onChange={(e) => onChange({ expiryDate: e.target.value })}
          className={`${cellInput} mt-1 disabled:opacity-50`}
        />
      </td>
      <td className={td}>
        <input
          type="number"
          min="0"
          step="0.01"
          value={mrp}
          disabled={disabled}
          placeholder="Required"
          onChange={(e) => onChange({ mrp: e.target.value, mrpTouched: true })}
          className={`${cellInput} disabled:opacity-50 ${showError && line.productId && !(num(mrp) > 0) ? '!border-red-500' : ''}`}
        />
        {check.warning && (
          <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 shrink-0" /> {check.warning}
          </div>
        )}
      </td>
      {showSp && (
        <SpCell line={line} info={info} sp={sp} check={check} calc={calc} canEditSp={canEditSp} onChange={onChange} showError={showError} td={td} cellInput={cellInput} />
      )}
      {showSp && (
        <td className={`${td} pt-3 text-center text-xs font-semibold whitespace-nowrap`}>
          {!line.productId ? '' : calc && calc.gstRate > 0 ? `${calc.gstRate}%` : <span className="text-[var(--vs-text-secondary)] font-normal">No GST</span>}
        </td>
      )}
      {showSp && <PriceCheckCell calc={calc} qtyBase={qtyBase} td={td} />}
    </>
  );
}

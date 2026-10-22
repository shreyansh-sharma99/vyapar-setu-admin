import { Layers, RotateCcw, Split } from 'lucide-react';
import PriceSourceTag from './PriceSourceTag';

/**
 * Under a product on a sales line: price tag, the batch it is priced from
 * ("Batch B-1013 · SP ₹600 · MRP ₹650 · 11 left") with "Change batch" on every line,
 * "Split by batch" / a split hint and, for a typed price, the required reason + "Use master price".
 */
export default function LinePriceNote({ line, showBatch = false, onChangeBatch, onReason, onReset, submitted = false }) {
  if (!line?.productId) return null;
  const missingReason = line.priceOverride && !String(line.priceOverrideReason || '').trim();
  return (
    <div className="mt-1 flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        {line.priceSource && <PriceSourceTag source={line.priceSource} capped={line.mrpCapped} offer={line.offer} />}
        {showBatch && (line.batchId || line.autoBatchLabel || onChangeBatch) && (
          <span className="inline-flex flex-wrap items-center gap-1 text-[11px] text-[var(--vs-text-secondary)]">
            <Layers className="w-3 h-3" />
            {line.batchId ? line.batchLabel || 'Picked batch' : line.autoBatchLabel ? `Oldest · ${line.autoBatchLabel}` : 'Oldest batch'}
            {onChangeBatch && (
              <button type="button" onClick={onChangeBatch} className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer">
                Change batch
              </button>
            )}
          </span>
        )}
        {showBatch && line.batchSplit && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
            <Split className="w-3 h-3" /> Split by batch
          </span>
        )}
      </div>
      {showBatch && !line.batchId && line.splitHint && (
        <span className="text-[10px] text-amber-700 dark:text-amber-400">More than the oldest batch holds — saved as one line per batch price.</span>
      )}
      {line.priceOverride && (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            maxLength={200}
            value={line.priceOverrideReason || ''}
            onChange={(e) => onReason?.(e.target.value)}
            placeholder="Reason for the price change *"
            className={`h-7 flex-1 min-w-0 rounded-lg border px-2 text-xs bg-white dark:bg-white/5 text-gray-900 dark:!text-white outline-none ${
              submitted && missingReason ? 'border-red-500' : 'border-gray-200 dark:border-white/10'
            }`}
          />
          <button
            type="button"
            title="Use the master price again"
            onClick={onReset}
            className="p-1 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

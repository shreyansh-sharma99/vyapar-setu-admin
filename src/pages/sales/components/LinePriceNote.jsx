import { Layers, RotateCcw, Split } from 'lucide-react';
import { Badge, Button, Input } from '@/components/ui';
import PriceSourceTag from './PriceSourceTag';

/**
 * Under a product on a sales line: price tag, the batch it is priced from
 * ("Batch B-1013 · SP ₹600 · MRP ₹650 · 11 left") with "Change batch" on every line,
 * "Split by batch" / a split hint and, for a typed price, the required reason + "Use master price".
 */
export default function LinePriceNote({ line, showBatch = false, compact = false, freePrice = false, onChangeBatch, onReason, onReset, submitted = false }) {
  if (!line?.productId) return null;
  const missingReason = line.priceOverride && !String(line.priceOverrideReason || '').trim();
  const label = line.batchId ? line.batchLabel || 'Picked batch' : line.autoBatchLabel ? `Oldest · ${line.autoBatchLabel}` : 'Oldest batch';
  // A compact note sits beside the rate box, which already shows the SP.
  const batchText = compact ? label.replace(/^Oldest · /, '').replace(/ · SP ₹[^·]*(?= ·|$)/, '') : label;
  const showTag = line.priceSource && !(compact && line.priceSource === 'batch' && !line.mrpCapped);
  return (
    <div className="mt-1 flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        {showTag && <PriceSourceTag source={line.priceSource} capped={line.mrpCapped} offer={line.offer} />}
        {showBatch && (line.batchId || line.autoBatchLabel || onChangeBatch) && (
          <span className={compact ? 'text-[11px] text-ink-muted' : 'inline-flex flex-wrap items-center gap-1 text-[11px] text-ink-muted'}>
            {!compact && <Layers className="w-3 h-3" />}
            {batchText}
            {onChangeBatch && (
              <Button variant="link" size="xs" onClick={onChangeBatch} className={`!text-[11px] font-semibold ${compact ? 'ml-1.5 whitespace-nowrap' : ''}`}>
                Change batch
              </Button>
            )}
          </span>
        )}
        {showBatch && line.batchSplit && (
          <Badge tone="warning" icon={Split} size="xs">
            Split by batch
          </Badge>
        )}
      </div>
      {showBatch && !line.batchId && line.splitHint && (
        <span className="text-[10px] text-warning">More than the oldest batch holds — saved as one line per batch price.</span>
      )}
      {line.priceOverride && (
        <div className="flex items-center gap-1.5">
          {freePrice ? (
            <span className="min-w-0 flex-1 text-[11px] text-ink-muted">Price set on this bill</span>
          ) : (
            <Input
              size="sm"
              maxLength={200}
              value={line.priceOverrideReason || ''}
              onChange={(e) => onReason?.(e.target.value)}
              placeholder="Reason for the price change *"
              invalid={submitted && missingReason}
              wrapperClassName="flex-1 min-w-0"
              className="!h-7 !px-2 !text-xs !rounded-lg"
            />
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            title="Use the master price again"
            aria-label="Use the master price again"
            onClick={onReset}
            className="!size-7 hover:!text-brand-ink"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

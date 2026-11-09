import { CalendarClock, IndianRupee, Tag } from 'lucide-react';
import { formatDay } from '@/pages/masterSettings/components/gstUtils';
import { describeOffer, formatMoney, priceAfterOffer } from '@/pages/masterSettings/components/priceUtils';

/**
 * "Today's price" summary from GET /products/:id/prices:
 * ₹120 · Offer 5% till 20 Nov (₹114) · Next change 1 Dec (₹125).
 */
export default function TodayPriceCard({ data }) {
  const current = data?.current;
  if (!current) return null;
  const offer = data.activeOffer || null;
  const next = data.nextChange || null;
  const gstNote = current.priceIncludesGst ? 'incl. GST' : '+ GST';
  const fromMaster = current.source === 'master' && current.effectiveFrom;

  return (
    <div className="flex flex-col gap-2 rounded-control bg-brand-soft px-4 py-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-ink">
          <IndianRupee className="w-3.5 h-3.5" /> Default price for new batches
        </span>
        <span className="text-xs text-ink-muted">
          {fromMaster ? `Price master · from ${formatDay(current.effectiveFrom)}` : 'From the product card (no Price master entry yet)'}
        </span>
      </div>

      <div className="flex items-baseline gap-2 flex-wrap">
        <span className={`${offer ? 'text-base' : 'text-xl'} font-bold ${offer ? 'text-ink-subtle line-through' : 'text-brand-ink'} tabular-nums`}>
          {formatMoney(current.sellingPrice)}
        </span>
        {offer && (
          <span className="text-xl font-bold tabular-nums text-brand-ink">
            {formatMoney(priceAfterOffer(current.sellingPrice, offer))}
          </span>
        )}
        <span className="text-xs text-ink-muted">{gstNote}</span>
      </div>

      {(offer || next) && (
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-5 gap-y-1.5 text-xs">
          {offer && (
            <span className="flex items-center gap-1.5 font-semibold text-success">
              <Tag className="w-3.5 h-3.5 shrink-0" />
              Offer {describeOffer(offer)} till {formatDay(offer.endDate)}
            </span>
          )}
          {next && (
            <span className="flex items-center gap-1.5 text-ink-muted">
              <CalendarClock className="w-3.5 h-3.5 shrink-0" />
              Next change {formatDay(next.effectiveFrom)} → <span className="font-semibold text-ink">{formatMoney(next.sellingPrice)}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

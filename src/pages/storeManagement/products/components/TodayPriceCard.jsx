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
    <div className="px-4 py-3 rounded-xl border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/60 dark:bg-indigo-950/20 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
          <IndianRupee className="w-3.5 h-3.5" /> Default price for new batches
        </span>
        <span className="text-[11px] text-[var(--vs-text-secondary)]">
          {fromMaster ? `Price master · from ${formatDay(current.effectiveFrom)}` : 'From the product card (no Price master entry yet)'}
        </span>
      </div>

      <div className="flex items-baseline gap-2 flex-wrap">
        <span className={`${offer ? 'text-base' : 'text-xl'} font-bold ${offer ? 'text-[var(--vs-text-secondary)] line-through' : 'text-indigo-600 dark:text-indigo-400'}`}>
          {formatMoney(current.sellingPrice)}
        </span>
        {offer && (
          <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
            {formatMoney(priceAfterOffer(current.sellingPrice, offer))}
          </span>
        )}
        <span className="text-xs text-[var(--vs-text-secondary)]">{gstNote}</span>
      </div>

      {(offer || next) && (
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-5 gap-y-1.5 text-xs">
          {offer && (
            <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
              <Tag className="w-3.5 h-3.5 shrink-0" />
              Offer {describeOffer(offer)} till {formatDay(offer.endDate)}
            </span>
          )}
          {next && (
            <span className="flex items-center gap-1.5 text-[var(--vs-text-secondary)]">
              <CalendarClock className="w-3.5 h-3.5 shrink-0" />
              Next change {formatDay(next.effectiveFrom)} → <span className="font-semibold text-[var(--vs-text-primary)]">{formatMoney(next.sellingPrice)}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

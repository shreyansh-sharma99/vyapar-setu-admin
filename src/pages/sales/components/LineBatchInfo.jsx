import PriceSourceTag from './PriceSourceTag';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthYear = (d) => {
  const x = d ? new Date(d) : null;
  return x && !Number.isNaN(x.getTime()) ? `${MONTHS[x.getMonth()]} ${x.getFullYear()}` : '';
};

/**
 * Under a product on invoice / challan details (dated pricing): the price tag and
 * one row per batch the line took stock from — "Batch B-0925 · Exp Mar 2028 · MRP ₹120".
 */
export default function LineBatchInfo({ item, showPrice = true }) {
  const batches = Array.isArray(item?.batches) ? item.batches : [];
  if (!batches.length && !(showPrice && item?.priceSource)) return null;
  return (
    <div className="mt-1 flex flex-col gap-0.5">
      {item.batchSplit && <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">Split by batch</span>}
      {showPrice && item.priceSource && (
        <PriceSourceTag source={item.priceSource} capped={item.mrpCapped} offerType={item.offerType} offerValue={item.offerValue} />
      )}
      {showPrice && item.priceSource === 'manual' && item.priceOverrideReason && (
        <span className="text-[11px] text-violet-700 dark:text-violet-300">
          Price changed{item.priceOverriddenBy ? ` by ${item.priceOverriddenBy}` : ''}: {item.priceOverrideReason}
        </span>
      )}
      {batches.map((b, i) => (
        <span key={`${b.batchId || 'legacy'}-${i}`} className="text-[11px] text-[var(--vs-text-secondary)] font-normal">
          {[b.batchNo ? `Batch ${b.batchNo}` : 'Old stock', b.expiryDate ? `Exp ${monthYear(b.expiryDate)}` : '', Number(b.sellingPrice) > 0 ? `SP ₹${Number(b.sellingPrice)}` : '', Number(b.mrp) > 0 ? `MRP ₹${Number(b.mrp)}` : '', batches.length > 1 ? `× ${Number(b.qty)}` : '']
            .filter(Boolean)
            .join(' · ')}
        </span>
      ))}
    </div>
  );
}

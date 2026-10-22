/** Where a line's price comes from: Batch price / Master / Offer 5% / Clearance / MRP capped / Manual. */
const STYLES = {
  master: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-white/5 dark:text-gray-300 dark:border-white/10',
  batch: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
  offer: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
  clearance: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
  capped: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800',
  manual: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800',
};

const offerText = (offer, value, type) => {
  const t = offer?.type || type;
  const v = Number(offer?.value ?? value) || 0;
  if (t === 'percent') return `Offer ${v}%`;
  if (t === 'amount') return `Offer ₹${v} off`;
  if (t === 'fixed') return `Offer ₹${v}`;
  return 'Offer';
};

export default function PriceSourceTag({ source, capped = false, offer = null, offerType, offerValue, className = '' }) {
  if (!source) return null;
  const tags = [];
  if (source === 'offer') tags.push(['offer', offerText(offer, offerValue, offerType)]);
  else if (source === 'clearance') tags.push(['clearance', 'Clearance']);
  else if (source === 'manual') tags.push(['manual', 'Manual']);
  else if (source === 'batch') tags.push(['batch', 'Batch price']);
  else tags.push(['master', 'Master']);
  if (capped) tags.push(['capped', 'MRP capped']);
  return (
    <span className={`inline-flex flex-wrap gap-1 ${className}`}>
      {tags.map(([k, label]) => (
        <span key={k} className={`inline-flex px-1.5 py-0.5 rounded border text-[10px] font-semibold whitespace-nowrap ${STYLES[k]}`}>
          {label}
        </span>
      ))}
    </span>
  );
}

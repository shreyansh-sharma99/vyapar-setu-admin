import { Badge } from '@/components/ui';

/** Where a line's price comes from: Batch price / Master / Offer 5% / Clearance / MRP capped / Manual. */
// Badge tone per price source. A manual price needs a reason, so it stands out in red.
const TONES = {
  master: 'neutral',
  batch: 'primary',
  mrp: 'warning',
  offer: 'success',
  clearance: 'warning',
  capped: 'info',
  manual: 'danger',
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
  else if (source === 'mrp') tags.push(['mrp', 'MRP (no SP)']);
  else tags.push(['master', 'Master']);
  if (capped) tags.push(['capped', 'MRP capped']);
  return (
    <span className={`inline-flex flex-wrap gap-1 ${className}`}>
      {tags.map(([k, label]) => (
        <Badge key={k} tone={TONES[k]} size="xs" className="whitespace-nowrap rounded-md">
          {label}
        </Badge>
      ))}
    </span>
  );
}

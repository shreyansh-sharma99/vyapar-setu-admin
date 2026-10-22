import { formatDay } from './gstUtils';

export const OFFER_TYPE_OPTIONS = [
  { value: 'percent', label: '% off' },
  { value: 'amount', label: '₹ off' },
  { value: 'fixed', label: 'Offer price' },
];

export const BULK_MODE_OPTIONS = [
  { value: 'set', label: 'Set new price' },
  { value: 'percent', label: 'Change by %' },
  { value: 'amount', label: 'Change by ₹' },
];

/** Where a Price master row came from. */
export const PRICE_SOURCE_LABEL = {
  manual: 'Price master',
  bulk: 'Bulk change',
  purchase: 'Purchase',
  opening_stock: 'Opening stock',
  migration: 'Moved from product',
};

const SOURCE_REF_LABEL = { GoodsReceipt: 'GRN', PurchaseBill: 'Purchase bill', OpeningStock: 'Opening stock' };

/** "Purchase · GRN GRN-0012" / "Bulk change". */
export const describePriceSource = (row) => {
  const base = PRICE_SOURCE_LABEL[row?.source] || PRICE_SOURCE_LABEL.manual;
  const ref = row?.sourceRef;
  if (!ref?.number) return base;
  return `${base} · ${SOURCE_REF_LABEL[ref.type] || ref.type || ''} ${ref.number}`.trim();
};

export const formatMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
};

/** "5% off", "₹10 off", "Offer price ₹99". */
export const describeOffer = (offer) => {
  if (!offer) return '';
  const v = Number(offer.value) || 0;
  if (offer.type === 'percent') return `${v}% off`;
  if (offer.type === 'amount') return `${formatMoney(v)} off`;
  return `Offer price ${formatMoney(v)}`;
};

/** "10 Nov 2026 – 20 Nov 2026". */
export const offerDates = (offer) => `${formatDay(offer?.startDate)} – ${formatDay(offer?.endDate)}`;

/** Customer price after an offer (same rule as the server's applyOfferToUnitPrice). */
export const priceAfterOffer = (price, offer) => {
  const p = Number(price) || 0;
  if (!offer) return p;
  const v = Number(offer.value) || 0;
  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  if (offer.type === 'percent') return round2(p * (1 - Math.min(100, v) / 100));
  if (offer.type === 'amount') return round2(Math.max(0, p - v));
  return round2(Math.min(p, v));
};

/**
 * Validates a typed money value (max 2 decimals).
 * Returns { value: number | null, error: string }.
 */
export const parseMoney = (raw, { required = false, label = 'Amount', allowNegative = false, max } = {}) => {
  const text = String(raw ?? '').trim().replace(/^₹/, '').trim();
  if (!text) return { value: null, error: required ? `Enter the ${label}.` : '' };
  const pattern = allowNegative ? /^-?(\d+(\.\d{1,2})?|\.\d{1,2})$/ : /^(\d+(\.\d{1,2})?|\.\d{1,2})$/;
  if (!pattern.test(text)) return { value: null, error: `${label} must be a number with at most 2 decimals.` };
  const n = Number(text);
  if (!allowNegative && !(n > 0)) return { value: null, error: `${label} must be more than 0.` };
  if (allowNegative && n === 0) return { value: null, error: `${label} cannot be 0.` };
  if (max !== undefined && n > max) return { value: null, error: `${label} cannot be more than ${max}.` };
  return { value: n, error: '' };
};

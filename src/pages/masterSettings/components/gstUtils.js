import dayjs from 'dayjs';

// The GST % list comes from the platform (Admin Owner → Settings → GST Rates): see useGstRates.js.

/** "18%" or "18% + 12% cess". */
export const formatGst = (gstRate, cessRate) => {
  const gst = `${Number(gstRate) || 0}%`;
  return Number(cessRate) > 0 ? `${gst} + ${Number(cessRate)}% cess` : gst;
};

export const formatDay = (value) => (value ? dayjs(value).format('DD MMM YYYY') : '—');

/** First image URL of a product row (string or { path | url }). */
export const productImageUrl = (product) => {
  const img = Array.isArray(product?.images) ? product.images[0] : null;
  if (!img) return '';
  return typeof img === 'string' ? img : img.path || img.url || '';
};

/** GST % currently on the product card. */
export const productCardGst = (product) => (product?.isGstApplicable ? Number(product.gstRateOverride) || 0 : 0);

/**
 * Validates a typed percentage (0–100, max 2 decimals).
 * Returns { value: number | null, error: string }. Empty input → value null, no error unless `required`.
 */
export const parsePercent = (raw, { required = false, label = 'Value' } = {}) => {
  const text = String(raw ?? '').trim().replace(/%$/, '').trim();
  if (!text) return { value: null, error: required ? `Enter the ${label}.` : '' };
  if (!/^(\d+(\.\d{1,2})?|\.\d{1,2})$/.test(text)) {
    return { value: null, error: `${label} must be a number with at most 2 decimals.` };
  }
  const n = Number(text);
  if (!(n >= 0 && n <= 100)) return { value: null, error: `${label} must be between 0 and 100.` };
  return { value: n, error: '' };
};

export const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

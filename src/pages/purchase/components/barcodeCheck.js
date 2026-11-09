import apiClient from '@/utility/Http';
import { formatDate } from '@/utility/dateTiming';

/**
 * Barcode rules live on stock (server: barcodeService). A barcode belongs to a product while
 * it has stock (incl. damaged); after that it is on hold for Settings → Barcode hold days.
 * GET /lookups/barcode-check?code=&productId=
 * → { status: free|own|moving|in_use|on_hold|locked, holder, freeOn, currentCode, message }
 */
export const checkBarcodeApi = async (code, productId) => {
  const params = { code: String(code || '').trim() };
  if (productId) params.productId = productId;
  const response = await apiClient.get('/lookups/barcode-check', { params });
  return response.data?.data || null;
};

/** Statuses that block saving stock with this barcode. */
export const BLOCKING = ['in_use', 'on_hold', 'locked'];

/** Short text for the field: { tone: 'error' | 'info' | '', text }. */
export const barcodeNote = (res) => {
  if (!res) return { tone: '', text: '' };
  const h = res.holder || {};
  if (res.status === 'in_use') {
    if (!h.name) return { tone: 'error', text: res.message || 'Barcode in use by another product' };
    const damaged = h.damagedQty > 0 ? ` incl. ${h.damagedQty} damaged` : '';
    return { tone: 'error', text: `Used by "${h.name}" (${h.liveQty || 0} in stock${damaged})` };
  }
  if (res.status === 'on_hold') return { tone: 'error', text: `Was on "${h.name || 'another product'}" — free for another product on ${formatDate(res.freeOn)}` };
  if (res.status === 'locked') return { tone: 'error', text: `This product has stock with barcode ${h.code}; use the same barcode` };
  if (res.status === 'moving') return { tone: 'info', text: `Free — was on "${h.name || 'another product'}". It will move to this product.` };
  return { tone: '', text: '' };
};

/** Checks `code` and returns { code, status, tone, text } (a failed request never blocks: the server checks again). */
export const runBarcodeCheck = async (code, productId) => {
  const c = String(code || '').trim();
  if (!c) return { code: '', status: '', tone: '', text: '' };
  try {
    const res = await checkBarcodeApi(c, productId);
    return { code: c, status: res?.status || '', ...barcodeNote(res) };
  } catch {
    return { code: c, status: '', tone: '', text: '' };
  }
};

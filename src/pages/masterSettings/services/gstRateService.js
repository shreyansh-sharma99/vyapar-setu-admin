import apiClient from '@/utility/Http';

// ─── GST master (dated GST rates) ───────────────────────────────────────────

/** GET /lookups/products?q=&limit=&includeInactive=false — product search for the GST pickers. */
export const searchGstProductsApi = async (q = '', limit = 20) => {
  const response = await apiClient.get('/lookups/products', { params: { q, limit, includeInactive: false, withGst: true } });
  return response.data;
};

/** GET /products/:id/tax-rates → data: { product, current, hasMasterRows, rows } */
export const getTaxRatesApi = async (productId) => {
  const response = await apiClient.get(`/products/${productId}/tax-rates`);
  return response.data;
};

/** POST /products/:id/tax-rates { effectiveFrom: 'YYYY-MM-DD', gstRate, cessRate, note } */
export const addTaxRateApi = async (productId, payload) => {
  const response = await apiClient.post(`/products/${productId}/tax-rates`, payload);
  return response.data;
};

/** DELETE /products/:id/tax-rates/:rateId — only rates that have not started yet. */
export const deleteTaxRateApi = async (productId, rateId) => {
  const response = await apiClient.delete(`/products/${productId}/tax-rates/${rateId}`);
  return response.data;
};

/** POST /products/tax-rates/bulk/preview { filter: { productIds }, effectiveFrom, gstRate, cessRate, note } — no write. */
export const previewBulkTaxApi = async (payload) => {
  const response = await apiClient.post('/products/tax-rates/bulk/preview', payload);
  return response.data;
};

/** POST /products/tax-rates/bulk (same body as preview) → data: { count, skipped, effectiveFrom } */
export const applyBulkTaxApi = async (payload) => {
  const response = await apiClient.post('/products/tax-rates/bulk', payload);
  return response.data;
};

/** GET /products/tax-rates/lookup?productIds=a,b&date=YYYY-MM-DD → data: { date, rates: { [productId]: {...} } } */
export const lookupTaxRatesApi = async (productIds = [], date) => {
  const params = { productIds: (productIds || []).join(',') };
  if (date) params.date = date;
  const response = await apiClient.get('/products/tax-rates/lookup', { params });
  return response.data;
};

/** GET /products/tax-rates/history → { data: [{ product, effectiveFrom, gstRate, oldGstRate, status, changedBy, changedAt, canDelete }], meta } */
export const getGstHistoryApi = async (params) => {
  const response = await apiClient.get('/products/tax-rates/history', { params });
  return response.data;
};

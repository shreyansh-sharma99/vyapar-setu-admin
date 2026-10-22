import apiClient from '@/utility/Http';

// ─── Price master (dated selling prices) + offers ───────────────────────────

/**
 * GET /products/:id/prices → data: { product, current, activeOffer, nextChange, prices, offers }
 * (prices[].status: current | upcoming | old; offers[].status: active | upcoming | expired | cancelled)
 */
export const getProductPricingApi = async (productId) => {
  const response = await apiClient.get(`/products/${productId}/prices`);
  return response.data;
};

/** POST /products/:id/prices { effectiveFrom: 'YYYY-MM-DD', sellingPrice, priceIncludesGst, note } */
export const addPriceApi = async (productId, payload) => {
  const response = await apiClient.post(`/products/${productId}/prices`, payload);
  return response.data;
};

/** DELETE /products/:id/prices/:priceId — only prices that have not started yet. */
export const deletePriceApi = async (productId, priceId) => {
  const response = await apiClient.delete(`/products/${productId}/prices/${priceId}`);
  return response.data;
};

/** POST /products/:id/offers { type: 'percent'|'amount'|'fixed', value, startDate, endDate, note } */
export const addOfferApi = async (productId, payload) => {
  const response = await apiClient.post(`/products/${productId}/offers`, payload);
  return response.data;
};

/** PATCH /products/:id/offers/:offerId/cancel */
export const cancelOfferApi = async (productId, offerId) => {
  const response = await apiClient.patch(`/products/${productId}/offers/${offerId}/cancel`);
  return response.data;
};

/** POST /products/prices/bulk/preview { filter: { productIds }, mode: 'set'|'percent'|'amount', value, effectiveFrom, priceIncludesGst, note } */
export const previewBulkPricesApi = async (payload) => {
  const response = await apiClient.post('/products/prices/bulk/preview', payload);
  return response.data;
};

/** POST /products/prices/bulk (same body as preview) → data: { count, replaced, skipped, effectiveFrom } */
export const applyBulkPricesApi = async (payload) => {
  const response = await apiClient.post('/products/prices/bulk', payload);
  return response.data;
};

/** POST /products/offers/bulk/preview { filter: { productIds }, type, value, startDate, endDate, note } */
export const previewBulkOffersApi = async (payload) => {
  const response = await apiClient.post('/products/offers/bulk/preview', payload);
  return response.data;
};

/** POST /products/offers/bulk (same body as preview) → data: { count, skipped, startDate, endDate } */
export const applyBulkOffersApi = async (payload) => {
  const response = await apiClient.post('/products/offers/bulk', payload);
  return response.data;
};

/** GET /products/prices/history → { data: [{ product, effectiveFrom, sellingPrice, oldPrice, status, changedBy, changedAt, canDelete }], meta } */
export const getPriceHistoryApi = async (params) => {
  const response = await apiClient.get('/products/prices/history', { params });
  return response.data;
};

/** GET /products/offers/history → { data: [{ product, type, value, startDate, endDate, status, changedBy, changedAt, canCancel }], meta } */
export const getOfferHistoryApi = async (params) => {
  const response = await apiClient.get('/products/offers/history', { params });
  return response.data;
};

/**
 * POST /products/prices/batch-wise — in one save: new default prices (from effectiveFrom) and a
 * new SP for chosen batches (each its own price, right away).
 * payload: { effectiveFrom, priceIncludesGst?, note, defaults: [{ productId, sellingPrice }], batches: [{ batchId, sellingPrice }] }
 */
export const saveBatchWisePricesApi = async (payload) => {
  const response = await apiClient.post('/products/prices/batch-wise', payload);
  return response.data;
};

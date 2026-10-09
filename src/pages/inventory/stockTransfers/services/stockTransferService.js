import apiClient from '@/utility/Http';

export const getStockTransfersApi = async (params) => {
  const response = await apiClient.get('/stock-transfers', { params });
  return response.data;
};

export const getStockTransferByIdApi = async (id) => {
  const response = await apiClient.get(`/stock-transfers/${id}`);
  return response.data;
};

export const createStockTransferApi = async (payload) => {
  const response = await apiClient.post('/stock-transfers', payload);
  return response.data;
};

export const updateStockTransferApi = async (id, payload) => {
  const response = await apiClient.put(`/stock-transfers/${id}`, payload);
  return response.data;
};

export const dispatchStockTransferApi = async (id) => {
  const response = await apiClient.patch(`/stock-transfers/${id}/dispatch`);
  return response.data;
};

/** payload: { items?: [{ itemId, receivedQty }], notes } */
export const receiveStockTransferApi = async (id, payload) => {
  const response = await apiClient.patch(`/stock-transfers/${id}/receive`, payload);
  return response.data;
};

export const cancelStockTransferApi = async (id, payload) => {
  const response = await apiClient.patch(`/stock-transfers/${id}/cancel`, payload);
  return response.data;
};

export const deleteStockTransferApi = async (id) => {
  const response = await apiClient.delete(`/stock-transfers/${id}`);
  return response.data;
};

/* ─── Lookups shared by inventory screens ───────────────────────────────── */

/** Stores for dropdowns. Pass `{ isActive: true }` for active stores only. */
export const getStoresLookupApi = async (params = {}) => {
  const response = await apiClient.get('/stores', { params });
  return response.data;
};

/** Product with populated storeStocks — used to refresh available qty on draft edit */
export const getProductByIdApi = async (id) => {
  const response = await apiClient.get(`/products/${id}`);
  return response.data;
};

/** params: { q, storeId, limit } — rows carry `storeStock` when storeId is given */
export const lookupProductsApi = async (params) => {
  const response = await apiClient.get('/lookups/products', { params });
  return response.data;
};

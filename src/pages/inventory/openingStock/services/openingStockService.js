import apiClient from '@/utility/Http';

/** GET /opening-stock?page&limit&search&status&storeId&dateFrom&dateTo&sort&order → { data, meta } */
export const getOpeningStocksApi = async (params) => {
  const response = await apiClient.get('/opening-stock', { params });
  return response.data;
};

export const getOpeningStockByIdApi = async (id) => {
  const response = await apiClient.get(`/opening-stock/${id}`);
  return response.data;
};

/** POST /opening-stock { storeId, openingDate, notes, items, post } */
export const createOpeningStockApi = async (payload) => {
  const response = await apiClient.post('/opening-stock', payload);
  return response.data;
};

/** PUT /opening-stock/:id — drafts only */
export const updateOpeningStockApi = async (id, payload) => {
  const response = await apiClient.put(`/opening-stock/${id}`, payload);
  return response.data;
};

export const postOpeningStockApi = async (id) => {
  const response = await apiClient.patch(`/opening-stock/${id}/post`);
  return response.data;
};

export const cancelOpeningStockApi = async (id, reason) => {
  const response = await apiClient.patch(`/opening-stock/${id}/cancel`, { reason: reason || '' });
  return response.data;
};

/** DELETE /opening-stock/:id — draft or cancelled only */
export const deleteOpeningStockApi = async (id) => {
  const response = await apiClient.delete(`/opening-stock/${id}`);
  return response.data;
};

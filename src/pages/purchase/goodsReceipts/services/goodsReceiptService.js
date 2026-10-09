import apiClient from '@/utility/Http';

export const getGoodsReceiptsApi = async (params) => {
  const response = await apiClient.get('/goods-receipts', { params });
  return response.data;
};

export const getGoodsReceiptByIdApi = async (id) => {
  const response = await apiClient.get(`/goods-receipts/${id}`);
  return response.data;
};

export const createGoodsReceiptApi = async (payload) => {
  const response = await apiClient.post('/goods-receipts', payload);
  return response.data;
};

export const updateGoodsReceiptApi = async (id, payload) => {
  const response = await apiClient.put(`/goods-receipts/${id}`, payload);
  return response.data;
};

export const postGoodsReceiptApi = async (id) => {
  const response = await apiClient.patch(`/goods-receipts/${id}/post`);
  return response.data;
};

export const cancelGoodsReceiptApi = async (id, reason) => {
  const response = await apiClient.patch(`/goods-receipts/${id}/cancel`, { reason: reason || '' });
  return response.data;
};

export const deleteGoodsReceiptApi = async (id) => {
  const response = await apiClient.delete(`/goods-receipts/${id}`);
  return response.data;
};

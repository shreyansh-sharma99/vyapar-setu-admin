import apiClient from '@/utility/Http';

export const getPurchaseReturnsApi = async (params) => {
  const response = await apiClient.get('/purchase-returns', { params });
  return response.data;
};

export const getPurchaseReturnByIdApi = async (id) => {
  const response = await apiClient.get(`/purchase-returns/${id}`);
  return response.data;
};

export const createPurchaseReturnApi = async (payload) => {
  const response = await apiClient.post('/purchase-returns', payload);
  return response.data;
};

export const updatePurchaseReturnApi = async (id, payload) => {
  const response = await apiClient.put(`/purchase-returns/${id}`, payload);
  return response.data;
};

export const confirmPurchaseReturnApi = async (id) => {
  const response = await apiClient.patch(`/purchase-returns/${id}/confirm`);
  return response.data;
};

export const cancelPurchaseReturnApi = async (id, reason) => {
  const response = await apiClient.patch(`/purchase-returns/${id}/cancel`, { reason: reason || '' });
  return response.data;
};

export const deletePurchaseReturnApi = async (id) => {
  const response = await apiClient.delete(`/purchase-returns/${id}`);
  return response.data;
};

import apiClient from '@/utility/Http';

export const getPurchaseBillsApi = async (params) => {
  const response = await apiClient.get('/purchase-bills', { params });
  return response.data;
};

export const getPurchaseBillByIdApi = async (id) => {
  const response = await apiClient.get(`/purchase-bills/${id}`);
  return response.data;
};

export const createPurchaseBillApi = async (payload) => {
  const response = await apiClient.post('/purchase-bills', payload);
  return response.data;
};

export const updatePurchaseBillApi = async (id, payload) => {
  const response = await apiClient.put(`/purchase-bills/${id}`, payload);
  return response.data;
};

export const confirmPurchaseBillApi = async (id) => {
  const response = await apiClient.patch(`/purchase-bills/${id}/confirm`);
  return response.data;
};

export const cancelPurchaseBillApi = async (id, reason) => {
  const response = await apiClient.patch(`/purchase-bills/${id}/cancel`, { reason: reason || '' });
  return response.data;
};

export const deletePurchaseBillApi = async (id) => {
  const response = await apiClient.delete(`/purchase-bills/${id}`);
  return response.data;
};

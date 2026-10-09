import apiClient from '@/utility/Http';

export const getStoresApi = async (params) => {
  const response = await apiClient.get('/stores', { params });
  return response.data;
};

export const getStoreByIdApi = async (storeId) => {
  const response = await apiClient.get(`/stores/${storeId}`);
  return response.data;
};

export const createStoreApi = async (payload) => {
  const response = await apiClient.post('/stores', payload);
  return response.data;
};

export const updateStoreApi = async (storeId, payload) => {
  const response = await apiClient.put(`/stores/${storeId}`, payload);
  return response.data;
};

export const setDefaultStoreApi = async (storeId) => {
  const response = await apiClient.patch(`/stores/${storeId}/set-default`);
  return response.data;
};

export const deleteStoreApi = async (storeId) => {
  const response = await apiClient.delete(`/stores/${storeId}`);
  return response.data;
};

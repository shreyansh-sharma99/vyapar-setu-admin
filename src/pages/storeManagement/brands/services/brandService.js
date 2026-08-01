import apiClient from '@/utility/Http';

export const getBrandsApi = async (params) => {
  const response = await apiClient.get('/brands', { params });
  return response.data;
};

export const getBrandByIdApi = async (brandId) => {
  const response = await apiClient.get(`/brands/${brandId}`);
  return response.data;
};

export const createBrandApi = async (payload) => {
  const response = await apiClient.post('/brands', payload);
  return response.data;
};

export const updateBrandApi = async (brandId, payload) => {
  const response = await apiClient.put(`/brands/${brandId}`, payload);
  return response.data;
};

export const changeBrandStatusApi = async (brandId, status) => {
  const response = await apiClient.patch(`/brands/${brandId}/status`, { status });
  return response.data;
};

export const deleteBrandApi = async (brandId) => {
  const response = await apiClient.delete(`/brands/${brandId}`);
  return response.data;
};

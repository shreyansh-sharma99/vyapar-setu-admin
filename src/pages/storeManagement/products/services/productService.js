import apiClient from '@/utility/Http';

export const getProductsApi = async (params) => {
  const response = await apiClient.get('/products', { params });
  return response.data;
};

export const getProductByIdApi = async (productId) => {
  const response = await apiClient.get(`/products/${productId}`);
  return response.data;
};

export const createProductApi = async (payload) => {
  const response = await apiClient.post('/products', payload);
  return response.data;
};

export const updateProductApi = async (productId, payload) => {
  const response = await apiClient.put(`/products/${productId}`, payload);
  return response.data;
};

export const changeProductStatusApi = async (productId, status) => {
  const response = await apiClient.patch(`/products/${productId}/status`, { status });
  return response.data;
};

export const deleteProductApi = async (productId) => {
  const response = await apiClient.delete(`/products/${productId}`);
  return response.data;
};

export const getProductByBarcodeApi = async (barcode) => {
  const response = await apiClient.get(`/products/by-barcode/${barcode}`);
  return response.data;
};

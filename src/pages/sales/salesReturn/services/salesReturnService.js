import apiClient from '@/utility/Http';

export const getSalesReturnsApi = async (params) => {
  const response = await apiClient.get('/sales-returns', { params });
  return response.data;
};

export const createSalesReturnApi = async (payload) => {
  const response = await apiClient.post('/sales-returns', payload);
  return response.data;
};

export const getSalesReturnByIdApi = async (id) => {
  const response = await apiClient.get(`/sales-returns/${id}`);
  return response.data;
};

export const updateSalesReturnApi = async (id, payload) => {
  const response = await apiClient.put(`/sales-returns/${id}`, payload);
  return response.data;
};

export const updateSalesReturnStatusApi = async (id, status) => {
  const response = await apiClient.patch(`/sales-returns/${id}/status`, { status });
  return response.data;
};

export const deleteSalesReturnApi = async (id) => {
  const response = await apiClient.delete(`/sales-returns/${id}`);
  return response.data;
};

import apiClient from '@/utility/Http';

export const getDeliveryChallansApi = async (params) => {
  const response = await apiClient.get('/delivery-challans', { params });
  return response.data;
};

export const createDeliveryChallanApi = async (payload) => {
  const response = await apiClient.post('/delivery-challans', payload);
  return response.data;
};

export const getDeliveryChallanByIdApi = async (id) => {
  const response = await apiClient.get(`/delivery-challans/${id}`);
  return response.data;
};

export const updateDeliveryChallanApi = async (id, payload) => {
  const response = await apiClient.put(`/delivery-challans/${id}`, payload);
  return response.data;
};

export const updateDeliveryChallanStatusApi = async (id, status) => {
  const response = await apiClient.patch(`/delivery-challans/${id}/status`, { status });
  return response.data;
};

export const convertToInvoiceApi = async (id) => {
  const response = await apiClient.post(`/delivery-challans/${id}/convert-to-invoice`);
  return response.data;
};

export const deleteDeliveryChallanApi = async (id) => {
  const response = await apiClient.delete(`/delivery-challans/${id}`);
  return response.data;
};

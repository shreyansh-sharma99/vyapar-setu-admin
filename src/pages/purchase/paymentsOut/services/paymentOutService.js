import apiClient from '@/utility/Http';

export const getPaymentsOutApi = async (params) => {
  const response = await apiClient.get('/payments-out', { params });
  return response.data;
};

export const getPaymentOutByIdApi = async (id) => {
  const response = await apiClient.get(`/payments-out/${id}`);
  return response.data;
};

export const createPaymentOutApi = async (payload) => {
  const response = await apiClient.post('/payments-out', payload);
  return response.data;
};

export const cancelPaymentOutApi = async (id, reason) => {
  const response = await apiClient.patch(`/payments-out/${id}/cancel`, { reason: reason || '' });
  return response.data;
};

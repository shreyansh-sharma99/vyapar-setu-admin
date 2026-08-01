import apiClient from '@/utility/Http';

export const getPaymentsInApi = async (params) => {
  const response = await apiClient.get('/payments-in', { params });
  return response.data;
};

export const recordPaymentInApi = async (payload) => {
  const response = await apiClient.post('/payments-in', payload);
  return response.data;
};

export const getPaymentInByIdApi = async (id) => {
  const response = await apiClient.get(`/payments-in/${id}`);
  return response.data;
};

export const allocateAdvanceApi = async (id, payload) => {
  const response = await apiClient.post(`/payments-in/${id}/allocate`, payload);
  return response.data;
};

export const deletePaymentInApi = async (id) => {
  const response = await apiClient.delete(`/payments-in/${id}`);
  return response.data;
};

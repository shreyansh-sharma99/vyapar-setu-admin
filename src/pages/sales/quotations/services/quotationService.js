import apiClient from '@/utility/Http';

export const getQuotationsApi = async (params) => {
  const response = await apiClient.get('/quotations', { params });
  return response.data;
};

export const createQuotationApi = async (payload) => {
  const response = await apiClient.post('/quotations', payload);
  return response.data;
};

export const getQuotationByIdApi = async (id) => {
  const response = await apiClient.get(`/quotations/${id}`);
  return response.data;
};

export const updateQuotationApi = async (id, payload) => {
  const response = await apiClient.put(`/quotations/${id}`, payload);
  return response.data;
};

export const sendQuotationApi = async (id) => {
  const response = await apiClient.patch(`/quotations/${id}/send`);
  return response.data;
};

export const acceptQuotationApi = async (id) => {
  const response = await apiClient.patch(`/quotations/${id}/accept`);
  return response.data;
};

export const rejectQuotationApi = async (id) => {
  const response = await apiClient.patch(`/quotations/${id}/reject`);
  return response.data;
};

export const convertToProformaApi = async (id) => {
  const response = await apiClient.post(`/quotations/${id}/convert-to-proforma`);
  return response.data;
};

export const convertToInvoiceApi = async (id) => {
  const response = await apiClient.post(`/quotations/${id}/convert-to-invoice`);
  return response.data;
};

export const duplicateQuotationApi = async (id) => {
  const response = await apiClient.post(`/quotations/${id}/duplicate`);
  return response.data;
};

export const deleteQuotationApi = async (id) => {
  const response = await apiClient.delete(`/quotations/${id}`);
  return response.data;
};

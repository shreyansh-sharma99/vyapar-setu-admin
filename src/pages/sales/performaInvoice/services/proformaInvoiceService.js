import apiClient from '@/utility/Http';

export const getProformaInvoicesApi = async (params) => {
  const response = await apiClient.get('/proforma-invoices', { params });
  return response.data;
};

export const createProformaInvoiceApi = async (payload) => {
  const response = await apiClient.post('/proforma-invoices', payload);
  return response.data;
};

export const getProformaInvoiceByIdApi = async (id) => {
  const response = await apiClient.get(`/proforma-invoices/${id}`);
  return response.data;
};

export const updateProformaInvoiceApi = async (id, payload) => {
  const response = await apiClient.put(`/proforma-invoices/${id}`, payload);
  return response.data;
};

export const sendProformaInvoiceApi = async (id) => {
  const response = await apiClient.patch(`/proforma-invoices/${id}/send`);
  return response.data;
};

export const convertToInvoiceApi = async (id) => {
  const response = await apiClient.post(`/proforma-invoices/${id}/convert-to-invoice`);
  return response.data;
};

export const downloadProformaPdfApi = async (id) => {
  const response = await apiClient.get(`/proforma-invoices/${id}/pdf`, { responseType: 'blob' });
  return response.data;
};

export const duplicateProformaInvoiceApi = async (id) => {
  const response = await apiClient.post(`/proforma-invoices/${id}/duplicate`);
  return response.data;
};

export const deleteProformaInvoiceApi = async (id) => {
  const response = await apiClient.delete(`/proforma-invoices/${id}`);
  return response.data;
};

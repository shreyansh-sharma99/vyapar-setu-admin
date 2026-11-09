import apiClient from '@/utility/Http';

export const getSalesInvoicesApi = async (params) => {
  const response = await apiClient.get('/sales-invoices', { params });
  return response.data;
};

export const getSalesInvoiceSummaryApi = async () => {
  const response = await apiClient.get('/sales-invoices/summary');
  return response.data;
};

export const createSalesInvoiceApi = async (payload) => {
  const response = await apiClient.post('/sales-invoices', payload);
  return response.data;
};

export const getSalesInvoiceByIdApi = async (id) => {
  const response = await apiClient.get(`/sales-invoices/${id}`);
  return response.data;
};

export const updateSalesInvoiceApi = async (id, payload) => {
  const response = await apiClient.put(`/sales-invoices/${id}`, payload);
  return response.data;
};

export const confirmSalesInvoiceApi = async (id) => {
  const response = await apiClient.patch(`/sales-invoices/${id}/confirm`);
  return response.data;
};

export const markSalesInvoicePaidApi = async (id, payload) => {
  const response = await apiClient.patch(`/sales-invoices/${id}/mark-paid`, payload);
  return response.data;
};

export const voidSalesInvoiceApi = async (id, payload) => {
  const response = await apiClient.patch(`/sales-invoices/${id}/void`, payload);
  return response.data;
};

/** body: { pdf, fileName } — the invoice PDF in the Invoice Layout design (optional) */
export const sendPaymentReminderApi = async (id, body = {}) => {
  const response = await apiClient.post(`/sales-invoices/${id}/send-reminder`, body);
  return response.data;
};

export const generatePaymentLinkApi = async (id) => {
  const response = await apiClient.post(`/sales-invoices/${id}/payment-link`);
  return response.data;
};

export const downloadSalesInvoicePdfApi = async (id) => {
  const response = await apiClient.get(`/sales-invoices/${id}/pdf`, { responseType: 'blob' });
  return response.data;
};

export const duplicateSalesInvoiceApi = async (id) => {
  const response = await apiClient.post(`/sales-invoices/${id}/duplicate`);
  return response.data;
};

export const deleteSalesInvoiceApi = async (id) => {
  const response = await apiClient.delete(`/sales-invoices/${id}`);
  return response.data;
};

/** Delete a wrong receipt: the server takes it off the invoice and the customer ledger. */
export const deletePaymentInApi = async (id) => {
  const response = await apiClient.delete(`/payments-in/${id}`);
  return response.data;
};

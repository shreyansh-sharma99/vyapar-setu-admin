import apiClient from '@/utility/Http';

/**
 * Fetch invoice layout configuration
 * GET /invoice-layout
 */
export const getInvoiceLayoutApi = async () => {
  const response = await apiClient.get('/invoice-layout');
  return response.data;
};

/**
 * Update invoice layout configuration
 * PUT /invoice-layout
 */
export const updateInvoiceLayoutApi = async (payload) => {
  const response = await apiClient.put('/invoice-layout', payload);
  return response.data;
};

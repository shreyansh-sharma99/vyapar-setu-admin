import apiClient from '@/utility/Http';

/**
 * Fetch general invoice settings
 * GET /general-invoice-settings
 */
export const getGeneralInvoiceSettingsApi = async () => {
  const response = await apiClient.get('/general-invoice-settings');
  return response.data;
};

/**
 * Update general invoice settings
 * PUT /general-invoice-settings
 */
export const updateGeneralInvoiceSettingsApi = async (payload) => {
  const response = await apiClient.put('/general-invoice-settings', payload);
  return response.data;
};

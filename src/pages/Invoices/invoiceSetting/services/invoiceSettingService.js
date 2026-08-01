import apiClient from '@/utility/Http';

/**
 * Fetch all invoice settings profiles
 * GET /invoice-settings
 */
export const getInvoiceSettingsApi = async () => {
  const response = await apiClient.get('/invoice-settings');
  return response.data;
};

/**
 * Create a new invoice setting profile
 * POST /invoice-settings
 */
export const createInvoiceSettingApi = async (payload) => {
  const response = await apiClient.post('/invoice-settings', payload);
  return response.data;
};

/**
 * Fetch a single invoice setting profile by ID
 * GET /invoice-settings/:id
 */
export const getInvoiceSettingByIdApi = async (id) => {
  const response = await apiClient.get(`/invoice-settings/${id}`);
  return response.data;
};

/**
 * Update an existing invoice setting profile
 * PUT /invoice-settings/:id
 */
export const updateInvoiceSettingApi = async (id, payload) => {
  const response = await apiClient.put(`/invoice-settings/${id}`, payload);
  return response.data;
};

/**
 * Set an invoice setting profile as default
 * PATCH /invoice-settings/:id/set-default
 */
export const setDefaultInvoiceSettingApi = async (id) => {
  const response = await apiClient.patch(`/invoice-settings/${id}/set-default`);
  return response.data;
};

/**
 * Delete an invoice setting profile
 * DELETE /invoice-settings/:id
 */
export const deleteInvoiceSettingApi = async (id) => {
  const response = await apiClient.delete(`/invoice-settings/${id}`);
  return response.data;
};

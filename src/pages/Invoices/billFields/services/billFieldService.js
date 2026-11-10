import apiClient from '@/utility/Http';

/** GET /settings/bill-fields (owner) */
export const getBillFieldsApi = async () => {
  const response = await apiClient.get('/settings/bill-fields');
  return response.data?.data || [];
};

/** PUT /settings/bill-fields (owner) */
export const saveBillFieldsApi = async (billFields) => {
  const response = await apiClient.put('/settings/bill-fields', { billFields });
  return response.data?.data || [];
};

/** GET /lookups/bill-fields: active fields for the invoice form */
export const lookupBillFieldsApi = async () => {
  const response = await apiClient.get('/lookups/bill-fields');
  return response.data?.data || [];
};

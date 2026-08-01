import apiClient from '@/utility/Http';

/**
 * Fetch paginated customer ledger entries
 * GET /customer-ledger/:customerId
 */
export const getCustomerLedgerApi = async (customerId, params) => {
  const response = await apiClient.get(`/customer-ledger/${customerId}`, { params });
  return response.data;
};

/**
 * Fetch customer ledger balance stats
 * GET /customer-ledger/:customerId/stats
 */
export const getCustomerLedgerStatsApi = async (customerId) => {
  const response = await apiClient.get(`/customer-ledger/${customerId}/stats`);
  return response.data;
};

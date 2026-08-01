import apiClient from '@/utility/Http';

/**
 * Get Sales Register Report
 * GET /reports/sales-register?dateFrom=...&dateTo=...
 */
export const getSalesRegisterApi = async (params) => {
  const response = await apiClient.get('/reports/sales-register', { params });
  return response.data;
};

/**
 * Get GSTR-1 Report
 * GET /reports/gstr1?dateFrom=...&dateTo=...
 */
export const getGstr1Api = async (params) => {
  const response = await apiClient.get('/reports/gstr1', { params });
  return response.data;
};

/**
 * Get HSN Summary Report
 * GET /reports/hsn-summary?dateFrom=...&dateTo=...
 */
export const getHsnSummaryApi = async (params) => {
  const response = await apiClient.get('/reports/hsn-summary', { params });
  return response.data;
};

/**
 * Get Accounts Ageing Report
 * GET /reports/ageing
 */
export const getAgeingApi = async (params) => {
  const response = await apiClient.get('/reports/ageing', { params });
  return response.data;
};

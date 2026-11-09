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
 * One GSTR-1 table, one page: GET /reports/gstr1/table?name=b2b&page&limit&dateFrom&dateTo
 * → { rows, total, page, limit, columns }
 */
export const getGstr1TableApi = async (params) => {
  const response = await apiClient.get('/reports/gstr1/table', { params });
  return response.data?.data || {};
};

/**
 * Download the GSTR-1 data — the same tables and columns as the page.
 * format 'csv' + name: that table as CSV; format 'xlsx': every table, one sheet each.
 */
export const downloadGstr1Api = async (params) => {
  const response = await apiClient.get('/reports/gstr1/export', { params, responseType: 'blob' });
  const given = /filename="?([^";]+)"?/.exec(response.headers?.['content-disposition'] || '')?.[1];
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = given || `GSTR1_${params.dateFrom || 'all'}_${params.dateTo || ''}.${params.format === 'csv' ? 'csv' : 'xlsx'}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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

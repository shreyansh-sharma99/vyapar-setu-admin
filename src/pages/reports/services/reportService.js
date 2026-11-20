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
  a.download = given || `GSTR1_${params.dateFrom || 'all'}_${params.dateTo || ''}.${{ csv: 'csv', json: 'json' }[params.format] || 'xlsx'}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/** GSTR-2 summary: GET /reports/gstr2?dateFrom&dateTo → { totals, counts } */
export const getGstr2Api = async (params) => (await apiClient.get('/reports/gstr2', { params })).data?.data || {};

/** One GSTR-2 table, one page: GET /reports/gstr2/table?name&page&limit → { rows, total, columns } */
export const getGstr2TableApi = async (params) => (await apiClient.get('/reports/gstr2/table', { params })).data?.data || {};

/** Download GSTR-2: format 'csv' + name (one table) or 'xlsx' (all tables). */
export const downloadGstr2Api = async (params) => {
  const response = await apiClient.get('/reports/gstr2/export', { params, responseType: 'blob' });
  const given = /filename="?([^";]+)"?/.exec(response.headers?.['content-disposition'] || '')?.[1];
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = given || `GSTR2_${params.dateFrom || 'all'}_${params.dateTo || ''}.${params.format === 'csv' ? 'csv' : 'xlsx'}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/** GSTR-3B draft: GET /reports/gstr3b?dateFrom&dateTo&itcSource&includeOnly2b */
export const getGstr3bApi = async (params) => (await apiClient.get('/reports/gstr3b', { params })).data?.data || null;

/** GSTR-9 annual summary: GET /reports/gstr9?fy=2026 */
export const getGstr9Api = async (params) => (await apiClient.get('/reports/gstr9', { params })).data?.data || null;

/** Upload GSTR-2B: POST /reports/gstr2b/import { period, fileName, file } */
export const importGstr2bApi = async (body) => (await apiClient.post('/reports/gstr2b/import', body)).data;

/** GSTR-2B match, one page: GET /reports/gstr2b/match?period&status&page&limit → { rows, total, summary, columns } */
export const getGstr2bMatchApi = async (params) => {
  const query = { ...params };
  delete query.name; // the shared table passes its name; the API doesn't need it
  return (await apiClient.get('/reports/gstr2b/match', { params: query })).data?.data || {};
};

/** Download the match: format csv | xlsx */
export const downloadGstr2bMatchApi = async (params) => {
  const response = await apiClient.get('/reports/gstr2b/match/export', { params, responseType: 'blob' });
  const given = /filename="?([^";]+)"?/.exec(response.headers?.['content-disposition'] || '')?.[1];
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = given || `GSTR2B_match_${params.period}.${params.format === 'csv' ? 'csv' : 'xlsx'}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/** GST checks before filing: GET /reports/gst-checks?dateFrom&dateTo → { rows, counts } */
export const getGstChecksApi = async (params) => {
  const response = await apiClient.get('/reports/gst-checks', { params });
  return response.data?.data || { rows: [], counts: { errors: 0, warnings: 0 } };
};

/** GST return periods of a financial year: GET /reports/gst-periods?fy=2026 → { fy, frequency, rows } */
export const getGstPeriodsApi = async (params) => {
  const response = await apiClient.get('/reports/gst-periods', { params });
  return response.data?.data || {};
};

/** Mark a return filed: PUT /reports/gst-periods/file { returnType, period, arn, filedOn } */
export const markGstFiledApi = async (body) => (await apiClient.put('/reports/gst-periods/file', body)).data;

/** Reopen a filed period: POST /reports/gst-periods/reopen { returnType, period, reason } */
export const reopenGstPeriodApi = async (body) => (await apiClient.post('/reports/gst-periods/reopen', body)).data;

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

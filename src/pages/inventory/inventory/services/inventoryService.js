import apiClient from '@/utility/Http';

/**
 * Fetch inventory list (server-side search / filter / sort / pagination + stats)
 * @param {Object} params - { page, limit, search, storeId, categoryId, brandId, status, stockStatus, sort, order }
 */
export const getInventoryApi = async (params) => {
  const response = await apiClient.get('/inventory', { params });
  return response.data;
};

/**
 * Adjust product stock
 * @param {Object} payload - { productId, storeId, action: 'increase' | 'decrease' | 'set', amount, reason, unitCost?, batchNo?, expiryDate? }
 */
export const adjustStockApi = async (payload) => {
  const response = await apiClient.post('/inventory/adjust', payload);
  return response.data;
};

/**
 * Fetch Stock Audit Report / Movements
 * @param {Object} params - { storeId, productId, source, action, bucket, startDate, endDate, search, page, limit }
 */
export const getAuditReportApi = async (params) => {
  const response = await apiClient.get('/inventory/audit-logs', { params });
  return response.data;
};

/**
 * Export Stock Audit Report CSV from backend
 * @param {Object} params - { storeId, productId, source, action, bucket, startDate, endDate, search }
 */
export const exportAuditReportCsvApi = async (params) => {
  const response = await apiClient.get('/inventory/audit-logs/export', {
    params,
    responseType: 'blob',
  });
  return response.data;
};


/* ─── Inventory v2 ──────────────────────────────────────────────────────── */

/**
 * Store-wise stock matrix (rows = products, columns = stores)
 * @param {Object} params - { page, limit, search, categoryId, brandId }
 */
export const getStoreWiseStockApi = async (params) => {
  const response = await apiClient.get('/inventory/store-wise', { params });
  return response.data;
};

/**
 * Damaged stock list (one row per product × store)
 * @param {Object} params - { page, limit, search, storeId }
 */
export const getDamagedStockApi = async (params) => {
  const response = await apiClient.get('/inventory/damaged', { params });
  return response.data;
};

/**
 * Move stock between sellable / damaged buckets or write damaged stock off
 * @param {Object} payload - { productId, storeId, qty, action: 'mark' | 'restore' | 'write_off', reason }
 */
export const damageStockApi = async (payload) => {
  const response = await apiClient.post('/inventory/damage', payload);
  return response.data;
};

/**
 * Reorder report — products at / below their low-stock level per store
 * @param {Object} params - { page, limit, storeId, search, categoryId, brandId, supplierId, days }
 */
export const getReorderReportApi = async (params) => {
  const response = await apiClient.get('/inventory/reorder', { params });
  return response.data;
};

/**
 * Stock valuation
 * @param {Object} params - { method: 'fifo' | 'average', groupBy: 'product' | 'category' | 'store', storeId, search, includeDamaged, page, limit }
 */
export const getStockValuationApi = async (params) => {
  const response = await apiClient.get('/inventory/valuation', { params });
  return response.data;
};

/** Stock movement sources ([{ value, label }]) for the audit "Activity" filter */
export const getStockSourcesApi = async () => {
  const response = await apiClient.get('/inventory/sources');
  return response.data;
};

/* ─── Lookups used by inventory screens ─────────────────────────────────── */

/**
 * Async product search for pickers (name, SKU, barcode, HSN). Max 50 rows.
 * @param {Object} params - { q, storeId, limit, includeInactive }
 */
export const searchProductsLookupApi = async (params) => {
  const response = await apiClient.get('/lookups/products', { params });
  return response.data;
};

/** Suppliers for filter dropdowns */
export const getSupplierOptionsApi = async (params = { limit: 100, isActive: true }) => {
  const response = await apiClient.get('/suppliers', { params });
  return response.data;
};

/** Categories for filter dropdowns */
export const getCategoryOptionsApi = async (params = { limit: 100 }) => {
  const response = await apiClient.get('/categories', { params });
  return response.data;
};

/** Brands for filter dropdowns */
export const getBrandOptionsApi = async (params = { limit: 100 }) => {
  const response = await apiClient.get('/brands', { params });
  return response.data;
};

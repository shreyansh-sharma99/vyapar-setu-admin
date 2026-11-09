import apiClient from '@/utility/Http';

/**
 * Fetch inventory list (server-side search / filter / sort / pagination + stats)
 * @param {Object} params - { page, limit, search, categoryId, brandId, status, stockStatus, sort, order }
 */
export const getInventoryApi = async (params) => {
  const response = await apiClient.get('/inventory', { params });
  return response.data;
};

/**
 * Adjust product stock
 * @param {Object} payload - { productId, action: 'increase' | 'decrease' | 'set', amount, reason, unitCost?, batchNo?, expiryDate? }
 */
export const adjustStockApi = async (payload) => {
  const response = await apiClient.post('/inventory/adjust', payload);
  return response.data;
};

/**
 * Fetch Stock Audit Report / Movements
 * @param {Object} params - { productId, source, action, bucket, startDate, endDate, search, page, limit }
 */
export const getAuditReportApi = async (params) => {
  const response = await apiClient.get('/inventory/audit-logs', { params });
  return response.data;
};

/**
 * Export Stock Audit Report CSV from backend
 * @param {Object} params - { productId, source, action, bucket, startDate, endDate, search }
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
 * Damaged stock list (one row per product)
 * @param {Object} params - { page, limit, search }
 */
export const getDamagedStockApi = async (params) => {
  const response = await apiClient.get('/inventory/damaged', { params });
  return response.data;
};

/**
 * Move stock between sellable / damaged buckets or write damaged stock off
 * @param {Object} payload - { productId, qty, action: 'mark' | 'restore' | 'write_off', reason }
 */
export const damageStockApi = async (payload) => {
  const response = await apiClient.post('/inventory/damage', payload);
  return response.data;
};

/**
 * Stock valuation
 * @param {Object} params - { method: 'fifo' | 'average', groupBy: 'product' | 'category', search, includeDamaged, page, limit }
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
 * @param {Object} params - { q, limit, includeInactive }
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

/**
 * Batches (cost layers) of a product, in the order they are sold.
 * GET /inventory/batches?productId&onlyOpen → data: { product, batches: [{ _id, batchNo, receivedAt, expiryDate, mrp, unitCost, qtyRemaining, clearancePrice }] }
 */
export const getBatchesApi = async ({ productId, onlyOpen = true } = {}) => {
  const params = { productId, onlyOpen };
  const response = await apiClient.get('/inventory/batches', { params });
  return response.data;
};

/** PATCH /inventory/batches/:batchId/clearance { clearancePrice | null, reason } */
export const setClearancePriceApi = async (batchId, clearancePrice, reason = '') => {
  const response = await apiClient.patch(`/inventory/batches/${batchId}/clearance`, { clearancePrice, reason });
  return response.data;
};

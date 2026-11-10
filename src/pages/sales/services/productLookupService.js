import apiClient from '@/utility/Http';

/** Customers matching a mobile number / name. GET /lookups/customers?q= */
export const lookupCustomersApi = async (q) => {
  const response = await apiClient.get('/lookups/customers', { params: { q } });
  return response.data?.data || [];
};

/** POST /customers → the new customer */
export const createCustomerQuickApi = async (data) => {
  const response = await apiClient.post('/customers', data);
  return response.data?.data || null;
};

/**
 * Search products for document lines.
 * GET /lookups/products?q=&limit=
 * Matches name, SKU, barcode, pack barcode and HSN; exact barcode/SKU matches come first
 * (flagged with `matchedExactly`).
 */
export const lookupProductsApi = async ({ q = '', limit = 20, itemType } = {}) => {
  const params = { q, limit, ...(itemType ? { itemType } : {}) };
  const response = await apiClient.get('/lookups/products', { params });
  return response.data?.data || [];
};

/** Full product — used to fill details for lines of an existing document. */
export const getProductForLineApi = async (productId) => {
  const response = await apiClient.get(`/products/${productId}`);
  return response.data?.data || null;
};


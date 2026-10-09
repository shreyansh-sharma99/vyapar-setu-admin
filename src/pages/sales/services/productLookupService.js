import apiClient from '@/utility/Http';

/**
 * Search products for document lines.
 * GET /lookups/products?q=&storeId=&limit=
 * Matches name, SKU, barcode, pack barcode and HSN; exact barcode/SKU matches come first
 * (flagged with `matchedExactly`). With `storeId` each row carries `storeStock`.
 */
export const lookupProductsApi = async ({ q = '', storeId, limit = 20 } = {}) => {
  const params = { q, limit };
  if (storeId) params.storeId = storeId;
  const response = await apiClient.get('/lookups/products', { params });
  return response.data?.data || [];
};

/** Full product (with storeStocks) — used to fill details for lines of an existing document. */
export const getProductForLineApi = async (productId) => {
  const response = await apiClient.get(`/products/${productId}`);
  return response.data?.data || null;
};

/**
 * Sellable stock of a product in one store.
 * Products created before multi-store support have no store rows; their stock sits in the
 * default store, so we fall back to the total (same rule as the backend lookup).
 */
export const getStockInStore = (product, storeId) => {
  if (!product) return null;
  const rows = product.storeStocks || [];
  if (storeId && rows.length > 0) {
    const row = rows.find((s) => String(s.storeId?._id || s.storeId) === String(storeId));
    return row ? Number(row.stock || 0) : 0;
  }
  return Number(product.currentStock ?? product.storeStock ?? 0);
};

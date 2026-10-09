import apiClient from '@/utility/Http';

export const getProductsApi = async (params) => {
  const response = await apiClient.get('/products', { params });
  return response.data;
};

export const getProductByIdApi = async (productId) => {
  const response = await apiClient.get(`/products/${productId}`);
  return response.data;
};

export const createProductApi = async (payload) => {
  const response = await apiClient.post('/products', payload);
  return response.data;
};

export const updateProductApi = async (productId, payload) => {
  const response = await apiClient.put(`/products/${productId}`, payload);
  return response.data;
};

export const changeProductStatusApi = async (productId, status) => {
  const response = await apiClient.patch(`/products/${productId}/status`, { status });
  return response.data;
};

export const deleteProductApi = async (productId) => {
  const response = await apiClient.delete(`/products/${productId}`);
  return response.data;
};

export const getProductByBarcodeApi = async (barcode) => {
  const response = await apiClient.get(`/products/by-barcode/${barcode}`);
  return response.data;
};

// ─── Catalog v2: duplicates, barcodes, variants, import / export ─────────────

/** GET /products/similar?name=&barcode=&excludeId=&limit= → data: [product + similarity + reasons] */
export const getSimilarProductsApi = async (params) => {
  const response = await apiClient.get('/products/similar', { params });
  return response.data;
};

/** POST /products/generate-barcodes { productIds? } (omit = all products without a barcode) */
export const generateBarcodesApi = async (productIds) => {
  const body = Array.isArray(productIds) && productIds.length ? { productIds } : {};
  const response = await apiClient.post('/products/generate-barcodes', body);
  return response.data;
};

/** GET /products/:id/variants → data: { variantGroupId, variants } */
export const getProductVariantsApi = async (productId) => {
  const response = await apiClient.get(`/products/${productId}/variants`);
  return response.data;
};

/** POST /products/:id/variants { variants: [...] } */
export const createProductVariantsApi = async (productId, variants) => {
  const response = await apiClient.post(`/products/${productId}/variants`, { variants });
  return response.data;
};

/** GET /products/export (xlsx). Returns the full axios response so headers can be read. */
export const exportProductsApi = async (params) => {
  return apiClient.get('/products/export', { params, responseType: 'blob' });
};

/** GET /products/import/template (xlsx). Returns the full axios response. */
export const downloadProductImportTemplateApi = async () => {
  return apiClient.get('/products/import/template', { responseType: 'blob' });
};

/** POST /products/import?dryRun=&mode=&createMissing= (multipart field `file`) */
export const importProductsApi = async (file, { dryRun = true, mode = 'create', createMissing = true } = {}) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/products/import', formData, {
    params: { dryRun: String(dryRun), mode, createMissing: String(createMissing) },
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

/** GET /suppliers?search=&limit= — used by the preferred-supplier picker. */
export const searchSuppliersApi = async (search = '', limit = 20) => {
  const response = await apiClient.get('/suppliers', { params: { search, limit } });
  return response.data;
};

/** GET /lookups/products?q=&limit= — lightweight product search. */
export const lookupProductsApi = async (q = '', limit = 20) => {
  const response = await apiClient.get('/lookups/products', { params: { q, limit } });
  return response.data;
};

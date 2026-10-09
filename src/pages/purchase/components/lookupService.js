import apiClient from '@/utility/Http';

/** GET /lookups/products?q=&storeId=&limit= */
export const searchProductsApi = async (q, { storeId, limit = 20 } = {}) => {
  const params = { q: q || '', limit };
  if (storeId) params.storeId = storeId;
  const response = await apiClient.get('/lookups/products', { params });
  return response.data?.data || [];
};

export const getProductApi = async (id) => {
  const response = await apiClient.get(`/products/${id}`);
  return response.data?.data || null;
};

/** Active suppliers for pickers. */
export const searchSuppliersApi = async (q) => {
  const params = { page: 1, limit: 20, isActive: true, sort: 'name', order: 'asc' };
  if (q) params.search = q;
  const response = await apiClient.get('/suppliers', { params });
  return response.data?.data || [];
};

export const getSupplierApi = async (id) => {
  const response = await apiClient.get(`/suppliers/${id}`);
  return response.data?.data || null;
};

export const supplierOptionsLoader = async (q) => {
  const rows = await searchSuppliersApi(q);
  return rows.map((s) => ({
    value: s._id,
    label: s.companyName ? `${s.name} (${s.companyName})` : s.name,
    sub: [s.phone, s.gstin].filter(Boolean).join(' · '),
    data: s,
  }));
};

export const productOptionsLoader = (storeId) => async (q) => {
  const rows = await searchProductsApi(q, { storeId });
  return rows.map((p) => ({
    value: p._id,
    label: p.name,
    sub: [
      p.sku,
      p.unit,
      `Cost ₹${Number(p.lastPurchasePrice || p.costPrice || 0).toFixed(2)}`,
      p.storeStock !== undefined ? `Stock ${p.storeStock}` : `Stock ${p.currentStock ?? 0}`,
    ]
      .filter(Boolean)
      .join(' · '),
    data: p,
  }));
};

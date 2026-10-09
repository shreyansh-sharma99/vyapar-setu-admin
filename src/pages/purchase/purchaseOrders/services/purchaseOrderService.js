import apiClient from '@/utility/Http';

export const getPurchaseOrdersApi = async (params) => {
  const response = await apiClient.get('/purchase-orders', { params });
  return response.data;
};

export const getPurchaseOrderByIdApi = async (id) => {
  const response = await apiClient.get(`/purchase-orders/${id}`);
  return response.data;
};

export const createPurchaseOrderApi = async (payload) => {
  const response = await apiClient.post('/purchase-orders', payload);
  return response.data;
};

export const updatePurchaseOrderApi = async (id, payload) => {
  const response = await apiClient.put(`/purchase-orders/${id}`, payload);
  return response.data;
};

/** status: sent | closed | cancelled */
export const setPurchaseOrderStatusApi = async (id, status) => {
  const response = await apiClient.patch(`/purchase-orders/${id}/status`, { status });
  return response.data;
};

export const deletePurchaseOrderApi = async (id) => {
  const response = await apiClient.delete(`/purchase-orders/${id}`);
  return response.data;
};

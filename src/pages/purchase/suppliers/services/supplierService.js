import apiClient from '@/utility/Http';

export const getSuppliersApi = async (params) => {
  const response = await apiClient.get('/suppliers', { params });
  return response.data;
};

export const getSupplierByIdApi = async (id) => {
  const response = await apiClient.get(`/suppliers/${id}`);
  return response.data;
};

export const createSupplierApi = async (payload) => {
  const response = await apiClient.post('/suppliers', payload);
  return response.data;
};

export const updateSupplierApi = async (id, payload) => {
  const response = await apiClient.put(`/suppliers/${id}`, payload);
  return response.data;
};

export const setSupplierStatusApi = async (id, isActive) => {
  const response = await apiClient.patch(`/suppliers/${id}/status`, { isActive });
  return response.data;
};

export const deleteSupplierApi = async (id) => {
  const response = await apiClient.delete(`/suppliers/${id}`);
  return response.data;
};

export const getSupplierLedgerApi = async (id, params) => {
  const response = await apiClient.get(`/suppliers/${id}/ledger`, { params });
  return response.data;
};

export const getSupplierOpenBillsApi = async (id) => {
  const response = await apiClient.get(`/suppliers/${id}/open-bills`);
  return response.data;
};

export const getPayablesAgeingApi = async () => {
  const response = await apiClient.get('/suppliers/payables-ageing');
  return response.data;
};

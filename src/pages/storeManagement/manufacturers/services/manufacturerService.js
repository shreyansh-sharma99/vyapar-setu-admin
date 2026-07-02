import apiClient from '@/utility/Http';

export const getManufacturersApi = async () => {
  const response = await apiClient.get('/manufacturers');
  return response.data;
};

export const getManufacturerByIdApi = async (manufacturerId) => {
  const response = await apiClient.get(`/manufacturers/${manufacturerId}`);
  return response.data;
};

export const createManufacturerApi = async (payload) => {
  const response = await apiClient.post('/manufacturers', payload);
  return response.data;
};

export const updateManufacturerApi = async (manufacturerId, payload) => {
  const response = await apiClient.put(`/manufacturers/${manufacturerId}`, payload);
  return response.data;
};

export const changeManufacturerStatusApi = async (manufacturerId, status) => {
  const response = await apiClient.patch(`/manufacturers/${manufacturerId}/status`, { status });
  return response.data;
};

export const deleteManufacturerApi = async (manufacturerId) => {
  const response = await apiClient.delete(`/manufacturers/${manufacturerId}`);
  return response.data;
};

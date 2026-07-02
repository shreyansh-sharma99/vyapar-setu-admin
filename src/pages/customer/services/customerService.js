import apiClient from '@/utility/Http';

export const getCustomersApi = async (page = 1, limit = 10) => {
  const response = await apiClient.get(`/customers?page=${page}&limit=${limit}`);
  return response.data;
};

export const getCustomerByIdApi = async (customerId) => {
  const response = await apiClient.get(`/customers/${customerId}`);
  return response.data;
};

export const createCustomerApi = async (customerData) => {
  const response = await apiClient.post('/customers', customerData);
  return response.data;
};

export const updateCustomerApi = async (customerId, customerData) => {
  const response = await apiClient.put(`/customers/${customerId}`, customerData);
  return response.data;
};

export const deleteCustomerApi = async (customerId) => {
  const response = await apiClient.delete(`/customers/${customerId}`);
  return response.data;
};

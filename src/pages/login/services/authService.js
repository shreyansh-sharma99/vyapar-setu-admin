import apiClient from '@/utility/Http';

export const loginApi = async (credentials) => {
  const response = await apiClient.post('/auth/login', credentials);
  return response.data;
};

export const logoutApi = async () => {
  const response = await apiClient.post('/auth/logout');
  return response.data;
};

export const changePasswordApi = async (data) => {
  const response = await apiClient.post('/auth/change-password', data);
  return response.data;
};

export const forgotPasswordApi = async (emailData) => {
  const response = await apiClient.post('/auth/forgot-password', emailData);
  return response.data;
};

export const resetPasswordApi = async (resetToken, data) => {
  const response = await apiClient.post(`/auth/reset-password/${resetToken}`, data);
  return response.data;
};


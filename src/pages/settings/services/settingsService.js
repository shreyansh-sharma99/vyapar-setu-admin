import apiClient from '@/utility/Http';

export const getSettingsApi = async () => {
  const response = await apiClient.get('/settings');
  return response.data;
};

export const updateSettingsApi = async (data) => {
  const response = await apiClient.put('/settings', data);
  return response.data;
};

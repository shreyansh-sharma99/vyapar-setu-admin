import apiClient from '@/utility/Http';

export const getProfileApi = async () => {
  const response = await apiClient.get('/auth/me');
  return response.data;
};

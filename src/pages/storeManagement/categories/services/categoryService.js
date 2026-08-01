import apiClient from '@/utility/Http';

export const getCategoriesApi = async (params) => {
  const response = await apiClient.get('/categories', { params });
  return response.data;
};

export const getCategoryByIdApi = async (categoryId) => {
  const response = await apiClient.get(`/categories/${categoryId}`);
  return response.data;
};

export const createCategoryApi = async (formData) => {
  const response = await apiClient.post('/categories', formData, {

  });
  return response.data;
};

export const updateCategoryApi = async (categoryId, formData) => {
  const response = await apiClient.put(`/categories/${categoryId}`, formData, {

  });
  return response.data;
};

export const deleteCategoryApi = async (categoryId) => {
  const response = await apiClient.delete(`/categories/${categoryId}`);
  return response.data;
};

export const changeCategoryStatusApi = async (categoryId, status) => {
  const response = await apiClient.patch(`/categories/${categoryId}/status`, { status });
  return response.data;
};


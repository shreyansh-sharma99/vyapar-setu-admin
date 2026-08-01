import apiClient from '@/utility/Http';

export const getSubcategoriesApi = async (params) => {
  let queryParams = params;
  if (typeof params === 'string') {
    queryParams = { categoryId: params };
  }
  const response = await apiClient.get('/subcategories', { params: queryParams });
  return response.data;
};

export const getSubcategoryByIdApi = async (subCategoryId, categoryId) => {
  const url = categoryId
    ? `/subcategories/${subCategoryId}?categoryId=${categoryId}`
    : `/subcategories/${subCategoryId}`;
  const response = await apiClient.get(url);
  return response.data;
};

export const createSubcategoryApi = async (payload) => {
  const response = await apiClient.post('/subcategories', payload);
  return response.data;
};

export const updateSubcategoryApi = async (subCategoryId, payload) => {
  const response = await apiClient.put(`/subcategories/${subCategoryId}`, payload);
  return response.data;
};

export const changeSubcategoryStatusApi = async (subCategoryId, status) => {
  const response = await apiClient.patch(`/subcategories/${subCategoryId}/status`, { status });
  return response.data;
};

export const deleteSubcategoryApi = async (subCategoryId) => {
  const response = await apiClient.delete(`/subcategories/${subCategoryId}`);
  return response.data;
};

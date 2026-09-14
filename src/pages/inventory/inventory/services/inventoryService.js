import apiClient from '@/utility/Http';

/**
 * Fetch inventory summary with high/low stock breakdown
 * @param {Object} params - { page, limit, sort, order, search }
 */
export const getInventoryApi = async (params) => {
  const response = await apiClient.get('/inventory', { params });
  return response.data;
};

/**
 * Adjust product stock
 * @param {Object} payload - { productId, action: 'increase' | 'decrease' | 'set', amount, reason }
 */
export const adjustStockApi = async (payload) => {
  const response = await apiClient.post('/inventory/adjust', payload);
  return response.data;
};

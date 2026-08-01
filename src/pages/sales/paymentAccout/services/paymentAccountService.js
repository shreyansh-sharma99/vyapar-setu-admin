import apiClient from '@/utility/Http';

/**
 * Fetch the admin's payment account status
 * GET /payment-account
 */
export const getPaymentAccountApi = async () => {
  const response = await apiClient.get('/payment-account');
  return response.data;
};

/**
 * Save/update the admin's bank details
 * POST /payment-account/bank
 */
export const saveBankDetailsApi = async (bankDetails) => {
  const response = await apiClient.post('/payment-account/bank', bankDetails);
  return response.data;
};

/**
 * Verify bank details with Razorpay Route
 * POST /payment-account/verify
 */
export const verifyAccountApi = async () => {
  const response = await apiClient.post('/payment-account/verify', {});
  return response.data;
};

/**
 * Re-fetch the linked-account status from Razorpay
 * POST /payment-account/refresh
 */
export const refreshStatusApi = async () => {
  const response = await apiClient.post('/payment-account/refresh');
  return response.data;
};

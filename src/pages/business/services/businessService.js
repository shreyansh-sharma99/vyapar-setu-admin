import apiClient from '@/utility/Http';

/** Businesses of this login: GET /businesses → { current, businesses, archived, used, limit, canCreate } */
export const listBusinessesApi = async () => (await apiClient.get('/businesses')).data?.data || {};

/** New business = its first Invoice Settings profile (businessName, gstin, state, …). */
export const createBusinessApi = async (body) => (await apiClient.post('/businesses', body)).data;

/** Token pair + session for another business of this login (same shape as login). */
export const switchBusinessApi = async (id) => (await apiClient.post(`/businesses/${id}/switch`)).data;

export const archiveBusinessApi = async (id) => (await apiClient.patch(`/businesses/${id}/archive`)).data;

export const restoreBusinessApi = async (id) => (await apiClient.patch(`/businesses/${id}/restore`)).data;

/** Plans with prices and limits, the current plan and the recommended upgrade. */
export const getBillingPlansApi = async () => (await apiClient.get('/billing/plans')).data?.data || {};

export const getUpgradePreviewApi = async (params) => (await apiClient.get('/billing/upgrade-preview', { params })).data?.data || null;

/** Starts a Razorpay payment (or answers requiresPayment: false). Returns the token to complete with. */
export const startUpgradeApi = async (body) => (await apiClient.post('/billing/upgrade', body)).data?.data || {};

export const completeUpgradeApi = async (body) => (await apiClient.post('/billing/upgrade/complete', body)).data;

export const talkToSalesApi = async (body) => (await apiClient.post('/billing/talk-to-sales', body)).data;

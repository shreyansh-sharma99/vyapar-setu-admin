import apiClient from '@/utility/Http';

/** GET /follow-ups?range=today|week|overdue|done|all&search&page&limit → { items, total, page, limit } */
export const getFollowUpsApi = async (params) => {
  const response = await apiClient.get('/follow-ups', { params });
  return response.data?.data || { items: [], total: 0 };
};

/** GET /follow-ups/summary → { today, week, overdue } */
export const getFollowUpSummaryApi = async () => {
  const response = await apiClient.get('/follow-ups/summary');
  return response.data?.data || { today: 0, week: 0, overdue: 0 };
};

/** PATCH /follow-ups/:id { status?, dueAt? (YYYY-MM-DD), note? } */
export const updateFollowUpApi = async (id, body) => {
  const response = await apiClient.patch(`/follow-ups/${id}`, body);
  return response.data?.data;
};

/** GET /settings/follow-ups (owner) → { reminderDays, message, ownerSummary, defaultMessage } */
export const getFollowUpSettingsApi = async () => {
  const response = await apiClient.get('/settings/follow-ups');
  return response.data?.data;
};

/** PUT /settings/follow-ups (owner) */
export const saveFollowUpSettingsApi = async (body) => {
  const response = await apiClient.put('/settings/follow-ups', body);
  return response.data?.data;
};

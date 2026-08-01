import apiClient from '@/utility/Http';

export const getCreditNotesApi = async (params) => {
  const response = await apiClient.get('/credit-notes', { params });
  return response.data;
};

export const createCreditNoteApi = async (payload) => {
  const response = await apiClient.post('/credit-notes', payload);
  return response.data;
};

export const getCreditNoteByIdApi = async (id) => {
  const response = await apiClient.get(`/credit-notes/${id}`);
  return response.data;
};

export const updateCreditNoteApi = async (id, payload) => {
  const response = await apiClient.put(`/credit-notes/${id}`, payload);
  return response.data;
};

export const updateCreditNoteStatusApi = async (id, status) => {
  const response = await apiClient.patch(`/credit-notes/${id}/status`, { status });
  return response.data;
};

export const applyCreditNoteApi = async (id, payload) => {
  const response = await apiClient.post(`/credit-notes/${id}/apply`, payload);
  return response.data;
};

export const downloadCreditNotePdfApi = async (id) => {
  const response = await apiClient.get(`/credit-notes/${id}/pdf`, { responseType: 'blob' });
  return response.data;
};

export const deleteCreditNoteApi = async (id) => {
  const response = await apiClient.delete(`/credit-notes/${id}`);
  return response.data;
};

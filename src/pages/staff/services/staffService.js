import apiClient from '@/utility/Http';

/** GET /staff/permissions → { modules: [{ key, label, levels }], levels: ["view","create","update","delete"] } */
export const getStaffPermissionCatalogApi = async () => {
  const response = await apiClient.get('/staff/permissions');
  return response.data;
};

/** GET /staff?page=&limit=&search=&isActive=&roleId=&designationId= → { data: [...], meta: { total, page, limit, totalPages } } */
export const getStaffListApi = async (params) => {
  const response = await apiClient.get('/staff', { params });
  return response.data;
};

export const getStaffByIdApi = async (staffId) => {
  const response = await apiClient.get(`/staff/${staffId}`);
  return response.data;
};

export const createStaffApi = async (payload) => {
  const response = await apiClient.post('/staff', payload);
  return response.data;
};

export const updateStaffApi = async (staffId, payload) => {
  const response = await apiClient.put(`/staff/${staffId}`, payload);
  return response.data;
};

export const changeStaffStatusApi = async (staffId, isActive) => {
  const response = await apiClient.patch(`/staff/${staffId}/status`, { isActive });
  return response.data;
};

export const deleteStaffApi = async (staffId) => {
  const response = await apiClient.delete(`/staff/${staffId}`);
  return response.data;
};

/* ─── Roles (/staff/roles) ──────────────────────────────────────────────────── */

/** GET /staff/roles?page=&limit=&search=&isActive= → rows { _id, name, description, permissions[], isActive, staffCount }. No page/limit = all rows. */
export const getRolesApi = async (params) => {
  const response = await apiClient.get('/staff/roles', { params });
  return response.data;
};

export const getRoleByIdApi = async (roleId) => {
  const response = await apiClient.get(`/staff/roles/${roleId}`);
  return response.data;
};

export const createRoleApi = async (payload) => {
  const response = await apiClient.post('/staff/roles', payload);
  return response.data;
};

export const updateRoleApi = async (roleId, payload) => {
  const response = await apiClient.put(`/staff/roles/${roleId}`, payload);
  return response.data;
};

export const deleteRoleApi = async (roleId) => {
  const response = await apiClient.delete(`/staff/roles/${roleId}`);
  return response.data;
};

/* ─── Designations (/staff/designations) ───────────────────────────────────── */

/** GET /staff/designations?page=&limit=&search=&isActive= → rows { _id, name, description, isActive, staffCount }. */
export const getDesignationsApi = async (params) => {
  const response = await apiClient.get('/staff/designations', { params });
  return response.data;
};

export const createDesignationApi = async (payload) => {
  const response = await apiClient.post('/staff/designations', payload);
  return response.data;
};

export const updateDesignationApi = async (designationId, payload) => {
  const response = await apiClient.put(`/staff/designations/${designationId}`, payload);
  return response.data;
};

export const deleteDesignationApi = async (designationId) => {
  const response = await apiClient.delete(`/staff/designations/${designationId}`);
  return response.data;
};

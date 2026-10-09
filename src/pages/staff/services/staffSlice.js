import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getStaffPermissionCatalogApi,
  getStaffListApi,
  getStaffByIdApi,
  createStaffApi,
  updateStaffApi,
  changeStaffStatusApi,
  deleteStaffApi,
  getRolesApi,
  getRoleByIdApi,
  createRoleApi,
  updateRoleApi,
  deleteRoleApi,
  getDesignationsApi,
  createDesignationApi,
  updateDesignationApi,
  deleteDesignationApi,
} from './staffService';

const errorMessage = (error, fallback) => error.response?.data?.message || fallback;

const listMeta = (payload, rows) => payload?.meta || payload?.pagination || {
  total: rows.length, page: 1, limit: rows.length || 10, totalPages: 1,
};

/* ─── Permission catalog ───────────────────────────────────────────────────── */

export const getStaffPermissionCatalog = createAsyncThunk(
  'staff/getPermissionCatalog',
  async (_, { rejectWithValue }) => {
    try {
      return await getStaffPermissionCatalogApi();
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Failed to load permissions'));
    }
  }
);

/* ─── Staff ────────────────────────────────────────────────────────────────── */

export const getStaffList = createAsyncThunk(
  'staff/getStaffList',
  async (params = {}, { rejectWithValue }) => {
    try {
      return await getStaffListApi(params);
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Failed to load staff'));
    }
  }
);

export const getStaffById = createAsyncThunk(
  'staff/getStaffById',
  async (staffId, { rejectWithValue }) => {
    try {
      return await getStaffByIdApi(staffId);
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Failed to load staff member'));
    }
  }
);

export const createStaff = createAsyncThunk(
  'staff/createStaff',
  async (payload, { rejectWithValue }) => {
    try {
      return await createStaffApi(payload);
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Failed to create staff member'));
    }
  }
);

export const updateStaff = createAsyncThunk(
  'staff/updateStaff',
  async ({ staffId, payload }, { rejectWithValue }) => {
    try {
      return await updateStaffApi(staffId, payload);
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Failed to update staff member'));
    }
  }
);

export const changeStaffStatus = createAsyncThunk(
  'staff/changeStaffStatus',
  async ({ staffId, isActive }, { rejectWithValue }) => {
    try {
      const data = await changeStaffStatusApi(staffId, isActive);
      return { staffId, isActive, data };
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Failed to change status'));
    }
  }
);

export const deleteStaff = createAsyncThunk(
  'staff/deleteStaff',
  async (staffId, { rejectWithValue }) => {
    try {
      const data = await deleteStaffApi(staffId);
      return { staffId, data };
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Failed to remove staff member'));
    }
  }
);

/* ─── Roles ────────────────────────────────────────────────────────────────── */

export const getRoles = createAsyncThunk(
  'staff/getRoles',
  async (params = {}, { rejectWithValue }) => {
    try {
      return await getRolesApi(params);
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Failed to load roles'));
    }
  }
);

/** Every role (no paging) for dropdowns. */
export const getRoleOptions = createAsyncThunk(
  'staff/getRoleOptions',
  async (_, { rejectWithValue }) => {
    try {
      return await getRolesApi({});
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Failed to load roles'));
    }
  }
);

export const getRoleById = createAsyncThunk(
  'staff/getRoleById',
  async (roleId, { rejectWithValue }) => {
    try {
      return await getRoleByIdApi(roleId);
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Failed to load role'));
    }
  }
);

export const createRole = createAsyncThunk(
  'staff/createRole',
  async (payload, { rejectWithValue }) => {
    try {
      return await createRoleApi(payload);
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Failed to create role'));
    }
  }
);

export const updateRole = createAsyncThunk(
  'staff/updateRole',
  async ({ roleId, payload }, { rejectWithValue }) => {
    try {
      return await updateRoleApi(roleId, payload);
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Failed to update role'));
    }
  }
);

export const changeRoleStatus = createAsyncThunk(
  'staff/changeRoleStatus',
  async ({ roleId, isActive }, { rejectWithValue }) => {
    try {
      const data = await updateRoleApi(roleId, { isActive });
      return { roleId, isActive, data };
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Failed to change status'));
    }
  }
);

export const deleteRole = createAsyncThunk(
  'staff/deleteRole',
  async (roleId, { rejectWithValue }) => {
    try {
      const data = await deleteRoleApi(roleId);
      return { roleId, data };
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Failed to delete role'));
    }
  }
);

/* ─── Designations ─────────────────────────────────────────────────────────── */

export const getDesignations = createAsyncThunk(
  'staff/getDesignations',
  async (params = {}, { rejectWithValue }) => {
    try {
      return await getDesignationsApi(params);
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Failed to load designations'));
    }
  }
);

/** Every designation (no paging) for dropdowns. */
export const getDesignationOptions = createAsyncThunk(
  'staff/getDesignationOptions',
  async (_, { rejectWithValue }) => {
    try {
      return await getDesignationsApi({});
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Failed to load designations'));
    }
  }
);

export const createDesignation = createAsyncThunk(
  'staff/createDesignation',
  async (payload, { rejectWithValue }) => {
    try {
      return await createDesignationApi(payload);
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Failed to create designation'));
    }
  }
);

export const updateDesignation = createAsyncThunk(
  'staff/updateDesignation',
  async ({ designationId, payload }, { rejectWithValue }) => {
    try {
      return await updateDesignationApi(designationId, payload);
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Failed to update designation'));
    }
  }
);

export const changeDesignationStatus = createAsyncThunk(
  'staff/changeDesignationStatus',
  async ({ designationId, isActive }, { rejectWithValue }) => {
    try {
      const data = await updateDesignationApi(designationId, { isActive });
      return { designationId, isActive, data };
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Failed to change status'));
    }
  }
);

export const deleteDesignation = createAsyncThunk(
  'staff/deleteDesignation',
  async (designationId, { rejectWithValue }) => {
    try {
      const data = await deleteDesignationApi(designationId);
      return { designationId, data };
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Failed to delete designation'));
    }
  }
);

/* ─── Slice ────────────────────────────────────────────────────────────────── */

const emptyMeta = { total: 0, page: 1, limit: 10, totalPages: 1 };

const initialState = {
  staffList: [],
  meta: { ...emptyMeta },
  currentStaff: null,
  catalog: { modules: [], levels: ['view', 'create', 'update', 'delete'] },
  catalogLoading: false,
  catalogError: null,
  loading: false,
  saving: false,
  error: null,
  success: false,
  toast: null,

  // Roles
  roles: [],
  rolesMeta: { ...emptyMeta },
  rolesLoading: false,
  roleOptions: [],
  roleOptionsLoading: false,
  currentRole: null,
  roleLoading: false,
  roleError: null,

  // Designations
  designations: [],
  designationsMeta: { ...emptyMeta },
  designationsLoading: false,
  designationOptions: [],
  designationOptionsLoading: false,
  designationError: null,
};

const savingCases = (builder, thunk) => {
  builder
    .addCase(thunk.pending, (state) => { state.saving = true; })
    .addCase(thunk.fulfilled, (state) => { state.saving = false; })
    .addCase(thunk.rejected, (state) => { state.saving = false; });
};

const staffSlice = createSlice({
  name: 'staff',
  initialState,
  reducers: {
    resetStaffStatus: (state) => {
      state.success = false;
      state.error = null;
    },
    clearStaffToast: (state) => {
      state.toast = null;
    },
    clearCurrentStaff: (state) => {
      state.currentStaff = null;
    },
    clearCurrentRole: (state) => {
      state.currentRole = null;
      state.roleError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getStaffPermissionCatalog.pending, (state) => {
        state.catalogLoading = true;
        state.catalogError = null;
      })
      .addCase(getStaffPermissionCatalog.fulfilled, (state, action) => {
        state.catalogLoading = false;
        const data = action.payload?.data || {};
        state.catalog = {
          modules: Array.isArray(data.modules) ? data.modules : [],
          levels: Array.isArray(data.levels) && data.levels.length ? data.levels : ['view', 'create', 'update', 'delete'],
        };
      })
      .addCase(getStaffPermissionCatalog.rejected, (state, action) => {
        state.catalogLoading = false;
        state.catalogError = action.payload || 'Failed to load permissions';
      })

      .addCase(getStaffList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getStaffList.fulfilled, (state, action) => {
        state.loading = false;
        state.staffList = Array.isArray(action.payload?.data) ? action.payload.data : [];
        state.meta = listMeta(action.payload, state.staffList);
      })
      .addCase(getStaffList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to load staff', color: 'danger' };
      })

      .addCase(getStaffById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.currentStaff = null;
      })
      .addCase(getStaffById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentStaff = action.payload?.data || null;
      })
      .addCase(getStaffById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(createStaff.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createStaff.fulfilled, (state) => {
        state.saving = false;
        state.success = true;
      })
      .addCase(createStaff.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      .addCase(updateStaff.pending, (state) => {
        state.saving = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateStaff.fulfilled, (state) => {
        state.saving = false;
        state.success = true;
      })
      .addCase(updateStaff.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      .addCase(changeStaffStatus.fulfilled, (state, action) => {
        const { staffId, isActive } = action.payload;
        const row = state.staffList.find((s) => s._id === staffId);
        if (row) row.isActive = isActive;
        state.toast = {
          message: isActive ? 'Staff member activated.' : 'Staff member deactivated. They have been signed out.',
          color: 'success',
        };
      })
      .addCase(changeStaffStatus.rejected, (state, action) => {
        state.toast = { message: action.payload || 'Failed to change status', color: 'danger' };
      })

      .addCase(deleteStaff.pending, (state) => {
        state.saving = true;
      })
      .addCase(deleteStaff.fulfilled, (state, action) => {
        state.saving = false;
        state.staffList = state.staffList.filter((s) => s._id !== action.payload.staffId);
        state.meta = { ...state.meta, total: Math.max(0, (state.meta?.total || 1) - 1) };
        state.toast = { message: 'Staff member removed.', color: 'success' };
      })
      .addCase(deleteStaff.rejected, (state, action) => {
        state.saving = false;
        state.toast = { message: action.payload || 'Failed to remove staff member', color: 'danger' };
      })

      /* Roles */
      .addCase(getRoles.pending, (state) => {
        state.rolesLoading = true;
        state.roleError = null;
      })
      .addCase(getRoles.fulfilled, (state, action) => {
        state.rolesLoading = false;
        state.roles = Array.isArray(action.payload?.data) ? action.payload.data : [];
        state.rolesMeta = listMeta(action.payload, state.roles);
      })
      .addCase(getRoles.rejected, (state, action) => {
        state.rolesLoading = false;
        state.roleError = action.payload;
      })

      .addCase(getRoleOptions.pending, (state) => {
        state.roleOptionsLoading = true;
      })
      .addCase(getRoleOptions.fulfilled, (state, action) => {
        state.roleOptionsLoading = false;
        state.roleOptions = Array.isArray(action.payload?.data) ? action.payload.data : [];
      })
      .addCase(getRoleOptions.rejected, (state) => {
        state.roleOptionsLoading = false;
      })

      .addCase(getRoleById.pending, (state) => {
        state.roleLoading = true;
        state.roleError = null;
        state.currentRole = null;
      })
      .addCase(getRoleById.fulfilled, (state, action) => {
        state.roleLoading = false;
        state.currentRole = action.payload?.data || null;
      })
      .addCase(getRoleById.rejected, (state, action) => {
        state.roleLoading = false;
        state.roleError = action.payload;
      })

      .addCase(changeRoleStatus.fulfilled, (state, action) => {
        const { roleId, isActive } = action.payload;
        const row = state.roles.find((r) => r._id === roleId);
        if (row) row.isActive = isActive;
      })
      .addCase(deleteRole.pending, (state) => { state.saving = true; })
      .addCase(deleteRole.rejected, (state) => { state.saving = false; })
      .addCase(deleteRole.fulfilled, (state, action) => {
        state.saving = false;
        state.roles = state.roles.filter((r) => r._id !== action.payload.roleId);
        state.rolesMeta = { ...state.rolesMeta, total: Math.max(0, (state.rolesMeta?.total || 1) - 1) };
      })

      /* Designations */
      .addCase(getDesignations.pending, (state) => {
        state.designationsLoading = true;
        state.designationError = null;
      })
      .addCase(getDesignations.fulfilled, (state, action) => {
        state.designationsLoading = false;
        state.designations = Array.isArray(action.payload?.data) ? action.payload.data : [];
        state.designationsMeta = listMeta(action.payload, state.designations);
      })
      .addCase(getDesignations.rejected, (state, action) => {
        state.designationsLoading = false;
        state.designationError = action.payload;
      })

      .addCase(getDesignationOptions.pending, (state) => {
        state.designationOptionsLoading = true;
      })
      .addCase(getDesignationOptions.fulfilled, (state, action) => {
        state.designationOptionsLoading = false;
        state.designationOptions = Array.isArray(action.payload?.data) ? action.payload.data : [];
      })
      .addCase(getDesignationOptions.rejected, (state) => {
        state.designationOptionsLoading = false;
      })

      .addCase(changeDesignationStatus.fulfilled, (state, action) => {
        const { designationId, isActive } = action.payload;
        const row = state.designations.find((d) => d._id === designationId);
        if (row) row.isActive = isActive;
      })
      .addCase(deleteDesignation.pending, (state) => { state.saving = true; })
      .addCase(deleteDesignation.rejected, (state) => { state.saving = false; })
      .addCase(deleteDesignation.fulfilled, (state, action) => {
        state.saving = false;
        state.designations = state.designations.filter((d) => d._id !== action.payload.designationId);
        state.designationsMeta = {
          ...state.designationsMeta,
          total: Math.max(0, (state.designationsMeta?.total || 1) - 1),
        };
      });

    [createRole, updateRole, createDesignation, updateDesignation]
      .forEach((thunk) => savingCases(builder, thunk));
  },
});

export const { resetStaffStatus, clearStaffToast, clearCurrentStaff, clearCurrentRole } = staffSlice.actions;
export default staffSlice.reducer;

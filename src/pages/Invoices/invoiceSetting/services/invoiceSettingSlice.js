import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getInvoiceSettingsApi,
  createInvoiceSettingApi,
  getInvoiceSettingByIdApi,
  updateInvoiceSettingApi,
  setDefaultInvoiceSettingApi,
  deleteInvoiceSettingApi,
} from './invoiceSettingService';

// ─── Async Thunks ───────────────────────────────────────────────────────────

export const fetchInvoiceSettings = createAsyncThunk(
  'invoiceSetting/fetchInvoiceSettings',
  async (_, { rejectWithValue }) => {
    try {
      const data = await getInvoiceSettingsApi();
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch invoice settings'
      );
    }
  }
);

export const createInvoiceSetting = createAsyncThunk(
  'invoiceSetting/createInvoiceSetting',
  async (payload, { rejectWithValue }) => {
    try {
      const data = await createInvoiceSettingApi(payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create invoice setting profile'
      );
    }
  }
);

export const fetchInvoiceSettingById = createAsyncThunk(
  'invoiceSetting/fetchInvoiceSettingById',
  async (id, { rejectWithValue }) => {
    try {
      const data = await getInvoiceSettingByIdApi(id);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch profile details'
      );
    }
  }
);

export const updateInvoiceSetting = createAsyncThunk(
  'invoiceSetting/updateInvoiceSetting',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const data = await updateInvoiceSettingApi(id, payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update invoice setting profile'
      );
    }
  }
);

export const setDefaultInvoiceSetting = createAsyncThunk(
  'invoiceSetting/setDefaultInvoiceSetting',
  async (id, { rejectWithValue }) => {
    try {
      const data = await setDefaultInvoiceSettingApi(id);
      return { id, data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to set profile as default'
      );
    }
  }
);

export const deleteInvoiceSetting = createAsyncThunk(
  'invoiceSetting/deleteInvoiceSetting',
  async (id, { rejectWithValue }) => {
    try {
      const data = await deleteInvoiceSettingApi(id);
      return { id, data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete profile'
      );
    }
  }
);

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState = {
  profiles: [],
  selectedProfile: null,
  loading: false,
  saving: false,
  deleting: false,
  settingDefault: false,
  error: null,
  saveError: null,
  deleteError: null,
  success: false,
  successMessage: null,
};

// ─── Slice ───────────────────────────────────────────────────────────────────

const invoiceSettingSlice = createSlice({
  name: 'invoiceSetting',
  initialState,
  reducers: {
    clearSelectedProfile: (state) => {
      state.selectedProfile = null;
    },
    clearErrors: (state) => {
      state.error = null;
      state.saveError = null;
      state.deleteError = null;
      state.success = false;
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchInvoiceSettings
      .addCase(fetchInvoiceSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInvoiceSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.profiles = action.payload.data || action.payload || [];
      })
      .addCase(fetchInvoiceSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // createInvoiceSetting
      .addCase(createInvoiceSetting.pending, (state) => {
        state.saving = true;
        state.saveError = null;
        state.success = false;
      })
      .addCase(createInvoiceSetting.fulfilled, (state, action) => {
        state.saving = false;
        state.success = true;
        state.successMessage = 'Invoice setting profile created successfully';
        const newProfile = action.payload.data || action.payload;
        if (newProfile) {
          if (newProfile.isDefault) {
            state.profiles = state.profiles.map((p) => ({ ...p, isDefault: false }));
          }
          state.profiles.unshift(newProfile);
        }
      })
      .addCase(createInvoiceSetting.rejected, (state, action) => {
        state.saving = false;
        state.saveError = action.payload;
      })

      // fetchInvoiceSettingById
      .addCase(fetchInvoiceSettingById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInvoiceSettingById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedProfile = action.payload.data || action.payload;
      })
      .addCase(fetchInvoiceSettingById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // updateInvoiceSetting
      .addCase(updateInvoiceSetting.pending, (state) => {
        state.saving = true;
        state.saveError = null;
        state.success = false;
      })
      .addCase(updateInvoiceSetting.fulfilled, (state, action) => {
        state.saving = false;
        state.success = true;
        state.successMessage = 'Invoice setting profile updated successfully';
        const updated = action.payload.data || action.payload;
        if (updated && updated._id) {
          state.profiles = state.profiles.map((p) => {
            if (updated.isDefault) {
              p.isDefault = false;
            }
            return p._id === updated._id ? updated : p;
          });
        }
      })
      .addCase(updateInvoiceSetting.rejected, (state, action) => {
        state.saving = false;
        state.saveError = action.payload;
      })

      // setDefaultInvoiceSetting
      .addCase(setDefaultInvoiceSetting.pending, (state) => {
        state.settingDefault = true;
        state.error = null;
      })
      .addCase(setDefaultInvoiceSetting.fulfilled, (state, action) => {
        state.settingDefault = false;
        const targetId = action.meta.arg;
        state.profiles = state.profiles.map((p) => ({
          ...p,
          isDefault: p._id === targetId,
        }));
        state.success = true;
        state.successMessage = 'Default profile updated';
      })
      .addCase(setDefaultInvoiceSetting.rejected, (state, action) => {
        state.settingDefault = false;
        state.error = action.payload;
      })

      // deleteInvoiceSetting
      .addCase(deleteInvoiceSetting.pending, (state) => {
        state.deleting = true;
        state.deleteError = null;
      })
      .addCase(deleteInvoiceSetting.fulfilled, (state, action) => {
        state.deleting = false;
        const deletedId = action.meta.arg;
        state.profiles = state.profiles.filter((p) => p._id !== deletedId);
        state.success = true;
        state.successMessage = 'Profile deleted successfully';
      })
      .addCase(deleteInvoiceSetting.rejected, (state, action) => {
        state.deleting = false;
        state.deleteError = action.payload;
      });
  },
});

export const { clearSelectedProfile, clearErrors } = invoiceSettingSlice.actions;
export default invoiceSettingSlice.reducer;

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getGeneralInvoiceSettingsApi,
  updateGeneralInvoiceSettingsApi,
} from './generalInvoiceSettingService';

// ─── Async Thunks ───────────────────────────────────────────────────────────

export const fetchGeneralInvoiceSettings = createAsyncThunk(
  'generalInvoiceSetting/fetchGeneralInvoiceSettings',
  async (_, { rejectWithValue }) => {
    try {
      const data = await getGeneralInvoiceSettingsApi();
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch general invoice settings'
      );
    }
  }
);

export const updateGeneralInvoiceSettings = createAsyncThunk(
  'generalInvoiceSetting/updateGeneralInvoiceSettings',
  async (payload, { rejectWithValue }) => {
    try {
      const data = await updateGeneralInvoiceSettingsApi(payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update general invoice settings'
      );
    }
  }
);

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState = {
  settings: null,
  loading: false,
  saving: false,
  error: null,
  saveError: null,
  success: false,
  successMessage: null,
};

// ─── Slice ───────────────────────────────────────────────────────────────────

const generalInvoiceSettingSlice = createSlice({
  name: 'generalInvoiceSetting',
  initialState,
  reducers: {
    clearErrors: (state) => {
      state.error = null;
      state.saveError = null;
      state.success = false;
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchGeneralInvoiceSettings
      .addCase(fetchGeneralInvoiceSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGeneralInvoiceSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload.data || action.payload;
      })
      .addCase(fetchGeneralInvoiceSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // updateGeneralInvoiceSettings
      .addCase(updateGeneralInvoiceSettings.pending, (state) => {
        state.saving = true;
        state.saveError = null;
        state.success = false;
      })
      .addCase(updateGeneralInvoiceSettings.fulfilled, (state, action) => {
        state.saving = false;
        state.success = true;
        state.successMessage = 'General invoice settings updated successfully';
        if (action.payload.data || action.payload) {
          state.settings = action.payload.data || action.payload;
        }
      })
      .addCase(updateGeneralInvoiceSettings.rejected, (state, action) => {
        state.saving = false;
        state.saveError = action.payload;
      });
  },
});

export const { clearErrors } = generalInvoiceSettingSlice.actions;
export default generalInvoiceSettingSlice.reducer;

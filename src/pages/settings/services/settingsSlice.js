import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getSettingsApi, updateSettingsApi } from './settingsService';

const initialState = {
  settings: null,
  loading: false,
  updateLoading: false,
  error: null,
  toast: null,
};

export const fetchSettings = createAsyncThunk(
  'settings/fetchSettings',
  async (_, { rejectWithValue }) => {
    try {
      const data = await getSettingsApi();
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch settings'
      );
    }
  }
);

export const updateSettings = createAsyncThunk(
  'settings/updateSettings',
  async (settingsData, { rejectWithValue }) => {
    try {
      const data = await updateSettingsApi(settingsData);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update settings'
      );
    }
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    clearSettingsToast: (state) => {
      state.toast = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload?.data;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateSettings.pending, (state) => {
        state.updateLoading = true;
        state.error = null;
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.updateLoading = false;
        state.settings = { ...state.settings, ...action.payload?.data };
        state.toast = { message: 'Settings updated successfully', color: 'success' };
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.updateLoading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to update settings', color: 'danger' };
      });
  },
});

export const { clearSettingsToast } = settingsSlice.actions;
export default settingsSlice.reducer;

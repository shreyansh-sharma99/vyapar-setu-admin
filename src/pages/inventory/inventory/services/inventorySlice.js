import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getInventoryApi, adjustStockApi } from './inventoryService';

export const getInventory = createAsyncThunk(
  'inventory/getInventory',
  async (params, { rejectWithValue }) => {
    try {
      const data = await getInventoryApi(params);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch inventory data'
      );
    }
  }
);

export const adjustStock = createAsyncThunk(
  'inventory/adjustStock',
  async (payload, { rejectWithValue }) => {
    try {
      const data = await adjustStockApi(payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to adjust stock'
      );
    }
  }
);

const initialState = {
  inventoryData: {
    threshold: 5,
    highStock: [],
    lowStock: [],
    all: [],
  },
  loading: false,
  adjustLoading: false,
  error: null,
  adjustError: null,
  success: false,
  adjustSuccess: false,
  toast: null,
};

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    resetInventoryStatus: (state) => {
      state.success = false;
      state.adjustSuccess = false;
      state.error = null;
      state.adjustError = null;
    },
    clearInventoryToast: (state) => {
      state.toast = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // getInventory
      .addCase(getInventory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getInventory.fulfilled, (state, action) => {
        state.loading = false;
        state.inventoryData = action.payload?.data || {
          threshold: 5,
          highStock: [],
          lowStock: [],
          all: [],
        };
      })
      .addCase(getInventory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = {
          message: action.payload || 'Failed to fetch inventory data',
          color: 'danger',
        };
      })

      // adjustStock
      .addCase(adjustStock.pending, (state) => {
        state.adjustLoading = true;
        state.adjustError = null;
        state.adjustSuccess = false;
      })
      .addCase(adjustStock.fulfilled, (state, action) => {
        state.adjustLoading = false;
        state.adjustSuccess = true;
        state.toast = {
          message: action.payload?.message || 'Stock adjusted successfully.',
          color: 'success',
        };
      })
      .addCase(adjustStock.rejected, (state, action) => {
        state.adjustLoading = false;
        state.adjustError = action.payload;
        state.toast = {
          message: action.payload || 'Failed to adjust stock.',
          color: 'danger',
        };
      });
  },
});

export const { resetInventoryStatus, clearInventoryToast } = inventorySlice.actions;
export default inventorySlice.reducer;

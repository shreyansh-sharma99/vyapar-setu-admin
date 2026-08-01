import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getSalesReturnsApi,
  createSalesReturnApi,
  getSalesReturnByIdApi,
  updateSalesReturnApi,
  updateSalesReturnStatusApi,
  deleteSalesReturnApi,
} from './salesReturnService';

// ─── Async Thunks ───────────────────────────────────────────────────────────

export const getSalesReturns = createAsyncThunk(
  'salesReturn/getSalesReturns',
  async (params, { rejectWithValue }) => {
    try {
      return await getSalesReturnsApi(params);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch sales returns');
    }
  }
);

export const createSalesReturn = createAsyncThunk(
  'salesReturn/createSalesReturn',
  async (payload, { rejectWithValue }) => {
    try {
      return await createSalesReturnApi(payload);
    } catch (error) {
      return rejectWithValue(error.response?.data || error.response?.data?.message || 'Failed to create sales return');
    }
  }
);

export const getSalesReturnById = createAsyncThunk(
  'salesReturn/getSalesReturnById',
  async (id, { rejectWithValue }) => {
    try {
      return await getSalesReturnByIdApi(id);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch sales return details');
    }
  }
);

export const updateSalesReturn = createAsyncThunk(
  'salesReturn/updateSalesReturn',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await updateSalesReturnApi(id, payload);
    } catch (error) {
      return rejectWithValue(error.response?.data || error.response?.data?.message || 'Failed to update sales return');
    }
  }
);

export const updateSalesReturnStatus = createAsyncThunk(
  'salesReturn/updateSalesReturnStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const data = await updateSalesReturnStatusApi(id, status);
      return { id, status, data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update status');
    }
  }
);

export const deleteSalesReturn = createAsyncThunk(
  'salesReturn/deleteSalesReturn',
  async (id, { rejectWithValue }) => {
    try {
      const data = await deleteSalesReturnApi(id);
      return { id, data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete sales return');
    }
  }
);

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState = {
  salesReturns: [],
  meta: { total: 0, page: 1, limit: 10, totalPages: 1 },
  currentReturn: null,
  loading: false,
  error: null,
  success: false,
  toast: null,
};

// ─── Slice ───────────────────────────────────────────────────────────────────

const salesReturnSlice = createSlice({
  name: 'salesReturn',
  initialState,
  reducers: {
    resetReturnStatus: (state) => {
      state.success = false;
      state.error = null;
    },
    clearReturnToast: (state) => {
      state.toast = null;
    },
    clearCurrentReturn: (state) => {
      state.currentReturn = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // getSalesReturns
      .addCase(getSalesReturns.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getSalesReturns.fulfilled, (state, action) => {
        state.loading = false;
        state.salesReturns = action.payload.data || [];
        state.meta = action.payload.meta || initialState.meta;
      })
      .addCase(getSalesReturns.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to fetch sales returns', color: 'danger' };
      })

      // createSalesReturn
      .addCase(createSalesReturn.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createSalesReturn.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        if (action.payload.data) state.salesReturns.unshift(action.payload.data);
        state.toast = { message: 'Sales Return created successfully.', color: 'success' };
      })
      .addCase(createSalesReturn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload?.message || 'Failed to create sales return.', color: 'danger' };
      })

      // getSalesReturnById
      .addCase(getSalesReturnById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.currentReturn = null;
      })
      .addCase(getSalesReturnById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentReturn = Array.isArray(action.payload.data) ? action.payload.data[0] : action.payload.data;
      })
      .addCase(getSalesReturnById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // updateSalesReturn
      .addCase(updateSalesReturn.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateSalesReturn.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const updated = action.payload.data;
        const index = state.salesReturns.findIndex((r) => r._id === updated?._id);
        if (index !== -1 && updated) state.salesReturns[index] = updated;
        state.toast = { message: 'Sales Return updated successfully.', color: 'success' };
      })
      .addCase(updateSalesReturn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload?.message || 'Failed to update sales return.', color: 'danger' };
      })

      // updateSalesReturnStatus
      .addCase(updateSalesReturnStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateSalesReturnStatus.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload.data?.data || action.payload.data;
        const index = state.salesReturns.findIndex((r) => r._id === action.payload.id);
        if (index !== -1 && updated) state.salesReturns[index] = updated;
        state.toast = { message: `Status updated to ${action.payload.status}.`, color: 'success' };
      })
      .addCase(updateSalesReturnStatus.rejected, (state, action) => {
        state.loading = false;
        state.toast = { message: action.payload || 'Failed to update status.', color: 'danger' };
      })

      // deleteSalesReturn
      .addCase(deleteSalesReturn.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteSalesReturn.fulfilled, (state, action) => {
        state.loading = false;
        state.salesReturns = state.salesReturns.filter((r) => r._id !== action.payload.id);
        state.toast = { message: 'Sales Return deleted successfully.', color: 'success' };
      })
      .addCase(deleteSalesReturn.rejected, (state, action) => {
        state.loading = false;
        state.toast = { message: action.payload || 'Failed to delete sales return.', color: 'danger' };
      });
  },
});

export const { resetReturnStatus, clearReturnToast, clearCurrentReturn } = salesReturnSlice.actions;
export default salesReturnSlice.reducer;

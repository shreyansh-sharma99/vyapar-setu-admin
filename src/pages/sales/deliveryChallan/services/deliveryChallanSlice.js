import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getDeliveryChallansApi,
  createDeliveryChallanApi,
  getDeliveryChallanByIdApi,
  updateDeliveryChallanApi,
  updateDeliveryChallanStatusApi,
  convertToInvoiceApi,
  deleteDeliveryChallanApi,
} from './deliveryChallanService';

// ─── Async Thunks ───────────────────────────────────────────────────────────

export const getDeliveryChallans = createAsyncThunk(
  'deliveryChallan/getDeliveryChallans',
  async (params, { rejectWithValue }) => {
    try {
      return await getDeliveryChallansApi(params);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch delivery challans');
    }
  }
);

export const createDeliveryChallan = createAsyncThunk(
  'deliveryChallan/createDeliveryChallan',
  async (payload, { rejectWithValue }) => {
    try {
      return await createDeliveryChallanApi(payload);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create delivery challan');
    }
  }
);

export const getDeliveryChallanById = createAsyncThunk(
  'deliveryChallan/getDeliveryChallanById',
  async (id, { rejectWithValue }) => {
    try {
      return await getDeliveryChallanByIdApi(id);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch delivery challan details');
    }
  }
);

export const updateDeliveryChallan = createAsyncThunk(
  'deliveryChallan/updateDeliveryChallan',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await updateDeliveryChallanApi(id, payload);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update delivery challan');
    }
  }
);

export const updateDeliveryChallanStatus = createAsyncThunk(
  'deliveryChallan/updateDeliveryChallanStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const data = await updateDeliveryChallanStatusApi(id, status);
      return { id, status, data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update status');
    }
  }
);

export const convertToInvoice = createAsyncThunk(
  'deliveryChallan/convertToInvoice',
  async (id, { rejectWithValue }) => {
    try {
      const data = await convertToInvoiceApi(id);
      return { id, data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to convert to invoice');
    }
  }
);

export const deleteDeliveryChallan = createAsyncThunk(
  'deliveryChallan/deleteDeliveryChallan',
  async (id, { rejectWithValue }) => {
    try {
      const data = await deleteDeliveryChallanApi(id);
      return { id, data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete delivery challan');
    }
  }
);

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState = {
  deliveryChallans: [],
  meta: { total: 0, page: 1, limit: 10, totalPages: 1 },
  currentChallan: null,
  loading: false,
  error: null,
  success: false,
  toast: null,
};

// ─── Slice ───────────────────────────────────────────────────────────────────

const deliveryChallanSlice = createSlice({
  name: 'deliveryChallan',
  initialState,
  reducers: {
    resetChallanStatus: (state) => {
      state.success = false;
      state.error = null;
    },
    clearChallanToast: (state) => {
      state.toast = null;
    },
    clearCurrentChallan: (state) => {
      state.currentChallan = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // getDeliveryChallans
      .addCase(getDeliveryChallans.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(getDeliveryChallans.fulfilled, (state, action) => {
        state.loading = false;
        state.deliveryChallans = action.payload.data || [];
        state.meta = action.payload.meta || initialState.meta;
      })
      .addCase(getDeliveryChallans.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to fetch delivery challans', color: 'danger' };
      })

      // createDeliveryChallan
      .addCase(createDeliveryChallan.pending, (state) => { state.loading = true; state.error = null; state.success = false; })
      .addCase(createDeliveryChallan.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        if (action.payload.data) state.deliveryChallans.unshift(action.payload.data);
        state.toast = { message: 'Delivery Challan created successfully.', color: 'success' };
      })
      .addCase(createDeliveryChallan.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to create delivery challan.', color: 'danger' };
      })

      // getDeliveryChallanById
      .addCase(getDeliveryChallanById.pending, (state) => { state.loading = true; state.error = null; state.currentChallan = null; })
      .addCase(getDeliveryChallanById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentChallan = Array.isArray(action.payload.data) ? action.payload.data[0] : action.payload.data;
      })
      .addCase(getDeliveryChallanById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // updateDeliveryChallan
      .addCase(updateDeliveryChallan.pending, (state) => { state.loading = true; state.error = null; state.success = false; })
      .addCase(updateDeliveryChallan.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const updated = action.payload.data;
        const index = state.deliveryChallans.findIndex((c) => c._id === updated?._id);
        if (index !== -1 && updated) state.deliveryChallans[index] = updated;
        state.toast = { message: 'Delivery Challan updated successfully.', color: 'success' };
      })
      .addCase(updateDeliveryChallan.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to update delivery challan.', color: 'danger' };
      })

      // updateDeliveryChallanStatus
      .addCase(updateDeliveryChallanStatus.pending, (state) => { state.loading = true; })
      .addCase(updateDeliveryChallanStatus.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload.data?.data || action.payload.data;
        const index = state.deliveryChallans.findIndex((c) => c._id === action.payload.id);
        if (index !== -1 && updated) state.deliveryChallans[index] = updated;
        state.toast = { message: `Status updated to ${action.payload.status}.`, color: 'success' };
      })
      .addCase(updateDeliveryChallanStatus.rejected, (state, action) => {
        state.loading = false;
        state.toast = { message: action.payload || 'Failed to update status.', color: 'danger' };
      })

      // convertToInvoice
      .addCase(convertToInvoice.pending, (state) => { state.loading = true; })
      .addCase(convertToInvoice.fulfilled, (state) => {
        state.loading = false;
        state.toast = { message: 'Converted to Invoice successfully.', color: 'success' };
      })
      .addCase(convertToInvoice.rejected, (state, action) => {
        state.loading = false;
        state.toast = { message: action.payload || 'Failed to convert to invoice.', color: 'danger' };
      })

      // deleteDeliveryChallan
      .addCase(deleteDeliveryChallan.pending, (state) => { state.loading = true; })
      .addCase(deleteDeliveryChallan.fulfilled, (state, action) => {
        state.loading = false;
        state.deliveryChallans = state.deliveryChallans.filter((c) => c._id !== action.payload.id);
        state.toast = { message: 'Delivery Challan deleted successfully.', color: 'success' };
      })
      .addCase(deleteDeliveryChallan.rejected, (state, action) => {
        state.loading = false;
        state.toast = { message: action.payload || 'Failed to delete delivery challan.', color: 'danger' };
      });
  },
});

export const { resetChallanStatus, clearChallanToast, clearCurrentChallan } = deliveryChallanSlice.actions;
export default deliveryChallanSlice.reducer;

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getPaymentsInApi,
  recordPaymentInApi,
  getPaymentInByIdApi,
  allocateAdvanceApi,
  deletePaymentInApi,
} from './paymentInService';

// ─── Async Thunks ───────────────────────────────────────────────────────────

export const getPaymentsIn = createAsyncThunk(
  'paymentIn/getPaymentsIn',
  async (params, { rejectWithValue }) => {
    try {
      return await getPaymentsInApi(params);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch payments in');
    }
  }
);

export const recordPaymentIn = createAsyncThunk(
  'paymentIn/recordPaymentIn',
  async (payload, { rejectWithValue }) => {
    try {
      return await recordPaymentInApi(payload);
    } catch (error) {
      return rejectWithValue(error.response?.data || error.response?.data?.message || 'Failed to record payment');
    }
  }
);

export const getPaymentInById = createAsyncThunk(
  'paymentIn/getPaymentInById',
  async (id, { rejectWithValue }) => {
    try {
      return await getPaymentInByIdApi(id);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch payment details');
    }
  }
);

export const allocateAdvance = createAsyncThunk(
  'paymentIn/allocateAdvance',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const data = await allocateAdvanceApi(id, payload);
      return { id, data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to allocate advance balance');
    }
  }
);

export const deletePaymentIn = createAsyncThunk(
  'paymentIn/deletePaymentIn',
  async (id, { rejectWithValue }) => {
    try {
      const data = await deletePaymentInApi(id);
      return { id, data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete payment record');
    }
  }
);

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState = {
  paymentsIn: [],
  meta: { total: 0, page: 1, limit: 10, totalPages: 1 },
  currentPayment: null,
  loading: false,
  error: null,
  success: false,
  toast: null,
};

// ─── Slice ───────────────────────────────────────────────────────────────────

const paymentInSlice = createSlice({
  name: 'paymentIn',
  initialState,
  reducers: {
    resetPaymentInStatus: (state) => {
      state.success = false;
      state.error = null;
    },
    clearPaymentInToast: (state) => {
      state.toast = null;
    },
    clearCurrentPayment: (state) => {
      state.currentPayment = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // getPaymentsIn
      .addCase(getPaymentsIn.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getPaymentsIn.fulfilled, (state, action) => {
        state.loading = false;
        state.paymentsIn = action.payload.data || [];
        state.meta = action.payload.meta || initialState.meta;
      })
      .addCase(getPaymentsIn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to fetch payments', color: 'danger' };
      })

      // recordPaymentIn
      .addCase(recordPaymentIn.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(recordPaymentIn.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        if (action.payload.data) state.paymentsIn.unshift(action.payload.data);
        state.toast = { message: 'Payment recorded successfully.', color: 'success' };
      })
      .addCase(recordPaymentIn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload?.message || action.payload || 'Failed to record payment.', color: 'danger' };
      })

      // getPaymentInById
      .addCase(getPaymentInById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.currentPayment = null;
      })
      .addCase(getPaymentInById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPayment = Array.isArray(action.payload.data) ? action.payload.data[0] : action.payload.data;
      })
      .addCase(getPaymentInById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // allocateAdvance
      .addCase(allocateAdvance.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(allocateAdvance.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const updated = action.payload.data?.data || action.payload.data;
        const index = state.paymentsIn.findIndex((p) => p._id === action.payload.id);
        if (index !== -1 && updated) state.paymentsIn[index] = updated;
        if (state.currentPayment && state.currentPayment._id === action.payload.id) {
          state.currentPayment = updated;
        }
        state.toast = { message: 'Advance balance allocated successfully.', color: 'success' };
      })
      .addCase(allocateAdvance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to allocate advance balance.', color: 'danger' };
      })

      // deletePaymentIn
      .addCase(deletePaymentIn.pending, (state) => {
        state.loading = true;
      })
      .addCase(deletePaymentIn.fulfilled, (state, action) => {
        state.loading = false;
        state.paymentsIn = state.paymentsIn.filter((p) => p._id !== action.payload.id);
        state.toast = { message: 'Payment record deleted successfully.', color: 'success' };
      })
      .addCase(deletePaymentIn.rejected, (state, action) => {
        state.loading = false;
        state.toast = { message: action.payload || 'Failed to delete payment record.', color: 'danger' };
      });
  },
});

export const { resetPaymentInStatus, clearPaymentInToast, clearCurrentPayment } = paymentInSlice.actions;
export default paymentInSlice.reducer;

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getPaymentAccountApi,
  saveBankDetailsApi,
  verifyAccountApi,
  refreshStatusApi,
} from './paymentAccountService';

// ─── Async Thunks ───────────────────────────────────────────────────────────

export const fetchPaymentAccount = createAsyncThunk(
  'paymentAccount/fetchPaymentAccount',
  async (_, { rejectWithValue }) => {
    try {
      const data = await getPaymentAccountApi();
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch payment account details'
      );
    }
  }
);

export const saveBankDetails = createAsyncThunk(
  'paymentAccount/saveBankDetails',
  async (bankDetails, { rejectWithValue }) => {
    try {
      const data = await saveBankDetailsApi(bankDetails);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to save bank details'
      );
    }
  }
);

export const verifyAccount = createAsyncThunk(
  'paymentAccount/verifyAccount',
  async (_, { rejectWithValue }) => {
    try {
      const data = await verifyAccountApi();
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to verify payment account'
      );
    }
  }
);

export const refreshStatus = createAsyncThunk(
  'paymentAccount/refreshStatus',
  async (_, { rejectWithValue }) => {
    try {
      const data = await refreshStatusApi();
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to refresh verification status'
      );
    }
  }
);

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState = {
  accountData: null,
  loading: false,
  saving: false,
  verifying: false,
  refreshing: false,
  error: null,
  saveError: null,
  verifyError: null,
  refreshError: null,
  success: false,
};

// ─── Slice ───────────────────────────────────────────────────────────────────

const paymentAccountSlice = createSlice({
  name: 'paymentAccount',
  initialState,
  reducers: {
    clearPaymentAccountData: (state) => {
      state.accountData = null;
      state.loading = false;
      state.saving = false;
      state.verifying = false;
      state.refreshing = false;
      state.error = null;
      state.saveError = null;
      state.verifyError = null;
      state.refreshError = null;
      state.success = false;
    },
    clearErrors: (state) => {
      state.error = null;
      state.saveError = null;
      state.verifyError = null;
      state.refreshError = null;
      state.success = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchPaymentAccount
      .addCase(fetchPaymentAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaymentAccount.fulfilled, (state, action) => {
        state.loading = false;
        state.accountData = action.payload.data || null;
      })
      .addCase(fetchPaymentAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // saveBankDetails
      .addCase(saveBankDetails.pending, (state) => {
        state.saving = true;
        state.saveError = null;
        state.success = false;
      })
      .addCase(saveBankDetails.fulfilled, (state, action) => {
        state.saving = false;
        state.success = true;
        state.accountData = action.payload.data || null;
      })
      .addCase(saveBankDetails.rejected, (state, action) => {
        state.saving = false;
        state.saveError = action.payload;
      })

      // verifyAccount
      .addCase(verifyAccount.pending, (state) => {
        state.verifying = true;
        state.verifyError = null;
      })
      .addCase(verifyAccount.fulfilled, (state, action) => {
        state.verifying = false;
        state.accountData = action.payload.data || null;
      })
      .addCase(verifyAccount.rejected, (state, action) => {
        state.verifying = false;
        state.verifyError = action.payload;
      })

      // refreshStatus
      .addCase(refreshStatus.pending, (state) => {
        state.refreshing = true;
        state.refreshError = null;
      })
      .addCase(refreshStatus.fulfilled, (state, action) => {
        state.refreshing = false;
        state.accountData = action.payload.data || null;
      })
      .addCase(refreshStatus.rejected, (state, action) => {
        state.refreshing = false;
        state.refreshError = action.payload;
      });
  },
});

export const { clearPaymentAccountData, clearErrors } = paymentAccountSlice.actions;
export default paymentAccountSlice.reducer;

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getCustomerLedgerApi, getCustomerLedgerStatsApi } from './customerLedgerService';

// ─── Async Thunks ───────────────────────────────────────────────────────────

export const getCustomerLedger = createAsyncThunk(
  'customerLedger/getCustomerLedger',
  async ({ customerId, params }, { rejectWithValue }) => {
    try {
      const data = await getCustomerLedgerApi(customerId, params);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch customer ledger entries'
      );
    }
  }
);

export const getCustomerLedgerStats = createAsyncThunk(
  'customerLedger/getCustomerLedgerStats',
  async (customerId, { rejectWithValue }) => {
    try {
      const data = await getCustomerLedgerStatsApi(customerId);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch customer ledger statistics'
      );
    }
  }
);

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState = {
  ledgerEntries: [],
  stats: null,
  meta: { total: 0, page: 1, limit: 20, totalPages: 1 },
  loading: false,
  statsLoading: false,
  error: null,
  statsError: null,
  success: false,
};

// ─── Slice ───────────────────────────────────────────────────────────────────

const customerLedgerSlice = createSlice({
  name: 'customerLedger',
  initialState,
  reducers: {
    clearLedgerData: (state) => {
      state.ledgerEntries = [];
      state.stats = null;
      state.meta = initialState.meta;
      state.error = null;
      state.statsError = null;
      state.success = false;
      state.loading = false;
      state.statsLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // getCustomerLedger
      .addCase(getCustomerLedger.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCustomerLedger.fulfilled, (state, action) => {
        state.loading = false;
        state.ledgerEntries = action.payload.data || [];
        state.meta = action.payload.meta || {
          total: action.payload.total || 0,
          page: action.payload.page || 1,
          limit: action.payload.limit || 20,
          totalPages: action.payload.totalPages || 1,
        };
      })
      .addCase(getCustomerLedger.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // getCustomerLedgerStats
      .addCase(getCustomerLedgerStats.pending, (state) => {
        state.statsLoading = true;
        state.statsError = null;
      })
      .addCase(getCustomerLedgerStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.stats = action.payload.data || null;
      })
      .addCase(getCustomerLedgerStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.statsError = action.payload;
      });
  },
});

export const { clearLedgerData } = customerLedgerSlice.actions;
export default customerLedgerSlice.reducer;

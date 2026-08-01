import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getSalesRegisterApi,
  getGstr1Api,
  getHsnSummaryApi,
  getAgeingApi,
} from './reportService';

// ─── Async Thunks ───────────────────────────────────────────────────────────

export const getSalesRegister = createAsyncThunk(
  'reports/getSalesRegister',
  async (params, { rejectWithValue }) => {
    try {
      const data = await getSalesRegisterApi(params);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch Sales Register report'
      );
    }
  }
);

export const getGstr1 = createAsyncThunk(
  'reports/getGstr1',
  async (params, { rejectWithValue }) => {
    try {
      const data = await getGstr1Api(params);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch GSTR-1 report'
      );
    }
  }
);

export const getHsnSummary = createAsyncThunk(
  'reports/getHsnSummary',
  async (params, { rejectWithValue }) => {
    try {
      const data = await getHsnSummaryApi(params);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch HSN Summary report'
      );
    }
  }
);

export const getAgeing = createAsyncThunk(
  'reports/getAgeing',
  async (params, { rejectWithValue }) => {
    try {
      const data = await getAgeingApi(params);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch Ageing report'
      );
    }
  }
);

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState = {
  salesRegister: {
    rows: [],
    totals: null,
  },
  gstr1: {
    byType: [],
    byRate: [],
  },
  hsnSummary: [],
  ageing: {
    rows: [],
    grandTotal: 0,
    asOf: null,
  },
  loading: {
    salesRegister: false,
    gstr1: false,
    hsnSummary: false,
    ageing: false,
  },
  error: {
    salesRegister: null,
    gstr1: null,
    hsnSummary: null,
    ageing: null,
  },
};

// ─── Slice ───────────────────────────────────────────────────────────────────

const reportSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    clearReportState: (state) => {
      state.salesRegister = initialState.salesRegister;
      state.gstr1 = initialState.gstr1;
      state.hsnSummary = initialState.hsnSummary;
      state.ageing = initialState.ageing;
      state.loading = initialState.loading;
      state.error = initialState.error;
    },
  },
  extraReducers: (builder) => {
    builder
      // Sales Register
      .addCase(getSalesRegister.pending, (state) => {
        state.loading.salesRegister = true;
        state.error.salesRegister = null;
      })
      .addCase(getSalesRegister.fulfilled, (state, action) => {
        state.loading.salesRegister = false;
        state.salesRegister = action.payload.data || initialState.salesRegister;
      })
      .addCase(getSalesRegister.rejected, (state, action) => {
        state.loading.salesRegister = false;
        state.error.salesRegister = action.payload;
      })

      // GSTR-1
      .addCase(getGstr1.pending, (state) => {
        state.loading.gstr1 = true;
        state.error.gstr1 = null;
      })
      .addCase(getGstr1.fulfilled, (state, action) => {
        state.loading.gstr1 = false;
        state.gstr1 = action.payload.data || initialState.gstr1;
      })
      .addCase(getGstr1.rejected, (state, action) => {
        state.loading.gstr1 = false;
        state.error.gstr1 = action.payload;
      })

      // HSN Summary
      .addCase(getHsnSummary.pending, (state) => {
        state.loading.hsnSummary = true;
        state.error.hsnSummary = null;
      })
      .addCase(getHsnSummary.fulfilled, (state, action) => {
        state.loading.hsnSummary = false;
        state.hsnSummary = action.payload.data || [];
      })
      .addCase(getHsnSummary.rejected, (state, action) => {
        state.loading.hsnSummary = false;
        state.error.hsnSummary = action.payload;
      })

      // Ageing Report
      .addCase(getAgeing.pending, (state) => {
        state.loading.ageing = true;
        state.error.ageing = null;
      })
      .addCase(getAgeing.fulfilled, (state, action) => {
        state.loading.ageing = false;
        state.ageing = action.payload.data || initialState.ageing;
      })
      .addCase(getAgeing.rejected, (state, action) => {
        state.loading.ageing = false;
        state.error.ageing = action.payload;
      });
  },
});

export const { clearReportState } = reportSlice.actions;
export default reportSlice.reducer;

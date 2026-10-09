import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getInventoryApi,
  adjustStockApi,
  getAuditReportApi,
  getStoreWiseStockApi,
  getDamagedStockApi,
  damageStockApi,
  getReorderReportApi,
  getStockValuationApi,
} from './inventoryService';

/** Builds a thunk that calls `api(params)` and rejects with the server message. */
const makeThunk = (type, api, fallbackMessage) =>
  createAsyncThunk(type, async (params, { rejectWithValue }) => {
    try {
      return await api(params);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || fallbackMessage);
    }
  });

export const getInventory = makeThunk('inventory/getInventory', getInventoryApi, 'Failed to fetch inventory data');
export const adjustStock = makeThunk('inventory/adjustStock', adjustStockApi, 'Failed to adjust stock');
export const getAuditReport = makeThunk('inventory/getAuditReport', getAuditReportApi, 'Failed to fetch audit report');

export const getStoreWiseStock = makeThunk('inventory/getStoreWiseStock', getStoreWiseStockApi, 'Failed to load store-wise stock');
export const getDamagedStock = makeThunk('inventory/getDamagedStock', getDamagedStockApi, 'Failed to load damaged stock');
export const damageStock = makeThunk('inventory/damageStock', damageStockApi, 'Failed to update damaged stock');
export const getReorderReport = makeThunk('inventory/getReorderReport', getReorderReportApi, 'Failed to load reorder report');
export const getStockValuation = makeThunk('inventory/getStockValuation', getStockValuationApi, 'Failed to load stock valuation');

const emptyPagination = { total: 0, page: 1, limit: 20, totalPages: 1 };

/** Shape kept for every server-paginated report screen. */
const emptyReport = () => ({
  data: null, // raw `data` from the API (array, or object for store-wise)
  stats: null,
  totals: null,
  meta: null,
  pagination: emptyPagination,
  loading: false,
  error: null,
  requestId: null, // only the latest request may write its result
});

const initialState = {
  // Inventory list (GET /inventory)
  inventoryList: [],
  inventoryStats: {
    totalProducts: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
    withDamaged: 0,
    totalUnits: 0,
    totalDamaged: 0,
    stockValue: 0,
  },
  inventoryPagination: emptyPagination,
  inventoryRequestId: null,

  // Report screens
  reports: {
    storeWise: emptyReport(),
    damaged: emptyReport(),
    reorder: emptyReport(),
    valuation: emptyReport(),
  },

  auditLogs: [],
  auditPagination: { total: 0, page: 1, limit: 20, totalPages: 1 },
  auditStats: { totalMovements: 0, stockIn: 0, stockOut: 0, productsAffected: 0, valueIn: 0, valueOut: 0 },
  auditLoading: false,
  loading: false,
  adjustLoading: false,
  damageLoading: false,
  error: null,
  adjustError: null,
  success: false,
  adjustSuccess: false,
  toast: null,
};

/** Wires pending / fulfilled / rejected for one report key, ignoring stale responses. */
const addReportCases = (builder, thunk, key) => {
  builder
    .addCase(thunk.pending, (state, action) => {
      const report = state.reports[key];
      report.loading = true;
      report.error = null;
      report.requestId = action.meta.requestId;
    })
    .addCase(thunk.fulfilled, (state, action) => {
      const report = state.reports[key];
      if (report.requestId !== action.meta.requestId) return;
      const payload = action.payload || {};
      report.loading = false;
      report.data = payload.data ?? null;
      report.stats = payload.stats ?? null;
      report.totals = payload.totals ?? null;
      report.meta = payload.meta ?? null;
      report.pagination = payload.pagination || emptyPagination;
    })
    .addCase(thunk.rejected, (state, action) => {
      const report = state.reports[key];
      if (report.requestId !== action.meta.requestId) return;
      report.loading = false;
      report.error = action.payload || action.error?.message || null;
    });
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
      .addCase(getInventory.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.inventoryRequestId = action.meta.requestId;
      })
      .addCase(getInventory.fulfilled, (state, action) => {
        if (state.inventoryRequestId !== action.meta.requestId) return;
        state.loading = false;
        state.inventoryList = Array.isArray(action.payload?.data) ? action.payload.data : [];
        if (action.payload?.stats) state.inventoryStats = action.payload.stats;
        state.inventoryPagination = action.payload?.pagination || emptyPagination;
      })
      .addCase(getInventory.rejected, (state, action) => {
        if (state.inventoryRequestId !== action.meta.requestId) return;
        state.loading = false;
        state.error = action.payload;
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
      })

      // damageStock (mark / restore / write off)
      .addCase(damageStock.pending, (state) => {
        state.damageLoading = true;
      })
      .addCase(damageStock.fulfilled, (state) => {
        state.damageLoading = false;
      })
      .addCase(damageStock.rejected, (state) => {
        state.damageLoading = false;
      })

      // getAuditReport
      .addCase(getAuditReport.pending, (state) => {
        state.auditLoading = true;
      })
      .addCase(getAuditReport.fulfilled, (state, action) => {
        state.auditLoading = false;
        state.auditLogs = action.payload?.data || [];
        state.auditPagination = action.payload?.pagination || {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 1,
        };
        if (action.payload?.stats) state.auditStats = action.payload.stats;
      })
      .addCase(getAuditReport.rejected, (state, action) => {
        state.auditLoading = false;
        state.error = action.payload;
      });

    addReportCases(builder, getStoreWiseStock, 'storeWise');
    addReportCases(builder, getDamagedStock, 'damaged');
    addReportCases(builder, getReorderReport, 'reorder');
    addReportCases(builder, getStockValuation, 'valuation');
  },
});

export const { resetInventoryStatus, clearInventoryToast } = inventorySlice.actions;
export default inventorySlice.reducer;

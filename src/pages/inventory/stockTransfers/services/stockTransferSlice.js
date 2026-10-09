import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getStockTransfersApi, deleteStockTransferApi } from './stockTransferService';

export const getStockTransfers = createAsyncThunk(
  'stockTransfer/getStockTransfers',
  async (params, { rejectWithValue }) => {
    try {
      return await getStockTransfersApi(params);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch stock transfers');
    }
  }
);

export const deleteStockTransfer = createAsyncThunk(
  'stockTransfer/deleteStockTransfer',
  async (id, { rejectWithValue }) => {
    try {
      const data = await deleteStockTransferApi(id);
      return { id, data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete transfer');
    }
  }
);

const initialState = {
  list: [],
  meta: { total: 0, page: 1, limit: 10, totalPages: 1 },
  stats: {},
  listLoading: false,
  error: null,
  successMessage: null,
};

const stockTransferSlice = createSlice({
  name: 'stockTransfer',
  initialState,
  reducers: {
    clearStockTransferStatus: (state) => {
      state.error = null;
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getStockTransfers.pending, (state) => {
        state.listLoading = true;
        state.error = null;
      })
      .addCase(getStockTransfers.fulfilled, (state, action) => {
        state.listLoading = false;
        state.list = action.payload.data || [];
        if (action.payload.meta) state.meta = action.payload.meta;
        state.stats = action.payload.stats || {};
      })
      .addCase(getStockTransfers.rejected, (state, action) => {
        state.listLoading = false;
        state.error = action.payload;
      })
      .addCase(deleteStockTransfer.fulfilled, (state, action) => {
        state.list = state.list.filter((t) => t._id !== action.payload.id);
        state.successMessage = action.payload.data?.message || 'Transfer deleted';
      })
      .addCase(deleteStockTransfer.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearStockTransferStatus } = stockTransferSlice.actions;
export default stockTransferSlice.reducer;

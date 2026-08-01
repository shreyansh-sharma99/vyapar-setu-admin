import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getProformaInvoicesApi,
  createProformaInvoiceApi,
  getProformaInvoiceByIdApi,
  updateProformaInvoiceApi,
  sendProformaInvoiceApi,
  convertToInvoiceApi,
  duplicateProformaInvoiceApi,
  deleteProformaInvoiceApi,
} from './proformaInvoiceService';

// ─── Async Thunks ───────────────────────────────────────────────────────────

export const getProformaInvoices = createAsyncThunk(
  'proformaInvoice/getProformaInvoices',
  async (params, { rejectWithValue }) => {
    try {
      return await getProformaInvoicesApi(params);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch proforma invoices');
    }
  }
);

export const createProformaInvoice = createAsyncThunk(
  'proformaInvoice/createProformaInvoice',
  async (payload, { rejectWithValue }) => {
    try {
      return await createProformaInvoiceApi(payload);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create proforma invoice');
    }
  }
);

export const getProformaInvoiceById = createAsyncThunk(
  'proformaInvoice/getProformaInvoiceById',
  async (id, { rejectWithValue }) => {
    try {
      return await getProformaInvoiceByIdApi(id);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch proforma invoice details');
    }
  }
);

export const updateProformaInvoice = createAsyncThunk(
  'proformaInvoice/updateProformaInvoice',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await updateProformaInvoiceApi(id, payload);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update proforma invoice');
    }
  }
);

export const sendProformaInvoice = createAsyncThunk(
  'proformaInvoice/sendProformaInvoice',
  async (id, { rejectWithValue }) => {
    try {
      const data = await sendProformaInvoiceApi(id);
      return { id, data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send proforma invoice');
    }
  }
);

export const convertToInvoice = createAsyncThunk(
  'proformaInvoice/convertToInvoice',
  async (id, { rejectWithValue }) => {
    try {
      const data = await convertToInvoiceApi(id);
      return { id, data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to convert to invoice');
    }
  }
);

export const duplicateProformaInvoice = createAsyncThunk(
  'proformaInvoice/duplicateProformaInvoice',
  async (id, { rejectWithValue }) => {
    try {
      return await duplicateProformaInvoiceApi(id);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to duplicate proforma invoice');
    }
  }
);

export const deleteProformaInvoice = createAsyncThunk(
  'proformaInvoice/deleteProformaInvoice',
  async (id, { rejectWithValue }) => {
    try {
      const data = await deleteProformaInvoiceApi(id);
      return { id, data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete proforma invoice');
    }
  }
);

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState = {
  proformaInvoices: [],
  meta: { total: 0, page: 1, limit: 10, totalPages: 1 },
  currentProformaInvoice: null,
  loading: false,
  error: null,
  success: false,
  toast: null,
};

// ─── Slice ───────────────────────────────────────────────────────────────────

const proformaInvoiceSlice = createSlice({
  name: 'proformaInvoice',
  initialState,
  reducers: {
    resetProformaInvoiceStatus: (state) => {
      state.success = false;
      state.error = null;
    },
    clearProformaInvoiceToast: (state) => {
      state.toast = null;
    },
    clearCurrentProformaInvoice: (state) => {
      state.currentProformaInvoice = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // getProformaInvoices
      .addCase(getProformaInvoices.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(getProformaInvoices.fulfilled, (state, action) => {
        state.loading = false;
        state.proformaInvoices = action.payload.data || [];
        state.meta = action.payload.meta || initialState.meta;
      })
      .addCase(getProformaInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to fetch proforma invoices', color: 'danger' };
      })

      // createProformaInvoice
      .addCase(createProformaInvoice.pending, (state) => { state.loading = true; state.error = null; state.success = false; })
      .addCase(createProformaInvoice.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        if (action.payload.data) state.proformaInvoices.unshift(action.payload.data);
        state.toast = { message: 'Proforma invoice created successfully.', color: 'success' };
      })
      .addCase(createProformaInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to create proforma invoice.', color: 'danger' };
      })

      // getProformaInvoiceById
      .addCase(getProformaInvoiceById.pending, (state) => { state.loading = true; state.error = null; state.currentProformaInvoice = null; })
      .addCase(getProformaInvoiceById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProformaInvoice = Array.isArray(action.payload.data) ? action.payload.data[0] : action.payload.data;
      })
      .addCase(getProformaInvoiceById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // updateProformaInvoice
      .addCase(updateProformaInvoice.pending, (state) => { state.loading = true; state.error = null; state.success = false; })
      .addCase(updateProformaInvoice.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const updated = action.payload.data;
        const index = state.proformaInvoices.findIndex((p) => p._id === updated?._id);
        if (index !== -1 && updated) state.proformaInvoices[index] = updated;
        state.toast = { message: 'Proforma invoice updated successfully.', color: 'success' };
      })
      .addCase(updateProformaInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to update proforma invoice.', color: 'danger' };
      })

      // sendProformaInvoice
      .addCase(sendProformaInvoice.pending, (state) => { state.loading = true; })
      .addCase(sendProformaInvoice.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload.data?.data || action.payload.data;
        const index = state.proformaInvoices.findIndex((p) => p._id === action.payload.id);
        if (index !== -1 && updated) state.proformaInvoices[index] = updated;
        state.toast = { message: 'Proforma invoice sent successfully.', color: 'success' };
      })
      .addCase(sendProformaInvoice.rejected, (state, action) => {
        state.loading = false;
        state.toast = { message: action.payload || 'Failed to send proforma invoice.', color: 'danger' };
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

      // duplicateProformaInvoice
      .addCase(duplicateProformaInvoice.pending, (state) => { state.loading = true; })
      .addCase(duplicateProformaInvoice.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.data) state.proformaInvoices.unshift(action.payload.data);
        state.toast = { message: 'Proforma invoice duplicated successfully.', color: 'success' };
      })
      .addCase(duplicateProformaInvoice.rejected, (state, action) => {
        state.loading = false;
        state.toast = { message: action.payload || 'Failed to duplicate proforma invoice.', color: 'danger' };
      })

      // deleteProformaInvoice
      .addCase(deleteProformaInvoice.pending, (state) => { state.loading = true; })
      .addCase(deleteProformaInvoice.fulfilled, (state, action) => {
        state.loading = false;
        state.proformaInvoices = state.proformaInvoices.filter((p) => p._id !== action.payload.id);
        state.toast = { message: 'Proforma invoice deleted successfully.', color: 'success' };
      })
      .addCase(deleteProformaInvoice.rejected, (state, action) => {
        state.loading = false;
        state.toast = { message: action.payload || 'Failed to delete proforma invoice.', color: 'danger' };
      });
  },
});

export const { resetProformaInvoiceStatus, clearProformaInvoiceToast, clearCurrentProformaInvoice } = proformaInvoiceSlice.actions;
export default proformaInvoiceSlice.reducer;

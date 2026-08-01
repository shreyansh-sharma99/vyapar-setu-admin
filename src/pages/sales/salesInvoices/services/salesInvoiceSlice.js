import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getSalesInvoicesApi,
  getSalesInvoiceSummaryApi,
  createSalesInvoiceApi,
  getSalesInvoiceByIdApi,
  updateSalesInvoiceApi,
  confirmSalesInvoiceApi,
  markSalesInvoicePaidApi,
  voidSalesInvoiceApi,
  sendPaymentReminderApi,
  generatePaymentLinkApi,
  duplicateSalesInvoiceApi,
  deleteSalesInvoiceApi,
} from './salesInvoiceService';

export const getSalesInvoices = createAsyncThunk(
  'salesInvoice/getSalesInvoices',
  async (params, { rejectWithValue }) => {
    try {
      const data = await getSalesInvoicesApi(params);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch sales invoices'
      );
    }
  }
);

export const getSalesInvoiceSummary = createAsyncThunk(
  'salesInvoice/getSalesInvoiceSummary',
  async (_, { rejectWithValue }) => {
    try {
      const data = await getSalesInvoiceSummaryApi();
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch sales summary'
      );
    }
  }
);

export const createSalesInvoice = createAsyncThunk(
  'salesInvoice/createSalesInvoice',
  async (payload, { rejectWithValue }) => {
    try {
      const data = await createSalesInvoiceApi(payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create sales invoice'
      );
    }
  }
);

export const getSalesInvoiceById = createAsyncThunk(
  'salesInvoice/getSalesInvoiceById',
  async (id, { rejectWithValue }) => {
    try {
      const data = await getSalesInvoiceByIdApi(id);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch sales invoice details'
      );
    }
  }
);

export const updateSalesInvoice = createAsyncThunk(
  'salesInvoice/updateSalesInvoice',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const data = await updateSalesInvoiceApi(id, payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update sales invoice'
      );
    }
  }
);

export const confirmSalesInvoice = createAsyncThunk(
  'salesInvoice/confirmSalesInvoice',
  async (id, { rejectWithValue }) => {
    try {
      const data = await confirmSalesInvoiceApi(id);
      return { id, data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to confirm sales invoice'
      );
    }
  }
);

export const markSalesInvoicePaid = createAsyncThunk(
  'salesInvoice/markSalesInvoicePaid',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const data = await markSalesInvoicePaidApi(id, payload);
      return { id, data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to record payment'
      );
    }
  }
);

export const voidSalesInvoice = createAsyncThunk(
  'salesInvoice/voidSalesInvoice',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const data = await voidSalesInvoiceApi(id, payload);
      return { id, data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to void invoice'
      );
    }
  }
);

export const sendPaymentReminder = createAsyncThunk(
  'salesInvoice/sendPaymentReminder',
  async (id, { rejectWithValue }) => {
    try {
      const data = await sendPaymentReminderApi(id);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to send payment reminder'
      );
    }
  }
);

export const generatePaymentLink = createAsyncThunk(
  'salesInvoice/generatePaymentLink',
  async (id, { rejectWithValue }) => {
    try {
      const data = await generatePaymentLinkApi(id);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to generate payment link'
      );
    }
  }
);

export const duplicateSalesInvoice = createAsyncThunk(
  'salesInvoice/duplicateSalesInvoice',
  async (id, { rejectWithValue }) => {
    try {
      const data = await duplicateSalesInvoiceApi(id);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to duplicate invoice'
      );
    }
  }
);

export const deleteSalesInvoice = createAsyncThunk(
  'salesInvoice/deleteSalesInvoice',
  async (id, { rejectWithValue }) => {
    try {
      const data = await deleteSalesInvoiceApi(id);
      return { id, data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete sales invoice'
      );
    }
  }
);

const initialState = {
  invoices: [],
  meta: {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  },
  summary: [],
  currentInvoice: null,
  loading: false,
  error: null,
  success: false,
  toast: null,
};

const salesInvoiceSlice = createSlice({
  name: 'salesInvoice',
  initialState,
  reducers: {
    resetSalesInvoiceStatus: (state) => {
      state.success = false;
      state.error = null;
    },
    clearSalesInvoiceToast: (state) => {
      state.toast = null;
    },
    clearCurrentSalesInvoice: (state) => {
      state.currentInvoice = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // getSalesInvoices
      .addCase(getSalesInvoices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getSalesInvoices.fulfilled, (state, action) => {
        state.loading = false;
        state.invoices = action.payload.data || [];
        state.meta = action.payload.meta || initialState.meta;
      })
      .addCase(getSalesInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to fetch invoices', color: 'danger' };
      })

      // getSalesInvoiceSummary
      .addCase(getSalesInvoiceSummary.pending, (state) => {
        state.error = null;
      })
      .addCase(getSalesInvoiceSummary.fulfilled, (state, action) => {
        state.summary = action.payload.data || [];
      })
      .addCase(getSalesInvoiceSummary.rejected, (state, action) => {
        state.error = action.payload;
      })

      // createSalesInvoice
      .addCase(createSalesInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createSalesInvoice.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        if (action.payload.data) {
          state.invoices.unshift(action.payload.data);
        }
        state.toast = { message: 'Invoice created successfully.', color: 'success' };
      })
      .addCase(createSalesInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to create invoice.', color: 'danger' };
      })

      // getSalesInvoiceById
      .addCase(getSalesInvoiceById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.currentInvoice = null;
      })
      .addCase(getSalesInvoiceById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentInvoice = Array.isArray(action.payload.data) ? action.payload.data[0] : action.payload.data;
      })
      .addCase(getSalesInvoiceById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // updateSalesInvoice
      .addCase(updateSalesInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateSalesInvoice.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const updated = action.payload.data;
        const index = state.invoices.findIndex((inv) => inv._id === updated._id);
        if (index !== -1) {
          state.invoices[index] = updated;
        }
        state.toast = { message: 'Invoice updated successfully.', color: 'success' };
      })
      .addCase(updateSalesInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to update invoice.', color: 'danger' };
      })

      // confirmSalesInvoice
      .addCase(confirmSalesInvoice.pending, (state) => {
        state.loading = true;
      })
      .addCase(confirmSalesInvoice.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload.data?.data || action.payload.data;
        const index = state.invoices.findIndex((inv) => inv._id === action.payload.id);
        if (index !== -1 && updated) {
          state.invoices[index] = updated;
        }
        state.toast = { message: 'Invoice confirmed successfully.', color: 'success' };
      })
      .addCase(confirmSalesInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to confirm invoice.', color: 'danger' };
      })

      // markSalesInvoicePaid
      .addCase(markSalesInvoicePaid.pending, (state) => {
        state.loading = true;
      })
      .addCase(markSalesInvoicePaid.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload.data?.data || action.payload.data;
        const index = state.invoices.findIndex((inv) => inv._id === action.payload.id);
        if (index !== -1 && updated) {
          state.invoices[index] = updated;
        }
        state.toast = { message: 'Payment recorded successfully.', color: 'success' };
      })
      .addCase(markSalesInvoicePaid.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to record payment.', color: 'danger' };
      })

      // voidSalesInvoice
      .addCase(voidSalesInvoice.pending, (state) => {
        state.loading = true;
      })
      .addCase(voidSalesInvoice.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload.data?.data || action.payload.data;
        const index = state.invoices.findIndex((inv) => inv._id === action.payload.id);
        if (index !== -1 && updated) {
          state.invoices[index] = updated;
        }
        state.toast = { message: 'Invoice voided successfully.', color: 'success' };
      })
      .addCase(voidSalesInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to void invoice.', color: 'danger' };
      })

      // sendPaymentReminder
      .addCase(sendPaymentReminder.pending, (state) => {
        state.loading = true;
      })
      .addCase(sendPaymentReminder.fulfilled, (state) => {
        state.loading = false;
        state.toast = { message: 'Payment reminder email sent.', color: 'success' };
      })
      .addCase(sendPaymentReminder.rejected, (state, action) => {
        state.loading = false;
        state.toast = { message: action.payload || 'Failed to send payment reminder.', color: 'danger' };
      })

      // generatePaymentLink
      .addCase(generatePaymentLink.pending, (state) => {
        state.loading = true;
      })
      .addCase(generatePaymentLink.fulfilled, (state, action) => {
        state.loading = false;
        const link = action.payload?.data?.paymentLink || action.payload?.paymentLink;
        state.toast = { message: `Payment Link Generated: ${link || 'Success'}`, color: 'success' };
      })
      .addCase(generatePaymentLink.rejected, (state, action) => {
        state.loading = false;
        state.toast = { message: action.payload || 'Failed to generate payment link.', color: 'danger' };
      })

      // duplicateSalesInvoice
      .addCase(duplicateSalesInvoice.pending, (state) => {
        state.loading = true;
      })
      .addCase(duplicateSalesInvoice.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.data) {
          state.invoices.unshift(action.payload.data);
        }
        state.toast = { message: 'Invoice duplicated successfully.', color: 'success' };
      })
      .addCase(duplicateSalesInvoice.rejected, (state, action) => {
        state.loading = false;
        state.toast = { message: action.payload || 'Failed to duplicate invoice.', color: 'danger' };
      })

      // deleteSalesInvoice
      .addCase(deleteSalesInvoice.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteSalesInvoice.fulfilled, (state, action) => {
        state.loading = false;
        state.invoices = state.invoices.filter((inv) => inv._id !== action.payload.id);
        state.toast = { message: 'Invoice deleted successfully.', color: 'success' };
      })
      .addCase(deleteSalesInvoice.rejected, (state, action) => {
        state.loading = false;
        state.toast = { message: action.payload || 'Failed to delete invoice.', color: 'danger' };
      });
  },
});

export const { resetSalesInvoiceStatus, clearSalesInvoiceToast, clearCurrentSalesInvoice } = salesInvoiceSlice.actions;
export default salesInvoiceSlice.reducer;

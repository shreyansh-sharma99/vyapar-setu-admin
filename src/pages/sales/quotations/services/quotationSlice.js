import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getQuotationsApi,
  createQuotationApi,
  getQuotationByIdApi,
  updateQuotationApi,
  sendQuotationApi,
  acceptQuotationApi,
  rejectQuotationApi,
  convertToProformaApi,
  convertToInvoiceApi,
  duplicateQuotationApi,
  deleteQuotationApi,
} from './quotationService';

// ─── Async Thunks ───────────────────────────────────────────────────────────

export const getQuotations = createAsyncThunk(
  'quotation/getQuotations',
  async (params, { rejectWithValue }) => {
    try {
      return await getQuotationsApi(params);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch quotations');
    }
  }
);

export const createQuotation = createAsyncThunk(
  'quotation/createQuotation',
  async (payload, { rejectWithValue }) => {
    try {
      return await createQuotationApi(payload);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create quotation');
    }
  }
);

export const getQuotationById = createAsyncThunk(
  'quotation/getQuotationById',
  async (id, { rejectWithValue }) => {
    try {
      return await getQuotationByIdApi(id);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch quotation details');
    }
  }
);

export const updateQuotation = createAsyncThunk(
  'quotation/updateQuotation',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await updateQuotationApi(id, payload);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update quotation');
    }
  }
);

export const sendQuotation = createAsyncThunk(
  'quotation/sendQuotation',
  async (id, { rejectWithValue }) => {
    try {
      const data = await sendQuotationApi(id);
      return { id, data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send quotation');
    }
  }
);

export const acceptQuotation = createAsyncThunk(
  'quotation/acceptQuotation',
  async (id, { rejectWithValue }) => {
    try {
      const data = await acceptQuotationApi(id);
      return { id, data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to accept quotation');
    }
  }
);

export const rejectQuotation = createAsyncThunk(
  'quotation/rejectQuotation',
  async (id, { rejectWithValue }) => {
    try {
      const data = await rejectQuotationApi(id);
      return { id, data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reject quotation');
    }
  }
);

export const convertToProforma = createAsyncThunk(
  'quotation/convertToProforma',
  async (id, { rejectWithValue }) => {
    try {
      const data = await convertToProformaApi(id);
      return { id, data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to convert to proforma');
    }
  }
);

export const convertToInvoice = createAsyncThunk(
  'quotation/convertToInvoice',
  async (id, { rejectWithValue }) => {
    try {
      const data = await convertToInvoiceApi(id);
      return { id, data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to convert to invoice');
    }
  }
);

export const duplicateQuotation = createAsyncThunk(
  'quotation/duplicateQuotation',
  async (id, { rejectWithValue }) => {
    try {
      return await duplicateQuotationApi(id);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to duplicate quotation');
    }
  }
);

export const deleteQuotation = createAsyncThunk(
  'quotation/deleteQuotation',
  async (id, { rejectWithValue }) => {
    try {
      const data = await deleteQuotationApi(id);
      return { id, data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete quotation');
    }
  }
);

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState = {
  quotations: [],
  meta: { total: 0, page: 1, limit: 10, totalPages: 1 },
  currentQuotation: null,
  loading: false,
  error: null,
  success: false,
  toast: null,
};

// ─── Slice ───────────────────────────────────────────────────────────────────

const quotationSlice = createSlice({
  name: 'quotation',
  initialState,
  reducers: {
    resetQuotationStatus: (state) => {
      state.success = false;
      state.error = null;
    },
    clearQuotationToast: (state) => {
      state.toast = null;
    },
    clearCurrentQuotation: (state) => {
      state.currentQuotation = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // getQuotations
      .addCase(getQuotations.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(getQuotations.fulfilled, (state, action) => {
        state.loading = false;
        state.quotations = action.payload.data || [];
        state.meta = action.payload.meta || initialState.meta;
      })
      .addCase(getQuotations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to fetch quotations', color: 'danger' };
      })

      // createQuotation
      .addCase(createQuotation.pending, (state) => { state.loading = true; state.error = null; state.success = false; })
      .addCase(createQuotation.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        if (action.payload.data) state.quotations.unshift(action.payload.data);
        state.toast = { message: 'Quotation created successfully.', color: 'success' };
      })
      .addCase(createQuotation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to create quotation.', color: 'danger' };
      })

      // getQuotationById
      .addCase(getQuotationById.pending, (state) => { state.loading = true; state.error = null; state.currentQuotation = null; })
      .addCase(getQuotationById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentQuotation = Array.isArray(action.payload.data) ? action.payload.data[0] : action.payload.data;
      })
      .addCase(getQuotationById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // updateQuotation
      .addCase(updateQuotation.pending, (state) => { state.loading = true; state.error = null; state.success = false; })
      .addCase(updateQuotation.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const updated = action.payload.data;
        const index = state.quotations.findIndex((q) => q._id === updated?._id);
        if (index !== -1 && updated) state.quotations[index] = updated;
        state.toast = { message: 'Quotation updated successfully.', color: 'success' };
      })
      .addCase(updateQuotation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to update quotation.', color: 'danger' };
      })

      // sendQuotation
      .addCase(sendQuotation.pending, (state) => { state.loading = true; })
      .addCase(sendQuotation.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload.data?.data || action.payload.data;
        const index = state.quotations.findIndex((q) => q._id === action.payload.id);
        if (index !== -1 && updated) state.quotations[index] = updated;
        state.toast = { message: 'Quotation sent successfully.', color: 'success' };
      })
      .addCase(sendQuotation.rejected, (state, action) => {
        state.loading = false;
        state.toast = { message: action.payload || 'Failed to send quotation.', color: 'danger' };
      })

      // acceptQuotation
      .addCase(acceptQuotation.pending, (state) => { state.loading = true; })
      .addCase(acceptQuotation.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload.data?.data || action.payload.data;
        const index = state.quotations.findIndex((q) => q._id === action.payload.id);
        if (index !== -1 && updated) state.quotations[index] = updated;
        state.toast = { message: 'Quotation accepted.', color: 'success' };
      })
      .addCase(acceptQuotation.rejected, (state, action) => {
        state.loading = false;
        state.toast = { message: action.payload || 'Failed to accept quotation.', color: 'danger' };
      })

      // rejectQuotation
      .addCase(rejectQuotation.pending, (state) => { state.loading = true; })
      .addCase(rejectQuotation.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload.data?.data || action.payload.data;
        const index = state.quotations.findIndex((q) => q._id === action.payload.id);
        if (index !== -1 && updated) state.quotations[index] = updated;
        state.toast = { message: 'Quotation rejected.', color: 'warning' };
      })
      .addCase(rejectQuotation.rejected, (state, action) => {
        state.loading = false;
        state.toast = { message: action.payload || 'Failed to reject quotation.', color: 'danger' };
      })

      // convertToProforma
      .addCase(convertToProforma.pending, (state) => { state.loading = true; })
      .addCase(convertToProforma.fulfilled, (state) => {
        state.loading = false;
        state.toast = { message: 'Converted to Proforma Invoice successfully.', color: 'success' };
      })
      .addCase(convertToProforma.rejected, (state, action) => {
        state.loading = false;
        state.toast = { message: action.payload || 'Failed to convert to proforma.', color: 'danger' };
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

      // duplicateQuotation
      .addCase(duplicateQuotation.pending, (state) => { state.loading = true; })
      .addCase(duplicateQuotation.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.data) state.quotations.unshift(action.payload.data);
        state.toast = { message: 'Quotation duplicated successfully.', color: 'success' };
      })
      .addCase(duplicateQuotation.rejected, (state, action) => {
        state.loading = false;
        state.toast = { message: action.payload || 'Failed to duplicate quotation.', color: 'danger' };
      })

      // deleteQuotation
      .addCase(deleteQuotation.pending, (state) => { state.loading = true; })
      .addCase(deleteQuotation.fulfilled, (state, action) => {
        state.loading = false;
        state.quotations = state.quotations.filter((q) => q._id !== action.payload.id);
        state.toast = { message: 'Quotation deleted successfully.', color: 'success' };
      })
      .addCase(deleteQuotation.rejected, (state, action) => {
        state.loading = false;
        state.toast = { message: action.payload || 'Failed to delete quotation.', color: 'danger' };
      });
  },
});

export const { resetQuotationStatus, clearQuotationToast, clearCurrentQuotation } = quotationSlice.actions;
export default quotationSlice.reducer;

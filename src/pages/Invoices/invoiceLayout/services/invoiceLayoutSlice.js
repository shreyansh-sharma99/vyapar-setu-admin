import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getInvoiceLayoutApi,
  updateInvoiceLayoutApi,
} from './invoiceLayoutService';

// ─── Async Thunks ───────────────────────────────────────────────────────────

export const fetchInvoiceLayout = createAsyncThunk(
  'invoiceLayout/fetchInvoiceLayout',
  async (_, { rejectWithValue }) => {
    try {
      const data = await getInvoiceLayoutApi();
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch invoice layout settings'
      );
    }
  }
);

export const updateInvoiceLayout = createAsyncThunk(
  'invoiceLayout/updateInvoiceLayout',
  async (payload, { rejectWithValue }) => {
    try {
      const data = await updateInvoiceLayoutApi(payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update invoice layout settings'
      );
    }
  }
);

// ─── Initial State ───────────────────────────────────────────────────────────

export const DEFAULT_INVOICE_LAYOUT = {
  theme: 'classic',
  branding: {
    accentColor: '#404087',
    logo: null,
    signature: null,
  },
  documentVisibility: {
    showHsn: true,
    showDiscount: true,
    showTaxBreakup: true,
    showUpiQr: true,
    showSignature: true,
  },
  orderAutomation: {
    autoRaiseInvoiceOnDelivery: true,
    autoRecordCashPaymentOnDelivery: true,
  },
  numberingFormat: {
    template: '{PREFIX}/{FYSHORT}/{SEQ}',
    zeroPadding: 5,
    prefixPerSeries: {
      INV: 'INV',
      QT: 'QT',
      PI: 'PI',
      DC: 'DC',
      CN: 'CN',
      SR: 'SR',
      PUR: 'PUR',
      PO: 'PO',
      DN: 'DN',
    },
  },
  bankDetails: {
    accountName: 'Himanshu jangis',
    accountNumber: '6784947474784',
    ifsc: 'SBIN0001234',
    upiId: '7073083470@ybl',
    bankName: 'State Bank of India',
  },
  terms:
    'Payment Due Date: State the exact date or use standard net terms like Net 15, Net 30, or Net 45 (meaning payment is due in 15, 30, or 45 days from the invoice date).',
  notes:
    'Accepted Payment Methods: List approved ways to pay, such as bank transfer, UPI ID, or credit card, and note who covers transaction fees.',
};

const initialState = {
  layout: null,
  loading: true,
  saving: false,
  error: null,
  saveError: null,
  success: false,
  successMessage: null,
};

// ─── Slice ───────────────────────────────────────────────────────────────────

const invoiceLayoutSlice = createSlice({
  name: 'invoiceLayout',
  initialState,
  reducers: {
    clearLayoutErrors: (state) => {
      state.error = null;
      state.saveError = null;
      state.success = false;
      state.successMessage = null;
    },
    updateLocalLayout: (state, action) => {
      state.layout = {
        ...state.layout,
        ...action.payload,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchInvoiceLayout
      .addCase(fetchInvoiceLayout.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInvoiceLayout.fulfilled, (state, action) => {
        state.loading = false;
        const incoming = action.payload.data || action.payload;
        if (incoming) {
          state.layout = {
            ...DEFAULT_INVOICE_LAYOUT,
            ...incoming,
            branding: {
              ...DEFAULT_INVOICE_LAYOUT.branding,
              ...(incoming.branding || {}),
            },
            documentVisibility: {
              ...DEFAULT_INVOICE_LAYOUT.documentVisibility,
              ...(incoming.documentVisibility || {}),
            },
            orderAutomation: {
              ...DEFAULT_INVOICE_LAYOUT.orderAutomation,
              ...(incoming.orderAutomation || {}),
            },
            numberingFormat: {
              ...DEFAULT_INVOICE_LAYOUT.numberingFormat,
              ...(incoming.numberingFormat || {}),
              prefixPerSeries: {
                ...DEFAULT_INVOICE_LAYOUT.numberingFormat.prefixPerSeries,
                ...(incoming.numberingFormat?.prefixPerSeries || {}),
              },
            },
            bankDetails: {
              ...DEFAULT_INVOICE_LAYOUT.bankDetails,
              ...(incoming.bankDetails || {}),
            },
          };
        }
      })
      .addCase(fetchInvoiceLayout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // updateInvoiceLayout
      .addCase(updateInvoiceLayout.pending, (state) => {
        state.saving = true;
        state.saveError = null;
        state.success = false;
      })
      .addCase(updateInvoiceLayout.fulfilled, (state, action) => {
        state.saving = false;
        state.success = true;
        state.successMessage = action.payload?.message || 'Invoice layout updated successfully';
        const incoming = action.payload.data || action.payload;
        if (incoming) {
          state.layout = {
            ...state.layout,
            ...incoming,
          };
        }
      })
      .addCase(updateInvoiceLayout.rejected, (state, action) => {
        state.saving = false;
        state.saveError = action.payload;
      });
  },
});

export const { clearLayoutErrors, updateLocalLayout } = invoiceLayoutSlice.actions;
export default invoiceLayoutSlice.reducer;

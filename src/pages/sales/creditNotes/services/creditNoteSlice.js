import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getCreditNotesApi,
  createCreditNoteApi,
  getCreditNoteByIdApi,
  updateCreditNoteApi,
  updateCreditNoteStatusApi,
  applyCreditNoteApi,
  deleteCreditNoteApi,
} from './creditNoteService';

// ─── Async Thunks ───────────────────────────────────────────────────────────

export const getCreditNotes = createAsyncThunk(
  'creditNote/getCreditNotes',
  async (params, { rejectWithValue }) => {
    try {
      return await getCreditNotesApi(params);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch credit notes');
    }
  }
);

export const createCreditNote = createAsyncThunk(
  'creditNote/createCreditNote',
  async (payload, { rejectWithValue }) => {
    try {
      return await createCreditNoteApi(payload);
    } catch (error) {
      return rejectWithValue(error.response?.data || error.response?.data?.message || 'Failed to create credit note');
    }
  }
);

export const getCreditNoteById = createAsyncThunk(
  'creditNote/getCreditNoteById',
  async (id, { rejectWithValue }) => {
    try {
      return await getCreditNoteByIdApi(id);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch credit note details');
    }
  }
);

export const updateCreditNote = createAsyncThunk(
  'creditNote/updateCreditNote',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await updateCreditNoteApi(id, payload);
    } catch (error) {
      return rejectWithValue(error.response?.data || error.response?.data?.message || 'Failed to update credit note');
    }
  }
);

export const updateCreditNoteStatus = createAsyncThunk(
  'creditNote/updateCreditNoteStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const data = await updateCreditNoteStatusApi(id, status);
      return { id, status, data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update status');
    }
  }
);

export const applyCreditNote = createAsyncThunk(
  'creditNote/applyCreditNote',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const data = await applyCreditNoteApi(id, payload);
      return { id, data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to apply credit note to invoice');
    }
  }
);

export const deleteCreditNote = createAsyncThunk(
  'creditNote/deleteCreditNote',
  async (id, { rejectWithValue }) => {
    try {
      const data = await deleteCreditNoteApi(id);
      return { id, data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete credit note');
    }
  }
);

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState = {
  creditNotes: [],
  meta: { total: 0, page: 1, limit: 10, totalPages: 1 },
  currentCreditNote: null,
  loading: false,
  error: null,
  success: false,
  toast: null,
};

// ─── Slice ───────────────────────────────────────────────────────────────────

const creditNoteSlice = createSlice({
  name: 'creditNote',
  initialState,
  reducers: {
    resetCreditNoteStatus: (state) => {
      state.success = false;
      state.error = null;
    },
    clearCreditNoteToast: (state) => {
      state.toast = null;
    },
    clearCurrentCreditNote: (state) => {
      state.currentCreditNote = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // getCreditNotes
      .addCase(getCreditNotes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCreditNotes.fulfilled, (state, action) => {
        state.loading = false;
        state.creditNotes = action.payload.data || [];
        state.meta = action.payload.meta || initialState.meta;
      })
      .addCase(getCreditNotes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to fetch credit notes', color: 'danger' };
      })

      // createCreditNote
      .addCase(createCreditNote.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createCreditNote.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        if (action.payload.data) state.creditNotes.unshift(action.payload.data);
        state.toast = { message: 'Credit Note created successfully.', color: 'success' };
      })
      .addCase(createCreditNote.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload?.message || 'Failed to create credit note.', color: 'danger' };
      })

      // getCreditNoteById
      .addCase(getCreditNoteById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.currentCreditNote = null;
      })
      .addCase(getCreditNoteById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCreditNote = Array.isArray(action.payload.data) ? action.payload.data[0] : action.payload.data;
      })
      .addCase(getCreditNoteById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // updateCreditNote
      .addCase(updateCreditNote.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateCreditNote.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const updated = action.payload.data;
        const index = state.creditNotes.findIndex((c) => c._id === updated?._id);
        if (index !== -1 && updated) state.creditNotes[index] = updated;
        state.toast = { message: 'Credit Note updated successfully.', color: 'success' };
      })
      .addCase(updateCreditNote.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload?.message || 'Failed to update credit note.', color: 'danger' };
      })

      // updateCreditNoteStatus
      .addCase(updateCreditNoteStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateCreditNoteStatus.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload.data?.data || action.payload.data;
        const index = state.creditNotes.findIndex((c) => c._id === action.payload.id);
        if (index !== -1 && updated) state.creditNotes[index] = updated;
        if (state.currentCreditNote && state.currentCreditNote._id === action.payload.id) {
          state.currentCreditNote = updated;
        }
        state.toast = { message: `Status updated to ${action.payload.status}.`, color: 'success' };
      })
      .addCase(updateCreditNoteStatus.rejected, (state, action) => {
        state.loading = false;
        state.toast = { message: action.payload || 'Failed to update status.', color: 'danger' };
      })

      // applyCreditNote
      .addCase(applyCreditNote.pending, (state) => {
        state.loading = true;
      })
      .addCase(applyCreditNote.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload.data?.data || action.payload.data;
        const index = state.creditNotes.findIndex((c) => c._id === action.payload.id);
        if (index !== -1 && updated) state.creditNotes[index] = updated;
        if (state.currentCreditNote && state.currentCreditNote._id === action.payload.id) {
          state.currentCreditNote = updated;
        }
        state.toast = { message: 'Credit Note applied to invoice successfully.', color: 'success' };
      })
      .addCase(applyCreditNote.rejected, (state, action) => {
        state.loading = false;
        state.toast = { message: action.payload || 'Failed to apply credit note.', color: 'danger' };
      })

      // deleteCreditNote
      .addCase(deleteCreditNote.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteCreditNote.fulfilled, (state, action) => {
        state.loading = false;
        state.creditNotes = state.creditNotes.filter((c) => c._id !== action.payload.id);
        state.toast = { message: 'Credit Note deleted successfully.', color: 'success' };
      })
      .addCase(deleteCreditNote.rejected, (state, action) => {
        state.loading = false;
        state.toast = { message: action.payload || 'Failed to delete credit note.', color: 'danger' };
      });
  },
});

export const { resetCreditNoteStatus, clearCreditNoteToast, clearCurrentCreditNote } = creditNoteSlice.actions;
export default creditNoteSlice.reducer;

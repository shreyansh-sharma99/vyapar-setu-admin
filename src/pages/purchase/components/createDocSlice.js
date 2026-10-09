import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const toRejection = (error, fallback) => {
  const data = error?.response?.data;
  return {
    message: data?.message || error?.message || fallback,
    errors: Array.isArray(data?.errors) ? data.errors : [],
    status: error?.response?.status || null,
  };
};

const EMPTY_META = { total: 0, page: 1, limit: 10, totalPages: 1 };

/**
 * Builds a slice for a purchase document type:
 *  - fetchList(params)  -> { list, meta, stats }
 *  - fetchOne(id)       -> current
 *  - one thunk per entry in `actions` (create, update, confirm, cancel ...)
 *    which toggles `saving`. Callers use `.unwrap()` for the result.
 */
export default function createDocSlice(name, { list, get, actions = {} }) {
  const fetchList = createAsyncThunk(`${name}/fetchList`, async (params, { rejectWithValue }) => {
    try {
      return await list(params);
    } catch (error) {
      return rejectWithValue(toRejection(error, 'Could not load the list.'));
    }
  });

  const fetchOne = createAsyncThunk(`${name}/fetchOne`, async (id, { rejectWithValue }) => {
    try {
      return await get(id);
    } catch (error) {
      return rejectWithValue(toRejection(error, 'Could not load the details.'));
    }
  });

  const thunks = {};
  Object.entries(actions).forEach(([key, fn]) => {
    thunks[key] = createAsyncThunk(`${name}/${key}`, async (arg, { rejectWithValue }) => {
      try {
        return await fn(arg);
      } catch (error) {
        return rejectWithValue(toRejection(error, 'Something went wrong. Please try again.'));
      }
    });
  });

  const initialState = {
    list: [],
    meta: EMPTY_META,
    stats: null,
    listLoading: false,
    listError: null,
    current: null,
    currentLoading: false,
    currentError: null,
    saving: false,
  };

  const slice = createSlice({
    name,
    initialState,
    reducers: {
      clearCurrent: (state) => {
        state.current = null;
        state.currentError = null;
      },
    },
    extraReducers: (builder) => {
      builder
        .addCase(fetchList.pending, (state) => {
          state.listLoading = true;
          state.listError = null;
        })
        .addCase(fetchList.fulfilled, (state, action) => {
          state.listLoading = false;
          state.list = action.payload?.data || [];
          state.meta = action.payload?.meta || action.payload?.pagination || EMPTY_META;
          state.stats = action.payload?.stats || null;
        })
        .addCase(fetchList.rejected, (state, action) => {
          state.listLoading = false;
          state.list = [];
          state.listError = action.payload?.message || 'Could not load the list.';
        })
        .addCase(fetchOne.pending, (state, action) => {
          state.currentLoading = true;
          state.currentError = null;
          if (state.current?._id !== action.meta.arg) state.current = null;
        })
        .addCase(fetchOne.fulfilled, (state, action) => {
          state.currentLoading = false;
          state.current = action.payload?.data || null;
        })
        .addCase(fetchOne.rejected, (state, action) => {
          state.currentLoading = false;
          state.currentError = action.payload?.message || 'Could not load the details.';
        });
      Object.values(thunks).forEach((thunk) => {
        builder
          .addCase(thunk.pending, (state) => {
            state.saving = true;
          })
          .addCase(thunk.fulfilled, (state) => {
            state.saving = false;
          })
          .addCase(thunk.rejected, (state) => {
            state.saving = false;
          });
      });
    },
  });

  return { reducer: slice.reducer, actions: slice.actions, fetchList, fetchOne, thunks };
}

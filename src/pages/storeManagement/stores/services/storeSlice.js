import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getStoresApi,
  getStoreByIdApi,
  createStoreApi,
  updateStoreApi,
  setDefaultStoreApi,
  deleteStoreApi,
} from './storeService';

export const getStores = createAsyncThunk(
  'store/getStores',
  async (params, { rejectWithValue }) => {
    try {
      const data = await getStoresApi(params);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch stores');
    }
  }
);

// Paginated + server-side searched list for the Stores page (kept separate from `stores`,
// which other screens use for dropdowns)
export const getStoreList = createAsyncThunk(
  'store/getStoreList',
  async (params, { rejectWithValue }) => {
    try {
      const data = await getStoresApi(params);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch stores');
    }
  }
);

export const getStoreById = createAsyncThunk(
  'store/getStoreById',
  async (storeId, { rejectWithValue }) => {
    try {
      const data = await getStoreByIdApi(storeId);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch store details');
    }
  }
);

export const createStore = createAsyncThunk(
  'store/createStore',
  async (payload, { rejectWithValue }) => {
    try {
      const data = await createStoreApi(payload);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create store');
    }
  }
);

export const updateStore = createAsyncThunk(
  'store/updateStore',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const data = await updateStoreApi(id, payload);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update store');
    }
  }
);

export const setDefaultStore = createAsyncThunk(
  'store/setDefaultStore',
  async (storeId, { rejectWithValue }) => {
    try {
      const data = await setDefaultStoreApi(storeId);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to set default store');
    }
  }
);

export const deleteStore = createAsyncThunk(
  'store/deleteStore',
  async (storeId, { rejectWithValue }) => {
    try {
      const data = await deleteStoreApi(storeId);
      return { storeId, data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete store');
    }
  }
);

const initialState = {
  stores: [],
  storeList: [],
  pagination: { total: 0, page: 1, limit: 10, pages: 1 },
  stats: { total: 0, active: 0, inactive: 0, cities: 0 },
  listLoading: false,
  currentStore: null,
  loading: false,
  saving: false,
  error: null,
  successMessage: null,
};

const storeSlice = createSlice({
  name: 'store',
  initialState,
  reducers: {
    clearStoreStatus: (state) => {
      state.error = null;
      state.successMessage = null;
    },
    setCurrentStore: (state, action) => {
      state.currentStore = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // getStores
      .addCase(getStores.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getStores.fulfilled, (state, action) => {
        state.loading = false;
        state.stores = action.payload.data || [];
      })
      .addCase(getStores.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // getStoreList
      .addCase(getStoreList.pending, (state) => {
        state.listLoading = true;
        state.error = null;
      })
      .addCase(getStoreList.fulfilled, (state, action) => {
        state.listLoading = false;
        state.storeList = action.payload.data || [];
        if (action.payload.pagination) state.pagination = action.payload.pagination;
        if (action.payload.stats) state.stats = action.payload.stats;
      })
      .addCase(getStoreList.rejected, (state, action) => {
        state.listLoading = false;
        state.error = action.payload;
      })

      // getStoreById
      .addCase(getStoreById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getStoreById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentStore = action.payload.data;
      })
      .addCase(getStoreById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // createStore
      .addCase(createStore.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createStore.fulfilled, (state, action) => {
        state.saving = false;
        state.successMessage = action.payload.message || 'Store created successfully';
        if (action.payload.data) {
          if (action.payload.data.isDefault) {
            state.stores = state.stores.map((s) => ({ ...s, isDefault: false }));
          }
          state.stores.unshift(action.payload.data);
        }
      })
      .addCase(createStore.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      // updateStore
      .addCase(updateStore.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateStore.fulfilled, (state, action) => {
        state.saving = false;
        state.successMessage = action.payload.message || 'Store updated successfully';
        const updated = action.payload.data;
        if (updated) {
          state.stores = state.stores.map((s) => {
            if (updated.isDefault) {
              return s._id === updated._id ? updated : { ...s, isDefault: false };
            }
            return s._id === updated._id ? updated : s;
          });
          state.storeList = state.storeList.map((s) => (s._id === updated._id ? updated : s));
        }
      })
      .addCase(updateStore.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      // setDefaultStore
      .addCase(setDefaultStore.fulfilled, (state, action) => {
        const updated = action.payload.data;
        if (updated) {
          const markDefault = (s) => ({ ...s, isDefault: s._id === updated._id });
          state.stores = state.stores.map(markDefault);
          state.storeList = state.storeList.map(markDefault);
        }
        state.successMessage = action.payload.message;
      })

      .addCase(setDefaultStore.rejected, (state, action) => {
        state.error = action.payload;
      })

      // deleteStore
      .addCase(deleteStore.fulfilled, (state, action) => {
        state.stores = state.stores.filter((s) => s._id !== action.payload.storeId);
        state.storeList = state.storeList.filter((s) => s._id !== action.payload.storeId);
        state.successMessage = 'Store deleted successfully';
      })
      .addCase(deleteStore.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearStoreStatus, setCurrentStore } = storeSlice.actions;
export default storeSlice.reducer;

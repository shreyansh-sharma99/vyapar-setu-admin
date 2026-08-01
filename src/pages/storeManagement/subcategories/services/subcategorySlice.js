import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getSubcategoriesApi,
  getSubcategoryByIdApi,
  createSubcategoryApi,
  updateSubcategoryApi,
  changeSubcategoryStatusApi,
  deleteSubcategoryApi,
} from './subcategoryService';

export const getSubcategories = createAsyncThunk(
  'subcategory/getSubcategories',
  async (params, { rejectWithValue }) => {
    try {
      const data = await getSubcategoriesApi(params);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch subcategories'
      );
    }
  }
);

export const getSubcategoryById = createAsyncThunk(
  'subcategory/getSubcategoryById',
  async ({ subCategoryId, categoryId }, { rejectWithValue }) => {
    try {
      const data = await getSubcategoryByIdApi(subCategoryId, categoryId);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch subcategory details'
      );
    }
  }
);

export const createSubcategory = createAsyncThunk(
  'subcategory/createSubcategory',
  async (payload, { rejectWithValue }) => {
    try {
      const data = await createSubcategoryApi(payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create subcategory'
      );
    }
  }
);

export const updateSubcategory = createAsyncThunk(
  'subcategory/updateSubcategory',
  async ({ subCategoryId, payload }, { rejectWithValue }) => {
    try {
      const data = await updateSubcategoryApi(subCategoryId, payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update subcategory'
      );
    }
  }
);

export const changeSubcategoryStatus = createAsyncThunk(
  'subcategory/changeSubcategoryStatus',
  async ({ subCategoryId, status }, { rejectWithValue }) => {
    try {
      const data = await changeSubcategoryStatusApi(subCategoryId, status);
      return { subCategoryId, status, data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update subcategory status'
      );
    }
  }
);

export const deleteSubcategory = createAsyncThunk(
  'subcategory/deleteSubcategory',
  async (subCategoryId, { rejectWithValue }) => {
    try {
      const data = await deleteSubcategoryApi(subCategoryId);
      return { subCategoryId, data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete subcategory'
      );
    }
  }
);

const initialState = {
  subcategories: [],
  currentSubcategory: null,
  pagination: null,
  loading: false,
  error: null,
  success: false,
  toast: null,
};

const subcategorySlice = createSlice({
  name: 'subcategory',
  initialState,
  reducers: {
    resetSubcategoryStatus: (state) => {
      state.success = false;
      state.error = null;
    },
    clearSubcategoryToast: (state) => {
      state.toast = null;
    },
    clearCurrentSubcategory: (state) => {
      state.currentSubcategory = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getSubcategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getSubcategories.fulfilled, (state, action) => {
        state.loading = false;
        state.subcategories = action.payload.data || [];
        state.pagination = action.payload.meta || null;
      })
      .addCase(getSubcategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to fetch subcategories', color: 'danger' };
      })

      .addCase(getSubcategoryById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.currentSubcategory = null;
      })
      .addCase(getSubcategoryById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentSubcategory = Array.isArray(action.payload.data)
          ? action.payload.data[0]
          : action.payload.data;
      })
      .addCase(getSubcategoryById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(createSubcategory.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createSubcategory.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.subcategories.unshift(action.payload.data);
        state.toast = { message: 'Subcategory created successfully.', color: 'success' };
      })
      .addCase(createSubcategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to create subcategory.', color: 'danger' };
      })

      .addCase(updateSubcategory.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateSubcategory.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.subcategories.findIndex(
          (s) => s._id === action.payload.data._id
        );
        if (index !== -1) {
          state.subcategories[index] = action.payload.data;
        }
        state.toast = { message: 'Subcategory updated successfully.', color: 'success' };
      })
      .addCase(updateSubcategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to update subcategory.', color: 'danger' };
      })

      .addCase(changeSubcategoryStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(changeSubcategoryStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.subcategories.findIndex(
          (s) => s._id === action.payload.subCategoryId
        );
        if (index !== -1) {
          state.subcategories[index].status = action.payload.status;
        }
        state.toast = { message: `Subcategory status updated to ${action.payload.status}.`, color: 'success' };
      })
      .addCase(changeSubcategoryStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to update subcategory status.', color: 'danger' };
      })

      .addCase(deleteSubcategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteSubcategory.fulfilled, (state, action) => {
        state.loading = false;
        state.subcategories = state.subcategories.filter(
          (s) => s._id !== action.payload.subCategoryId
        );
        state.toast = { message: 'Subcategory deleted successfully.', color: 'success' };
      })
      .addCase(deleteSubcategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to delete subcategory.', color: 'danger' };
      });
  },
});

export const { resetSubcategoryStatus, clearSubcategoryToast, clearCurrentSubcategory } = subcategorySlice.actions;
export default subcategorySlice.reducer;

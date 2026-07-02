import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getCategoriesApi,
  getCategoryByIdApi,
  createCategoryApi,
  updateCategoryApi,
  deleteCategoryApi,
  changeCategoryStatusApi,
} from './categoryService';

export const getCategories = createAsyncThunk(
  'category/getCategories',
  async (_, { rejectWithValue }) => {
    try {
      const data = await getCategoriesApi();
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch categories'
      );
    }
  }
);

export const getCategoryById = createAsyncThunk(
  'category/getCategoryById',
  async (categoryId, { rejectWithValue }) => {
    try {
      const data = await getCategoryByIdApi(categoryId);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch category details'
      );
    }
  }
);

export const createCategory = createAsyncThunk(
  'category/createCategory',
  async (formData, { rejectWithValue }) => {
    try {
      const data = await createCategoryApi(formData);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create category'
      );
    }
  }
);

export const updateCategory = createAsyncThunk(
  'category/updateCategory',
  async ({ categoryId, formData }, { rejectWithValue }) => {
    try {
      const data = await updateCategoryApi(categoryId, formData);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update category'
      );
    }
  }
);

export const deleteCategory = createAsyncThunk(
  'category/deleteCategory',
  async (categoryId, { rejectWithValue }) => {
    try {
      const data = await deleteCategoryApi(categoryId);
      return { categoryId, data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete category'
      );
    }
  }
);

export const changeCategoryStatus = createAsyncThunk(
  'category/changeCategoryStatus',
  async ({ categoryId, status }, { rejectWithValue }) => {
    try {
      const data = await changeCategoryStatusApi(categoryId, status);
      return { categoryId, status, data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update category status'
      );
    }
  }
);

const initialState = {
  categories: [],
  currentCategory: null,
  loading: false,
  error: null,
  success: false,
  toast: null,
};

const categorySlice = createSlice({
  name: 'category',
  initialState,
  reducers: {
    resetCategoryStatus: (state) => {
      state.success = false;
      state.error = null;
    },
    clearCategoryToast: (state) => {
      state.toast = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload.data || [];
      })
      .addCase(getCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to fetch categories', color: 'danger' };
      })

      .addCase(getCategoryById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.currentCategory = null;
      })
      .addCase(getCategoryById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCategory = Array.isArray(action.payload.data) ? action.payload.data[0] : action.payload.data;
      })
      .addCase(getCategoryById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(createCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.categories.unshift(action.payload.data);
        state.toast = { message: 'Category created successfully.', color: 'success' };
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to create category.', color: 'danger' };
      })

      .addCase(updateCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.categories.findIndex(
          (c) => c._id === action.payload.data._id
        );
        if (index !== -1) {
          state.categories[index] = action.payload.data;
        }
        state.toast = { message: 'Category updated successfully.', color: 'success' };
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to update category.', color: 'danger' };
      })

      .addCase(deleteCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = state.categories.filter(
          (c) => c._id !== action.payload.categoryId
        );
        state.toast = { message: 'Category deleted successfully.', color: 'success' };
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to delete category.', color: 'danger' };
      })

      .addCase(changeCategoryStatus.pending, (state) => {
        state.error = null;
      })
      .addCase(changeCategoryStatus.fulfilled, (state, action) => {
        const index = state.categories.findIndex(
          (c) => c._id === action.payload.categoryId
        );
        if (index !== -1) {
          state.categories[index].status = action.payload.status;
        }
        state.toast = { message: `Category status updated to ${action.payload.status}.`, color: 'success' };
      })
      .addCase(changeCategoryStatus.rejected, (state, action) => {
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to update category status.', color: 'danger' };
      });
  },
});

export const { resetCategoryStatus, clearCategoryToast } = categorySlice.actions;
export default categorySlice.reducer;

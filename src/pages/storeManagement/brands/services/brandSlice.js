import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getBrandsApi,
  getBrandByIdApi,
  createBrandApi,
  updateBrandApi,
  changeBrandStatusApi,
  deleteBrandApi,
} from './brandService';

export const getBrands = createAsyncThunk(
  'brand/getBrands',
  async (params, { rejectWithValue }) => {
    try {
      const data = await getBrandsApi(params);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch brands'
      );
    }
  }
);

export const getBrandById = createAsyncThunk(
  'brand/getBrandById',
  async (brandId, { rejectWithValue }) => {
    try {
      const data = await getBrandByIdApi(brandId);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch brand details'
      );
    }
  }
);

export const createBrand = createAsyncThunk(
  'brand/createBrand',
  async (payload, { rejectWithValue }) => {
    try {
      const data = await createBrandApi(payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create brand'
      );
    }
  }
);

export const updateBrand = createAsyncThunk(
  'brand/updateBrand',
  async ({ brandId, payload }, { rejectWithValue }) => {
    try {
      const data = await updateBrandApi(brandId, payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update brand'
      );
    }
  }
);

export const changeBrandStatus = createAsyncThunk(
  'brand/changeBrandStatus',
  async ({ brandId, status }, { rejectWithValue }) => {
    try {
      const data = await changeBrandStatusApi(brandId, status);
      return { brandId, status, data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update brand status'
      );
    }
  }
);

export const deleteBrand = createAsyncThunk(
  'brand/deleteBrand',
  async (brandId, { rejectWithValue }) => {
    try {
      const data = await deleteBrandApi(brandId);
      return { brandId, data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete brand'
      );
    }
  }
);

const initialState = {
  brands: [],
  currentBrand: null,
  pagination: null,
  loading: false,
  error: null,
  success: false,
  toast: null,
};

const brandSlice = createSlice({
  name: 'brand',
  initialState,
  reducers: {
    resetBrandStatus: (state) => {
      state.success = false;
      state.error = null;
    },
    clearBrandToast: (state) => {
      state.toast = null;
    },
    clearCurrentBrand: (state) => {
      state.currentBrand = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getBrands.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getBrands.fulfilled, (state, action) => {
        state.loading = false;
        state.brands = action.payload.data || [];
        state.pagination = action.payload.meta || null;
      })
      .addCase(getBrands.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to fetch brands', color: 'danger' };
      })

      .addCase(getBrandById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.currentBrand = null;
      })
      .addCase(getBrandById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentBrand = Array.isArray(action.payload.data) ? action.payload.data[0] : action.payload.data;
      })
      .addCase(getBrandById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(createBrand.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createBrand.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.brands.unshift(action.payload.data);
        state.toast = { message: 'Brand created successfully.', color: 'success' };
      })
      .addCase(createBrand.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to create brand.', color: 'danger' };
      })

      .addCase(updateBrand.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateBrand.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.brands.findIndex(
          (b) => b._id === action.payload.data._id
        );
        if (index !== -1) {
          state.brands[index] = action.payload.data;
        }
        state.toast = { message: 'Brand updated successfully.', color: 'success' };
      })
      .addCase(updateBrand.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to update brand.', color: 'danger' };
      })

      .addCase(changeBrandStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(changeBrandStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.brands.findIndex(
          (b) => b._id === action.payload.brandId
        );
        if (index !== -1) {
          state.brands[index].status = action.payload.status;
        }
        state.toast = { message: `Brand status updated to ${action.payload.status}.`, color: 'success' };
      })
      .addCase(changeBrandStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to update brand status.', color: 'danger' };
      })

      .addCase(deleteBrand.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteBrand.fulfilled, (state, action) => {
        state.loading = false;
        state.brands = state.brands.filter(
          (b) => b._id !== action.payload.brandId
        );
        state.toast = { message: 'Brand deleted successfully.', color: 'success' };
      })
      .addCase(deleteBrand.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to delete brand.', color: 'danger' };
      });
  },
});

export const { resetBrandStatus, clearBrandToast, clearCurrentBrand } = brandSlice.actions;
export default brandSlice.reducer;

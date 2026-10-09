import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getProductsApi,
  getProductByIdApi,
  createProductApi,
  updateProductApi,
  changeProductStatusApi,
  deleteProductApi,
  getProductByBarcodeApi,
  generateBarcodesApi,
  getProductVariantsApi,
  createProductVariantsApi,
} from './productService';

export const getProducts = createAsyncThunk(
  'product/getProducts',
  async (params, { rejectWithValue }) => {
    try {
      const data = await getProductsApi(params);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch products'
      );
    }
  }
);

export const getProductById = createAsyncThunk(
  'product/getProductById',
  async (productId, { rejectWithValue }) => {
    try {
      const data = await getProductByIdApi(productId);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch product details'
      );
    }
  }
);

export const createProduct = createAsyncThunk(
  'product/createProduct',
  async (payload, { rejectWithValue }) => {
    try {
      const data = await createProductApi(payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create product'
      );
    }
  }
);

export const updateProduct = createAsyncThunk(
  'product/updateProduct',
  async ({ productId, payload }, { rejectWithValue }) => {
    try {
      const data = await updateProductApi(productId, payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update product'
      );
    }
  }
);

export const deleteProduct = createAsyncThunk(
  'product/deleteProduct',
  async (productId, { rejectWithValue }) => {
    try {
      const data = await deleteProductApi(productId);
      return { productId, data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete product'
      );
    }
  }
);

export const changeProductStatus = createAsyncThunk(
  'product/changeProductStatus',
  async ({ productId, status }, { rejectWithValue }) => {
    try {
      const data = await changeProductStatusApi(productId, status);
      return { productId, status, data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update product status'
      );
    }
  }
);

export const getProductByBarcode = createAsyncThunk(
  'product/getProductByBarcode',
  async (barcode, { rejectWithValue }) => {
    try {
      const data = await getProductByBarcodeApi(barcode);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Product not found with this barcode'
      );
    }
  }
);

export const generateBarcodes = createAsyncThunk(
  'product/generateBarcodes',
  async (productIds, { rejectWithValue }) => {
    try {
      const data = await generateBarcodesApi(productIds);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to generate barcodes'
      );
    }
  }
);

export const getProductVariants = createAsyncThunk(
  'product/getProductVariants',
  async (productId, { rejectWithValue }) => {
    try {
      const data = await getProductVariantsApi(productId);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to load variants'
      );
    }
  }
);

export const createProductVariants = createAsyncThunk(
  'product/createProductVariants',
  async ({ productId, variants }, { rejectWithValue }) => {
    try {
      const data = await createProductVariantsApi(productId, variants);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create variants'
      );
    }
  }
);

const initialState = {
  products: [],
  currentProduct: null,
  pagination: null,
  loading: false,
  error: null,
  success: false,
  toast: null,
  variants: [],
  variantGroupId: null,
  variantsLoading: false,
  variantsSaving: false,
  generatingBarcodes: false,
};

const productSlice = createSlice({
  name: 'product',
  initialState,
  reducers: {
    resetProductStatus: (state) => {
      state.success = false;
      state.error = null;
    },
    clearProductToast: (state) => {
      state.toast = null;
    },
    clearCurrentProduct: (state) => {
      state.currentProduct = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(getProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload.data || [];
        state.pagination = action.payload.meta || null;
      })
      .addCase(getProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to fetch products', color: 'danger' };
      })

      .addCase(getProductById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.currentProduct = null;
      })
      .addCase(getProductById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProduct = Array.isArray(action.payload.data) ? action.payload.data[0] : action.payload.data;
      })
      .addCase(getProductById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(createProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        if (action.payload.data) {
          state.products.unshift(action.payload.data);
        }
        state.toast = { message: 'Product created successfully.', color: 'success' };
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to create product.', color: 'danger' };
      })

      .addCase(updateProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const updated = action.payload.data;
        const index = state.products.findIndex((p) => p._id === updated._id);
        if (index !== -1) {
          state.products[index] = updated;
        }
        state.toast = { message: 'Product updated successfully.', color: 'success' };
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to update product.', color: 'danger' };
      })

      .addCase(deleteProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.products = state.products.filter((p) => p._id !== action.payload.productId);
        state.toast = { message: 'Product deleted successfully.', color: 'success' };
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to delete product.', color: 'danger' };
      })

      .addCase(changeProductStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(changeProductStatus.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.products.findIndex((p) => p._id === action.payload.productId);
        if (index !== -1) {
          state.products[index].status = action.payload.status;
        }
        state.toast = { message: `Product status updated to ${action.payload.status}.`, color: 'success' };
      })
      .addCase(changeProductStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to update product status.', color: 'danger' };
      })

      .addCase(generateBarcodes.pending, (state) => {
        state.generatingBarcodes = true;
      })
      .addCase(generateBarcodes.fulfilled, (state, action) => {
        state.generatingBarcodes = false;
        const assigned = action.payload.data || [];
        assigned.forEach((a) => {
          const p = state.products.find((x) => x._id === a.productId);
          if (p) p.barcode = a.barcode;
        });
        state.toast = {
          message: assigned.length
            ? `${assigned.length} barcode${assigned.length === 1 ? '' : 's'} generated.`
            : 'No barcodes generated: every product already has one.',
          color: assigned.length ? 'success' : 'info',
        };
      })
      .addCase(generateBarcodes.rejected, (state, action) => {
        state.generatingBarcodes = false;
        state.toast = { message: action.payload || 'Failed to generate barcodes.', color: 'danger' };
      })

      .addCase(getProductVariants.pending, (state) => {
        state.variantsLoading = true;
      })
      .addCase(getProductVariants.fulfilled, (state, action) => {
        state.variantsLoading = false;
        state.variants = action.payload.data?.variants || [];
        state.variantGroupId = action.payload.data?.variantGroupId || null;
      })
      .addCase(getProductVariants.rejected, (state) => {
        state.variantsLoading = false;
        state.variants = [];
        state.variantGroupId = null;
      })

      .addCase(createProductVariants.pending, (state) => {
        state.variantsSaving = true;
      })
      .addCase(createProductVariants.fulfilled, (state, action) => {
        state.variantsSaving = false;
        const created = action.payload.data || [];
        state.toast = { message: action.payload.message || `${created.length} variant(s) created.`, color: 'success' };
      })
      .addCase(createProductVariants.rejected, (state, action) => {
        state.variantsSaving = false;
        state.toast = { message: action.payload || 'Failed to create variants.', color: 'danger' };
      })

      .addCase(getProductByBarcode.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.currentProduct = null;
      })
      .addCase(getProductByBarcode.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProduct = Array.isArray(action.payload.data) ? action.payload.data[0] : action.payload.data;
        state.toast = { message: 'Product found by barcode!', color: 'success' };
      })
      .addCase(getProductByBarcode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Product not found with this barcode', color: 'danger' };
      });
  },
});

export const { resetProductStatus, clearProductToast, clearCurrentProduct } = productSlice.actions;
export default productSlice.reducer;

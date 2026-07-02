import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getCustomersApi,
  getCustomerByIdApi,
  createCustomerApi,
  updateCustomerApi,
  deleteCustomerApi,
} from './customerService';

export const getCustomers = createAsyncThunk(
  'customer/getCustomers',
  async ({ page, limit } = { page: 1, limit: 10 }, { rejectWithValue }) => {
    try {
      const data = await getCustomersApi(page, limit);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch customers'
      );
    }
  }
);

export const getCustomerById = createAsyncThunk(
  'customer/getCustomerById',
  async (customerId, { rejectWithValue }) => {
    try {
      const data = await getCustomerByIdApi(customerId);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch customer details'
      );
    }
  }
);

export const createCustomer = createAsyncThunk(
  'customer/createCustomer',
  async (customerData, { rejectWithValue }) => {
    try {
      const data = await createCustomerApi(customerData);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create customer'
      );
    }
  }
);

export const updateCustomer = createAsyncThunk(
  'customer/updateCustomer',
  async ({ customerId, customerData }, { rejectWithValue }) => {
    try {
      const data = await updateCustomerApi(customerId, customerData);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update customer'
      );
    }
  }
);

export const deleteCustomer = createAsyncThunk(
  'customer/deleteCustomer',
  async (customerId, { rejectWithValue }) => {
    try {
      const data = await deleteCustomerApi(customerId);
      return { customerId, data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete customer'
      );
    }
  }
);

const initialState = {
  customers: [],
  pagination: {
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
  },
  currentCustomer: null,
  loading: false,
  error: null,
  success: false,
  toast: null,
};

const customerSlice = createSlice({
  name: 'customer',
  initialState,
  reducers: {
    resetCustomerStatus: (state) => {
      state.success = false;
      state.error = null;
    },
    clearCustomerToast: (state) => {
      state.toast = null;
    },
    clearCurrentCustomer: (state) => {
      state.currentCustomer = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getCustomers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCustomers.fulfilled, (state, action) => {
        state.loading = false;
        // In case API returns pagination object or direct data array
        const payloadData = action.payload.data || action.payload;
        if (payloadData && typeof payloadData === 'object' && !Array.isArray(payloadData)) {
          state.customers = payloadData.docs || payloadData.customers || payloadData.data || [];
          state.pagination = {
            totalItems: payloadData.totalItems || payloadData.totalDocs || state.customers.length,
            totalPages: payloadData.totalPages || 1,
            currentPage: payloadData.currentPage || payloadData.page || 1,
            limit: payloadData.limit || 10,
          };
        } else {
          state.customers = Array.isArray(payloadData) ? payloadData : [];
          state.pagination = {
            totalItems: state.customers.length,
            totalPages: 1,
            currentPage: 1,
            limit: 10,
          };
        }
      })
      .addCase(getCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to fetch customers', color: 'danger' };
      })

      .addCase(getCustomerById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.currentCustomer = null;
      })
      .addCase(getCustomerById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCustomer = Array.isArray(action.payload.data) ? action.payload.data[0] : action.payload.data;
      })
      .addCase(getCustomerById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(createCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const newCust = action.payload.data || action.payload;
        state.customers.unshift(newCust);
        state.toast = { message: 'Customer created successfully.', color: 'success' };
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to create customer.', color: 'danger' };
      })

      .addCase(updateCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const updated = action.payload.data || action.payload;
        const index = state.customers.findIndex((c) => c._id === updated._id);
        if (index !== -1) {
          state.customers[index] = updated;
        }
        state.toast = { message: 'Customer updated successfully.', color: 'success' };
      })
      .addCase(updateCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to update customer.', color: 'danger' };
      })

      .addCase(deleteCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.customers = state.customers.filter((c) => c._id !== action.payload.customerId);
        state.toast = { message: 'Customer deleted successfully.', color: 'success' };
      })
      .addCase(deleteCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to delete customer.', color: 'danger' };
      });
  },
});

export const { resetCustomerStatus, clearCustomerToast, clearCurrentCustomer } = customerSlice.actions;
export default customerSlice.reducer;

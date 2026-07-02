import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getManufacturersApi,
  getManufacturerByIdApi,
  createManufacturerApi,
  updateManufacturerApi,
  changeManufacturerStatusApi,
  deleteManufacturerApi,
} from './manufacturerService';

export const getManufacturers = createAsyncThunk(
  'manufacturer/getManufacturers',
  async (_, { rejectWithValue }) => {
    try {
      const data = await getManufacturersApi();
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch manufacturers'
      );
    }
  }
);

export const getManufacturerById = createAsyncThunk(
  'manufacturer/getManufacturerById',
  async (manufacturerId, { rejectWithValue }) => {
    try {
      const data = await getManufacturerByIdApi(manufacturerId);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch manufacturer details'
      );
    }
  }
);

export const createManufacturer = createAsyncThunk(
  'manufacturer/createManufacturer',
  async (payload, { rejectWithValue }) => {
    try {
      const data = await createManufacturerApi(payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create manufacturer'
      );
    }
  }
);

export const updateManufacturer = createAsyncThunk(
  'manufacturer/updateManufacturer',
  async ({ manufacturerId, payload }, { rejectWithValue }) => {
    try {
      const data = await updateManufacturerApi(manufacturerId, payload);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update manufacturer'
      );
    }
  }
);

export const changeManufacturerStatus = createAsyncThunk(
  'manufacturer/changeManufacturerStatus',
  async ({ manufacturerId, status }, { rejectWithValue }) => {
    try {
      const data = await changeManufacturerStatusApi(manufacturerId, status);
      return { manufacturerId, status, data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update manufacturer status'
      );
    }
  }
);

export const deleteManufacturer = createAsyncThunk(
  'manufacturer/deleteManufacturer',
  async (manufacturerId, { rejectWithValue }) => {
    try {
      const data = await deleteManufacturerApi(manufacturerId);
      return { manufacturerId, data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete manufacturer'
      );
    }
  }
);

const initialState = {
  manufacturers: [],
  currentManufacturer: null,
  loading: false,
  error: null,
  success: false,
  toast: null,
};

const manufacturerSlice = createSlice({
  name: 'manufacturer',
  initialState,
  reducers: {
    resetManufacturerStatus: (state) => {
      state.success = false;
      state.error = null;
    },
    clearManufacturerToast: (state) => {
      state.toast = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getManufacturers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getManufacturers.fulfilled, (state, action) => {
        state.loading = false;
        state.manufacturers = action.payload.data || [];
      })
      .addCase(getManufacturers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to fetch manufacturers', color: 'danger' };
      })

      .addCase(getManufacturerById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.currentManufacturer = null;
      })
      .addCase(getManufacturerById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentManufacturer = Array.isArray(action.payload.data) ? action.payload.data[0] : action.payload.data;
      })
      .addCase(getManufacturerById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(createManufacturer.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createManufacturer.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.manufacturers.unshift(action.payload.data);
        state.toast = { message: 'Manufacturer created successfully.', color: 'success' };
      })
      .addCase(createManufacturer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to create manufacturer.', color: 'danger' };
      })

      .addCase(updateManufacturer.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateManufacturer.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.manufacturers.findIndex(
          (m) => m._id === action.payload.data._id
        );
        if (index !== -1) {
          state.manufacturers[index] = action.payload.data;
        }
        state.toast = { message: 'Manufacturer updated successfully.', color: 'success' };
      })
      .addCase(updateManufacturer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to update manufacturer.', color: 'danger' };
      })

      .addCase(changeManufacturerStatus.pending, (state) => {
        state.error = null;
      })
      .addCase(changeManufacturerStatus.fulfilled, (state, action) => {
        const index = state.manufacturers.findIndex(
          (m) => m._id === action.payload.manufacturerId
        );
        if (index !== -1) {
          state.manufacturers[index].status = action.payload.status;
        }
        state.toast = { message: `Manufacturer status updated to ${action.payload.status}.`, color: 'success' };
      })
      .addCase(changeManufacturerStatus.rejected, (state, action) => {
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to update manufacturer status.', color: 'danger' };
      })

      .addCase(deleteManufacturer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteManufacturer.fulfilled, (state, action) => {
        state.loading = false;
        state.manufacturers = state.manufacturers.filter(
          (m) => m._id !== action.payload.manufacturerId
        );
        state.toast = { message: 'Manufacturer deleted successfully.', color: 'success' };
      })
      .addCase(deleteManufacturer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.toast = { message: action.payload || 'Failed to delete manufacturer.', color: 'danger' };
      });
  },
});

export const { resetManufacturerStatus, clearManufacturerToast } = manufacturerSlice.actions;
export default manufacturerSlice.reducer;

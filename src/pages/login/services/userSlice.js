import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getProfileApi } from './userService';
import { decryptData } from '@/utility/crypto';
import { loginUser, logout, normalizeUser } from './authSlice';



const getStoredProfile = () => {
  try {
    const vsetu = localStorage.getItem('vyaparsetu');
    if (vsetu) {
      const decrypted = decryptData(vsetu);
      if (decrypted) {
        const parsed = JSON.parse(decrypted);
        if (parsed.success && parsed.data) {
          return parsed.data;
        }
        if (parsed.user || parsed.owner) {
          return parsed.user || parsed.owner;
        }
        if (parsed.data) {
          return parsed.data.user || parsed.data.owner || parsed.data;
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error loading profile from storage", e);
  }
  return null;
};

const initialState = {
  profile: getStoredProfile(),
  loading: false,
  error: null,
};

export const fetchUserProfile = createAsyncThunk(
  'user/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const data = await getProfileApi();
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch profile'
      );
    }
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearUser: (state) => {
      state.profile = null;
      localStorage.removeItem('vyaparsetu');
      localStorage.removeItem('_v_menu_permissions');
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.success) {
          // authSlice merges the same profile into state.auth.user and saves it (encrypted)
          // under 'vyaparsetu', including userType / roleName / permissions / storeIds.
          state.profile = normalizeUser(action.payload.data);
        }
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        if (action.payload?.data) {
          state.profile = normalizeUser(action.payload.data.owner || action.payload.data.user || action.payload.data);
        }
      })
      .addCase(logout, (state) => {
        state.profile = null;
      });
  },
});

export const { clearUser } = userSlice.actions;
export default userSlice.reducer;

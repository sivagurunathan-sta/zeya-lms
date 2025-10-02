import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { login as loginAPI, getCurrentUser } from '../../services/authAPI';

// Async thunk for login
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await loginAPI(credentials);
      
      // Backend response structure: { success, message, data: { user, token } }
      const { user, token } = response.data;
      
      // Store BOTH token and user in localStorage for App.js compatibility
      if (token) {
        localStorage.setItem('token', token);
      }
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }
      
      return { user, token };
    } catch (error) {
      const errorMessage = error?.message || error?.response?.data?.message || 'Login failed';
      return rejectWithValue(errorMessage);
    }
  }
);

// Async thunk to check auth status
export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }
      
      const response = await getCurrentUser();
      return response.data;
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return rejectWithValue('Not authenticated');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: false,
    loading: false,
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      // Check Auth
      .addCase(checkAuth.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
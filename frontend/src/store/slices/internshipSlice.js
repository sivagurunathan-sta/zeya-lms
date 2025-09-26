// src/store/slices/internshipSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as internshipAPI from '../../services/internshipAPI';

// Async thunks
export const fetchInternships = createAsyncThunk(
  'internships/fetchInternships',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await internshipAPI.getInternships(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch internships');
    }
  }
);

export const fetchInternshipById = createAsyncThunk(
  'internships/fetchInternshipById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await internshipAPI.getInternshipById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch internship');
    }
  }
);

export const enrollInInternship = createAsyncThunk(
  'internships/enrollInInternship',
  async (internshipId, { rejectWithValue }) => {
    try {
      const response = await internshipAPI.enrollInternship(internshipId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to enroll');
    }
  }
);

export const fetchMyEnrollments = createAsyncThunk(
  'internships/fetchMyEnrollments',
  async (_, { rejectWithValue }) => {
    try {
      const response = await internshipAPI.getMyEnrollments();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch enrollments');
    }
  }
);

export const createInternship = createAsyncThunk(
  'internships/createInternship',
  async (internshipData, { rejectWithValue }) => {
    try {
      const response = await internshipAPI.createInternship(internshipData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create internship');
    }
  }
);

export const updateInternship = createAsyncThunk(
  'internships/updateInternship',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await internshipAPI.updateInternship(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update internship');
    }
  }
);

export const deleteInternship = createAsyncThunk(
  'internships/deleteInternship',
  async (id, { rejectWithValue }) => {
    try {
      await internshipAPI.deleteInternship(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete internship');
    }
  }
);

const initialState = {
  internships: [],
  currentInternship: null,
  myEnrollments: [],
  loading: false,
  error: null,
  filters: {
    search: '',
    category: '',
    difficulty: '',
    priceRange: ''
  },
  pagination: {
    currentPage: 1,
    totalPages: 1,
    total: 0,
    limit: 10
  }
};

const internshipSlice = createSlice({
  name: 'internships',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    setCurrentPage: (state, action) => {
      state.pagination.currentPage = action.payload;
    },
    clearCurrentInternship: (state) => {
      state.currentInternship = null;
    },
    updateEnrollmentProgress: (state, action) => {
      const { enrollmentId, progressData } = action.payload;
      const enrollment = state.myEnrollments.find(e => e.id === enrollmentId);
      if (enrollment) {
        Object.assign(enrollment, progressData);
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Internships
      .addCase(fetchInternships.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInternships.fulfilled, (state, action) => {
        state.loading = false;
        state.internships = action.payload.internships || [];
        state.pagination = {
          currentPage: action.payload.currentPage || 1,
          totalPages: action.payload.totalPages || 1,
          total: action.payload.total || 0,
          limit: action.payload.limit || 10
        };
      })
      .addCase(fetchInternships.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Internship by ID
      .addCase(fetchInternshipById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInternshipById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentInternship = action.payload;
      })
      .addCase(fetchInternshipById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Enroll in Internship
      .addCase(enrollInInternship.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(enrollInInternship.fulfilled, (state, action) => {
        state.loading = false;
        state.myEnrollments.push(action.payload);
      })
      .addCase(enrollInInternship.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch My Enrollments
      .addCase(fetchMyEnrollments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyEnrollments.fulfilled, (state, action) => {
        state.loading = false;
        state.myEnrollments = action.payload || [];
      })
      .addCase(fetchMyEnrollments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Create Internship
      .addCase(createInternship.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createInternship.fulfilled, (state, action) => {
        state.loading = false;
        state.internships.unshift(action.payload);
      })
      .addCase(createInternship.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update Internship
      .addCase(updateInternship.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateInternship.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.internships.findIndex(i => i.id === action.payload.id);
        if (index !== -1) {
          state.internships[index] = action.payload;
        }
        if (state.currentInternship?.id === action.payload.id) {
          state.currentInternship = action.payload;
        }
      })
      .addCase(updateInternship.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Delete Internship
      .addCase(deleteInternship.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteInternship.fulfilled, (state, action) => {
        state.loading = false;
        state.internships = state.internships.filter(i => i.id !== action.payload);
        if (state.currentInternship?.id === action.payload) {
          state.currentInternship = null;
        }
      })
      .addCase(deleteInternship.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  setFilters,
  clearFilters,
  setCurrentPage,
  clearCurrentInternship,
  updateEnrollmentProgress
} = internshipSlice.actions;

export default internshipSlice.reducer;
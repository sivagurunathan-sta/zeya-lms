// src/store/slices/taskSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as taskAPI from '../../services/taskAPI';

// Async thunks
export const fetchTasksForEnrollment = createAsyncThunk(
  'tasks/fetchTasksForEnrollment',
  async (enrollmentId, { rejectWithValue }) => {
    try {
      const response = await taskAPI.getTasksForEnrollment(enrollmentId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch tasks');
    }
  }
);

export const submitTask = createAsyncThunk(
  'tasks/submitTask',
  async ({ taskId, data }, { rejectWithValue }) => {
    try {
      const response = await taskAPI.submitTask(taskId, data);
      return { taskId, submission: response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to submit task');
    }
  }
);

export const fetchPendingSubmissions = createAsyncThunk(
  'tasks/fetchPendingSubmissions',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await taskAPI.getPendingSubmissions(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch submissions');
    }
  }
);

export const reviewSubmission = createAsyncThunk(
  'tasks/reviewSubmission',
  async ({ submissionId, data }, { rejectWithValue }) => {
    try {
      const response = await taskAPI.reviewSubmission(submissionId, data);
      return { submissionId, review: response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to review submission');
    }
  }
);

const initialState = {
  tasks: [],
  currentEnrollmentTasks: null,
  submissions: [],
  pendingSubmissions: [],
  loading: false,
  submitLoading: false,
  reviewLoading: false,
  error: null,
  filters: {
    status: 'all',
    search: ''
  },
  pagination: {
    currentPage: 1,
    totalPages: 1,
    total: 0,
    limit: 20
  }
};

const taskSlice = createSlice({
  name: 'tasks',
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
    updateTaskStatus: (state, action) => {
      const { taskId, status, submission } = action.payload;
      
      // Update in current enrollment tasks
      if (state.currentEnrollmentTasks?.tasks) {
        const task = state.currentEnrollmentTasks.tasks.find(t => t.id === taskId);
        if (task) {
          task.isCompleted = status === 'completed';
          if (submission) {
            task.submission = submission;
          }
        }
      }

      // Update in general tasks array
      const taskIndex = state.tasks.findIndex(t => t.id === taskId);
      if (taskIndex !== -1) {
        state.tasks[taskIndex].isCompleted = status === 'completed';
        if (submission) {
          state.tasks[taskIndex].submission = submission;
        }
      }
    },
    unlockNextTask: (state, action) => {
      const { currentTaskOrder } = action.payload;
      
      if (state.currentEnrollmentTasks?.tasks) {
        const nextTask = state.currentEnrollmentTasks.tasks.find(
          t => t.taskOrder === currentTaskOrder + 1
        );
        if (nextTask) {
          nextTask.isUnlocked = true;
        }
      }
    },
    addSubmission: (state, action) => {
      state.submissions.unshift(action.payload);
    },
    updateSubmissionReview: (state, action) => {
      const { submissionId, review } = action.payload;
      
      // Update in pending submissions
      const pendingIndex = state.pendingSubmissions.findIndex(s => s.id === submissionId);
      if (pendingIndex !== -1) {
        Object.assign(state.pendingSubmissions[pendingIndex], review);
      }

      // Update in general submissions
      const submissionIndex = state.submissions.findIndex(s => s.id === submissionId);
      if (submissionIndex !== -1) {
        Object.assign(state.submissions[submissionIndex], review);
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Tasks for Enrollment
      .addCase(fetchTasksForEnrollment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasksForEnrollment.fulfilled, (state, action) => {
        state.loading = false;
        state.currentEnrollmentTasks = action.payload;
        state.tasks = action.payload.tasks || [];
      })
      .addCase(fetchTasksForEnrollment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Submit Task
      .addCase(submitTask.pending, (state) => {
        state.submitLoading = true;
        state.error = null;
      })
      .addCase(submitTask.fulfilled, (state, action) => {
        state.submitLoading = false;
        const { taskId, submission } = action.payload;
        
        // Update task with submission
        if (state.currentEnrollmentTasks?.tasks) {
          const task = state.currentEnrollmentTasks.tasks.find(t => t.id === taskId);
          if (task) {
            task.submission = submission;
            task.isCompleted = true;
            
            // Unlock next task
            const nextTask = state.currentEnrollmentTasks.tasks.find(
              t => t.taskOrder === task.taskOrder + 1
            );
            if (nextTask) {
              nextTask.isUnlocked = true;
            }
          }
        }

        // Add to submissions
        state.submissions.unshift(submission);
      })
      .addCase(submitTask.rejected, (state, action) => {
        state.submitLoading = false;
        state.error = action.payload;
      })

      // Fetch Pending Submissions
      .addCase(fetchPendingSubmissions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPendingSubmissions.fulfilled, (state, action) => {
        state.loading = false;
        state.pendingSubmissions = action.payload.submissions || [];
        state.pagination = {
          currentPage: action.payload.currentPage || 1,
          totalPages: action.payload.totalPages || 1,
          total: action.payload.total || 0,
          limit: action.payload.limit || 20
        };
      })
      .addCase(fetchPendingSubmissions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Review Submission
      .addCase(reviewSubmission.pending, (state) => {
        state.reviewLoading = true;
        state.error = null;
      })
      .addCase(reviewSubmission.fulfilled, (state, action) => {
        state.reviewLoading = false;
        const { submissionId, review } = action.payload;
        
        // Update submission with review
        const submissionIndex = state.pendingSubmissions.findIndex(s => s.id === submissionId);
        if (submissionIndex !== -1) {
          Object.assign(state.pendingSubmissions[submissionIndex], review);
        }
      })
      .addCase(reviewSubmission.rejected, (state, action) => {
        state.reviewLoading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  setFilters,
  clearFilters,
  setCurrentPage,
  updateTaskStatus,
  unlockNextTask,
  addSubmission,
  updateSubmissionReview
} = taskSlice.actions;

export default taskSlice.reducer;
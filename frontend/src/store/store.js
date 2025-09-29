// Enhanced Redux Store for Student LMS
// src/store/enhancedStore.js

import { configureStore } from '@reduxjs/toolkit';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { adminAPI, studentAPI, authAPI, commonAPI } from '../services/enhancedAPI';

// ==================== AUTH SLICE ====================

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials);
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('userData', JSON.stringify(response.user));
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authAPI.getCurrentUser();
      return response;
    } catch (error) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: localStorage.getItem('authToken'),
    isAuthenticated: false,
    loading: false,
    error: null
  },
  reducers: {
    logout: (state) => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateProfile: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem('userData', JSON.stringify(state.user));
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload;
      })
      .addCase(getCurrentUser.rejected, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      });
  }
});

// ==================== ADMIN SLICE ====================

export const fetchUsers = createAsyncThunk(
  'admin/fetchUsers',
  async (params, { rejectWithValue }) => {
    try {
      const response = await adminAPI.getUsers(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchCourses = createAsyncThunk(
  'admin/fetchCourses',
  async (params, { rejectWithValue }) => {
    try {
      const response = await adminAPI.getCourses(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchPendingSubmissions = createAsyncThunk(
  'admin/fetchPendingSubmissions',
  async (params, { rejectWithValue }) => {
    try {
      const response = await adminAPI.getPendingSubmissions(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchPayments = createAsyncThunk(
  'admin/fetchPayments',
  async (params, { rejectWithValue }) => {
    try {
      const response = await adminAPI.getPayments(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchCertificates = createAsyncThunk(
  'admin/fetchCertificates',
  async (params, { rejectWithValue }) => {
    try {
      const response = await adminAPI.getCertificates(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const adminSlice = createSlice({
  name: 'admin',
  initialState: {
    dashboard: {
      stats: {},
      recentActivities: [],
      loading: false
    },
    users: {
      list: [],
      selectedUser: null,
      loading: false,
      error: null,
      pagination: { page: 1, limit: 20, total: 0 },
      filters: { search: '', status: 'all', role: 'all' }
    },
    courses: {
      list: [],
      selectedCourse: null,
      loading: false,
      error: null,
      pagination: { page: 1, limit: 20, total: 0 },
      filters: { search: '', category: 'all', status: 'all' }
    },
    submissions: {
      pending: [],
      all: [],
      selectedSubmission: null,
      loading: false,
      error: null,
      pagination: { page: 1, limit: 20, total: 0 },
      filters: { status: 'pending', course: 'all' }
    },
    payments: {
      list: [],
      selectedPayment: null,
      loading: false,
      error: null,
      pagination: { page: 1, limit: 20, total: 0 },
      filters: { status: 'all', method: 'all' }
    },
    certificates: {
      list: [],
      selectedCertificate: null,
      loading: false,
      error: null,
      pagination: { page: 1, limit: 20, total: 0 },
      filters: { status: 'all', course: 'all' }
    }
  },
  reducers: {
    setUserFilters: (state, action) => {
      state.users.filters = { ...state.users.filters, ...action.payload };
      state.users.pagination.page = 1; // Reset to first page
    },
    setCourseFilters: (state, action) => {
      state.courses.filters = { ...state.courses.filters, ...action.payload };
      state.courses.pagination.page = 1;
    },
    setSubmissionFilters: (state, action) => {
      state.submissions.filters = { ...state.submissions.filters, ...action.payload };
      state.submissions.pagination.page = 1;
    },
    setPaymentFilters: (state, action) => {
      state.payments.filters = { ...state.payments.filters, ...action.payload };
      state.payments.pagination.page = 1;
    },
    updateUserStatus: (state, action) => {
      const { userId, status } = action.payload;
      const user = state.users.list.find(u => u.id === userId);
      if (user) user.status = status;
    },
    updateSubmissionStatus: (state, action) => {
      const { submissionId, status, feedback, grade } = action.payload;
      const submission = state.submissions.pending.find(s => s.id === submissionId);
      if (submission) {
        submission.status = status;
        submission.feedback = feedback;
        submission.grade = grade;
      }
    },
    updatePaymentStatus: (state, action) => {
      const { paymentId, status, verifiedAt } = action.payload;
      const payment = state.payments.list.find(p => p.id === paymentId);
      if (payment) {
        payment.status = status;
        payment.verifiedAt = verifiedAt;
      }
    },
    clearErrors: (state) => {
      state.users.error = null;
      state.courses.error = null;
      state.submissions.error = null;
      state.payments.error = null;
      state.certificates.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Users
      .addCase(fetchUsers.pending, (state) => {
        state.users.loading = true;
        state.users.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.users.loading = false;
        state.users.list = action.payload.users || [];
        state.users.pagination = action.payload.pagination || state.users.pagination;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.users.loading = false;
        state.users.error = action.payload;
      })
      // Courses
      .addCase(fetchCourses.pending, (state) => {
        state.courses.loading = true;
        state.courses.error = null;
      })
      .addCase(fetchCourses.fulfilled, (state, action) => {
        state.courses.loading = false;
        state.courses.list = action.payload.courses || [];
        state.courses.pagination = action.payload.pagination || state.courses.pagination;
      })
      .addCase(fetchCourses.rejected, (state, action) => {
        state.courses.loading = false;
        state.courses.error = action.payload;
      })
      // Submissions
      .addCase(fetchPendingSubmissions.pending, (state) => {
        state.submissions.loading = true;
        state.submissions.error = null;
      })
      .addCase(fetchPendingSubmissions.fulfilled, (state, action) => {
        state.submissions.loading = false;
        state.submissions.pending = action.payload.submissions || [];
        state.submissions.pagination = action.payload.pagination || state.submissions.pagination;
      })
      .addCase(fetchPendingSubmissions.rejected, (state, action) => {
        state.submissions.loading = false;
        state.submissions.error = action.payload;
      })
      // Payments
      .addCase(fetchPayments.pending, (state) => {
        state.payments.loading = true;
        state.payments.error = null;
      })
      .addCase(fetchPayments.fulfilled, (state, action) => {
        state.payments.loading = false;
        state.payments.list = action.payload.payments || [];
        state.payments.pagination = action.payload.pagination || state.payments.pagination;
      })
      .addCase(fetchPayments.rejected, (state, action) => {
        state.payments.loading = false;
        state.payments.error = action.payload;
      })
      // Certificates
      .addCase(fetchCertificates.pending, (state) => {
        state.certificates.loading = true;
        state.certificates.error = null;
      })
      .addCase(fetchCertificates.fulfilled, (state, action) => {
        state.certificates.loading = false;
        state.certificates.list = action.payload.certificates || [];
        state.certificates.pagination = action.payload.pagination || state.certificates.pagination;
      })
      .addCase(fetchCertificates.rejected, (state, action) => {
        state.certificates.loading = false;
        state.certificates.error = action.payload;
      });
  }
});

// ==================== STUDENT SLICE ====================

export const fetchStudentDashboard = createAsyncThunk(
  'student/fetchDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const response = await studentAPI.getDashboard();
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchEnrollments = createAsyncThunk(
  'student/fetchEnrollments',
  async (_, { rejectWithValue }) => {
    try {
      const response = await studentAPI.getMyEnrollments();
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchEnrollmentTasks = createAsyncThunk(
  'student/fetchEnrollmentTasks',
  async (enrollmentId, { rejectWithValue }) => {
    try {
      const response = await studentAPI.getEnrollmentTasks(enrollmentId);
      return { enrollmentId, ...response };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const submitTask = createAsyncThunk(
  'student/submitTask',
  async ({ taskId, submission }, { rejectWithValue }) => {
    try {
      const response = await studentAPI.submitTask(taskId, submission);
      return { taskId, submission: response };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchPaymentHistory = createAsyncThunk(
  'student/fetchPaymentHistory',
  async (_, { rejectWithValue }) => {
    try {
      const response = await studentAPI.getPaymentHistory();
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchMyCertificates = createAsyncThunk(
  'student/fetchMyCertificates',
  async (_, { rejectWithValue }) => {
    try {
      const response = await studentAPI.getMyCertificates();
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const studentSlice = createSlice({
  name: 'student',
  initialState: {
    dashboard: {
      stats: {},
      recentActivities: [],
      nextDeadlines: [],
      loading: false,
      error: null
    },
    enrollments: {
      list: [],
      selectedEnrollment: null,
      loading: false,
      error: null
    },
    tasks: {
      byEnrollment: {}, // { enrollmentId: { tasks: [], loading: false } }
      submissions: [],
      selectedTask: null,
      submitting: false,
      error: null
    },
    payments: {
      history: [],
      pending: [],
      selectedPayment: null,
      loading: false,
      error: null
    },
    certificates: {
      earned: [],
      eligible: [],
      loading: false,
      error: null
    },
    progress: {
      overall: { completionRate: 0, totalTasks: 0, completedTasks: 0 },
      byEnrollment: {},
      achievements: [],
      loading: false
    }
  },
  reducers: {
    setSelectedEnrollment: (state, action) => {
      state.enrollments.selectedEnrollment = action.payload;
    },
    setSelectedTask: (state, action) => {
      state.tasks.selectedTask = action.payload;
    },
    updateTaskProgress: (state, action) => {
      const { enrollmentId, taskId, progress } = action.payload;
      if (state.tasks.byEnrollment[enrollmentId]) {
        const task = state.tasks.byEnrollment[enrollmentId].tasks.find(t => t.id === taskId);
        if (task) {
          Object.assign(task, progress);
        }
      }
    },
    unlockNextTask: (state, action) => {
      const { enrollmentId, currentTaskOrder } = action.payload;
      if (state.tasks.byEnrollment[enrollmentId]) {
        const nextTask = state.tasks.byEnrollment[enrollmentId].tasks.find(
          t => t.taskOrder === currentTaskOrder + 1
        );
        if (nextTask) {
          nextTask.isUnlocked = true;
        }
      }
    },
    addPayment: (state, action) => {
      state.payments.history.unshift(action.payload);
    },
    updatePaymentStatus: (state, action) => {
      const { paymentId, status } = action.payload;
      const payment = state.payments.history.find(p => p.id === paymentId);
      if (payment) payment.status = status;
    },
    addCertificate: (state, action) => {
      state.certificates.earned.push(action.payload);
    },
    clearErrors: (state) => {
      state.dashboard.error = null;
      state.enrollments.error = null;
      state.tasks.error = null;
      state.payments.error = null;
      state.certificates.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Dashboard
      .addCase(fetchStudentDashboard.pending, (state) => {
        state.dashboard.loading = true;
        state.dashboard.error = null;
      })
      .addCase(fetchStudentDashboard.fulfilled, (state, action) => {
        state.dashboard.loading = false;
        state.dashboard.stats = action.payload.stats || {};
        state.dashboard.recentActivities = action.payload.recentActivities || [];
        state.dashboard.nextDeadlines = action.payload.nextDeadlines || [];
      })
      .addCase(fetchStudentDashboard.rejected, (state, action) => {
        state.dashboard.loading = false;
        state.dashboard.error = action.payload;
      })
      // Enrollments
      .addCase(fetchEnrollments.pending, (state) => {
        state.enrollments.loading = true;
        state.enrollments.error = null;
      })
      .addCase(fetchEnrollments.fulfilled, (state, action) => {
        state.enrollments.loading = false;
        state.enrollments.list = action.payload.enrollments || [];
      })
      .addCase(fetchEnrollments.rejected, (state, action) => {
        state.enrollments.loading = false;
        state.enrollments.error = action.payload;
      })
      // Tasks
      .addCase(fetchEnrollmentTasks.pending, (state, action) => {
        const enrollmentId = action.meta.arg;
        if (!state.tasks.byEnrollment[enrollmentId]) {
          state.tasks.byEnrollment[enrollmentId] = { tasks: [], loading: true };
        } else {
          state.tasks.byEnrollment[enrollmentId].loading = true;
        }
        state.tasks.error = null;
      })
      .addCase(fetchEnrollmentTasks.fulfilled, (state, action) => {
        const { enrollmentId, tasks } = action.payload;
        state.tasks.byEnrollment[enrollmentId] = {
          tasks: tasks || [],
          loading: false
        };
      })
      .addCase(fetchEnrollmentTasks.rejected, (state, action) => {
        const enrollmentId = action.meta.arg;
        if (state.tasks.byEnrollment[enrollmentId]) {
          state.tasks.byEnrollment[enrollmentId].loading = false;
        }
        state.tasks.error = action.payload;
      })
      // Submit Task
      .addCase(submitTask.pending, (state) => {
        state.tasks.submitting = true;
        state.tasks.error = null;
      })
      .addCase(submitTask.fulfilled, (state, action) => {
        state.tasks.submitting = false;
        const { taskId, submission } = action.payload;
        
        // Update task across all enrollments
        Object.values(state.tasks.byEnrollment).forEach(enrollment => {
          const task = enrollment.tasks.find(t => t.id === taskId);
          if (task) {
            task.submission = submission;
            task.isCompleted = true;
            task.canSubmit = false;
          }
        });
        
        state.tasks.submissions.unshift(submission);
      })
      .addCase(submitTask.rejected, (state, action) => {
        state.tasks.submitting = false;
        state.tasks.error = action.payload;
      })
      // Payment History
      .addCase(fetchPaymentHistory.pending, (state) => {
        state.payments.loading = true;
        state.payments.error = null;
      })
      .addCase(fetchPaymentHistory.fulfilled, (state, action) => {
        state.payments.loading = false;
        state.payments.history = action.payload.payments || [];
        state.payments.pending = action.payload.pending || [];
      })
      .addCase(fetchPaymentHistory.rejected, (state, action) => {
        state.payments.loading = false;
        state.payments.error = action.payload;
      })
      // Certificates
      .addCase(fetchMyCertificates.pending, (state) => {
        state.certificates.loading = true;
        state.certificates.error = null;
      })
      .addCase(fetchMyCertificates.fulfilled, (state, action) => {
        state.certificates.loading = false;
        state.certificates.earned = action.payload.certificates || [];
        state.certificates.eligible = action.payload.eligible || [];
      })
      .addCase(fetchMyCertificates.rejected, (state, action) => {
        state.certificates.loading = false;
        state.certificates.error = action.payload;
      });
  }
});

// ==================== NOTIFICATIONS SLICE ====================

export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await studentAPI.getNotifications();
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    list: [],
    unreadCount: 0,
    loading: false,
    error: null
  },
  reducers: {
    addNotification: (state, action) => {
      state.list.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount += 1;
      }
    },
    markAsRead: (state, action) => {
      const notification = state.list.find(n => n.id === action.payload);
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllAsRead: (state) => {
      state.list.forEach(notification => {
        notification.read = true;
      });
      state.unreadCount = 0;
    },
    removeNotification: (state, action) => {
      const index = state.list.findIndex(n => n.id === action.payload);
      if (index !== -1) {
        const notification = state.list[index];
        if (!notification.read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.list.splice(index, 1);
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.notifications || [];
        state.unreadCount = action.payload.unreadCount || 0;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

// ==================== UI SLICE ====================

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: false,
    theme: localStorage.getItem('theme') || 'light',
    activeModal: null,
    loading: {
      global: false,
      operations: {} // { operationId: boolean }
    },
    toast: {
      messages: [],
      nextId: 1
    }
  },
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
    },
    openModal: (state, action) => {
      state.activeModal = action.payload;
    },
    closeModal: (state) => {
      state.activeModal = null;
    },
    setGlobalLoading: (state, action) => {
      state.loading.global = action.payload;
    },
    setOperationLoading: (state, action) => {
      const { operationId, loading } = action.payload;
      state.loading.operations[operationId] = loading;
    },
    showToast: (state, action) => {
      const { message, type = 'info', duration = 4000 } = action.payload;
      state.toast.messages.push({
        id: state.toast.nextId++,
        message,
        type,
        duration,
        timestamp: Date.now()
      });
    },
    removeToast: (state, action) => {
      state.toast.messages = state.toast.messages.filter(
        toast => toast.id !== action.payload
      );
    }
  }
});

// ==================== CHAT SLICE ====================

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    conversations: [],
    activeConversation: null,
    messages: {},
    typing: {},
    online: {},
    loading: false,
    error: null
  },
  reducers: {
    setActiveConversation: (state, action) => {
      state.activeConversation = action.payload;
    },
    addMessage: (state, action) => {
      const { conversationId, message } = action.payload;
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      state.messages[conversationId].push(message);
    },
    markMessagesAsRead: (state, action) => {
      const { conversationId, messageIds } = action.payload;
      if (state.messages[conversationId]) {
        state.messages[conversationId].forEach(message => {
          if (messageIds.includes(message.id)) {
            message.read = true;
          }
        });
      }
    },
    setTyping: (state, action) => {
      const { conversationId, userId, isTyping } = action.payload;
      if (!state.typing[conversationId]) {
        state.typing[conversationId] = {};
      }
      state.typing[conversationId][userId] = isTyping;
    },
    setUserOnline: (state, action) => {
      const { userId, isOnline } = action.payload;
      state.online[userId] = isOnline;
    }
  }
});

// ==================== COMBINED STORE ====================

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    admin: adminSlice.reducer,
    student: studentSlice.reducer,
    notifications: notificationsSlice.reducer,
    ui: uiSlice.reducer,
    chat: chatSlice.reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE']
      }
    }),
  devTools: process.env.NODE_ENV !== 'production'
});

// ==================== ACTION EXPORTS ====================

// Auth actions
export const { logout, clearError: clearAuthError, updateProfile } = authSlice.actions;

// Admin actions
export const {
  setUserFilters,
  setCourseFilters,
  setSubmissionFilters,
  setPaymentFilters,
  updateUserStatus,
  updateSubmissionStatus,
  updatePaymentStatus,
  clearErrors: clearAdminErrors
} = adminSlice.actions;

// Student actions
export const {
  setSelectedEnrollment,
  setSelectedTask,
  updateTaskProgress,
  unlockNextTask,
  addPayment,
  updatePaymentStatus: updateStudentPaymentStatus,
  addCertificate,
  clearErrors: clearStudentErrors
} = studentSlice.actions;

// Notification actions
export const {
  addNotification,
  markAsRead,
  markAllAsRead,
  removeNotification
} = notificationsSlice.actions;

// UI actions
export const {
  toggleSidebar,
  setSidebarOpen,
  setTheme,
  openModal,
  closeModal,
  setGlobalLoading,
  setOperationLoading,
  showToast,
  removeToast
} = uiSlice.actions;

// Chat actions
export const {
  setActiveConversation,
  addMessage,
  markMessagesAsRead,
  setTyping,
  setUserOnline
} = chatSlice.actions;

// ==================== SELECTORS ====================

// Auth selectors
export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectIsAdmin = (state) => state.auth.user?.role === 'admin';

// Admin selectors
export const selectAdminUsers = (state) => state.admin.users;
export const selectAdminCourses = (state) => state.admin.courses;
export const selectPendingSubmissions = (state) => state.admin.submissions.pending;
export const selectAdminPayments = (state) => state.admin.payments;
export const selectAdminCertificates = (state) => state.admin.certificates;

// Student selectors
export const selectStudentDashboard = (state) => state.student.dashboard;
export const selectEnrollments = (state) => state.student.enrollments;
export const selectTasksByEnrollment = (enrollmentId) => (state) => 
  state.student.tasks.byEnrollment[enrollmentId]?.tasks || [];
export const selectStudentPayments = (state) => state.student.payments;
export const selectStudentCertificates = (state) => state.student.certificates;

// UI selectors
export const selectSidebarOpen = (state) => state.ui.sidebarOpen;
export const selectTheme = (state) => state.ui.theme;
export const selectActiveModal = (state) => state.ui.activeModal;
export const selectGlobalLoading = (state) => state.ui.loading.global;
export const selectOperationLoading = (operationId) => (state) => 
  state.ui.loading.operations[operationId] || false;
export const selectToastMessages = (state) => state.ui.toast.messages;

// Notification selectors
export const selectNotifications = (state) => state.notifications.list;
export const selectUnreadCount = (state) => state.notifications.unreadCount;

// Chat selectors
export const selectChatConversations = (state) => state.chat.conversations;
export const selectActiveConversation = (state) => state.chat.activeConversation;
export const selectChatMessages = (conversationId) => (state) => 
  state.chat.messages[conversationId] || [];

export default store;
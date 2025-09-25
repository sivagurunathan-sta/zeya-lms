// src/store/slices/notificationSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunks
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (params = {}, { rejectWithValue }) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockNotifications = [
        {
          id: '1',
          title: 'Task Reviewed',
          message: 'Your submission for "React Components" has been approved',
          type: 'success',
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 30),
          data: {
            taskId: 'task-1',
            submissionId: 'sub-1'
          }
        },
        {
          id: '2',
          title: 'Payment Successful',
          message: 'Payment of ₹499 completed successfully',
          type: 'info',
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
          data: {
            paymentId: 'pay-1',
            amount: 499
          }
        },
        {
          id: '3',
          title: 'Certificate Ready',
          message: 'Your certificate is ready for download',
          type: 'success',
          read: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
          data: {
            certificateId: 'cert-1'
          }
        }
      ];

      return {
        notifications: mockNotifications,
        unreadCount: mockNotifications.filter(n => !n.read).length,
        total: mockNotifications.length
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch notifications');
    }
  }
);

export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationId, { rejectWithValue }) => {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 200));
      return notificationId;
    } catch (error) {
      return rejectWithValue('Failed to mark notification as read');
    }
  }
);

export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (_, { rejectWithValue }) => {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 300));
      return true;
    } catch (error) {
      return rejectWithValue('Failed to mark all notifications as read');
    }
  }
);

export const deleteNotification = createAsyncThunk(
  'notifications/deleteNotification',
  async (notificationId, { rejectWithValue }) => {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 200));
      return notificationId;
    } catch (error) {
      return rejectWithValue('Failed to delete notification');
    }
  }
);

export const createNotification = createAsyncThunk(
  'notifications/createNotification',
  async (notificationData, { rejectWithValue }) => {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 200));
      return {
        id: Date.now().toString(),
        ...notificationData,
        read: false,
        createdAt: new Date()
      };
    } catch (error) {
      return rejectWithValue('Failed to create notification');
    }
  }
);

const initialState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  filters: {
    type: 'all',
    read: 'all'
  }
};

const notificationSlice = createSlice({
  name: 'notifications',
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
    addNotification: (state, action) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount += 1;
      }
    },
    removeNotification: (state, action) => {
      const notificationId = action.payload;
      const notification = state.notifications.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        state.unreadCount -= 1;
      }
      state.notifications = state.notifications.filter(n => n.id !== notificationId);
    },
    markNotificationAsRead: (state, action) => {
      const notificationId = action.payload;
      const notification = state.notifications.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllNotificationsAsRead: (state) => {
      state.notifications.forEach(notification => {
        notification.read = true;
      });
      state.unreadCount = 0;
    },
    updateUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload.notifications;
        state.unreadCount = action.payload.unreadCount;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Mark as Read
      .addCase(markAsRead.pending, (state) => {
        state.error = null;
      })
      .addCase(markAsRead.fulfilled, (state, action) => {
        const notificationId = action.payload;
        const notification = state.notifications.find(n => n.id === notificationId);
        if (notification && !notification.read) {
          notification.read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAsRead.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Mark All as Read
      .addCase(markAllAsRead.pending, (state) => {
        state.error = null;
      })
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.notifications.forEach(notification => {
          notification.read = true;
        });
        state.unreadCount = 0;
      })
      .addCase(markAllAsRead.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Delete Notification
      .addCase(deleteNotification.pending, (state) => {
        state.error = null;
      })
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const notificationId = action.payload;
        const notification = state.notifications.find(n => n.id === notificationId);
        if (notification && !notification.read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.notifications = state.notifications.filter(n => n.id !== notificationId);
      })
      .addCase(deleteNotification.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Create Notification
      .addCase(createNotification.pending, (state) => {
        state.error = null;
      })
      .addCase(createNotification.fulfilled, (state, action) => {
        state.notifications.unshift(action.payload);
        if (!action.payload.read) {
          state.unreadCount += 1;
        }
      })
      .addCase(createNotification.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  setFilters,
  clearFilters,
  addNotification,
  removeNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  updateUnreadCount
} = notificationSlice.actions;

export default notificationSlice.reducer;
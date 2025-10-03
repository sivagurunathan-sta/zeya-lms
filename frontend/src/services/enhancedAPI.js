// Enhanced API Services for Student LMS
// src/services/enhancedAPI.js

import api from './api';

// ==================== ADMIN SERVICES ====================

export const adminAPI = {
  // Dashboard & Analytics
  getDashboard: (period) => api.get('/admin/dashboard', { params: { period } }),
  getAnalytics: (params = {}) => api.get('/admin/analytics', { params }),
  
  // User Management
  getUsers: (params = {}) => api.get('/admin/users', { params }),
  getUserById: (userId) => api.get(`/admin/users/${userId}`),
  createUser: (userData) => api.post('/admin/users', userData),
  updateUser: (userId, data) => api.put(`/admin/users/${userId}`, data),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  updateUserStatus: (userId, status) => api.put(`/admin/users/${userId}/status`, { status }),
  suspendUser: (userId, reason) => api.put(`/admin/users/${userId}/suspend`, { reason }),
  activateUser: (userId) => api.put(`/admin/users/${userId}/activate`),
  
  // Course/Internship Management
  getCourses: (params = {}) => api.get('/admin/courses', { params }),
  getCourseById: (courseId) => api.get(`/admin/courses/${courseId}`),
  createCourse: (courseData) => api.post('/admin/courses', courseData, true), // FormData
  updateCourse: (courseId, data) => api.put(`/admin/courses/${courseId}`, data),
  deleteCourse: (courseId) => api.delete(`/admin/courses/${courseId}`),
  publishCourse: (courseId) => api.put(`/admin/courses/${courseId}/publish`),
  unpublishCourse: (courseId) => api.put(`/admin/courses/${courseId}/unpublish`),
  
  // Task Management
  getCourseTasks: (courseId) => api.get(`/admin/courses/${courseId}/tasks`),
  createTask: (courseId, taskData) => api.post(`/admin/courses/${courseId}/tasks`, taskData),
  updateTask: (taskId, data) => api.put(`/admin/tasks/${taskId}`, data),
  deleteTask: (taskId) => api.delete(`/admin/tasks/${taskId}`),
  reorderTasks: (courseId, taskOrders) => api.put(`/admin/courses/${courseId}/tasks/reorder`, { taskOrders }),
  
  // Submission Reviews
  getPendingSubmissions: (params = {}) => api.get('/admin/submissions/pending', { params }),
  getAllSubmissions: (params = {}) => api.get('/admin/submissions', { params }),
  getSubmissionById: (submissionId) => api.get(`/admin/submissions/${submissionId}`),
  reviewSubmission: (submissionId, review) => api.put(`/admin/submissions/${submissionId}/review`, review),
  bulkReviewSubmissions: (reviews) => api.post('/admin/submissions/bulk-review', { reviews }),
  
  // Payment Management
  getPayments: (params = {}) => api.get('/admin/payments', { params }),
  verifyPayment: (paymentId, status, notes) => api.put(`/admin/payments/${paymentId}/verify`, { status, notes }),
  getPaymentProof: (paymentId) => api.get(`/admin/payments/${paymentId}/proof`),
  bulkVerifyPayments: (paymentIds, status) => api.post('/admin/payments/bulk-verify', { paymentIds, status }),
  
  // Certificate Management
  getCertificates: (params = {}) => api.get('/admin/certificates', { params }),
  issueCertificate: (enrollmentId, certificateData) => api.post('/admin/certificates/issue', { enrollmentId, ...certificateData }),
  revokeCertificate: (certificateId, reason) => api.put(`/admin/certificates/${certificateId}/revoke`, { reason }),
  getCertificateTemplate: () => api.get('/admin/certificates/template'),
  updateCertificateTemplate: (templateData) => api.put('/admin/certificates/template', templateData),
  
  // Chat & Communication
  getChats: (params = {}) => api.get('/admin/chats', { params }),
  getChatMessages: (chatId) => api.get(`/admin/chats/${chatId}/messages`),
  sendMessage: (chatId, message) => api.post(`/admin/chats/${chatId}/messages`, { message }),
  createChat: (userId, message) => api.post('/admin/chats', { userId, message }),
  
  // Reports & Analytics
  getUserReport: (userId) => api.get(`/admin/reports/user/${userId}`),
  getCourseReport: (courseId) => api.get(`/admin/reports/course/${courseId}`),
  getRevenueReport: (params = {}) => api.get('/admin/reports/revenue', { params }),
  getProgressReport: (params = {}) => api.get('/admin/reports/progress', { params }),
  exportReport: (reportType, params = {}) => api.get(`/admin/reports/export/${reportType}`, { params }),
  
  // System Settings
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (settings) => api.put('/admin/settings', settings),
  getSystemStats: () => api.get('/admin/system/stats'),
  backupData: () => api.post('/admin/system/backup'),
  
  // File Management
  uploadFile: (file, type, entityId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    formData.append('entityId', entityId);
    return api.post('/admin/files/upload', formData, true);
  },
  deleteFile: (fileId) => api.delete(`/admin/files/${fileId}`),
  getFiles: (entityType, entityId) => api.get(`/admin/files/${entityType}/${entityId}`)
};

// ==================== STUDENT SERVICES ====================

export const studentAPI = {
  // Profile & Dashboard
  getProfile: () => api.get('/student/profile'),
  updateProfile: (profileData) => api.put('/student/profile', profileData),
  getDashboard: () => api.get('/student/dashboard'),
  
  // Course Enrollment
  getAvailableCourses: (params = {}) => api.get('/student/courses/available', { params }),
  getCourseDetails: (courseId) => api.get(`/student/courses/${courseId}`),
  enrollInCourse: (courseId) => api.post(`/student/courses/${courseId}/enroll`),
  getMyEnrollments: () => api.get('/student/enrollments'),
  getEnrollmentDetails: (enrollmentId) => api.get(`/student/enrollments/${enrollmentId}`),
  
  // Tasks & Submissions
  getEnrollmentTasks: (enrollmentId) => api.get(`/student/enrollments/${enrollmentId}/tasks`),
  getTaskDetails: (taskId) => api.get(`/student/tasks/${taskId}`),
  submitTask: (taskId, submission) => {
    const formData = new FormData();
    formData.append('taskId', taskId);
    
    if (submission.submissionType === 'link') {
      formData.append('githubLink', submission.githubLink);
    } else if (submission.files) {
      submission.files.forEach(file => formData.append('files', file));
    }
    
    formData.append('notes', submission.notes || '');
    formData.append('submissionType', submission.submissionType);
    
    return api.post(`/student/tasks/${taskId}/submit`, formData, true);
  },
  getSubmissionStatus: (submissionId) => api.get(`/student/submissions/${submissionId}`),
  getMySubmissions: (params = {}) => api.get('/student/submissions', { params }),
  
  // Payments
  getPaymentHistory: () => api.get('/student/payments'),
  getPendingPayments: () => api.get('/student/payments/pending'),
  submitPaymentProof: (paymentData) => {
    const formData = new FormData();
    formData.append('enrollmentId', paymentData.enrollmentId);
    formData.append('transactionId', paymentData.transactionId);
    formData.append('paymentMethod', paymentData.paymentMethod);
    if (paymentData.proof) {
      formData.append('proof', paymentData.proof);
    }
    return api.post('/student/payments/submit-proof', formData, true);
  },
  createPaymentOrder: (enrollmentId, amount) => api.post('/student/payments/create-order', { enrollmentId, amount }),
  verifyPayment: (paymentData) => api.post('/student/payments/verify', paymentData),
  
  // Certificates
  getMyCertificates: () => api.get('/student/certificates'),
  getEligibleCertificates: () => api.get('/student/certificates/eligible'),
  purchaseCertificate: (enrollmentId) => api.post(`/student/certificates/${enrollmentId}/purchase`),
  downloadCertificate: (certificateId) => api.get(`/student/certificates/${certificateId}/download`),
  verifyCertificate: (verificationCode) => api.get(`/student/certificates/verify/${verificationCode}`),
  
  // Progress Tracking
  getProgress: (enrollmentId) => api.get(`/student/enrollments/${enrollmentId}/progress`),
  getOverallProgress: () => api.get('/student/progress/overall'),
  getAchievements: () => api.get('/student/achievements'),
  
  // Chat & Support
  getChats: () => api.get('/student/chats'),
  getChatMessages: (chatId) => api.get(`/student/chats/${chatId}/messages`),
  sendMessage: (chatId, message) => api.post(`/student/chats/${chatId}/messages`, { message }),
  createSupportTicket: (subject, message, priority = 'MEDIUM') => 
    api.post('/student/support/tickets', { subject, message, priority }),
  
  // Notifications
  getNotifications: () => api.get('/student/notifications'),
  markNotificationRead: (notificationId) => api.put(`/student/notifications/${notificationId}/read`),
  markAllNotificationsRead: () => api.put('/student/notifications/mark-all-read'),
  
  // Resources & Materials
  getCourseResources: (courseId) => api.get(`/student/courses/${courseId}/resources`),
  downloadResource: (resourceId) => api.get(`/student/resources/${resourceId}/download`),
  getTaskResources: (taskId) => api.get(`/student/tasks/${taskId}/resources`)
};

// ==================== AUTHENTICATION SERVICES ====================

export const authAPI = {
  // Login via unified endpoint
  login: (credentials) => {
    const payload = {
      userId: credentials.userId || credentials.userIdOrEmail || credentials.email,
      password: credentials.password
    };
    return api.post('/auth/login', payload);
  },
  // Role-specific (if ever needed)
  adminLogin: (credentials) => {
    const payload = { userId: credentials.userId, password: credentials.password };
    return api.post('/auth/admin/login', payload);
  },
  internLogin: (credentials) => {
    const payload = { userId: credentials.userId, password: credentials.password };
    return api.post('/auth/intern/login', payload);
  },

  // Registration
  register: (userData) => api.post('/auth/register', userData),

  // Password Management
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }),
  changePassword: (currentPassword, newPassword) =>
    api.put('/auth/change-password', { currentPassword, newPassword }),

  // Token Management
  refreshToken: () => api.post('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
  validateToken: () => api.get('/auth/validate'),

  // Profile
  getCurrentUser: () => api.get('/auth/me'),
  updateProfile: (profileData) => api.put('/auth/profile', profileData)
};

// ==================== COMMON SERVICES ====================

export const commonAPI = {
  // File Upload
  uploadFile: (file, category = 'general') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    return api.post('/common/upload', formData, true);
  },
  
  // Search
  globalSearch: (query, filters = {}) => api.get('/common/search', { params: { query, ...filters } }),
  
  // System Info
  getSystemInfo: () => api.get('/common/system-info'),
  getAppVersion: () => api.get('/common/version'),
  
  // Categories & Tags
  getCategories: () => api.get('/common/categories'),
  getTags: () => api.get('/common/tags'),
  
  // Feedback
  submitFeedback: (feedback) => api.post('/common/feedback', feedback),
  
  // Contact
  submitContactForm: (contactData) => api.post('/common/contact', contactData)
};

// ==================== WEBSOCKET SERVICES ====================

export class WebSocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.eventListeners = {};
  }

  connect(token) {
    const wsUrl = process.env.REACT_APP_SOCKET_URL || 'ws://localhost:5000';
    this.socket = new WebSocket(`${wsUrl}?token=${token}`);

    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connected');
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit(data.type, data.payload);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.socket.onclose = () => {
      console.log('WebSocket disconnected');
      this.emit('disconnected');
      this.attemptReconnect(token);
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };
  }

  attemptReconnect(token) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect(token);
      }, 1000 * this.reconnectAttempts);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  send(type, payload) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }));
    }
  }

  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  off(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => callback(data));
    }
  }

  // Specific methods for LMS features
  joinRoom(roomId) {
    this.send('join_room', { roomId });
  }

  leaveRoom(roomId) {
    this.send('leave_room', { roomId });
  }

  sendChatMessage(chatId, message) {
    this.send('chat_message', { chatId, message });
  }

  subscribeToNotifications() {
    this.send('subscribe_notifications', {});
  }

  subscribeToProgress(enrollmentId) {
    this.send('subscribe_progress', { enrollmentId });
  }
}

// ==================== ERROR HANDLING ====================

export class APIError extends Error {
  constructor(message, status, code, details = {}) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Enhanced error handler
export const handleAPIError = (error) => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    throw new APIError(
      data.message || 'An error occurred',
      status,
      data.code || 'UNKNOWN_ERROR',
      data.details || {}
    );
  } else if (error.request) {
    // Network error
    throw new APIError(
      'Network error. Please check your connection.',
      0,
      'NETWORK_ERROR'
    );
  } else {
    // Other error
    throw new APIError(
      error.message || 'An unexpected error occurred',
      0,
      'UNKNOWN_ERROR'
    );
  }
};

// ==================== UTILITY FUNCTIONS ====================

export const apiUtils = {
  // Build query string from object
  buildQueryString: (params) => {
    const query = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        query.append(key, params[key]);
      }
    });
    return query.toString();
  },

  // Format file size
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Validate file type
  validateFileType: (file, allowedTypes) => {
    return allowedTypes.includes(file.type) || 
           allowedTypes.some(type => file.name.toLowerCase().endsWith(type));
  },

  // Create download link
  createDownloadLink: (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // Debounce function for search
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Format date for API
  formatDateForAPI: (date) => {
    return date instanceof Date ? date.toISOString() : date;
  },

  // Parse API date
  parseAPIDate: (dateString) => {
    return dateString ? new Date(dateString) : null;
  }
};

// ==================== CACHE MANAGEMENT ====================

export class APICache {
  constructor(ttl = 5 * 60 * 1000) { // 5 minutes default TTL
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

// Create global cache instance
export const apiCache = new APICache();

// ==================== REQUEST INTERCEPTORS ====================

// Add caching to GET requests
const originalGet = api.get;
api.get = async (url, config = {}) => {
  const cacheKey = `${url}${config.params ? '?' + apiUtils.buildQueryString(config.params) : ''}`;
  
  // Check cache first (unless specifically disabled)
  if (!config.skipCache && apiCache.has(cacheKey)) {
    return Promise.resolve({ data: apiCache.get(cacheKey) });
  }

  try {
    const response = await originalGet(url, config);
    
    // Cache successful responses (unless specifically disabled)
    if (!config.skipCache && response.status === 200) {
      apiCache.set(cacheKey, response.data);
    }
    
    return response;
  } catch (error) {
    throw handleAPIError(error);
  }
};

// Add error handling to all requests
['post', 'put', 'delete'].forEach(method => {
  const originalMethod = api[method];
  api[method] = async (...args) => {
    try {
      return await originalMethod(...args);
    } catch (error) {
      throw handleAPIError(error);
    }
  };
});

// ==================== EXPORTS ====================

export default {
  admin: adminAPI,
  student: studentAPI,
  auth: authAPI,
  common: commonAPI,
  utils: apiUtils,
  cache: apiCache,
  WebSocketService,
  APIError,
  handleAPIError
};

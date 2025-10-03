import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30 seconds
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==========================================
// AUTHENTICATION APIs
// ==========================================
export const authAPI = {
  login: async (credentials) => {
    const identifier = (credentials.userId || credentials.userIdOrEmail || credentials.email || '').toString().trim();
    const payload = {
      userId: identifier,
      email: identifier,
      password: credentials.password
    };

    const response = await api.post('/auth/login', payload);
    const body = response?.data ?? {};
    const data = body?.data && (body.data.user || body.data.token) ? body.data : body;
    const token = data?.token;
    const user = data?.user;

    if (!token || !user) {
      const error = new Error(body?.message || 'Login failed. Please try again.');
      error.status = response?.status;
      error.code = 'INVALID_LOGIN_RESPONSE';
      throw error;
    }

    const normalizedUser = {
      ...user,
      role: typeof user.role === 'string' ? user.role.toUpperCase() : user.role
    };

    return {
      token,
      user: normalizedUser,
      message: body?.message || 'Login successful',
      data: body
    };
  },
  getProfile: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
  logout: () => api.post('/auth/logout')
};

// ==========================================
// ADMIN - USER MANAGEMENT APIs
// ==========================================
export const adminUserAPI = {
  // Get all users with filters and pagination
  getAllUsers: (params) => api.get('/admin/users', { params }),
  
  // Get single user complete profile
  getUserProfile: (userId) => api.get(`/admin/users/${userId}`),
  
  // Bulk add users
  bulkAddUsers: (data) => api.post('/admin/users/bulk-add', data),
  // Bulk generate users (count, prefix, role)
  bulkGenerateUsers: (data) => api.post('/admin/users/bulk-generate', data),
  
  // Update user details
  updateUser: (userId, data) => api.put(`/admin/users/${userId}`, data),
  
  // Revoke user access
  revokeAccess: (userId) => api.post(`/admin/users/${userId}/revoke`),
  
  // Restore user access
  restoreAccess: (userId) => api.post(`/admin/users/${userId}/restore`),
  
  // Verify certificate and enable chat
  verifyCertificate: (userId, data) => api.post(`/admin/users/${userId}/verify-certificate`, data),
  
  // Get dashboard statistics
  getDashboardStats: () => api.get('/admin/dashboard/stats')
};

// ==========================================
// ADMIN - TASK & SUBMISSION APIs
// ==========================================
export const adminTaskAPI = {
  // Get all submissions
  getAllSubmissions: (params) => api.get('/admin/submissions', { params }),
  
  // Review submission
  reviewSubmission: (submissionId, data) => api.put(`/admin/submissions/${submissionId}/review`, data),
  
  // Get submission statistics
  getSubmissionStats: () => api.get('/admin/submission-stats'),
  
  // Bulk review submissions
  bulkReviewSubmissions: (data) => api.post('/admin/submissions/bulk-review', data)
};

// ==========================================
// ADMIN - PAYMENT VERIFICATION APIs
// ==========================================
export const adminPaymentAPI = {
  // Get all payments
  getAllPayments: (params) => api.get('/admin/payments', { params }),
  
  // Get payment statistics
  getPaymentStats: () => api.get('/admin/payments/stats'),
  
  // Get single payment details
  getPaymentDetails: (paymentId) => api.get(`/admin/payments/${paymentId}`),
  
  // Verify payment
  verifyPayment: (paymentId, data) => api.post(`/admin/payments/verify/${paymentId}`, data),
  
  // Reject payment
  rejectPayment: (paymentId, data) => api.post(`/admin/payments/reject/${paymentId}`, data),
  
  // Bulk verify payments
  bulkVerifyPayments: (data) => api.post('/admin/payments/bulk-verify', data),
  
  // Get payment analytics
  getPaymentAnalytics: (params) => api.get('/admin/payments/analytics/dashboard', { params }),
  
  // Export payments to CSV
  exportPayments: (params) => api.get('/admin/payments/export/csv', { 
    params,
    responseType: 'blob'
  })
};

// ==========================================
// ADMIN - CHAT & PRIVATE TASKS APIs
// ==========================================
export const adminChatAPI = {
  // Get all chat rooms
  getAllChatRooms: () => api.get('/admin/chat/rooms'),
  
  // Create chat room with user
  createChatRoom: (userId) => api.post(`/admin/chat/create/${userId}`),
  
  // Get chat messages
  getChatMessages: (chatRoomId, params) => api.get(`/admin/chat/${chatRoomId}/messages`, { params }),
  
  // Send message
  sendMessage: (chatRoomId, data) => api.post(`/admin/chat/${chatRoomId}/send`, data),
  
  // Assign private task
  assignPrivateTask: (chatRoomId, data) => api.post(`/admin/chat/${chatRoomId}/assign-task`, data),
  
  // Get user's private tasks
  getUserPrivateTasks: (userId) => api.get(`/admin/private-tasks/${userId}`),
  
  // Review private task submission
  reviewPrivateTask: (taskId, data) => api.post(`/admin/private-tasks/${taskId}/review`, data),
  
  // Mark messages as read
  markMessagesRead: (chatRoomId, data) => api.post(`/admin/chat/${chatRoomId}/read`, data)
};

// ==========================================
// INTERN - PROFILE APIs
// ==========================================
export const internProfileAPI = {
  // Get intern dashboard
  getDashboard: () => api.get('/intern/profile/dashboard'),
  
  // Enroll in course
  enrollCourse: (courseId) => api.post(`/intern/profile/enroll/${courseId}`),
  
  // Get my enrollments
  getMyEnrollments: () => api.get('/intern/profile/enrollments'),
  
  // Get notifications
  getNotifications: (params) => api.get('/intern/profile/notifications', { params }),
  
  // Mark notification as read
  markNotificationRead: (notificationId) => api.put(`/intern/profile/notifications/${notificationId}/read`)
};

// ==========================================
// INTERN - TASK SUBMISSION APIs
// ==========================================
export const internTaskAPI = {
  // Get my tasks for enrollment
  getMyTasks: (enrollmentId) => api.get(`/intern/tasks/${enrollmentId}`),
  
  // Submit task
  submitTask: (taskId, data) => api.post(`/intern/tasks/${taskId}/submit`, data),
  
  // Get submission details
  getSubmissionDetails: (submissionId) => api.get(`/intern/tasks/submission/${submissionId}`),
  
  // Get progress
  getProgress: (enrollmentId) => api.get(`/intern/tasks/progress/${enrollmentId}`)
};

// ==========================================
// INTERN - PAYMENT APIs
// ==========================================
export const internPaymentAPI = {
  // Get payment status
  getPaymentStatus: (enrollmentId) => api.get(`/intern/payments/status/${enrollmentId}`),
  
  // Initiate payment
  initiatePayment: (data) => api.post('/intern/payments/initiate', data),
  
  // Submit payment proof
  submitPaymentProof: (data, config) => api.post('/intern/payments/submit-proof', data, config),
  
  // Get my payments
  getMyPayments: () => api.get('/intern/payments/my-payments'),
  
  // Resubmit payment proof
  resubmitPaymentProof: (data, config) => api.post('/intern/payments/resubmit-proof', data, config)
};

// ==========================================
// INTERN - CHAT APIs
// ==========================================
export const internChatAPI = {
  // Get my chat room
  getMyChatRoom: () => api.get('/intern/chat/room'),
  
  // Get messages
  getMessages: (params) => api.get('/intern/chat/messages', { params }),
  
  // Send message
  sendMessage: (data) => api.post('/intern/chat/send', data),
  
  // Get my private tasks
  getMyPrivateTasks: () => api.get('/intern/chat/private-tasks'),
  
  // Submit private task
  submitPrivateTask: (taskId, data) => api.post(`/intern/chat/private-tasks/${taskId}/submit`, data)
};

// Export default api instance
export default api;

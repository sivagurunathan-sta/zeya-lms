// src/services/api.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create base axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Admin API endpoints
export const adminAPI = {
  // Users
  getAllUsers: () => api.get('/admin/users'),
  getUserById: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  revokeUser: (id) => api.patch(`/admin/users/${id}/revoke`),
  
  // Tasks
  createTask: (data) => api.post('/admin/tasks', data),
  updateTask: (id, data) => api.put(`/admin/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/admin/tasks/${id}`),
  
  // Submissions
  getSubmissions: () => api.get('/admin/submissions'),
  verifySubmission: (id, status) => api.patch(`/admin/submissions/${id}/verify`, { status }),
  
  // Payments
  getPayments: () => api.get('/admin/payments'),
  verifyPayment: (id) => api.patch(`/admin/payments/${id}/verify`),
  
  // Certificates
  uploadCertificate: (userId, file) => {
    const formData = new FormData();
    formData.append('certificate', file);
    return api.post(`/admin/certificates/${userId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // Analytics
  getAnalytics: () => api.get('/admin/analytics'),
};

// Task API endpoints
export const taskAPI = {
  getTasks: () => api.get('/tasks'),
  getTaskById: (id) => api.get(`/tasks/${id}`),
  submitTask: (id, data) => api.post(`/tasks/${id}/submit`, data),
  getUserTasks: () => api.get('/tasks/my-tasks'),
};

// Export default api instance for other files
export default api;
// frontend/src/services/api.js - COMPLETE API INTEGRATION
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
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
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

// ==========================================
// ADMIN API - CREATE COURSE
// ==========================================

export const adminAPI = {
  /**
   * Create complete internship with tasks and materials
   */
  createInternship: async (courseData, tasks, files) => {
    const formData = new FormData();
    
    // Add course data
    formData.append('courseName', courseData.name);
    formData.append('courseDescription', courseData.description);
    formData.append('duration', courseData.duration);
    formData.append('passPercentage', courseData.passPercentage);
    formData.append('certificatePrice', courseData.certificatePrice);
    
    // Add course image
    if (courseData.image) {
      formData.append('courseImage', courseData.image);
    }
    
    // Add tasks as JSON
    formData.append('tasks', JSON.stringify(tasks));
    
    // Add task files
    if (files && files.length > 0) {
      files.forEach(file => {
        formData.append('taskFiles', file);
      });
    }
    
    return api.post('/admin/internships/create-full', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Get all pending submissions
   */
  getPendingSubmissions: async (params = {}) => {
    return api.get('/admin/submissions/pending', { params });
  },

  /**
   * Review submission - OPEN (approve) or CLOSE (reject)
   */
  reviewSubmission: async (submissionId, action, adminFeedback, score = null) => {
    return api.put(`/admin/submissions/${submissionId}/review`, {
      action, // 'OPEN' or 'CLOSE'
      adminFeedback,
      score
    });
  },

  /**
   * Get all internships
   */
  getInternships: async () => {
    return api.get('/admin/internships');
  },

  /**
   * Verify payment
   */
  verifyPayment: async (paymentId, paymentStatus, verificationMessage, verifiedTransactionId) => {
    return api.put(`/admin/payments/${paymentId}/verify`, {
      paymentStatus, // 'VERIFIED' or 'REJECTED'
      verificationMessage,
      verifiedTransactionId
    });
  },

  /**
   * Upload certificate
   */
  uploadCertificate: async (enrollmentId, certificateNumber, certificateFile) => {
    const formData = new FormData();
    formData.append('enrollmentId', enrollmentId);
    formData.append('certificateNumber', certificateNumber);
    formData.append('certificate', certificateFile);
    
    return api.post('/admin/certificates/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Get dashboard statistics
   */
  getDashboardStats: async () => {
    return api.get('/admin/dashboard/stats');
  },

  /**
   * Get all payments
   */
  getPayments: async (params = {}) => {
    return api.get('/admin/payments', { params });
  },
};

// ==========================================
// INTERN API - VIEW & SUBMIT TASKS
// ==========================================

export const internAPI = {
  /**
   * Enroll in internship
   */
  enrollInInternship: async (internshipId) => {
    return api.post(`/intern/enroll/${internshipId}`);
  },

  /**
   * Get all tasks for an internship with lock status
   */
  getInternshipTasks: async (internshipId) => {
    return api.get(`/intern/internships/${internshipId}/tasks`);
  },

  /**
   * Submit task - GitHub URL
   */
  submitTaskGithub: async (taskId, enrollmentId, githubUrl, notes = '') => {
    return api.post(`/intern/tasks/${taskId}/submit`, {
      enrollmentId,
      submissionType: 'GITHUB',
      githubUrl,
      notes
    });
  },

  /**
   * Submit task - Google Form
   */
  submitTaskForm: async (taskId, enrollmentId, formUrl, notes = '') => {
    return api.post(`/intern/tasks/${taskId}/submit`, {
      enrollmentId,
      submissionType: 'FORM',
      formUrl,
      notes
    });
  },

  /**
   * Submit task - File Upload
   */
  submitTaskFile: async (taskId, enrollmentId, file, notes = '') => {
    const formData = new FormData();
    formData.append('enrollmentId', enrollmentId);
    formData.append('submissionType', 'FILE');
    formData.append('file', file);
    formData.append('notes', notes);
    
    return api.post(`/intern/tasks/${taskId}/submit`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Get progress for an enrollment
   */
  getProgress: async (enrollmentId) => {
    return api.get(`/intern/progress/${enrollmentId}`);
  },

  /**
   * Initiate certificate payment
   */
  initiateCertificatePayment: async (enrollmentId) => {
    return api.post('/intern/payments/initiate-certificate', {
      enrollmentId
    });
  },

  /**
   * Submit payment proof
   */
  submitPaymentProof: async (paymentId, transactionId, upiId, proofFile) => {
    const formData = new FormData();
    formData.append('transactionId', transactionId);
    formData.append('upiId', upiId);
    formData.append('paymentProof', proofFile);
    
    return api.post(`/intern/payments/${paymentId}/submit-proof`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Get notifications
   */
  getNotifications: async (page = 1, limit = 20) => {
    return api.get('/intern/notifications', {
      params: { page, limit }
    });
  },

  /**
   * Mark notification as read
   */
  markNotificationRead: async (notificationId) => {
    return api.put(`/intern/notifications/${notificationId}/read`);
  },

  /**
   * Get available internships
   */
  getAvailableInternships: async () => {
    return api.get('/intern/internships');
  },

  /**
   * Get my enrollments
   */
  getMyEnrollments: async () => {
    return api.get('/intern/enrollments');
  },
};

// ==========================================
// AUTH API
// ==========================================

export const authAPI = {
  /**
   * Login
   */
  login: async (userId, password) => {
    return api.post('/auth/login', { userId, password });
  },

  /**
   * Get current user
   */
  getCurrentUser: async () => {
    return api.get('/auth/me');
  },

  /**
   * Change password
   */
  changePassword: async (currentPassword, newPassword) => {
    return api.post('/auth/change-password', {
      currentPassword,
      newPassword
    });
  },

  /**
   * Logout
   */
  logout: async () => {
    return api.post('/auth/logout');
  },
};

// ==========================================
// USAGE EXAMPLES IN REACT COMPONENTS
// ==========================================

/*
// ===== ADMIN - CREATE COURSE EXAMPLE =====

import { adminAPI } from './services/api';

const handleCreateCourse = async () => {
  try {
    const courseData = {
      name: 'Full Stack Web Development',
      description: 'Complete 35-day internship program',
      image: courseImageFile, // File object
      duration: 35,
      passPercentage: 75,
      certificatePrice: 499
    };

    const tasks = [
      {
        taskNumber: 1,
        title: 'Setup Development Environment',
        description: 'Install Node.js, VS Code, Git',
        videoUrl: 'https://youtube.com/watch?v=example',
        submissionType: 'GITHUB',
        isRequired: true,
        points: 100
      },
      {
        taskNumber: 2,
        title: 'HTML & CSS Portfolio',
        description: 'Create responsive portfolio',
        videoUrl: 'https://youtube.com/watch?v=example2',
        submissionType: 'FILE',
        isRequired: true,
        points: 100
      }
      // ... more tasks
    ];

    const files = [
      // File objects from input
      taskFile1,
      taskFile2
    ];

    const response = await adminAPI.createInternship(courseData, tasks, files);
    console.log('Course created:', response);
    alert('Course created successfully!');
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to create course');
  }
};

// ===== ADMIN - REVIEW SUBMISSION EXAMPLE =====

const handleReviewSubmission = async (submissionId, action) => {
  try {
    const feedback = action === 'OPEN' 
      ? 'Excellent work! All requirements met.'
      : 'Please fix the following issues and resubmit...';
    
    const score = action === 'OPEN' ? 95 : 0;

    const response = await adminAPI.reviewSubmission(
      submissionId, 
      action, // 'OPEN' or 'CLOSE'
      feedback,
      score
    );

    console.log('Review result:', response);
    alert(response.message);
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to review submission');
  }
};

// ===== INTERN - SUBMIT TASK EXAMPLE =====

import { internAPI } from './services/api';

// Submit GitHub URL
const handleSubmitGithub = async () => {
  try {
    const response = await internAPI.submitTaskGithub(
      taskId,
      enrollmentId,
      'https://github.com/user/repo',
      'Completed all requirements'
    );
    alert('Task submitted successfully!');
  } catch (error) {
    alert('Failed to submit task');
  }
};

// Submit File
const handleSubmitFile = async (file) => {
  try {
    const response = await internAPI.submitTaskFile(
      taskId,
      enrollmentId,
      file,
      'Project completed as per instructions'
    );
    alert('Task submitted successfully!');
  } catch (error) {
    alert('Failed to submit task');
  }
};

// Submit Google Form
const handleSubmitForm = async () => {
  try {
    const response = await internAPI.submitTaskForm(
      taskId,
      enrollmentId,
      'https://docs.google.com/forms/d/e/...',
      'Form submitted'
    );
    alert('Task submitted successfully!');
  } catch (error) {
    alert('Failed to submit task');
  }
};

// ===== GET TASKS WITH LOCK STATUS =====

const loadTasks = async () => {
  try {
    const response = await internAPI.getInternshipTasks(internshipId);
    const tasks = response.data.tasks;
    
    tasks.forEach(task => {
      console.log(`Task ${task.taskNumber}: ${task.status}`);
      // status: 'LOCKED', 'UNLOCKED', 'SUBMITTED', 'COMPLETED'
      console.log(`Can submit: ${task.canSubmit}`);
      console.log(`Unlock message: ${task.unlockMessage}`);
    });
  } catch (error) {
    console.error('Error loading tasks:', error);
  }
};

// ===== PAYMENT FLOW =====

// 1. Initiate payment
const initiateCertificatePayment = async () => {
  try {
    const response = await internAPI.initiateCertificatePayment(enrollmentId);
    const { payment, qrCodeUrl, amount, upiId } = response.data;
    
    console.log('Payment ID:', payment.id);
    console.log('Amount:', amount);
    console.log('QR Code:', qrCodeUrl);
    console.log('UPI ID:', upiId);
    
    // Show QR code to user
    setPaymentDetails(response.data);
  } catch (error) {
    alert('Failed to initiate payment');
  }
};

// 2. Submit payment proof
const submitPaymentProof = async (proofFile) => {
  try {
    const response = await internAPI.submitPaymentProof(
      paymentId,
      'TXN123456789', // Transaction ID
      'user@paytm', // UPI ID
      proofFile // Screenshot file
    );
    alert('Payment proof submitted! Admin will verify soon.');
  } catch (error) {
    alert('Failed to submit payment proof');
  }
};

// ===== ADMIN - VERIFY PAYMENT =====

const verifyPayment = async (paymentId, isApproved) => {
  try {
    const response = await adminAPI.verifyPayment(
      paymentId,
      isApproved ? 'VERIFIED' : 'REJECTED',
      isApproved 
        ? 'Payment verified successfully'
        : 'Invalid transaction ID',
      'TXN123456789' // Verified transaction ID
    );
    alert(response.message);
  } catch (error) {
    alert('Failed to verify payment');
  }
};

// ===== ADMIN - UPLOAD CERTIFICATE =====

const uploadCertificate = async (certificateFile) => {
  try {
    const response = await adminAPI.uploadCertificate(
      enrollmentId,
      'CERT-2025-001', // Certificate number
      certificateFile // PDF file
    );
    alert('Certificate uploaded successfully!');
  } catch (error) {
    alert('Failed to upload certificate');
  }
};
*/

export default api;
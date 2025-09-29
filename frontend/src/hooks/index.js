// Custom React Hooks for Student LMS
// src/hooks/index.js

import { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchUsers, fetchCourses, fetchPendingSubmissions, fetchPayments, fetchCertificates,
  fetchStudentDashboard, fetchEnrollments, fetchEnrollmentTasks, submitTask,
  fetchPaymentHistory, fetchMyCertificates, fetchNotifications,
  showToast, setOperationLoading
} from '../store/enhancedStore';
import { adminAPI, studentAPI, authAPI, WebSocketService } from '../services/enhancedAPI';

// ==================== AUTH HOOKS ====================

export const useAuth = () => {
  const dispatch = useDispatch();
  const auth = useSelector(state => state.auth);
  
  const login = useCallback(async (credentials) => {
    try {
      dispatch(setOperationLoading({ operationId: 'login', loading: true }));
      const result = await dispatch(loginUser(credentials)).unwrap();
      dispatch(showToast({ message: 'Login successful!', type: 'success' }));
      return result;
    } catch (error) {
      dispatch(showToast({ message: error || 'Login failed', type: 'error' }));
      throw error;
    } finally {
      dispatch(setOperationLoading({ operationId: 'login', loading: false }));
    }
  }, [dispatch]);

  const logout = useCallback(() => {
    dispatch(logout());
    dispatch(showToast({ message: 'Logged out successfully', type: 'info' }));
  }, [dispatch]);

  return {
    ...auth,
    login,
    logout,
    isLoading: useSelector(state => state.ui.loading.operations.login || false)
  };
};

// ==================== ADMIN HOOKS ====================

export const useAdminUsers = () => {
  const dispatch = useDispatch();
  const users = useSelector(state => state.admin.users);
  
  const fetchUsersData = useCallback((params = {}) => {
    return dispatch(fetchUsers(params));
  }, [dispatch]);

  const updateUserStatus = useCallback(async (userId, status) => {
    try {
      await adminAPI.updateUserStatus(userId, status);
      dispatch(updateUserStatus({ userId, status }));
      dispatch(showToast({ message: 'User status updated successfully', type: 'success' }));
    } catch (error) {
      dispatch(showToast({ message: 'Failed to update user status', type: 'error' }));
      throw error;
    }
  }, [dispatch]);

  const suspendUser = useCallback(async (userId, reason) => {
    try {
      await adminAPI.suspendUser(userId, reason);
      dispatch(updateUserStatus({ userId, status: 'SUSPENDED' }));
      dispatch(showToast({ message: 'User suspended successfully', type: 'success' }));
    } catch (error) {
      dispatch(showToast({ message: 'Failed to suspend user', type: 'error' }));
      throw error;
    }
  }, [dispatch]);

  const createUser = useCallback(async (userData) => {
    try {
      const newUser = await adminAPI.createUser(userData);
      dispatch(fetchUsersData()); // Refresh the list
      dispatch(showToast({ message: 'User created successfully', type: 'success' }));
      return newUser;
    } catch (error) {
      dispatch(showToast({ message: 'Failed to create user', type: 'error' }));
      throw error;
    }
  }, [dispatch, fetchUsersData]);

  return {
    ...users,
    fetchUsers: fetchUsersData,
    updateUserStatus,
    suspendUser,
    createUser
  };
};

export const useAdminCourses = () => {
  const dispatch = useDispatch();
  const courses = useSelector(state => state.admin.courses);
  
  const fetchCoursesData = useCallback((params = {}) => {
    return dispatch(fetchCourses(params));
  }, [dispatch]);

  const createCourse = useCallback(async (courseData) => {
    try {
      const newCourse = await adminAPI.createCourse(courseData);
      dispatch(fetchCoursesData()); // Refresh the list
      dispatch(showToast({ message: 'Course created successfully', type: 'success' }));
      return newCourse;
    } catch (error) {
      dispatch(showToast({ message: 'Failed to create course', type: 'error' }));
      throw error;
    }
  }, [dispatch, fetchCoursesData]);

  const updateCourse = useCallback(async (courseId, courseData) => {
    try {
      const updatedCourse = await adminAPI.updateCourse(courseId, courseData);
      dispatch(fetchCoursesData()); // Refresh the list
      dispatch(showToast({ message: 'Course updated successfully', type: 'success' }));
      return updatedCourse;
    } catch (error) {
      dispatch(showToast({ message: 'Failed to update course', type: 'error' }));
      throw error;
    }
  }, [dispatch, fetchCoursesData]);

  const deleteCourse = useCallback(async (courseId) => {
    try {
      await adminAPI.deleteCourse(courseId);
      dispatch(fetchCoursesData()); // Refresh the list
      dispatch(showToast({ message: 'Course deleted successfully', type: 'success' }));
    } catch (error) {
      dispatch(showToast({ message: 'Failed to delete course', type: 'error' }));
      throw error;
    }
  }, [dispatch, fetchCoursesData]);

  return {
    ...courses,
    fetchCourses: fetchCoursesData,
    createCourse,
    updateCourse,
    deleteCourse
  };
};

export const useAdminSubmissions = () => {
  const dispatch = useDispatch();
  const submissions = useSelector(state => state.admin.submissions);
  
  const fetchSubmissions = useCallback((params = {}) => {
    return dispatch(fetchPendingSubmissions(params));
  }, [dispatch]);

  const reviewSubmission = useCallback(async (submissionId, review) => {
    try {
      await adminAPI.reviewSubmission(submissionId, review);
      dispatch(updateSubmissionStatus({ submissionId, ...review }));
      dispatch(showToast({ 
        message: `Submission ${review.status.toLowerCase()} successfully`, 
        type: 'success' 
      }));
    } catch (error) {
      dispatch(showToast({ message: 'Failed to review submission', type: 'error' }));
      throw error;
    }
  }, [dispatch]);

  return {
    ...submissions,
    fetchSubmissions,
    reviewSubmission
  };
};

export const useAdminPayments = () => {
  const dispatch = useDispatch();
  const payments = useSelector(state => state.admin.payments);
  
  const fetchPaymentsData = useCallback((params = {}) => {
    return dispatch(fetchPayments(params));
  }, [dispatch]);

  const verifyPayment = useCallback(async (paymentId, status, notes) => {
    try {
      await adminAPI.verifyPayment(paymentId, status, notes);
      dispatch(updatePaymentStatus({ 
        paymentId, 
        status, 
        verifiedAt: new Date().toISOString() 
      }));
      dispatch(showToast({ 
        message: `Payment ${status.toLowerCase()} successfully`, 
        type: 'success' 
      }));
    } catch (error) {
      dispatch(showToast({ message: 'Failed to verify payment', type: 'error' }));
      throw error;
    }
  }, [dispatch]);

  return {
    ...payments,
    fetchPayments: fetchPaymentsData,
    verifyPayment
  };
};

export const useAdminCertificates = () => {
  const dispatch = useDispatch();
  const certificates = useSelector(state => state.admin.certificates);
  
  const fetchCertificatesData = useCallback((params = {}) => {
    return dispatch(fetchCertificates(params));
  }, [dispatch]);

  const issueCertificate = useCallback(async (enrollmentId, certificateData) => {
    try {
      const certificate = await adminAPI.issueCertificate(enrollmentId, certificateData);
      dispatch(fetchCertificatesData()); // Refresh the list
      dispatch(showToast({ message: 'Certificate issued successfully', type: 'success' }));
      return certificate;
    } catch (error) {
      dispatch(showToast({ message: 'Failed to issue certificate', type: 'error' }));
      throw error;
    }
  }, [dispatch, fetchCertificatesData]);

  const revokeCertificate = useCallback(async (certificateId, reason) => {
    try {
      await adminAPI.revokeCertificate(certificateId, reason);
      dispatch(fetchCertificatesData()); // Refresh the list
      dispatch(showToast({ message: 'Certificate revoked successfully', type: 'success' }));
    } catch (error) {
      dispatch(showToast({ message: 'Failed to revoke certificate', type: 'error' }));
      throw error;
    }
  }, [dispatch, fetchCertificatesData]);

  return {
    ...certificates,
    fetchCertificates: fetchCertificatesData,
    issueCertificate,
    revokeCertificate
  };
};

// ==================== STUDENT HOOKS ====================

export const useStudentDashboard = () => {
  const dispatch = useDispatch();
  const dashboard = useSelector(state => state.student.dashboard);
  
  const refreshDashboard = useCallback(() => {
    return dispatch(fetchStudentDashboard());
  }, [dispatch]);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  return {
    ...dashboard,
    refresh: refreshDashboard
  };
};

export const useStudentEnrollments = () => {
  const dispatch = useDispatch();
  const enrollments = useSelector(state => state.student.enrollments);
  
  const fetchEnrollmentsData = useCallback(() => {
    return dispatch(fetchEnrollments());
  }, [dispatch]);

  const enrollInCourse = useCallback(async (courseId) => {
    try {
      await studentAPI.enrollInCourse(courseId);
      dispatch(fetchEnrollmentsData()); // Refresh the list
      dispatch(showToast({ message: 'Successfully enrolled in course', type: 'success' }));
    } catch (error) {
      dispatch(showToast({ message: 'Failed to enroll in course', type: 'error' }));
      throw error;
    }
  }, [dispatch, fetchEnrollmentsData]);

  useEffect(() => {
    fetchEnrollmentsData();
  }, [fetchEnrollmentsData]);

  return {
    ...enrollments,
    fetchEnrollments: fetchEnrollmentsData,
    enrollInCourse
  };
};

export const useStudentTasks = (enrollmentId) => {
  const dispatch = useDispatch();
  const tasks = useSelector(state => 
    state.student.tasks.byEnrollment[enrollmentId] || { tasks: [], loading: false }
  );
  const submitting = useSelector(state => state.student.tasks.submitting);
  const error = useSelector(state => state.student.tasks.error);
  
  const fetchTasks = useCallback(() => {
    if (enrollmentId) {
      return dispatch(fetchEnrollmentTasks(enrollmentId));
    }
  }, [dispatch, enrollmentId]);

  const submitTaskData = useCallback(async (taskId, submissionData) => {
    try {
      await dispatch(submitTask({ taskId, submission: submissionData })).unwrap();
      dispatch(showToast({ message: 'Task submitted successfully', type: 'success' }));
      
      // Unlock next task
      const currentTask = tasks.tasks.find(t => t.id === taskId);
      if (currentTask) {
        dispatch(unlockNextTask({ 
          enrollmentId, 
          currentTaskOrder: currentTask.taskOrder 
        }));
      }
    } catch (error) {
      dispatch(showToast({ message: 'Failed to submit task', type: 'error' }));
      throw error;
    }
  }, [dispatch, enrollmentId, tasks.tasks]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    ...tasks,
    submitting,
    error,
    fetchTasks,
    submitTask: submitTaskData
  };
};

export const useStudentPayments = () => {
  const dispatch = useDispatch();
  const payments = useSelector(state => state.student.payments);
  
  const fetchPaymentsData = useCallback(() => {
    return dispatch(fetchPaymentHistory());
  }, [dispatch]);

  const submitPaymentProof = useCallback(async (paymentData) => {
    try {
      const payment = await studentAPI.submitPaymentProof(paymentData);
      dispatch(addPayment(payment));
      dispatch(showToast({ message: 'Payment proof submitted successfully', type: 'success' }));
      return payment;
    } catch (error) {
      dispatch(showToast({ message: 'Failed to submit payment proof', type: 'error' }));
      throw error;
    }
  }, [dispatch]);

  const createPaymentOrder = useCallback(async (enrollmentId, amount) => {
    try {
      const order = await studentAPI.createPaymentOrder(enrollmentId, amount);
      return order;
    } catch (error) {
      dispatch(showToast({ message: 'Failed to create payment order', type: 'error' }));
      throw error;
    }
  }, [dispatch]);

  useEffect(() => {
    fetchPaymentsData();
  }, [fetchPaymentsData]);

  return {
    ...payments,
    fetchPayments: fetchPaymentsData,
    submitPaymentProof,
    createPaymentOrder
  };
};

export const useStudentCertificates = () => {
  const dispatch = useDispatch();
  const certificates = useSelector(state => state.student.certificates);
  
  const fetchCertificatesData = useCallback(() => {
    return dispatch(fetchMyCertificates());
  }, [dispatch]);

  const purchaseCertificate = useCallback(async (enrollmentId) => {
    try {
      const certificate = await studentAPI.purchaseCertificate(enrollmentId);
      dispatch(addCertificate(certificate));
      dispatch(showToast({ message: 'Certificate purchased successfully', type: 'success' }));
      return certificate;
    } catch (error) {
      dispatch(showToast({ message: 'Failed to purchase certificate', type: 'error' }));
      throw error;
    }
  }, [dispatch]);

  const downloadCertificate = useCallback(async (certificateId) => {
    try {
      const blob = await studentAPI.downloadCertificate(certificateId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificate-${certificateId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      dispatch(showToast({ message: 'Failed to download certificate', type: 'error' }));
      throw error;
    }
  }, [dispatch]);

  useEffect(() => {
    fetchCertificatesData();
  }, [fetchCertificatesData]);

  return {
    ...certificates,
    fetchCertificates: fetchCertificatesData,
    purchaseCertificate,
    downloadCertificate
  };
};

// ==================== NOTIFICATION HOOKS ====================

export const useNotifications = () => {
  const dispatch = useDispatch();
  const notifications = useSelector(state => state.notifications);
  
  const fetchNotificationsData = useCallback(() => {
    return dispatch(fetchNotifications());
  }, [dispatch]);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await studentAPI.markNotificationRead(notificationId);
      dispatch(markAsRead(notificationId));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [dispatch]);

  const markAllAsRead = useCallback(async () => {
    try {
      await studentAPI.markAllNotificationsRead();
      dispatch(markAllAsRead());
      dispatch(showToast({ message: 'All notifications marked as read', type: 'success' }));
    } catch (error) {
      dispatch(showToast({ message: 'Failed to mark notifications as read', type: 'error' }));
    }
  }, [dispatch]);

  useEffect(() => {
    fetchNotificationsData();
  }, [fetchNotificationsData]);

  return {
    ...notifications,
    fetchNotifications: fetchNotificationsData,
    markAsRead,
    markAllAsRead
  };
};

// ==================== WEBSOCKET HOOKS ====================

export const useWebSocket = () => {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const token = useSelector(state => state.auth.token);
  const wsRef = useRef(null);

  useEffect(() => {
    if (token && user) {
      wsRef.current = new WebSocketService();
      
      // Set up event listeners
      wsRef.current.on('connected', () => {
        console.log('WebSocket connected');
        wsRef.current.subscribeToNotifications();
      });

      wsRef.current.on('notification', (notification) => {
        dispatch(addNotification(notification));
        dispatch(showToast({ 
          message: notification.title, 
          type: 'info',
          duration: 5000 
        }));
      });

      wsRef.current.on('task_reviewed', (data) => {
        dispatch(updateTaskProgress({
          enrollmentId: data.enrollmentId,
          taskId: data.taskId,
          progress: { 
            submission: { 
              status: data.status, 
              feedback: data.feedback,
              grade: data.grade 
            } 
          }
        }));
        
        if (data.status === 'APPROVED') {
          dispatch(unlockNextTask({
            enrollmentId: data.enrollmentId,
            currentTaskOrder: data.taskOrder
          }));
        }
      });

      wsRef.current.on('payment_verified', (data) => {
        dispatch(updateStudentPaymentStatus({
          paymentId: data.paymentId,
          status: data.status
        }));
        
        dispatch(showToast({ 
          message: `Payment ${data.status.toLowerCase()}`, 
          type: data.status === 'VERIFIED' ? 'success' : 'warning' 
        }));
      });

      wsRef.current.on('certificate_issued', (certificate) => {
        dispatch(addCertificate(certificate));
        dispatch(showToast({ 
          message: 'New certificate issued!', 
          type: 'success' 
        }));
      });

      wsRef.current.on('chat_message', (message) => {
        dispatch(addMessage({
          conversationId: message.conversationId,
          message
        }));
      });

      wsRef.current.connect(token);

      return () => {
        if (wsRef.current) {
          wsRef.current.disconnect();
        }
      };
    }
  }, [token, user, dispatch]);

  return wsRef.current;
};

// ==================== UTILITY HOOKS ====================

export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
};

export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const useInfiniteScroll = (callback, hasMore) => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop
        !== document.documentElement.offsetHeight ||
        loading ||
        !hasMore
      ) {
        return;
      }
      
      setLoading(true);
      callback().finally(() => setLoading(false));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [callback, hasMore, loading]);

  return loading;
};

export const useFileUpload = (options = {}) => {
  const {
    allowedTypes = [],
    maxSize = 10 * 1024 * 1024, // 10MB
    multiple = false
  } = options;

  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const validateFile = useCallback((file) => {
    if (allowedTypes.length > 0) {
      const isValidType = allowedTypes.some(type => 
        file.type === type || file.name.toLowerCase().endsWith(type)
      );
      if (!isValidType) {
        throw new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
      }
    }

    if (file.size > maxSize) {
      throw new Error(`File size too large. Maximum size: ${maxSize / (1024 * 1024)}MB`);
    }

    return true;
  }, [allowedTypes, maxSize]);

  const addFiles = useCallback((newFiles) => {
    try {
      const fileArray = Array.from(newFiles);
      
      fileArray.forEach(validateFile);
      
      setFiles(prev => multiple ? [...prev, ...fileArray] : fileArray);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [multiple, validateFile]);

  const removeFile = useCallback((index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setError(null);
    setProgress(0);
  }, []);

  const upload = useCallback(async (uploadFn) => {
    if (files.length === 0) {
      throw new Error('No files to upload');
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const results = [];
      
      for (let i = 0; i < files.length; i++) {
        const result = await uploadFn(files[i]);
        results.push(result);
        setProgress(((i + 1) / files.length) * 100);
      }

      return multiple ? results : results[0];
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  }, [files, multiple]);

  return {
    files,
    uploading,
    progress,
    error,
    addFiles,
    removeFile,
    clearFiles,
    upload
  };
};

export const usePagination = (initialPage = 1, initialLimit = 20) => {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [total, setTotal] = useState(0);

  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  const goToPage = useCallback((newPage) => {
    setPage(Math.max(1, Math.min(newPage, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (hasNext) setPage(prev => prev + 1);
  }, [hasNext]);

  const prevPage = useCallback(() => {
    if (hasPrev) setPage(prev => prev - 1);
  }, [hasPrev]);

  const reset = useCallback(() => {
    setPage(initialPage);
  }, [initialPage]);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext,
    hasPrev,
    setPage: goToPage,
    setLimit,
    setTotal,
    nextPage,
    prevPage,
    reset
  };
};

export const useSearch = (searchFn, dependencies = []) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.trim()) {
      setLoading(true);
      setError(null);
      
      searchFn(debouncedQuery)
        .then(setResults)
        .catch(setError)
        .finally(() => setLoading(false));
    } else {
      setResults([]);
    }
  }, [debouncedQuery, searchFn, ...dependencies]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
  }, []);

  return {
    query,
    results,
    loading,
    error,
    setQuery,
    clearSearch
  };
};

// ==================== EXPORT ALL HOOKS ====================

export default {
  // Auth
  useAuth,
  
  // Admin
  useAdminUsers,
  useAdminCourses,
  useAdminSubmissions,
  useAdminPayments,
  useAdminCertificates,
  
  // Student
  useStudentDashboard,
  useStudentEnrollments,
  useStudentTasks,
  useStudentPayments,
  useStudentCertificates,
  
  // Common
  useNotifications,
  useWebSocket,
  
  // Utilities
  useLocalStorage,
  useDebounce,
  useInfiniteScroll,
  useFileUpload,
  usePagination,
  useSearch
};
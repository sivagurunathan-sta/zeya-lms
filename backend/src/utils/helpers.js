// backend/src/utils/helpers.js

/**
 * Generate unique certificate number
 * Format: CERT-YYYY-XXXXXX (e.g., CERT-2025-000123)
 */
const generateCertificateNumber = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `CERT-${year}-${random}`;
};

/**
 * Calculate percentage score
 */
const calculatePercentage = (obtained, total) => {
  if (total === 0) return 0;
  return Math.round((obtained / total) * 100 * 100) / 100; // 2 decimal places
};

/**
 * Format date to readable string
 */
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Format time to readable string
 */
const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format date and time
 */
const formatDateTime = (date) => {
  return `${formatDate(date)} at ${formatTime(date)}`;
};

/**
 * Calculate time difference in hours
 */
const getHoursDifference = (startDate, endDate) => {
  const diff = new Date(endDate) - new Date(startDate);
  return Math.round(diff / (1000 * 60 * 60));
};

/**
 * Calculate time difference in days
 */
const getDaysDifference = (startDate, endDate) => {
  const diff = new Date(endDate) - new Date(startDate);
  return Math.round(diff / (1000 * 60 * 60 * 24));
};

/**
 * Check if date is within range
 */
const isDateInRange = (date, startDate, endDate) => {
  const d = new Date(date);
  return d >= new Date(startDate) && d <= new Date(endDate);
};

/**
 * Generate unique user ID
 * Format: INT-YYYY-XXXXX (e.g., INT-2025-00123)
 */
const generateUserId = (prefix = 'INT') => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `${prefix}-${year}-${random}`;
};

/**
 * Validate UPI Transaction ID (12 digits)
 */
const validateUpiTransactionId = (transactionId) => {
  return /^\d{12}$/.test(transactionId);
};

/**
 * Validate email format
 */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Sanitize filename
 */
const sanitizeFilename = (filename) => {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
};

/**
 * Get file extension
 */
const getFileExtension = (filename) => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

/**
 * Calculate enrollment progress
 */
const calculateEnrollmentProgress = (completedTasks, totalTasks) => {
  if (totalTasks === 0) return 0;
  return Math.round((completedTasks / totalTasks) * 100);
};

/**
 * Check if enrollment is completed
 */
const isEnrollmentCompleted = (progress, passPercentage) => {
  return progress >= passPercentage;
};

/**
 * Generate random string
 */
const generateRandomString = (length = 10) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

/**
 * Format currency (Indian Rupees)
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(amount);
};

/**
 * Paginate results
 */
const paginate = (page = 1, limit = 20) => {
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;
  
  return {
    skip,
    take: limitNum,
    page: pageNum,
    limit: limitNum
  };
};

/**
 * Create pagination response
 */
const createPaginationResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

/**
 * Generate enrollment code
 */
const generateEnrollmentCode = () => {
  return 'ENR' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
};

/**
 * Check if task is overdue
 */
const isTaskOverdue = (submissionDeadline) => {
  return new Date() > new Date(submissionDeadline);
};

/**
 * Calculate task deadline
 */
const calculateTaskDeadline = (startDate, hours = 24) => {
  const deadline = new Date(startDate);
  deadline.setHours(deadline.getHours() + hours);
  return deadline;
};

/**
 * Validate file size (in bytes)
 */
const isValidFileSize = (fileSize, maxSize = 5 * 1024 * 1024) => {
  return fileSize <= maxSize;
};

/**
 * Get time ago string
 */
const getTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  let interval = Math.floor(seconds / 31536000);
  if (interval > 1) return interval + ' years ago';
  if (interval === 1) return '1 year ago';
  
  interval = Math.floor(seconds / 2592000);
  if (interval > 1) return interval + ' months ago';
  if (interval === 1) return '1 month ago';
  
  interval = Math.floor(seconds / 86400);
  if (interval > 1) return interval + ' days ago';
  if (interval === 1) return '1 day ago';
  
  interval = Math.floor(seconds / 3600);
  if (interval > 1) return interval + ' hours ago';
  if (interval === 1) return '1 hour ago';
  
  interval = Math.floor(seconds / 60);
  if (interval > 1) return interval + ' minutes ago';
  if (interval === 1) return '1 minute ago';
  
  return 'just now';
};

/**
 * Capitalize first letter
 */
const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

/**
 * Create success response
 */
const successResponse = (data, message = 'Success') => {
  return {
    success: true,
    message,
    data
  };
};

/**
 * Create error response
 */
const errorResponse = (message = 'Error occurred', statusCode = 500) => {
  return {
    success: false,
    message,
    statusCode
  };
};

module.exports = {
  generateCertificateNumber,
  calculatePercentage,
  formatDate,
  formatTime,
  formatDateTime,
  getHoursDifference,
  getDaysDifference,
  isDateInRange,
  generateUserId,
  validateUpiTransactionId,
  validateEmail,
  sanitizeFilename,
  getFileExtension,
  calculateEnrollmentProgress,
  isEnrollmentCompleted,
  generateRandomString,
  formatCurrency,
  paginate,
  createPaginationResponse,
  generateEnrollmentCode,
  isTaskOverdue,
  calculateTaskDeadline,
  isValidFileSize,
  getTimeAgo,
  capitalizeFirstLetter,
  successResponse,
  errorResponse
};
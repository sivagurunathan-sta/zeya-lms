// backend/utils/helpers.js - Complete Utility Functions
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ===========================
// USER MANAGEMENT UTILITIES
// ===========================

/**
 * Generate unique user ID for new interns
 * Format: INT{YEAR}{4-digit-number}
 * Example: INT20250001
 */
const generateUserId = async () => {
  const year = new Date().getFullYear();
  let userId;
  let exists = true;

  while (exists) {
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    userId = `INT${year}${randomNum}`;
    
    const user = await prisma.user.findFirst({
      where: { userId }
    });
    
    exists = !!user;
  }

  return userId;
};

// ===========================
// PAYMENT UTILITIES
// ===========================

/**
 * Generate UPI payment QR code
 * @param {Object} paymentData - Payment details
 * @returns {Promise<string>} QR code data URL
 */
const generatePaymentQR = async (paymentData) => {
  try {
    const { amount, internId, internshipId, paidTaskId, type } = paymentData;
    
    // UPI payment string format
    const upiId = process.env.UPI_ID || 'merchant@upi';
    const merchantName = process.env.MERCHANT_NAME || 'LMS Platform';
    
    // UPI format: upi://pay?pa=UPI_ID&pn=NAME&am=AMOUNT&cu=CURRENCY&tn=NOTE
    const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Payment for ${type}`)}`;
    
    // Generate QR code as data URL
    const qrCodeDataURL = await QRCode.toDataURL(upiString, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      width: 300
    });
    
    return qrCodeDataURL;
  } catch (error) {
    console.error('QR Code generation error:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Generate unique transaction ID
 */
const generateTransactionId = () => {
  return `TXN${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

/**
 * Format currency in Indian Rupees
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(amount);
};

// ===========================
// CERTIFICATE UTILITIES
// ===========================

/**
 * Generate unique certificate number
 * Format: CERT-{YEAR}-{6-digit-random}
 * Example: CERT-2025-123456
 */
const generateCertificateNumber = () => {
  const prefix = 'CERT';
  const year = new Date().getFullYear();
  const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `${prefix}-${year}-${randomNum}`;
};

/**
 * Generate certificate (placeholder for PDF generation)
 * In production, integrate with PDF generation library
 */
const generateCertificate = async (enrollmentData) => {
  try {
    const { internName, internshipTitle, completionDate, certificateNumber } = enrollmentData;
    
    // In production, use PDF generation library like:
    // - puppeteer
    // - pdfkit
    // - jsPDF
    // For now, return placeholder URL
    const certificateUrl = `/certificates/${certificateNumber}.pdf`;
    
    return certificateUrl;
  } catch (error) {
    console.error('Certificate generation error:', error);
    throw new Error('Failed to generate certificate');
  }
};

// ===========================
// PROGRESS TRACKING UTILITIES
// ===========================

/**
 * Calculate progress percentage
 */
const calculateProgress = (totalTasks, completedTasks) => {
  if (totalTasks === 0) return 0;
  return Math.round((completedTasks / totalTasks) * 100);
};

/**
 * Calculate final score with penalties
 * Penalties: 5% per skipped task, 2% per late submission
 */
const calculateScore = (submissions) => {
  if (!submissions || submissions.length === 0) return 0;

  let totalScore = 0;
  let skippedPenalty = 0;
  let latePenalty = 0;

  submissions.forEach(submission => {
    if (submission.score) {
      totalScore += submission.score;
    }
    if (submission.wasSkipped) {
      skippedPenalty += 5; // 5% penalty per skipped task
    }
    if (submission.isLate) {
      latePenalty += 2; // 2% penalty for late submission
    }
  });

  const averageScore = totalScore / submissions.length;
  const finalScore = Math.max(0, averageScore - skippedPenalty - latePenalty);
  
  return Math.round(finalScore);
};

/**
 * Check if user is eligible for certificate
 */
const checkCertificateEligibility = (totalTasks, completedTasks, averageScore, passPercentage) => {
  const progressComplete = completedTasks >= totalTasks;
  const scoreEligible = averageScore >= passPercentage;
  return progressComplete && scoreEligible;
};

// ===========================
// TASK UTILITIES
// ===========================

/**
 * Calculate task unlock time based on previous submission
 */
const calculateUnlockTime = (previousSubmissionDate, waitHours = 12) => {
  const unlockTime = new Date(previousSubmissionDate);
  unlockTime.setHours(unlockTime.getHours() + waitHours);
  return unlockTime;
};

/**
 * Check if task is unlocked for user
 */
const isTaskUnlocked = async (enrollmentId, taskNumber) => {
  // First task is always unlocked
  if (taskNumber === 1) return true;

  const previousTaskNumber = taskNumber - 1;
  
  // Check if previous task has been submitted
  const previousSubmission = await prisma.submission.findFirst({
    where: {
      enrollmentId,
      task: { taskNumber: previousTaskNumber }
    }
  });

  return !!previousSubmission;
};

/**
 * Validate GitHub URL format
 */
const validateGithubUrl = (url) => {
  const githubUrlRegex = /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+/;
  return githubUrlRegex.test(url);
};

// ===========================
// FILE UTILITIES
// ===========================

/**
 * Sanitize filename for safe storage
 */
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-z0-9.-]/gi, '_')
    .toLowerCase()
    .substring(0, 255); // Limit length
};

/**
 * Get file extension from filename
 */
const getFileExtension = (filename) => {
  return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
};

/**
 * Check if file type is allowed
 */
const isAllowedFileType = (filename, allowedTypes = []) => {
  const ext = getFileExtension(filename).toLowerCase();
  return allowedTypes.includes(ext);
};

/**
 * Format file size in human-readable format
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// ===========================
// DATE & TIME UTILITIES
// ===========================

/**
 * Format date in Indian format
 */
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

/**
 * Format date and time
 */
const formatDateTime = (date) => {
  return new Date(date).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Get relative time (e.g., "2 hours ago")
 */
const getRelativeTime = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  
  return Math.floor(seconds) + " seconds ago";
};

// ===========================
// PAGINATION UTILITIES
// ===========================

/**
 * Calculate pagination parameters
 */
const paginate = (page = 1, limit = 20) => {
  const parsedPage = parseInt(page);
  const parsedLimit = parseInt(limit);
  const skip = (parsedPage - 1) * parsedLimit;
  
  return {
    skip,
    take: parsedLimit,
    page: parsedPage,
    limit: parsedLimit
  };
};

/**
 * Get pagination information
 */
const getPaginationInfo = (total, page, limit) => {
  const totalPages = Math.ceil(total / parseInt(limit));
  return {
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: totalPages,
    hasNext: parseInt(page) < totalPages,
    hasPrev: parseInt(page) > 1
  };
};

// ===========================
// VALIDATION UTILITIES
// ===========================

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate Indian phone number
 */
const isValidIndianPhone = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate password strength
 * At least 8 characters, 1 uppercase, 1 lowercase, 1 number
 */
const isStrongPassword = (password) => {
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return strongRegex.test(password);
};

// ===========================
// OTP & SECURITY UTILITIES
// ===========================

/**
 * Generate 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generate random string
 */
const generateRandomString = (length = 32) => {
  return Math.random().toString(36).substring(2, length + 2);
};

// ===========================
// AUDIT LOG UTILITIES
// ===========================

/**
 * Create audit log entry
 */
const createAuditLog = async (action, userId, details = {}) => {
  try {
    // Check if AuditLog model exists in schema
    const auditLog = await prisma.auditLog.create({
      data: {
        action,
        userId,
        details: JSON.stringify(details),
        timestamp: new Date(),
        ipAddress: details.ipAddress || null
      }
    }).catch(() => {
      // If model doesn't exist, just log to console
      console.log(`[AUDIT] ${action} by ${userId}:`, details);
    });
    
    return auditLog;
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw error - audit logging should not break functionality
  }
};

// ===========================
// STRING UTILITIES
// ===========================

/**
 * Truncate string with ellipsis
 */
const truncateString = (str, maxLength = 100) => {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
};

/**
 * Convert string to slug
 */
const slugify = (str) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Capitalize first letter
 */
const capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// ===========================
// ARRAY UTILITIES
// ===========================

/**
 * Remove duplicates from array
 */
const removeDuplicates = (arr) => {
  return [...new Set(arr)];
};

/**
 * Shuffle array
 */
const shuffleArray = (arr) => {
  const newArr = [...arr];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

// ===========================
// NOTIFICATION UTILITIES
// ===========================

/**
 * Create notification for user
 */
const createNotification = async (userId, title, message, type = 'INFO') => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        isRead: false,
        createdAt: new Date()
      }
    });
    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
  }
};

// ===========================
// ERROR HANDLING UTILITIES
// ===========================

/**
 * Standard error response
 */
const errorResponse = (res, statusCode, message, details = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(details && { details })
  });
};

/**
 * Standard success response
 */
const successResponse = (res, data, message = 'Success') => {
  return res.json({
    success: true,
    message,
    data
  });
};

// ===========================
// EXPORTS
// ===========================

module.exports = {
  // User Management
  generateUserId,
  
  // Payment
  generatePaymentQR,
  generateTransactionId,
  formatCurrency,
  
  // Certificate
  generateCertificateNumber,
  generateCertificate,
  
  // Progress
  calculateProgress,
  calculateScore,
  checkCertificateEligibility,
  
  // Task
  calculateUnlockTime,
  isTaskUnlocked,
  validateGithubUrl,
  
  // File
  sanitizeFilename,
  getFileExtension,
  isAllowedFileType,
  formatFileSize,
  
  // Date & Time
  formatDate,
  formatDateTime,
  getRelativeTime,
  
  // Pagination
  paginate,
  getPaginationInfo,
  
  // Validation
  isValidEmail,
  isValidIndianPhone,
  isStrongPassword,
  
  // Security
  generateOTP,
  generateRandomString,
  
  // Audit
  createAuditLog,
  
  // String
  truncateString,
  slugify,
  capitalize,
  
  // Array
  removeDuplicates,
  shuffleArray,
  
  // Notification
  createNotification,
  
  // Response
  errorResponse,
  successResponse
};
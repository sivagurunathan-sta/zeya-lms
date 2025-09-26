const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Handle validation errors
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const extractedErrors = {};
    errors.array().forEach(error => {
      extractedErrors[error.path] = error.msg;
    });
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: extractedErrors
    });
  }
  
  next();
};

// User validation rules
const validateUser = [
  body('userId')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('User ID must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('User ID can only contain letters, numbers, and underscores')
    .toLowerCase(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('profile.firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  
  body('profile.lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  
  body('profile.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('profile.phone')
    .optional()
    .isMobilePhone(['en-IN'])
    .withMessage('Please provide a valid Indian phone number'),
  
  body('role')
    .optional()
    .isIn(['admin', 'student'])
    .withMessage('Role must be either admin or student')
];

// Login validation
const validateLogin = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('User ID or email is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Task validation rules for 35-day internship program
const validateTask = [
  body('taskNumber')
    .isInt({ min: 1, max: 35 })
    .withMessage('Task number must be between 1 and 35'),
  
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Task title must be between 5 and 200 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 20, max: 5000 })
    .withMessage('Task description must be between 20 and 5000 characters'),
  
  body('instructions')
    .trim()
    .isLength({ min: 20, max: 10000 })
    .withMessage('Task instructions must be between 20 and 10000 characters'),
  
  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard'),
  
  body('estimatedTime')
    .optional()
    .isFloat({ min: 0.5, max: 24 })
    .withMessage('Estimated time must be between 0.5 and 24 hours'),
  
  body('category')
    .isIn(['frontend', 'backend', 'fullstack', 'database', 'api', 'testing', 'deployment'])
    .withMessage('Category must be one of: frontend, backend, fullstack, database, api, testing, deployment'),
  
  body('prerequisites')
    .optional()
    .isArray()
    .withMessage('Prerequisites must be an array of task numbers'),
  
  body('prerequisites.*')
    .optional()
    .isInt({ min: 1, max: 35 })
    .withMessage('Each prerequisite must be a valid task number (1-35)')
];

// Submission validation for GitHub repo links
const validateSubmission = [
  body('githubRepo')
    .trim()
    .isURL()
    .withMessage('Please provide a valid GitHub repository URL')
    .custom((value) => {
      if (!value.includes('github.com')) {
        throw new Error('URL must be a GitHub repository link');
      }
      return true;
    }),
  
  body('submissionText')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Submission description cannot exceed 2000 characters'),
  
  body('completionTime')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Completion time must be a positive number'),
];

// Announcement validation
const validateAnnouncement = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Announcement title must be between 5 and 200 characters'),
  
  body('message')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Announcement message must be between 10 and 5000 characters'),
  
  body('recipients.type')
    .isIn(['all', 'specific', 'course', 'role'])
    .withMessage('Recipient type must be all, specific, course, or role'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent'),
  
  body('category')
    .optional()
    .isIn(['general', 'academic', 'technical', 'maintenance', 'event'])
    .withMessage('Category must be one of the predefined categories'),
  
  body('scheduledFor')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be a valid ISO 8601 date'),
  
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expiration date must be a valid ISO 8601 date')
];

// Progress validation
const validateProgress = [
  body('progressPercentage')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Progress percentage must be between 0 and 100'),
  
  body('timeSpent')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Time spent must be a positive number'),
  
  body('score')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Score must be between 0 and 100')
];

// Certificate validation
const validateCertificate = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid user ID format');
      }
      return true;
    }),
  
  body('finalScore')
    .isFloat({ min: 75, max: 100 })
    .withMessage('Final score must be between 75 and 100 to be eligible for certificate')
];

// Payment validation
const validatePayment = [
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Payment amount must be positive'),
  
  body('currency')
    .optional()
    .isIn(['INR', 'USD'])
    .withMessage('Currency must be INR or USD'),
  
  body('paymentMethod')
    .optional()
    .isIn(['razorpay', 'stripe', 'paypal'])
    .withMessage('Invalid payment method')
];

// ObjectId validation helper
const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error(`${paramName} must be a valid MongoDB ObjectId`);
      }
      return true;
    })
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('sortBy')
    .optional()
    .isString()
    .trim()
    .withMessage('SortBy must be a string'),
  
  query('order')
    .optional()
    .isIn(['asc', 'desc', 'ascending', 'descending', '1', '-1'])
    .withMessage('Order must be asc/desc or ascending/descending or 1/-1')
];

// Search validation
const validateSearch = [
  query('search')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters')
    .escape(), // Prevent XSS
  
  query('category')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category filter must be between 2 and 50 characters'),
  
  query('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard', 'beginner', 'intermediate', 'advanced'])
    .withMessage('Difficulty filter must be a valid difficulty level'),
  
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'completed', 'pending', 'approved', 'rejected'])
    .withMessage('Status filter must be a valid status')
];

// File validation
const validateFile = [
  body('fileType')
    .optional()
    .isIn(['image', 'document', 'video', 'archive'])
    .withMessage('File type must be image, document, video, or archive'),
  
  body('maxSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Max file size must be between 1 and 100 MB')
];

// Email validation
const validateEmail = [
  body('to')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid recipient email'),
  
  body('subject')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Email subject must be between 5 and 200 characters'),
  
  body('body')
    .trim()
    .isLength({ min: 20, max: 10000 })
    .withMessage('Email body must be between 20 and 10000 characters'),
  
  body('template')
    .optional()
    .isIn(['welcome', 'task_reminder', 'certificate', 'payment_confirmation'])
    .withMessage('Invalid email template')
];

// Sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Remove any potential script tags and dangerous characters
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+=/gi, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  
  next();
};

// Custom validation for internship program specifics
const validateInternshipEnrollment = [
  body('hasCompletedPrerequisites')
    .optional()
    .isBoolean()
    .withMessage('Prerequisites completion status must be boolean'),
  
  body('agreedToTerms')
    .isBoolean()
    .custom((value) => {
      if (!value) {
        throw new Error('You must agree to terms and conditions');
      }
      return true;
    }),
  
  body('paymentConfirmed')
    .optional()
    .isBoolean()
    .withMessage('Payment confirmation status must be boolean')
];

module.exports = {
  handleValidation,
  validateUser,
  validateLogin,
  validateTask,
  validateSubmission,
  validateAnnouncement,
  validateProgress,
  validateCertificate,
  validatePayment,
  validateObjectId,
  validatePagination,
  validateSearch,
  validateFile,
  validateEmail,
  validateInternshipEnrollment,
  sanitizeInput
};
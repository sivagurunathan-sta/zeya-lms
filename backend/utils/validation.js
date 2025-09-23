const joi = require('joi');
const { ObjectId } = require('mongodb');

// Custom validation functions
const customValidators = {
  // Validate MongoDB ObjectId
  objectId: (value, helpers) => {
    if (!ObjectId.isValid(value)) {
      return helpers.error('any.invalid');
    }
    return value;
  },

  // Validate Indian phone number
  indianPhone: (value, helpers) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(value.replace(/\D/g, ''))) {
      return helpers.error('any.invalid');
    }
    return value;
  },

  // Validate strong password
  strongPassword: (value, helpers) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumbers = /\d/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

    if (value.length < minLength) {
      return helpers.error('password.minLength', { minLength });
    }
    if (!hasUpperCase) {
      return helpers.error('password.upperCase');
    }
    if (!hasLowerCase) {
      return helpers.error('password.lowerCase');
    }
    if (!hasNumbers) {
      return helpers.error('password.numbers');
    }
    if (!hasSpecialChar) {
      return helpers.error('password.specialChar');
    }
    return value;
  }
};

// Extend Joi with custom validators
const extendedJoi = joi.extend(
  {
    type: 'objectId',
    base: joi.string(),
    messages: {
      'any.invalid': 'Invalid ObjectId format'
    },
    validate: customValidators.objectId
  },
  {
    type: 'indianPhone',
    base: joi.string(),
    messages: {
      'any.invalid': 'Invalid Indian phone number format'
    },
    validate: customValidators.indianPhone
  },
  {
    type: 'strongPassword',
    base: joi.string(),
    messages: {
      'password.minLength': 'Password must be at least {{#minLength}} characters long',
      'password.upperCase': 'Password must contain at least one uppercase letter',
      'password.lowerCase': 'Password must contain at least one lowercase letter',
      'password.numbers': 'Password must contain at least one number',
      'password.specialChar': 'Password must contain at least one special character'
    },
    validate: customValidators.strongPassword
  }
);

// Common validation schemas
const commonSchemas = {
  // Email validation
  email: extendedJoi.string().email().lowercase().required(),
  optionalEmail: extendedJoi.string().email().lowercase().optional(),

  // Password validation
  password: extendedJoi.strongPassword().required(),
  optionalPassword: extendedJoi.strongPassword().optional(),

  // Phone validation
  phone: extendedJoi.indianPhone().required(),
  optionalPhone: extendedJoi.indianPhone().optional(),

  // ObjectId validation
  objectId: extendedJoi.objectId().required(),
  optionalObjectId: extendedJoi.objectId().optional(),

  // Name validation
  name: extendedJoi.string().min(2).max(50).pattern(/^[a-zA-Z\s]+$/).required(),
  optionalName: extendedJoi.string().min(2).max(50).pattern(/^[a-zA-Z\s]+$/).optional(),

  // URL validation
  url: extendedJoi.string().uri().optional(),
  
  // GitHub URL validation
  githubUrl: extendedJoi.string().uri().pattern(/^https:\/\/github\.com\//).optional(),

  // Price validation
  price: extendedJoi.number().positive().precision(2).required(),
  optionalPrice: extendedJoi.number().positive().precision(2).optional(),

  // Duration validation (in weeks)
  duration: extendedJoi.number().integer().min(1).max(52).required(),
  optionalDuration: extendedJoi.number().integer().min(1).max(52).optional(),

  // Percentage validation
  percentage: extendedJoi.number().min(0).max(100).required(),
  optionalPercentage: extendedJoi.number().min(0).max(100).optional(),

  // Grade validation (0-10)
  grade: extendedJoi.number().min(0).max(10).precision(1).optional(),

  // Text validation
  shortText: extendedJoi.string().min(3).max(200).required(),
  mediumText: extendedJoi.string().min(10).max(1000).required(),
  longText: extendedJoi.string().min(10).max(5000).required(),
  optionalShortText: extendedJoi.string().min(3).max(200).optional(),
  optionalMediumText: extendedJoi.string().min(10).max(1000).optional(),
  optionalLongText: extendedJoi.string().min(10).max(5000).optional(),

  // Array validations
  stringArray: extendedJoi.array().items(extendedJoi.string().min(1)).default([]),
  urlArray: extendedJoi.array().items(extendedJoi.string().uri()).default([]),

  // Date validations
  pastDate: extendedJoi.date().max('now').required(),
  futureDate: extendedJoi.date().min('now').required(),
  optionalPastDate: extendedJoi.date().max('now').optional(),
  optionalFutureDate: extendedJoi.date().min('now').optional(),

  // Pagination
  page: extendedJoi.number().integer().min(1).default(1),
  limit: extendedJoi.number().integer().min(1).max(100).default(10),
  sortOrder: extendedJoi.string().valid('asc', 'desc').default('desc'),

  // Role validation
  role: extendedJoi.string().valid('STUDENT', 'ADMIN').default('STUDENT'),

  // Status validations
  userStatus: extendedJoi.boolean().default(true),
  enrollmentStatus: extendedJoi.string().valid('ACTIVE', 'COMPLETED', 'CANCELLED').default('ACTIVE'),
  paymentStatus: extendedJoi.string().valid('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED').default('PENDING'),
  taskStatus: extendedJoi.string().valid('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_REVISION').required(),

  // Difficulty levels
  difficulty: extendedJoi.string().valid('BEGINNER', 'INTERMEDIATE', 'ADVANCED').default('BEGINNER'),

  // Notification types
  notificationType: extendedJoi.string().valid('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'WELCOME', 'ENROLLMENT', 'PAYMENT', 'TASK_SUBMISSION', 'TASK_REVIEW', 'CERTIFICATE', 'REMINDER', 'DEADLINE', 'SYSTEM').default('INFO')
};

// User validation schemas
const userSchemas = {
  register: extendedJoi.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    firstName: commonSchemas.name,
    lastName: commonSchemas.name,
    phone: commonSchemas.optionalPhone,
    role: commonSchemas.role
  }),

  login: extendedJoi.object({
    email: commonSchemas.email,
    password: extendedJoi.string().required() // Don't validate strength on login
  }),

  updateProfile: extendedJoi.object({
    firstName: commonSchemas.optionalName,
    lastName: commonSchemas.optionalName,
    phone: commonSchemas.optionalPhone
  }),

  changePassword: extendedJoi.object({
    currentPassword: extendedJoi.string().required(),
    newPassword: commonSchemas.password
  }),

  resetPassword: extendedJoi.object({
    token: extendedJoi.string().required(),
    newPassword: commonSchemas.password
  }),

  requestPasswordReset: extendedJoi.object({
    email: commonSchemas.email
  })
};

// Internship validation schemas
const internshipSchemas = {
  create: extendedJoi.object({
    title: commonSchemas.shortText,
    description: commonSchemas.longText,
    duration: commonSchemas.optionalDuration,
    price: commonSchemas.price,
    maxStudents: extendedJoi.number().integer().min(1).max(1000).default(50),
    totalTasks: extendedJoi.number().integer().min(1).max(100).default(10),
    category: commonSchemas.shortText,
    difficulty: commonSchemas.difficulty,
    requirements: commonSchemas.stringArray,
    outcomes: commonSchemas.stringArray,
    thumbnail: commonSchemas.url
  }),

  update: extendedJoi.object({
    title: commonSchemas.optionalShortText,
    description: commonSchemas.optionalLongText,
    duration: commonSchemas.optionalDuration,
    price: commonSchemas.optionalPrice,
    maxStudents: extendedJoi.number().integer().min(1).max(1000).optional(),
    totalTasks: extendedJoi.number().integer().min(1).max(100).optional(),
    category: commonSchemas.optionalShortText,
    difficulty: extendedJoi.string().valid('BEGINNER', 'INTERMEDIATE', 'ADVANCED').optional(),
    requirements: commonSchemas.stringArray.optional(),
    outcomes: commonSchemas.stringArray.optional(),
    thumbnail: commonSchemas.url,
    isActive: commonSchemas.userStatus.optional()
  }),

  filters: extendedJoi.object({
    category: extendedJoi.string().optional(),
    difficulty: extendedJoi.string().valid('BEGINNER', 'INTERMEDIATE', 'ADVANCED').optional(),
    priceMin: extendedJoi.number().positive().optional(),
    priceMax: extendedJoi.number().positive().optional(),
    search: extendedJoi.string().min(2).max(100).optional(),
    page: commonSchemas.page,
    limit: commonSchemas.limit,
    sortBy: extendedJoi.string().valid('title', 'price', 'duration', 'createdAt', 'enrolledCount').default('createdAt'),
    sortOrder: commonSchemas.sortOrder
  })
};

// Task validation schemas
const taskSchemas = {
  create: extendedJoi.object({
    internshipId: commonSchemas.objectId,
    title: commonSchemas.shortText,
    description: commonSchemas.longText,
    taskOrder: extendedJoi.number().integer().min(1).required(),
    estimatedHours: extendedJoi.number().integer().min(1).max(100).default(8),
    resources: extendedJoi.object().optional(),
    guidelines: commonSchemas.optionalLongText,
    isMandatory: extendedJoi.boolean().default(true)
  }),

  update: extendedJoi.object({
    title: commonSchemas.optionalShortText,
    description: commonSchemas.optionalLongText,
    taskOrder: extendedJoi.number().integer().min(1).optional(),
    estimatedHours: extendedJoi.number().integer().min(1).max(100).optional(),
    resources: extendedJoi.object().optional(),
    guidelines: commonSchemas.optionalLongText,
    isMandatory: extendedJoi.boolean().optional()
  }),

  submit: extendedJoi.object({
    enrollmentId: commonSchemas.objectId,
    submissionText: commonSchemas.optionalLongText,
    fileUrls: commonSchemas.urlArray
  }),

  review: extendedJoi.object({
    status: commonSchemas.taskStatus,
    feedback: commonSchemas.optionalMediumText,
    grade: commonSchemas.grade
  })
};

// Payment validation schemas
const paymentSchemas = {
  createOrder: extendedJoi.object({
    enrollmentId: commonSchemas.objectId
  }),

  verify: extendedJoi.object({
    razorpay_order_id: extendedJoi.string().required(),
    razorpay_payment_id: extendedJoi.string().required(),
    razorpay_signature: extendedJoi.string().required(),
    enrollmentId: commonSchemas.objectId
  }),

  refund: extendedJoi.object({
    paymentId: commonSchemas.objectId,
    refundAmount: commonSchemas.price,
    reason: commonSchemas.mediumText
  })
};

// Notification validation schemas
const notificationSchemas = {
  create: extendedJoi.object({
    userId: commonSchemas.objectId,
    title: commonSchemas.shortText,
    message: commonSchemas.mediumText,
    type: commonSchemas.notificationType,
    metadata: extendedJoi.object().optional()
  }),

  updatePreferences: extendedJoi.object({
    email: extendedJoi.boolean().default(true),
    sms: extendedJoi.boolean().default(true),
    push: extendedJoi.boolean().default(true),
    types: extendedJoi.object({
      ENROLLMENT: extendedJoi.boolean().default(true),
      PAYMENT: extendedJoi.boolean().default(true),
      TASK_REVIEW: extendedJoi.boolean().default(true),
      TASK_SUBMISSION: extendedJoi.boolean().default(true),
      CERTIFICATE: extendedJoi.boolean().default(true),
      REMINDER: extendedJoi.boolean().default(true),
      SYSTEM: extendedJoi.boolean().default(true),
      WELCOME: extendedJoi.boolean().default(true)
    }).default({})
  })
};

// Certificate validation schemas
const certificateSchemas = {
  generate: extendedJoi.object({
    enrollmentId: commonSchemas.objectId
  }),

  verify: extendedJoi.object({
    certificateId: extendedJoi.string().optional(),
    verificationHash: extendedJoi.string().optional()
  }).xor('certificateId', 'verificationHash'),

  revoke: extendedJoi.object({
    reason: commonSchemas.mediumText
  })
};

// File upload validation schemas
const uploadSchemas = {
  fileUpload: extendedJoi.object({
    userId: commonSchemas.objectId,
    fileType: extendedJoi.string().valid('image', 'document', 'video', 'audio', 'archive').required(),
    isPublic: extendedJoi.boolean().default(false),
    metadata: extendedJoi.object().optional()
  })
};

// Analytics validation schemas
const analyticsSchemas = {
  dateRange: extendedJoi.object({
    startDate: extendedJoi.date().optional(),
    endDate: extendedJoi.date().optional(),
    period: extendedJoi.string().valid('day', 'week', 'month', 'year').default('month')
  })
};

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errorMessages
      });
    }

    req.body = value;
    next();
  };
};

// Query parameter validation middleware
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Query validation error',
        errors: errorMessages
      });
    }

    req.query = value;
    next();
  };
};

// Parameter validation middleware
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Parameter validation error',
        errors: errorMessages
      });
    }

    req.params = value;
    next();
  };
};

// Utility functions
const validationUtils = {
  // Validate email format
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Validate phone number format
  isValidPhone: (phone) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
  },

  // Validate ObjectId
  isValidObjectId: (id) => {
    return ObjectId.isValid(id);
  },

  // Validate URL
  isValidUrl: (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  // Validate GitHub URL
  isValidGitHubUrl: (url) => {
    return this.isValidUrl(url) && url.includes('github.com');
  },

  // Validate password strength
  isStrongPassword: (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
  },

  // Sanitize string input
  sanitizeString: (str) => {
    if (typeof str !== 'string') return str;
    return str.trim().replace(/[<>]/g, '');
  },

  // Validate file extension
  isValidFileExtension: (filename, allowedExtensions) => {
    const extension = filename.split('.').pop().toLowerCase();
    return allowedExtensions.includes(`.${extension}`);
  },

  // Validate file size
  isValidFileSize: (fileSize, maxSize) => {
    return fileSize <= maxSize;
  },

  // Validate date range
  isValidDateRange: (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start <= end;
  },

  // Validate pagination parameters
  validatePagination: (page, limit) => {
    const p = parseInt(page) || 1;
    const l = parseInt(limit) || 10;
    return {
      page: Math.max(1, p),
      limit: Math.min(100, Math.max(1, l))
    };
  }
};

// Common parameter schemas
const paramSchemas = {
  objectId: extendedJoi.object({
    id: commonSchemas.objectId
  }),
  
  enrollmentId: extendedJoi.object({
    enrollmentId: commonSchemas.objectId
  }),
  
  taskId: extendedJoi.object({
    taskId: commonSchemas.objectId
  }),
  
  submissionId: extendedJoi.object({
    submissionId: commonSchemas.objectId
  })
};

module.exports = {
  // Joi instance
  joi: extendedJoi,
  
  // Validation schemas
  schemas: {
    user: userSchemas,
    internship: internshipSchemas,
    task: taskSchemas,
    payment: paymentSchemas,
    notification: notificationSchemas,
    certificate: certificateSchemas,
    upload: uploadSchemas,
    analytics: analyticsSchemas,
    common: commonSchemas,
    params: paramSchemas
  },
  
  // Middleware functions
  validate,
  validateQuery,
  validateParams,
  
  // Utility functions
  utils: validationUtils,
  
  // Custom validators (for direct use)
  validators: customValidators
};
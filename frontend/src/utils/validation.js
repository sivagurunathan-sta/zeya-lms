// src/utils/validation.js
import { VALIDATION_RULES } from './constants';

/**
 * Validation error class
 */
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Validate required field
 */
export const validateRequired = (value, fieldName = 'Field') => {
  if (value === null || value === undefined || value === '') {
    throw new ValidationError(`${fieldName} is required`, fieldName.toLowerCase());
  }
  return true;
};

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  if (!email) {
    throw new ValidationError('Email is required', 'email');
  }
  
  if (email.length > VALIDATION_RULES.EMAIL.MAX_LENGTH) {
    throw new ValidationError(`Email must be less than ${VALIDATION_RULES.EMAIL.MAX_LENGTH} characters`, 'email');
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Please enter a valid email address', 'email');
  }
  
  return true;
};

/**
 * Validate password
 */
export const validatePassword = (password) => {
  if (!password) {
    throw new ValidationError('Password is required', 'password');
  }
  
  if (password.length < VALIDATION_RULES.PASSWORD.MIN_LENGTH) {
    throw new ValidationError(`Password must be at least ${VALIDATION_RULES.PASSWORD.MIN_LENGTH} characters long`, 'password');
  }
  
  if (password.length > VALIDATION_RULES.PASSWORD.MAX_LENGTH) {
    throw new ValidationError(`Password must be less than ${VALIDATION_RULES.PASSWORD.MAX_LENGTH} characters long`, 'password');
  }
  
  if (VALIDATION_RULES.PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    throw new ValidationError('Password must contain at least one uppercase letter', 'password');
  }
  
  if (VALIDATION_RULES.PASSWORD.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    throw new ValidationError('Password must contain at least one lowercase letter', 'password');
  }
  
  if (VALIDATION_RULES.PASSWORD.REQUIRE_NUMBERS && !/\d/.test(password)) {
    throw new ValidationError('Password must contain at least one number', 'password');
  }
  
  if (VALIDATION_RULES.PASSWORD.REQUIRE_SYMBOLS && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    throw new ValidationError('Password must contain at least one special character', 'password');
  }
  
  return true;
};

/**
 * Validate password confirmation
 */
export const validatePasswordConfirmation = (password, confirmPassword) => {
  if (!confirmPassword) {
    throw new ValidationError('Please confirm your password', 'confirmPassword');
  }
  
  if (password !== confirmPassword) {
    throw new ValidationError('Passwords do not match', 'confirmPassword');
  }
  
  return true;
};

/**
 * Validate name
 */
export const validateName = (name, fieldName = 'Name') => {
  if (!name) {
    throw new ValidationError(`${fieldName} is required`, fieldName.toLowerCase().replace(' ', ''));
  }
  
  const trimmedName = name.trim();
  
  if (trimmedName.length < VALIDATION_RULES.NAME.MIN_LENGTH) {
    throw new ValidationError(`${fieldName} must be at least ${VALIDATION_RULES.NAME.MIN_LENGTH} characters long`, fieldName.toLowerCase().replace(' ', ''));
  }
  
  if (trimmedName.length > VALIDATION_RULES.NAME.MAX_LENGTH) {
    throw new ValidationError(`${fieldName} must be less than ${VALIDATION_RULES.NAME.MAX_LENGTH} characters long`, fieldName.toLowerCase().replace(' ', ''));
  }
  
  if (!/^[a-zA-Z\s'-]+$/.test(trimmedName)) {
    throw new ValidationError(`${fieldName} can only contain letters, spaces, hyphens, and apostrophes`, fieldName.toLowerCase().replace(' ', ''));
  }
  
  return true;
};

/**
 * Validate phone number
 */
export const validatePhone = (phone, required = false) => {
  if (!phone && !required) {
    return true;
  }
  
  if (!phone && required) {
    throw new ValidationError('Phone number is required', 'phone');
  }
  
  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length < VALIDATION_RULES.PHONE.MIN_LENGTH) {
    throw new ValidationError(`Phone number must be at least ${VALIDATION_RULES.PHONE.MIN_LENGTH} digits`, 'phone');
  }
  
  if (cleanPhone.length > VALIDATION_RULES.PHONE.MAX_LENGTH) {
    throw new ValidationError(`Phone number must be less than ${VALIDATION_RULES.PHONE.MAX_LENGTH} digits`, 'phone');
  }
  
  // Indian phone number validation
  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    throw new ValidationError('Please enter a valid Indian phone number', 'phone');
  }
  
  return true;
};

/**
 * Validate URL
 */
export const validateUrl = (url, required = false, fieldName = 'URL') => {
  if (!url && !required) {
    return true;
  }
  
  if (!url && required) {
    throw new ValidationError(`${fieldName} is required`, fieldName.toLowerCase());
  }
  
  try {
    new URL(url);
    return true;
  } catch {
    throw new ValidationError(`Please enter a valid ${fieldName}`, fieldName.toLowerCase());
  }
};

/**
 * Validate file
 */
export const validateFile = (file, options = {}) => {
  const {
    required = false,
    maxSize = 10 * 1024 * 1024, // 10MB
    allowedTypes = [],
    fieldName = 'File'
  } = options;
  
  if (!file && required) {
    throw new ValidationError(`${fieldName} is required`, fieldName.toLowerCase());
  }
  
  if (!file && !required) {
    return true;
  }
  
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    throw new ValidationError(`${fieldName} size must be less than ${maxSizeMB}MB`, fieldName.toLowerCase());
  }
  
  if (allowedTypes.length > 0) {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      throw new ValidationError(`${fieldName} must be one of: ${allowedTypes.join(', ')}`, fieldName.toLowerCase());
    }
  }
  
  return true;
};

/**
 * Validate number
 */
export const validateNumber = (value, options = {}) => {
  const {
    required = false,
    min = null,
    max = null,
    integer = false,
    fieldName = 'Value'
  } = options;
  
  if ((value === null || value === undefined || value === '') && !required) {
    return true;
  }
  
  if ((value === null || value === undefined || value === '') && required) {
    throw new ValidationError(`${fieldName} is required`, fieldName.toLowerCase());
  }
  
  const numValue = Number(value);
  
  if (isNaN(numValue)) {
    throw new ValidationError(`${fieldName} must be a valid number`, fieldName.toLowerCase());
  }
  
  if (integer && !Number.isInteger(numValue)) {
    throw new ValidationError(`${fieldName} must be a whole number`, fieldName.toLowerCase());
  }
  
  if (min !== null && numValue < min) {
    throw new ValidationError(`${fieldName} must be at least ${min}`, fieldName.toLowerCase());
  }
  
  if (max !== null && numValue > max) {
    throw new ValidationError(`${fieldName} must be at most ${max}`, fieldName.toLowerCase());
  }
  
  return true;
};

/**
 * Validate string length
 */
export const validateStringLength = (value, options = {}) => {
  const {
    required = false,
    minLength = null,
    maxLength = null,
    fieldName = 'Field'
  } = options;
  
  if (!value && !required) {
    return true;
  }
  
  if (!value && required) {
    throw new ValidationError(`${fieldName} is required`, fieldName.toLowerCase());
  }
  
  const trimmedValue = value.trim();
  
  if (minLength !== null && trimmedValue.length < minLength) {
    throw new ValidationError(`${fieldName} must be at least ${minLength} characters long`, fieldName.toLowerCase());
  }
  
  if (maxLength !== null && trimmedValue.length > maxLength) {
    throw new ValidationError(`${fieldName} must be less than ${maxLength} characters long`, fieldName.toLowerCase());
  }
  
  return true;
};

/**
 * Validate array
 */
export const validateArray = (value, options = {}) => {
  const {
    required = false,
    minItems = null,
    maxItems = null,
    fieldName = 'Items'
  } = options;
  
  if (!value && !required) {
    return true;
  }
  
  if (!value && required) {
    throw new ValidationError(`${fieldName} is required`, fieldName.toLowerCase());
  }
  
  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array`, fieldName.toLowerCase());
  }
  
  if (minItems !== null && value.length < minItems) {
    throw new ValidationError(`${fieldName} must have at least ${minItems} item${minItems !== 1 ? 's' : ''}`, fieldName.toLowerCase());
  }
  
  if (maxItems !== null && value.length > maxItems) {
    throw new ValidationError(`${fieldName} must have at most ${maxItems} item${maxItems !== 1 ? 's' : ''}`, fieldName.toLowerCase());
  }
  
  return true;
};

/**
 * Validate form data
 */
export const validateForm = (data, validationRules) => {
  const errors = {};
  
  for (const [field, rules] of Object.entries(validationRules)) {
    try {
      for (const rule of rules) {
        rule(data[field]);
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        errors[field] = error.message;
      } else {
        errors[field] = 'Validation error';
      }
    }
  }
  
  if (Object.keys(errors).length > 0) {
    throw { errors, isValidationError: true };
  }
  
  return true;
};

/**
 * Registration form validation
 */
export const validateRegistrationForm = (data) => {
  const rules = {
    firstName: [
      (value) => validateName(value, 'First name')
    ],
    lastName: [
      (value) => validateName(value, 'Last name')
    ],
    email: [
      (value) => validateEmail(value)
    ],
    password: [
      (value) => validatePassword(value)
    ],
    confirmPassword: [
      (value) => validatePasswordConfirmation(data.password, value)
    ],
    phone: [
      (value) => validatePhone(value, false)
    ]
  };
  
  return validateForm(data, rules);
};

/**
 * Login form validation
 */
export const validateLoginForm = (data) => {
  const rules = {
    email: [
      (value) => validateEmail(value)
    ],
    password: [
      (value) => validateRequired(value, 'Password')
    ]
  };
  
  return validateForm(data, rules);
};

/**
 * Profile form validation
 */
export const validateProfileForm = (data) => {
  const rules = {
    firstName: [
      (value) => validateName(value, 'First name')
    ],
    lastName: [
      (value) => validateName(value, 'Last name')
    ],
    email: [
      (value) => validateEmail(value)
    ],
    phone: [
      (value) => validatePhone(value, false)
    ],
    bio: [
      (value) => validateStringLength(value, { 
        required: false, 
        maxLength: 500, 
        fieldName: 'Bio' 
      })
    ],
    linkedinUrl: [
      (value) => validateUrl(value, false, 'LinkedIn URL')
    ],
    githubUrl: [
      (value) => validateUrl(value, false, 'GitHub URL')
    ]
  };
  
  return validateForm(data, rules);
};

/**
 * Task submission validation
 */
export const validateTaskSubmission = (data) => {
  const rules = {
    submissionText: [
      (value) => validateStringLength(value, {
        required: true,
        minLength: 10,
        maxLength: 5000,
        fieldName: 'Submission text'
      })
    ],
    githubRepoUrl: [
      (value) => validateUrl(value, false, 'GitHub repository URL')
    ]
  };
  
  return validateForm(data, rules);
};

export { ValidationError };
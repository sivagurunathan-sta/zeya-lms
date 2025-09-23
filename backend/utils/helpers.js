const crypto = require('crypto');
const { ObjectId } = require('mongodb');

// Generate random string
const generateRandomString = (length = 10) => {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
};

// Generate random number
const generateRandomNumber = (min = 100000, max = 999999) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Validate ObjectId
const isValidObjectId = (id) => {
  return ObjectId.isValid(id);
};

// Sanitize user data
const sanitizeUser = (user) => {
  if (!user) return null;
  
  const { passwordHash, ...sanitizedUser } = user;
  return {
    ...sanitizedUser,
    id: user._id?.toString() || user.id
  };
};

// Calculate pagination
const calculatePagination = (page, limit, total) => {
  const currentPage = parseInt(page) || 1;
  const perPage = parseInt(limit) || 10;
  const totalPages = Math.ceil(total / perPage);
  const skip = (currentPage - 1) * perPage;

  return {
    page: currentPage,
    limit: perPage,
    total,
    pages: totalPages,
    skip,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1
  };
};

// Format price
const formatPrice = (price, currency = 'INR') => {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  });
  return formatter.format(price);
};

// Calculate progress percentage
const calculateProgress = (completed, total) => {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

// Generate slug from title
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number (Indian format)
const isValidPhone = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

// Generate enrollment ID
const generateEnrollmentId = () => {
  const prefix = 'ENR';
  const timestamp = Date.now().toString().slice(-6);
  const random = generateRandomString(4).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

// Generate certificate ID
const generateCertificateId = () => {
  const prefix = 'CERT';
  const timestamp = Date.now().toString().slice(-6);
  const random = generateRandomString(4).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

// Format date
const formatDate = (date, format = 'long') => {
  const options = {
    short: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    datetime: { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
  };
  
  return new Date(date).toLocaleDateString('en-US', options[format] || options.long);
};

// Calculate age from date
const calculateAge = (birthDate) => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

// Deep clone object
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

// Remove undefined/null values from object
const removeEmpty = (obj) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => 
      value !== null && value !== undefined && value !== ''
    )
  );
};

// Capitalize first letter
const capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Generate OTP
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};

// Mask email for privacy
const maskEmail = (email) => {
  const [username, domain] = email.split('@');
  const maskedUsername = username.slice(0, 2) + '*'.repeat(username.length - 2);
  return `${maskedUsername}@${domain}`;
};

// Mask phone for privacy
const maskPhone = (phone) => {
  return phone.slice(0, 2) + '*'.repeat(phone.length - 4) + phone.slice(-2);
};

module.exports = {
  generateRandomString,
  generateRandomNumber,
  isValidObjectId,
  sanitizeUser,
  calculatePagination,
  formatPrice,
  calculateProgress,
  generateSlug,
  isValidEmail,
  isValidPhone,
  generateEnrollmentId,
  generateCertificateId,
  formatDate,
  calculateAge,
  deepClone,
  removeEmpty,
  capitalize,
  generateOTP,
  maskEmail,
  maskPhone
};
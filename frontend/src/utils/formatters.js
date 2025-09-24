// src/utils/formatters.js
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

/**
 * Date and time formatters
 */
export const date = (dateInput, formatType = 'default') => {
  if (!dateInput) return '';
  
  let parsedDate;
  if (typeof dateInput === 'string') {
    parsedDate = parseISO(dateInput);
  } else {
    parsedDate = dateInput;
  }
  
  if (!isValid(parsedDate)) return '';
  
  const formats = {
    default: 'MMM dd, yyyy',
    short: 'MM/dd/yy',
    long: 'MMMM dd, yyyy',
    time: 'hh:mm a',
    datetime: 'MMM dd, yyyy hh:mm a',
    dayMonth: 'MMM dd',
    monthYear: 'MMM yyyy',
    iso: 'yyyy-MM-dd',
    full: 'EEEE, MMMM dd, yyyy'
  };
  
  return format(parsedDate, formats[formatType] || formats.default);
};

/**
 * Relative time formatter
 */
export const relativeTime = (dateInput) => {
  if (!dateInput) return '';
  
  let parsedDate;
  if (typeof dateInput === 'string') {
    parsedDate = parseISO(dateInput);
  } else {
    parsedDate = dateInput;
  }
  
  if (!isValid(parsedDate)) return '';
  
  return formatDistanceToNow(parsedDate, { addSuffix: true });
};

/**
 * Currency formatter
 */
export const currency = (amount, showSymbol = true) => {
  if (typeof amount !== 'number') return showSymbol ? '₹0' : '0';
  
  const options = {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  };
  
  const formatted = new Intl.NumberFormat('en-IN', options).format(amount);
  
  return showSymbol ? `₹${formatted}` : formatted;
};

/**
 * Number formatter with commas
 */
export const number = (num) => {
  if (typeof num !== 'number') return '0';
  return new Intl.NumberFormat('en-IN').format(num);
};

/**
 * Percentage formatter
 */
export const percentage = (value, decimals = 0) => {
  if (typeof value !== 'number') return '0%';
  return `${value.toFixed(decimals)}%`;
};

/**
 * File size formatter
 */
export const fileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Duration formatter (seconds to human readable)
 */
export const duration = (seconds) => {
  if (!seconds || seconds < 0) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
};

/**
 * Phone number formatter
 */
export const phone = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Indian phone number format
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  
  return phoneNumber;
};

/**
 * Name formatter
 */
export const name = (firstName, lastName) => {
  if (!firstName && !lastName) return '';
  if (!lastName) return firstName;
  if (!firstName) return lastName;
  return `${firstName} ${lastName}`;
};

/**
 * Initials formatter
 */
export const initials = (firstName, lastName) => {
  let result = '';
  
  if (firstName) result += firstName.charAt(0).toUpperCase();
  if (lastName) result += lastName.charAt(0).toUpperCase();
  
  return result || '?';
};

/**
 * Text truncator
 */
export const truncate = (text, maxLength = 100, suffix = '...') => {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  
  return text.substr(0, maxLength).trim() + suffix;
};

/**
 * Capitalize first letter
 */
export const capitalize = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/**
 * Title case formatter
 */
export const titleCase = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  return text.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

/**
 * Snake case to title case
 */
export const snakeToTitle = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .split('_')
    .map(word => capitalize(word))
    .join(' ');
};

/**
 * Camel case to title case
 */
export const camelToTitle = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

/**
 * URL formatter
 */
export const url = (urlString) => {
  if (!urlString || typeof urlString !== 'string') return '';
  
  // Add protocol if missing
  if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
    return `https://${urlString}`;
  }
  
  return urlString;
};

/**
 * Social media URL formatter
 */
export const socialUrl = (platform, username) => {
  if (!username) return '';
  
  const platforms = {
    twitter: `https://twitter.com/${username}`,
    linkedin: `https://linkedin.com/in/${username}`,
    github: `https://github.com/${username}`,
    instagram: `https://instagram.com/${username}`,
    facebook: `https://facebook.com/${username}`
  };
  
  return platforms[platform.toLowerCase()] || '';
};

/**
 * Grade formatter
 */
export const grade = (score, total = 100) => {
  if (typeof score !== 'number') return 'N/A';
  
  const percentage = (score / total) * 100;
  
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C+';
  if (percentage >= 40) return 'C';
  return 'F';
};

/**
 * Status formatter
 */
export const status = (statusValue) => {
  if (!statusValue) return '';
  
  return statusValue
    .toLowerCase()
    .split('_')
    .map(word => capitalize(word))
    .join(' ');
};

/**
 * Priority formatter
 */
export const priority = (priorityValue) => {
  const priorities = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent'
  };
  
  return priorities[priorityValue?.toLowerCase()] || priorityValue || '';
};

/**
 * Array to comma-separated string
 */
export const list = (array, separator = ', ', lastSeparator = ' and ') => {
  if (!Array.isArray(array) || array.length === 0) return '';
  
  if (array.length === 1) return array[0];
  if (array.length === 2) return array.join(lastSeparator);
  
  const lastItem = array[array.length - 1];
  const otherItems = array.slice(0, -1);
  
  return otherItems.join(separator) + lastSeparator + lastItem;
};

/**
 * Object to formatted key-value pairs
 */
export const keyValue = (obj, separator = ': ') => {
  if (!obj || typeof obj !== 'object') return '';
  
  return Object.entries(obj)
    .map(([key, value]) => `${titleCase(key)}${separator}${value}`)
    .join('\n');
};

/**
 * Format address
 */
export const address = (addressObj) => {
  if (!addressObj || typeof addressObj !== 'object') return '';
  
  const { street, city, state, pincode, country } = addressObj;
  const parts = [street, city, state, pincode, country].filter(Boolean);
  
  return parts.join(', ');
};

/**
 * Format progress
 */
export const progress = (current, total, showNumbers = true) => {
  if (typeof current !== 'number' || typeof total !== 'number') return '';
  
  const percent = Math.round((current / total) * 100);
  
  if (showNumbers) {
    return `${current}/${total} (${percent}%)`;
  }
  
  return `${percent}%`;
};

/**
 * Format ordinal numbers (1st, 2nd, 3rd, etc.)
 */
export const ordinal = (num) => {
  if (typeof num !== 'number') return '';
  
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const value = num % 100;
  
  return num + (suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]);
};

// Export all formatters as an object
export const formatters = {
  date,
  relativeTime,
  currency,
  number,
  percentage,
  fileSize,
  duration,
  phone,
  name,
  initials,
  truncate,
  capitalize,
  titleCase,
  snakeToTitle,
  camelToTitle,
  url,
  socialUrl,
  grade,
  status,
  priority,
  list,
  keyValue,
  address,
  progress,
  ordinal
};

export default formatters;
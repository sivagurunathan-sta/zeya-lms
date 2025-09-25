// src/utils/constants.js
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
    ME: '/auth/me'
  },
  INTERNSHIPS: {
    LIST: '/internships',
    DETAIL: '/internships/:id',
    ENROLL: '/internships/:id/enroll',
    MY_ENROLLMENTS: '/internships/my/enrollments',
    CREATE: '/internships',
    UPDATE: '/internships/:id',
    DELETE: '/internships/:id'
  },
  TASKS: {
    LIST: '/tasks',
    DETAIL: '/tasks/:id',
    SUBMIT: '/tasks/:id/submit',
    ENROLLMENT_TASKS: '/tasks/enrollment/:enrollmentId',
    SUBMISSIONS: '/tasks/submissions',
    REVIEW: '/tasks/submissions/:id/review'
  },
  CERTIFICATES: {
    LIST: '/certificates',
    GENERATE: '/certificates/generate/:enrollmentId',
    DOWNLOAD: '/certificates/:id/download',
    VERIFY: '/certificates/:id/verify'
  },
  PAYMENTS: {
    CREATE_ORDER: '/payments/create-order',
    VERIFY: '/payments/verify',
    HISTORY: '/payments/history'
  },
  USERS: {
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    NOTIFICATIONS: '/users/notifications',
    MARK_NOTIFICATION_READ: '/users/notifications/:id/read'
  },
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    STUDENTS: '/admin/students',
    SUBMISSIONS: '/admin/submissions',
    ANALYTICS: '/admin/analytics',
    PAYMENTS: '/admin/payments'
  }
};

export const USER_ROLES = {
  STUDENT: 'STUDENT',
  ADMIN: 'ADMIN',
  INSTRUCTOR: 'INSTRUCTOR'
};

export const ENROLLMENT_STATUS = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  PAUSED: 'PAUSED',
  CANCELLED: 'CANCELLED',
  SUSPENDED: 'SUSPENDED'
};

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED'
};

export const SUBMISSION_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  NEEDS_REVISION: 'NEEDS_REVISION'
};

export const NOTIFICATION_TYPES = {
  TASK_APPROVED: 'TASK_APPROVED',
  TASK_REJECTED: 'TASK_REJECTED',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  CERTIFICATE_READY: 'CERTIFICATE_READY',
  COURSE_ENROLLED: 'COURSE_ENROLLED',
  COURSE_COMPLETED: 'COURSE_COMPLETED',
  DEADLINE_REMINDER: 'DEADLINE_REMINDER',
  SYSTEM_MAINTENANCE: 'SYSTEM_MAINTENANCE'
};

export const COURSE_DIFFICULTY = {
  BEGINNER: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  ADVANCED: 'ADVANCED'
};

export const COURSE_CATEGORIES = [
  'Programming',
  'Design',
  'Marketing',
  'Business',
  'Data Science',
  'Mobile Development',
  'Web Development',
  'DevOps',
  'Cybersecurity',
  'AI/ML',
  'Blockchain',
  'Digital Marketing',
  'Product Management',
  'UI/UX Design'
];

export const TASK_TYPES = {
  VIDEO: 'VIDEO',
  READING: 'READING',
  ASSIGNMENT: 'ASSIGNMENT',
  PROJECT: 'PROJECT',
  QUIZ: 'QUIZ',
  PRACTICAL: 'PRACTICAL'
};

export const FILE_TYPES = {
  IMAGES: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'],
  DOCUMENTS: ['pdf', 'doc', 'docx', 'txt', 'rtf'],
  VIDEOS: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'],
  ARCHIVES: ['zip', 'rar', '7z', 'tar', 'gz']
};

export const MAX_FILE_SIZE = {
  IMAGE: 5 * 1024 * 1024, // 5MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
  VIDEO: 100 * 1024 * 1024, // 100MB
  ARCHIVE: 50 * 1024 * 1024 // 50MB
};

export const PAGINATION = {
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  DEFAULT_PAGE: 1
};

export const TOAST_DURATION = {
  SUCCESS: 3000,
  ERROR: 5000,
  INFO: 4000,
  WARNING: 4000
};

export const VALIDATION_RULES = {
  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: false,
    REQUIRE_LOWERCASE: false,
    REQUIRE_NUMBERS: false,
    REQUIRE_SYMBOLS: false
  },
  EMAIL: {
    MAX_LENGTH: 255
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50
  },
  PHONE: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 15
  }
};

export const LOCAL_STORAGE_KEYS = {
  TOKEN: 'token',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
  THEME: 'theme',
  LANGUAGE: 'language',
  SIDEBAR_COLLAPSED: 'sidebarCollapsed',
  TOUR_COMPLETED: 'tourCompleted'
};

export const SESSION_STORAGE_KEYS = {
  REDIRECT_URL: 'redirectUrl',
  FORM_DATA: 'formData',
  SEARCH_FILTERS: 'searchFilters'
};

export const ROUTES = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password'
  },
  STUDENT: {
    DASHBOARD: '/dashboard',
    INTERNSHIPS: '/internships',
    INTERNSHIP_DETAIL: '/internships/:id',
    COURSES: '/courses',
    TASK_VIEW: '/courses/:enrollmentId/tasks',
    CERTIFICATES: '/certificates',
    PROFILE: '/profile',
    PAYMENT: '/payment/:enrollmentId'
  },
  ADMIN: {
    DASHBOARD: '/admin',
    STUDENTS: '/admin/students',
    INTERNSHIPS: '/admin/internships',
    SUBMISSIONS: '/admin/submissions',
    ANALYTICS: '/admin/analytics',
    PAYMENTS: '/admin/payments'
  }
};

export const COLORS = {
  PRIMARY: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    900: '#1e3a8a'
  },
  SUCCESS: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d'
  },
  WARNING: {
    50: '#fffbeb',
    100: '#fef3c7',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309'
  },
  DANGER: {
    50: '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c'
  },
  GRAY: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827'
  }
};

export const BREAKPOINTS = {
  SM: '640px',
  MD: '768px',
  LG: '1024px',
  XL: '1280px',
  '2XL': '1536px'
};

export const ANIMATIONS = {
  DURATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500
  },
  EASING: {
    EASE_IN: 'cubic-bezier(0.4, 0, 1, 1)',
    EASE_OUT: 'cubic-bezier(0, 0, 0.2, 1)',
    EASE_IN_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)'
  }
};

export const DEFAULT_COURSE_THUMBNAIL = '/assets/images/default-course.jpg';
export const DEFAULT_AVATAR = '/assets/images/default-avatar.jpg';
export const COMPANY_LOGO = '/assets/images/logo.png';

export const SOCIAL_MEDIA_URLS = {
  TWITTER: 'https://twitter.com/studentlms',
  LINKEDIN: 'https://linkedin.com/company/studentlms',
  FACEBOOK: 'https://facebook.com/studentlms',
  INSTAGRAM: 'https://instagram.com/studentlms'
};

export const SUPPORT_URLS = {
  HELP_CENTER: '/help',
  CONTACT: '/contact',
  FAQ: '/faq',
  TERMS: '/terms',
  PRIVACY: '/privacy'
};
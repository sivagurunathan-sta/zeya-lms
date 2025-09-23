import axios from 'axios';

const RESOLVED_API_BASE_URL = (() => {
  const envUrl = process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.trim();
  if (envUrl) return envUrl.replace(/\/$/, '');
  try {
    const meta = document.querySelector('meta[name="api-base-url"]')?.getAttribute('content');
    if (meta) return meta.replace(/\/$/, '');
    return '/api';
  } catch {
    return '/api';
  }
})();

if (process.env.NODE_ENV !== 'production' && !process.env.REACT_APP_API_URL) {
  // eslint-disable-next-line no-console
  console.warn('REACT_APP_API_URL is not set. Falling back to "/api".');
}

const api = axios.create({
  baseURL: RESOLVED_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Demo/mock fallback when REACT_APP_API_URL is not set
const isDemoMode = !process.env.REACT_APP_API_URL;

function mockResponse(config) {
  const path = (config?.url || '').split('?')[0];
  const method = (config?.method || 'get').toLowerCase();

  // Admin: Dashboard
  if (method === 'get' && path === '/admin/dashboard') {
    return {
      stats: { totalStudents: 0, activeCourses: 0, monthlyRevenue: 0, certificatesIssued: 0 },
      recentSubmissions: [],
      recentPayments: [],
      recentEnrollments: [],
      alerts: []
    };
  }

  // Admin: Analytics
  if (method === 'get' && path === '/admin/analytics/revenue') {
    return {
      totalStudents: 0,
      activeInternships: 0,
      monthlyRevenue: 0,
      certificatesIssued: 0,
      revenueData: [],
      enrollmentData: [],
      categoryData: []
    };
  }

  // Admin: Collections
  if (method === 'get' && path === '/admin/internships') {
    return { internships: [], pagination: { page: 1, total: 0, limit: 20 }, stats: { total: 0, active: 0, completed: 0, avgCompletionRate: 0 } };
  }
  if (method === 'get' && path === '/admin/students') {
    return { students: [], pagination: { page: 1, total: 0, limit: 20 } };
  }
  if (method === 'get' && path === '/payments/admin') {
    return { payments: [], pagination: { page: 1, total: 0, limit: 20 } };
  }
  if (method === 'get' && path === '/tasks/admin/pending') {
    return { submissions: [], pagination: { page: 1, total: 0, limit: 20 } };
  }

  // Internships
  if (method === 'get' && path === '/internships') {
    return [];
  }
  if (method === 'get' && path.startsWith('/internships/')) {
    return { id: path.split('/').pop(), title: 'Demo Internship', description: 'Demo description', duration: 0, price: 0 };
  }
  if (method === 'get' && path === '/internships/my/enrollments') {
    return [];
  }
  if (method === 'post' && path.endsWith('/enroll')) {
    return { success: true };
  }

  // Tasks
  if (method === 'get' && path.startsWith('/tasks/')) {
    return [];
  }
  if (method === 'post' && path.includes('/tasks/')) {
    return { success: true };
  }

  // Certificates
  if (method === 'get' && path.startsWith('/certificates')) {
    return [];
  }
  if (method === 'post' && path.startsWith('/certificates')) {
    return { success: true };
  }

  // Payments
  if (method === 'post' && path.startsWith('/payments')) {
    return { success: true };
  }
  if (method === 'get' && path === '/payments/history') {
    return [];
  }

  // Default
  return { success: true };
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isDemoMode && error?.message === 'Network Error') {
      const mock = mockResponse(error.config || {});
      return Promise.resolve({ data: mock, status: 200, statusText: 'OK', headers: {}, config: error.config });
    }
    return Promise.reject(error);
  }
);

export default api;

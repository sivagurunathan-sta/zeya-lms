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

  // Demo in-memory store persisted to localStorage
  const storeKey = 'demo_enrollments';
  const load = () => {
    try { return JSON.parse(localStorage.getItem(storeKey) || '[]'); } catch { return []; }
  };
  const save = (arr) => { try { localStorage.setItem(storeKey, JSON.stringify(arr)); } catch {} };
  const makeId = () => Math.random().toString(36).slice(2, 10);
  const idFromPath = () => path.split('/').filter(Boolean).pop();

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

  // Internships & Enrollments (demo)
  if (method === 'get' && path === '/internships') {
    return [];
  }
  if (method === 'get' && path.startsWith('/internships/')) {
    return { id: idFromPath(), title: 'Demo Internship', description: 'Demo description', duration: 8, price: 0 };
  }
  if (method === 'get' && path === '/internships/my/enrollments') {
    return load();
  }
  if (method === 'get' && path.startsWith('/internships/enrollment/')) {
    const enrollId = idFromPath();
    return load().find(e => e.id === enrollId) || null;
  }
  if (method === 'post' && path.endsWith('/enroll')) {
    const internshipId = idFromPath();
    const now = new Date().toISOString();
    const enrollments = load();
    const enrollment = {
      id: makeId(),
      status: 'ACTIVE',
      enrolledAt: now,
      progressPercentage: 0,
      completedTasks: 0,
      totalTasks: 0,
      paymentStatus: 'PENDING',
      certificateIssued: false,
      tasks: [],
      internship: {
        id: internshipId,
        title: `Course ${internshipId}`,
        duration: 8,
        category: 'General'
      },
      student: {
        firstName: 'Demo',
        lastName: 'User',
        email: 'demo@example.com'
      }
    };
    enrollments.unshift(enrollment);
    save(enrollments);
    return { success: true, enrollment };
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

// In demo mode, short-circuit all requests using a custom adapter to avoid network calls
if (isDemoMode) {
  api.defaults.adapter = async (config) => {
    const data = mockResponse(config);
    return {
      data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
      request: {}
    };
  };
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Fallback to mock on network errors (no response), even if REACT_APP_API_URL is set
    if (!error?.response && error?.config) {
      const mock = mockResponse(error.config || {});
      return Promise.resolve({ data: mock, status: 200, statusText: 'OK', headers: {}, config: error.config });
    }
    return Promise.reject(error);
  }
);

export default api;

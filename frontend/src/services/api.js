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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      if (!window.location.pathname.includes('/auth/login')) {
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

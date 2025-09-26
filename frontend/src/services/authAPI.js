import api from './api';

export const login = (credentials) => {
  const payload = {
    userId: credentials.userId || credentials.email,
    password: credentials.password,
  };
  return api.post('/auth/login', payload).then((res) => ({ data: res.data.data }));
};

export const register = (userData) => {
  return api.post('/auth/register', userData).then((res) => ({ data: res.data.data }));
};

export const getCurrentUser = () => {
  return api.get('/auth/me').then((res) => ({ data: res.data.data }));
};

export const forgotPassword = (email) => {
  return api.post('/auth/forgot-password', { email });
};

export const resetPassword = (token, password) => {
  return api.post('/auth/reset-password', { token, password });
};

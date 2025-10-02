import api from './api';

export const login = (credentials) => {
  // Transform credentials to match backend expectations
  const payload = {
    userIdOrEmail: credentials.userId || credentials.userIdOrEmail,
    password: credentials.password
  };
  
  return api.post('/auth/login', payload)
    .then((res) => {
      // Backend returns { success, message, data: { user, token } }
      return { data: res.data };
    })
    .catch((error) => {
      throw error;
    });
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
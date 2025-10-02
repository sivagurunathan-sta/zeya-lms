import api from './api';

import api from './api';

export const login = (credentials) => {
  // Transform credentials to use 'email' field expected by backend (also supports userId)
  const payload = {
    email: credentials.userId || credentials.userIdOrEmail || credentials.email,
    password: credentials.password
  };

  return api.post('/auth/login', payload)
    .then((res) => {
      // Return object shaped so authSlice expects response.data
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

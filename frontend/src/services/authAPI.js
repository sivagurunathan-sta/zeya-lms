import api from './api';

export const login = async (credentials) => {
  const payload = {
    userId: credentials.userId || credentials.userIdOrEmail || credentials.email,
    password: credentials.password
  };

  const res = await api.post('/auth/login', payload);
  const token = res.data?.token;
  const user = res.data?.user;

  if (token) {
    localStorage.setItem('authToken', token);
    localStorage.setItem('token', token);
  }
  if (user) {
    localStorage.setItem('userData', JSON.stringify(user));
    localStorage.setItem('user', JSON.stringify(user));
  }

  return { token, user, data: res.data };
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

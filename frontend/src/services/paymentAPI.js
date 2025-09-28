import api from './api';

export const createPaymentOrder = (enrollmentId) => api.post('/payments/create-order', { enrollmentId });
export const verifyPayment = (data) => api.post('/payments/verify', data);
export const getPaymentHistory = () => api.get('/payments/history');

export const paymentAPI = {
  createPaymentOrder,
  verifyPayment,
  getPaymentHistory,
};

import api from './api';

export const createPaymentOrder = (enrollmentId) => api.post('/payments/create-order', { enrollmentId });
export const verifyPayment = (data) => api.post('/payments/verify', data);
export const getPaymentHistory = () => api.get('/payments/history');
export const createManualUPIPayment = ({ itemId, amount, type, proof }) => {
  const fd = new FormData();
  fd.append('itemId', itemId);
  fd.append('amount', amount);
  fd.append('type', type || 'certificate');
  if (proof) fd.append('proof', proof);
  return api.post('/payments/manual', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const paymentAPI = {
  createPaymentOrder,
  verifyPayment,
  getPaymentHistory,
  createManualUPIPayment,
};

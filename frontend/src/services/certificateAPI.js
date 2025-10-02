import api from './api';

export const certificateAPI = {
  generateCertificate: (enrollmentId) => api.post(`/certificates/generate/${enrollmentId}`),
  getMyCertificates: () => api.get('/certificates/my'),
  getCertificate: (id) => api.get(`/certificates/${id}`),
  downloadCertificate: (id) => api.get(`/certificates/${id}/download`),
  resendCertificate: (id) => api.post(`/certificates/${id}/resend`),
  verifyCertificate: (hash) => api.get(`/certificates/verify/${hash}`),

  // Admin
  getAll: (params = {}) => api.get('/certificates/admin/all', { params }),
  getAnalytics: (params = {}) => api.get('/certificates/admin/stats', { params }),

  // Convenience methods used by hooks/UI
  checkEligibility: () => api.get('/certificates/my'),
  getCertificates: () => api.get('/certificates/my'),
  getLeaderboard: (limit = 10) => api.get('/certificates/admin/stats', { params: { limit } }),
  previewCertificate: (data) => api.post('/certificates/generate/preview', data),
  shareCertificate: (certificateId, platform) => api.post(`/certificates/${certificateId}/share`, { platform }),
};

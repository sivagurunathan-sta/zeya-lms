import api from './api';

export const adminAPI = {
  // Dashboard
  getDashboard: (period) => api.get('/admin/dashboard', { params: { period } }),

  // Analytics
  getAnalytics: (period) => api.get('/admin/analytics/revenue', { params: { period } }),

  // Students
  getStudents: (params = {}) => api.get('/admin/students', { params }),
  updateStudent: (studentId, data) => api.put(`/admin/students/${studentId}/status`, data),
  suspendStudent: (studentId) => api.put(`/admin/students/${studentId}/status`, { status: 'SUSPENDED' }),

  // Internships (admin listing)
  getInternships: (params = {}) => api.get('/admin/internships', { params }),
  updateInternship: (internshipId, data) => api.put(`/internships/${internshipId}`, data),

  // Payments
  getPayments: (params = {}) => api.get('/payments/admin', { params }),

  // Submissions review
  getSubmissions: (params = {}) => api.get('/tasks/admin/pending', { params }),
  reviewSubmission: (submissionId, data) => api.put(`/tasks/submission/${submissionId}/review`, data),
};

import api from './api';

export const getTasksForEnrollment = (enrollmentId) => api.get(`/tasks/enrollment/${enrollmentId}`);
export const submitTask = (taskId, data) => api.post(`/tasks/${taskId}/submit`, data);
export const getPendingSubmissions = (params = {}) => api.get('/tasks/admin/pending', { params });
export const reviewSubmission = (submissionId, data) => api.put(`/tasks/submission/${submissionId}/review`, data);

export const taskAPI = {
  getTasksForEnrollment,
  submitTask,
  getPendingSubmissions,
  reviewSubmission,
};

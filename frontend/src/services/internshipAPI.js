import api from './api';

export const getInternships = (params = {}) => api.get('/internships', { params });
export const getInternshipById = (id) => api.get(`/internships/${id}`);
export const enrollInternship = (id) => api.post(`/internships/${id}/enroll`);
export const getMyEnrollments = () => api.get('/internships/my/enrollments');
export const createInternship = (data) => api.post('/internships', data);
export const updateInternship = (id, data) => api.put(`/internships/${id}`, data);
export const deleteInternship = (id) => api.delete(`/internships/${id}`);

export const internshipAPI = {
  getInternships,
  getInternshipById,
  enrollInternship,
  getMyEnrollments,
  createInternship,
  updateInternship,
  deleteInternship,
};

// src/services/api.js
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const taskAPI = {
  getTasks: (internshipId) => 
    API.get(`/tasks/internship/${internshipId}/tasks`),
  
  submitTask: (taskId, data) => 
    API.post(`/tasks/tasks/${taskId}/submit`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
};

export const adminAPI = {
  getSubmissions: (params) => 
    API.get('/tasks/admin/submissions', { params }),
  
  reviewSubmission: (submissionId, data) => 
    API.put(`/tasks/admin/submissions/${submissionId}/review`, data),
};
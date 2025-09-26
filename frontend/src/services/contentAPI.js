import api from './api';

export const listContent = () => api.get('/api/content');
export const getContent = (key) => api.get(`/api/content/${encodeURIComponent(key)}`);
export const getManyContent = (keys) => api.get('/api/content/many', { params: { keys: keys.join(',') } });
export const upsertContent = (key, value) => api.put(`/api/content/${encodeURIComponent(key)}`, { value });
export const deleteContent = (key) => api.delete(`/api/content/${encodeURIComponent(key)}`);

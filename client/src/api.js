import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function apiError(err) {
  return err?.response?.data?.message || 'Something went wrong. Please try again.';
}

export default api;

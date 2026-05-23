import axios from 'axios';

// Locally: Vite proxies /api to localhost:5000 (vite.config.js handles this)
// On Vercel: VITE_API_URL = your Railway backend URL e.g. https://econudge-production.up.railway.app
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : '/api'
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('ecotrack_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

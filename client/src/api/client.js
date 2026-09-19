import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rf_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (!error.response) {
      error.message =
        'Cannot reach the API. Start the server (port 5000) and confirm VITE_API_URL=http://localhost:5000/api';
    }
    return Promise.reject(error);
  }
);

export default api;

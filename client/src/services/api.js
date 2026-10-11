import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request interceptor - add token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle token refresh and errors
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const isAuthEndpoint =
      error.config?.url?.includes('/auth/login') ||
      error.config?.url?.includes('/auth/register');

    if (error.response?.status === 401 && !isAuthEndpoint) {
      // Token expired or invalid - try to refresh
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken && !error.config?._retry) {
        error.config._retry = true;
        return api
          .post('/auth/refresh-token', { refreshToken })
          .then((response) => {
            localStorage.setItem('token', response.tokens.token);
            localStorage.setItem('refreshToken', response.tokens.refreshToken);
            // Retry original request
            return api(error.config);
          })
          .catch(() => {
            // Refresh failed - redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
            return Promise.reject(error);
          });
      } else {
        // No refresh token or retry already attempted - redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

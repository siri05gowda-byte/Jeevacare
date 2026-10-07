import api from './api';

export const authService = {
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.tokens) {
      localStorage.setItem('token', response.tokens.token);
      localStorage.setItem('refreshToken', response.tokens.refreshToken);
    }
    return response;
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.tokens) {
      localStorage.setItem('token', response.tokens.token);
      localStorage.setItem('refreshToken', response.tokens.refreshToken);
    }
    return response;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/current-user');
    return response.user;
  },

  refreshToken: async (refreshToken) => {
    const response = await api.post('/auth/refresh-token', { refreshToken });
    if (response.tokens) {
      localStorage.setItem('token', response.tokens.token);
      localStorage.setItem('refreshToken', response.tokens.refreshToken);
    }
    return response;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  getToken: () => {
    return localStorage.getItem('token');
  },
};

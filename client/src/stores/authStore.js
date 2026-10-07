import { create } from 'zustand';
import { authService } from '../services/authService';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  refreshToken: localStorage.getItem('refreshToken') || null,
  isLoading: false,
  error: null,

  // Initialize auth state from storage
  initialize: async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const user = await authService.getCurrentUser();
        set({ user, token, error: null });
      } catch (error) {
        set({ user: null, token: null, refreshToken: null, error: error.message });
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      }
    }
  },

  // Login user
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.login(email, password);
      set({
        user: response.user,
        token: response.tokens.token,
        refreshToken: response.tokens.refreshToken,
        isLoading: false,
        error: null,
      });
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ isLoading: false, error: errorMessage, user: null });
      throw error;
    }
  },

  // Register user
  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.register(userData);
      set({
        user: response.user,
        token: response.tokens.token,
        refreshToken: response.tokens.refreshToken,
        isLoading: false,
        error: null,
      });
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ isLoading: false, error: errorMessage });
      throw error;
    }
  },

  // Logout user
  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
      set({ user: null, token: null, refreshToken: null, isLoading: false, error: null });
    } catch (error) {
      set({ isLoading: false, error: error.message });
    }
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Check if user is authenticated
  isAuthenticated: () => !!get().token,

  // Check if user has specific role
  hasRole: (role) => get().user?.role === role,
}));

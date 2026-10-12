import { create } from 'zustand';
import { authService } from '../services/authService';

const getStoredItem = (key) => {
  try {
    if (typeof localStorage !== 'undefined' && localStorage && typeof localStorage.getItem === 'function') {
      return localStorage.getItem(key);
    }
  } catch {
    // Ignore storage errors in restricted/test environments
  }
  return null;
};

const removeStoredItem = (key) => {
  try {
    if (typeof localStorage !== 'undefined' && localStorage && typeof localStorage.removeItem === 'function') {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage errors in restricted/test environments
  }
};

export const useAuthStore = create((set, get) => ({
  user: null,
  token: getStoredItem('token') || null,
  refreshToken: getStoredItem('refreshToken') || null,
  isLoading: false,
  error: null,

  // Initialize auth state from storage
  initialize: async () => {
    const token = getStoredItem('token');
    if (token) {
      try {
        const user = await authService.getCurrentUser();
        set({ user, token, error: null });
      } catch (error) {
        set({ user: null, token: null, refreshToken: null, error: error.message });
        removeStoredItem('token');
        removeStoredItem('refreshToken');
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
      const errorMessage =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        (error.response?.status === 429 ? 'Too many login attempts. Please wait a few moments and try again.' : null) ||
        error.message;
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
      const status = error.response?.status;
      const serverMessage = error.response?.data?.error?.message || error.response?.data?.message;
      let errorMessage = serverMessage;

      if (!errorMessage) {
        if (status === 429) {
          errorMessage = 'Too many registration attempts. Please wait a few moments and try again.';
        } else if (status === 409) {
          errorMessage = 'An account with this email address already exists. Please log in instead.';
        } else if (status === 403) {
          errorMessage = 'Self-registration for this role is not permitted.';
        } else if (status >= 500) {
          errorMessage = 'Registration service is temporarily unavailable. Please try again later.';
        } else if (!error.response) {
          errorMessage = 'Unable to connect to JeevaCare server. Please check your internet connection.';
        } else {
          errorMessage = 'Registration failed. Please check your details and try again.';
        }
      }

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

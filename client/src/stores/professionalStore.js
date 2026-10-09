import { create } from 'zustand';
import api from '../services/api';

export const useProfessionalStore = create((set, get) => ({
  // Professional data
  professional: null,
  credentials: [],
  facilities: [],
  staffAssignments: [],
  qualifications: [],

  // UI state
  loading: false,
  error: null,
  successMessage: null,

  /**
   * Get professional profile
   */
  loadProfile: async (professionalId) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get(`/professionals/${professionalId}`);
      set({ professional: response, error: null });
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Load professional credentials
   */
  loadCredentials: async (professionalId) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get(`/professionals/${professionalId}/credentials`);
      const credentials = response.credentials || response;
      set({ credentials, error: null });
      return credentials;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Load assigned facilities
   */
  loadFacilities: async (professionalId) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get(`/professionals/${professionalId}/facilities`);
      const facilities = response.facilities || response;
      set({ facilities, error: null });
      return facilities;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Load all professional data
   */
  loadAllProfessionalData: async (professionalId) => {
    set({ loading: true, error: null });
    try {
      const [profile, credentials, facilities] = await Promise.all([
        api.get(`/professionals/${professionalId}`),
        api.get(`/professionals/${professionalId}/credentials`).catch(() => ({ credentials: [] })),
        api.get(`/professionals/${professionalId}/facilities`).catch(() => ({ facilities: [] })),
      ]);

      set({
        professional: profile,
        credentials: credentials.credentials || credentials,
        facilities: facilities.facilities || facilities,
        error: null,
      });
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Update professional profile
   */
  updateProfile: async (professionalId, updates) => {
    set({ loading: true, error: null, successMessage: null });
    try {
      const result = await api.put(`/professionals/${professionalId}`, updates);
      set({ 
        professional: result,
        successMessage: 'Profile updated successfully',
        error: null,
      });
      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Add credential
   */
  addCredential: async (professionalId, credentialData) => {
    set({ loading: true, error: null, successMessage: null });
    try {
      const result = await api.post(`/professionals/${professionalId}/credentials`, credentialData);
      
      set((state) => ({
        credentials: [...state.credentials, result],
        successMessage: 'Credential added successfully',
        error: null,
      }));
      
      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Clear professional data
   */
  clearAll: () => {
    set({
      professional: null,
      credentials: [],
      facilities: [],
      staffAssignments: [],
      qualifications: [],
      error: null,
      successMessage: null,
    });
  },

  /**
   * Clear success message
   */
  clearSuccessMessage: () => set({ successMessage: null }),

  /**
   * Clear error
   */
  clearError: () => set({ error: null }),
}));

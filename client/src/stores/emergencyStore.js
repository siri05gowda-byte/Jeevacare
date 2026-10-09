import { create } from 'zustand';
import { emergencyService } from '../services/emergencyService';

export const useEmergencyStore = create((set, get) => ({
  // Emergency access data
  currentAccess: null,
  accessHistory: [],
  accessStatistics: null,
  emergencySummary: null,

  // Search and identification
  searchResults: [],
  identifiedPatient: null,
  ambiguousMatches: [],

  // UI state
  loading: false,
  error: null,
  successMessage: null,
  accessTimeRemaining: null,

  /**
   * Identify patient by search criteria
   */
  identifyPatient: async (searchCriteria) => {
    set({ loading: true, error: null });
    try {
      const result = await emergencyService.identifyPatient(searchCriteria);
      
      // Handle ambiguous results (multiple potential matches)
      if (result.ambiguous) {
        set({ 
          ambiguousMatches: result.candidates || [],
          error: null,
        });
        return result;
      }

      // Single match found
      if (result.patient) {
        set({ 
          identifiedPatient: result.patient,
          ambiguousMatches: [],
          error: null,
        });
        return result;
      }

      throw new Error('No patient found matching search criteria');
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage, identifiedPatient: null, ambiguousMatches: [] });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Request emergency access for patient
   */
  requestAccess: async (patientId, accessReason, facilityId = null) => {
    set({ loading: true, error: null, successMessage: null });
    try {
      const result = await emergencyService.requestEmergencyAccess(
        patientId,
        accessReason,
        facilityId
      );
      
      set({ 
        currentAccess: result,
        successMessage: 'Emergency access requested successfully',
        error: null,
      });
      
      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage, currentAccess: null });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Load emergency access details
   */
  loadAccessDetails: async (accessId) => {
    set({ loading: true, error: null });
    try {
      const access = await emergencyService.getAccessDetails(accessId);
      set({ currentAccess: access, error: null });
      return access;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Load emergency summary
   */
  loadEmergencySummary: async (accessId, patientId) => {
    set({ loading: true, error: null });
    try {
      const summary = await emergencyService.getEmergencySummary(accessId, patientId);
      set({ emergencySummary: summary, error: null });
      return summary;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Revoke emergency access
   */
  revokeAccess: async (accessId) => {
    set({ loading: true, error: null, successMessage: null });
    try {
      await emergencyService.revokeAccess(accessId);
      set({ 
        currentAccess: null,
        successMessage: 'Emergency access revoked successfully',
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
   * Load access history
   */
  loadAccessHistory: async (patientId, filters = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await emergencyService.getAccessHistory(patientId, filters);
      const history = response.history || response;
      set({ accessHistory: history, error: null });
      return history;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Load access statistics
   */
  loadAccessStatistics: async (patientId) => {
    set({ loading: true, error: null });
    try {
      const stats = await emergencyService.getAccessStatistics(patientId);
      set({ accessStatistics: stats, error: null });
      return stats;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Validate access request
   */
  validateRequest: async (patientId) => {
    try {
      const result = await emergencyService.validateAccessRequest(patientId);
      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    }
  },

  /**
   * Clear identified patient
   */
  clearIdentification: () => {
    set({
      identifiedPatient: null,
      ambiguousMatches: [],
      searchResults: [],
      error: null,
    });
  },

  /**
   * Clear current access
   */
  clearCurrentAccess: () => {
    set({
      currentAccess: null,
      emergencySummary: null,
      accessTimeRemaining: null,
    });
  },

  /**
   * Clear all emergency data
   */
  clearAll: () => {
    set({
      currentAccess: null,
      accessHistory: [],
      accessStatistics: null,
      emergencySummary: null,
      searchResults: [],
      identifiedPatient: null,
      ambiguousMatches: [],
      loading: false,
      error: null,
      successMessage: null,
      accessTimeRemaining: null,
    });
  },

  /**
   * Set access time remaining
   */
  setAccessTimeRemaining: (timeRemaining) => {
    set({ accessTimeRemaining: timeRemaining });
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

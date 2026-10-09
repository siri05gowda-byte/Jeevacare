import { create } from 'zustand';
import { auditService } from '../services/auditService';

export const useAuditStore = create((set, get) => ({
  // Audit data
  auditTrail: [],
  userAuditTrail: [],
  auditStatistics: null,
  accessAuditTrail: [],

  // UI state
  loading: false,
  error: null,

  /**
   * Load patient audit trail
   */
  loadPatientAuditTrail: async (patientId, filters = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await auditService.getPatientAuditTrail(patientId, filters);
      const trail = response.events || response;
      set({ auditTrail: trail, error: null });
      return trail;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Load user audit trail
   */
  loadUserAuditTrail: async (userId, filters = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await auditService.getUserAuditTrail(userId, filters);
      const trail = response.events || response;
      set({ userAuditTrail: trail, error: null });
      return trail;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Load audit statistics
   */
  loadAuditStatistics: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const stats = await auditService.getAuditStatistics(filters);
      set({ auditStatistics: stats, error: null });
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
   * Load access audit trail
   */
  loadAccessAuditTrail: async (patientId, filters = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await auditService.getAccessAuditTrail(patientId, filters);
      const trail = response.events || response;
      set({ accessAuditTrail: trail, error: null });
      return trail;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Export audit trail to CSV
   */
  exportAuditTrail: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const blob = await auditService.exportAuditTrail(filters);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-trail-${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      return blob;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Clear all audit data
   */
  clearAll: () => {
    set({
      auditTrail: [],
      userAuditTrail: [],
      auditStatistics: null,
      accessAuditTrail: [],
      error: null,
    });
  },

  /**
   * Clear error
   */
  clearError: () => set({ error: null }),
}));

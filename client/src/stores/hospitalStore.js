import { create } from 'zustand';
import { hospitalService } from '../services/hospitalService';

export const useHospitalStore = create((set, get) => ({
  // Facility data
  facilities: [],
  facilityDetails: null,
  facilityStaff: [],
  encounters: [],
  encounterDetails: null,
  checkInHistory: [],
  queuePosition: null,
  queueStats: null,

  // UI state
  loading: false,
  error: null,

  /**
   * Search facilities
   */
  searchFacilities: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await hospitalService.searchFacilities(filters);
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
   * Load facility details
   */
  loadFacilityDetails: async (facilityId) => {
    set({ loading: true, error: null });
    try {
      const details = await hospitalService.getFacilityDetails(facilityId);
      set({ facilityDetails: details, error: null });
      return details;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Load facility staff
   */
  loadFacilityStaff: async (facilityId, filters = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await hospitalService.getFacilityStaff(facilityId, filters);
      const staff = response.staff || response;
      set({ facilityStaff: staff, error: null });
      return staff;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Load encounters
   */
  loadEncounters: async (patientId, facilityId = null) => {
    set({ loading: true, error: null });
    try {
      const response = await hospitalService.getEncounters(patientId, facilityId);
      const encounters = response.encounters || response;
      set({ encounters, error: null });
      return encounters;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Load encounter details
   */
  loadEncounterDetails: async (encounterId) => {
    set({ loading: true, error: null });
    try {
      const details = await hospitalService.getEncounterDetails(encounterId);
      set({ encounterDetails: details, error: null });
      return details;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Check in patient
   */
  checkInPatient: async (patientId, facilityId, visitReason) => {
    set({ loading: true, error: null });
    try {
      const result = await hospitalService.checkIn(patientId, facilityId, visitReason);
      set({ error: null });
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
   * Load check-in history
   */
  loadCheckInHistory: async (patientId, filters = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await hospitalService.getCheckInHistory(patientId, filters);
      const history = response.history || response;
      set({ checkInHistory: history, error: null });
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
   * Load queue position
   */
  loadQueuePosition: async (patientId, facilityId) => {
    set({ loading: true, error: null });
    try {
      const position = await hospitalService.getQueuePosition(patientId, facilityId);
      set({ queuePosition: position, error: null });
      return position;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Load queue statistics
   */
  loadQueueStats: async (facilityId) => {
    set({ loading: true, error: null });
    try {
      const stats = await hospitalService.getQueueStats(facilityId);
      set({ queueStats: stats, error: null });
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
   * Clear all facility data
   */
  clearAll: () => {
    set({
      facilities: [],
      facilityDetails: null,
      facilityStaff: [],
      encounters: [],
      encounterDetails: null,
      checkInHistory: [],
      queuePosition: null,
      queueStats: null,
      error: null,
    });
  },

  /**
   * Clear error
   */
  clearError: () => set({ error: null }),
}));

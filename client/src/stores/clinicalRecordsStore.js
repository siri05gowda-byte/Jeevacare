import { create } from 'zustand';
import { clinicalRecordsService } from '../services/clinicalRecordsService';

export const useClinicalRecordsStore = create((set, get) => ({
  // Clinical records data
  records: [],
  recordDetails: null,
  dischargeSummaries: [],
  labResults: [],
  radiologyRecords: [],
  vaccinations: [],

  // UI state
  loading: false,
  error: null,
  successMessage: null,

  /**
   * Load clinical records
   */
  loadRecords: async (patientId, filters = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await clinicalRecordsService.getRecords(patientId, filters);
      const records = response.records || response;
      set({ records, error: null });
      return records;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Load record details
   */
  loadRecordDetails: async (recordId) => {
    set({ loading: true, error: null });
    try {
      const details = await clinicalRecordsService.getRecordDetails(recordId);
      set({ recordDetails: details, error: null });
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
   * Upload clinical record
   */
  uploadRecord: async (patientId, recordData) => {
    set({ loading: true, error: null, successMessage: null });
    try {
      const result = await clinicalRecordsService.uploadRecord(patientId, recordData);
      set({ 
        successMessage: 'Record uploaded successfully',
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
   * Verify record
   */
  verifyRecord: async (recordId) => {
    set({ loading: true, error: null });
    try {
      const result = await clinicalRecordsService.verifyRecord(recordId);
      
      // Update record in list
      set((state) => ({
        records: state.records.map(r => 
          r._id === recordId ? result : r
        ),
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
   * Load discharge summaries
   */
  loadDischargeSummaries: async (patientId, filters = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await clinicalRecordsService.getDischargeSummaries(patientId, filters);
      const summaries = response.summaries || response;
      set({ dischargeSummaries: summaries, error: null });
      return summaries;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Load lab results
   */
  loadLabResults: async (patientId, filters = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await clinicalRecordsService.getLabResults(patientId, filters);
      const results = response.results || response;
      set({ labResults: results, error: null });
      return results;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Load radiology records
   */
  loadRadiologyRecords: async (patientId, filters = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await clinicalRecordsService.getRadiologyRecords(patientId, filters);
      const records = response.records || response;
      set({ radiologyRecords: records, error: null });
      return records;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Load vaccinations
   */
  loadVaccinations: async (patientId) => {
    set({ loading: true, error: null });
    try {
      const response = await clinicalRecordsService.getVaccinations(patientId);
      const vaccinations = response.vaccinations || response;
      set({ vaccinations, error: null });
      return vaccinations;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Add vaccination
   */
  addVaccination: async (patientId, vaccinationData) => {
    set({ loading: true, error: null, successMessage: null });
    try {
      const result = await clinicalRecordsService.addVaccination(patientId, vaccinationData);
      
      set((state) => ({
        vaccinations: [...state.vaccinations, result],
        successMessage: 'Vaccination recorded successfully',
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
   * Clear all records
   */
  clearAll: () => {
    set({
      records: [],
      recordDetails: null,
      dischargeSummaries: [],
      labResults: [],
      radiologyRecords: [],
      vaccinations: [],
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

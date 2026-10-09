import { create } from 'zustand';
import { patientService } from '../services/patientService';

export const usePatientStore = create((set, get) => ({
  // Patient data
  patient: null,
  stats: null,
  timeline: [],
  medicalSummary: null,
  criticalInfo: null,
  emergencyProfile: null,
  vaccinations: [],
  labResults: [],
  radiology: [],
  dischargeSummaries: [],
  clinicalRecords: [],
  appointments: [],
  encounters: [],
  auditEvents: [],

  // UI state
  loading: false,
  error: null,
  selectedTimelineFilters: {
    startDate: null,
    endDate: null,
    facilityId: null,
    type: null,
    verificationStatus: null,
  },

  /**
   * Load patient profile
   */
  loadPatient: async (patientId) => {
    set({ loading: true, error: null });
    try {
      const patient = await patientService.getProfile(patientId);
      set({ patient, error: null });
      return patient;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage, patient: null });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Load all patient data at once
   */
  loadAllPatientData: async (patientId) => {
    set({ loading: true, error: null });
    try {
      const [
        patient,
        stats,
        timeline,
        medicalSummary,
        criticalInfo,
        emergencyProfile,
      ] = await Promise.all([
        patientService.getProfile(patientId),
        patientService.getStats(patientId).catch(() => ({})),
        patientService.getTimeline(patientId).catch(() => ({ events: [] })),
        patientService.getMedicalSummary(patientId).catch(() => null),
        patientService.getCriticalInfo(patientId).catch(() => ({})),
        patientService.getEmergencyProfile(patientId).catch(() => ({})),
      ]);

      set({
        patient,
        stats: stats.stats || stats,
        timeline: timeline.events || timeline,
        medicalSummary,
        criticalInfo,
        emergencyProfile,
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
   * Load timeline with filters
   */
  loadTimeline: async (patientId, filters = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await patientService.getTimeline(patientId, filters);
      const events = response.events || response;
      set({ timeline: events, selectedTimelineFilters: filters, error: null });
      return events;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Load medical summary
   */
  loadMedicalSummary: async (patientId, language = 'en') => {
    set({ loading: true, error: null });
    try {
      const summary = await patientService.getMedicalSummary(patientId, { language });
      set({ medicalSummary: summary, error: null });
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
   * Load critical information
   */
  loadCriticalInfo: async (patientId) => {
    set({ loading: true, error: null });
    try {
      const criticalInfo = await patientService.getCriticalInfo(patientId);
      set({ criticalInfo, error: null });
      return criticalInfo;
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
    try {
      const response = await patientService.getVaccinations(patientId);
      const vaccinations = response.vaccinations || response;
      set({ vaccinations });
      return vaccinations;
    } catch (error) {
      console.error('Failed to load vaccinations:', error);
    }
  },

  /**
   * Load lab results
   */
  loadLabResults: async (patientId) => {
    try {
      const response = await patientService.getLabResults(patientId);
      const labResults = response.results || response;
      set({ labResults });
      return labResults;
    } catch (error) {
      console.error('Failed to load lab results:', error);
    }
  },

  /**
   * Load radiology records
   */
  loadRadiology: async (patientId) => {
    try {
      const response = await patientService.getRadiology(patientId);
      const radiology = response.records || response;
      set({ radiology });
      return radiology;
    } catch (error) {
      console.error('Failed to load radiology:', error);
    }
  },

  /**
   * Load discharge summaries
   */
  loadDischargeSummaries: async (patientId) => {
    try {
      const response = await patientService.getDischargeSummaries(patientId);
      const dischargeSummaries = response.summaries || response;
      set({ dischargeSummaries });
      return dischargeSummaries;
    } catch (error) {
      console.error('Failed to load discharge summaries:', error);
    }
  },

  /**
   * Load clinical records
   */
  loadClinicalRecords: async (patientId, filters = {}) => {
    try {
      const response = await patientService.getClinicalRecords(patientId, filters);
      const clinicalRecords = response.records || response;
      set({ clinicalRecords });
      return clinicalRecords;
    } catch (error) {
      console.error('Failed to load clinical records:', error);
    }
  },

  /**
   * Load appointments
   */
  loadAppointments: async (patientId, filters = {}) => {
    try {
      const response = await patientService.getAppointments(patientId, filters);
      const appointments = response.appointments || response;
      set({ appointments });
      return appointments;
    } catch (error) {
      console.error('Failed to load appointments:', error);
    }
  },

  /**
   * Update patient profile
   */
  updatePatient: async (patientId, updates) => {
    set({ loading: true, error: null });
    try {
      const updated = await patientService.updateProfile(patientId, updates);
      set({ patient: updated, error: null });
      return updated;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Update emergency profile
   */
  updateEmergencyProfile: async (patientId, profile) => {
    set({ loading: true, error: null });
    try {
      const updated = await patientService.updateEmergencyProfile(patientId, profile);
      set({ emergencyProfile: updated, error: null });
      return updated;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Clear patient data
   */
  clearPatient: () => {
    set({
      patient: null,
      stats: null,
      timeline: [],
      medicalSummary: null,
      criticalInfo: null,
      emergencyProfile: null,
      vaccinations: [],
      labResults: [],
      radiology: [],
      dischargeSummaries: [],
      clinicalRecords: [],
      appointments: [],
      encounters: [],
      auditEvents: [],
      error: null,
    });
  },

  /**
   * Clear error
   */
  clearError: () => set({ error: null }),
}));

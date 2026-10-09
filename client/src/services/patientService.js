import api from './api';

export const patientService = {
  /**
   * Get current patient profile
   */
  getProfile: async (patientId) => {
    const response = await api.get(`/patients/${patientId}`);
    return response;
  },

  /**
   * Get patient timeline (all health events)
   */
  getTimeline: async (patientId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.facilityId) params.append('facilityId', filters.facilityId);
    if (filters.type) params.append('type', filters.type);
    if (filters.verificationStatus) params.append('verificationStatus', filters.verificationStatus);

    const queryString = params.toString();
    const url = `/timeline/patient/${patientId}${queryString ? '?' + queryString : ''}`;
    const response = await api.get(url);
    return response;
  },

  /**
   * Get patient summary statistics
   */
  getStats: async (patientId) => {
    const response = await api.get(`/patients/${patientId}/stats`);
    return response;
  },

  /**
   * Get AI-generated medical summary
   */
  getMedicalSummary: async (patientId, options = {}) => {
    const response = await api.post(`/patients/${patientId}/medical-summary`, {
      language: options.language || 'en',
      includeContext: options.includeContext !== false,
    });
    return response;
  },

  /**
   * Get patient's critical information (for emergency)
   */
  getCriticalInfo: async (patientId) => {
    const response = await api.get(`/patients/${patientId}/critical-info`);
    return response;
  },

  /**
   * Get patient's emergency profile
   */
  getEmergencyProfile: async (patientId) => {
    const response = await api.get(`/patients/${patientId}/emergency-profile`);
    return response;
  },

  /**
   * Update patient profile
   */
  updateProfile: async (patientId, updates) => {
    const response = await api.put(`/patients/${patientId}`, updates);
    return response;
  },

  /**
   * Update emergency profile
   */
  updateEmergencyProfile: async (patientId, profile) => {
    const response = await api.put(`/patients/${patientId}/emergency-profile`, profile);
    return response;
  },

  /**
   * Get vaccinations
   */
  getVaccinations: async (patientId) => {
    const response = await api.get(`/vaccinations/patient/${patientId}`);
    return response;
  },

  /**
   * Get lab results
   */
  getLabResults: async (patientId) => {
    const response = await api.get(`/lab-results/patient/${patientId}`);
    return response;
  },

  /**
   * Get radiology records
   */
  getRadiology: async (patientId) => {
    const response = await api.get(`/radiology/patient/${patientId}`);
    return response;
  },

  /**
   * Get discharge summaries
   */
  getDischargeSummaries: async (patientId) => {
    const response = await api.get(`/discharge-summaries/patient/${patientId}`);
    return response;
  },

  /**
   * Get clinical records
   */
  getClinicalRecords: async (patientId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.verificationStatus) params.append('verificationStatus', filters.verificationStatus);

    const queryString = params.toString();
    const url = `/records/patient/${patientId}${queryString ? '?' + queryString : ''}`;
    const response = await api.get(url);
    return response;
  },

  /**
   * Get appointments
   */
  getAppointments: async (patientId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.facilityId) params.append('facilityId', filters.facilityId);

    const queryString = params.toString();
    const url = `/appointments/patient/${patientId}${queryString ? '?' + queryString : ''}`;
    const response = await api.get(url);
    return response;
  },

  /**
   * Get encounters
   */
  getEncounters: async (patientId) => {
    const response = await api.get(`/encounters/patient/${patientId}`);
    return response;
  },

  /**
   * Get patient's audit events (access history)
   */
  getAuditEvents: async (patientId) => {
    const response = await api.get(`/patients/${patientId}/audit-events`);
    return response;
  },
};

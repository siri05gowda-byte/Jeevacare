import api from './api';

export const emergencyService = {
  /**
   * Identify patient by JeevaId or search criteria
   * Used in emergency access request flow
   */
  identifyPatient: async (searchCriteria) => {
    const response = await api.post('/emergency/identify-patient', searchCriteria);
    return response;
  },

  /**
   * Request emergency access for a patient
   */
  requestEmergencyAccess: async (patientId, accessReason, facilityId = null) => {
    const response = await api.post('/emergency/request-access', {
      patientId,
      accessReason,
      facilityId,
    });
    return response;
  },

  /**
   * Get emergency access details
   */
  getAccessDetails: async (accessId) => {
    const response = await api.get(`/emergency/access/${accessId}`);
    return response;
  },

  /**
   * Get emergency summary for access
   */
  getEmergencySummary: async (accessId, patientId) => {
    const response = await api.get(`/emergency/access/${accessId}/patient/${patientId}/summary`);
    return response;
  },

  /**
   * Revoke emergency access
   */
  revokeAccess: async (accessId) => {
    const response = await api.post(`/emergency/access/${accessId}/revoke`);
    return response;
  },

  /**
   * Get access history for a patient
   */
  getAccessHistory: async (patientId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const queryString = params.toString();
    const url = `/emergency/patient/${patientId}/access-history${queryString ? '?' + queryString : ''}`;
    const response = await api.get(url);
    return response;
  },

  /**
   * Get access statistics
   */
  getAccessStatistics: async (patientId) => {
    const response = await api.get(`/emergency/patient/${patientId}/access-stats`);
    return response;
  },

  /**
   * Check if professional can request access
   */
  validateAccessRequest: async (patientId) => {
    const response = await api.get(`/emergency/validate/${patientId}`);
    return response;
  },
};

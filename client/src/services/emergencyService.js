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

  // ==================== EMERGENCY PROFILE MANAGEMENT ====================

  /**
   * Get emergency profile for a patient
   */
  getEmergencyProfile: async (patientId) => {
    const response = await api.get(`/emergency/profile/${patientId}`);
    return response;
  },

  /**
   * Add allergy to emergency profile
   */
  addAllergy: async (patientId, allergyData) => {
    const response = await api.post(`/emergency/profile/${patientId}/allergies`, allergyData);
    return response;
  },

  /**
   * Add critical condition to emergency profile
   */
  addCondition: async (patientId, conditionData) => {
    const response = await api.post(`/emergency/profile/${patientId}/conditions`, conditionData);
    return response;
  },

  /**
   * Add medication to emergency profile
   */
  addMedication: async (patientId, medicationData) => {
    const response = await api.post(`/emergency/profile/${patientId}/medications`, medicationData);
    return response;
  },

  /**
   * Update blood group
   */
  updateBloodGroup: async (patientId, bloodGroupData) => {
    const response = await api.put(`/emergency/profile/${patientId}/blood-group`, bloodGroupData);
    return response;
  },

  /**
   * Get emergency contacts
   */
  getEmergencyContacts: async (patientId) => {
    const response = await api.get(`/emergency/contacts/${patientId}`);
    return response;
  },

  /**
   * Add emergency contact
   */
  addEmergencyContact: async (patientId, contactData) => {
    const response = await api.post(`/emergency/contacts/${patientId}`, contactData);
    return response;
  },

  // ==================== EMERGENCY TOKEN ENDPOINTS ====================

  /**
   * Generate emergency access token
   */
  generateEmergencyToken: async (patientId) => {
    const response = await api.post(`/emergency/token/${patientId}/generate`);
    return response;
  },

  /**
   * Validate emergency token
   */
  validateEmergencyToken: async (token) => {
    const response = await api.post('/emergency/token/validate', { token });
    return response;
  },

  /**
   * Revoke emergency token
   */
  revokeEmergencyToken: async (patientId, reason = '') => {
    const response = await api.post(`/emergency/token/${patientId}/revoke`, { reason });
    return response;
  },

  /**
   * Get token status
   */
  getTokenStatus: async (patientId) => {
    const response = await api.get(`/emergency/token/${patientId}/status`);
    return response;
  },
};

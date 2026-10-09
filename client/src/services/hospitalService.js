import api from './api';

export const hospitalService = {
  /**
   * Get facility details
   */
  getFacilityDetails: async (facilityId) => {
    const response = await api.get(`/facilities/${facilityId}`);
    return response;
  },

  /**
   * Search facilities by location/specialty
   */
  searchFacilities: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.location) params.append('location', filters.location);
    if (filters.specialty) params.append('specialty', filters.specialty);
    if (filters.name) params.append('name', filters.name);
    if (filters.verificationStatus) params.append('verificationStatus', filters.verificationStatus);

    const queryString = params.toString();
    const url = `/facilities${queryString ? '?' + queryString : ''}`;
    const response = await api.get(url);
    return response;
  },

  /**
   * Get facility staff
   */
  getFacilityStaff: async (facilityId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.specialty) params.append('specialty', filters.specialty);
    if (filters.role) params.append('role', filters.role);

    const queryString = params.toString();
    const url = `/facilities/${facilityId}/staff${queryString ? '?' + queryString : ''}`;
    const response = await api.get(url);
    return response;
  },

  /**
   * Get patient encounters at facility
   */
  getEncounters: async (patientId, facilityId = null) => {
    let url = `/encounters/patient/${patientId}`;
    if (facilityId) {
      url += `?facilityId=${facilityId}`;
    }
    const response = await api.get(url);
    return response;
  },

  /**
   * Get encounter details
   */
  getEncounterDetails: async (encounterId) => {
    const response = await api.get(`/encounters/${encounterId}`);
    return response;
  },

  /**
   * Create check-in
   */
  checkIn: async (patientId, facilityId, visitReason) => {
    const response = await api.post(`/check-in`, {
      patientId,
      facilityId,
      visitReason,
    });
    return response;
  },

  /**
   * Get check-in history
   */
  getCheckInHistory: async (patientId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.facilityId) params.append('facilityId', filters.facilityId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const queryString = params.toString();
    const url = `/check-in/patient/${patientId}${queryString ? '?' + queryString : ''}`;
    const response = await api.get(url);
    return response;
  },

  /**
   * Get patient's current wait queue position
   */
  getQueuePosition: async (patientId, facilityId) => {
    const response = await api.get(`/queue/patient/${patientId}?facilityId=${facilityId}`);
    return response;
  },

  /**
   * Get facility queue statistics
   */
  getQueueStats: async (facilityId) => {
    const response = await api.get(`/queue/facility/${facilityId}/stats`);
    return response;
  },
};

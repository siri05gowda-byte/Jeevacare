import api from './api';

export const clinicalRecordsService = {
  /**
   * Get clinical records for patient
   */
  getRecords: async (patientId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.facilityId) params.append('facilityId', filters.facilityId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.verificationStatus) params.append('verificationStatus', filters.verificationStatus);

    const queryString = params.toString();
    const url = `/records/patient/${patientId}${queryString ? '?' + queryString : ''}`;
    const response = await api.get(url);
    return response;
  },

  /**
   * Get record details
   */
  getRecordDetails: async (recordId) => {
    const response = await api.get(`/records/${recordId}`);
    return response;
  },

  /**
   * Upload clinical record
   */
  uploadRecord: async (patientId, recordData) => {
    const formData = new FormData();
    formData.append('patientId', patientId);
    formData.append('type', recordData.type);
    formData.append('facilityId', recordData.facilityId);
    if (recordData.file) {
      formData.append('file', recordData.file);
    }
    if (recordData.notes) {
      formData.append('notes', recordData.notes);
    }

    const response = await api.post('/records', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response;
  },

  /**
   * Verify clinical record
   */
  verifyRecord: async (recordId) => {
    const response = await api.post(`/records/${recordId}/verify`);
    return response;
  },

  /**
   * Get discharge summaries
   */
  getDischargeSummaries: async (patientId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.facilityId) params.append('facilityId', filters.facilityId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const queryString = params.toString();
    const url = `/discharge-summaries/patient/${patientId}${queryString ? '?' + queryString : ''}`;
    const response = await api.get(url);
    return response;
  },

  /**
   * Get lab results
   */
  getLabResults: async (patientId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.facilityId) params.append('facilityId', filters.facilityId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const queryString = params.toString();
    const url = `/lab-results/patient/${patientId}${queryString ? '?' + queryString : ''}`;
    const response = await api.get(url);
    return response;
  },

  /**
   * Get radiology records
   */
  getRadiologyRecords: async (patientId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.facilityId) params.append('facilityId', filters.facilityId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const queryString = params.toString();
    const url = `/radiology/patient/${patientId}${queryString ? '?' + queryString : ''}`;
    const response = await api.get(url);
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
   * Add vaccination record
   */
  addVaccination: async (patientId, vaccinationData) => {
    const response = await api.post(`/vaccinations`, {
      patientId,
      ...vaccinationData,
    });
    return response;
  },
};

import api from './api';

export const auditService = {
  /**
   * Get audit trail for patient
   */
  getPatientAuditTrail: async (patientId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.action) params.append('action', filters.action);
    if (filters.actorType) params.append('actorType', filters.actorType);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    const queryString = params.toString();
    const url = `/audit/patient/${patientId}${queryString ? '?' + queryString : ''}`;
    const response = await api.get(url);
    return response;
  },

  /**
   * Get audit trail for user/professional
   */
  getUserAuditTrail: async (userId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.action) params.append('action', filters.action);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    const queryString = params.toString();
    const url = `/audit/user/${userId}${queryString ? '?' + queryString : ''}`;
    const response = await api.get(url);
    return response;
  },

  /**
   * Get audit summary statistics
   */
  getAuditStatistics: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const queryString = params.toString();
    const url = `/audit/statistics${queryString ? '?' + queryString : ''}`;
    const response = await api.get(url);
    return response;
  },

  /**
   * Export audit trail to CSV
   */
  exportAuditTrail: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.action) params.append('action', filters.action);

    const queryString = params.toString();
    const url = `/audit/export${queryString ? '?' + queryString : ''}`;
    const response = await api.get(url, {
      responseType: 'blob',
    });
    return response;
  },

  /**
   * Get access audit trail (emergency access)
   */
  getAccessAuditTrail: async (patientId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const queryString = params.toString();
    const url = `/audit/access/${patientId}${queryString ? '?' + queryString : ''}`;
    const response = await api.get(url);
    return response;
  },
};

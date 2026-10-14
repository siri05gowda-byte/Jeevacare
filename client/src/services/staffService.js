import api from './api';

export const staffService = {
  /**
   * Invite staff to facility
   * Requires HOSPITAL_ADMIN role
   */
  inviteStaff: async (inviteData) => {
    const response = await api.post('/staff/invite', inviteData);
    return response;
  },

  /**
   * Approve pending staff association
   * Requires HOSPITAL_ADMIN role or SYSTEM_ADMIN
   */
  approveStaff: async (staffId, approvalData) => {
    const response = await api.post(`/staff/${staffId}/approve`, approvalData);
    return response;
  },

  /**
   * Reject pending staff association
   * Requires HOSPITAL_ADMIN role or SYSTEM_ADMIN
   */
  rejectStaff: async (staffId, rejectionData) => {
    const response = await api.post(`/staff/${staffId}/reject`, rejectionData);
    return response;
  },

  /**
   * Get staff record by ID
   */
  getStaffRecord: async (staffId) => {
    const response = await api.get(`/staff/${staffId}`);
    return response;
  },

  /**
   * Get all active staff at facility
   * Requires HOSPITAL_ADMIN role
   */
  getFacilityStaff: async (hospitalId) => {
    const response = await api.get(`/staff/facility/${hospitalId}`);
    return response;
  },

  /**
   * Get user's staff records (multi-facility)
   */
  getUserStaffRecords: async (userId) => {
    const response = await api.get(`/staff/user/${userId}/records`);
    return response;
  },

  /**
   * Get user's active staff records
   */
  getUserActiveStaffRecords: async (userId) => {
    const response = await api.get(`/staff/user/${userId}/active`);
    return response;
  },

  /**
   * Get pending staff associations (SYSTEM_ADMIN only)
   */
  getPendingAssociations: async () => {
    const response = await api.get('/staff/pending-associations');
    return response;
  },

  /**
   * Suspend staff association
   */
  suspendStaff: async (staffId, suspensionData) => {
    const response = await api.post(`/staff/${staffId}/suspend`, suspensionData);
    return response;
  },

  /**
   * Reactivate suspended staff
   */
  reactivateStaff: async (staffId) => {
    const response = await api.post(`/staff/${staffId}/reactivate`);
    return response;
  },

  /**
   * Search registered users for staff invitation
   */
  searchUsers: async (query, role) => {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (role) params.append('role', role);
    const response = await api.get(`/staff/search-users?${params.toString()}`);
    return response;
  },

  /**
   * Search facilities
   */
  searchFacilities: async (query) => {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    const response = await api.get(`/staff/search-facilities?${params.toString()}`);
    return response;
  },
};

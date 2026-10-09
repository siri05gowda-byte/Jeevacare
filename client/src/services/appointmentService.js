import api from './api';

export const appointmentService = {
  /**
   * Book an appointment
   */
  bookAppointment: async (appointmentData) => {
    const response = await api.post('/appointments', appointmentData);
    return response;
  },

  /**
   * Get patient appointments
   */
  getPatientAppointments: async (patientId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.facilityId) params.append('facilityId', filters.facilityId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const queryString = params.toString();
    const url = `/appointments/patient/${patientId}${queryString ? '?' + queryString : ''}`;
    const response = await api.get(url);
    return response;
  },

  /**
   * Get doctor appointments
   */
  getDoctorAppointments: async (doctorId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.date) params.append('date', filters.date);
    if (filters.facilityId) params.append('facilityId', filters.facilityId);

    const queryString = params.toString();
    const url = `/appointments/doctor/${doctorId}${queryString ? '?' + queryString : ''}`;
    const response = await api.get(url);
    return response;
  },

  /**
   * Get appointment details
   */
  getAppointmentDetails: async (appointmentId) => {
    const response = await api.get(`/appointments/${appointmentId}`);
    return response;
  },

  /**
   * Cancel appointment
   */
  cancelAppointment: async (appointmentId, reason) => {
    const response = await api.post(`/appointments/${appointmentId}/cancel`, { reason });
    return response;
  },

  /**
   * Reschedule appointment
   */
  rescheduleAppointment: async (appointmentId, newSchedule) => {
    const response = await api.post(`/appointments/${appointmentId}/reschedule`, newSchedule);
    return response;
  },

  /**
   * Get available slots
   */
  getAvailableSlots: async (doctorId, facilityId, date) => {
    const params = new URLSearchParams();
    params.append('doctorId', doctorId);
    params.append('facilityId', facilityId);
    params.append('date', date);

    const queryString = params.toString();
    const url = `/appointments/available-slots?${queryString}`;
    const response = await api.get(url);
    return response;
  },
};

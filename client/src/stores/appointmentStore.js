import { create } from 'zustand';
import { appointmentService } from '../services/appointmentService';

export const useAppointmentStore = create((set, get) => ({
  // Appointment data
  appointments: [],
  doctorAppointments: [],
  appointmentDetails: null,
  availableSlots: [],

  // UI state
  loading: false,
  error: null,
  successMessage: null,

  /**
   * Load patient appointments
   */
  loadPatientAppointments: async (patientId, filters = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await appointmentService.getPatientAppointments(patientId, filters);
      const appointments = response.appointments || response;
      set({ appointments, error: null });
      return appointments;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Load doctor appointments
   */
  loadDoctorAppointments: async (doctorId, filters = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await appointmentService.getDoctorAppointments(doctorId, filters);
      const doctorAppointments = response.appointments || response;
      set({ doctorAppointments, error: null });
      return doctorAppointments;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Load appointment details
   */
  loadAppointmentDetails: async (appointmentId) => {
    set({ loading: true, error: null });
    try {
      const details = await appointmentService.getAppointmentDetails(appointmentId);
      set({ appointmentDetails: details, error: null });
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
   * Book appointment
   */
  bookAppointment: async (appointmentData) => {
    set({ loading: true, error: null, successMessage: null });
    try {
      const result = await appointmentService.bookAppointment(appointmentData);
      set({ 
        successMessage: 'Appointment booked successfully',
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
   * Cancel appointment
   */
  cancelAppointment: async (appointmentId, reason) => {
    set({ loading: true, error: null, successMessage: null });
    try {
      await appointmentService.cancelAppointment(appointmentId, reason);
      
      // Remove from appointments list
      set((state) => ({
        appointments: state.appointments.filter(a => a._id !== appointmentId),
        successMessage: 'Appointment cancelled successfully',
        error: null,
      }));
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Reschedule appointment
   */
  rescheduleAppointment: async (appointmentId, newSchedule) => {
    set({ loading: true, error: null, successMessage: null });
    try {
      const result = await appointmentService.rescheduleAppointment(appointmentId, newSchedule);
      
      // Update in appointments list
      set((state) => ({
        appointments: state.appointments.map(a => 
          a._id === appointmentId ? result : a
        ),
        successMessage: 'Appointment rescheduled successfully',
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
   * Load available slots
   */
  loadAvailableSlots: async (doctorId, facilityId, date) => {
    set({ loading: true, error: null });
    try {
      const response = await appointmentService.getAvailableSlots(doctorId, facilityId, date);
      const slots = response.slots || response;
      set({ availableSlots: slots, error: null });
      return slots;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Clear appointments
   */
  clearAppointments: () => {
    set({
      appointments: [],
      doctorAppointments: [],
      appointmentDetails: null,
      availableSlots: [],
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

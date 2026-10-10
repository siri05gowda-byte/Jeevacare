import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Calendar, Clock, MapPin, User, FileText, AlertCircle, CheckCircle, CheckCircle2 } from 'lucide-react';
import PageContainer from '../components/Layout/PageContainer';
import SectionTitle from '../components/Layout/SectionTitle';
import LoadingSkeleton from '../components/State/LoadingSkeleton';
import EmptyState from '../components/State/EmptyState';
import { useToast } from '../components/State/Toast';
import { appointmentService } from '../services/appointmentService';

/**
 * AppointmentBookingPage
 * Allows patients to search for and book appointments with healthcare providers
 */
export default function AppointmentBookingPage() {
  const { user } = useAuthStore();
  const { success, error: showError } = useToast();

  // Booking form state
  const [step, setStep] = useState(1); // 1: Search, 2: Confirm, 3: Success
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form fields
  const [facilityId, setFacilityId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('09:00');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  // Search results
  const [facilities, setFacilities] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);

  // Booked appointment
  const [bookedAppointment, setBookedAppointment] = useState(null);

  const patientId = user?._id || user?.id;
  const token = user?.token || localStorage.getItem('token');

  /**
   * Fetch facilities from real API
   */
  useEffect(() => {
    const loadFacilities = async () => {
      try {
        const response = await fetch('/api/v1/facilities', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setFacilities(Array.isArray(data.data) ? data.data : []);
        } else {
          console.warn('Failed to load facilities, using empty list');
          setFacilities([]);
        }
      } catch (err) {
        console.error('Failed to load facilities:', err);
        setFacilities([]);
      }
    };
    
    if (token) {
      loadFacilities();
    }
  }, [token]);

  /**
   * Fetch doctors for selected facility from real API
   */
  const loadDoctorsForFacility = async (fId) => {
    try {
      const response = await fetch(`/api/v1/facilities/${fId}/doctors`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDoctors(Array.isArray(data.data) ? data.data : []);
      } else {
        console.warn('Failed to load doctors for facility');
        setDoctors([]);
      }
      setDoctorId('');
    } catch (err) {
      console.error('Failed to load doctors:', err);
      setDoctors([]);
    }
  };

  /**
   * Handle facility selection
   */
  const handleFacilityChange = (e) => {
    const fId = e.target.value;
    setFacilityId(fId);
    if (fId) {
      loadDoctorsForFacility(fId);
    }
  };

  /**
   * Handle doctor selection - fetch available slots
   */
  const handleDoctorChange = (e) => {
    const dId = e.target.value;
    setDoctorId(dId);
  };

  /**
   * Load available appointment slots from real API
   */
  const loadAvailableSlots = async () => {
    if (!doctorId || !facilityId || !appointmentDate) {
      showError('Please select facility, doctor, and date');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/v1/appointments/available-slots?providerId=${doctorId}&facilityId=${facilityId}&date=${appointmentDate}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const slots = Array.isArray(data.data) ? data.data : [
          '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
          '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
        ];
        setAvailableSlots(slots);
        setAppointmentTime(slots[0]); // Default to first slot
      } else {
        // Fallback to default slots if API fails
        const defaultSlots = [
          '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
          '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
        ];
        setAvailableSlots(defaultSlots);
        setAppointmentTime(defaultSlots[0]);
      }
    } catch (err) {
      showError('Failed to load available slots');
      // Fallback to default slots
      const defaultSlots = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
      ];
      setAvailableSlots(defaultSlots);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Proceed to confirmation step
   */
  const handleProceedToConfirm = () => {
    if (!facilityId || !doctorId || !appointmentDate || !reason) {
      setError('Please fill in all required fields');
      return;
    }
    setError(null);
    setStep(2);
  };

  /**
   * Book appointment
   */
  const handleBookAppointment = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Combine date and time
      const [year, month, day] = appointmentDate.split('-');
      const [hour, minute] = appointmentTime.split(':');
      const scheduledDateTime = new Date(year, parseInt(month) - 1, day, hour, minute);

      const appointmentData = {
        patientId,
        providerId: doctorId,
        facilityId,
        scheduledDateTime: scheduledDateTime.toISOString(),
        duration: 30, // Default 30 minutes
        reason,
        notes,
      };

      const response = await fetch('/api/v1/appointments/book', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to book appointment');
      }

      const data = await response.json();
      setBookedAppointment(data.data);
      setStep(3);
      success('Appointment booked successfully!');
    } catch (err) {
      setError(err.message);
      showError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Reset form for new booking
   */
  const handleNewBooking = () => {
    setStep(1);
    setFacilityId('');
    setDoctorId('');
    setAppointmentDate('');
    setAppointmentTime('09:00');
    setReason('');
    setNotes('');
    setError(null);
    setBookedAppointment(null);
  };

  return (
    <PageContainer>
      <SectionTitle icon={Calendar} title="Book an Appointment" />

      {/* Step 1: Search & Select */}
      {step === 1 && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Select Healthcare Provider</h2>

            {/* Facility Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin size={16} className="inline mr-2" />
                Healthcare Facility *
              </label>
              <select
                value={facilityId}
                onChange={handleFacilityChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a facility...</option>
                {facilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {facility.name} ({facility.location})
                  </option>
                ))}
              </select>
            </div>

            {/* Doctor Selection */}
            {facilityId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User size={16} className="inline mr-2" />
                  Healthcare Provider *
                </label>
                <select
                  value={doctorId}
                  onChange={handleDoctorChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a provider...</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name} - {doctor.speciality}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Appointment Date */}
            {doctorId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar size={16} className="inline mr-2" />
                  Preferred Date *
                </label>
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            )}

            {/* Appointment Time */}
            {appointmentDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock size={16} className="inline mr-2" />
                  Preferred Time *
                </label>
                <select
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a time slot...</option>
                  {['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'].map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Reason for Appointment */}
            {appointmentTime && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText size={16} className="inline mr-2" />
                  Reason for Visit *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Brief description of your visit reason..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                />
              </div>
            )}

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional information for your provider..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="2"
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-2">
                <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Proceed button */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={handleProceedToConfirm}
                disabled={!facilityId || !doctorId || !appointmentDate || !appointmentTime || !reason || isLoading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : 'Review Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Confirmation */}
      {step === 2 && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Confirm Your Appointment</h2>

            {/* Appointment Summary */}
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div className="flex justify-between items-start">
                <span className="text-gray-600">Facility:</span>
                <span className="font-medium">{facilities.find((f) => f.id === facilityId)?.name}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-gray-600">Provider:</span>
                <span className="font-medium">{doctors.find((d) => d.id === doctorId)?.name}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-gray-600">Speciality:</span>
                <span className="font-medium">{doctors.find((d) => d.id === doctorId)?.speciality}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-gray-600">Date & Time:</span>
                <span className="font-medium">
                  {new Date(`${appointmentDate}T${appointmentTime}`).toLocaleString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium">30 minutes</span>
              </div>
              <div className="border-t pt-4 flex justify-between items-start">
                <span className="text-gray-600">Reason:</span>
                <span className="font-medium text-right max-w-xs">{reason}</span>
              </div>
              {notes && (
                <div className="border-t pt-4 flex justify-between items-start">
                  <span className="text-gray-600">Notes:</span>
                  <span className="text-right max-w-xs">{notes}</span>
                </div>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-2">
                <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={() => setStep(1)}
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleBookAppointment}
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Booking...' : 'Confirm & Book'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Success */}
      {step === 3 && bookedAppointment && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            <div className="text-center">
              <CheckCircle size={48} className="text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900">Appointment Booked!</h2>
              <p className="text-gray-600 mt-2">Your appointment has been successfully scheduled.</p>
            </div>

            {/* Booking Details */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-3">
              <h3 className="font-semibold text-green-900">Booking Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700">Appointment ID:</span>
                  <span className="font-mono text-green-900">{bookedAppointment._id?.substring(0, 12)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Status:</span>
                  <span className="font-medium text-green-900">{bookedAppointment.status || 'Scheduled'}</span>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-3">What to Do Next</h3>
              <ul className="space-y-2 text-sm text-blue-900">
                <li className="flex gap-2">
                  <CheckCircle2 size={18} className="text-blue-600 flex-shrink-0" />
                  <span>Check your email for confirmation and appointment details</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 size={18} className="text-blue-600 flex-shrink-0" />
                  <span>Arrive 10-15 minutes early on the appointment day</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 size={18} className="text-blue-600 flex-shrink-0" />
                  <span>Bring your JeevaCare ID and insurance card if applicable</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 size={18} className="text-blue-600 flex-shrink-0" />
                  <span>Contact the facility if you need to reschedule or cancel</span>
                </li>
              </ul>
            </div>

            {/* Action buttons */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={() => window.location.href = '/patient'}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Back to Dashboard
              </button>
              <button
                onClick={handleNewBooking}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Book Another Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

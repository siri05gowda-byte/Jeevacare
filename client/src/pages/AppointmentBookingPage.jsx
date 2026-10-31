import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Calendar, Clock, MapPin, User, FileText, AlertCircle, CheckCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../components/Layout/PageContainer';
import SectionTitle from '../components/Layout/SectionTitle';
import LoadingSkeleton from '../components/State/LoadingSkeleton';
import EmptyState from '../components/State/EmptyState';
import { useToast, ToastContainer } from '../components/State/Toast';
import { appointmentService } from '../services/appointmentService';
import api from '../services/api';

/**
 * AppointmentBookingPage
 * 
 * Complete patient appointment booking flow.
 * Step 1: Select facility → doctor → date → slot → reason
 * Step 2: Review & confirm
 * Step 3: Booking confirmation with appointment ID
 */
export default function AppointmentBookingPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { toasts, success, error: showError, remove } = useToast();

  // Booking form state
  const [step, setStep] = useState(1); // 1: Search, 2: Confirm, 3: Success
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form fields
  const [facilityId, setFacilityId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  // Data lists
  const [facilities, setFacilities] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoadingFacilities, setIsLoadingFacilities] = useState(true);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Confirmed appointment
  const [bookedAppointment, setBookedAppointment] = useState(null);

  // ── Load facilities on mount ───────────────────────────────────────────────

  useEffect(() => {
    const loadFacilities = async () => {
      setIsLoadingFacilities(true);
      try {
        const response = await api.get('/facilities');
        if (response?.success && Array.isArray(response?.data)) {
          setFacilities(response.data);
        } else {
          setFacilities([]);
        }
      } catch (err) {
        console.error('Failed to load facilities:', err);
        setFacilities([]);
      } finally {
        setIsLoadingFacilities(false);
      }
    };

    loadFacilities();
  }, []);

  // ── Load doctors when facility changes ────────────────────────────────────

  const loadDoctorsForFacility = async (fId) => {
    if (!fId) return;
    setIsLoadingDoctors(true);
    setDoctors([]);
    setDoctorId('');
    setAvailableSlots([]);
    try {
      const response = await api.get(`/facilities/${fId}/doctors`);
      if (response?.success && Array.isArray(response?.data)) {
        setDoctors(response.data);
      } else {
        setDoctors([]);
      }
    } catch (err) {
      console.error('Failed to load doctors:', err);
      setDoctors([]);
    } finally {
      setIsLoadingDoctors(false);
    }
  };

  const handleFacilityChange = (e) => {
    const fId = e.target.value;
    setFacilityId(fId);
    setAppointmentDate('');
    setAppointmentTime('');
    setAvailableSlots([]);
    if (fId) loadDoctorsForFacility(fId);
  };

  const handleDoctorChange = (e) => {
    setDoctorId(e.target.value);
    setAppointmentDate('');
    setAppointmentTime('');
    setAvailableSlots([]);
  };

  // ── Load available slots ──────────────────────────────────────────────────

  const loadAvailableSlots = async (date) => {
    if (!doctorId || !facilityId || !date) return;
    setIsLoadingSlots(true);
    setAvailableSlots([]);
    setAppointmentTime('');
    try {
      const response = await api.get(
        `/appointments/available-slots?providerId=${doctorId}&facilityId=${facilityId}&date=${date}`
      );
      const slots = Array.isArray(response?.data) && response.data.length > 0
        ? response.data
        : [
            '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
            '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
          ];
      setAvailableSlots(slots);
      setAppointmentTime(slots[0]);
    } catch (err) {
      const defaultSlots = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
      ];
      setAvailableSlots(defaultSlots);
      setAppointmentTime(defaultSlots[0]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setAppointmentDate(date);
    if (date) loadAvailableSlots(date);
  };

  // ── Proceed to confirmation step ──────────────────────────────────────────

  const handleProceedToConfirm = () => {
    if (!facilityId || !doctorId || !appointmentDate || !appointmentTime || !reason.trim()) {
      setError('Please fill in all required fields: facility, doctor, date, time, and reason.');
      return;
    }
    setError(null);
    setStep(2);
  };

  // ── Book appointment ──────────────────────────────────────────────────────

  const handleBookAppointment = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [year, month, day] = appointmentDate.split('-').map(Number);
      const [hour, minute] = appointmentTime.split(':').map(Number);
      const scheduledDateTime = new Date(year, month - 1, day, hour, minute);

      const patientId = user?._id || user?.id;

      const appointmentData = {
        patientId,
        providerId: doctorId,
        facilityId,
        hospitalId: facilityId,
        scheduledDateTime: scheduledDateTime.toISOString(),
        duration: 30,
        reason: reason.trim(),
        notes: notes.trim(),
      };

      const response = await api.post('/appointments/book', appointmentData);

      if (response?.success || response?.data?._id) {
        setBookedAppointment(response.data);
        setStep(3);
        success('Appointment booked successfully!');
      } else {
        throw new Error(response?.error || response?.message || 'Failed to book appointment');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Booking failed';
      setError(msg);
      showError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Reset form ────────────────────────────────────────────────────────────

  const handleNewBooking = () => {
    setStep(1);
    setFacilityId('');
    setDoctorId('');
    setAppointmentDate('');
    setAppointmentTime('');
    setReason('');
    setNotes('');
    setError(null);
    setBookedAppointment(null);
    setAvailableSlots([]);
    setDoctors([]);
  };

  // ── Derived lookups ───────────────────────────────────────────────────────

  const selectedFacility = facilities.find((f) => (f.id || f._id)?.toString() === facilityId);
  const selectedDoctor = doctors.find((d) => (d.id || d._id)?.toString() === doctorId);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <PageContainer>
      <SectionTitle icon={<Calendar size={32} />} title="Book an Appointment" description="Schedule a visit with your healthcare provider" />
      <ToastContainer toasts={toasts} onRemove={remove} position="bottom-right" />

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8 max-w-2xl mx-auto">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors ${
              s < step ? 'bg-jeevacare-green text-white' :
              s === step ? 'bg-jeevacare-blue text-white' :
              'bg-gray-200 text-gray-500'
            }`}>
              {s < step ? <CheckCircle size={16} /> : s}
            </div>
            {s < 3 && <div className={`flex-1 h-0.5 transition-colors ${s < step ? 'bg-jeevacare-green' : 'bg-gray-200'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* ── Step 1: Search & Select ── */}
      {step === 1 && (
        <div className="max-w-2xl mx-auto">
          <div className="card space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Select Healthcare Provider</h2>

            {/* Facility */}
            <div className="form-group">
              <label className="form-label">
                <MapPin size={14} className="inline mr-1.5" />
                Healthcare Facility <span className="text-jeevacare-red ml-0.5">*</span>
              </label>
              {isLoadingFacilities ? (
                <div className="form-input flex items-center gap-2 text-gray-500">
                  <div className="animate-spin w-4 h-4 border-2 border-jeevacare-blue border-t-transparent rounded-full" />
                  Loading facilities…
                </div>
              ) : (
                <select
                  value={facilityId}
                  onChange={handleFacilityChange}
                  className="form-select"
                  aria-label="Select a healthcare facility"
                >
                  <option value="">Select a facility…</option>
                  {facilities.map((facility) => (
                    <option key={facility.id || facility._id} value={facility.id || facility._id}>
                      {facility.name}{facility.location ? ` — ${facility.location}` : ''}
                    </option>
                  ))}
                </select>
              )}
              {!isLoadingFacilities && facilities.length === 0 && (
                <p className="form-help text-amber-700">No facilities available. Contact your administrator.</p>
              )}
            </div>

            {/* Doctor */}
            {facilityId && (
              <div className="form-group">
                <label className="form-label">
                  <User size={14} className="inline mr-1.5" />
                  Healthcare Provider <span className="text-jeevacare-red ml-0.5">*</span>
                </label>
                {isLoadingDoctors ? (
                  <div className="form-input flex items-center gap-2 text-gray-500">
                    <div className="animate-spin w-4 h-4 border-2 border-jeevacare-blue border-t-transparent rounded-full" />
                    Loading doctors…
                  </div>
                ) : (
                  <select
                    value={doctorId}
                    onChange={handleDoctorChange}
                    className="form-select"
                    aria-label="Select a doctor"
                  >
                    <option value="">Select a provider…</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id || doctor._id} value={doctor.id || doctor._id}>
                        Dr. {doctor.name} — {doctor.speciality}
                      </option>
                    ))}
                  </select>
                )}
                {!isLoadingDoctors && doctors.length === 0 && facilityId && (
                  <p className="form-help text-amber-700">No doctors available at this facility.</p>
                )}
              </div>
            )}

            {/* Date */}
            {doctorId && (
              <div className="form-group">
                <label className="form-label">
                  <Calendar size={14} className="inline mr-1.5" />
                  Preferred Date <span className="text-jeevacare-red ml-0.5">*</span>
                </label>
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={handleDateChange}
                  className="form-input"
                  min={new Date().toISOString().split('T')[0]}
                  aria-label="Select appointment date"
                />
              </div>
            )}

            {/* Time slot */}
            {appointmentDate && (
              <div className="form-group">
                <label className="form-label">
                  <Clock size={14} className="inline mr-1.5" />
                  Available Time Slot <span className="text-jeevacare-red ml-0.5">*</span>
                </label>
                {isLoadingSlots ? (
                  <div className="form-input flex items-center gap-2 text-gray-500">
                    <div className="animate-spin w-4 h-4 border-2 border-jeevacare-blue border-t-transparent rounded-full" />
                    Loading available slots…
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setAppointmentTime(slot)}
                        className={`py-2 text-sm font-medium rounded-lg border transition-all ${
                          appointmentTime === slot
                            ? 'bg-jeevacare-blue text-white border-jeevacare-blue shadow-sm'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-jeevacare-blue hover:text-jeevacare-blue'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Reason */}
            {appointmentTime && (
              <div className="form-group">
                <label className="form-label">
                  <FileText size={14} className="inline mr-1.5" />
                  Reason for Visit <span className="text-jeevacare-red ml-0.5">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Briefly describe the reason for your visit…"
                  className="form-textarea"
                  rows={3}
                  aria-label="Reason for visit"
                />
              </div>
            )}

            {/* Additional notes */}
            {appointmentTime && (
              <div className="form-group">
                <label className="form-label">Additional Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional information for your provider…"
                  className="form-textarea"
                  rows={2}
                  aria-label="Additional notes"
                />
              </div>
            )}

            {/* Validation error */}
            {error && (
              <div className="alert alert-error">
                <AlertCircle size={18} className="flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <button
              onClick={handleProceedToConfirm}
              disabled={!facilityId || !doctorId || !appointmentDate || !appointmentTime || !reason.trim() || isLoading}
              className="btn btn-primary w-full"
            >
              Review Appointment
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Confirmation ── */}
      {step === 2 && (
        <div className="max-w-2xl mx-auto">
          <div className="card space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Confirm Your Appointment</h2>

            <div className="bg-gray-50 rounded-lg p-6 space-y-3 border border-gray-200">
              <dl className="divide-y divide-gray-200 space-y-0">
                {[
                  { label: 'Facility', value: selectedFacility?.name },
                  { label: 'Provider', value: selectedDoctor ? `Dr. ${selectedDoctor.name}` : doctorId },
                  { label: 'Speciality', value: selectedDoctor?.speciality },
                  {
                    label: 'Date & Time',
                    value: new Date(`${appointmentDate}T${appointmentTime}`).toLocaleString('en-US', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    }),
                  },
                  { label: 'Duration', value: '30 minutes' },
                  { label: 'Reason', value: reason },
                  ...(notes ? [{ label: 'Notes', value: notes }] : []),
                ].map(({ label, value }) => value ? (
                  <div key={label} className="flex justify-between items-start py-3 first:pt-0 last:pb-0">
                    <dt className="text-sm text-gray-600 flex-shrink-0 mr-4">{label}</dt>
                    <dd className="text-sm font-medium text-gray-900 text-right">{value}</dd>
                  </div>
                ) : null)}
              </dl>
            </div>

            {error && (
              <div className="alert alert-error">
                <AlertCircle size={18} className="flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} disabled={isLoading} className="btn btn-secondary flex-1">
                Back
              </button>
              <button onClick={handleBookAppointment} disabled={isLoading} className="btn btn-success flex-1">
                {isLoading ? (
                  <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />Booking…</>
                ) : (
                  'Confirm & Book'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Success ── */}
      {step === 3 && bookedAppointment && (
        <div className="max-w-2xl mx-auto">
          <div className="card space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={40} className="text-jeevacare-green" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">Appointment Booked!</h2>
              <p className="text-gray-600 mt-2">Your appointment has been successfully scheduled.</p>
            </div>

            <div className="alert-success rounded-lg p-5 space-y-2">
              <h3 className="font-semibold text-green-900">Booking Details</h3>
              <div className="flex justify-between text-sm">
                <span className="text-green-700">Appointment ID:</span>
                <span className="font-mono text-green-900">{bookedAppointment._id?.substring(0, 16)}…</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-700">Status:</span>
                <span className="font-medium text-green-900">{bookedAppointment.status || 'Scheduled'}</span>
              </div>
              {bookedAppointment.scheduledDateTime && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-700">Scheduled for:</span>
                  <span className="font-medium text-green-900">
                    {new Date(bookedAppointment.scheduledDateTime).toLocaleString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
            </div>

            <div className="alert-info rounded-lg p-5">
              <h3 className="font-semibold text-blue-900 mb-3">What to Do Next</h3>
              <ul className="space-y-2 text-sm text-blue-900">
                {[
                  'Check your email for confirmation and appointment details',
                  'Arrive 10–15 minutes early on the appointment day',
                  'Bring your JeevaCare ID and any relevant documents',
                  'Contact the facility if you need to reschedule or cancel',
                ].map((tip) => (
                  <li key={tip} className="flex gap-2">
                    <CheckCircle2 size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => navigate('/appointments')}
                className="btn btn-primary flex-1"
              >
                View My Appointments
              </button>
              <button onClick={handleNewBooking} className="btn btn-secondary flex-1">
                Book Another
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

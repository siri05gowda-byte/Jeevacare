import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, MapPin, FileText, AlertCircle, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../components/Layout/PageContainer';
import SectionTitle from '../components/Layout/SectionTitle';
import LoadingSkeleton from '../components/State/LoadingSkeleton';
import EmptyState from '../components/State/EmptyState';
import { useToast } from '../components/State/Toast';
import { useAuthStore } from '../stores/authStore';
import { appointmentService } from '../services/appointmentService';

/**
 * PatientAppointmentsPage
 * 
 * View and manage appointments for patients.
 * Shows all appointments for the authenticated patient with filtering options.
 */
export default function PatientAppointmentsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('upcoming'); // all, upcoming, past

  // Get patient ID from user
  const getPatientId = async () => {
    // For PATIENT role, we need to get their patient profile ID
    // This might be in user.patientId or we need to fetch it
    if (user?.patientId) {
      return user.patientId;
    }
    
    // Try to get from patient profile endpoint
    try {
      const response = await fetch('/api/v1/patients/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        return data.data?._id || data._id;
      }
    } catch (err) {
      console.error('Failed to get patient ID:', err);
    }
    
    return user?._id; // Fallback to user ID
  };

  useEffect(() => {
    loadAppointments();
  }, [user]);

  const loadAppointments = async () => {
    if (!user) {
      setIsLoading(false);
      setError('Not authenticated');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const patientId = await getPatientId();
      const response = await appointmentService.getPatientAppointments(patientId);
      
      if (response?.success && response?.data) {
        setAppointments(response.data);
      } else if (Array.isArray(response)) {
        setAppointments(response);
      } else {
        setAppointments([]);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
      setError(error.message || 'Failed to load appointments');
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    try {
      await appointmentService.cancelAppointment(appointmentId, 'Cancelled by patient');
      success('Appointment cancelled successfully');
      loadAppointments(); // Reload appointments
    } catch (error) {
      showError(error.message || 'Failed to cancel appointment');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'badge-success';
      case 'cancelled':
        return 'badge-error';
      case 'scheduled':
        return 'badge-info';
      case 'arrived':
        return 'badge-warning';
      case 'in-progress':
        return 'badge-primary';
      case 'no-show':
        return 'badge-neutral';
      default:
        return 'badge-neutral';
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.scheduledDateTime || apt.appointmentDate);
    const now = new Date();

    if (filter === 'upcoming') {
      return aptDate >= now && apt.status !== 'cancelled' && apt.status !== 'completed';
    } else if (filter === 'past') {
      return aptDate < now || apt.status === 'completed' || apt.status === 'cancelled';
    }
    
    return true; // all
  });

  if (isLoading) {
    return (
      <PageContainer>
        <SectionTitle title="My Appointments" icon={<Calendar size={32} />} />
        <LoadingSkeleton count={5} />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <SectionTitle title="My Appointments" icon={<Calendar size={32} />} />
        <div className="card border-red-200 bg-red-50">
          <p className="text-red-800">{error}</p>
          <button onClick={loadAppointments} className="btn-secondary mt-4">
            Retry
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <SectionTitle
          title="My Appointments"
          description="View and manage your scheduled appointments"
          icon={<Calendar size={32} />}
        />
        <button
          onClick={() => navigate('/appointments/book')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Book Appointment
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex gap-2">
          {['all', 'upcoming', 'past'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-jeevacare-blue text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments List */}
      {filteredAppointments.length === 0 ? (
        <EmptyState
          title="No Appointments Found"
          description={
            filter === 'upcoming'
              ? "You don't have any upcoming appointments. Click the 'Book Appointment' button to schedule one."
              : "No appointments found matching your filter."
          }
          icon={<Calendar size={48} className="text-gray-300" />}
          action={
            filter === 'upcoming' && (
              <button
                onClick={() => navigate('/appointments/book')}
                className="btn-primary mt-4"
              >
                Book an Appointment
              </button>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((appointment) => {
            const aptDate = new Date(appointment.scheduledDateTime || appointment.appointmentDate);
            const isPast = aptDate < new Date();
            const canCancel = !isPast && appointment.status === 'scheduled';

            return (
              <div key={appointment._id} className="card hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  {/* Appointment Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`badge ${getStatusColor(appointment.status)}`}>
                        {appointment.status}
                      </span>
                      {isPast && appointment.status === 'scheduled' && (
                        <span className="badge-neutral text-xs">Past Due</span>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {appointment.reason || appointment.reasonForVisit || 'General Consultation'}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Calendar size={16} className="text-gray-400" />
                        <span>
                          {aptDate.toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Clock size={16} className="text-gray-400" />
                        <span>
                          {aptDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {(appointment.doctorName || appointment.providerName) && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <User size={16} className="text-gray-400" />
                          <span>Dr. {appointment.doctorName || appointment.providerName}</span>
                        </div>
                      )}
                      {(appointment.facilityName || appointment.hospitalName) && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <MapPin size={16} className="text-gray-400" />
                          <span>{appointment.facilityName || appointment.hospitalName}</span>
                        </div>
                      )}
                    </div>

                    {appointment.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Notes:</span> {appointment.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {canCancel && (
                    <div className="flex flex-col gap-2 min-w-[180px]">
                      <button
                        onClick={() => navigate(`/appointments/${appointment._id}/reschedule`)}
                        className="btn-secondary text-sm"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => handleCancelAppointment(appointment._id)}
                        className="btn-error text-sm"
                      >
                        Cancel Appointment
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}

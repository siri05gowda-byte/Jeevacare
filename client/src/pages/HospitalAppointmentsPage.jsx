import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, MapPin, FileText, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import PageContainer from '../components/Layout/PageContainer';
import SectionTitle from '../components/Layout/SectionTitle';
import LoadingSkeleton from '../components/State/LoadingSkeleton';
import EmptyState from '../components/State/EmptyState';
import { useToast } from '../components/State/Toast';
import { useAuthStore } from '../stores/authStore';
import { appointmentService } from '../services/appointmentService';

/**
 * HospitalAppointmentsPage
 * 
 * View and manage appointments for healthcare providers.
 * Shows all appointments for the authenticated doctor with filtering options.
 */
export default function HospitalAppointmentsPage() {
  const { user } = useAuthStore();
  const { success, error: showError } = useToast();
  
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, today, upcoming, past
  const [statusFilter, setStatusFilter] = useState('all'); // all, scheduled, completed, cancelled

  useEffect(() => {
    loadAppointments();
  }, [user]);

  const loadAppointments = async () => {
    if (!user || user.role !== 'DOCTOR') {
      setIsLoading(false);
      setError('Access restricted to doctors only');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const professionalId = user.professionalId || user._id;
      const filters = {};
      
      if (user.facilityId) {
        filters.facilityId = user.facilityId;
      }

      const response = await appointmentService.getDoctorAppointments(professionalId, filters);
      
      if (response?.success && response?.data) {
        setAppointments(response.data);
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

  const handleMarkArrived = async (appointmentId) => {
    try {
      await appointmentService.updateAppointmentStatus(appointmentId, 'arrived');
      success('Patient marked as arrived');
      loadAppointments(); // Reload appointments
    } catch (error) {
      showError(error.message || 'Failed to update appointment status');
    }
  };

  const handleUpdateStatus = async (appointmentId, newStatus) => {
    try {
      await appointmentService.updateAppointmentStatus(appointmentId, newStatus);
      success(`Appointment status updated to ${newStatus}`);
      loadAppointments(); // Reload appointments
    } catch (error) {
      showError(error.message || 'Failed to update appointment status');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'cancelled':
        return <XCircle size={16} className="text-red-600" />;
      case 'scheduled':
        return <Clock size={16} className="text-blue-600" />;
      case 'arrived':
        return <CheckCircle size={16} className="text-yellow-600" />;
      case 'in-progress':
        return <Clock size={16} className="text-purple-600" />;
      default:
        return <AlertCircle size={16} className="text-gray-600" />;
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
      default:
        return 'badge-neutral';
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.scheduledDateTime);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let matchesTimeFilter = true;
    if (filter === 'today') {
      matchesTimeFilter = aptDate >= today && aptDate < tomorrow;
    } else if (filter === 'upcoming') {
      matchesTimeFilter = aptDate >= now;
    } else if (filter === 'past') {
      matchesTimeFilter = aptDate < now;
    }

    const matchesStatusFilter = statusFilter === 'all' || apt.status === statusFilter;

    return matchesTimeFilter && matchesStatusFilter;
  });

  if (isLoading) {
    return (
      <PageContainer>
        <SectionTitle title="Appointments" icon={<Calendar size={32} />} />
        <LoadingSkeleton count={5} />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <SectionTitle title="Appointments" icon={<Calendar size={32} />} />
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
      <SectionTitle
        title="My Appointments"
        description="View and manage your scheduled appointments"
        icon={<Calendar size={32} />}
      />

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Time Filter */}
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Time Range</label>
            <div className="flex gap-2">
              {['all', 'today', 'upcoming', 'past'].map((f) => (
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

          {/* Status Filter */}
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
            <div className="flex gap-2 flex-wrap">
              {['all', 'scheduled', 'arrived', 'in-progress', 'completed', 'cancelled'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === s
                      ? 'bg-jeevacare-blue text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      {filteredAppointments.length === 0 ? (
        <EmptyState
          title="No Appointments Found"
          description="There are no appointments matching your filter criteria."
          icon={<Calendar size={48} className="text-gray-300" />}
        />
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((appointment) => {
            const aptDate = new Date(appointment.scheduledDateTime);
            const isPast = aptDate < new Date();

            return (
              <div key={appointment._id} className="card hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Appointment Info */}
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {appointment.patientName || 'Unknown Patient'}
                          </h3>
                          <span className={`badge ${getStatusColor(appointment.status)} flex items-center gap-1`}>
                            {getStatusIcon(appointment.status)}
                            {appointment.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          JeevaCare ID: {appointment.patientJeevaId || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Calendar size={16} className="text-gray-400" />
                        <span>{aptDate.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Clock size={16} className="text-gray-400" />
                        <span>{aptDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {appointment.reason && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <FileText size={16} className="text-gray-400" />
                          <span>{appointment.reason}</span>
                        </div>
                      )}
                      {appointment.facilityName && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <MapPin size={16} className="text-gray-400" />
                          <span>{appointment.facilityName}</span>
                        </div>
                      )}
                    </div>

                    {appointment.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600"><span className="font-medium">Notes:</span> {appointment.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {!isPast && appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                    <div className="flex flex-col gap-2 min-w-[180px]">
                      {appointment.status === 'scheduled' && (
                        <button
                          onClick={() => handleMarkArrived(appointment._id)}
                          className="btn-primary text-sm"
                        >
                          Mark Arrived
                        </button>
                      )}
                      {(appointment.status === 'arrived' || appointment.status === 'in-progress') && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(appointment._id, 'in-progress')}
                            className="btn-secondary text-sm"
                            disabled={appointment.status === 'in-progress'}
                          >
                            Start Consultation
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(appointment._id, 'completed')}
                            className="btn-primary text-sm"
                          >
                            Mark Complete
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleUpdateStatus(appointment._id, 'cancelled')}
                        className="btn-error text-sm"
                      >
                        Cancel
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

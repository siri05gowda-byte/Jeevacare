import React, { useState, useEffect } from 'react';
import { Users, Calendar, Clock, CheckCircle, Check, ArrowRight } from 'lucide-react';
import PageContainer from '../components/Layout/PageContainer';
import SectionTitle from '../components/Layout/SectionTitle';
import PatientSearch from '../components/Search/PatientSearch';
import LoadingSkeleton from '../components/State/LoadingSkeleton';
import EmptyState from '../components/State/EmptyState';
import { useToast, ToastContainer } from '../components/State/Toast';
import { useAuthStore } from '../stores/authStore';
import { appointmentService } from '../services/appointmentService';

/**
 * ProviderDashboard (V2)
 * 
 * Clinical workspace for healthcare providers.
 * Includes patient search, schedule, queue, and quick access to records.
 */
export default function ProviderDashboardV2() {
  const { toasts, success, error: showError, remove } = useToast();
  const user = useAuthStore((state) => state.user);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const [appointmentError, setAppointmentError] = useState(null);

  // Load today's appointments for doctor
  useEffect(() => {
    const loadAppointments = async () => {
      // Only load appointments if user is a doctor with professionalId
      if (!user || user.role !== 'DOCTOR') {
        setIsLoadingAppointments(false);
        return;
      }

      try {
        setIsLoadingAppointments(true);
        setAppointmentError(null);
        
        // Get professional ID from user profile
        // Note: The backend needs to return professionalId in user object or we need to fetch it
        const professionalId = user.professionalId || user._id;
        
        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const filters = {
          date: today.toISOString(),
          facilityId: user.facilityId // Required by backend
        };

        if (!filters.facilityId) {
          // No facility ID available - show empty state
          setTodayAppointments([]);
          setIsLoadingAppointments(false);
          return;
        }

        const response = await appointmentService.getDoctorAppointments(professionalId, filters);
        
        if (response?.success && response?.data) {
          // Transform appointments to UI format
          const appointments = response.data.map(apt => ({
            id: apt._id,
            patientName: apt.patientName || 'Unknown Patient',
            time: new Date(apt.scheduledDateTime).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            }),
            status: apt.status || 'scheduled',
            type: apt.reason || 'General Consultation',
            jeevaId: apt.patientJeevaId || 'N/A',
            _raw: apt
          }));
          
          setTodayAppointments(appointments);
        } else {
          setTodayAppointments([]);
        }
      } catch (error) {
        console.error('Error loading appointments:', error);
        setAppointmentError(error.message || 'Failed to load appointments');
        setTodayAppointments([]);
      } finally {
        setIsLoadingAppointments(false);
      }
    };

    loadAppointments();
  }, [user]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'badge-success';
      case 'in-progress':
        return 'badge-info';
      case 'scheduled':
        return 'badge-warning';
      default:
        return 'badge-neutral';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <Check size={14} />;
      case 'in-progress':
        return <ArrowRight size={14} />;
      case 'scheduled':
        return <Clock size={14} />;
      default:
        return <span>•</span>;
    }
  };

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    success(`Loaded patient: ${patient.name}`);
  };

  return (
    <PageContainer>
      {/* Header */}
      <SectionTitle
        title="Clinical Workspace"
        description="Manage your patients and schedule"
        icon={<Users size={32} />}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={remove} position="bottom-right" />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="card-compact">
          <p className="text-xs text-gray-600 mb-1">Today Appointments</p>
          <p className="text-2xl font-bold text-jeevacare-blue">{todayAppointments.length}</p>
        </div>
        <div className="card-compact">
          <p className="text-xs text-gray-600 mb-1">Completed</p>
          <p className="text-2xl font-bold text-jeevacare-green">
            {todayAppointments.filter((a) => a.status === 'completed').length}
          </p>
        </div>
        <div className="card-compact">
          <p className="text-xs text-gray-600 mb-1">In Progress</p>
          <p className="text-2xl font-bold text-jeevacare-amber">
            {todayAppointments.filter((a) => a.status === 'in-progress').length}
          </p>
        </div>
        <div className="card-compact">
          <p className="text-xs text-gray-600 mb-1">Pending</p>
          <p className="text-2xl font-bold text-jeevacare-red">
            {todayAppointments.filter((a) => a.status === 'scheduled').length}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Patient Search and Queue */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Search */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Find Patient</h2>
            <PatientSearch onSelectPatient={handlePatientSelect} />
          </div>

          {/* Selected Patient Info */}
          {selectedPatient && (
            <div className="card border-2 border-jeevacare-blue">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedPatient.name}</h3>
                  <p className="text-sm text-gray-600">{selectedPatient.jeevaId}</p>
                </div>
                <span className="badge-success">Loaded</span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200">
                <div>
                  <p className="text-xs text-gray-600">Email</p>
                  <p className="text-sm font-medium text-gray-900">{selectedPatient.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Phone</p>
                  <p className="text-sm font-medium text-gray-900">{selectedPatient.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Date of Birth</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(selectedPatient.dateOfBirth).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Last Visit</p>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedPatient.lastVisit.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button className="btn btn-primary btn-sm">
                  View Full Record
                </button>
                <button className="btn btn-secondary btn-sm">
                  Create Encounter
                </button>
              </div>
            </div>
          )}

          {!selectedPatient && (
            <div className="card">
              <EmptyState
                type="default"
                title="No patient selected"
                description="Search for a patient to get started"
              />
            </div>
          )}
        </div>

        {/* Right: Today's Schedule */}
        <div>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calendar size={20} />
                Today's Schedule
              </h2>
              <span className="text-xs font-medium text-gray-600">
                {new Date().toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>

            <div className="space-y-2">
              {isLoadingAppointments ? (
                <LoadingSkeleton type="list" count={3} />
              ) : appointmentError ? (
                <EmptyState
                  type="error"
                  title="Failed to load appointments"
                  description={appointmentError}
                />
              ) : todayAppointments.length === 0 ? (
                <EmptyState
                  type="default"
                  title="No appointments today"
                  description="Your schedule is clear for today"
                />
              ) : (
                todayAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-3 border border-gray-200 rounded-lg hover:border-jeevacare-blue hover:shadow-sm transition-all cursor-pointer"
                    onClick={() => {
                      success(`Clicked appointment: ${apt.patientName} at ${apt.time}`);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">{apt.patientName}</p>
                        <p className="text-xs text-gray-600">{apt.type}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className={`badge badge-sm ${getStatusColor(apt.status)}`}>
                          {getStatusIcon(apt.status)} <span>{apt.status}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <Clock size={12} />
                      {apt.time}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* View Full Schedule */}
            <button className="w-full mt-4 btn btn-secondary btn-sm">
              View Full Schedule
            </button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

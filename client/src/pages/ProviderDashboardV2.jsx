import React, { useState, useEffect, useCallback } from 'react';
import { Users, Calendar, Clock, CheckCircle, Check, ArrowRight, Building2, RefreshCw, AlertCircle } from 'lucide-react';
import PageContainer from '../components/Layout/PageContainer';
import SectionTitle from '../components/Layout/SectionTitle';
import PatientSearch from '../components/Search/PatientSearch';
import LoadingSkeleton from '../components/State/LoadingSkeleton';
import EmptyState from '../components/State/EmptyState';
import { useToast, ToastContainer } from '../components/State/Toast';
import { useAuthStore } from '../stores/authStore';
import { appointmentService } from '../services/appointmentService';

/**
 * Format dates safely without throwing runtime TypeErrors
 */
const formatDateSafe = (dateVal, fallback = 'N/A') => {
  if (!dateVal) return fallback;
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return fallback;
  }
};

/**
 * ProviderDashboard (V2)
 * 
 * Clinical workspace for healthcare providers.
 * Includes patient search, schedule, queue, and multi-facility support.
 */
export default function ProviderDashboardV2() {
  const { toasts, success, error: showError, remove } = useToast();
  const user = useAuthStore((state) => state.user);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const [appointmentError, setAppointmentError] = useState(null);

  // Derive hospital facilities affiliated with this doctor
  const facilities = user?.facilities && user.facilities.length > 0
    ? user.facilities
    : (user?.facilityId ? [{ _id: user.facilityId, name: user.hospitalAffiliation || 'Hospital', city: 'Primary' }] : []);

  const [activeFacilityId, setActiveFacilityId] = useState(
    user?.facilityId || (facilities[0]?._id) || ''
  );

  useEffect(() => {
    if (user?.facilityId && !activeFacilityId) {
      setActiveFacilityId(user.facilityId);
    } else if (facilities.length > 0 && !activeFacilityId) {
      setActiveFacilityId(facilities[0]._id);
    }
  }, [user, facilities, activeFacilityId]);

  // Load today's appointments for doctor at active facility
  const loadAppointments = useCallback(async () => {
    if (!user || user.role !== 'DOCTOR') {
      setIsLoadingAppointments(false);
      return;
    }

    try {
      setIsLoadingAppointments(true);
      setAppointmentError(null);

      const professionalId = user.professionalId || user._id;
      const targetFacilityId = activeFacilityId || user.facilityId || facilities[0]?._id;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const filters = {
        date: today.toISOString(),
      };
      if (targetFacilityId) {
        filters.facilityId = targetFacilityId;
      }

      const response = await appointmentService.getDoctorAppointments(professionalId, filters);

      if (response?.success && Array.isArray(response?.data)) {
        const appointments = response.data.map((apt) => ({
          id: apt._id,
          patientName: apt.patientName || `${apt.patientId?.personalIdentity?.firstName || ''} ${apt.patientId?.personalIdentity?.lastName || ''}`.trim() || 'Patient',
          time: apt.scheduledDateTime
            ? new Date(apt.scheduledDateTime).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Scheduled',
          status: apt.status || 'scheduled',
          type: apt.reason || 'General Consultation',
          jeevaId: apt.patientJeevaId || apt.patientId?.jeevaId || 'N/A',
          _raw: apt,
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
  }, [user, activeFacilityId, facilities]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

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
        description="Manage your patients, consultations, and daily schedule"
        icon={<Users size={32} />}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={remove} position="bottom-right" />

      {/* Clinician Profile & Hospital Affiliation Banner */}
      <div className="card mb-6 bg-gradient-to-r from-blue-50/60 to-indigo-50/40 border border-blue-100 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-jeevacare-blue text-white flex items-center justify-center font-bold text-xl shadow-md flex-shrink-0">
              {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'DR'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{user?.name || `${user?.profile?.firstName || 'Dr.'} ${user?.profile?.lastName || 'Clinician'}`}</h1>
                <span className="badge badge-primary text-xs px-2.5 py-0.5 font-medium">Licensed Doctor</span>
              </div>
              <p className="text-sm text-gray-600 mt-0.5">
                {user?.specialization || user?.profile?.specialization || 'Clinical Specialist'} • Reg No:{' '}
                <span className="font-mono font-medium text-gray-800">{user?.medicalRegistrationNumber || user?.licenseNumber || 'REG-KA-DEMO'}</span>
              </p>
            </div>
          </div>

          {/* Hospital Affiliation Context & Switcher */}
          <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-xs">
            <Building2 size={22} className="text-jeevacare-blue flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Hospital Facility</p>
              {facilities.length > 1 ? (
                <div className="flex items-center gap-2 mt-1">
                  <select
                    className="select select-sm border-gray-300 rounded font-medium text-gray-900 bg-white"
                    value={activeFacilityId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setActiveFacilityId(newId);
                      const fac = facilities.find(f => f._id === newId);
                      success(`Switched active context to: ${fac?.name || 'Selected Hospital'}`);
                    }}
                  >
                    {facilities.map((fac) => (
                      <option key={fac._id} value={fac._id}>
                        {fac.name} {fac.branchName ? `(${fac.branchName})` : fac.city ? `(${fac.city})` : ''} {fac.isPrimary ? '★ Primary' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {facilities[0]?.name || user?.hospitalAffiliation || 'Sanjivani Hospital — Mysore'}
                  {facilities[0]?.city ? ` (${facilities[0].city})` : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

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
            <PatientSearch onSelectPatient={handlePatientSelect} facilityId={activeFacilityId} />
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
                  <p className="text-sm font-medium text-gray-900">{selectedPatient.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Phone</p>
                  <p className="text-sm font-medium text-gray-900">{selectedPatient.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Date of Birth</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDateSafe(selectedPatient.dateOfBirth)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Last Visit</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDateSafe(selectedPatient.lastVisit, 'No prior visit recorded')}
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
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center space-y-2">
                  <div className="flex items-center justify-center gap-1.5 text-red-700 font-medium text-sm">
                    <AlertCircle size={16} />
                    <span>Failed to load appointments</span>
                  </div>
                  <p className="text-xs text-red-600">{appointmentError}</p>
                  <button
                    onClick={loadAppointments}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-300 text-red-700 text-xs rounded hover:bg-red-50 transition"
                  >
                    <RefreshCw size={12} />
                    Retry
                  </button>
                </div>
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
                      success(`Selected appointment: ${apt.patientName} at ${apt.time}`);
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

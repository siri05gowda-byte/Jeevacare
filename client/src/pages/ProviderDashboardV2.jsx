import React, { useState } from 'react';
import { Users, Calendar, Clock, CheckCircle } from 'lucide-react';
import PageContainer from '../components/Layout/PageContainer';
import SectionTitle from '../components/Layout/SectionTitle';
import PatientSearch from '../components/Search/PatientSearch';
import LoadingSkeleton from '../components/State/LoadingSkeleton';
import EmptyState from '../components/State/EmptyState';
import { useToast, ToastContainer } from '../components/State/Toast';

/**
 * ProviderDashboard (V2)
 * 
 * Clinical workspace for healthcare providers.
 * Includes patient search, schedule, queue, and quick access to records.
 */
export default function ProviderDashboardV2() {
  const { toasts, success, error: showError, remove } = useToast();
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Mock schedule data
  const todayAppointments = [
    {
      id: 'apt-1',
      patientName: 'John Doe',
      time: '09:00 AM',
      status: 'completed',
      type: 'Follow-up',
      jeevaId: 'JC-ABC123',
    },
    {
      id: 'apt-2',
      patientName: 'Jane Smith',
      time: '10:30 AM',
      status: 'in-progress',
      type: 'Routine Check-up',
      jeevaId: 'JC-DEF456',
    },
    {
      id: 'apt-3',
      patientName: 'Robert Johnson',
      time: '02:00 PM',
      status: 'scheduled',
      type: 'Consultation',
      jeevaId: 'JC-GHI789',
    },
    {
      id: 'apt-4',
      patientName: 'Emily Davis',
      time: '03:30 PM',
      status: 'scheduled',
      type: 'Routine Check-up',
      jeevaId: 'JC-JKL012',
    },
  ];

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
        return '✓';
      case 'in-progress':
        return '→';
      case 'scheduled':
        return '⏱';
      default:
        return '•';
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
              {todayAppointments.map((apt) => (
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
                        {getStatusIcon(apt.status)} {apt.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <Clock size={12} />
                    {apt.time}
                  </div>
                </div>
              ))}
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

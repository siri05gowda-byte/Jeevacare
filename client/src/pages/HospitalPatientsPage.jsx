import React, { useState } from 'react';
import { Users, Search, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../components/Layout/PageContainer';
import SectionTitle from '../components/Layout/SectionTitle';
import PatientSearch from '../components/Search/PatientSearch';
import LoadingSkeleton from '../components/State/LoadingSkeleton';
import EmptyState from '../components/State/EmptyState';
import { useAuthStore } from '../stores/authStore';

/**
 * HospitalPatientsPage
 * 
 * Page for doctors and hospital staff to search and view patients they have access to.
 * Uses the existing PatientSearch component for patient lookup.
 */
export default function HospitalPatientsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [recentPatients, setRecentPatients] = useState([]);

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    // Add to recent patients (limit to 5)
    setRecentPatients(prev => {
      const filtered = prev.filter(p => p._id !== patient._id);
      return [patient, ...filtered].slice(0, 5);
    });
  };

  const handleViewPatient = (patient) => {
    // Navigate to patient detail page (to be implemented) or show patient info
    console.log('View patient:', patient);
    // For now, just select the patient
    setSelectedPatient(patient);
  };

  return (
    <PageContainer>
      {/* Header */}
      <SectionTitle
        title="Patient Management"
        description="Search and manage patients at your facility"
        icon={<Users size={32} />}
      />

      {/* Search Section */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          <Search size={20} className="inline-block mr-2" />
          Find Patient
        </h2>
        <PatientSearch onSelectPatient={handlePatientSelect} />
      </div>

      {/* Selected Patient Details */}
      {selectedPatient && (
        <div className="card border-2 border-jeevacare-blue mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {selectedPatient.name || `${selectedPatient.personalIdentity?.firstName} ${selectedPatient.personalIdentity?.lastName}`}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                JeevaCare ID: {selectedPatient.jeevaId || 'N/A'}
              </p>
            </div>
            <span className="badge-success">Active</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 pb-4 border-b border-gray-200">
            <div>
              <p className="text-xs text-gray-600 mb-1">Email</p>
              <p className="text-sm font-medium text-gray-900">
                {selectedPatient.email || selectedPatient.contact?.email || 'Not provided'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Phone</p>
              <p className="text-sm font-medium text-gray-900">
                {selectedPatient.phone || selectedPatient.contact?.phone || 'Not provided'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Date of Birth</p>
              <p className="text-sm font-medium text-gray-900">
                {selectedPatient.dateOfBirth 
                  ? new Date(selectedPatient.dateOfBirth).toLocaleDateString()
                  : selectedPatient.personalIdentity?.dateOfBirth
                  ? new Date(selectedPatient.personalIdentity.dateOfBirth).toLocaleDateString()
                  : 'Not provided'}
              </p>
            </div>
          </div>

          {/* Patient Actions */}
          <div className="flex gap-3">
            <button
              className="btn-primary"
              onClick={() => navigate(`/patient-records/${selectedPatient._id}`)}
            >
              View Medical Records
            </button>
            <button
              className="btn-secondary"
              onClick={() => navigate(`/encounter`, { state: { patient: selectedPatient } })}
            >
              Start Encounter
            </button>
            <button
              className="btn-secondary"
              onClick={() => navigate(`/appointments`, { state: { patient: selectedPatient } })}
            >
              View Appointments
            </button>
          </div>
        </div>
      )}

      {/* Recent Patients */}
      {recentPatients.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Patients</h2>
          <div className="space-y-2">
            {recentPatients.map((patient) => (
              <button
                key={patient._id}
                onClick={() => handleViewPatient(patient)}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {patient.name || `${patient.personalIdentity?.firstName} ${patient.personalIdentity?.lastName}`}
                  </p>
                  <p className="text-sm text-gray-600">{patient.jeevaId}</p>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedPatient && recentPatients.length === 0 && (
        <EmptyState
          title="No Patient Selected"
          description="Search for a patient using the search bar above to view their information and medical records."
          icon={<Users size={48} className="text-gray-300" />}
        />
      )}
    </PageContainer>
  );
}

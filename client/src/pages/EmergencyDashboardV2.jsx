import React, { useState } from 'react';
import { AlertCircle, Navigation, Heart, Phone, MapPin, Clock, AlertTriangle, MapPinIcon } from 'lucide-react';
import PageContainer from '../components/Layout/PageContainer';
import SectionTitle from '../components/Layout/SectionTitle';
import { useToast, ToastContainer } from '../components/State/Toast';

/**
 * EmergencyDashboard (V2)
 * 
 * Fast-access emergency response interface for emergency personnel.
 * Displays critical patient information prioritized by severity.
 * Provides quick access to location, contacts, and medical alerts.
 */
export default function EmergencyDashboardV2() {
  const { toasts, success, error: showError, remove } = useToast();
  const [selectedCase, setSelectedCase] = useState(null);

  // Mock emergency cases data
  const emergencyCases = [
    {
      id: 'case-1',
      patientName: 'John Doe',
      jeevaId: 'JC-ABC123',
      severity: 'critical',
      condition: 'Severe chest pain',
      age: 45,
      location: 'Downtown St., Apt 512',
      coordinates: { lat: 40.7128, lng: -74.006 },
      bloodType: 'O+',
      allergies: ['Penicillin', 'Shellfish'],
      medications: ['Aspirin', 'Metoprolol'],
      emergencyContacts: [
        { name: 'Sarah Doe (Spouse)', phone: '+1 (555) 123-4501' },
        { name: 'Dr. Johnson (Cardiologist)', phone: '+1 (555) 987-6543' },
      ],
      incidentTime: new Date(Date.now() - 600000), // 10 min ago
      responders: 2,
      status: 'responded',
    },
    {
      id: 'case-2',
      patientName: 'Jane Smith',
      jeevaId: 'JC-DEF456',
      severity: 'high',
      condition: 'Severe allergic reaction',
      age: 28,
      location: 'Park Avenue, Mall Level 3',
      coordinates: { lat: 40.73, lng: -73.98 },
      bloodType: 'B-',
      allergies: ['Peanuts', 'Tree nuts', 'Latex'],
      medications: ['Epinephrine auto-injector'],
      emergencyContacts: [
        { name: 'Michael Smith (Brother)', phone: '+1 (555) 234-5602' },
      ],
      incidentTime: new Date(Date.now() - 300000), // 5 min ago
      responders: 1,
      status: 'en-route',
    },
    {
      id: 'case-3',
      patientName: 'Robert Johnson',
      jeevaId: 'JC-GHI789',
      severity: 'medium',
      condition: 'Fall with possible fracture',
      age: 72,
      location: 'Home - 456 Maple Road',
      coordinates: { lat: 40.758, lng: -73.985 },
      bloodType: 'A+',
      allergies: ['NSAIDs'],
      medications: ['Warfarin', 'Lisinopril'],
      emergencyContacts: [
        { name: 'Emily Johnson (Daughter)', phone: '+1 (555) 345-6703' },
      ],
      incidentTime: new Date(Date.now() - 120000), // 2 min ago
      responders: 0,
      status: 'new',
    },
  ];

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'border-l-4 border-l-red-600 bg-red-50';
      case 'high':
        return 'border-l-4 border-l-amber-600 bg-amber-50';
      case 'medium':
        return 'border-l-4 border-l-yellow-600 bg-yellow-50';
      default:
        return 'border-l-4 border-l-gray-600 bg-gray-50';
    }
  };

  const getSeverityBadgeColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'badge-danger';
      case 'high':
        return 'badge-warning';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'badge-info';
    }
  };

  const getSeverityLabel = (severity) => {
    const labels = {
      critical: 'CRITICAL',
      high: 'HIGH',
      medium: 'MEDIUM',
      low: 'LOW',
    };
    return labels[severity] || severity;
  };

  const getStatusIcon = (status) => {
    const icons = {
      new: <MapPin size={20} />,
      responded: <AlertCircle size={20} />,
      'en-route': <AlertTriangle size={20} />,
      arrived: <MapPin size={20} />,
    };
    return icons[status] || '•';
  };

  const handleCallResponder = (contactInfo) => {
    success(`Dialing ${contactInfo.name}: ${contactInfo.phone}`);
  };

  const handleOpenMaps = (coordinates) => {
    success(`Opening maps to location: ${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`);
  };

  return (
    <PageContainer fullWidth>
      {/* Header */}
      <SectionTitle
        title="Emergency Response"
        description="Real-time emergency cases and responder coordination"
        icon={<AlertCircle size={32} />}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={remove} position="bottom-right" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Case List (Left/Top) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Active Cases</h2>
            <span className="badge-danger">{emergencyCases.length} Active</span>
          </div>

          {emergencyCases.map((caseData) => (
            <div
              key={caseData.id}
              onClick={() => setSelectedCase(caseData)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedCase?.id === caseData.id
                  ? 'border-jeevacare-blue shadow-lg'
                  : 'border-transparent'
              } ${getSeverityColor(caseData.severity)}`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {caseData.patientName}
                    </h3>
                    <span className={`badge ${getSeverityBadgeColor(caseData.severity)}`}>
                      {getSeverityLabel(caseData.severity)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{caseData.condition}</p>
                  <p className="text-xs text-gray-500 mt-1">ID: {caseData.jeevaId}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-2xl">{getStatusIcon(caseData.status)}</p>
                  <p className="text-xs text-gray-600 mt-1">{caseData.status}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                <div className="flex items-center gap-1">
                  <MapPin size={14} className="text-gray-400" />
                  {caseData.age} years old
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={12} className="text-gray-400" />
                  {Math.round((Date.now() - caseData.incidentTime) / 60000)} min ago
                </div>
                <div className="flex items-center gap-1">
                  <Heart size={14} className="text-gray-400" />
                  Blood: {caseData.bloodType}
                </div>
                <div className="flex items-center gap-1">
                  <AlertCircle size={14} className="text-gray-400" />
                  {caseData.responders} responder{caseData.responders !== 1 ? 's' : ''}
                </div>
              </div>

              {caseData.allergies.length > 0 && (
                <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                  <p className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1">
                    <AlertTriangle size={14} />
                    ALLERGIES: {caseData.allergies.join(', ')}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Case Details (Right/Bottom) */}
        {selectedCase ? (
          <div className="space-y-4">
            {/* Case Header */}
            <div className={`card ${getSeverityColor(selectedCase.severity)}`}>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {selectedCase.patientName}
              </h2>
              <div className="space-y-1 text-sm">
                <p className="text-gray-700">
                  <span className="font-medium">ID:</span> {selectedCase.jeevaId}
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Age:</span> {selectedCase.age}
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Blood Type:</span> {selectedCase.bloodType}
                </p>
                <p className="font-semibold text-gray-900 mt-2">
                  {selectedCase.condition}
                </p>
              </div>
            </div>

            {/* Critical Info */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">Critical Information</h3>

              {/* Allergies */}
              {selectedCase.allergies.length > 0 && (
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1">
                    <AlertTriangle size={14} />
                    ALLERGIES
                  </p>
                  <p className="text-sm text-gray-800">
                    {selectedCase.allergies.join(', ')}
                  </p>
                </div>
              )}

              {/* Medications */}
              {selectedCase.medications.length > 0 && (
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <p className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1">
                    <Heart size={14} />
                    CURRENT MEDICATIONS
                  </p>
                  <p className="text-sm text-gray-800">
                    {selectedCase.medications.join(', ')}
                  </p>
                </div>
              )}

              {/* Emergency Contacts */}
              <div>
                <p className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1">
                  <Phone size={14} />
                  EMERGENCY CONTACTS
                </p>
                <div className="space-y-2">
                  {selectedCase.emergencyContacts.map((contact, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleCallResponder(contact)}
                      className="w-full flex items-start justify-between p-2 bg-gray-50 hover:bg-gray-100 rounded transition-colors text-left text-xs"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{contact.name}</p>
                        <p className="text-gray-600">{contact.phone}</p>
                      </div>
                      <Phone size={16} className="text-jeevacare-blue flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MapPin size={18} />
                Location
              </h3>
              <p className="text-sm text-gray-700 mb-3">{selectedCase.location}</p>
              <button
                onClick={() => handleOpenMaps(selectedCase.coordinates)}
                className="w-full btn btn-primary btn-sm flex items-center justify-center gap-2"
              >
                <Navigation size={16} />
                Open Maps
              </button>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button className="w-full btn btn-success">
                Mark Arrived
              </button>
              <button className="w-full btn btn-secondary">
                Update Status
              </button>
            </div>
          </div>
        ) : (
          <div className="card flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle size={32} className="text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Select a case to view details</p>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}

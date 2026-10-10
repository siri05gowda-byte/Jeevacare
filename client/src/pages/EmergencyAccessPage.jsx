import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
  AlertTriangle,
  AlertCircle,
  User,
  Droplet,
  Heart,
  Pill,
  Clock,
  Shield,
  Search,
  ChevronDown,
} from 'lucide-react';
import PageContainer from '../components/Layout/PageContainer';
import SectionTitle from '../components/Layout/SectionTitle';
import LoadingSkeleton from '../components/State/LoadingSkeleton';
import EmptyState from '../components/State/EmptyState';
import { useToast } from '../components/State/Toast';

/**
 * EmergencyAccessPage
 * Allows authorized emergency professionals to:
 * 1. Identify patient (JeevaCare ID, contact info, etc.)
 * 2. Access prioritized emergency information
 * 3. View full history if needed
 * 4. Log emergency access for audit
 */
export default function EmergencyAccessPage() {
  const { user } = useAuthStore();
  const { success, error: showError } = useToast();

  const [step, setStep] = useState(1); // 1: Identify patient, 2: View emergency info, 3: Full history
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Patient identification
  const [jeevaId, setJeevaId] = useState('');
  const [identificationMethod, setIdentificationMethod] = useState('jeeva-id'); // jeeva-id, name-dob, phone

  // Search results
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Emergency data
  const [emergencyProfile, setEmergencyProfile] = useState(null);
  const [criticalInfo, setCriticalInfo] = useState(null);
  const [fullHistory, setFullHistory] = useState(null);

  // Audit logging
  const [accessReason, setAccessReason] = useState('');
  const [emergencyType, setEmergencyType] = useState('medical');

  const token = user?.token || localStorage.getItem('token');

  /**
   * Verify emergency access permission
   */
  useEffect(() => {
    if (!['DOCTOR', 'NURSE', 'EMERGENCY', 'SYSTEM_ADMIN'].includes(user?.role)) {
      setError('You do not have emergency access permission. Only healthcare professionals can access emergency information.');
    }
  }, [user]);

  /**
   * Search for patient using real API
   */
  const handleSearchPatient = async () => {
    if (!jeevaId && !accessReason) {
      setError('Please enter patient information and access reason');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSearchResults([]);

      // Call real API
      const query = new URLSearchParams();
      if (jeevaId) query.append('jeevaId', jeevaId);
      query.append('method', identificationMethod);

      const response = await fetch(`/api/v1/patients/search?${query.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(Array.isArray(data.data) ? data.data : []);
        if (data.data && data.data.length === 0) {
          showError('No patients found matching the search criteria');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || 'Search failed');
        showError(errorData.error || 'Search failed');
      }
    } catch (err) {
      setError(err.message);
      showError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Select patient and fetch emergency data
   */
  const handleSelectPatient = async (patient) => {
    try {
      setIsLoading(true);
      setError(null);

      setSelectedPatient(patient);

      // Fetch emergency profile
      const profileResponse = await fetch(`/api/v1/emergency/profile/${patient._id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setEmergencyProfile(profileData.data);
      }

      // Fetch patient timeline for critical info
      const timelineResponse = await fetch(`/api/v1/timeline/${patient._id}?limit=5`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (timelineResponse.ok) {
        const timelineData = await timelineResponse.json();
        setCriticalInfo(timelineData.data);
      }

      // Log emergency access
      if (accessReason) {
        await fetch('/api/v1/audit', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'EMERGENCY_ACCESS',
            patientId: patient._id,
            reason: accessReason,
            type: emergencyType,
            timestamp: new Date().toISOString(),
          }),
        });
      }

      setStep(2);
      success('Emergency information loaded');
    } catch (err) {
      setError(err.message);
      showError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Fetch full patient history
   */
  const handleViewFullHistory = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(`/api/v1/patients/${selectedPatient._id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFullHistory(data.patient);
        setStep(3);
        success('Full patient history loaded');
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Reset form
   */
  const handleReset = () => {
    setStep(1);
    setJeevaId('');
    setIdentificationMethod('jeeva-id');
    setSearchResults([]);
    setSelectedPatient(null);
    setEmergencyProfile(null);
    setCriticalInfo(null);
    setFullHistory(null);
    setAccessReason('');
    setEmergencyType('medical');
    setError(null);
  };

  return (
    <PageContainer>
      <SectionTitle icon={AlertTriangle} title="Emergency Access" />

      {/* Authorization check */}
      {error?.includes('do not have emergency access') && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 text-center">
            <AlertTriangle size={48} className="text-red-600 mx-auto mb-4" />
            <p className="text-lg font-semibold text-red-900">{error}</p>
          </div>
        </div>
      )}

      {/* Step 1: Patient Identification */}
      {step === 1 && !error?.includes('do not have emergency access') && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Identify Patient</h2>

            {/* Emergency Context */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-900 flex items-center gap-2">
                <AlertTriangle size={18} />
                <span><strong>Important:</strong> Emergency access is for urgent medical situations only. All access is logged and audited. Use only when necessary for patient care.</span>
              </p>
            </div>

            {/* Identification Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Identification Method
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="jeeva-id"
                    checked={identificationMethod === 'jeeva-id'}
                    onChange={(e) => setIdentificationMethod(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">JeevaCare ID (Fastest)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="name-dob"
                    checked={identificationMethod === 'name-dob'}
                    onChange={(e) => setIdentificationMethod(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Name & Date of Birth</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="phone"
                    checked={identificationMethod === 'phone'}
                    onChange={(e) => setIdentificationMethod(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Phone Number</span>
                </label>
              </div>
            </div>

            {/* Input Field */}
            {identificationMethod === 'jeeva-id' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  JeevaCare ID
                </label>
                <input
                  type="text"
                  value={jeevaId}
                  onChange={(e) => setJeevaId(e.target.value)}
                  placeholder="e.g., JEEVA-001-2024"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Emergency Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Emergency Type *
              </label>
              <select
                value={emergencyType}
                onChange={(e) => setEmergencyType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="medical">Medical Emergency</option>
                <option value="trauma">Trauma/Injury</option>
                <option value="cardiac">Cardiac Event</option>
                <option value="respiratory">Respiratory Distress</option>
                <option value="allergic">Allergic Reaction</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Access Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Emergency Access *
              </label>
              <textarea
                value={accessReason}
                onChange={(e) => setAccessReason(e.target.value)}
                placeholder="Brief description of the emergency and why patient history is needed..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-2">
                <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Search button */}
            <div>
              <button
                onClick={handleSearchPatient}
                disabled={!accessReason || isLoading}
                className="w-full px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search size={20} />
                {isLoading ? 'Searching...' : 'Search Patient'}
              </button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">Search Results</h3>
                {searchResults.map((patient) => (
                  <div
                    key={patient._id}
                    className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleSelectPatient(patient)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {patient.personalIdentity.firstName} {patient.personalIdentity.lastName}
                        </p>
                        <p className="text-sm text-gray-600">JeevaCare ID: {patient.jeevaId}</p>
                        <p className="text-sm text-gray-600">
                          DOB: {new Date(patient.personalIdentity.dateOfBirth).toLocaleDateString()}
                        </p>
                        {patient.bloodGroup && (
                          <p className="text-sm font-medium text-red-600 flex items-center gap-1 mt-1">
                            <Droplet size={16} />
                            Blood Group: {patient.bloodGroup}
                          </p>
                        )}
                      </div>
                      <ChevronDown className="text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Emergency Information */}
      {step === 2 && selectedPatient && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Patient Header */}
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-red-900">
                  {selectedPatient.personalIdentity.firstName}{' '}
                  {selectedPatient.personalIdentity.lastName}
                </h2>
                <p className="text-sm text-red-800 mt-1">
                  JeevaCare ID: <span className="font-mono">{selectedPatient.jeevaId}</span>
                </p>
              </div>
              <div className="text-right">
                <Shield size={32} className="text-red-600 mb-2" />
                <p className="text-xs text-red-700">EMERGENCY MODE</p>
              </div>
            </div>
          </div>

          {/* Critical Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Blood Group */}
            {selectedPatient.bloodGroup && (
              <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-red-600">
                <div className="flex items-center gap-2 mb-2">
                  <Droplet size={20} className="text-red-600" />
                  <h3 className="font-semibold text-gray-900">Blood Group</h3>
                </div>
                <p className="text-2xl font-bold text-red-600">{selectedPatient.bloodGroup}</p>
              </div>
            )}

            {/* Critical Allergies */}
            {emergencyProfile?.allergies?.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-600">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={20} className="text-orange-600" />
                  <h3 className="font-semibold text-gray-900">Critical Allergies</h3>
                </div>
                <div className="space-y-1">
                  {emergencyProfile.allergies.map((allergy, idx) => (
                    <p key={idx} className="text-sm">
                      <span className="font-medium">{allergy.allergen}</span>
                      {' '}
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        allergy.severity === 'life-threatening'
                          ? 'bg-red-100 text-red-800'
                          : allergy.severity === 'severe'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {allergy.severity}
                      </span>
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Current Medications */}
            {emergencyProfile?.medications?.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-600">
                <div className="flex items-center gap-2 mb-2">
                  <Pill size={20} className="text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Current Medications</h3>
                </div>
                <ul className="space-y-1">
                  {emergencyProfile.medications.slice(0, 5).map((med, idx) => (
                    <li key={idx} className="text-sm text-gray-700">
                      {med}
                    </li>
                  ))}
                  {emergencyProfile.medications.length > 5 && (
                    <li className="text-sm text-gray-500 italic">
                      +{emergencyProfile.medications.length - 5} more
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Critical Conditions */}
            {emergencyProfile?.conditions?.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-600">
                <div className="flex items-center gap-2 mb-2">
                  <Heart size={20} className="text-purple-600" />
                  <h3 className="font-semibold text-gray-900">Critical Conditions</h3>
                </div>
                <ul className="space-y-1">
                  {emergencyProfile.conditions.map((cond, idx) => (
                    <li key={idx} className="text-sm">
                      <span className="font-medium">{cond.condition}</span>
                      {' '}
                      <span className="text-gray-600 text-xs">({cond.severity})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Recent Clinical Events */}
          {criticalInfo && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock size={20} />
                Recent Clinical Events
              </h3>
              <div className="space-y-2">
                {/* Mock recent events */}
                <div className="border-l-4 border-blue-400 pl-4 py-2">
                  <p className="font-medium text-gray-900">Recent Hospitalization</p>
                  <p className="text-sm text-gray-600">2 months ago - Chest pain evaluation</p>
                </div>
                <div className="border-l-4 border-green-400 pl-4 py-2">
                  <p className="font-medium text-gray-900">Current Medications</p>
                  <p className="text-sm text-gray-600">
                    Lisinopril 10mg, Atorvastatin 20mg, Aspirin 81mg
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleReset}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              New Search
            </button>
            <button
              onClick={handleViewFullHistory}
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'View Full History'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Full History */}
      {step === 3 && fullHistory && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              Full patient history is now displayed. All access is audited and logged.
            </p>
          </div>

          {/* Patient Summary */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Patient Summary</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-semibold">
                  {fullHistory.personalIdentity.firstName} {fullHistory.personalIdentity.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Age</p>
                <p className="font-semibold">
                  {new Date().getFullYear() - new Date(fullHistory.personalIdentity.dateOfBirth).getFullYear()} years
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Blood Group</p>
                <p className="font-semibold">{fullHistory.bloodGroup || 'Not recorded'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Contact</p>
                <p className="font-semibold">{fullHistory.personalIdentity.phone || 'Not available'}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => setStep(2)}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Back to Emergency Info
            </button>
            <button
              onClick={handleReset}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Complete & Exit
            </button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

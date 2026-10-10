import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  Save,
  Check,
} from 'lucide-react';
import PageContainer from '../components/Layout/PageContainer';
import SectionTitle from '../components/Layout/SectionTitle';
import LoadingSkeleton from '../components/State/LoadingSkeleton';
import { useToast } from '../components/State/Toast';

/**
 * ProviderEncounterPage
 * Allows healthcare providers to:
 * 1. Create clinical encounters (appointment-based)
 * 2. Capture clinical information (diagnosis, medications, observations)
 * 3. Create official clinical records
 * 4. Complete encounter
 */
export default function ProviderEncounterPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { success, error: showError } = useToast();

  const appointmentId = searchParams.get('appointmentId');
  const patientId = searchParams.get('patientId');

  const [step, setStep] = useState(1); // 1: Encounter info, 2: Clinical capture, 3: Summary
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [encounter, setEncounter] = useState(null);

  // Encounter form state
  const [encounterType, setEncounterType] = useState('consultation');
  const [encounterNotes, setEncounterNotes] = useState('');

  // Clinical records captured
  const [clinicalRecords, setClinicalRecords] = useState([]);

  // Current record being added
  const [currentRecord, setCurrentRecord] = useState({
    recordType: 'consultation',
    diagnosis: '',
    symptoms: '',
    findings: '',
    medications: '',
    procedures: '',
    followUp: '',
  });

  const token = user?.token || localStorage.getItem('token');

  /**
   * Create encounter
   */
  const handleCreateEncounter = async () => {
    if (!patientId || !appointmentId) {
      setError('Missing patient or appointment ID');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const encounterData = {
        appointmentId,
        patientId,
        doctorId: user._id || user.id,
        facilityId: user.facilityId,
        encounterType,
        notes: encounterNotes,
      };

      const response = await fetch('/api/v1/encounters', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(encounterData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create encounter');
      }

      const data = await response.json();
      setEncounter(data.data);
      setStep(2);
      success('Encounter created successfully');
    } catch (err) {
      setError(err.message);
      showError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Add clinical record
   */
  const handleAddRecord = () => {
    if (!currentRecord.recordType) {
      setError('Please select record type');
      return;
    }

    setClinicalRecords([...clinicalRecords, { ...currentRecord, id: Date.now() }]);
    setCurrentRecord({
      recordType: 'consultation',
      diagnosis: '',
      symptoms: '',
      findings: '',
      medications: '',
      procedures: '',
      followUp: '',
    });
    setError(null);
  };

  /**
   * Remove clinical record
   */
  const handleRemoveRecord = (recordId) => {
    setClinicalRecords(clinicalRecords.filter((r) => r.id !== recordId));
  };

  /**
   * Save clinical records
   */
  const handleSaveRecords = async () => {
    if (clinicalRecords.length === 0) {
      setError('Please add at least one clinical record');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Create clinical records
      for (const record of clinicalRecords) {
        const recordData = {
          patientId,
          encounterId: encounter._id,
          facilityId: user.facilityId,
          providerId: user._id || user.id,
          recordType: record.recordType,
          data: {
            diagnosis: record.diagnosis || null,
            symptoms: record.symptoms || null,
            findings: record.findings || null,
            medications: record.medications?.split(',').map((m) => m.trim()) || [],
            procedures: record.procedures || null,
            followUp: record.followUp || null,
          },
          provider_verified: true, // Provider creating official record
          verifiedAt: new Date().toISOString(),
        };

        const response = await fetch('/api/v1/records', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(recordData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to create ${record.recordType} record`);
        }
      }

      // Complete encounter
      const completeResponse = await fetch(`/api/v1/encounters/${encounter._id}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completionNotes: `Encounter completed. ${clinicalRecords.length} clinical records created.`,
        }),
      });

      if (!completeResponse.ok) {
        throw new Error('Failed to complete encounter');
      }

      setStep(3);
      success('Clinical records saved successfully');
    } catch (err) {
      setError(err.message);
      showError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Complete and go back
   */
  const handleDone = () => {
    navigate('/provider');
  };

  return (
    <PageContainer>
      <SectionTitle icon={Stethoscope} title="Clinical Encounter" />

      {/* Step 1: Create Encounter */}
      {step === 1 && (
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Start Clinical Encounter</h2>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Appointment:</strong> {appointmentId?.substring(0, 12)}...
              </p>
              <p className="text-sm text-blue-900 mt-1">
                <strong>Patient:</strong> {patientId?.substring(0, 12)}...
              </p>
            </div>

            {/* Encounter Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Encounter Type *
              </label>
              <select
                value={encounterType}
                onChange={(e) => setEncounterType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="consultation">Consultation</option>
                <option value="follow-up">Follow-up</option>
                <option value="procedure">Procedure</option>
                <option value="emergency">Emergency</option>
                <option value="telehealth">Telehealth</option>
              </select>
            </div>

            {/* Encounter Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Initial Notes (Optional)
              </label>
              <textarea
                value={encounterNotes}
                onChange={(e) => setEncounterNotes(e.target.value)}
                placeholder="Initial observations, chief complaint, etc..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="4"
              />
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
                onClick={() => navigate('/provider')}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEncounter}
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating...' : 'Create Encounter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Capture Clinical Information */}
      {step === 2 && encounter && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Add Record Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Add Clinical Record</h2>

            <div className="space-y-4">
              {/* Record Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Record Type *
                  </label>
                  <select
                    value={currentRecord.recordType}
                    onChange={(e) =>
                      setCurrentRecord({ ...currentRecord, recordType: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="consultation">Consultation</option>
                    <option value="diagnosis">Diagnosis</option>
                    <option value="medication">Medication</option>
                    <option value="procedure">Procedure</option>
                    <option value="observation">Observation</option>
                  </select>
                </div>
              </div>

              {/* Diagnosis */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Diagnosis (if applicable)
                </label>
                <input
                  type="text"
                  value={currentRecord.diagnosis}
                  onChange={(e) =>
                    setCurrentRecord({ ...currentRecord, diagnosis: e.target.value })
                  }
                  placeholder="e.g., Hypertension, Type 2 Diabetes"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Symptoms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Symptoms
                </label>
                <textarea
                  value={currentRecord.symptoms}
                  onChange={(e) =>
                    setCurrentRecord({ ...currentRecord, symptoms: e.target.value })
                  }
                  placeholder="Patient-reported symptoms..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="2"
                />
              </div>

              {/* Clinical Findings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clinical Findings
                </label>
                <textarea
                  value={currentRecord.findings}
                  onChange={(e) =>
                    setCurrentRecord({ ...currentRecord, findings: e.target.value })
                  }
                  placeholder="Physical examination findings, vital signs, etc..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="2"
                />
              </div>

              {/* Medications */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medications (comma-separated)
                </label>
                <input
                  type="text"
                  value={currentRecord.medications}
                  onChange={(e) =>
                    setCurrentRecord({ ...currentRecord, medications: e.target.value })
                  }
                  placeholder="e.g., Aspirin 100mg daily, Lisinopril 10mg daily"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Procedures */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Procedures Performed
                </label>
                <input
                  type="text"
                  value={currentRecord.procedures}
                  onChange={(e) =>
                    setCurrentRecord({ ...currentRecord, procedures: e.target.value })
                  }
                  placeholder="e.g., Blood pressure check, ECG"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Follow-up */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Follow-up Instructions
                </label>
                <textarea
                  value={currentRecord.followUp}
                  onChange={(e) =>
                    setCurrentRecord({ ...currentRecord, followUp: e.target.value })
                  }
                  placeholder="e.g., Return in 2 weeks, continue medication, monitor blood pressure daily"
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

              {/* Add button */}
              <div>
                <button
                  onClick={handleAddRecord}
                  disabled={isLoading}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Plus size={20} />
                  Add Record
                </button>
              </div>
            </div>
          </div>

          {/* Records Summary */}
          {clinicalRecords.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Clinical Records ({clinicalRecords.length})
              </h3>

              <div className="space-y-3">
                {clinicalRecords.map((record, idx) => (
                  <div
                    key={record.id}
                    className="border border-gray-200 rounded-lg p-4 flex justify-between items-start"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {idx + 1}. {record.recordType}
                      </p>
                      {record.diagnosis && (
                        <p className="text-sm text-gray-600">Diagnosis: {record.diagnosis}</p>
                      )}
                      {record.findings && (
                        <p className="text-sm text-gray-600">
                          Findings: {record.findings.substring(0, 50)}...
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveRecord(record.id)}
                      className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Remove record"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => setStep(1)}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSaveRecords}
              disabled={clinicalRecords.length === 0 || isLoading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={20} />
              {isLoading ? 'Saving...' : 'Save & Complete Encounter'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Success */}
      {step === 3 && encounter && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 space-y-6 text-center">
            <CheckCircle size={48} className="text-green-600 mx-auto" />
            <h2 className="text-2xl font-semibold text-gray-900">
              Encounter Completed Successfully
            </h2>
            <p className="text-gray-600">
              {clinicalRecords.length} clinical records have been created and linked to the
              patient's health journey.
            </p>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-left">
              <h3 className="font-semibold text-green-900 mb-3">Summary</h3>
              <ul className="space-y-2 text-sm text-green-900">
                  <li className="flex gap-2">
                  <Check size={16} className="text-green-600 flex-shrink-0" />
                  <span>Encounter ID: {encounter._id?.substring(0, 16)}...</span>
                </li>
                <li className="flex gap-2">
                  <Check size={16} className="text-green-600 flex-shrink-0" />
                  <span>Clinical Records: {clinicalRecords.length}</span>
                </li>
                <li className="flex gap-2">
                  <Check size={16} className="text-green-600 flex-shrink-0" />
                  <span>Status: Completed</span>
                </li>
                <li className="flex gap-2">
                  <Check size={16} className="text-green-600 flex-shrink-0" />
                  <span>Records are now visible in patient timeline</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={handleDone}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Back to Provider Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

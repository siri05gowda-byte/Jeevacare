import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Users } from 'lucide-react';
import { patientService } from '../../services/patientService';
import { errorMessage } from '../../utils/errorMessage';
import { patientInitials, patientName } from '../../utils/patientDisplay';

/**
 * The patients assigned to the signed-in doctor, as a list to pick from.
 * `onSelect(patient)` is called with the patient the doctor clicks.
 */
export default function AssignedPatients({ facilityId = null, onSelect, selectedId = null, title = 'My Patients' }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await patientService.getMyAssignedPatients(facilityId);
      setPatients(Array.isArray(response?.data) ? response.data : []);
    } catch (err) {
      setError(errorMessage(err, 'Could not load your patients'));
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          <Users size={20} className="inline-block mr-2" />
          {title} {!loading && <span className="text-sm font-normal text-gray-500">({patients.length})</span>}
        </h2>
        <button type="button" onClick={load} className="text-gray-500 hover:text-gray-800" aria-label="Refresh patients">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && !loading && patients.length === 0 && (
        <p className="text-sm text-gray-600">
          No patients are assigned to you yet. Search for a patient and choose Assign to Me.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {patients.map((patient) => (
          <button
            key={patient._id}
            type="button"
            onClick={() => onSelect?.(patient)}
            className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
              String(selectedId) === String(patient._id)
                ? 'border-jeevacare-blue bg-blue-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span className="w-10 h-10 rounded-full bg-blue-100 text-jeevacare-blue flex items-center justify-center font-semibold">
              {patientInitials(patient)}
            </span>
            <span>
              <span className="block font-medium text-gray-900">{patientName(patient)}</span>
              <span className="block text-xs text-gray-500">{patient.jeevaId || 'No JeevaCare ID'}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

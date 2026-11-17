import React, { useEffect, useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import PageContainer from '../Layout/PageContainer';
import SectionTitle from '../Layout/SectionTitle';
import { patientService } from '../../services/patientService';
import { errorMessage } from '../../utils/errorMessage';
import { patientName } from '../../utils/patientDisplay';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-IN') : '—');

/**
 * What a hospital admin sees under Patients: who is registered at their hospital.
 * It is a list only. Treating patients (records, encounters, uploads) belongs to the doctors.
 */
export default function FacilityPatientList() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    patientService
      .getFacilityPatients()
      .then((response) => {
        if (!cancelled) setPatients(Array.isArray(response?.data) ? response.data : []);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, 'Could not load patients'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const shown = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return patients;
    return patients.filter((p) => `${patientName(p)} ${p.jeevaId || ''}`.toLowerCase().includes(needle));
  }, [patients, filter]);

  return (
    <PageContainer>
      <SectionTitle
        title="Patients"
        description="Everyone registered at your hospital"
        icon={<Users size={32} />}
      />

      <div className="card mb-6">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by name or JeevaCare ID…"
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading && <p className="text-gray-600">Loading patients…</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && (
        <div className="card overflow-x-auto">
          <p className="text-sm text-gray-500 mb-3">
            {shown.length} of {patients.length} patients
          </p>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">JeevaCare ID</th>
                <th className="py-2 pr-4 font-medium">Date of birth</th>
                <th className="py-2 font-medium">Registered</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((patient) => (
                <tr key={patient._id} className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-medium text-gray-900">{patientName(patient)}</td>
                  <td className="py-2 pr-4 text-gray-700">{patient.jeevaId || '—'}</td>
                  <td className="py-2 pr-4 text-gray-700">{formatDate(patient.personalIdentity?.dateOfBirth)}</td>
                  <td className="py-2 text-gray-700">{formatDate(patient.createdAt)}</td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-gray-500">
                    No patients to show.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}

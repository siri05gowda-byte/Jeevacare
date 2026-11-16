import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import DocumentCard from '../components/DocumentCard';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import { AlertCircle, Clock, Pill } from 'lucide-react';

export default function DischargeSummariesPage() {
  const { user } = useAuthStore();
  const [dischargeSummaries, setDischargeSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterFollowUp, setFilterFollowUp] = useState(false);

  useEffect(() => {
    loadDischargeSummaries();
  }, [user?.id]);

  const loadDischargeSummaries = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // In a real implementation, call your API endpoint
      // const response = await fetch(`/api/v1/discharge-summaries/patient/${user.id}`, {
      //   headers: { 'Authorization': `Bearer ${token}` }
      // });
      // const data = await response.json();
      // setDischargeSummaries(data.data);
      
      setDischargeSummaries([]);
    } catch (err) {
      console.error('Failed to load discharge summaries:', err);
      setError('Failed to load discharge summaries');
    } finally {
      setLoading(false);
    }
  };

  const followUpRequired = dischargeSummaries.filter(s => s.followUpRequired);
  const displaySummaries = filterFollowUp ? followUpRequired : dischargeSummaries;

  if (loading) {
    return <LoadingState message="Loading discharge summaries..." />;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Discharge Summaries</h1>
        <p className="text-gray-600 mt-2">Your hospitalization summaries and discharge instructions</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Follow-up Alert */}
      {followUpRequired.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded">
          <p className="font-semibold text-amber-900 flex items-center gap-2">
            <Clock size={20} />
            {followUpRequired.length} discharge{followUpRequired.length !== 1 ? 's' : ''} requiring follow-up
          </p>
        </div>
      )}

      {/* Filter */}
      {dischargeSummaries.length > 0 && (
        <div className="mb-6 flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filterFollowUp}
              onChange={(e) => setFilterFollowUp(e.target.checked)}
              className="rounded"
            />
            <span className="text-gray-700">Show follow-up required only</span>
          </label>
        </div>
      )}

      {displaySummaries.length > 0 ? (
        <div className="space-y-4">
          {displaySummaries.map((summary) => (
            <div key={summary._id} className="card">
              <DocumentCard
                data={summary}
                type="discharge"
                onView={(data) => console.log('View:', data)}
              />
              
              {/* Follow-up Instructions */}
              {summary.followUpRequired && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                  <p className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <AlertCircle size={18} />
                    Follow-up Instructions
                  </p>
                  <div className="space-y-2 text-sm text-blue-800">
                    {summary.followUpSpecialty && (
                      <p>• Specialty: <span className="font-medium">{summary.followUpSpecialty}</span></p>
                    )}
                    {summary.followUpSchedule && (
                      <p>• Schedule: <span className="font-medium">{summary.followUpSchedule}</span></p>
                    )}
                    {summary.dischargeInstructions && (
                      <p>• Instructions: <span className="font-medium">{summary.dischargeInstructions}</span></p>
                    )}
                  </div>
                </div>
              )}

              {/* Discharge Medications */}
              {summary.medications && summary.medications.length > 0 && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                  <p className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <Pill size={18} />
                    Discharge Medications
                  </p>
                  <ul className="space-y-2 text-sm text-green-800">
                    {summary.medications.map((med, idx) => (
                      <li key={idx}>
                        • <span className="font-medium">{med.medicationName}</span>
                        {med.dosage && <span> ({med.dosage})</span>}
                        {med.frequency && <span> - {med.frequency}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title={filterFollowUp ? "No follow-up required" : "No discharge summaries"}
          description={filterFollowUp 
            ? "All your discharges are complete" 
            : "Your hospitalization discharge summaries will appear here."
          }
          icon={<AlertCircle size={48} className="text-gray-300" />}
          action={{
            label: 'Contact Healthcare Provider',
            onClick: () => console.log('Contact provider')
          }}
        />
      )}

      {/* Information Banner */}
      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <AlertCircle size={20} />
          About Discharge Summaries
        </h3>
        <p className="text-sm text-blue-800">
          Discharge summaries provide important information about your hospitalization, including diagnosis, 
          treatments, medications, and follow-up instructions. Follow your discharge instructions carefully 
          and schedule any required follow-up appointments promptly. Share this information with your 
          primary care physician.
        </p>
      </div>
    </div>
  );
}

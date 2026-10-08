import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import DocumentCard from '../components/DocumentCard';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';

export default function LabResultsPage() {
  const { user } = useAuthStore();
  const [labResults, setLabResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterCritical, setFilterCritical] = useState(false);

  useEffect(() => {
    loadLabResults();
  }, [user?.id]);

  const loadLabResults = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // In a real implementation, call your API endpoint
      // const response = await fetch(`/api/v1/lab-results/patient/${user.id}`, {
      //   headers: { 'Authorization': `Bearer ${token}` }
      // });
      // const data = await response.json();
      // setLabResults(data.data);
      
      setLabResults([]);
    } catch (err) {
      console.error('Failed to load lab results:', err);
      setError('Failed to load lab results');
    } finally {
      setLoading(false);
    }
  };

  const criticalResults = labResults.filter(r => r.isCritical);
  const displayResults = filterCritical ? criticalResults : labResults;

  if (loading) {
    return <LoadingState message="Loading lab results..." />;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Laboratory Results</h1>
        <p className="text-gray-600 mt-2">Your test results and laboratory findings</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Critical Results Alert */}
      {criticalResults.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded">
          <p className="font-semibold text-red-900">
            ⚠️ {criticalResults.length} critical result{criticalResults.length !== 1 ? 's' : ''} requiring attention
          </p>
        </div>
      )}

      {/* Filter */}
      {labResults.length > 0 && (
        <div className="mb-6 flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filterCritical}
              onChange={(e) => setFilterCritical(e.target.checked)}
              className="rounded"
            />
            <span className="text-gray-700">Show critical results only</span>
          </label>
        </div>
      )}

      {displayResults.length > 0 ? (
        <div className="space-y-4">
          {displayResults.map((result) => (
            <DocumentCard
              key={result._id}
              data={result}
              type="laboratory"
              onView={(data) => console.log('View:', data)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={filterCritical ? "No critical results" : "No lab results recorded"}
          description={filterCritical 
            ? "No critical laboratory results at this time" 
            : "Your laboratory results will appear here. Request tests from your healthcare provider."
          }
          icon="🧪"
          action={{
            label: 'Contact Healthcare Provider',
            onClick: () => console.log('Contact provider')
          }}
        />
      )}

      {/* Information Banner */}
      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">🧪 About Your Lab Results</h3>
        <p className="text-sm text-blue-800">
          Keep track of all your laboratory tests in one place. Critical results are highlighted for your attention. 
          Share these results with your healthcare providers during consultations to ensure continuity of care. 
          Results are verified and securely stored.
        </p>
      </div>
    </div>
  );
}

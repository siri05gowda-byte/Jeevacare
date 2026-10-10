import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import DocumentCard from '../components/DocumentCard';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';

export default function RadiologyPage() {
  const { user } = useAuthStore();
  const [radiologyRecords, setRadiologyRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterCritical, setFilterCritical] = useState(false);

  useEffect(() => {
    loadRadiologyRecords();
  }, [user?.id]);

  const loadRadiologyRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // In a real implementation, call your API endpoint
      // const response = await fetch(`/api/v1/radiology/patient/${user.id}`, {
      //   headers: { 'Authorization': `Bearer ${token}` }
      // });
      // const data = await response.json();
      // setRadiologyRecords(data.data);
      
      setRadiologyRecords([]);
    } catch (err) {
      console.error('Failed to load radiology records:', err);
      setError('Failed to load radiology records');
    } finally {
      setLoading(false);
    }
  };

  const criticalRecords = radiologyRecords.filter(r => r.hasCriticalFindings);
  const displayRecords = filterCritical ? criticalRecords : radiologyRecords;

  if (loading) {
    return <LoadingState message="Loading radiology records..." />;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Radiology & Imaging</h1>
        <p className="text-gray-600 mt-2">Your medical imaging reports and studies</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Critical Findings Alert */}
      {criticalRecords.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded">
          <p className="font-semibold text-red-900 flex items-center gap-2">
            <AlertCircle size={20} className="text-red-600" />
            <span>{criticalRecords.length} imaging study{criticalRecords.length !== 1 ? 'ies' : ''} with critical findings</span>
          </p>
        </div>
      )}

      {/* Filter */}
      {radiologyRecords.length > 0 && (
        <div className="mb-6 flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filterCritical}
              onChange={(e) => setFilterCritical(e.target.checked)}
              className="rounded"
            />
            <span className="text-gray-700">Show critical findings only</span>
          </label>
        </div>
      )}

      {displayRecords.length > 0 ? (
        <div className="space-y-4">
          {displayRecords.map((record) => (
            <DocumentCard
              key={record._id}
              data={record}
              type="radiology"
              onView={(data) => console.log('View:', data)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={filterCritical ? "No critical findings" : "No radiology records"}
          description={filterCritical 
            ? "No radiology studies with critical findings at this time" 
            : "Your radiology reports and imaging studies will appear here."
          }
          icon={<Stethoscope size={48} className="text-blue-600" />}
          action={{
            label: 'Contact Healthcare Provider',
            onClick: () => console.log('Contact provider')
          }}
        />
      )}

      {/* Information Banner */}
      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2"><Stethoscope size={20} className="text-blue-600" /> About Your Radiology Records</h3>
        <p className="text-sm text-blue-800">
          Access all your medical imaging reports, including X-rays, CT scans, MRI, ultrasounds and other 
          diagnostic imaging. Critical findings are highlighted for immediate attention. Share these reports 
          with specialists and primary care physicians for coordinated care.
        </p>
      </div>
    </div>
  );
}

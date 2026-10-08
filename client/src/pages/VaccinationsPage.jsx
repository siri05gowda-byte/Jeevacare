import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import DocumentCard from '../components/DocumentCard';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';

export default function VaccinationsPage() {
  const { user } = useAuthStore();
  const [vaccinations, setVaccinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadVaccinations();
  }, [user?.id]);

  const loadVaccinations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // In a real implementation, call your API endpoint
      // const response = await fetch(`/api/v1/vaccinations/patient/${user.id}`, {
      //   headers: { 'Authorization': `Bearer ${token}` }
      // });
      // const data = await response.json();
      // setVaccinations(data.data);
      
      setVaccinations([]);
    } catch (err) {
      console.error('Failed to load vaccinations:', err);
      setError('Failed to load vaccinations');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading vaccinations..." />;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Vaccinations</h1>
        <p className="text-gray-600 mt-2">Your complete vaccination history</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {vaccinations.length > 0 ? (
        <div className="space-y-4">
          {vaccinations.map((vaccination) => (
            <DocumentCard
              key={vaccination._id}
              data={vaccination}
              type="vaccination"
              onView={(data) => console.log('View:', data)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No vaccinations recorded"
          description="Your vaccination history will appear here. Work with your healthcare provider to maintain your vaccination records."
          icon="💉"
          action={{
            label: 'Contact Healthcare Provider',
            onClick: () => console.log('Contact provider')
          }}
        />
      )}

      {/* Information Banner */}
      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">💉 About Your Vaccinations</h3>
        <p className="text-sm text-blue-800">
          Keep your vaccination records updated and easily accessible. Share your vaccination history 
          with healthcare providers during consultations. All vaccinations are verified and timestamped 
          for your health and safety.
        </p>
      </div>
    </div>
  );
}

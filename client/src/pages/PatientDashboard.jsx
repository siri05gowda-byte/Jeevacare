import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import HealthOverviewCard from '../components/HealthOverviewCard';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import AIHealthSummaryCard from '../components/AIHealthSummaryCard';

export default function PatientDashboard() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    vaccinations: 0,
    labResults: 0,
    radiology: 0,
    dischargeSummaries: 0,
    criticalItems: 0,
    documents: 0,
  });
  const [recentItems, setRecentItems] = useState([]);
  const [criticalAlerts, setCriticalAlerts] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, [user?.id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, this would call your API endpoints
      // For now, we'll initialize with empty state
      setStats({
        vaccinations: 0,
        labResults: 0,
        radiology: 0,
        dischargeSummaries: 0,
        criticalItems: 0,
        documents: 0,
      });
      setRecentItems([]);
      setCriticalAlerts([]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading your health dashboard..." />;
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Health Dashboard
        </h1>
        <p className="text-gray-600 mt-2">Your complete health overview in one place</p>
      </div>

      {/* Critical Alerts Section */}
      {criticalAlerts.length > 0 && (
        <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-semibold text-red-900 mb-4">⚠️ Critical Alerts</h2>
          <div className="space-y-3">
            {criticalAlerts.map((alert, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-red-100 rounded">
                <span className="text-xl">🚨</span>
                <div>
                  <p className="font-medium text-red-900">{alert.title}</p>
                  <p className="text-sm text-red-800 mt-1">{alert.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Health Statistics Cards */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Health Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <HealthOverviewCard
            title="Vaccinations"
            count={stats.vaccinations}
            icon="💉"
            color="blue"
          />
          <HealthOverviewCard
            title="Lab Results"
            count={stats.labResults}
            icon="🧪"
            color="green"
          />
          <HealthOverviewCard
            title="Radiology"
            count={stats.radiology}
            icon="🩻"
            color="purple"
          />
          <HealthOverviewCard
            title="Discharge Summaries"
            count={stats.dischargeSummaries}
            icon="📋"
            color="amber"
          />
          <HealthOverviewCard
            title="Documents"
            count={stats.documents}
            icon="📄"
            color="blue"
          />
          {stats.criticalItems > 0 && (
            <HealthOverviewCard
              title="⚠️ Critical Items"
              count={stats.criticalItems}
              icon="🚨"
              color="red"
            />
          )}
        </div>
      </div>

      {/* AI Health Summary */}
      <AIHealthSummaryCard patientId={user?.patient?.id || user?.id} currentUser={user} />

      {/* Recent Items Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Items</h2>
        {recentItems.length > 0 ? (
          <div className="space-y-4">
            {recentItems.map((item) => (
              <div key={item.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{item.date}</p>
                  </div>
                  <span className="text-2xl">{item.icon}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No recent items"
            description="Your recent health records will appear here"
            icon="📋"
          />
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Manage Records</h3>
          <div className="space-y-3">
            <button className="w-full text-left p-3 rounded border border-gray-200 hover:bg-blue-50 transition">
              <span className="text-lg mr-2">💉</span>
              <span className="font-medium">View Vaccinations</span>
            </button>
            <button className="w-full text-left p-3 rounded border border-gray-200 hover:bg-blue-50 transition">
              <span className="text-lg mr-2">🧪</span>
              <span className="font-medium">View Lab Results</span>
            </button>
            <button className="w-full text-left p-3 rounded border border-gray-200 hover:bg-blue-50 transition">
              <span className="text-lg mr-2">🩻</span>
              <span className="font-medium">View Radiology</span>
            </button>
            <button className="w-full text-left p-3 rounded border border-gray-200 hover:bg-blue-50 transition">
              <span className="text-lg mr-2">📋</span>
              <span className="font-medium">View Discharge Summaries</span>
            </button>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Information</h3>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-blue-50 rounded">
              <p className="font-medium text-gray-900">Blood Group</p>
              <p className="text-gray-600 mt-1">Not set</p>
            </div>
            <div className="p-3 bg-blue-50 rounded">
              <p className="font-medium text-gray-900">Known Allergies</p>
              <p className="text-gray-600 mt-1">No allergies recorded</p>
            </div>
            <div className="p-3 bg-blue-50 rounded">
              <p className="font-medium text-gray-900">Current Medications</p>
              <p className="text-gray-600 mt-1">None recorded</p>
            </div>
          </div>
        </div>
      </div>

      {/* Information Banner */}
      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ About Your Health Dashboard</h3>
        <p className="text-sm text-blue-800">
          Your health dashboard consolidates all your medical records, vaccinations, laboratory results, 
          radiology reports, and discharge summaries in one secure location. Critical information is 
          highlighted for quick reference. All data is encrypted and access is logged for your security.
        </p>
      </div>
    </div>
  );
}

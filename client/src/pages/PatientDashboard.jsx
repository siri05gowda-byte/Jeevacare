import React, { useEffect } from 'react';
import { Syringe, Beaker, Activity, Clipboard, FileText, AlertTriangle, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { usePatientStore } from '../stores/patientStore';
import HealthOverviewCard from '../components/HealthOverviewCard';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import AIHealthSummaryCard from '../components/AIHealthSummaryCard';

export default function PatientDashboard() {
  const { user } = useAuthStore();
  const {
    patient,
    stats,
    timeline,
    criticalInfo,
    loading,
    error,
    loadAllPatientData,
  } = usePatientStore();

  // Get patient ID from user context (could be user.id if user is patient, or user.patient.id if user is guardian)
  const patientId = user?.patient?.id || user?.id;

  useEffect(() => {
    if (patientId) {
      loadAllPatientData(patientId).catch((err) => {
        console.error('Failed to load dashboard data:', err);
      });
    }
  }, [patientId, loadAllPatientData]);

  if (loading) {
    return <LoadingState message="Loading your health dashboard..." />;
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-semibold text-red-900">Failed to Load Dashboard</h2>
          <p className="text-red-800 mt-2">{error}</p>
          <button
            onClick={() => patientId && loadAllPatientData(patientId)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Extract stats from patient data
  const displayStats = {
    vaccinations: stats?.vaccinations || 0,
    labResults: stats?.labResults || 0,
    radiology: stats?.radiology || 0,
    dischargeSummaries: stats?.dischargeSummaries || 0,
    criticalItems: Object.values(criticalInfo || {}).filter(v => v).length,
    documents: stats?.documents || 0,
  };

  // Get recent timeline items (last 5)
  const recentItems = timeline && timeline.length > 0 ? timeline.slice(0, 5) : [];

  // Extract critical alerts from critical info
  const criticalAlerts = [];
  if (criticalInfo?.allergies && criticalInfo.allergies.length > 0) {
    criticalAlerts.push({
      title: 'Known Allergies',
      description: criticalInfo.allergies.join(', '),
      icon: AlertTriangle,
    });
  }
  if (criticalInfo?.conditions && criticalInfo.conditions.length > 0) {
    criticalAlerts.push({
      title: 'Known Conditions',
      description: criticalInfo.conditions.join(', '),
      icon: Activity,
    });
  }
  if (criticalInfo?.medications && criticalInfo.medications.length > 0) {
    criticalAlerts.push({
      title: 'Current Medications',
      description: criticalInfo.medications.length + ' medications',
      icon: AlertCircle,
    });
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Health Dashboard - {patient?.personalIdentity?.firstName || 'Patient'}
        </h1>
        <p className="text-gray-600 mt-2">
          JeevaCare ID: {patient?.jeevaId || 'Loading...'} | Your complete health overview in one place
        </p>
      </div>

      {/* Critical Alerts Section */}
      {criticalAlerts.length > 0 && (
        <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
            <AlertTriangle size={20} />
            Critical Information
          </h2>
          <div className="space-y-3">
            {criticalAlerts.map((alert, idx) => {
              const IconComponent = alert.icon;
              return (
                <div key={idx} className="flex items-start gap-3 p-3 bg-red-100 rounded">
                  <IconComponent size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">{alert.title}</p>
                    <p className="text-sm text-red-800 mt-1">{alert.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Health Statistics Cards */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Health Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <HealthOverviewCard
            title="Vaccinations"
            count={displayStats.vaccinations}
            icon={<Syringe size={40} className="text-gray-400" />}
            color="blue"
          />
          <HealthOverviewCard
            title="Lab Results"
            count={displayStats.labResults}
            icon={<Beaker size={40} className="text-gray-400" />}
            color="green"
          />
          <HealthOverviewCard
            title="Radiology"
            count={displayStats.radiology}
            icon={<Activity size={40} className="text-gray-400" />}
            color="purple"
          />
          <HealthOverviewCard
            title="Discharge Summaries"
            count={displayStats.dischargeSummaries}
            icon={<Clipboard size={40} className="text-gray-400" />}
            color="amber"
          />
          <HealthOverviewCard
            title="Documents"
            count={displayStats.documents}
            icon={<FileText size={40} className="text-gray-400" />}
            color="blue"
          />
          {displayStats.criticalItems > 0 && (
            <HealthOverviewCard
              title="Critical Items"
              count={displayStats.criticalItems}
              icon={<AlertTriangle size={40} className="text-gray-400" />}
              color="red"
            />
          )}
        </div>
      </div>

      {/* AI Health Summary */}
      <AIHealthSummaryCard patientId={patientId} currentUser={user} />

      {/* Recent Items Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Timeline Events</h2>
        {recentItems.length > 0 ? (
          <div className="space-y-4">
            {recentItems.map((item) => (
              <div key={item._id || item.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {item.type || item.eventType || 'Event'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {item.date ? new Date(item.date).toLocaleDateString() : ''}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {item.facility || item.provider || 'JeevaCare'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: item.verificationStatus === 'provider_verified' ? '#dcfce7' : '#fef3c7',
                        color: item.verificationStatus === 'provider_verified' ? '#166534' : '#92400e',
                      }}>
                      {item.verificationStatus || 'pending'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No recent items"
            description="Your recent health records will appear here"
            icon={<Clipboard size={48} className="text-gray-300" />}
          />
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Manage Records</h3>
          <div className="space-y-3">
            <a href="/vaccinations" className="w-full text-left p-3 rounded border border-gray-200 hover:bg-blue-50 transition block">
              <span className="inline-flex mr-2"><Syringe size={20} className="text-blue-600" /></span>
              <span className="font-medium">View Vaccinations ({displayStats.vaccinations})</span>
            </a>
            <a href="/lab-results" className="w-full text-left p-3 rounded border border-gray-200 hover:bg-blue-50 transition block">
              <span className="inline-flex mr-2"><Beaker size={20} className="text-green-600" /></span>
              <span className="font-medium">View Lab Results ({displayStats.labResults})</span>
            </a>
            <a href="/radiology" className="w-full text-left p-3 rounded border border-gray-200 hover:bg-blue-50 transition block">
              <span className="inline-flex mr-2"><Activity size={20} className="text-purple-600" /></span>
              <span className="font-medium">View Radiology ({displayStats.radiology})</span>
            </a>
            <a href="/discharge-summaries" className="w-full text-left p-3 rounded border border-gray-200 hover:bg-blue-50 transition block">
              <span className="inline-flex mr-2"><Clipboard size={20} className="text-amber-600" /></span>
              <span className="font-medium">View Discharge Summaries ({displayStats.dischargeSummaries})</span>
            </a>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Information</h3>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-blue-50 rounded">
              <p className="font-medium text-gray-900">Blood Group</p>
              <p className="text-gray-600 mt-1">{criticalInfo?.bloodGroup || 'Not set'}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded">
              <p className="font-medium text-gray-900">Known Allergies</p>
              <p className="text-gray-600 mt-1">
                {criticalInfo?.allergies && criticalInfo.allergies.length > 0
                  ? criticalInfo.allergies.join(', ')
                  : 'No allergies recorded'}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded">
              <p className="font-medium text-gray-900">Current Medications</p>
              <p className="text-gray-600 mt-1">
                {criticalInfo?.medications && criticalInfo.medications.length > 0
                  ? `${criticalInfo.medications.length} medications`
                  : 'None recorded'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Information Banner */}
      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <AlertCircle size={20} />
          About Your Health Dashboard
        </h3>
        <p className="text-sm text-blue-800">
          Your health dashboard consolidates all your medical records, vaccinations, laboratory results, 
          radiology reports, and discharge summaries in one secure location. Critical information is 
          highlighted for quick reference. All data is encrypted and access is logged for your security.
        </p>
      </div>
    </div>
  );
}

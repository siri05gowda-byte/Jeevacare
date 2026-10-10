import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { AlertCircle, Calendar, FileText, Activity } from 'lucide-react';
import PageContainer from '../components/Layout/PageContainer';
import SectionTitle from '../components/Layout/SectionTitle';
import LoadingSkeleton from '../components/State/LoadingSkeleton';
import EmptyState from '../components/State/EmptyState';
import HealthTimeline from '../components/Timeline/HealthTimeline';
import RecordsBrowser from '../components/Records/RecordsBrowser';
import HealthExplainer from '../components/AI/HealthExplainer';
import { useToast, ToastContainer } from '../components/State/Toast';
import aiService from '../services/aiService';
import ttsService from '../services/ttsService';
import { isDemoModeEnabled, getDemoBadgeLabel, getDemoDemoDataDisclaimer } from '../utils/demoMode';

/**
 * PatientDashboard (V2)
 * 
 * Comprehensive patient health dashboard with:
 * - Health overview cards
 * - Critical alerts and important info
 * - Recent appointments
 * - Health timeline
 * - Records browser
 * - AI health explanations
 */
export default function PatientDashboardV2() {
  const { user } = useAuthStore();
  const { toasts, success, error: showError, remove } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [patientData, setPatientData] = useState(null);
  const [error, setError] = useState(null);
  const [aiExplanationData, setAiExplanationData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [demoMode, setDemoMode] = useState(isDemoModeEnabled());

  // Load patient data from real API only (no automatic demo fallback)
  useEffect(() => {
    const loadPatientData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setPatientData(null);
        
        const patientId = user?._id || user?.id;
        if (!patientId) {
          setError('User ID not available. Please log in again.');
          showError('Authentication error');
          return;
        }
        
        const token = user?.token || localStorage.getItem('token');
        if (!token) {
          setError('Authentication token not found. Please log in again.');
          showError('Authentication required');
          return;
        }
        
        const response = await fetch(`/api/v1/patients/${patientId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.status === 401 || response.status === 403) {
          setError('You do not have permission to view this patient data. Please contact your healthcare provider.');
          showError('Access denied');
          return;
        }
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          setError(
            errorData.message || 
            'Unable to load your health dashboard. The server is not responding. Please try again in a few moments.'
          );
          showError('Failed to load dashboard');
          return;
        }
        
        const data = await response.json();
        
        if (!data.success || !data.patient) {
          setError('Your health records could not be retrieved. Please try again.');
          showError('Failed to retrieve records');
          return;
        }
        
        // Normalize empty record collections
        const normalizedData = {
          ...data,
          patient: data.patient || {},
          stats: data.stats || {},
          criticalInfo: data.criticalInfo || { allergies: [], conditions: [], medications: [] },
          recentAppointments: data.recentAppointments || [],
          timeline: data.timeline || [],
          records: {
            lab_results: data.records?.lab_results || [],
            radiology: data.records?.radiology || [],
            discharge_summaries: data.records?.discharge_summaries || [],
            vaccinations: data.records?.vaccinations || [],
            documents: data.records?.documents || [],
          },
        };
        
        setPatientData(normalizedData);
        success('Patient data loaded successfully');
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        
        if (err.message.includes('network') || err.message.includes('fetch')) {
          setError('Network error: Unable to reach the server. Please check your connection and try again.');
        } else {
          setError('An unexpected error occurred while loading your health dashboard. Please try again.');
        }
        
        showError('Failed to load dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadPatientData();
    }
  }, [user, showError]);

  // Load AI explanation when patient data is ready
  // Only load if real data was retrieved; do not generate for missing/empty records
  useEffect(() => {
    const loadAiExplanation = async () => {
      // Only attempt AI explanation if we have real data and at least one record
      if (!patientData?.records?.lab_results?.[0]) {
        setAiExplanationData(null);
        return;
      }

      setAiLoading(true);
      try {
        const firstLabResult = patientData.records.lab_results[0];
        const explanation = await aiService.getHealthExplanation(
          firstLabResult.id,
          'lab_result',
          {
            title: firstLabResult.title,
            date: firstLabResult.date,
            detail: firstLabResult.detail,
          },
          selectedLanguage.toLowerCase()
        );

        setAiExplanationData({
          title: `Understanding: ${firstLabResult.title}`,
          text: explanation,
          isLoading: false,
        });
      } catch (error) {
        console.error('Failed to load AI explanation:', error);
        // Clear AI explanation on error; do not show fallback explanations
        setAiExplanationData(null);
      } finally {
        setAiLoading(false);
      }
    };

    if (patientData && !error) {
      loadAiExplanation();
    }
  }, [patientData, selectedLanguage, error]);

  if (isLoading) {
    return (
      <PageContainer>
        <SectionTitle
          title="Loading your health dashboard..."
          description="Please wait while we gather your health information"
        />
        <div className="space-y-8">
          <LoadingSkeleton type="card" count={2} />
          <LoadingSkeleton type="timeline" count={3} />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <SectionTitle
          title="Health Dashboard"
          description="Your complete health overview"
        />
        <div className="alert-error">
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 btn btn-primary"
          >
            Retry
          </button>
        </div>
      </PageContainer>
    );
  }

  const { patient, stats, criticalInfo, recentAppointments, timeline, records, aiExplanation } = patientData || {};

  return (
    <PageContainer>
      {/* Demo Mode Indicator - Only visible if demo mode explicitly enabled */}
      {demoMode && (
        <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔬</span>
            <div className="flex-1">
              <h3 className="font-bold text-yellow-900 text-lg">{getDemoBadgeLabel()}</h3>
              <p className="text-sm text-yellow-800 mt-1">{getDemoDemoDataDisclaimer()}</p>
              <p className="text-xs text-yellow-700 mt-2">
                Demo mode is enabled. All data displayed is for testing and demonstration purposes only.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <SectionTitle
        title={`Welcome, ${patient?.firstName}`}
        description="Your complete health overview in one place"
        icon={<Activity size={32} />}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={remove} position="bottom-right" />

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
        {/* JeevaCare ID Card */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Your ID</h3>
            <FileText size={20} className="text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-jeevacare-blue">{patient?.jeevaId}</p>
          <p className="text-xs text-gray-600 mt-2">JeevaCare Reference Number</p>
        </div>

        {/* Health Records Card */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Health Records</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Lab Results</span>
              <span className="font-semibold text-gray-900">{stats?.labResults || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Documents</span>
              <span className="font-semibold text-gray-900">{stats?.documents || 0}</span>
            </div>
          </div>
        </div>

        {/* Appointments Card */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Next Appointment</h3>
            <Calendar size={20} className="text-gray-400" />
          </div>
          {recentAppointments?.[0] ? (
            <>
              <p className="text-sm font-medium text-gray-900">{recentAppointments[0].title}</p>
              <p className="text-xs text-gray-600 mt-1">{recentAppointments[0].provider}</p>
              <p className="text-xs text-jeevacare-blue mt-2 font-medium">
                {new Date(recentAppointments[0].date).toLocaleDateString()}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-600">No upcoming appointments</p>
          )}
        </div>
      </div>

      {/* Critical Information Section */}
      {criticalInfo && Object.values(criticalInfo).some(v => v) && (
        <div className="mb-8 p-4 sm:p-6 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle size={24} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h3 className="font-semibold text-amber-900 mb-3">Important Health Information</h3>
              <div className="space-y-2 text-sm text-amber-800">
                {criticalInfo?.allergies?.length > 0 && (
                  <p>
                    <span className="font-medium">Allergies:</span> {criticalInfo.allergies.join(', ')}
                  </p>
                )}
                {criticalInfo?.conditions?.length > 0 && (
                  <p>
                    <span className="font-medium">Conditions:</span> {criticalInfo.conditions.join(', ')}
                  </p>
                )}
                {criticalInfo?.medications?.length > 0 && (
                  <p>
                    <span className="font-medium">Current Medications:</span> {criticalInfo.medications.join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Health Explanation - Only show if real data available */}
      {aiExplanationData && !error && (
        <div className="mb-8">
          <div className="mb-4 flex gap-2 items-center">
            <label className="text-sm font-medium text-gray-700">Language:</label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option>English</option>
              <option>Hindi</option>
              <option>Kannada</option>
              <option>Telugu</option>
              <option>Tamil</option>
              <option>Malayalam</option>
            </select>
          </div>
          <HealthExplainer
            title={aiExplanationData?.title}
            explanation={aiExplanationData?.text}
            isLoading={aiLoading}
            availableLanguages={['English', 'Hindi', 'Kannada', 'Telugu', 'Tamil', 'Malayalam']}
            currentLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            onPlayAudio={async (config) => {
              try {
                const audioBlob = await ttsService.synthesize(
                  config.text,
                  ttsService.getLanguageCode(config.language),
                  { rate: 1.0 }
                );
                await ttsService.play(audioBlob, ttsService.getLanguageCode(config.language));
              } catch (error) {
                console.error('TTS error:', error);
                showError('Unable to play audio');
              }
            }}
          />
        </div>
      )}

      {/* Health Timeline */}
      <div className="mb-8">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Health Timeline</h2>
          <p className="text-gray-600 text-sm mt-1">Your complete health history in chronological order</p>
        </div>
        <HealthTimeline
          events={timeline || []}
          isLoading={isLoading}
        />
      </div>

      {/* Records Browser */}
      <div>
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Health Records</h2>
          <p className="text-gray-600 text-sm mt-1">Access your complete medical records</p>
        </div>
        <RecordsBrowser
          recordsByType={records || {}}
          isLoading={isLoading}
          onViewRecord={(record) => {
            console.log('View record:', record);
            success(`Viewing ${record.title}`);
          }}
          onDownloadRecord={(record) => {
            console.log('Download record:', record);
            success(`Downloading ${record.title}`);
          }}
        />
      </div>
    </PageContainer>
  );
}

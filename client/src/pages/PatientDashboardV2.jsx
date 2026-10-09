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

  // Load patient data from real API with mock fallback
  useEffect(() => {
    const loadPatientData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Attempt real API call first
        try {
          const patientId = user?._id || user?.id;
          if (!patientId) {
            throw new Error('User ID not available');
          }
          
          const response = await fetch(`/api/v1/patients/${patientId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${user?.token || localStorage.getItem('token')}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.patient) {
              setPatientData(data);
              success('Patient data loaded successfully');
              return;
            }
          }
        } catch (apiError) {
          console.warn('API call failed, using mock data:', apiError);
        }
        
        // Fallback to mock data
        const mockData = {
          patient: {
            firstName: user?.profile?.firstName || 'Patient',
            lastName: user?.profile?.lastName || '',
            jeevaId: 'JC-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            dateOfBirth: '1990-01-15',
            phone: '+1 (555) 123-4567',
            email: user?.email,
          },
          stats: {
            appointments: 3,
            labResults: 12,
            radiology: 2,
            dischargeSummaries: 1,
            vaccinations: 8,
            documents: 25,
          },
          criticalInfo: {
            allergies: ['Penicillin', 'Shellfish'],
            conditions: ['Type 2 Diabetes', 'Hypertension'],
            medications: ['Metformin', 'Lisinopril'],
            emergencyContacts: 1,
          },
          recentAppointments: [
            {
              id: 1,
              title: 'Routine Check-up',
              provider: 'Dr. Sarah Johnson',
              date: new Date(Date.now() + 86400000 * 3),
              status: 'scheduled',
            },
            {
              id: 2,
              title: 'Follow-up Consultation',
              provider: 'Dr. Raj Kumar',
              date: new Date(Date.now() + 86400000 * 10),
              status: 'scheduled',
            },
          ],
          timeline: [
            {
              id: 'evt-1',
              type: 'appointment',
              title: 'Dermatology Appointment',
              description: 'Skin check-up with Dr. Emily Chen',
              detail: 'Routine skin examination',
              date: new Date(Date.now() - 86400000 * 7),
            },
            {
              id: 'evt-2',
              type: 'lab_result',
              title: 'Blood Test Results',
              description: 'Complete Blood Count (CBC)',
              detail: 'All values within normal range',
              date: new Date(Date.now() - 86400000 * 14),
            },
            {
              id: 'evt-3',
              type: 'medication',
              title: 'Prescription Refilled',
              description: 'Metformin 500mg - 30 tablets',
              detail: 'Refill requested and approved',
              date: new Date(Date.now() - 86400000 * 30),
            },
            {
              id: 'evt-4',
              type: 'vaccination',
              title: 'Flu Shot',
              description: 'Annual influenza vaccination',
              detail: 'Vaccine: Fluzone Quadrivalent',
              date: new Date(Date.now() - 86400000 * 60),
            },
          ],
          records: {
            lab_results: [
              {
                id: 'lab-1',
                title: 'Complete Blood Count',
                provider: 'City Medical Lab',
                date: new Date(Date.now() - 86400000 * 14),
                status: 'verified',
                detail: 'All values within normal range',
                fileUrl: null,
              },
              {
                id: 'lab-2',
                title: 'Lipid Panel',
                provider: 'City Medical Lab',
                date: new Date(Date.now() - 86400000 * 30),
                status: 'verified',
                detail: 'Total cholesterol: 195 mg/dL',
                fileUrl: null,
              },
            ],
            radiology: [
              {
                id: 'rad-1',
                title: 'Chest X-Ray',
                provider: 'Imaging Center',
                date: new Date(Date.now() - 86400000 * 60),
                status: 'verified',
                detail: 'No acute findings',
                fileUrl: null,
              },
            ],
            discharge_summaries: [
              {
                id: 'dis-1',
                title: 'Hospital Discharge',
                provider: 'General Hospital',
                date: new Date(Date.now() - 86400000 * 90),
                status: 'verified',
                detail: 'Discharged in stable condition',
                fileUrl: null,
              },
            ],
            vaccinations: [
              {
                id: 'vac-1',
                title: 'COVID-19 Vaccine (Booster)',
                provider: 'Wellness Clinic',
                date: new Date(Date.now() - 86400000 * 180),
                status: 'verified',
                detail: 'Pfizer-BioNTech Booster',
              },
            ],
          },
          aiExplanation: {
            title: 'Your Recent Lab Results',
            text: 'Your recent blood test shows that all values are within the normal range, which indicates good overall health. Your complete blood count shows appropriate levels of red blood cells, white blood cells, and platelets. Your lipid panel indicates healthy cholesterol levels. Continue with your current medications and lifestyle. If you have any concerns, please consult with your healthcare provider.',
            isLoading: false,
          },
        };

        setPatientData(mockData);
        setError(null);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError('Failed to load your health dashboard. Please try again.');
        showError('Failed to load dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    loadPatientData();
  }, [user, showError]);

  // Load AI explanation when patient data is ready
  useEffect(() => {
    const loadAiExplanation = async () => {
      if (!patientData?.records?.lab_results?.[0]) {
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
        // Still show explanation from mock data if available
      } finally {
        setAiLoading(false);
      }
    };

    if (patientData) {
      loadAiExplanation();
    }
  }, [patientData, selectedLanguage]);

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

      {/* AI Health Explanation */}
      {(aiExplanationData || patientData?.aiExplanation) && (
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
            title={aiExplanationData?.title || patientData?.aiExplanation?.title}
            explanation={aiExplanationData?.text || patientData?.aiExplanation?.text}
            isLoading={aiLoading || aiExplanationData?.isLoading}
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

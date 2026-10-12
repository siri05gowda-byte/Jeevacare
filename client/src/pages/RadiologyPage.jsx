import React, { useEffect, useState, useCallback } from 'react';
import { 
  AlertCircle, 
  Stethoscope, 
  Brain, 
  X, 
  Calendar, 
  User as UserIcon, 
  FileText, 
  CheckCircle2, 
  ShieldAlert, 
  Sparkles, 
  Filter, 
  RefreshCw,
  Building2,
  FileCheck
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import DocumentCard from '../components/DocumentCard';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import HealthExplainer from '../components/AI/HealthExplainer';
import aiService from '../services/aiService';
import ttsService from '../services/ttsService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export default function RadiologyPage() {
  const { user } = useAuthStore();
  const [radiologyRecords, setRadiologyRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterCritical, setFilterCritical] = useState(false);
  const [selectedModality, setSelectedModality] = useState('ALL');
  
  // Selected record for Detail & AI Explainer modal
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [aiExplanation, setAiExplanation] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [showOcrModal, setShowOcrModal] = useState(false);

  const resolvePatientId = useCallback(async (token) => {
    if (user?.profile?.patientId) return user.profile.patientId;
    if (user?.patientId) return user.patientId;

    if (user?.role === 'PATIENT') {
      try {
        const res = await fetch(`${API_BASE_URL}/patients/profile`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (res.ok) {
          const profileData = await res.json();
          if (profileData?.data?._id) return profileData.data._id;
        }
      } catch (err) {
        console.warn('Could not query /patients/profile for patientId resolution:', err);
      }
    }

    return user?._id || user?.id;
  }, [user]);

  const loadRadiologyRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const patientId = await resolvePatientId(token);
      if (!patientId) {
        setError('Unable to resolve patient identity. Please try logging in again.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/radiology/patient/${patientId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setRadiologyRecords(data.data || []);
    } catch (err) {
      console.error('Failed to load radiology records:', err);
      setError(err.message || 'Failed to load radiology records');
    } finally {
      setLoading(false);
    }
  }, [resolvePatientId]);

  useEffect(() => {
    if (user) {
      loadRadiologyRecords();
    }
  }, [user, loadRadiologyRecords]);

  // Generate AI Explanation for selected study
  const generateAiExplanation = useCallback(async (record, language) => {
    if (!record) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const explanation = await aiService.getHealthExplanation(
        record._id,
        'radiology',
        {
          modality: record.modalityType,
          bodyPart: record.bodyPart,
          clinicalIndication: record.clinicalIndication,
          findings: record.findings,
          impression: record.impression,
          recommendation: record.recommendation,
          studyDate: record.studyDate,
        },
        language
      );
      setAiExplanation(explanation);
    } catch (err) {
      console.error('AI Explanation error:', err);
      setAiError(err.message || 'Unable to generate AI explanation at this time');
      setAiExplanation(null);
    } finally {
      setAiLoading(false);
    }
  }, []);

  // When a record is selected, auto-trigger AI explanation in current language
  useEffect(() => {
    if (selectedRecord) {
      generateAiExplanation(selectedRecord, selectedLanguage);
    } else {
      setAiExplanation(null);
      setAiError(null);
    }
  }, [selectedRecord, selectedLanguage, generateAiExplanation]);

  const handleLanguageChange = (newLanguage) => {
    setSelectedLanguage(newLanguage);
  };

  const handlePlayAudio = async (config) => {
    try {
      const languageMap = {
        English: 'en',
        Hindi: 'hi',
        Kannada: 'kn',
        Telugu: 'te',
        Tamil: 'ta',
        Malayalam: 'ml',
        Spanish: 'es',
        French: 'fr',
      };
      const langCode = languageMap[config.language] || 'en';
      const audioBlob = await ttsService.synthesize(config.text, langCode, { rate: 1.0 });
      await ttsService.play(audioBlob, langCode);
    } catch (error) {
      console.error('TTS Audio Playback error:', error);
    }
  };

  // Filter records
  const filteredRecords = radiologyRecords.filter((record) => {
    if (filterCritical && !record.hasCriticalFindings) return false;
    if (selectedModality !== 'ALL' && record.modalityType?.toUpperCase() !== selectedModality) return false;
    return true;
  });

  const criticalRecordsCount = radiologyRecords.filter(r => r.hasCriticalFindings).length;

  if (loading) {
    return <LoadingState message="Loading radiology records..." />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
              <Stethoscope size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Radiology & Imaging</h1>
              <p className="text-gray-600 text-sm mt-0.5">
                Diagnostic imaging studies, radiologist interpretations, and AI-powered clinical explanations
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowOcrModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Sparkles size={16} />
            <span>AI / OCR Ingestion</span>
          </button>
          <button
            onClick={() => loadRadiologyRecords()}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh imaging records"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
          <button
            onClick={() => loadRadiologyRecords()}
            className="text-xs font-semibold text-red-700 underline hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Critical Findings Alert Banner */}
      {criticalRecordsCount > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert size={22} className="text-amber-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-amber-900 text-sm">
                  {criticalRecordsCount} imaging stud{criticalRecordsCount > 1 ? 'ies require' : 'y requires'} clinical attention
                </p>
                <p className="text-xs text-amber-800 mt-0.5">
                  Critical findings detected by radiologist evaluation. Consult your healthcare team immediately.
                </p>
              </div>
            </div>
            <button
              onClick={() => setFilterCritical(!filterCritical)}
              className="text-xs font-semibold px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded transition-colors"
            >
              {filterCritical ? 'Show All Studies' : 'Filter Critical Only'}
            </button>
          </div>
        </div>
      )}

      {/* Filter and Overview Controls */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-gray-700 text-sm font-medium mr-2">
            <Filter size={16} className="text-gray-500" />
            <span>Modality:</span>
          </div>
          {['ALL', 'X_RAY', 'CT_SCAN', 'MRI', 'ULTRASOUND', 'PET_SCAN'].map((modality) => (
            <button
              key={modality}
              onClick={() => setSelectedModality(modality)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedModality === modality
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {modality === 'ALL' ? 'All Modalities' : modality.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterCritical}
              onChange={(e) => setFilterCritical(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs font-medium">Critical findings only</span>
          </label>
          <span className="text-xs text-gray-500 border-l pl-3 border-gray-200">
            {filteredRecords.length} of {radiologyRecords.length} studies
          </span>
        </div>
      </div>

      {/* Record Cards Grid */}
      {filteredRecords.length > 0 ? (
        <div className="space-y-4">
          {filteredRecords.map((record) => (
            <div key={record._id} className="relative group">
              <DocumentCard
                data={record}
                type="radiology"
                onView={() => setSelectedRecord(record)}
              />
              {/* Quick AI Explanation CTA overlay button */}
              <div className="absolute top-4 right-24 sm:right-28">
                <button
                  onClick={() => setSelectedRecord(record)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors"
                >
                  <Brain size={14} className="text-indigo-600" />
                  <span>Explain with AI</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title={filterCritical ? 'No critical findings' : 'No radiology records found'}
          description={
            filterCritical
              ? 'None of your radiology studies match the critical findings filter.'
              : 'Your radiology reports, imaging studies, and X-ray records will appear here.'
          }
          icon={<Stethoscope size={48} className="text-blue-600" />}
          action={{
            label: filterCritical ? 'Reset Filters' : 'Refresh Records',
            onClick: () => {
              setFilterCritical(false);
              setSelectedModality('ALL');
              loadRadiologyRecords();
            },
          }}
        />
      )}

      {/* Information Banner */}
      <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Stethoscope size={20} className="text-blue-600" />
          About Your Radiology Records & AI Explainer
        </h3>
        <p className="text-sm text-blue-800 leading-relaxed">
          Diagnostic imaging records (including X-rays, CT scans, MRIs, and ultrasounds) are authored and verified by 
          licensed radiologists and qualified radiology technicians. JeevaCare's Radiology Explainer AI helps translate 
          complex clinical terminology, findings, and impressions into accessible, patient-friendly summaries in multiple 
          Indian languages with voice audio playback.
        </p>
      </div>

      {/* Study Detail & Radiology Explainer AI Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 animate-slide-in-up">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Stethoscope size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedRecord.modalityType?.replace('_', ' ').toUpperCase()} — {selectedRecord.bodyPart}
                  </h2>
                  <p className="text-xs text-gray-500">
                    Study Date: {new Date(selectedRecord.studyDate).toLocaleDateString()} • Report Date: {new Date(selectedRecord.reportDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Synthetic Demo Record Indicator Banner */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2.5 text-xs text-amber-900">
                <ShieldAlert size={16} className="text-amber-600 flex-shrink-0" />
                <span>
                  <strong>[DEMO SYNTHETIC RECORD]</strong> Generated for demonstration and clinical workflow validation. 
                  Not for real-world patient diagnosis.
                </span>
              </div>

              {/* Critical Findings Badge if applicable */}
              {selectedRecord.hasCriticalFindings && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5 text-xs text-red-900 font-medium">
                  <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                  <span>
                    Critical findings identified in this study. Radiologist flagged for priority clinical follow-up.
                  </span>
                </div>
              )}

              {/* Study Metadata Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm">
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Radiologist</span>
                  <p className="font-medium text-gray-900 mt-0.5 flex items-center gap-1.5">
                    <UserIcon size={14} className="text-gray-500" />
                    {selectedRecord.radiologistName || 'Not specified'}
                    {selectedRecord.radiologistLicense && (
                      <span className="text-xs text-gray-500 font-normal">({selectedRecord.radiologistLicense})</span>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Verification Status</span>
                  <p className="font-medium text-gray-900 mt-0.5 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-green-600" />
                    <span className="capitalize">{selectedRecord.verificationStatus?.replace('_', ' ') || 'Provider Verified'}</span>
                  </p>
                </div>
                {selectedRecord.facilityId && (
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Facility</span>
                    <p className="font-medium text-gray-900 mt-0.5 flex items-center gap-1.5">
                      <Building2 size={14} className="text-gray-500" />
                      {selectedRecord.facilityId.name || 'Authorized Medical Center'}
                    </p>
                  </div>
                )}
                {selectedRecord.clinicalIndication && (
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Clinical Indication</span>
                    <p className="font-medium text-gray-900 mt-0.5">{selectedRecord.clinicalIndication}</p>
                  </div>
                )}
              </div>

              {/* Clinical Report Content */}
              <div className="space-y-4">
                {selectedRecord.findings && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-1.5">
                      <FileText size={16} className="text-gray-600" />
                      Findings
                    </h4>
                    <div className="bg-white p-3.5 border border-gray-200 rounded-lg text-sm text-gray-800 leading-relaxed font-sans">
                      {selectedRecord.findings}
                    </div>
                  </div>
                )}

                {selectedRecord.impression && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-1.5">
                      <FileCheck size={16} className="text-gray-600" />
                      Impression
                    </h4>
                    <div className="bg-blue-50/50 p-3.5 border border-blue-200 rounded-lg text-sm text-gray-900 leading-relaxed font-medium">
                      {selectedRecord.impression}
                    </div>
                  </div>
                )}

                {selectedRecord.recommendation && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-1.5">Recommendation</h4>
                    <div className="bg-gray-50 p-3 border border-gray-200 rounded-lg text-sm text-gray-700">
                      {selectedRecord.recommendation}
                    </div>
                  </div>
                )}
              </div>

              {/* Radiology Explainer AI Section */}
              <div className="pt-4 border-t border-gray-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain size={20} className="text-indigo-600" />
                    <h3 className="font-semibold text-gray-900">Radiology Explainer AI</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600 font-medium">Language:</label>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                      className="text-xs border border-gray-300 rounded-md px-2.5 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option>English</option>
                      <option>Hindi</option>
                      <option>Kannada</option>
                      <option>Telugu</option>
                      <option>Tamil</option>
                      <option>Malayalam</option>
                    </select>
                  </div>
                </div>

                <HealthExplainer
                  title={`Understanding your ${selectedRecord.modalityType?.replace('_', ' ').toUpperCase()} study`}
                  explanation={aiExplanation}
                  recordType="radiology"
                  isLoading={aiLoading}
                  error={aiError}
                  isDemoData={true}
                  availableLanguages={['English', 'Hindi', 'Kannada', 'Telugu', 'Tamil', 'Malayalam']}
                  currentLanguage={selectedLanguage}
                  onLanguageChange={handleLanguageChange}
                  onPlayAudio={handlePlayAudio}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI / OCR Ingestion Info Modal */}
      {showOcrModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 animate-slide-in-up space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2.5 text-blue-700">
                <Sparkles size={22} />
                <h3 className="font-bold text-lg text-gray-900">Radiology AI & OCR Pipeline</h3>
              </div>
              <button
                onClick={() => setShowOcrModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              JeevaCare integrates Optical Character Recognition (OCR) with deep clinical NLP to ingest 
              scanned radiology reports, extract key radiological observations, and format them into FHIR-compliant 
              digital records.
            </p>
            <div className="bg-blue-50 p-3.5 rounded-lg border border-blue-200 text-xs text-blue-900 space-y-1.5">
              <p className="font-semibold">Supported Modalities:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Plain Radiographs (Chest, Extremity, Abdomen X-Rays)</li>
                <li>Computed Tomography (CT) scans with contrast</li>
                <li>Magnetic Resonance Imaging (MRI) reports</li>
                <li>Diagnostic Ultrasounds & Doppler studies</li>
              </ul>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowOcrModal(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

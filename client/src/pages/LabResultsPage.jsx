import React, { useEffect, useState, useCallback } from 'react';
import { 
  X, 
  FileText, 
  Brain,
  AlertCircle, 
  CheckCircle2, 
  Calendar,
  User as UserIcon,
  Download,
  RefreshCw,
  Flask,
  ShieldAlert
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import DocumentCard from '../components/DocumentCard';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import MedicalReportAnalyzer from '../components/MedicalReportAnalyzer';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export default function LabResultsPage() {
  const { user } = useAuthStore();
  const [labResults, setLabResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterCritical, setFilterCritical] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('English');

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
        console.warn('Could not query /patients/profile:', err);
      }
    }

    return user?._id || user?.id;
  }, [user]);

  useEffect(() => {
    if (user) {
      loadLabResults();
    }
  }, [user]);

  const loadLabResults = async () => {
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
        setLabResults([]);
        return;
      }

      // Fetch laboratory results for patient
      const response = await fetch(`${API_BASE_URL}/laboratory/patient/${patientId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setLabResults(data.data || []);
    } catch (err) {
      console.error('Failed to load lab results:', err);
      setError(err.message || 'Failed to load lab results');
    } finally {
      setLoading(false);
    }
  };

  const criticalResults = labResults.filter(r => r.isCritical || r.hasAbnormalValues);
  const displayResults = filterCritical ? criticalResults : labResults;

  if (loading) {
    return <LoadingState message="Loading laboratory results..." />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
              <Flask size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Laboratory Results</h1>
              <p className="text-gray-600 text-sm mt-0.5">
                Test results, lab values, and clinical interpretations with AI analysis
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => loadLabResults()}
          className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          title="Refresh lab results"
        >
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
          <button
            onClick={() => loadLabResults()}
            className="text-xs font-semibold text-red-700 underline hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Critical Results Alert Banner */}
      {criticalResults.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert size={22} className="text-amber-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-amber-900 text-sm">
                  {criticalResults.length} lab result{criticalResults.length > 1 ? 's require' : ' requires'} attention
                </p>
                <p className="text-xs text-amber-800 mt-0.5">
                  Abnormal values detected. Review with your healthcare provider.
                </p>
              </div>
            </div>
            <button
              onClick={() => setFilterCritical(!filterCritical)}
              className="text-xs font-semibold px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded transition-colors"
            >
              {filterCritical ? 'Show All' : 'Filter Critical Only'}
            </button>
          </div>
        </div>
      )}

      {/* Filter and Overview Controls */}
      {labResults.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterCritical}
              onChange={(e) => setFilterCritical(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs font-medium">Abnormal values only</span>
          </label>
          <span className="text-xs text-gray-500">
            {displayResults.length} of {labResults.length} results
          </span>
        </div>
      )}

      {/* Result Cards Grid */}
      {displayResults.length > 0 ? (
        <div className="space-y-4">
          {displayResults.map((result) => (
            <div key={result._id} className="relative group">
              <DocumentCard
                data={result}
                type="laboratory"
                onView={() => setSelectedResult(result)}
              />
              {/* Quick Analyze Button */}
              <div className="absolute top-4 right-24 sm:right-28">
                <button
                  onClick={() => setSelectedResult(result)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors"
                >
                  <Brain size={14} className="text-indigo-600" />
                  <span>AI Analysis</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title={filterCritical ? 'No abnormal results' : 'No laboratory results found'}
          description={
            filterCritical
              ? 'None of your lab results show abnormal values.'
              : 'Your lab results will appear here. Request tests from your healthcare provider.'
          }
          icon={<Flask size={48} className="text-blue-600" />}
          action={{
            label: filterCritical ? 'Reset Filters' : 'Refresh Results',
            onClick: () => {
              setFilterCritical(false);
              loadLabResults();
            },
          }}
        />
      )}

      {/* Information Banner */}
      <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Flask size={20} className="text-blue-600" />
          About Your Laboratory Results & AI Analysis
        </h3>
        <p className="text-sm text-blue-800 leading-relaxed">
          Lab results are authored and verified by certified laboratory professionals and pathologists. JeevaCare's AI 
          analyzer helps extract lab values, identify abnormal results, and provide accessible clinical interpretations 
          in multiple Indian languages with voice audio playback.
        </p>
      </div>

      {/* Lab Result Detail & AI Analysis Modal */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 animate-slide-in-up">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <FileText size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedResult.testName || 'Laboratory Result'}
                  </h2>
                  <p className="text-xs text-gray-500">
                    Collection Date: {selectedResult.collectionDate ? new Date(selectedResult.collectionDate).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedResult(null);
                  setAnalysisData(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Result Metadata Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm">
                {selectedResult.labName && (
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Laboratory</span>
                    <p className="font-medium text-gray-900 mt-0.5">{selectedResult.labName}</p>
                  </div>
                )}
                {selectedResult.testType && (
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Test Type</span>
                    <p className="font-medium text-gray-900 mt-0.5">{selectedResult.testType}</p>
                  </div>
                )}
                {selectedResult.collectionDate && (
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Collection Date</span>
                    <p className="font-medium text-gray-900 mt-0.5 flex items-center gap-1.5">
                      <Calendar size={14} className="text-gray-500" />
                      {new Date(selectedResult.collectionDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {selectedResult.status && (
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Status</span>
                    <p className="font-medium text-gray-900 mt-0.5 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-green-600" />
                      <span className="capitalize">{selectedResult.status.replace('_', ' ')}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* AI Medical Report Analysis Section */}
              {selectedResult._id && (
                <div className="pt-4 border-t border-gray-200">
                  <MedicalReportAnalyzer
                    documentId={selectedResult._id}
                    documentType="laboratory"
                    reportData={selectedResult}
                    selectedLanguage={selectedLanguage}
                    onAnalysisComplete={(analysis) => {
                      setAnalysisData(analysis);
                      // Update selected result with analysis
                      setSelectedResult(prev => ({
                        ...prev,
                        aiAnalysis: analysis
                      }));
                    }}
                  />
                </div>
              )}

              {/* Raw Lab Values Display (if available) */}
              {selectedResult.values && selectedResult.values.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-gray-900">Laboratory Values</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-100 border-b border-gray-200">
                          <th className="text-left p-2 font-semibold">Test</th>
                          <th className="text-right p-2 font-semibold">Value</th>
                          <th className="text-center p-2 font-semibold">Unit</th>
                          <th className="text-center p-2 font-semibold">Normal Range</th>
                          <th className="text-center p-2 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedResult.values.map((val, idx) => (
                          <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="p-2">{val.testName}</td>
                            <td className="text-right p-2 font-medium">{val.value}</td>
                            <td className="text-center p-2">{val.unit}</td>
                            <td className="text-center p-2 text-gray-600">{val.normalRange}</td>
                            <td className="text-center p-2">
                              {val.isAbnormal ? (
                                <span className={`font-semibold ${val.flag === 'H' ? 'text-red-600' : 'text-orange-600'}`}>
                                  {val.flag === 'H' ? '↑ High' : '↓ Low'}
                                </span>
                              ) : (
                                <span className="text-green-600">✓</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedResult(null);
                  setAnalysisData(null);
                }}
                className="px-5 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                Close
              </button>
              {selectedResult.documentUrl && (
                <a
                  href={selectedResult.documentUrl}
                  download
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Download size={14} />
                  Download Report
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Brain, RefreshCw, AlertCircle, CheckCircle, Globe, Loader } from 'lucide-react';
import api from '../services/api';

export default function AIHealthSummaryCard({ patientId }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState('en');

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिंदी (Hindi)' },
    { code: 'kn', name: 'ಕನ್ನಡ (Kannada)' },
    { code: 'te', name: 'తెలుగు (Telugu)' },
    { code: 'ta', name: 'தமிழ் (Tamil)' },
    { code: 'ml', name: 'മലയാളം (Malayalam)' },
  ];

  const loadSummary = async (regenerate = false) => {
    if (!patientId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.post(`/patients/${patientId}/ai-summary`, {
        language,
        regenerate,
      });

      if (response.success && response.summary) {
        setSummary(response.summary);
      } else {
        setError('Failed to load AI summary');
      }
    } catch (err) {
      console.error('AI summary error:', err);
      
      // Handle different error types
      if (err.response?.status === 403) {
        setError('You do not have permission to view this summary');
      } else if (err.response?.data?.code === 'NO_RECORDS') {
        setError(null);
        setSummary({ summaryContent: null, sourceRecordCount: 0 });
      } else if (err.response?.data?.code === 'AI_UNAVAILABLE') {
        setError('AI service is currently unavailable. Please try again later.');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to generate summary');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [patientId, language]);

  if (loading && !summary) {
    return (
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Brain size={24} className="text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI Health Summary</h2>
            <p className="text-sm text-gray-600">Generating your personalized summary...</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader size={32} className="animate-spin text-purple-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Brain size={24} className="text-purple-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">AI Health Summary</h2>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={() => loadSummary(false)}
                className="mt-2 text-sm text-red-700 hover:text-red-900 font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No records case
  if (summary && summary.sourceRecordCount === 0) {
    return (
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Brain size={24} className="text-purple-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">AI Health Summary</h2>
        </div>
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
          <p className="text-sm text-gray-600">
            No medical records available yet. Your AI health summary will appear here once you
            have clinical records, lab results, or other health data in the system.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Brain size={24} className="text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI Health Summary</h2>
            {summary?.generatedAt && (
              <p className="text-xs text-gray-500">
                Generated {new Date(summary.generatedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <div className="relative">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="pl-8 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent appearance-none bg-white"
              disabled={loading}
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
            <Globe
              size={16}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>

          {/* Regenerate Button */}
          <button
            onClick={() => loadSummary(true)}
            disabled={loading}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Regenerate summary"
          >
            <RefreshCw size={16} className={`text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Content */}
      {summary?.summaryContent ? (
        <div className="space-y-4">
          <div className="prose prose-sm max-w-none">
            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {summary.summaryContent}
            </div>
          </div>

          {/* Metadata */}
          {summary.sourceRecordCount > 0 && (
            <div className="pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Based on {summary.sourceRecordCount} medical record{summary.sourceRecordCount > 1 ? 's' : ''}
                {summary.modelInfo?.name && ` • Generated by ${summary.modelInfo.name}`}
              </p>
            </div>
          )}

          {/* Disclaimers */}
          {summary.disclaimers && summary.disclaimers.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="ml-2">
                  <p className="text-xs text-amber-800 font-medium mb-1">Important Notice</p>
                  {summary.disclaimers.map((disclaimer, index) => (
                    <p key={index} className="text-xs text-amber-700 mb-1 last:mb-0">
                      {disclaimer}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!summary.disclaimers && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="ml-2 text-xs text-amber-700">
                  This AI-generated summary is for informational purposes only and does not
                  replace professional medical advice, diagnosis, or treatment. Always consult
                  with your healthcare provider for medical guidance.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600 text-center">
            No summary content available
          </p>
        </div>
      )}
    </div>
  );
}

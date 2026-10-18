/**
 * Medical Report Analyzer Component
 * 
 * Handles AI analysis of medical reports including:
 * - Lab value extraction and abnormality detection
 * - OCR text extraction from documents
 * - Radiology image analysis
 * - Modality detection with honest labeling
 */

import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Loader, 
  AlertCircle, 
  CheckCircle, 
  HelpCircle,
  RefreshCw,
  Download,
  Eye
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export default function MedicalReportAnalyzer({ 
  documentId, 
  documentType, 
  reportData,
  onAnalysisComplete,
  selectedLanguage = 'English'
}) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  // Analyze the medical report on mount or when documentId changes
  useEffect(() => {
    if (documentId && documentType) {
      analyzeReport();
    }
  }, [documentId, documentType]);

  const analyzeReport = async () => {
    if (!documentId) {
      setError('No document ID provided');
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMessage('Analyzing medical report...');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Call the medical report analysis endpoint
      const response = await fetch(
        `${API_BASE_URL}/documents/${documentId}/analyze-medical-report`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reportType: documentType,
            language: selectedLanguage,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (result.data) {
        setAnalysis(result.data);
        setStatusMessage('Analysis complete');
        
        // Notify parent component
        if (onAnalysisComplete) {
          onAnalysisComplete(result.data);
        }
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message || 'Failed to analyze medical report');
      setStatusMessage('');
    } finally {
      setLoading(false);
    }
  };

  const checkAnalysisStatus = async () => {
    if (!documentId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/documents/${documentId}/analysis-status`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to check status');

      const result = await response.json();
      
      if (result.data.analysis) {
        setAnalysis(result.data.analysis);
        if (onAnalysisComplete) {
          onAnalysisComplete(result.data.analysis);
        }
      } else if (result.data.status === 'pending') {
        setStatusMessage('Analysis in progress...');
        // Poll again in 2 seconds
        setTimeout(checkAnalysisStatus, 2000);
      }
    } catch (err) {
      console.error('Status check error:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Analysis Status Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain size={20} className="text-indigo-600" />
            <div>
              <h4 className="font-semibold text-gray-900">AI Medical Report Analysis</h4>
              <p className="text-xs text-gray-600 mt-0.5">
                {loading ? 'Analyzing document...' : statusMessage || 'Ready to analyze'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loading && <Loader size={18} className="text-indigo-600 animate-spin" />}
            {!loading && analysis && <CheckCircle size={18} className="text-green-600" />}
            {!loading && error && <AlertCircle size={18} className="text-red-600" />}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
          <button
            onClick={() => analyzeReport()}
            className="text-xs font-semibold text-red-700 underline hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-4">
          {/* Lab Extraction Results */}
          {analysis.labExtraction && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="font-semibold text-gray-900">Laboratory Values</h5>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  {showDetails ? 'Hide' : 'Show'} Details
                </button>
              </div>

              {analysis.labExtraction.success ? (
                <div className="space-y-2">
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600">Total Values Extracted</p>
                      <p className="font-semibold text-gray-900">{analysis.labExtraction.values?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Abnormal Results</p>
                      <p className="font-semibold text-red-600">{analysis.labExtraction.abnormal?.length || 0}</p>
                    </div>
                    {analysis.labExtraction.testName && (
                      <div>
                        <p className="text-gray-600">Test Type</p>
                        <p className="font-semibold text-gray-900">{analysis.labExtraction.testName}</p>
                      </div>
                    )}
                    {analysis.labExtraction.collectionDate && (
                      <div>
                        <p className="text-gray-600">Collection Date</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(analysis.labExtraction.collectionDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Abnormal Results Alert */}
                  {analysis.labExtraction.abnormal?.length > 0 && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-xs font-semibold text-red-900 mb-2">
                        ⚠️ Abnormal Results ({analysis.labExtraction.abnormal.length})
                      </p>
                      <ul className="space-y-1">
                        {analysis.labExtraction.abnormal.slice(0, 5).map((val, idx) => (
                          <li key={idx} className="text-xs text-red-800">
                            {val.testName}: {val.value} {val.unit} ({val.flag === 'H' ? '↑ High' : '↓ Low'})
                          </li>
                        ))}
                        {analysis.labExtraction.abnormal.length > 5 && (
                          <li className="text-xs text-red-700 font-medium">
                            +{analysis.labExtraction.abnormal.length - 5} more
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Interpretation */}
                  {analysis.labExtraction.interpretation && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-xs font-semibold text-blue-900 mb-1">Interpretation</p>
                      <p className="text-xs text-blue-800">{analysis.labExtraction.interpretation}</p>
                    </div>
                  )}

                  {/* Detailed Table View */}
                  {showDetails && analysis.labExtraction.values?.length > 0 && (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-100 border-b border-gray-200">
                            <th className="text-left p-2 font-semibold">Test Name</th>
                            <th className="text-right p-2 font-semibold">Value</th>
                            <th className="text-center p-2 font-semibold">Unit</th>
                            <th className="text-center p-2 font-semibold">Range</th>
                            <th className="text-center p-2 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysis.labExtraction.values.map((val, idx) => (
                            <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="p-2">{val.testName}</td>
                              <td className="text-right p-2 font-medium">{val.value}</td>
                              <td className="text-center p-2">{val.unit}</td>
                              <td className="text-center p-2 text-gray-600">{val.referenceRange}</td>
                              <td className="text-center p-2">
                                {val.isAbnormal ? (
                                  <span className={`font-semibold ${val.flag === 'H' ? 'text-red-600' : 'text-orange-600'}`}>
                                    {val.flag === 'H' ? '↑' : '↓'}
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
                  )}

                  {/* Limitations */}
                  {analysis.labExtraction.limitations?.length > 0 && (
                    <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded">
                      <p className="text-xs font-semibold text-gray-700 mb-1">⚠️ Clinical Notes</p>
                      <ul className="space-y-1">
                        {analysis.labExtraction.limitations.map((limit, idx) => (
                          <li key={idx} className="text-xs text-gray-600">• {limit}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  {analysis.labExtraction.message || 'Unable to extract lab values from document'}
                </p>
              )}
            </div>
          )}

          {/* Modality Detection Results */}
          {analysis.modalityDetection && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              <h5 className="font-semibold text-gray-900">Imaging Modality Detection</h5>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Detected Modalities */}
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">Detected</p>
                  {analysis.modalityDetection.detected?.length > 0 ? (
                    <div className="space-y-1">
                      {analysis.modalityDetection.detected.map((mod, idx) => (
                        <div
                          key={idx}
                          className="px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900 font-medium"
                        >
                          {mod}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600">No modality detected</p>
                  )}
                </div>

                {/* Supported Modalities */}
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">Analysis Support</p>
                  {analysis.modalityDetection.supported?.length > 0 ? (
                    <div className="space-y-1">
                      {analysis.modalityDetection.supported.map((mod, idx) => (
                        <div
                          key={idx}
                          className="px-2 py-1 bg-green-50 border border-green-200 rounded text-xs text-green-900 font-medium flex items-center gap-1"
                        >
                          <CheckCircle size={12} />
                          {mod} - Supported
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600">No supported modalities</p>
                  )}
                </div>
              </div>

              {/* Unsupported Modality Notice */}
              {analysis.modalityDetection.unsupported?.length > 0 && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded">
                  <p className="text-xs font-semibold text-amber-900 mb-1">📋 Detected but Not Analyzed</p>
                  <p className="text-xs text-amber-800 mb-2">
                    The following modalities were detected but advanced AI analysis is not yet available:
                  </p>
                  <div className="space-y-1">
                    {analysis.modalityDetection.unsupported.map((mod, idx) => (
                      <div key={idx} className="text-xs text-amber-800">
                        • {mod}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-amber-700 mt-2 italic">
                    Manual radiologist review is recommended for these imaging types.
                  </p>
                </div>
              )}

              {/* isMockData Indicator */}
              {analysis.modalityDetection.isMockData && (
                <div className="p-2 bg-gray-100 border border-gray-300 rounded text-xs text-gray-700">
                  ℹ️ Modality detection result is from mock data. Real inference not available.
                </div>
              )}
            </div>
          )}

          {/* OCR Extraction Results */}
          {analysis.ocrExtraction && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              <h5 className="font-semibold text-gray-900">Text Extraction (OCR)</h5>
              
              {analysis.ocrExtraction.success ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-700">
                    {analysis.ocrExtraction.characterCount || 'Unknown'} characters extracted
                  </p>
                  {analysis.ocrExtraction.text && (
                    <div className="p-3 bg-gray-50 rounded border border-gray-200 max-h-48 overflow-y-auto">
                      <p className="text-sm text-gray-800 font-mono whitespace-pre-wrap">
                        {analysis.ocrExtraction.text.substring(0, 500)}
                        {analysis.ocrExtraction.text.length > 500 && '...'}
                      </p>
                    </div>
                  )}
                  {analysis.ocrExtraction.confidence !== undefined && (
                    <p className="text-xs text-gray-600">
                      OCR Confidence: {(analysis.ocrExtraction.confidence * 100).toFixed(1)}%
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  {analysis.ocrExtraction.message || 'Unable to extract text from document'}
                </p>
              )}
            </div>
          )}

          {/* Patient Isolation & Authorization Verification */}
          {analysis.authorizationChecks && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-600" />
                <p className="text-xs text-green-800 font-medium">
                  ✓ Patient isolation & authorization verified
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
          <Loader size={18} className="text-blue-600 animate-spin" />
          <p className="text-sm text-blue-800">Analyzing medical report... This may take a moment.</p>
        </div>
      )}

      {/* Action Buttons */}
      {!loading && analysis && (
        <div className="flex gap-2 justify-end pt-2 border-t border-gray-200">
          <button
            onClick={() => analyzeReport()}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} />
            Re-analyze
          </button>
          {analysis.labExtraction?.values && (
            <button
              onClick={() => {
                // Generate CSV export of lab values
                const csv = ['Test Name,Value,Unit,Reference Range,Status'];
                analysis.labExtraction.values.forEach(val => {
                  csv.push(
                    `"${val.testName}","${val.value}","${val.unit}","${val.referenceRange}","${val.isAbnormal ? val.flag : 'Normal'}"`
                  );
                });
                
                const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `lab-values-${new Date().toISOString()}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Download size={14} />
              Export CSV
            </button>
          )}
        </div>
      )}
    </div>
  );
}

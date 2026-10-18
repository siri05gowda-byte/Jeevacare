import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Loader,
  AlertTriangle,
  RefreshCw,
  Copy,
  Volume2,
} from 'lucide-react';
import radiologyService from '../services/radiologyService';
import ttsService from '../services/ttsService';

/**
 * RadiologyAIAnalyzer Component
 * 
 * Integrates AI-powered medical image analysis into the radiology workflow.
 * Supports:
 * - Chest X-ray analysis (initially)
 * - Multi-language explanations
 * - Clear mock-data labeling
 * - Unsupported modality handling
 * - Loading states and error handling
 */
export default function RadiologyAIAnalyzer({
  radiologyId,
  radiologyRecord,
  selectedLanguage = 'en',
  onAnalysisComplete = () => {},
}) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);

  const languageMap = {
    English: 'en',
    Hindi: 'hi',
    Kannada: 'kn',
    Telugu: 'te',
    Tamil: 'ta',
    Malayalam: 'ml',
  };

  /**
   * Trigger AI analysis
   */
  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const langCode = languageMap[selectedLanguage] || 'en';
      
      const response = await radiologyService.analyzeRadiologyImage(radiologyId, {
        language: langCode,
      });

      if (response.success && response.data) {
        setAnalysis(response.data);
        onAnalysisComplete(response.data);
      } else {
        setError(response.error || 'Failed to analyze image');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message || 'Unable to analyze image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if we can analyze this record
   */
  const canAnalyze = () => {
    if (!radiologyRecord) return false;
    if (!radiologyRecord.imageReference) return false;
    
    // Only chest X-rays are supported initially
    if (radiologyRecord.modalityType === 'x_ray' && 
        radiologyRecord.bodyPart && 
        radiologyRecord.bodyPart.toLowerCase().includes('chest')) {
      return true;
    }
    
    return false;
  };

  /**
   * Check if supported modality (but might not match current record)
   */
  const getSupportedModalities = () => {
    return ['chest_xray'];
  };

  /**
   * Get unsupported message
   */
  const getUnsupportedMessage = () => {
    if (!radiologyRecord) return 'Radiology record not found';
    if (!radiologyRecord.imageReference) return 'No image available for analysis';
    
    const modality = radiologyRecord.modalityType?.replace('_', ' ').toUpperCase();
    
    if (radiologyRecord.modalityType === 'x_ray') {
      return `${modality} analysis is currently only available for chest X-rays. Your image is from the ${radiologyRecord.bodyPart} region.`;
    }
    
    return `${modality} analysis is not yet supported. Currently, only chest X-ray analysis is available.`;
  };

  /**
   * Copy explanation to clipboard
   */
  const handleCopyExplanation = async () => {
    if (!analysis?.explanation) return;
    
    try {
      await navigator.clipboard.writeText(analysis.explanation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  /**
   * Play audio explanation
   */
  const handlePlayAudio = async () => {
    if (!analysis?.explanation || playingAudio) return;
    
    setPlayingAudio(true);
    try {
      const langCode = languageMap[selectedLanguage] || 'en';
      const audioBlob = await ttsService.synthesize(
        analysis.explanation,
        langCode,
        { rate: 1.0 }
      );
      await ttsService.play(audioBlob, langCode);
    } catch (err) {
      console.error('Audio playback error:', err);
      setError('Unable to play audio explanation');
    } finally {
      setPlayingAudio(false);
    }
  };

  // Determine if we should show the analyzer
  const isSupported = canAnalyze();
  const hasAnalysis = analysis && analysis.status === 'completed';
  const isUnsupported = analysis && analysis.status === 'unsupported_modality';
  const isFailed = analysis && analysis.status === 'failed';

  return (
    <div className="space-y-4">
      {/* Main Analyzer Section */}
      {!hasAnalysis && !isUnsupported && !isFailed && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-lg border border-indigo-200">
          {isSupported ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles size={20} className="text-indigo-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">
                      AI-Powered Image Analysis
                    </h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Get an AI-generated analysis of your chest X-ray
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium text-sm rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Analyze Image
                    </>
                  )}
                </button>
              </div>
              
              {/* Loading Indicator */}
              {loading && (
                <div className="mt-3 p-3 bg-white rounded border border-indigo-100">
                  <div className="flex items-center gap-2">
                    <Loader size={16} className="animate-spin text-indigo-600" />
                    <span className="text-sm text-gray-700">Analyzing your image...</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    This typically takes a few seconds. Do not refresh the page.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {getUnsupportedMessage()}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Check back soon as we expand support to other imaging modalities.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">{error}</p>
            {isSupported && (
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="mt-2 text-xs font-semibold text-red-700 underline hover:text-red-900"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      )}

      {/* Unsupported Modality Message */}
      {isUnsupported && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-900 text-sm">
                Modality Not Supported
              </h4>
              <p className="text-sm text-amber-800 mt-1">
                {analysis.error || getUnsupportedMessage()}
              </p>
              <p className="text-xs text-amber-700 mt-2">
                Currently, we support chest X-ray analysis. Other imaging types will be available soon.
              </p>
              <button
                onClick={handleAnalyze}
                className="mt-3 text-xs font-semibold text-amber-700 underline hover:text-amber-900"
              >
                Try Another Image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {hasAnalysis && (
        <div className="space-y-4">
          {/* Mock Data Warning */}
          {analysis.isMockData && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800">
                <strong>Demo Mode:</strong> This is sample AI analysis for testing purposes.
                Real clinical analysis will be available after model setup.
              </p>
            </div>
          )}

          {/* Success Indicator */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-green-600" />
              <h4 className="font-semibold text-green-900 text-sm">
                Analysis Complete
              </h4>
            </div>
            <p className="text-xs text-green-800 mt-1">
              Generated using {analysis.metadata?.model || 'AI model'} •
              {' '}
              {analysis.isMockData ? 'Demo' : 'Real'} analysis •
              Confidence: {(analysis.confidence * 100).toFixed(0)}%
            </p>
          </div>

          {/* Summary */}
          {analysis.summary && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Summary</h4>
              <div className="p-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 leading-relaxed">
                {analysis.summary}
              </div>
            </div>
          )}

          {/* Findings */}
          {analysis.findings && analysis.findings.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Key Findings</h4>
              <ul className="space-y-2">
                {analysis.findings.map((finding, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-indigo-600 font-bold mt-0.5">•</span>
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Patient-Friendly Explanation */}
          {analysis.explanation && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-900">
                  What This Means
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyExplanation}
                    title="Copy to clipboard"
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  >
                    {copied ? (
                      <CheckCircle2 size={16} className="text-green-600" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                  <button
                    onClick={handlePlayAudio}
                    disabled={playingAudio}
                    title="Play audio"
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                  >
                    <Volume2 size={16} />
                  </button>
                </div>
              </div>
              <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-lg text-sm text-gray-800 leading-relaxed">
                {analysis.explanation}
              </div>
            </div>
          )}

          {/* Limitations */}
          {analysis.limitations && analysis.limitations.length > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="text-xs font-semibold text-yellow-900 mb-1.5">Limitations</h4>
              <ul className="space-y-1">
                {analysis.limitations.map((limitation, index) => (
                  <li key={index} className="text-xs text-yellow-800 flex items-start gap-1.5">
                    <span className="text-yellow-600 mt-0.5">⚠</span>
                    <span>{limitation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Disclaimers */}
          {analysis.disclaimers && analysis.disclaimers.length > 0 && (
            <div className="p-3 bg-gray-50 border border-gray-300 rounded-lg">
              <h4 className="text-xs font-semibold text-gray-900 mb-1.5">⚕️ Clinical Disclaimers</h4>
              <ul className="space-y-1">
                {analysis.disclaimers.map((disclaimer, index) => (
                  <li key={index} className="text-xs text-gray-700 leading-relaxed">
                    • {disclaimer}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Analyze Again Button */}
          <div className="flex justify-center pt-2">
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Analyze Again
            </button>
          </div>
        </div>
      )}

      {/* Failed Analysis */}
      {isFailed && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900 text-sm">Analysis Failed</h4>
              <p className="text-sm text-red-800 mt-1">
                {analysis.error || 'Unable to analyze this image. Please try again.'}
              </p>
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="mt-3 text-xs font-semibold text-red-700 underline hover:text-red-900"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

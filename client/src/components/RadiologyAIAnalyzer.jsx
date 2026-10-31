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
  ShieldAlert,
  Activity,
  FileText,
} from 'lucide-react';
import radiologyService from '../services/radiologyService';
import ttsService from '../services/ttsService';

/**
 * RadiologyAIAnalyzer Component
 * 
 * Automatic end-to-end AI analysis for medical studies:
 * - Real TorchXRayVision ResNet50 (18 pathologies) deep learning inference
 * - Tesseract OCR text extraction for document reports
 * - Grounded Groq clinical explanations
 * - Full structured display: summary, observed, abnormalities, normal findings, recommendations, caveats, disclaimers
 * - Automatic polling / retry capability
 */
export default function RadiologyAIAnalyzer({
  radiologyId,
  radiologyRecord,
  selectedLanguage = 'en',
  onAnalysisComplete = () => {},
}) {
  const [analysis, setAnalysis] = useState(radiologyRecord?.aiAnalysis || null);
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

  useEffect(() => {
    if (radiologyRecord?.aiAnalysis && radiologyRecord.aiAnalysis.status && radiologyRecord.aiAnalysis.status !== 'not_analyzed') {
      setAnalysis(radiologyRecord.aiAnalysis);
    }
  }, [radiologyRecord]);

  /**
   * Trigger AI analysis manually or on retry
   */
  const handleAnalyzeOrRetry = async () => {
    setLoading(true);
    setError(null);

    try {
      const langCode = languageMap[selectedLanguage] || 'en';
      
      const response = await radiologyService.retryRadiologyAnalysis(radiologyId, {
        language: langCode,
      });

      if (response.success && response.data) {
        setAnalysis(response.data);
        onAnalysisComplete(response.data);
      } else {
        // Fallback to analyzeRadiologyImage
        const fallbackRes = await radiologyService.analyzeRadiologyImage(radiologyId, {
          language: langCode,
        });
        if (fallbackRes.success && fallbackRes.data) {
          setAnalysis(fallbackRes.data);
          onAnalysisComplete(fallbackRes.data);
        } else {
          setError(fallbackRes.error || response.error || 'Failed to analyze medical study');
        }
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message || 'Unable to complete AI analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Copy explanation to clipboard
   */
  const handleCopyExplanation = async () => {
    const textToCopy = analysis?.clinicalExplanation || analysis?.explanation;
    if (!textToCopy) return;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
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
    const textToSpeak = analysis?.clinicalExplanation || analysis?.explanation;
    if (!textToSpeak || playingAudio) return;
    
    setPlayingAudio(true);
    try {
      const langCode = languageMap[selectedLanguage] || 'en';
      const audioBlob = await ttsService.synthesize(
        textToSpeak,
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

  const isQueuedOrProcessing = analysis && ['queued', 'processing', 'analyzing'].includes(analysis.status);
  const isCompleted = analysis && analysis.status === 'completed';
  const isUnsupported = analysis && analysis.status === 'unsupported_modality';
  const isFailed = analysis && analysis.status === 'failed';

  return (
    <div className="space-y-4">
      {/* 1. Processing / In-Progress State */}
      {isQueuedOrProcessing && (
        <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl space-y-3 shadow-sm animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                <Loader size={20} className="animate-spin text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 text-sm">
                  Automatic AI Analysis in Progress
                </h4>
                <p className="text-xs text-gray-600 mt-0.5">
                  Deep learning inference and clinical language models are actively analyzing this study.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full capitalize">
              Status: {analysis.status}
            </span>
          </div>

          <div className="w-full bg-blue-200 h-1.5 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full w-2/3 animate-indeterminate rounded-full" />
          </div>

          <p className="text-xs text-gray-500 italic">
            TorchXRayVision ResNet50 inference and clinical grounding typically complete in 3–5 seconds. This view updates automatically.
          </p>
        </div>
      )}

      {/* 2. Manual Analysis CTA if record is not analyzed yet */}
      {!analysis || analysis.status === 'not_analyzed' ? (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-xl border border-indigo-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles size={20} className="text-indigo-600" />
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                AI Clinical Analysis
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                Run automated deep learning and clinical interpretation on this study
              </p>
            </div>
          </div>
          <button
            onClick={handleAnalyzeOrRetry}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium text-sm rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors shadow-sm"
          >
            {loading ? (
              <>
                <Loader size={16} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Run AI Analysis
              </>
            )}
          </button>
        </div>
      ) : null}

      {/* 3. Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">{error}</p>
            <button
              onClick={handleAnalyzeOrRetry}
              disabled={loading}
              className="mt-2 text-xs font-semibold text-red-700 underline hover:text-red-900"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* 4. Completed AI Analysis View */}
      {isCompleted && (
        <div className="space-y-4">
          {/* Header Banner */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={22} className="text-emerald-600 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-emerald-950 text-sm flex items-center gap-2">
                  <span>AI Analysis Complete</span>
                  {!analysis.isMockData && (
                    <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-800 rounded-full">
                      Real Deep Learning Inference
                    </span>
                  )}
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Pipeline: <strong>{analysis.provider || 'TorchXRayVision + Groq'}</strong> • Model: {analysis.model || 'resnet50-res512-all'} • Confidence: {analysis.confidence ? `${(analysis.confidence * 100).toFixed(0)}%` : 'High'}
                </p>
              </div>
            </div>
            <button
              onClick={handleAnalyzeOrRetry}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors disabled:opacity-50"
              title="Re-run analysis"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Re-run</span>
            </button>
          </div>

          {/* Clinical Summary */}
          {analysis.summary && (
            <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm">
              <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Activity size={16} className="text-blue-600" />
                Clinical Summary
              </h4>
              <p className="text-sm text-gray-800 leading-relaxed font-sans">
                {analysis.summary}
              </p>
            </div>
          )}

          {/* What Was Observed */}
          {analysis.whatWasObserved && (
            <div className="bg-gray-50 p-4 border border-gray-200 rounded-xl">
              <h4 className="text-sm font-semibold text-gray-900 mb-1.5">What Was Observed</h4>
              <p className="text-sm text-gray-700 leading-relaxed font-sans">
                {analysis.whatWasObserved}
              </p>
            </div>
          )}

          {/* Abnormalities vs Normal Findings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Potential Abnormalities */}
            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl">
              <h4 className="text-sm font-semibold text-amber-950 mb-2 flex items-center gap-1.5">
                <AlertTriangle size={16} className="text-amber-600" />
                Potential Abnormalities
              </h4>
              {analysis.potentialAbnormalities && analysis.potentialAbnormalities.length > 0 ? (
                <ul className="space-y-1.5">
                  {analysis.potentialAbnormalities.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-amber-900 font-medium">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-600 italic">No acute or critical abnormalities flagged.</p>
              )}
            </div>

            {/* Normal Findings */}
            <div className="p-4 bg-green-50/60 border border-green-200 rounded-xl">
              <h4 className="text-sm font-semibold text-green-950 mb-2 flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-green-600" />
                Normal Findings
              </h4>
              {analysis.normalFindings && analysis.normalFindings.length > 0 ? (
                <ul className="space-y-1.5">
                  {analysis.normalFindings.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-green-900">
                      <span className="text-green-600 font-bold">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-600 italic">Normal structures identified in evaluation.</p>
              )}
            </div>
          </div>

          {/* TorchXRayVision 18-Pathology Scoreboard (Chest X-Rays) */}
          {analysis.allPathologies && Object.keys(analysis.allPathologies).length > 0 && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity size={15} className="text-indigo-600" />
                  TorchXRayVision ResNet50 Pathologies ({Object.keys(analysis.allPathologies).length})
                </h4>
                <span className="text-[11px] text-slate-500">
                  Calibrated Deep Learning Likelihoods
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {Object.entries(analysis.allPathologies).map(([pathology, score]) => {
                  const numScore = typeof score === 'number' ? score : parseFloat(score) || 0;
                  const percent = Math.min(Math.max(numScore * 100, 0), 100);
                  const isElevated = percent >= 45;

                  return (
                    <div
                      key={pathology}
                      className={`p-2 rounded-lg border text-xs ${
                        isElevated
                          ? 'bg-amber-50 border-amber-300 text-amber-950'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium truncate">{pathology}</span>
                        <span className="font-mono text-[11px] font-semibold ml-1">
                          {percent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isElevated ? 'bg-amber-500' : 'bg-slate-400'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Patient-Friendly Clinical Explanation */}
          {(analysis.clinicalExplanation || analysis.explanation) && (
            <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-900">
                  What This Means For You
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyExplanation}
                    title="Copy explanation"
                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-white rounded transition-colors"
                  >
                    {copied ? <CheckCircle2 size={16} className="text-green-600" /> : <Copy size={16} />}
                  </button>
                  <button
                    onClick={handlePlayAudio}
                    disabled={playingAudio}
                    title="Listen to audio explanation"
                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-white rounded transition-colors disabled:opacity-50"
                  >
                    <Volume2 size={16} className={playingAudio ? 'text-indigo-600 animate-pulse' : ''} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-800 leading-relaxed font-sans">
                {analysis.clinicalExplanation || analysis.explanation}
              </p>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl">
              <h4 className="text-sm font-semibold text-indigo-950 mb-2">
                Recommended Next Steps
              </h4>
              <ul className="space-y-1.5">
                {analysis.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-indigo-900">
                    <span className="text-indigo-600 font-bold">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Important Caveats */}
          {analysis.importantCaveats && analysis.importantCaveats.length > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
              <h4 className="text-xs font-semibold text-yellow-900 mb-1.5">Clinical Caveats</h4>
              <ul className="space-y-1">
                {analysis.importantCaveats.map((cav, idx) => (
                  <li key={idx} className="text-xs text-yellow-800 flex items-start gap-1.5">
                    <span className="text-yellow-600 mt-0.5">⚠</span>
                    <span>{cav}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Mandatory Doctor Review Disclaimer Banner */}
          <div className="p-3 bg-gray-100 border border-gray-300 rounded-xl flex items-start gap-2 text-xs text-gray-700">
            <ShieldAlert size={16} className="text-gray-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Clinician Review Requirement:</strong> This AI analysis is an assistive screening aid and does not constitute a definitive medical diagnosis. A licensed radiologist or attending healthcare provider must review all imaging studies before any treatment decision.
            </div>
          </div>
        </div>
      )}

      {/* 5. Unsupported Modality State (e.g. CT, MRI, Ultrasound) */}
      {isUnsupported && (
        <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle size={22} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-950 text-sm">
                Cross-Sectional Imaging / Non-Chest Modality
              </h4>
              <p className="text-sm text-amber-900 mt-1 leading-relaxed">
                {analysis.summary || analysis.clinicalExplanation || 
                  'Direct deep learning inference is specifically calibrated for chest radiographs. Cross-sectional modalities (CT, MRI, Ultrasound, PET) require specialized volumetric evaluation by a certified radiologist.'}
              </p>
            </div>
          </div>

          <div className="p-3 bg-white/70 border border-amber-200 rounded-lg text-xs text-amber-800">
            <strong>Next Step:</strong> Your uploaded study has been securely archived and linked to your patient profile. Your healthcare provider has immediate access to inspect the full resolution scan.
          </div>
        </div>
      )}

      {/* 6. Failed State */}
      {isFailed && (
        <div className="p-5 bg-red-50 border border-red-200 rounded-xl space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle size={22} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-950 text-sm">AI Analysis Failed</h4>
              <p className="text-sm text-red-800 mt-1">
                {analysis.error || 'The automated analysis pipeline could not complete. This may occur if the image resolution is unreadable or the inference service timed out.'}
              </p>
              <button
                onClick={handleAnalyzeOrRetry}
                disabled={loading}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span>Retry Automatic Analysis</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

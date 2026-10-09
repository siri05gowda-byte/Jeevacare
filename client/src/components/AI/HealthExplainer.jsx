import React, { useState } from 'react';
import { Brain, Volume2, Languages, Loader } from 'lucide-react';

/**
 * HealthExplainer Component
 * 
 * Displays AI-generated health explanations with multilingual and TTS support.
 * Helps patients understand complex medical information in simple terms.
 * 
 * @component
 * @param {Object} props
 * @param {string} props.title - Explanation title
 * @param {string} props.explanation - The AI-generated explanation text
 * @param {string} [props.recordType='health_record'] - Type of record being explained
 * @param {boolean} [props.isLoading=false] - Loading state
 * @param {Function} [props.onPlayAudio] - Callback to play audio
 * @param {Array<string>} [props.availableLanguages=['English']] - Available languages
 * @param {string} [props.currentLanguage='English'] - Current language
 * @param {Function} [props.onLanguageChange] - Callback for language change
 * @returns {React.ReactElement}
 */
export default function HealthExplainer({
  title = 'Health Information',
  explanation = '',
  recordType = 'health_record',
  isLoading = false,
  onPlayAudio = null,
  availableLanguages = ['English'],
  currentLanguage = 'English',
  onLanguageChange = null,
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const handlePlayAudio = async () => {
    if (!onPlayAudio) return;
    setIsPlayingAudio(true);
    try {
      await onPlayAudio({
        text: explanation,
        language: currentLanguage,
      });
    } catch (error) {
      console.error('Error playing audio:', error);
    } finally {
      setIsPlayingAudio(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center gap-3 text-blue-800">
          <Loader size={20} className="animate-spin" />
          <p className="text-sm font-medium">Generating explanation...</p>
        </div>
      </div>
    );
  }

  if (!explanation) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-600 text-sm">
        <Brain size={20} className="mx-auto mb-2 opacity-50" />
        <p>No explanation available for this record.</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-blue-200">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <Brain size={24} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900">
                Health Explanation
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                AI-generated explanation to help you understand
              </p>
            </div>
          </div>

          {/* Toggle expanded */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0 p-1 hover:bg-blue-100 rounded transition-colors focus-visible:outline-offset-2"
            aria-expanded={isExpanded}
            aria-label="Toggle explanation"
          >
            <span className={`inline-block transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 sm:p-6 pt-3 sm:pt-4 space-y-4">
          {/* Explanation Text */}
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-800 leading-relaxed text-sm whitespace-pre-wrap">
              {explanation}
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-blue-100">
            {/* Language Selector */}
            {availableLanguages.length > 1 && onLanguageChange && (
              <div className="flex items-center gap-2">
                <Languages size={16} className="text-gray-600" />
                <select
                  value={currentLanguage}
                  onChange={(e) => onLanguageChange(e.target.value)}
                  className="text-xs bg-white border border-blue-200 rounded px-2 py-1 text-gray-700 focus-visible:outline-offset-2"
                  aria-label="Select language"
                >
                  {availableLanguages.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Audio Button */}
            {onPlayAudio && (
              <button
                onClick={handlePlayAudio}
                disabled={isPlayingAudio}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-300 text-blue-600 rounded hover:bg-blue-50 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-offset-2"
                aria-label="Play audio explanation"
              >
                {isPlayingAudio ? (
                  <>
                    <Loader size={14} className="animate-spin" />
                    Playing...
                  </>
                ) : (
                  <>
                    <Volume2 size={14} />
                    Listen
                  </>
                )}
              </button>
            )}

            {/* Disclaimer */}
            <p className="text-xs text-gray-600 ml-auto">
              ⓘ For medical advice, consult your healthcare provider.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

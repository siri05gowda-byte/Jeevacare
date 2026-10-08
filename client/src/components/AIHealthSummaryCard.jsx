import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api.js';
import '../styles/AIHealthSummaryCard.css';

/**
 * AI Health Summary Card Component
 * Displays AI-generated medical history summary with language selection and audio
 */
export default function AIHealthSummaryCard({ patientId, currentUser }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState('en');
  const [languages, setLanguages] = useState([]);
  const [explanationVisible, setExplanationVisible] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [isStale, setIsStale] = useState(false);

  // Supported languages
  const LANGUAGE_MAP = {
    en: 'English',
    hi: 'हिन्दी',
    kn: 'ಕನ್ನಡ',
    te: 'తెలుగు',
    ta: 'தமிழ்',
    ml: 'മലയാളം',
  };

  // Fetch available languages
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const response = await api.get(`/patients/${patientId}/ai-languages`);
        if (response.data.success) {
          setLanguages(response.data.languages);
        }
      } catch (err) {
        console.error('Failed to fetch languages:', err);
      }
    };

    fetchLanguages();
  }, [patientId]);

  // Generate or fetch summary
  const generateSummary = async (regenerate = false) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post(`/patients/${patientId}/ai-summary`, {
        language,
        regenerate,
      });

      if (response.data.success) {
        setSummary(response.data.summary);
        setExplanationVisible(false);
        setExplanation(null);
        setAudioUrl(null);
        setIsStale(response.data.summary.cacheStatus === 'stale');
      } else {
        setError(response.data.error || 'Failed to generate summary');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate summary');
      console.error('Summary generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generate explanation
  const generateExplanation = async () => {
    if (!summary) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.post(
        `/patients/${patientId}/ai-summary/${summary._id}/explain`,
        { language }
      );

      if (response.data.success) {
        setExplanation(response.data.explanation);
        setExplanationVisible(true);
      } else {
        setError(response.data.error || 'Failed to generate explanation');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate explanation');
      console.error('Explanation generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generate audio
  const generateAudio = async () => {
    if (!explanation) return;

    setAudioLoading(true);
    setError(null);

    try {
      const response = await api.post(`/patients/${patientId}/ai-audio`, {
        explanationText: explanation.explanation,
        language,
      });

      if (response.data.success) {
        setAudioUrl(response.data.audio.url);
      } else {
        setError(response.data.error || 'Failed to generate audio');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate audio');
      console.error('Audio generation error:', err);
    } finally {
      setAudioLoading(false);
    }
  };

  // Handle language change
  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    setExplanationVisible(false);
    setExplanation(null);
    setAudioUrl(null);
  };

  return (
    <div className="ai-health-summary-card">
      <div className="card-header">
        <h2>🤖 AI Health Summary</h2>
        {isStale && <span className="stale-badge">Stale</span>}
      </div>

      {/* Disclaimer */}
      <div className="disclaimer">
        <p>
          ⓘ This AI-generated summary is based on your documented JeevaCare records. It is for
          information and understanding only and does not replace professional medical advice.
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="error-state">
          <p>❌ {error}</p>
        </div>
      )}

      {/* Language Selector */}
      <div className="language-selector">
        <label>Language:</label>
        <div className="language-buttons">
          {Object.entries(LANGUAGE_MAP).map(([code, name]) => (
            <button
              key={code}
              className={`language-btn ${language === code ? 'active' : ''}`}
              onClick={() => handleLanguageChange(code)}
              disabled={loading}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Generating AI summary...</p>
        </div>
      )}

      {/* Summary Display */}
      {!loading && summary && (
        <div className="summary-content">
          <div className="summary-info">
            <p className="generated-at">Generated: {new Date(summary.generatedAt).toLocaleString()}</p>
            <p className="source-count">Based on {summary.sourceRecordCount} medical records</p>
            <p className="model-info">Provider: {summary.modelInfo.provider}</p>
          </div>

          {/* Summary Sections */}
          <div className="summary-sections">
            {summary.summaryContent.overview && (
              <section className="summary-section">
                <h3>Overview</h3>
                <p>{summary.summaryContent.overview.patientName || 'Patient'}</p>
              </section>
            )}

            {summary.summaryContent.allergies?.documented?.length > 0 && (
              <section className="summary-section">
                <h3>⚠️ Allergies</h3>
                <ul>
                  {summary.summaryContent.allergies.documented.map((allergy, i) => (
                    <li key={i}>{allergy}</li>
                  ))}
                </ul>
              </section>
            )}

            {summary.summaryContent.currentMedications?.medications?.length > 0 && (
              <section className="summary-section">
                <h3>💊 Current Medications</h3>
                <ul>
                  {summary.summaryContent.currentMedications.medications.map((med, i) => (
                    <li key={i}>
                      {med.name} {med.dosage && `- ${med.dosage}`}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {summary.summaryContent.conditions?.active?.length > 0 && (
              <section className="summary-section">
                <h3>📋 Known Conditions</h3>
                <ul>
                  {summary.summaryContent.conditions.active.map((condition, i) => (
                    <li key={i}>{condition}</li>
                  ))}
                </ul>
              </section>
            )}

            {summary.summaryContent.vaccinations?.completed?.length > 0 && (
              <section className="summary-section">
                <h3>💉 Vaccinations</h3>
                <p>{summary.summaryContent.vaccinations.completed.length} recorded</p>
              </section>
            )}

            {summary.summaryContent.missingInformation?.length > 0 && (
              <section className="summary-section missing">
                <h3>ℹ️ Missing Information</h3>
                <ul>
                  {summary.summaryContent.missingInformation.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button
              className="btn btn-primary"
              onClick={() => generateExplanation()}
              disabled={loading}
            >
              📖 Explain Simply
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => generateSummary(true)}
              disabled={loading}
            >
              🔄 Regenerate
            </button>
          </div>
        </div>
      )}

      {/* Explanation Display */}
      {explanationVisible && explanation && (
        <div className="explanation-content">
          <h3>📖 Simple Explanation</h3>
          <div className="explanation-text">{explanation.explanation}</div>

          {explanation.keyPoints?.length > 0 && (
            <div className="key-points">
              <h4>Key Points</h4>
              <ul>
                {explanation.keyPoints.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Audio Controls */}
          <div className="audio-section">
            {audioLoading && <p>Generating audio...</p>}
            {audioUrl && (
              <div className="audio-player">
                <audio controls>
                  <source src={audioUrl} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
            <button
              className="btn btn-audio"
              onClick={() => generateAudio()}
              disabled={audioLoading}
            >
              🔊 Listen
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !summary && (
        <div className="empty-state">
          <p>No AI summary generated yet</p>
          <button className="btn btn-primary" onClick={() => generateSummary()} disabled={loading}>
            Generate Summary
          </button>
        </div>
      )}
    </div>
  );
}

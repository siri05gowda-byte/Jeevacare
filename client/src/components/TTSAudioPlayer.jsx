/**
 * TTSAudioPlayer Component
 * Plays TTS-generated audio with controls
 * Supports: Play, Pause, Stop, Download, Language selection
 */

import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Mic, Play, Pause, Square, Volume2 } from 'lucide-react';
import { aiService } from '../services/aiService';
import '../styles/TTSAudioPlayer.css';

const TTSAudioPlayer = ({
  text,
  language = 'en',
  patientId = null,
  onGenerate = null,
  onError = null,
}) => {
  const audioRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isDemo, setIsDemo] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [supportedLanguages, setSupportedLanguages] = useState(['en', 'hi', 'kn', 'te', 'ta', 'ml']);

  // Load supported TTS languages on mount
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const response = await aiService.getTTSLanguages();
        if (response.success && response.languages) {
          setSupportedLanguages(response.languages);
        }
      } catch (error) {
        console.error('Failed to load TTS languages:', error);
      }
    };

    fetchLanguages();
  }, []);

  // Generate audio when text or language changes
  useEffect(() => {
    if (text && selectedLanguage) {
      generateAudio();
    }
  }, [text, selectedLanguage]);

  /**
   * Generate audio from text
   */
  const generateAudio = async () => {
    try {
      setLoading(true);
      setError(null);
      setAudioUrl(null);

      const response = await aiService.getTextToSpeech(text, selectedLanguage, patientId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to generate audio');
      }

      const audio = response.audio || response;
      setAudioUrl(audio.audioPath || audio.url);
      setDuration(audio.duration || 0);
      setIsDemo(audio.isDemo || false);

      if (onGenerate) {
        onGenerate(audio);
      }
    } catch (error) {
      const errorMsg = error.message || 'Failed to generate audio';
      setError(errorMsg);

      if (onError) {
        onError(error);
      }

      console.error('TTS generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle play/pause
   */
  const handlePlayPause = async () => {
    try {
      if (!audioRef.current) {
        return;
      }

      if (playing) {
        audioRef.current.pause();
        setPlaying(false);
      } else {
        // If no audio URL yet, generate it
        if (!audioUrl) {
          await generateAudio();
        }

        if (audioUrl) {
          audioRef.current.play();
          setPlaying(true);
        }
      }
    } catch (error) {
      console.error('Playback error:', error);
      setError('Failed to play audio');
    }
  };

  /**
   * Handle stop
   */
  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
      setCurrentTime(0);
    }
  };

  /**
   * Handle language change
   */
  const handleLanguageChange = (newLanguage) => {
    setSelectedLanguage(newLanguage);
    setAudioUrl(null);
    setPlaying(false);
    setCurrentTime(0);
  };

  /**
   * Handle time update
   */
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  /**
   * Handle audio end
   */
  const handleAudioEnd = () => {
    setPlaying(false);
    setCurrentTime(0);
  };

  /**
   * Format time display
   */
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Handle progress bar click
   */
  const handleProgressClick = (e) => {
    if (!audioRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = percent * duration;
  };

  return (
    <div className="tts-audio-player">
      {/* Language Selector */}
      <div className="tts-language-selector">
        <label>Language:</label>
        <select
          value={selectedLanguage}
          onChange={(e) => handleLanguageChange(e.target.value)}
          disabled={loading}
          className="tts-language-select"
        >
          {supportedLanguages.map((lang) => (
            <option key={lang} value={lang}>
              {lang.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="tts-loading">
          <div className="tts-spinner" />
          <span>Generating audio...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="tts-error">
          <AlertCircle size={18} className="tts-error-icon" />
          <span className="tts-error-text">{error}</span>
          <button onClick={() => setError(null)} className="tts-error-close">
            ×
          </button>
        </div>
      )}

      {/* Demo Warning */}
      {isDemo && audioUrl && (
        <div className="tts-demo-warning">
          <Mic size={18} className="demo-icon" />
          <span>DEMO MODE: Piper TTS not configured. This is mock audio.</span>
        </div>
      )}

      {/* Audio Player */}
      {audioUrl && (
        <div className="tts-player">
          {/* Controls */}
          <div className="tts-controls">
            <button
              onClick={handlePlayPause}
              disabled={loading}
              className={`tts-btn tts-play-btn ${playing ? 'playing' : ''}`}
              title={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause size={20} /> : <Play size={20} />}
            </button>

            <button
              onClick={handleStop}
              disabled={loading || !playing}
              className="tts-btn tts-stop-btn"
              title="Stop"
            >
              <Square size={20} />
            </button>

            {/* Progress Bar */}
            <div className="tts-progress-container">
              <div
                className="tts-progress-bar"
                onClick={handleProgressClick}
              >
                <div
                  className="tts-progress-fill"
                  style={{
                    width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%',
                  }}
                />
              </div>
            </div>

            {/* Time Display */}
            <div className="tts-time">
              <span className="tts-current-time">{formatTime(currentTime)}</span>
              <span className="tts-duration">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Hidden Audio Element */}
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleAudioEnd}
            onError={(e) => {
              console.error('Audio error:', e);
              setError('Failed to load audio');
            }}
          />
        </div>
      )}

      {/* No Audio State */}
      {!audioUrl && !loading && !error && (
        <div className="tts-empty-state">
          <Volume2 size={24} className="tts-empty-icon" />
          <span>No audio generated. Click Generate to create audio.</span>
        </div>
      )}
    </div>
  );
};

export default TTSAudioPlayer;

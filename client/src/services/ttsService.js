import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

/**
 * Text-to-Speech Service
 * 
 * Handles conversion of health information text to audio.
 * Integrates with backend Piper TTS adapter with Web Audio API fallback.
 */
const ttsService = {
  /**
   * Convert text to speech audio
   * @param {string} text - Text to convert
   * @param {string} language - Language code (e.g., 'en', 'hi', 'es')
   * @param {Object} options - Additional options
   * @returns {Promise<Blob>} Audio blob
   */
  async synthesize(text, language = 'en', options = {}) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/tts/generate`,
        {
          text,
          language,
          ...options,
        },
        {
          responseType: 'blob',
        }
      );

      return response.data;
    } catch (error) {
      console.error('TTS error:', error);
      // Fallback to browser Web Speech API
      return this.synthesizeWithWebSpeechAPI(text, language);
    }
  },

  /**
   * Play audio directly in browser
   * @param {Blob|string} audio - Audio blob or URL
   * @param {string} language - Language for fallback
   * @returns {Promise<void>}
   */
  async play(audio, language = 'en') {
    try {
      let audioUrl;

      if (typeof audio === 'string') {
        audioUrl = audio;
      } else if (audio instanceof Blob) {
        audioUrl = URL.createObjectURL(audio);
      } else {
        throw new Error('Invalid audio format');
      }

      const audioElement = new Audio(audioUrl);
      audioElement.play();

      return new Promise((resolve, reject) => {
        audioElement.onended = () => {
          if (audio instanceof Blob) {
            URL.revokeObjectURL(audioUrl);
          }
          resolve();
        };
        audioElement.onerror = () => {
          if (audio instanceof Blob) {
            URL.revokeObjectURL(audioUrl);
          }
          reject(new Error('Audio playback failed'));
        };
      });
    } catch (error) {
      console.error('Audio playback error:', error);
      throw error;
    }
  },

  /**
   * Synthesize speech using browser Web Speech API (fallback)
   * @private
   */
  synthesizeWithWebSpeechAPI(text, language = 'en') {
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);

      // Map language codes to Web Speech API locale
      const languageMap = {
        en: 'en-US',
        hi: 'hi-IN',
        es: 'es-ES',
        fr: 'fr-FR',
        de: 'de-DE',
        ta: 'ta-IN',
        te: 'te-IN',
        kn: 'kn-IN',
        ml: 'ml-IN',
      };

      utterance.lang = languageMap[language] || 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        console.log('Speech synthesis started');
      };

      utterance.onend = () => {
        console.log('Speech synthesis ended');
        // Return empty blob to indicate success (browser API doesn't return audio blob)
        resolve(new Blob());
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        reject(new Error(`Speech synthesis failed: ${event.error}`));
      };

      const synth = window.speechSynthesis;
      synth.cancel(); // Cancel any ongoing speech
      synth.speak(utterance);
    });
  },

  /**
   * Stop any playing audio
   */
  stop() {
    const synth = window.speechSynthesis;
    synth.cancel();
  },

  /**
   * Check if browser supports Web Speech API
   * @returns {boolean}
   */
  isWebSpeechAPISupported() {
    return (
      window.SpeechSynthesisUtterance &&
      window.speechSynthesis
    );
  },

  /**
   * Get supported language codes
   * @returns {Object} Map of language names to codes
   */
  getSupportedLanguages() {
    return {
      English: 'en',
      Hindi: 'hi',
      Spanish: 'es',
      French: 'fr',
      German: 'de',
      Tamil: 'ta',
      Telugu: 'te',
      Kannada: 'kn',
      Malayalam: 'ml',
    };
  },
};

export default ttsService;

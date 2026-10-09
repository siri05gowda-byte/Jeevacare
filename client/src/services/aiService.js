import api from './api';

export const aiService = {
  /**
   * Get AI-generated medical summary
   */
  getMedicalSummary: async (patientId, language = 'en') => {
    const response = await api.post(`/patients/${patientId}/medical-summary`, {
      language,
      includeContext: true,
    });
    return response;
  },

  /**
   * Get AI history summary
   */
  getHistorySummary: async (patientId, language = 'en') => {
    const response = await api.post(`/ai-summary/history`, {
      patientId,
      language,
    });
    return response;
  },

  /**
   * Translate text to specified language
   */
  translateText: async (text, targetLanguage) => {
    const response = await api.post('/translation/translate', {
      text,
      targetLanguage,
    });
    return response;
  },

  /**
   * Get text-to-speech audio
   */
  getTextToSpeech: async (text, language = 'en', patientId = null) => {
    const response = await api.post('/tts/generate', {
      explanationText: text,
      language,
      patientId,
    });
    return response;
  },

  /**
   * Get explained summary (simple language)
   */
  getExplainedSummary: async (patientId, language = 'en') => {
    const response = await api.post(`/explain-simply`, {
      patientId,
      language,
    });
    return response;
  },

  /**
   * Get OCR extraction from document
   */
  extractFromDocument: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/ocr/extract', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response;
  },

  /**
   * Analyze document quality
   */
  analyzeDocumentQuality: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/document-quality/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response;
  },

  /**
   * Get TTS service status
   */
  getTTSStatus: async () => {
    const response = await api.get('/tts/status');
    return response;
  },

  /**
   * Get available voices for a language
   */
  getTTSVoices: async (language = 'en') => {
    const response = await api.get(`/tts/voices/${language}`);
    return response;
  },

  /**
   * Get all supported TTS languages
   */
  getTTSLanguages: async () => {
    const response = await api.get('/tts/languages');
    return response;
  },
};

import { create } from 'zustand';
import { aiService } from '../services/aiService';

export const useAiStore = create((set, get) => ({
  // AI data
  medicalSummary: null,
  historySummary: null,
  explainedSummary: null,
  translatedText: null,
  ttsAudio: null,
  ocrResult: null,
  documentQuality: null,

  // UI state
  loading: false,
  error: null,
  currentLanguage: 'en',

  /**
   * Generate medical summary
   */
  generateMedicalSummary: async (patientId, language = 'en') => {
    set({ loading: true, error: null });
    try {
      const summary = await aiService.getMedicalSummary(patientId, language);
      set({ medicalSummary: summary, error: null, currentLanguage: language });
      return summary;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Generate history summary
   */
  generateHistorySummary: async (patientId, language = 'en') => {
    set({ loading: true, error: null });
    try {
      const summary = await aiService.getHistorySummary(patientId, language);
      set({ historySummary: summary, error: null, currentLanguage: language });
      return summary;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Translate text
   */
  translateText: async (text, targetLanguage) => {
    set({ loading: true, error: null });
    try {
      const response = await aiService.translateText(text, targetLanguage);
      const translated = response.translatedText || response.translation || response;
      set({ translatedText: translated, error: null });
      return translated;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Generate text-to-speech audio
   */
  generateTTS: async (text, language = 'en') => {
    set({ loading: true, error: null });
    try {
      const response = await aiService.getTextToSpeech(text, language);
      const audioUrl = response.audioUrl || response.url || response;
      set({ ttsAudio: audioUrl, error: null });
      return audioUrl;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Generate explained summary (simple language)
   */
  generateExplainedSummary: async (patientId, language = 'en') => {
    set({ loading: true, error: null });
    try {
      const summary = await aiService.getExplainedSummary(patientId, language);
      set({ explainedSummary: summary, error: null, currentLanguage: language });
      return summary;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Extract text from document using OCR
   */
  extractFromDocument: async (file) => {
    set({ loading: true, error: null });
    try {
      const result = await aiService.extractFromDocument(file);
      set({ ocrResult: result, error: null });
      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Analyze document quality
   */
  analyzeDocumentQuality: async (file) => {
    set({ loading: true, error: null });
    try {
      const quality = await aiService.analyzeDocumentQuality(file);
      set({ documentQuality: quality, error: null });
      return quality;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Set current language
   */
  setLanguage: (language) => {
    set({ currentLanguage: language });
  },

  /**
   * Clear all AI data
   */
  clearAll: () => {
    set({
      medicalSummary: null,
      historySummary: null,
      explainedSummary: null,
      translatedText: null,
      ttsAudio: null,
      ocrResult: null,
      documentQuality: null,
      error: null,
      currentLanguage: 'en',
    });
  },

  /**
   * Clear error
   */
  clearError: () => set({ error: null }),
}));

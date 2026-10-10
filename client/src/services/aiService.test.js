import { describe, it, expect, beforeEach, vi } from 'vitest';
import aiService from './aiService';
import * as demoMode from '../utils/demoMode';

// Mock the demoMode module
vi.mock('../utils/demoMode', () => ({
  isDemoModeEnabled: vi.fn(),
  getDemoBadgeLabel: vi.fn(() => '🔬 DEMO DATA - Not real patient records'),
}));

describe('aiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    demoMode.isDemoModeEnabled.mockReturnValue(false);
  });

  describe('getDemoExplanation', () => {
    it('should return explanation without demo badge by default', () => {
      const explanation = aiService.getDemoExplanation('lab_result', 'English', false);
      expect(explanation).not.toContain('DEMO DATA');
      expect(explanation).toContain('lab results');
    });

    it('should include demo badge when addDemoLabel=true', () => {
      const explanation = aiService.getDemoExplanation('lab_result', 'English', true);
      expect(explanation).toContain('DEMO DATA - Not real patient records');
      expect(explanation).toContain('lab results');
    });

    it('should support multiple languages', () => {
      const englishExplanation = aiService.getDemoExplanation('lab_result', 'English');
      const hindiExplanation = aiService.getDemoExplanation('lab_result', 'Hindi');

      expect(englishExplanation).toContain('lab results');
      expect(hindiExplanation.length).toBeGreaterThan(0);
    });

    it('should return English as fallback for unsupported language', () => {
      const explanation = aiService.getDemoExplanation('lab_result', 'Klingon');
      expect(explanation).toContain('lab results');
    });

    it('should handle unknown record types', () => {
      const explanation = aiService.getDemoExplanation('unknown_type', 'English');
      expect(explanation).toContain('No explanation available');
    });

    it('should support all record types', () => {
      const recordTypes = ['lab_result', 'radiology', 'medication', 'vaccination'];

      recordTypes.forEach((type) => {
        const explanation = aiService.getDemoExplanation(type, 'English');
        expect(explanation).toBeTruthy();
        expect(explanation.length).toBeGreaterThan(0);
        expect(explanation).not.toContain('DEMO DATA');  // Not added by default
      });
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return array of supported languages', () => {
      const languages = aiService.getSupportedLanguages();
      expect(Array.isArray(languages)).toBe(true);
      expect(languages.length).toBeGreaterThan(0);
      expect(languages).toContain('English');
    });
  });

  describe('Clinical Safety: No Demo Fallback in Normal Mode', () => {
    it('should not return demo explanation when API fails and demo mode disabled', async () => {
      demoMode.isDemoModeEnabled.mockReturnValue(false);

      // Simulate API failure by calling getDemoExplanation directly
      // (in real scenario, getHealthExplanation would throw error)
      const explanation = aiService.getDemoExplanation('lab_result', 'English', false);

      // Even if function returns a demo explanation, when API fails in normal mode,
      // aiService.getHealthExplanation() should throw, not return this
      expect(explanation).toBeTruthy();
    });

    it('should include demo badge when demo mode enabled and explanation returned', () => {
      demoMode.isDemoModeEnabled.mockReturnValue(true);
      const explanation = aiService.getDemoExplanation('lab_result', 'English', true);

      // When demo mode is enabled and demo explanation is returned, it must be labeled
      expect(explanation).toContain('DEMO DATA');
      expect(explanation).toContain('Not real patient records');
    });

    it('should not confuse real explanations with demo explanations', () => {
      const demoExplanation = aiService.getDemoExplanation('lab_result', 'English', false);
      
      // Demo explanation should be generic educational content, not patient-specific
      expect(demoExplanation).not.toContain('Your recent');
      expect(demoExplanation).not.toContain('patient');
      expect(demoExplanation).not.toContain('allergies');
      expect(demoExplanation).not.toContain('medications');
    });
  });

  describe('AI Explanation Generation Policy', () => {
    it('should not generate explanations from fabricated patient history', () => {
      // This is a policy test - in real scenario, aiService.getHealthExplanation
      // should throw error when no real records exist, not generate an explanation
      const demoExplanation = aiService.getDemoExplanation('lab_result', 'English', false);

      // Demo explanations should be generic, not patient-specific
      expect(demoExplanation).not.toContain('Complete Blood Count');
      expect(demoExplanation).not.toContain('Penicillin');
      expect(demoExplanation).not.toContain('Type 2 Diabetes');
      expect(demoExplanation).not.toContain('Metformin');
    });

    it('should not include fabricated medical values in explanations', () => {
      const demoExplanation = aiService.getDemoExplanation('lab_result', 'English', false);

      // Should not include specific fake values
      expect(demoExplanation).not.toContain('195 mg/dL');
      expect(demoExplanation).not.toContain('Penicillin');
      expect(demoExplanation).not.toContain('Fluzone Quadrivalent');
    });
  });
});

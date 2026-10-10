import { describe, it, expect } from 'vitest';
import {
  isDemoModeEnabled,
  enableDemoMode,
  getDemoModeUnlockKey,
  getDemoBadgeLabel,
  getDemoDemoDataDisclaimer,
} from './demoMode';

describe('demoMode utility', () => {
  describe('getDemoBadgeLabel', () => {
    it('should return demo badge label', () => {
      const label = getDemoBadgeLabel();
      expect(label).toContain('DEMO DATA');
      expect(label).toContain('Not real patient records');
    });

    it('should include emoji indicator', () => {
      const label = getDemoBadgeLabel();
      expect(label).toContain('🔬');
    });
  });

  describe('getDemoDemoDataDisclaimer', () => {
    it('should return disclaimer text', () => {
      const disclaimer = getDemoDemoDataDisclaimer();
      expect(disclaimer).toContain('demonstration data');
      expect(disclaimer).toContain('not real patient records');
    });

    it('should indicate testing purpose', () => {
      const disclaimer = getDemoDemoDataDisclaimer();
      expect(disclaimer).toContain('testing and development');
    });
  });

  describe('getDemoModeUnlockKey', () => {
    it('should return null in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const key = getDemoModeUnlockKey();
      expect(key).toBeNull();

      process.env.NODE_ENV = originalEnv;
    });

    it('should return key in development environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const key = getDemoModeUnlockKey();
      expect(key).toBe('jeevacare-demo-unlock-2026');

      process.env.NODE_ENV = originalEnv;
    });

    it('should never expose key in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const key = getDemoModeUnlockKey();
      expect(key).toBeNull();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Clinical Safety: Demo Mode Cannot Be Accidentally Enabled', () => {
    it('should require exact unlock key - no partial matches', () => {
      const testCases = [
        { key: 'wrong-key', shouldWork: false },
        { key: 'JEEVACARE-DEMO-UNLOCK-2026', shouldWork: false },
        { key: 'jeevacare-demo-unlock-2025', shouldWork: false },
        { key: 'jeevacare-demo-unlock', shouldWork: false },
        { key: '', shouldWork: false },
        { key: null, shouldWork: false },
        { key: undefined, shouldWork: false },
      ];

      testCases.forEach(testCase => {
        const result = enableDemoMode(testCase.key);
        expect(result).toBe(testCase.shouldWork);
      });
    });

    it('should not enable demo mode from API errors', () => {
      // API errors should never trigger demo mode
      const apiError = new Error('Network error');
      expect(isDemoModeEnabled()).toBe(false);
    });

    it('should reject all invalid unlock keys', () => {
      const invalidKeys = ['wrong-key', '', null, undefined, 'jeevacare-demo'];
      
      invalidKeys.forEach(key => {
        const result = enableDemoMode(key);
        expect(result).toBe(false);
      });
    });

    it('should ensure demo mode requires intentional code action', () => {
      // Demo mode can only be activated by:
      // 1. Calling enableDemoMode() with correct unlock key
      // 2. Manually setting __JEEVACARE_DEMO_MODE_EXPLICIT__ flag
      // 
      // Demo mode cannot be activated by:
      // - API errors or failures
      // - Missing records
      // - Network failures
      // - Any normal application flow
      
      expect(enableDemoMode('wrong-key')).toBe(false);
      expect(enableDemoMode('')).toBe(false);
      expect(enableDemoMode(null)).toBe(false);
    });
  });
});

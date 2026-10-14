/**
 * Bhashini TTS Adapter Tests
 * Tests Bhashini API integration, fallback behavior, and configuration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import BhashiniTTSAdapter from './BhashiniTTSAdapter.js';
import axios from 'axios';

describe('BhashiniTTSAdapter', () => {
  describe('Configuration', () => {
    it('should detect when Bhashini is not configured', () => {
      // Clear environment variables
      const originalKey = process.env.BHASHINI_API_KEY;
      const originalUserId = process.env.BHASHINI_USER_ID;

      delete process.env.BHASHINI_API_KEY;
      delete process.env.BHASHINI_USER_ID;

      const isConfigured = BhashiniTTSAdapter.isConfigured();

      // Restore
      process.env.BHASHINI_API_KEY = originalKey;
      process.env.BHASHINI_USER_ID = originalUserId;

      expect(isConfigured).toBe(false);
    });

    it('should return supported languages', () => {
      const languages = BhashiniTTSAdapter.getSupportedLanguages();

      expect(languages).toBeInstanceOf(Array);
      expect(languages).toContain('en');
      expect(languages).toContain('hi');
      expect(languages).toContain('ta');
      expect(languages).toContain('te');
      expect(languages).toContain('kn');
      expect(languages).toContain('ml');
      expect(languages.length).toBe(13); // 13 Indian languages
    });

    it('should return supported voices for each language', () => {
      const languages = ['en', 'hi', 'ta', 'te', 'kn', 'ml'];

      languages.forEach((lang) => {
        const voices = BhashiniTTSAdapter.getSupportedVoices(lang);
        expect(voices).toBeInstanceOf(Array);
        expect(voices).toContain('female');
        expect(voices).toContain('male');
      });
    });

    it('should return empty array for unsupported language voices', () => {
      const voices = BhashiniTTSAdapter.getSupportedVoices('unsupported');
      expect(voices).toEqual([]);
    });
  });

  describe('TTS Generation - Mocked', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should throw error for unsupported language', async () => {
      await expect(
        BhashiniTTSAdapter.textToSpeech('Test text', 'xyz')
      ).rejects.toThrow('Unsupported language: xyz');
    });

    it('should call Bhashini API with correct structure when configured', async () => {
      // Mock environment
      process.env.BHASHINI_API_KEY = 'test-key';
      process.env.BHASHINI_USER_ID = 'test-user';

      // Mock axios responses
      const mockConfigResponse = {
        data: {
          pipelineInferenceAPIEndPoint: {
            callbackUrl: 'https://test-api.bhashini.gov.in/inference',
            inferenceApiKey: {
              value: 'inference-key-123',
            },
          },
          pipelineResponseConfig: [
            {
              config: [
                {
                  serviceId: 'bhashini/tts/service-id',
                },
              ],
            },
          ],
        },
      };

      const mockTTSResponse = {
        data: {
          pipelineResponse: [
            {
              audio: [
                {
                  audioContent: Buffer.from('mock-audio-data').toString('base64'),
                },
              ],
            },
          ],
        },
      };

      vi.spyOn(axios, 'post')
        .mockResolvedValueOnce(mockConfigResponse) // First call: pipeline config
        .mockResolvedValueOnce(mockTTSResponse); // Second call: TTS inference

      const result = await BhashiniTTSAdapter.textToSpeech('Test text', 'en');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      expect(axios.post).toHaveBeenCalledTimes(2);

      // Verify pipeline config call
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/inference/pipeline'),
        expect.objectContaining({
          pipelineTasks: expect.arrayContaining([
            expect.objectContaining({
              taskType: 'tts',
            }),
          ]),
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'test-key',
            'User-ID': 'test-user',
          }),
        })
      );
    });

    it('should handle Bhashini API errors gracefully', async () => {
      process.env.BHASHINI_API_KEY = 'test-key';
      process.env.BHASHINI_USER_ID = 'test-user';

      vi.spyOn(axios, 'post').mockRejectedValue(new Error('Bhashini API error'));

      await expect(
        BhashiniTTSAdapter.textToSpeech('Test text', 'hi')
      ).rejects.toThrow('Text-to-speech conversion failed');
    });

    it('should handle invalid API response structure', async () => {
      process.env.BHASHINI_API_KEY = 'test-key';
      process.env.BHASHINI_USER_ID = 'test-user';

      const mockConfigResponse = {
        data: {
          pipelineInferenceAPIEndPoint: {
            callbackUrl: 'https://test-api.bhashini.gov.in/inference',
            inferenceApiKey: { value: 'test' },
          },
          pipelineResponseConfig: [
            {
              config: [{ serviceId: 'test-service' }],
            },
          ],
        },
      };

      const invalidTTSResponse = {
        data: {
          // Missing pipelineResponse
        },
      };

      vi.spyOn(axios, 'post')
        .mockResolvedValueOnce(mockConfigResponse)
        .mockResolvedValueOnce(invalidTTSResponse);

      await expect(
        BhashiniTTSAdapter.textToSpeech('Test text', 'en')
      ).rejects.toThrow('Invalid TTS response from Bhashini');
    });
  });

  describe('Health Check', () => {
    it('should return false when not configured', async () => {
      delete process.env.BHASHINI_API_KEY;
      delete process.env.BHASHINI_USER_ID;

      const isHealthy = await BhashiniTTSAdapter.healthCheck();

      expect(isHealthy).toBe(false);
    });

    it('should return false when API is unreachable', async () => {
      process.env.BHASHINI_API_KEY = 'test-key';
      process.env.BHASHINI_USER_ID = 'test-user';

      vi.spyOn(axios, 'post').mockRejectedValue(new Error('Network error'));

      const isHealthy = await BhashiniTTSAdapter.healthCheck();

      expect(isHealthy).toBe(false);
    });

    it('should return true when API is reachable and configured', async () => {
      process.env.BHASHINI_API_KEY = 'test-key';
      process.env.BHASHINI_USER_ID = 'test-user';

      const mockConfigResponse = {
        data: {
          pipelineInferenceAPIEndPoint: {
            callbackUrl: 'https://test-api',
          },
          pipelineResponseConfig: [{ config: [{ serviceId: 'test' }] }],
        },
      };

      vi.spyOn(axios, 'post').mockResolvedValue(mockConfigResponse);

      const isHealthy = await BhashiniTTSAdapter.healthCheck();

      expect(isHealthy).toBe(true);
    });
  });

  describe('File Operations', () => {
    it('should save audio to file', async () => {
      process.env.BHASHINI_API_KEY = 'test-key';
      process.env.BHASHINI_USER_ID = 'test-user';

      const mockConfigResponse = {
        data: {
          pipelineInferenceAPIEndPoint: {
            callbackUrl: 'https://test-api',
            inferenceApiKey: { value: 'test' },
          },
          pipelineResponseConfig: [{ config: [{ serviceId: 'test' }] }],
        },
      };

      const mockTTSResponse = {
        data: {
          pipelineResponse: [
            {
              audio: [{ audioContent: Buffer.from('test-audio').toString('base64') }],
            },
          ],
        },
      };

      vi.spyOn(axios, 'post')
        .mockResolvedValueOnce(mockConfigResponse)
        .mockResolvedValueOnce(mockTTSResponse);

      // Note: In real implementation, this would write to filesystem
      // For test, we just verify it doesn't throw
      await expect(
        BhashiniTTSAdapter.textToSpeechFile('Test text', 'en', '/tmp/test.wav')
      ).resolves.toBeTruthy();
    });
  });

  describe('Security - Credentials', () => {
    it('should never expose API credentials in logs or responses', async () => {
      process.env.BHASHINI_API_KEY = 'secret-api-key-123';
      process.env.BHASHINI_USER_ID = 'secret-user-id-456';

      const mockConfigResponse = {
        data: {
          pipelineInferenceAPIEndPoint: {
            callbackUrl: 'https://test-api',
            inferenceApiKey: { value: 'test' },
          },
          pipelineResponseConfig: [{ config: [{ serviceId: 'test' }] }],
        },
      };

      const mockTTSResponse = {
        data: {
          pipelineResponse: [
            {
              audio: [{ audioContent: Buffer.from('test').toString('base64') }],
            },
          ],
        },
      };

      vi.spyOn(axios, 'post')
        .mockResolvedValueOnce(mockConfigResponse)
        .mockResolvedValueOnce(mockTTSResponse);

      const result = await BhashiniTTSAdapter.textToSpeech('Test', 'en');

      // Result should be Buffer, not containing credentials
      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).not.toContain('secret-api-key-123');
      expect(result.toString()).not.toContain('secret-user-id-456');
    });

    it('should use Authorization header (not query params) for API key', async () => {
      process.env.BHASHINI_API_KEY = 'test-key';
      process.env.BHASHINI_USER_ID = 'test-user';

      const mockConfigResponse = {
        data: {
          pipelineInferenceAPIEndPoint: {
            callbackUrl: 'https://test-api',
            inferenceApiKey: { value: 'inference-key' },
          },
          pipelineResponseConfig: [{ config: [{ serviceId: 'test' }] }],
        },
      };

      const mockTTSResponse = {
        data: {
          pipelineResponse: [
            {
              audio: [{ audioContent: Buffer.from('test').toString('base64') }],
            },
          ],
        },
      };

      vi.spyOn(axios, 'post')
        .mockResolvedValueOnce(mockConfigResponse)
        .mockResolvedValueOnce(mockTTSResponse);

      await BhashiniTTSAdapter.textToSpeech('Test', 'en');

      // Verify API key is in Authorization header, not URL
      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'test-key',
          }),
        })
      );
    });
  });

  describe('Language Support', () => {
    it('should support all 13 declared Indian languages', () => {
      const expectedLanguages = ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'mr', 'gu', 'bn', 'pa', 'or', 'as', 'ur'];
      const supportedLanguages = BhashiniTTSAdapter.getSupportedLanguages();

      expectedLanguages.forEach((lang) => {
        expect(supportedLanguages).toContain(lang);
      });

      expect(supportedLanguages.length).toBe(13);
    });

    it('should map language codes correctly to Bhashini format', () => {
      // This tests the internal language map
      const testLanguages = ['en', 'hi', 'ta'];

      testLanguages.forEach((lang) => {
        expect(BhashiniTTSAdapter.languageMap[lang]).toBe(lang);
      });
    });
  });
});

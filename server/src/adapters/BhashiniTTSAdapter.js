/**
 * Bhashini TTS Adapter
 * Integrates with Bhashini API for multilingual text-to-speech
 * https://bhashini.gov.in/
 */

import axios from 'axios';
import logger from '../utils/logger.js';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BhashiniTTSAdapter {
  constructor() {
    // Read API endpoint once (rarely changes)
    this.apiEndpoint = process.env.BHASHINI_API_ENDPOINT || 'https://dhruva-api.bhashini.gov.in/services';
    this.pipelineEndpoint = `${this.apiEndpoint}/inference/pipeline`;
    
    // Bhashini language codes mapping
    this.languageMap = {
      en: 'en',
      hi: 'hi',
      ta: 'ta',
      te: 'te',
      kn: 'kn',
      ml: 'ml',
      mr: 'mr',
      gu: 'gu',
      bn: 'bn',
      pa: 'pa',
      or: 'or',
      as: 'as',
      ur: 'ur',
    };

    // Supported voices per language
    this.voices = {
      en: ['female', 'male'],
      hi: ['female', 'male'],
      ta: ['female', 'male'],
      te: ['female', 'male'],
      kn: ['female', 'male'],
      ml: ['female', 'male'],
      mr: ['female', 'male'],
      gu: ['female', 'male'],
      bn: ['female', 'male'],
      pa: ['female', 'male'],
      or: ['female', 'male'],
      as: ['female', 'male'],
      ur: ['female', 'male'],
    };

    this.tempDir = path.join(os.tmpdir(), 'jeevacare-tts');
    this._ensureTempDir();
  }

  // Dynamically read credentials (supports runtime changes for testing)
  get apiKey() {
    return process.env.BHASHINI_API_KEY || '';
  }

  get userId() {
    return process.env.BHASHINI_USER_ID || '';
  }

  _ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Get Bhashini pipeline configuration for TTS
   */
  async _getPipelineConfig(sourceLang) {
    try {
      const configEndpoint = `${this.apiEndpoint}/inference/pipeline`;
      
      const payload = {
        pipelineTasks: [
          {
            taskType: 'tts',
            config: {
              language: {
                sourceLanguage: this.languageMap[sourceLang] || 'en',
              },
            },
          },
        ],
        pipelineRequestConfig: {
          pipelineId: 'tts',
        },
      };

      const response = await axios.post(configEndpoint, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.apiKey,
          'User-ID': this.userId,
        },
        timeout: 10000,
      });

      return response.data;
    } catch (error) {
      logger.error(`Bhashini pipeline config error: ${error.message}`);
      throw new Error('Failed to get Bhashini pipeline configuration');
    }
  }

  /**
   * Convert text to speech using Bhashini API
   * @param {string} text - Text to convert
   * @param {string} language - Language code (en, hi, ta, etc.)
   * @param {object} options - Additional options
   * @returns {Promise<Buffer>} - Audio buffer
   */
  async textToSpeech(text, language = 'en', options = {}) {
    const {
      voice = 'female',
      speed = 1.0,
      pitch = 1.0,
      outputFormat = 'wav',
    } = options;

    try {
      // Validate language
      if (!this.languageMap[language]) {
        throw new Error(`Unsupported language: ${language}`);
      }

      // Get pipeline configuration
      const pipelineConfig = await this._getPipelineConfig(language);

      if (!pipelineConfig || !pipelineConfig.pipelineInferenceAPIEndPoint) {
        throw new Error('Invalid Bhashini pipeline configuration');
      }

      const inferenceEndpoint = pipelineConfig.pipelineInferenceAPIEndPoint.callbackUrl;
      const authToken = pipelineConfig.pipelineInferenceAPIEndPoint.inferenceApiKey?.value || this.apiKey;

      // Prepare TTS request
      const ttsPayload = {
        pipelineTasks: [
          {
            taskType: 'tts',
            config: {
              language: {
                sourceLanguage: this.languageMap[language],
              },
              serviceId: pipelineConfig.pipelineResponseConfig[0].config[0].serviceId,
              gender: voice,
              samplingRate: 22050,
            },
          },
        ],
        inputData: {
          input: [
            {
              source: text,
            },
          ],
        },
      };

      // Call Bhashini TTS inference API
      const response = await axios.post(inferenceEndpoint, ttsPayload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken,
        },
        timeout: 30000,
      });

      if (!response.data || !response.data.pipelineResponse || !response.data.pipelineResponse[0]?.audio) {
        throw new Error('Invalid TTS response from Bhashini');
      }

      // Audio is returned as base64 string
      const audioBase64 = response.data.pipelineResponse[0].audio[0].audioContent;
      const audioBuffer = Buffer.from(audioBase64, 'base64');

      logger.info(`Bhashini TTS: Generated ${audioBuffer.length} bytes for text in ${language}`);
      
      return audioBuffer;
    } catch (error) {
      logger.error(`Bhashini TTS error: ${error.message}`);
      
      // Fallback error handling
      if (error.response) {
        logger.error(`Bhashini API error response: ${JSON.stringify(error.response.data)}`);
      }
      
      throw new Error(`Text-to-speech conversion failed: ${error.message}`);
    }
  }

  /**
   * Convert text to speech and save to file
   * @param {string} text - Text to convert
   * @param {string} language - Language code
   * @param {string} outputPath - Output file path
   * @param {object} options - Additional options
   * @returns {Promise<string>} - Path to generated audio file
   */
  async textToSpeechFile(text, language = 'en', outputPath = null, options = {}) {
    try {
      const audioBuffer = await this.textToSpeech(text, language, options);

      // Generate output path if not provided
      if (!outputPath) {
        const timestamp = Date.now();
        const sanitizedText = text.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_');
        outputPath = path.join(this.tempDir, `bhashini_${language}_${sanitizedText}_${timestamp}.wav`);
      }

      // Ensure directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write audio buffer to file
      fs.writeFileSync(outputPath, audioBuffer);

      logger.info(`Bhashini TTS: Saved audio to ${outputPath}`);
      return outputPath;
    } catch (error) {
      logger.error(`Bhashini TTS file generation error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get supported languages
   * @returns {Array<string>} - Array of supported language codes
   */
  getSupportedLanguages() {
    return Object.keys(this.languageMap);
  }

  /**
   * Get supported voices for a language
   * @param {string} language - Language code
   * @returns {Array<string>} - Array of available voices
   */
  getSupportedVoices(language) {
    return this.voices[language] || [];
  }

  /**
   * Check if Bhashini is configured
   * @returns {boolean} - True if API key and user ID are set
   */
  isConfigured() {
    return Boolean(this.apiKey && this.userId);
  }

  /**
   * Health check for Bhashini API
   * @returns {Promise<boolean>} - True if API is accessible
   */
  async healthCheck() {
    try {
      if (!this.isConfigured()) {
        logger.warn('Bhashini TTS: API credentials not configured');
        return false;
      }

      // Try to get pipeline config as health check
      await this._getPipelineConfig('en');
      return true;
    } catch (error) {
      logger.error(`Bhashini TTS health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Clean up old temporary files
   * @param {number} maxAgeMs - Maximum age in milliseconds (default: 1 hour)
   */
  cleanupTempFiles(maxAgeMs = 3600000) {
    try {
      if (!fs.existsSync(this.tempDir)) {
        return;
      }

      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();

      files.forEach((file) => {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);

        if (now - stats.mtimeMs > maxAgeMs) {
          fs.unlinkSync(filePath);
          logger.info(`Cleaned up old TTS file: ${file}`);
        }
      });
    } catch (error) {
      logger.error(`TTS temp file cleanup error: ${error.message}`);
    }
  }
}

export default new BhashiniTTSAdapter();

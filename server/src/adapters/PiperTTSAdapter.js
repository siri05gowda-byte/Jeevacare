import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { ExternalServiceError, ValidationError } from '../utils/errors.js';

/**
 * Piper Text-to-Speech Adapter
 * Free, self-hosted TTS engine running locally or on controlled infrastructure
 * Supports 6 Indian languages: en, hi, kn, te, ta, ml
 * 
 * Prerequisites:
 * - Piper binary installed (https://github.com/rhasspy/piper)
 * - Voice models downloaded (https://github.com/rhasspy/piper/releases/tag/2023.11.14-1)
 * - Environment variables: PIPER_BINARY_PATH, PIPER_MODELS_PATH
 */
class PiperTTSAdapter {
  constructor() {
    this.isConfigured = config.piperTTS.enabled;
    this.binaryPath = config.piperTTS.binaryPath;
    this.modelsPath = config.piperTTS.modelsPath;
    this.supportedLanguages = config.piperTTS.supportedLanguages;
    this.voiceModels = config.piperTTS.voiceModels;
    this.tempDir = path.join(os.tmpdir(), 'jeevacare-piper-tts');
    this.maxConcurrentRequests = 3;
    this.activeRequests = 0;

    // Create temp directory if it doesn't exist
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }

    if (this.isConfigured) {
      this.validateInstallation();
    } else {
      logger.warn('⚠ Piper TTS not enabled. Operating in DEMO mode.');
    }
  }

  /**
   * Validate Piper installation and voice models
   */
  validateInstallation() {
    try {
      // Check if Piper binary exists
      if (!fs.existsSync(this.binaryPath)) {
        logger.error(
          `✗ Piper binary not found at: ${this.binaryPath}`
        );
        this.isConfigured = false;
        return;
      }

      // Check if models directory exists
      if (!fs.existsSync(this.modelsPath)) {
        logger.warn(`✗ Piper models directory not found at: ${this.modelsPath}`);
        logger.info('Models will be downloaded on first use');
      }

      // Verify at least one language model
      const modelsFound = Object.entries(this.voiceModels).filter(([lang, config]) => {
        const modelPath = path.join(this.modelsPath, config.model);
        return fs.existsSync(modelPath);
      });

      if (modelsFound.length === 0) {
        logger.warn(
          `⚠ No Piper voice models found in ${this.modelsPath}. Speech synthesis will fail until models are installed.`
        );
        logger.info(
          'Download models from: https://github.com/rhasspy/piper/releases/tag/2023.11.14-1'
        );
      } else {
        logger.info(`✓ Piper TTS configured with ${modelsFound.length} language(s)`);
        modelsFound.forEach(([lang]) => {
          logger.info(`  ✓ ${lang}: ${this.voiceModels[lang].model}`);
        });
      }
    } catch (error) {
      logger.error(`Piper installation validation error: ${error.message}`);
      this.isConfigured = false;
    }
  }

  /**
   * Generate audio from text using Piper
   * @param {string} text - Input text to synthesize
   * @param {Object} options - { language, gender (unused), speed (unused) }
   * @returns {Promise<Object>} { audioPath, audioUrl, duration, language, isDemo }
   */
  async generateAudio(text, options = {}) {
    try {
      const language = options.language || 'en';

      // Validate language support
      if (!this.supportedLanguages.includes(language)) {
        throw new ValidationError(
          `Language '${language}' not supported. Supported: ${this.supportedLanguages.join(', ')}`
        );
      }

      // Validate text
      if (!text || text.trim().length === 0) {
        throw new ValidationError('Text cannot be empty');
      }

      if (text.length > 10000) {
        throw new ValidationError('Text exceeds maximum length (10000 characters)');
      }

      if (!this.isConfigured) {
        logger.warn('[DEMO MODE] Piper TTS not configured. Returning demo audio metadata.');
        return this.generateDemoAudio(text, language);
      }

      // Check concurrent request limit
      if (this.activeRequests >= this.maxConcurrentRequests) {
        throw new ExternalServiceError(
          'Piper TTS',
          `Too many concurrent synthesis requests (max ${this.maxConcurrentRequests})`
        );
      }

      this.activeRequests++;

      try {
        logger.info(
          `Synthesizing audio in ${language}: "${text.substring(0, 50)}..." (${text.length} chars)`
        );

        const audioPath = await this.synthesize(text, language);
        const stats = fs.statSync(audioPath);
        const estimatedDuration = Math.ceil(text.length / 15); // Rough estimate

        logger.info(`✓ Audio generated: ${audioPath} (${stats.size} bytes)`);

        return {
          audioPath,
          audioUrl: `file://${audioPath}`, // Server will stream this
          duration: estimatedDuration,
          fileSize: stats.size,
          language,
          isDemo: false,
          generatedAt: new Date(),
        };
      } finally {
        this.activeRequests--;
      }
    } catch (error) {
      logger.error(`Piper TTS generation error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Run Piper subprocess to synthesize speech
   * @private
   */
  async synthesize(text, language) {
    return new Promise((resolve, reject) => {
      const voiceConfig = this.voiceModels[language];
      const modelPath = path.join(this.modelsPath, voiceConfig.model);
      const outputPath = path.join(this.tempDir, `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.wav`);

      // Validate model exists
      if (!fs.existsSync(modelPath)) {
        return reject(
          new ExternalServiceError(
            'Piper TTS',
            `Voice model not found for ${language}: ${modelPath}`
          )
        );
      }

      const args = [
        '--model', modelPath,
        '--output_file', outputPath,
      ];

      if (voiceConfig.speaker !== undefined) {
        args.push('--speaker', voiceConfig.speaker.toString());
      }

      const startTime = Date.now();
      const timeout = 30000; // 30 second timeout per synthesis

      const piper = spawn(this.binaryPath, args, {
        timeout,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      });

      let stderr = '';

      // Write text to Piper stdin
      piper.stdin.write(text);
      piper.stdin.end();

      // Capture stderr for error reporting
      piper.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle process completion
      piper.on('close', (code) => {
        const elapsed = Date.now() - startTime;

        if (code !== 0) {
          logger.error(`Piper process exited with code ${code}: ${stderr}`);
          return reject(
            new ExternalServiceError(
              'Piper TTS',
              `Synthesis failed (exit code ${code}): ${stderr.substring(0, 200)}`
            )
          );
        }

        // Verify output file exists and has content
        if (!fs.existsSync(outputPath)) {
          return reject(
            new ExternalServiceError('Piper TTS', 'Output audio file was not created')
          );
        }

        const stats = fs.statSync(outputPath);
        if (stats.size === 0) {
          return reject(
            new ExternalServiceError('Piper TTS', 'Output audio file is empty')
          );
        }

        logger.info(`Piper synthesis completed in ${elapsed}ms (${stats.size} bytes)`);
        resolve(outputPath);
      });

      // Handle timeout
      piper.on('error', (error) => {
        logger.error(`Piper process error: ${error.message}`);
        reject(new ExternalServiceError('Piper TTS', error.message));
      });

      setTimeout(() => {
        if (piper.exitCode === null) {
          piper.kill('SIGKILL');
          reject(new ExternalServiceError('Piper TTS', 'Synthesis timeout (30s)'));
        }
      }, timeout + 1000);
    });
  }

  /**
   * Clean up temporary audio files older than 1 hour
   * Call periodically to prevent disk space issues
   */
  cleanupOldAudioFiles() {
    try {
      if (!fs.existsSync(this.tempDir)) {
        return;
      }

      const now = Date.now();
      const maxAge = 60 * 60 * 1000; // 1 hour

      fs.readdirSync(this.tempDir).forEach((file) => {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);

        if (now - stats.mtimeMs > maxAge) {
          try {
            fs.unlinkSync(filePath);
            logger.debug(`Cleaned up old audio file: ${file}`);
          } catch (err) {
            logger.warn(`Failed to delete old audio file ${file}: ${err.message}`);
          }
        }
      });
    } catch (error) {
      logger.warn(`Audio cleanup error: ${error.message}`);
    }
  }

  /**
   * List available voices for a language
   */
  async listVoices(language = 'en') {
    if (!this.supportedLanguages.includes(language)) {
      return [];
    }

    const voiceConfig = this.voiceModels[language];
    const modelPath = path.join(this.modelsPath, voiceConfig.model);
    const installed = fs.existsSync(modelPath);

    return [
      {
        id: `piper-${language}-${voiceConfig.model}`,
        name: `Piper (${language})`,
        language,
        gender: 'neutral',
        installed,
        modelFile: voiceConfig.model,
        provider: 'piper',
      },
    ];
  }

  /**
   * Get supported languages with installation status
   */
  getLanguageStatus() {
    const status = {};

    Object.entries(this.voiceModels).forEach(([lang, config]) => {
      const modelPath = path.join(this.modelsPath, config.model);
      const installed = fs.existsSync(modelPath);

      status[lang] = {
        language: lang,
        modelFile: config.model,
        installed,
        modelPath: modelPath,
        status: installed ? 'READY' : 'NOT_INSTALLED',
      };
    });

    return status;
  }

  /**
   * Check if adapter is in demo mode
   */
  isDemoMode() {
    return !this.isConfigured;
  }

  /**
   * Get adapter status
   */
  getStatus() {
    return {
      configured: this.isConfigured,
      mode: this.isConfigured ? 'LIVE' : 'DEMO',
      provider: 'Piper (Local)',
      binaryPath: this.binaryPath,
      modelsPath: this.modelsPath,
      supportedLanguages: this.supportedLanguages,
      languageStatus: this.getLanguageStatus(),
      activeRequests: this.activeRequests,
      maxConcurrentRequests: this.maxConcurrentRequests,
    };
  }

  // ===== DEMO MODE =====

  /**
   * Generate demo audio metadata when Piper not configured
   */
  generateDemoAudio(text, language) {
    const demoPath = path.join(this.tempDir, `demo-${Date.now()}.wav`);
    const estimatedDuration = Math.ceil(text.length / 15);

    return {
      audioPath: demoPath,
      audioUrl: `https://demo.jeevacare.local/audio/${Date.now()}.wav`,
      duration: estimatedDuration,
      language,
      isDemo: true,
      demoWarning: 'DEMO MODE: Audio synthesis requires Piper to be installed locally',
      generatedAt: new Date(),
    };
  }
}

export default new PiperTTSAdapter();

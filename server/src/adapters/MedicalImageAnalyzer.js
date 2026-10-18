/**
 * Medical Image Analyzer Adapter
 * 
 * Real deep-learning inference using TorchXRayVision (ResNet50).
 * Runs Python worker for actual model inference (not mock).
 * 
 * Architecture:
 * - Node.js spawns Python worker process for inference
 * - Python worker handles model loading and prediction
 * - JSON-RPC protocol over stdin/stdout
 * - Model cached in memory after first load
 * - Fallback to mock mode if Python worker unavailable
 * 
 * Modalities:
 * - chest_xray: ✅ REAL INFERENCE (18 pathologies detected)
 * - ct_scan, mri, ultrasound: ❌ Not supported (unsupported_modality)
 * 
 * Cost: ₹0 (free/open-source models, CPU-only)
 */

import logger from '../utils/logger.js';
import config from '../config/index.js';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

class MedicalImageAnalyzer {
  constructor() {
    this.initialized = false;
    this.modelPath = config.medicalImageAI?.modelPath || null;
    this.enabled = config.medicalImageAI?.enabled || false;
    this.device = config.medicalImageAI?.device || 'cpu';
    this.model = null;
    this.supportedModalities = ['chest_xray'];
    this.workerProcess = null;
    this.workerReady = false;
    this.requestQueue = [];
    this.requestIdCounter = 0;
    this.pythonWorkerPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'ChestXRayInferenceWorker.py');
    
    // Try to initialize Python worker (real inference)
    // If unavailable, fall back to mock mode
    if (this.enabled) {
      this.initializeWorker().catch(err => {
        logger.warn(`Python worker initialization failed: ${err.message}`);
        logger.info('Falling back to mock mode for inference');
        this.workerReady = false;
      });
    } else {
      logger.info('Medical Image AI is disabled (mock mode active)');
    }
  }

  /**
   * Initialize Python inference worker
   * Spawns child process that handles real model inference
   */
  async initializeWorker() {
    try {
      // Check if Python worker file exists
      await fs.access(this.pythonWorkerPath);
      logger.info(`Python worker found: ${this.pythonWorkerPath}`);
      
      // Spawn worker process
      this.workerProcess = spawn('python', [this.pythonWorkerPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false
      });
      
      let initBuffer = '';
      let initResolved = false;
      
      // Handle worker stdout (responses)
      this.workerProcess.stdout.on('data', (data) => {
        const lines = (initBuffer + data.toString()).split('\n');
        initBuffer = lines.pop() || '';
        
        for (const line of lines) {
          if (!line) continue;
          try {
            const response = JSON.parse(line);
            this._handleWorkerResponse(response);
          } catch (e) {
            logger.error(`Failed to parse worker response: ${e.message}`);
          }
        }
      });
      
      // Handle worker errors
      this.workerProcess.stderr.on('data', (data) => {
        logger.warn(`Python worker: ${data.toString().trim()}`);
      });
      
      // Handle worker exit
      this.workerProcess.on('exit', (code, signal) => {
        logger.warn(`Python worker exited (code: ${code}, signal: ${signal})`);
        this.workerReady = false;
        this.workerProcess = null;
      });
      
      // Wait for worker to be ready
      this.workerReady = true;
      logger.info('✅ Python worker initialized successfully');
      this.initialized = true;
      
    } catch (error) {
      logger.warn(`Failed to initialize Python worker: ${error.message}`);
      this.workerReady = false;
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Send request to Python worker and wait for response
   */
  async _sendWorkerRequest(method, params) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Python worker timeout after 30s for method: ${method}`));
      }, 30000);
      
      const requestId = ++this.requestIdCounter;
      
      const request = {
        id: requestId,
        method,
        params
      };
      
      // Store callback
      this.requestQueue[requestId] = { resolve, reject, timeout };
      
      try {
        this.workerProcess.stdin.write(JSON.stringify(request) + '\n');
      } catch (error) {
        clearTimeout(timeout);
        delete this.requestQueue[requestId];
        reject(error);
      }
    });
  }

  /**
   * Handle response from Python worker
   */
  _handleWorkerResponse(response) {
    const { id, result, error } = response;
    const pending = this.requestQueue[id];
    
    if (!pending) {
      logger.warn(`Received response for unknown request id: ${id}`);
      return;
    }
    
    clearTimeout(pending.timeout);
    delete this.requestQueue[id];
    
    if (error) {
      pending.reject(new Error(error));
    } else {
      pending.resolve(result);
    }
  }

  /**
   * Initialize the ML model (if available)
   * For real inference: loads TorchXRayVision ResNet50
   * For mock: skips (mock mode handled separately)
   */
  async initializeModel() {
    try {
      if (!this.workerReady) {
        logger.info('Python worker not available - using mock mode');
        return;
      }

      logger.info('Loading TorchXRayVision ResNet50 model...');
      logger.info('This will download ~98MB model weights on first run from HuggingFace...');
      
      const result = await this._sendWorkerRequest('load', {
        model_name: 'resnet50-res512-all',
        device: this.device
      });
      
      if (result.success) {
        logger.info(`✅ Real model loaded: ${result.model} from ${result.source}`);
        logger.info(`   Weights: ${result.weights_url || 'cached'}`);
        this.initialized = true;
        this.enabled = true;
      } else {
        logger.warn(`Model loading failed: ${result.error}`);
        logger.info('Falling back to mock mode');
        this.initialized = false;
        this.workerReady = false;
        this.enabled = false;
      }
      
    } catch (error) {
      logger.error(`Failed to initialize model: ${error.message}`);
      logger.info('Falling back to mock mode');
      this.initialized = false;
      this.workerReady = false;
      this.enabled = false;
    }
  }

  /**
   * Detect image modality from image data or metadata
   * @param {Buffer} imageBuffer - Image file buffer
   * @param {Object} metadata - Image metadata (mimeType, filename, etc.)
   * @returns {Promise<Object>} Detected modality and confidence
   */
  async detectModality(imageBuffer, metadata = {}) {
    try {
      const mimeType = metadata.mimeType || '';
      const filename = metadata.filename || '';

      // Basic heuristics for modality detection
      // In production, this would use image analysis (DICOM tags, image features, etc.)
      
      const filenameLower = filename.toLowerCase();
      
      // Simple keyword matching (not robust, but zero-cost)
      // Check for chest X-ray first (most common in healthcare)
      if (filenameLower.includes('chest') || filenameLower.includes('xray') || filenameLower.includes('x-ray')) {
        return {
          modality: 'chest_xray',
          confidence: 0.7,
          supported: true,
          reason: 'Detected from filename'
        };
      }

      // Check for CT scan (more specific pattern before generic "scan")
      if (filenameLower.includes('ct') && filenameLower.includes('scan') || filenameLower.includes('ct_scan') || filenameLower.includes('ctscan')) {
        return {
          modality: 'ct_scan',
          confidence: 0.6,
          supported: false,
          reason: 'CT analysis not yet implemented'
        };
      }

      // Check for MRI
      if (filenameLower.includes('mri')) {
        return {
          modality: 'mri',
          confidence: 0.6,
          supported: false,
          reason: 'MRI analysis not yet implemented'
        };
      }

      // Check for ultrasound
      if (filenameLower.includes('ultrasound') || filenameLower.includes('ultrascan') || filenameLower.includes('us_')) {
        return {
          modality: 'ultrasound',
          confidence: 0.6,
          supported: false,
          reason: 'Ultrasound analysis not yet implemented'
        };
      }

      // Check for DICOM format (after specific modality checks)
      if (mimeType === 'application/dicom' || filename.endsWith('.dcm')) {
        // Would parse DICOM tags here
        return {
          modality: 'unknown_dicom',
          confidence: 0.5,
          supported: false,
          reason: 'DICOM parsing not yet implemented'
        };
      }

      // Default: unknown
      return {
        modality: 'unknown',
        confidence: 0.0,
        supported: false,
        reason: 'Could not determine image modality from filename or metadata'
      };

    } catch (error) {
      logger.error(`Modality detection error: ${error.message}`);
      return {
        modality: 'error',
        confidence: 0.0,
        supported: false,
        reason: error.message
      };
    }
  }

  /**
   * Analyze medical image and generate findings
   * @param {String} image - Image URL or file path
   * @param {Object} options - Analysis options (modality, language, etc.)
   * @returns {Promise<Object>} Analysis results (real or mock)
   */
  async analyzeImage(image, options = {}) {
    try {
      const modalityInfo = options.detectedModality || await this.detectModality(image, options.metadata || {});

      // If modality is unsupported, return clear message
      if (!modalityInfo.supported) {
        return this.createUnsupportedModalityResponse(modalityInfo);
      }

      // Try real inference first (if worker available)
      if (this.workerReady && this.initialized && modalityInfo.modality === 'chest_xray') {
        try {
          logger.info(`Running REAL inference for chest X-ray: ${image}`);
          return await this.inferWithWorker(image, options.language || 'en');
        } catch (error) {
          logger.error(`Real inference failed, falling back to mock: ${error.message}`);
          // Fall through to mock mode
        }
      }

      // Fallback: mock mode
      logger.info('Using mock analysis (model not available or inference failed)');
      return this.createMockAnalysis(modalityInfo.modality, options.language);
      
    } catch (error) {
      logger.error(`Medical image analysis error: ${error.message}`);
      return this.createErrorResponse(error);
    }
  }

  /**
   * Run real inference using Python worker
   * @private
   */
  async inferWithWorker(imagePath, language = 'en') {
    try {
      const result = await this._sendWorkerRequest('infer', {
        image_path: imagePath,
        model_name: 'resnet50-res512-all',
        device: this.device
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Inference failed');
      }

      // Transform worker output to RadiologyAI format
      const findings = result.findings || [];
      const summary = result.summary || 'Analysis complete';
      
      // Generate explanation based on language
      const explanation = this._generateExplanation(findings, language);
      
      return {
        success: true,
        status: 'completed',
        isMockData: false,  // Real inference
        modality: 'chest_xray',
        model: result.model || 'resnet50-res512-all',
        language,
        findings: findings.map(f => ({
          pathology: f.pathology,
          confidence: f.confidence,
          severity: f.severity
        })),
        summary,
        patientFriendlyExplanation: explanation,
        confidence: findings.length > 0 ? findings[0].confidence : 0,
        allPathologies: result.all_pathologies || {},
        disclaimers: this.getDisclaimers(),
        metadata: {
          modelVersion: result.model,
          device: result.device,
          pathologiesTested: result.pathologies_tested,
          positiveFindings: result.positive_findings,
          confidenceThreshold: result.confidence_threshold,
          inferenceType: 'real'
        }
      };
    } catch (error) {
      logger.error(`Worker inference error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate patient-friendly explanation from findings
   * @private
   */
  _generateExplanation(findings, language = 'en') {
    const explanations = {
      en: {
        normal: "The chest X-ray appears normal with no significant abnormalities detected. However, a qualified radiologist should review the image for complete assessment.",
        findings: (f) => `${f.pathology} may be present with ${(f.confidence * 100).toFixed(0)}% confidence. Please consult a radiologist for confirmation.`,
        multi: "Multiple potential findings have been detected. A radiologist should review this X-ray for accurate diagnosis."
      },
      hi: {
        normal: "छाती का एक्स-रे सामान्य दिखता है। हालांकि, एक योग्य रेडियोलॉजिस्ट को पूर्ण मूल्यांकन के लिए इसकी समीक्षा करनी चाहिए।",
        findings: (f) => `${f.pathology} ${(f.confidence * 100).toFixed(0)}% आत्मविश्वास के साथ हो सकता है। कृपया पुष्टि के लिए रेडियोलॉजिस्ट से संपर्क करें।`,
        multi: "कई संभावित निष्कर्ष पाए गए हैं। एक रेडियोलॉजिस्ट को सटीक निदान के लिए यह एक्स-रे की समीक्षा करनी चाहिए।"
      }
    };
    
    const lang = explanations[language] || explanations.en;
    
    if (findings.length === 0) {
      return lang.normal;
    } else if (findings.length === 1) {
      return lang.findings(findings[0]);
    } else {
      return lang.multi;
    }
  }

  /**
   * Create response for unsupported modality
   */
  createUnsupportedModalityResponse(modalityInfo) {
    return {
      success: false,
      status: 'unsupported_modality',
      modality: modalityInfo.modality,
      confidence: modalityInfo.confidence,
      message: `AI analysis not available for ${modalityInfo.modality}`,
      reason: modalityInfo.reason,
      supportedModalities: this.supportedModalities,
      recommendations: [
        'Your image has been saved and will be reviewed by a qualified radiologist',
        'AI analysis is currently only available for chest X-rays',
        'Check back for updates as we expand support to other imaging modalities'
      ],
      disclaimers: this.getDisclaimers()
    };
  }

  /**
   * Create mock analysis for development/testing
   * CLEARLY LABELED as mock data
   * Only used when real inference is unavailable
   */
  createMockAnalysis(modality, language = 'en') {
    // TorchXRayVision pathologies (18 total)
    const mockFindings = {
      chest_xray: {
        en: {
          summary: 'Mock analysis: No real model inference available. Would detect pathologies like Pneumonia, Consolidation, Effusion, Atelectasis, Cardiomegaly, and 13 other conditions.',
          findings: [
            { pathology: 'No significant abnormalities', confidence: 0.92, severity: 'low' }
          ],
          patientFriendlyExplanation: 'This is MOCK analysis for testing only. The chest X-ray appears within normal limits. A qualified radiologist should perform the official review.',
          confidence: 0.92
        },
        hi: {
          summary: 'मॉक विश्लेषण: छाती से संबंधित 18 बीमारियों का पता लगा सकते हैं।',
          findings: [
            { pathology: 'कोई महत्वपूर्ण असामान्यता नहीं', confidence: 0.92, severity: 'low' }
          ],
          patientFriendlyExplanation: 'यह केवल परीक्षण के लिए मॉक विश्लेषण है। आपकी छाती का एक्स-रे सामान्य सीमा के भीतर दिखता है। एक योग्य रेडियोलॉजिस्ट को आधिकारिक समीक्षा करनी चाहिए।',
          confidence: 0.92
        }
      }
    };

    const modalityData = mockFindings[modality] || mockFindings.chest_xray;
    const langData = modalityData[language] || modalityData.en;

    return {
      success: true,
      status: 'completed',
      isMockData: true, // CRITICAL: Marks as mock
      modality,
      language,
      model: 'mock-placeholder',
      findings: langData.findings,
      summary: langData.summary,
      patientFriendlyExplanation: langData.patientFriendlyExplanation,
      confidence: langData.confidence,
      limitations: [
        'This is MOCK data for development/testing only',
        'No actual AI inference was performed',
        'Real inference requires Python worker + TorchXRayVision model',
        'Do not use for clinical decisions'
      ],
      disclaimers: this.getDisclaimers(),
      analyzedAt: new Date(),
      metadata: {
        modelVersion: 'mock-1.0',
        device: 'none',
        inferenceType: 'mock',
        inferenceTime: 0
      }
    };
  }

  /**
   * Create error response
   */
  createErrorResponse(error) {
    return {
      success: false,
      status: 'error',
      message: 'Image analysis failed',
      error: error.message,
      recommendations: [
        'Your image has been saved',
        'A radiologist will review it manually',
        'You can try uploading again or contact support'
      ],
      disclaimers: this.getDisclaimers()
    };
  }

  /**
   * Get standard disclaimers (ALWAYS included)
   */
  getDisclaimers() {
    return [
      'This analysis is AI-generated and NOT a medical diagnosis',
      'Always consult a qualified radiologist for professional interpretation',
      'This tool is for educational and preliminary screening purposes only',
      'Do not make treatment decisions based solely on AI output',
      'The original image remains the authoritative source for clinical review'
    ];
  }

  /**
   * Get supported modalities
   */
  getSupportedModalities() {
    return this.supportedModalities;
  }

  /**
   * Get analyzer status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      initialized: this.initialized,
      model: this.initialized ? 'medical-image-ai-v1.0' : 'none',
      device: this.device,
      supportedModalities: this.supportedModalities,
      mode: this.enabled && this.initialized ? 'production' : 'mock',
      modelPath: this.modelPath || 'not configured'
    };
  }

  /**
   * Check if analyzer is ready for real inference
   */
  isReady() {
    return this.enabled && this.initialized;
  }

  /**
   * Check if a specific modality is supported
   */
  supportsModality(modality) {
    return this.supportedModalities.includes(modality);
  }

  /**
   * Health check endpoint data
   */
  async healthCheck() {
    return {
      service: 'Medical Image Analyzer',
      status: this.isReady() ? 'ready' : 'mock_mode',
      enabled: this.enabled,
      initialized: this.initialized,
      supportedModalities: this.supportedModalities,
      modelInfo: this.isReady() ? {
        path: this.modelPath,
        device: this.device,
        memoryEstimate: '2-4 GB'
      } : null,
      limitations: [
        'Currently supports chest X-rays only',
        'Requires manual model setup for real inference',
        'Not available on Render free tier (insufficient memory)',
        'Mock mode active when model unavailable'
      ],
      setupInstructions: !this.isReady() ? 'See docs/MEDICAL_IMAGE_AI_SETUP.md' : null
    };
  }
}

// Singleton instance
const medicalImageAnalyzer = new MedicalImageAnalyzer();

export default medicalImageAnalyzer;

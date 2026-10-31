import config from '../config/index.js';
import logger from '../utils/logger.js';
import { ExternalServiceError } from '../utils/errors.js';

/**
 * Groq AI Adapter
 * Provides structured medical summary generation via Groq API
 * Uses JSON schema validation for safety
 */
class GroqAIAdapter {
  constructor() {
    this.apiKey = config.groq?.apiKey;
    this.model = config.groq?.model;
    this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    this.isConfigured = !!(this.apiKey && this.model);

    if (this.isConfigured) {
      logger.info(`Groq AI adapter initialized with model: ${this.model}`);
    } else {
      logger.warn('Groq API not configured. Adapter will not function.');
    }
  }

  /**
   * Generate medical history summary via Groq API
   * Returns structured JSON with safety validation
   */
  async generateMedicalSummary(normalizedData, options = {}) {
    if (!this.isConfigured) {
      throw new ExternalServiceError(
        'Groq',
        'Groq API is not configured. Check GROQ_API_KEY and GROQ_MODEL environment variables.'
      );
    }

    try {
      const language = options.language || 'en';
      const prompt = this.buildMedicalSummaryPrompt(normalizedData, language);

      logger.info(
        `Groq: Generating medical summary in ${language} for ${normalizedData.recordCount} records`
      );

      const response = await this.callGroqAPI(prompt, {
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'MedicalSummary',
            schema: this.getMedicalSummarySchema(),
          },
        },
      });

      // Validate response structure
      const summary = this.validateAndParseResponse(response, 'medical_summary');

      return {
        summary: summary.summary || 'Unable to generate summary',
        majorConditions: summary.majorConditions || [],
        currentMedications: summary.currentMedications || [],
        allergies: summary.allergies || [],
        vaccinations: summary.vaccinations || [],
        laboratoryFindings: summary.laboratoryFindings || [],
        radiologyFindings: summary.radiologyFindings || [],
        procedures: summary.procedures || [],
        importantEvents: summary.importantEvents || [],
        missingInformation: summary.missingInformation || [],
        warnings: summary.warnings || [],
        disclaimers: [
          'This AI-generated summary is based on your JeevaCare clinical records.',
          'It is for information and understanding only and does not replace professional medical advice.',
          'Always consult a qualified healthcare professional for medical decisions.',
        ],
      };
    } catch (error) {
      logger.error(`Groq medical summary error: ${error.message}`);
      throw new ExternalServiceError('Groq', `Failed to generate summary: ${error.message}`);
    }
  }

  /**
   * Generate patient-friendly explanation
   */
  async generateSimpleExplanation(medicalContent, options = {}) {
    if (!this.isConfigured) {
      throw new ExternalServiceError(
        'Groq',
        'Groq API is not configured.'
      );
    }

    try {
      const language = options.language || 'en';
      const prompt = this.buildSimpleExplanationPrompt(medicalContent, language);

      logger.info(`Groq: Generating simple explanation in ${language}`);

      const response = await this.callGroqAPI(prompt, {
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'SimpleExplanation',
            schema: this.getSimpleExplanationSchema(),
          },
        },
      });

      const explanation = this.validateAndParseResponse(response, 'simple_explanation');

      return {
        explanation: explanation.explanation || 'Unable to generate explanation',
        keyPoints: explanation.keyPoints || [],
        uncertainties: explanation.uncertainties || [],
      };
    } catch (error) {
      logger.error(`Groq simple explanation error: ${error.message}`);
      throw new ExternalServiceError('Groq', `Failed to generate explanation: ${error.message}`);
    }
  }

  /**
   * Translate text to target language
   */
  async translateText(text, targetLanguage, sourceLanguage = 'en') {
    if (!this.isConfigured) {
      throw new ExternalServiceError(
        'Groq',
        'Groq API is not configured.'
      );
    }

    try {
      logger.info(
        `Groq: Translating from ${sourceLanguage} to ${targetLanguage}`
      );

      const prompt = this.buildTranslationPrompt(text, sourceLanguage, targetLanguage);

      const response = await this.callGroqAPI(prompt, {
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'Translation',
            schema: this.getTranslationSchema(),
          },
        },
      });

      const translation = this.validateAndParseResponse(response, 'translation');

      return {
        original: text,
        translated: translation.translated || text,
        targetLanguage,
        sourceLanguage,
        confidence: translation.confidence || 0.9,
      };
    } catch (error) {
      logger.error(`Groq translation error: ${error.message}`);
      throw new ExternalServiceError('Groq', `Failed to translate: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive, grounded radiology explanation matching JeevaCare standard schema
   * @param {Object} context - Modality, pathway, predictions or OCR text, metadata
   * @param {Object} options - Language and generation options
   */
  async generateRadiologyExplanation(context, options = {}) {
    const language = options.language || 'en';
    const pathway = context.pathway || 'chest_xray';

    // Build fallback response if Groq is not configured or fails
    const fallbackResponse = this._buildFallbackRadiologyExplanation(context, language);

    if (!this.isConfigured) {
      logger.info('Groq API not configured, returning structured fallback radiology explanation');
      return fallbackResponse;
    }

    try {
      const prompt = this.buildRadiologyExplanationPrompt(context, language);

      logger.info(`Groq: Generating structured radiology analysis for pathway [${pathway}] in ${language}`);

      const response = await this.callGroqAPI(prompt, {
        temperature: 0.2, // Low temperature for clinical accuracy
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'RadiologyAnalysisExplanation',
            schema: this.getRadiologyExplanationSchema(),
          },
        },
      });

      const parsed = this.validateAndParseResponse(response, 'radiology_explanation');

      return {
        studyType: parsed.studyType || context.studyType || 'Radiology Study',
        modality: parsed.modality || context.modality || 'other',
        summary: parsed.summary || fallbackResponse.summary,
        whatWasObserved: Array.isArray(parsed.whatWasObserved) && parsed.whatWasObserved.length > 0 
          ? parsed.whatWasObserved 
          : fallbackResponse.whatWasObserved,
        potentialAbnormalities: Array.isArray(parsed.potentialAbnormalities) 
          ? parsed.potentialAbnormalities 
          : fallbackResponse.potentialAbnormalities,
        normalFindings: Array.isArray(parsed.normalFindings) 
          ? parsed.normalFindings 
          : fallbackResponse.normalFindings,
        clinicalExplanation: parsed.clinicalExplanation || fallbackResponse.clinicalExplanation,
        recommendations: Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0
          ? parsed.recommendations
          : fallbackResponse.recommendations,
        importantCaveats: Array.isArray(parsed.importantCaveats) && parsed.importantCaveats.length > 0
          ? parsed.importantCaveats
          : fallbackResponse.importantCaveats,
        requiresDoctorReview: true,
        analysisProvider: `Groq (${this.model})`,
        analysisModel: this.model,
        analysisStatus: 'completed',
      };
    } catch (error) {
      logger.warn(`Groq radiology explanation failed (${error.message}); utilizing grounded deterministic fallback`);
      return fallbackResponse;
    }
  }

  /**
   * Deterministic fallback radiology explanation grounded in actual inputs
   */
  _buildFallbackRadiologyExplanation(context, language = 'en') {
    const pathway = context.pathway || 'chest_xray';

    if (pathway === 'chest_xray') {
      const findings = context.findings || [];
      const hasAbnormal = findings.length > 0;
      const abnormalNames = findings.map(f => `${f.pathology} (estimated ${(f.confidence * 100).toFixed(1)}%)`);

      const allScores = context.allScores || {};
      const normalList = Object.entries(allScores)
        .filter(([k, v]) => !findings.some(f => f.pathology === k || f.rawPathology === k))
        .map(([k, v]) => `${k} (negative/low probability ${(v * 100).toFixed(1)}%)`);

      return {
        studyType: 'Chest X-Ray (Radiograph)',
        modality: 'chest_xray',
        summary: hasAbnormal
          ? `Automated TorchXRayVision deep learning screening detected findings exceeding the clinical reporting threshold: ${abnormalNames.join(', ')}.`
          : 'Automated TorchXRayVision deep learning screening evaluated all 18 chest pathologies; none exceeded the clinical reporting threshold (30%).',
        whatWasObserved: [
          'Evaluated lung fields, cardiomediastinal contour, and pleural spaces',
          hasAbnormal 
            ? `Deep learning screening model flagged patterns for: ${findings.map(f => f.pathology).join(', ')}`
            : 'No focal consolidation, pneumothorax, or large pleural effusion patterns detected',
          `18 separate chest pathologies evaluated via TorchXRayVision ResNet50`,
        ],
        potentialAbnormalities: findings.map(f => ({
          pathology: f.pathology,
          confidence: f.confidence,
          severity: f.severity || (f.confidence > 0.6 ? 'moderate' : 'mild'),
          description: `Machine learning probability score of ${(f.confidence * 100).toFixed(1)}% for ${f.pathology}. Warranting clinical correlation.`,
        })),
        normalFindings: normalList.slice(0, 6).map(n => ({
          pathology: n.split(' ')[0],
          description: n,
        })),
        clinicalExplanation: hasAbnormal
          ? `The automated neural network identified features that correlate with ${findings.map(f => f.pathology).join(' and ')}. In clinical imaging, these patterns can indicate inflammation, fluid accumulation, or tissue density variations. Because these are computational probability estimates and not definitive diagnoses, a licensed physician or radiologist must examine the original study in clinical context.`
          : 'The automated neural network did not detect features exceeding the reporting threshold for pneumonia, pneumothorax, pulmonary edema, cardiomegaly, or other tested chest conditions. This supports an initial screening impression of clear lung fields, subject to definitive physician evaluation.',
        recommendations: [
          'Share these results with your healthcare provider during your consultation',
          'Discuss any symptoms you may be experiencing, such as cough, fever, or shortness of breath',
          'Do not discontinue or modify any prescribed medications based on automated screening results',
        ],
        importantCaveats: [
          'TorchXRayVision is an automated clinical decision-support model, not a standalone diagnostic device',
          'Confidence scores reflect algorithmic pattern similarity, not absolute disease probabilities',
          'Only a licensed radiologist or physician can provide a definitive medical interpretation',
        ],
        requiresDoctorReview: true,
        analysisProvider: 'TorchXRayVision (Local ResNet50)',
        analysisModel: 'resnet50-res512-all',
        analysisStatus: 'completed',
      };
    }

    if (pathway === 'ocr_report') {
      const text = context.extractedText || '';
      const textPreview = text.slice(0, 300);

      return {
        studyType: context.studyType || 'Written Radiology Report',
        modality: context.modality || 'document_report',
        summary: text
          ? `Text extracted successfully from radiology report (${text.length} characters).`
          : 'Document uploaded; no structured clinical text was detected during OCR extraction.',
        whatWasObserved: [
          `Document text extracted via Optical Character Recognition (Tesseract)`,
          textPreview ? `Report excerpt: "${textPreview.replace(/\n+/g, ' ').slice(0, 150)}..."` : 'Text parsing complete',
        ],
        potentialAbnormalities: [],
        normalFindings: [],
        clinicalExplanation: text
          ? 'The uploaded medical report contains written findings and clinical impressions from the examining facility. Please review the extracted document text alongside your consulting physician.'
          : 'The document has been securely stored in your patient profile for physician review.',
        recommendations: [
          'Review the original signed radiology report with your treating physician',
          'Keep a copy of this study in your lifelong JeevaCare health record',
        ],
        importantCaveats: [
          'OCR text extraction may contain typographical variances from original physical prints',
          'The original scanned or digital document remains the authoritative medical record',
        ],
        requiresDoctorReview: true,
        analysisProvider: 'Tesseract OCR',
        analysisModel: 'tesseract-v5',
        analysisStatus: 'completed',
      };
    }

    return {
      studyType: context.studyType || 'Specialized Medical Study',
      modality: context.modality || 'unsupported',
      summary: `Automated AI vision analysis is specialized for chest radiographs. Manual radiologist evaluation is required for ${context.studyType || 'this modality'}.`,
      whatWasObserved: [
        `Modality: ${context.studyType || 'Non-chest study'}`,
        'Original study file securely saved to persistent patient record',
      ],
      potentialAbnormalities: [],
      normalFindings: [],
      clinicalExplanation: 'Automated deep learning analysis for cross-sectional studies (such as CT and MRI), ultrasound, and specialized imaging requires specialized multi-slice diagnostic workstations and is not currently automated. Your complete medical imaging files are safely preserved for direct clinician review.',
      recommendations: [
        'Schedule a consultation with your referring physician to review the radiologist impression',
        'Bring any prior comparison studies to your appointment',
      ],
      importantCaveats: [
        'Zero automated findings fabricated for unsupported modalities',
        'Direct specialist radiologist interpretation required',
      ],
      requiresDoctorReview: true,
      analysisProvider: 'JeevaCare Imaging Protocol',
      analysisModel: 'manual_radiologist_review',
      analysisStatus: 'unsupported_modality',
    };
  }

  /**
   * Call Groq API with structured response format
   */
  async callGroqAPI(userPrompt, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };

    const payload = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt(),
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.3, // Lower temperature for consistency
      max_tokens: 2000,
      ...options,
    };

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Groq API error ${response.status}: ${errorData.error?.message || 'Unknown error'}`
        );
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid Groq API response structure');
      }

      const content = data.choices[0].message.content;

      // Parse JSON response
      try {
        return JSON.parse(content);
      } catch {
        // If not JSON, return as-is for non-JSON endpoints
        return content;
      }
    } catch (error) {
      logger.error(`Groq API call failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * System prompt for medical context
   */
  getSystemPrompt() {
    return `You are a helpful medical information assistant for a healthcare platform called JeevaCare. 
Your role is to:
- Summarize documented medical information clearly and accurately
- Never invent medical information
- Clearly distinguish between documented facts and missing information
- Explain medical concepts in patient-friendly language when requested
- Preserve clinical accuracy while improving readability

CRITICAL SAFETY RULES:
- You MUST NOT diagnose conditions
- You MUST NOT prescribe medications or treatments
- You MUST NOT invent medications, allergies, conditions, or lab results
- You MUST NOT modify or alter clinical records
- You MUST NOT claim that missing information means a condition is absent
- You MUST NOT make medical recommendations

When information is missing, state: "No [field] information has been documented in the available records."
NOT: "The patient has no [condition]."

Always validate that your output is based ONLY on the clinical data provided.`;
  }

  /**
   * Build prompt for medical summary
   */
  buildMedicalSummaryPrompt(normalizedData, language) {
    const languageNote = language !== 'en' ? `\nProvide the output in ${language}.` : '';

    return `Based on the following clinical records, generate a comprehensive medical history summary.${languageNote}

CLINICAL RECORDS:
${JSON.stringify(normalizedData, null, 2)}

Generate a JSON response with:
- summary: Brief overview of the patient's medical history
- majorConditions: Array of documented conditions
- currentMedications: Array of documented medications
- allergies: Array of documented allergies
- vaccinations: Array of documented vaccinations
- laboratoryFindings: Important lab results
- radiologyFindings: Important imaging findings
- procedures: Past procedures and surgeries
- importantEvents: Significant medical events
- missingInformation: Fields with no documentation
- warnings: Any important caveats or uncertainties

STRICT REQUIREMENT: Only include information that is explicitly documented. Do not invent any medical data.`;
  }

  /**
   * Build prompt for simple explanation
   */
  buildSimpleExplanationPrompt(medicalContent, language) {
    const languageNote = language !== 'en' ? `\nProvide the output in ${language}.` : '';

    return `Explain the following medical information in simple, patient-friendly language:${languageNote}

MEDICAL INFORMATION:
${typeof medicalContent === 'string' ? medicalContent : JSON.stringify(medicalContent, null, 2)}

Generate a JSON response with:
- explanation: Clear, simple explanation of the medical information
- keyPoints: Array of important points to understand
- uncertainties: Array of information that is uncertain or missing

Important: Do NOT change the clinical meaning. Keep all facts as documented. Do NOT diagnose or recommend treatments.`;
  }

  /**
   * Build translation prompt
   */
  buildTranslationPrompt(text, sourceLanguage, targetLanguage) {
    return `Translate the following medical/clinical text from ${sourceLanguage} to ${targetLanguage}.

SOURCE TEXT:
${text}

Requirements:
- Preserve medical accuracy and terminology where possible
- Provide accurate translation that maintains clinical meaning
- Return ONLY the translation, no explanation

Generate JSON with:
- translated: The translated text
- confidence: Confidence score (0-1) of the translation accuracy`;
  }

  /**
   * Build prompt for standardized radiology analysis
   */
  buildRadiologyExplanationPrompt(context, language = 'en') {
    const langNotice = language !== 'en' ? `\nIMPORTANT: Provide all explanations, summaries, and recommendations in ${language}.` : '';

    if (context.pathway === 'chest_xray') {
      return `You are an expert medical AI assistant for JeevaCare. A patient's chest radiograph (X-ray) was evaluated by the TorchXRayVision ResNet-50 deep learning model.
Analyze the quantitative predictions and clinical context below, and generate an evidence-grounded, patient-friendly clinical explanation.${langNotice}

STUDY DETAILS:
- Study Type: Chest X-Ray (Radiograph)
- Anatomical Region: ${context.bodyPart || 'Chest'}
- Clinical Indication: ${context.clinicalIndication || 'Routine chest radiograph evaluation'}
- AI Model Used: TorchXRayVision ResNet50 (resnet50-res512-all)
- Positive Findings (confidence >= 30%): ${JSON.stringify(context.findings || [])}
- Complete Evaluated Pathologies: ${JSON.stringify(context.allScores || {})}

STRICT INSTRUCTIONS:
1. Base all statements strictly on the provided model outputs. Do NOT fabricate findings not listed above.
2. In 'summary', provide a 1-2 sentence overview of whether findings were detected.
3. In 'whatWasObserved', list the evaluated anatomical features and detected patterns.
4. In 'potentialAbnormalities', list findings with probabilities >= 30% and explain what each pattern could indicate.
5. In 'normalFindings', list the pathologies that were negative or low probability (< 30%).
6. In 'clinicalExplanation', explain the clinical significance in empathetic, understandable language while noting that these are machine-learning probability estimates, not definitive medical diagnoses.
7. In 'recommendations', provide actionable questions and next steps for the patient to discuss with their doctor.
8. In 'importantCaveats', state that TorchXRayVision is a decision-support tool and physician review is mandatory.
9. Always set 'requiresDoctorReview' to true.`;
    }

    if (context.pathway === 'ocr_report') {
      return `You are an expert medical AI assistant for JeevaCare. A patient uploaded a written radiology report / medical document.
Analyze the extracted OCR clinical text below, and generate an evidence-grounded, patient-friendly clinical explanation.${langNotice}

STUDY DETAILS:
- Study Type: ${context.studyType || 'Written Radiology Report'}
- Modality: ${context.modality || 'Document Report'}
- Clinical Indication: ${context.clinicalIndication || 'Diagnostic evaluation'}
- Extracted Report Text:
"""
${context.extractedText || 'No text extracted'}
"""

STRICT INSTRUCTIONS:
1. Ground every statement strictly in the extracted text. Preserve medical units, measurements, and clinical negations.
2. In 'summary', provide a clear 1-2 sentence overview of the study objective and main conclusion.
3. In 'whatWasObserved', list specific clinical observations documented in the report.
4. In 'potentialAbnormalities', list any abnormal findings, lesions, or critical impressions documented.
5. In 'normalFindings', list anatomical structures reported as normal or unremarkable.
6. In 'clinicalExplanation', translate complex radiological terminology into patient-friendly language.
7. In 'recommendations', provide actionable follow-up items and questions for the physician.
8. In 'importantCaveats', state that the original signed report is authoritative.
9. Always set 'requiresDoctorReview' to true.`;
    }

    return `You are an expert medical AI assistant for JeevaCare. A medical study of type ${context.studyType || 'Specialized Medical Study'} was uploaded.${langNotice}
Explain clearly to the patient why automated computer vision is specialized for chest radiographs and how their cross-sectional study is securely stored for licensed radiologist evaluation.`;
  }

  /**
   * JSON schema for standardized radiology analysis
   */
  getRadiologyExplanationSchema() {
    return {
      type: 'object',
      properties: {
        studyType: { type: 'string' },
        modality: { type: 'string' },
        summary: { type: 'string' },
        whatWasObserved: {
          type: 'array',
          items: { type: 'string' },
        },
        potentialAbnormalities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              pathology: { type: 'string' },
              confidence: { type: 'number' },
              severity: { type: 'string' },
              description: { type: 'string' },
            },
            required: ['pathology'],
            additionalProperties: true,
          },
        },
        normalFindings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              pathology: { type: 'string' },
              description: { type: 'string' },
            },
            required: ['pathology'],
            additionalProperties: true,
          },
        },
        clinicalExplanation: { type: 'string' },
        recommendations: {
          type: 'array',
          items: { type: 'string' },
        },
        importantCaveats: {
          type: 'array',
          items: { type: 'string' },
        },
        requiresDoctorReview: { type: 'boolean' },
      },
      required: [
        'studyType',
        'modality',
        'summary',
        'whatWasObserved',
        'clinicalExplanation',
        'recommendations',
        'importantCaveats',
        'requiresDoctorReview',
      ],
      additionalProperties: false,
    };
  }

  /**
   * JSON schema for medical summary
   */
  getMedicalSummarySchema() {
    return {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        majorConditions: {
          type: 'array',
          items: { type: 'string' },
        },
        currentMedications: {
          type: 'array',
          items: { type: 'string' },
        },
        allergies: {
          type: 'array',
          items: { type: 'string' },
        },
        vaccinations: {
          type: 'array',
          items: { type: 'string' },
        },
        laboratoryFindings: {
          type: 'array',
          items: { type: 'string' },
        },
        radiologyFindings: {
          type: 'array',
          items: { type: 'string' },
        },
        procedures: {
          type: 'array',
          items: { type: 'string' },
        },
        importantEvents: {
          type: 'array',
          items: { type: 'string' },
        },
        missingInformation: {
          type: 'array',
          items: { type: 'string' },
        },
        warnings: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: [
        'summary',
        'majorConditions',
        'currentMedications',
        'allergies',
      ],
      additionalProperties: false,
    };
  }

  /**
   * JSON schema for simple explanation
   */
  getSimpleExplanationSchema() {
    return {
      type: 'object',
      properties: {
        explanation: { type: 'string' },
        keyPoints: {
          type: 'array',
          items: { type: 'string' },
        },
        uncertainties: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['explanation', 'keyPoints'],
      additionalProperties: false,
    };
  }

  /**
   * JSON schema for translation
   */
  getTranslationSchema() {
    return {
      type: 'object',
      properties: {
        translated: { type: 'string' },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
      },
      required: ['translated'],
      additionalProperties: false,
    };
  }

  /**
   * Validate and parse API response
   */
  validateAndParseResponse(response, type) {
    if (!response) {
      throw new Error(`Empty response for ${type}`);
    }

    // Validate against schema based on type
    if (type === 'medical_summary') {
      if (!response.summary || typeof response.summary !== 'string') {
        throw new Error('Invalid medical summary: missing or invalid summary field');
      }
    } else if (type === 'simple_explanation') {
      if (!response.explanation || typeof response.explanation !== 'string') {
        throw new Error('Invalid explanation: missing or invalid explanation field');
      }
    } else if (type === 'translation') {
      if (!response.translated || typeof response.translated !== 'string') {
        throw new Error('Invalid translation: missing or invalid translated field');
      }
    } else if (type === 'radiology_explanation') {
      if (!response.summary || typeof response.summary !== 'string') {
        throw new Error('Invalid radiology explanation: missing summary');
      }
    }

    return response;
  }

  /**
   * Check if adapter is configured
   */
  isReady() {
    return this.isConfigured;
  }

  /**
   * Get adapter status
   */
  getStatus() {
    return {
      configured: this.isConfigured,
      provider: 'Groq',
      model: this.model,
      apiEndpoint: this.apiUrl,
    };
  }
}

export default new GroqAIAdapter();

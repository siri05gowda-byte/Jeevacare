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

import logger from '../utils/logger.js';

/**
 * HealthcareProviderAdapter — Base interface for external healthcare integrations
 *
 * Defines normalized interface for:
 * - DigiLocker (government document retrieval)
 * - Hospital/Healthcare Provider systems
 * - Laboratories
 * - Diagnostic/Radiology Centers
 *
 * Each adapter implementation extends this base with provider-specific logic.
 */
class HealthcareProviderAdapter {
  constructor(providerName, config = {}) {
    this.providerName = providerName;
    this.enabled = config.enabled || false;
    this.mode = config.mode || 'mock'; // 'live', 'sandbox', 'mock'
    this.credentials = config.credentials || {};
    this.baseUrl = config.baseUrl || null;
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelayMs = config.retryDelayMs || 1000;

    logger.info(
      `HealthcareProviderAdapter initialized: ${providerName} (mode: ${this.mode})`
    );
  }

  /**
   * Authenticate with the provider
   * Returns: { success: boolean, token?: string, error?: string }
   */
  async authenticate() {
    throw new Error('authenticate() must be implemented by subclass');
  }

  /**
   * Verify authentication status
   * Returns: { authenticated: boolean, expiresAt?: Date }
   */
  async verifyAuth() {
    throw new Error('verifyAuth() must be implemented by subclass');
  }

  /**
   * Retrieve documents for a patient from the provider
   * Returns: { success: boolean, documents: [], error?: string }
   */
  async retrievePatientDocuments(patientId, options = {}) {
    throw new Error('retrievePatientDocuments() must be implemented by subclass');
  }

  /**
   * Retrieve specific document content
   * Returns: { success: boolean, document: { id, name, content, mimeType }, error?: string }
   */
  async retrieveDocument(documentId) {
    throw new Error('retrieveDocument() must be implemented by subclass');
  }

  /**
   * Search for documents across the provider
   * Returns: { success: boolean, results: [], total: number, error?: string }
   */
  async searchDocuments(query, options = {}) {
    throw new Error('searchDocuments() must be implemented by subclass');
  }

  /**
   * Push a document to the provider
   * Returns: { success: boolean, documentId?: string, error?: string }
   */
  async uploadDocument(patientId, document) {
    throw new Error('uploadDocument() must be implemented by subclass');
  }

  /**
   * Get patient information from provider
   * Returns: { success: boolean, patient: { id, name, dob, email }, error?: string }
   */
  async getPatientInfo(patientId) {
    throw new Error('getPatientInfo() must be implemented by subclass');
  }

  /**
   * Map provider-specific data to JeevaCare format
   */
  async mapProviderDataToJeevaCare(providerData) {
    throw new Error('mapProviderDataToJeevaCare() must be implemented by subclass');
  }

  /**
   * Validate provider response
   */
  validateResponse(response) {
    if (!response) {
      return { valid: false, error: 'Empty response' };
    }

    if (response.error) {
      return { valid: false, error: response.error };
    }

    return { valid: true };
  }

  /**
   * Handle provider errors with normalization
   */
  normalizeError(error) {
    if (error.message.includes('timeout')) {
      return {
        code: 'TIMEOUT',
        message: `Provider request timed out after ${this.timeout}ms`,
        retryable: true,
      };
    }

    if (error.message.includes('unauthorized')) {
      return {
        code: 'AUTH_FAILED',
        message: 'Authentication with provider failed',
        retryable: false,
      };
    }

    if (error.message.includes('404')) {
      return {
        code: 'NOT_FOUND',
        message: 'Resource not found on provider',
        retryable: false,
      };
    }

    if (error.message.includes('rate limit')) {
      return {
        code: 'RATE_LIMITED',
        message: 'Provider rate limit exceeded',
        retryable: true,
      };
    }

    return {
      code: 'PROVIDER_ERROR',
      message: error.message,
      retryable: true,
    };
  }

  /**
   * Retry logic with exponential backoff
   */
  async retryWithBackoff(fn, context = '') {
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info(
          `${this.providerName} request attempt ${attempt}/${this.maxRetries}: ${context}`
        );
        return await fn();
      } catch (error) {
        lastError = error;
        const normalizedError = this.normalizeError(error);

        if (!normalizedError.retryable || attempt === this.maxRetries) {
          throw error;
        }

        const delayMs = this.retryDelayMs * Math.pow(2, attempt - 1);
        logger.warn(
          `${this.providerName} request failed (attempt ${attempt}): ${error.message}. ` +
          `Retrying in ${delayMs}ms...`
        );

        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    throw lastError;
  }

  /**
   * Check provider connectivity and health
   * Returns: { status: 'available' | 'unavailable' | 'degraded', message: string }
   */
  async getStatus() {
    if (!this.enabled) {
      return {
        status: 'unavailable',
        mode: this.mode,
        message: `${this.providerName} is disabled (mode: ${this.mode})`,
      };
    }

    try {
      const auth = await this.verifyAuth();
      if (!auth.authenticated) {
        return {
          status: 'unavailable',
          mode: this.mode,
          message: `${this.providerName} authentication failed`,
        };
      }

      return {
        status: 'available',
        mode: this.mode,
        authenticated: true,
        message: `${this.providerName} is operational`,
      };
    } catch (error) {
      return {
        status: 'unavailable',
        mode: this.mode,
        message: `${this.providerName} error: ${error.message}`,
      };
    }
  }

  /**
   * Validate configuration
   */
  validateConfig() {
    const errors = [];

    if (this.mode === 'live' && !this.baseUrl) {
      errors.push('baseUrl required for live mode');
    }

    if (this.mode === 'live' && !this.credentials.apiKey && !this.credentials.clientId) {
      errors.push('API credentials required for live mode');
    }

    if (this.timeout < 1000) {
      errors.push('timeout must be >= 1000ms');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get adapter metadata
   */
  getMetadata() {
    return {
      providerName: this.providerName,
      enabled: this.enabled,
      mode: this.mode,
      baseUrl: this.mode === 'live' ? this.baseUrl : 'N/A (not in live mode)',
      timeout: this.timeout,
      maxRetries: this.maxRetries,
      config: this.validateConfig(),
    };
  }

  /**
   * Document mapping helper: Convert provider format to JeevaCare format
   */
  mapDocumentToJeevaCare(providerDoc) {
    return {
      providerSourceId: providerDoc.id || providerDoc.documentId,
      fileName: providerDoc.name || providerDoc.fileName || 'Document',
      mimeType: providerDoc.mimeType || 'application/octet-stream',
      documentDate: providerDoc.date || providerDoc.createdAt,
      issuingFacility: providerDoc.facility || providerDoc.hospital,
      issuingProvider: providerDoc.provider || providerDoc.doctor,
      documentType: this.mapDocumentType(providerDoc.type),
      content: providerDoc.content || providerDoc.data,
      sourceProvider: this.providerName,
      sourceProvenance: {
        provider: this.providerName,
        originalId: providerDoc.id || providerDoc.documentId,
        retrievedAt: new Date(),
      },
    };
  }

  /**
   * Map provider-specific document types to JeevaCare types
   */
  mapDocumentType(providerType) {
    const typeMap = {
      prescription: 'prescription',
      lab: 'lab_report',
      radiology: 'radiology_report',
      discharge: 'discharge_summary',
      report: 'medical_certificate',
      vaccination: 'vaccination_certificate',
      pathology: 'pathology_report',
      notes: 'clinical_notes',
    };

    return typeMap[providerType?.toLowerCase()] || 'other_medical_document';
  }

  /**
   * Validate patient identity
   */
  validatePatientIdentity(patientData, jeevaPatient) {
    const matches = {
      nameMatch: this.compareNames(patientData.name, jeevaPatient.name),
      dobMatch: this.compareDates(patientData.dob, jeevaPatient.dob),
      idMatch: patientData.id === jeevaPatient.id,
    };

    const confidenceScore =
      (matches.nameMatch ? 1 : 0) * 0.5 +
      (matches.dobMatch ? 1 : 0) * 0.4 +
      (matches.idMatch ? 1 : 0) * 0.1;

    return {
      matches,
      confidenceScore,
      shouldProceeed: confidenceScore >= 0.8,
    };
  }

  /**
   * Compare names (case-insensitive, ignore whitespace variations)
   */
  compareNames(name1, name2) {
    if (!name1 || !name2) return false;
    const norm1 = name1.toLowerCase().replace(/\s+/g, '');
    const norm2 = name2.toLowerCase().replace(/\s+/g, '');
    return norm1 === norm2;
  }

  /**
   * Compare dates (handle various formats)
   */
  compareDates(date1, date2) {
    if (!date1 || !date2) return false;
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.abs(d1.getTime() - d2.getTime()) < 86400000; // Within 1 day
  }
}

export default HealthcareProviderAdapter;

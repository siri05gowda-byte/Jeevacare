import HealthcareProviderAdapter from './HealthcareProviderAdapter.js';
import axios from 'axios';
import logger from '../utils/logger.js';

/**
 * LaboratoryAdapter — Lab result integration
 *
 * Integrates with clinical laboratories:
 * - Blood tests (CBC, chemistry panels)
 * - Pathology results
 * - Microbiology tests
 * - Specialized investigations
 *
 * Supports lab-specific APIs and standard formats
 */
class LaboratoryAdapter extends HealthcareProviderAdapter {
  constructor(config = {}) {
    const mergedConfig = {
      enabled: config.enabled || false,
      mode: config.mode || 'mock',
      baseUrl: config.baseUrl || 'https://lab-api.example.com',
      timeout: config.timeout || 15000,
      credentials: config.credentials || {
        labCode: process.env.LAB_API_CODE,
        apiKey: process.env.LAB_API_KEY,
      },
      ...config,
    };

    super('Laboratory', mergedConfig);

    this.labName = config.labName || 'Diagnostic Lab';
    this.supportedTests = [
      'blood_test',
      'pathology',
      'microbiology',
      'immunology',
      'endocrinology',
      'toxicology',
    ];
  }

  /**
   * Authenticate with lab system
   */
  async authenticate() {
    if (this.mode === 'mock') {
      return this.mockAuthenticate();
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/auth/login`,
        {
          labCode: this.credentials.labCode,
          apiKey: this.credentials.apiKey,
        },
        { timeout: this.timeout }
      );

      if (response.data.token) {
        this.labToken = response.data.token;
        logger.info(`${this.labName} authentication successful`);

        return {
          success: true,
          token: this.labToken,
        };
      }

      return { success: false, error: 'Authentication failed' };
    } catch (error) {
      logger.error(`${this.labName} auth error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify auth
   */
  async verifyAuth() {
    if (this.mode === 'mock') {
      return { authenticated: true };
    }

    return { authenticated: !!this.labToken };
  }

  /**
   * Retrieve lab results for patient
   */
  async retrievePatientDocuments(patientId, options = {}) {
    try {
      const auth = await this.verifyAuth();
      if (!auth.authenticated) {
        throw new Error('Authentication failed');
      }

      return await this.retryWithBackoff(async () => {
        if (this.mode === 'mock') {
          return this.mockRetrieveDocuments(patientId, options);
        }

        const url = `${this.baseUrl}/results`;
        const response = await axios.get(url, {
          headers: this.getAuthHeaders(),
          params: {
            patient_id: patientId,
            limit: options.limit || 100,
          },
          timeout: this.timeout,
        });

        return {
          success: true,
          documents: (response.data.results || []).map(result =>
            this.mapLabResultToJeevaCare(result)
          ),
        };
      }, 'retrievePatientDocuments');
    } catch (error) {
      logger.error(`${this.labName} retrieval error: ${error.message}`);
      return { success: false, error: error.message, documents: [] };
    }
  }

  /**
   * Retrieve specific lab report
   */
  async retrieveDocument(reportId) {
    try {
      if (this.mode === 'mock') {
        return this.mockRetrieveDocument(reportId);
      }

      const auth = await this.verifyAuth();
      if (!auth.authenticated) {
        throw new Error('Authentication failed');
      }

      const url = `${this.baseUrl}/results/${reportId}`;
      const response = await axios.get(url, {
        headers: this.getAuthHeaders(),
        timeout: this.timeout,
      });

      return {
        success: true,
        document: {
          id: reportId,
          content: response.data,
          mimeType: 'application/json',
        },
      };
    } catch (error) {
      logger.error(`${this.labName} document error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search lab results
   */
  async searchDocuments(query, options = {}) {
    try {
      if (this.mode === 'mock') {
        return this.mockSearchDocuments(query, options);
      }

      const url = `${this.baseUrl}/results/search`;
      const response = await axios.post(
        url,
        { query, filters: options.filters },
        {
          headers: this.getAuthHeaders(),
          timeout: this.timeout,
        }
      );

      return {
        success: true,
        results: (response.data.results || []).map(r =>
          this.mapLabResultToJeevaCare(r)
        ),
        total: response.data.total || 0,
      };
    } catch (error) {
      logger.error(`${this.labName} search error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        results: [],
        total: 0,
      };
    }
  }

  /**
   * Get patient info
   */
  async getPatientInfo(patientId) {
    try {
      if (this.mode === 'mock') {
        return this.mockGetPatientInfo(patientId);
      }

      const url = `${this.baseUrl}/patients/${patientId}`;
      const response = await axios.get(url, {
        headers: this.getAuthHeaders(),
        timeout: this.timeout,
      });

      return {
        success: true,
        patient: {
          id: response.data.patient_id,
          name: response.data.name,
          dob: response.data.dob,
        },
      };
    } catch (error) {
      logger.error(`${this.labName} patient error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Upload lab result (incoming data)
   */
  async uploadDocument(patientId, document) {
    if (this.mode === 'mock') {
      return { success: true, documentId: `lab-${Date.now()}` };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/results`,
        {
          patient_id: patientId,
          test_type: document.documentType,
          result_data: document.content,
        },
        {
          headers: this.getAuthHeaders(),
          timeout: this.timeout,
        }
      );

      return { success: true, documentId: response.data.result_id };
    } catch (error) {
      logger.error(`${this.labName} upload error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Map lab result to JeevaCare document format
   */
  mapLabResultToJeevaCare(labResult) {
    return {
      id: labResult.result_id || labResult.id,
      name: labResult.test_name || labResult.test_type,
      type: 'lab_report',
      date: labResult.result_date || labResult.created_at,
      sourceProvider: this.labName,
      labResult: {
        testType: labResult.test_type,
        parameters: labResult.parameters,
        referenceRanges: labResult.reference_ranges,
        interpretation: labResult.interpretation,
        status: labResult.status,
      },
    };
  }

  /**
   * MOCK IMPLEMENTATIONS
   */

  mockAuthenticate() {
    this.labToken = `mock-lab-token-${Date.now()}`;
    return { success: true, token: this.labToken };
  }

  mockRetrieveDocuments(patientId, options = {}) {
    return {
      success: true,
      documents: [
        {
          id: 'lab-001',
          name: 'Complete Blood Count',
          type: 'lab_report',
          date: new Date(),
          sourceProvider: this.labName,
          parameters: {
            hemoglobin: { value: 13.5, unit: 'g/dL', status: 'normal' },
            whiteBloodCells: { value: 7500, unit: '/mm³', status: 'normal' },
          },
        },
      ],
    };
  }

  mockRetrieveDocument(reportId) {
    return {
      success: true,
      document: {
        id: reportId,
        content: { test: 'mock lab data' },
        mimeType: 'application/json',
      },
    };
  }

  mockSearchDocuments(query, options = {}) {
    return { success: true, results: [], total: 0 };
  }

  mockGetPatientInfo(patientId) {
    return {
      success: true,
      patient: {
        id: patientId,
        name: 'Lab Patient',
        dob: '1990-01-01',
      },
    };
  }

  /**
   * HELPERS
   */

  getAuthHeaders() {
    return {
      Authorization: `Bearer ${this.labToken || ''}`,
      'X-Lab-Code': this.credentials.labCode,
    };
  }

  async getStatus() {
    const baseStatus = await super.getStatus();
    return {
      ...baseStatus,
      labName: this.labName,
      supportedTests: this.supportedTests,
    };
  }
}

export default new LaboratoryAdapter({
  enabled: process.env.LABORATORY_ENABLED === 'true',
  mode: process.env.LABORATORY_MODE || 'mock',
  baseUrl: process.env.LABORATORY_BASE_URL,
  labName: process.env.LABORATORY_NAME || 'Diagnostic Laboratory',
});

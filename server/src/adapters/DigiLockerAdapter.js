import HealthcareProviderAdapter from './HealthcareProviderAdapter.js';
import axios from 'axios';
import logger from '../utils/logger.js';

/**
 * DigiLockerAdapter — Government digital document integration
 *
 * Provides access to DigiLocker documents:
 * - Vaccination certificates
 * - Birth certificates
 * - Medical documents
 * - Other government-issued certificates
 *
 * Modes:
 * - 'live': Connect to actual DigiLocker API (requires credentials)
 * - 'sandbox': Use DigiLocker sandbox environment
 * - 'mock': Simulated responses for development
 *
 * Documentation: https://digilocker.gov.in/ (when available)
 */
class DigiLockerAdapter extends HealthcareProviderAdapter {
  constructor(config = {}) {
    const mergedConfig = {
      enabled: config.enabled || false,
      mode: config.mode || 'mock',
      baseUrl: config.baseUrl || 'https://api.digilocker.gov.in',
      sandbox_url:
        config.sandbox_url || 'https://sandbox.digilocker.gov.in',
      timeout: config.timeout || 15000,
      credentials: config.credentials || {
        clientId: process.env.DIGILOCKER_CLIENT_ID,
        clientSecret: process.env.DIGILOCKER_CLIENT_SECRET,
        apiKey: process.env.DIGILOCKER_API_KEY,
      },
      ...config,
    };

    super('DigiLocker', mergedConfig);

    this.apiVersion = '1.0';
    this.supportedDocumentTypes = [
      'vaccination_certificate',
      'birth_certificate',
      'death_certificate',
      'marriage_certificate',
      'educational_certificate',
      'driving_license',
      'pan_card',
      'aadhaar',
    ];

    logger.info(`DigiLockerAdapter initialized (mode: ${this.mode})`);
  }

  /**
   * OAuth2 Authentication with DigiLocker
   */
  async authenticate() {
    if (this.mode === 'mock') {
      return this.mockAuthenticate();
    }

    try {
      const url = this.getAuthUrl();
      const response = await axios.post(
        `${url}/oauth/authorize`,
        {
          client_id: this.credentials.clientId,
          client_secret: this.credentials.clientSecret,
          grant_type: 'client_credentials',
        },
        { timeout: this.timeout }
      );

      if (response.data.access_token) {
        this.authToken = response.data.access_token;
        this.tokenExpiresAt = new Date(Date.now() + response.data.expires_in * 1000);

        logger.info('DigiLocker authentication successful');
        return {
          success: true,
          token: this.authToken,
          expiresAt: this.tokenExpiresAt,
        };
      }

      return {
        success: false,
        error: response.data.error_description || 'Authentication failed',
      };
    } catch (error) {
      logger.error(`DigiLocker authentication error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify authentication status
   */
  async verifyAuth() {
    if (this.mode === 'mock') {
      return { authenticated: true };
    }

    if (!this.authToken || !this.tokenExpiresAt) {
      return { authenticated: false };
    }

    if (new Date() > this.tokenExpiresAt) {
      const auth = await this.authenticate();
      return {
        authenticated: auth.success,
        expiresAt: this.tokenExpiresAt,
      };
    }

    return { authenticated: true, expiresAt: this.tokenExpiresAt };
  }

  /**
   * Retrieve documents for a patient from DigiLocker
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

        const url = `${this.getApiUrl()}/documents`;
        const response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${this.authToken}`,
            'X-API-Version': this.apiVersion,
          },
          params: {
            citizen_id: patientId,
            limit: options.limit || 100,
            offset: options.offset || 0,
          },
          timeout: this.timeout,
        });

        const validation = this.validateResponse(response.data);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        return {
          success: true,
          documents: (response.data.documents || []).map(doc =>
            this.mapDocumentToJeevaCare(doc)
          ),
          total: response.data.total || 0,
        };
      }, 'retrievePatientDocuments');
    } catch (error) {
      logger.error(`DigiLocker document retrieval error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        documents: [],
      };
    }
  }

  /**
   * Retrieve specific document
   */
  async retrieveDocument(documentId) {
    try {
      const auth = await this.verifyAuth();
      if (!auth.authenticated) {
        throw new Error('Authentication failed');
      }

      return await this.retryWithBackoff(async () => {
        if (this.mode === 'mock') {
          return this.mockRetrieveDocument(documentId);
        }

        const url = `${this.getApiUrl()}/documents/${documentId}`;
        const response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${this.authToken}`,
            'X-API-Version': this.apiVersion,
          },
          timeout: this.timeout,
          responseType: 'arraybuffer',
        });

        return {
          success: true,
          document: {
            id: documentId,
            content: response.data,
            mimeType: response.headers['content-type'] || 'application/pdf',
          },
        };
      }, 'retrieveDocument');
    } catch (error) {
      logger.error(`DigiLocker document retrieval error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Search documents (advanced filter)
   */
  async searchDocuments(query, options = {}) {
    try {
      if (this.mode === 'mock') {
        return this.mockSearchDocuments(query, options);
      }

      const auth = await this.verifyAuth();
      if (!auth.authenticated) {
        throw new Error('Authentication failed');
      }

      const url = `${this.getApiUrl()}/documents/search`;
      const response = await axios.post(
        url,
        {
          query: query,
          filters: options.filters || {},
          limit: options.limit || 50,
          offset: options.offset || 0,
        },
        {
          headers: {
            Authorization: `Bearer ${this.authToken}`,
            'X-API-Version': this.apiVersion,
          },
          timeout: this.timeout,
        }
      );

      const validation = this.validateResponse(response.data);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      return {
        success: true,
        results: (response.data.results || []).map(doc =>
          this.mapDocumentToJeevaCare(doc)
        ),
        total: response.data.total || 0,
      };
    } catch (error) {
      logger.error(`DigiLocker search error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        results: [],
        total: 0,
      };
    }
  }

  /**
   * Get citizen information from DigiLocker
   */
  async getPatientInfo(patientId) {
    try {
      if (this.mode === 'mock') {
        return this.mockGetPatientInfo(patientId);
      }

      const auth = await this.verifyAuth();
      if (!auth.authenticated) {
        throw new Error('Authentication failed');
      }

      const url = `${this.getApiUrl()}/citizens/${patientId}`;
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          'X-API-Version': this.apiVersion,
        },
        timeout: this.timeout,
      });

      const validation = this.validateResponse(response.data);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      return {
        success: true,
        patient: {
          id: response.data.citizen_id,
          name: response.data.name,
          dob: response.data.dob,
          email: response.data.email,
          phone: response.data.phone,
          aadhaarLinked: response.data.aadhaar_linked || false,
        },
      };
    } catch (error) {
      logger.error(`DigiLocker patient info retrieval error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Map DigiLocker data to JeevaCare format
   */
  async mapProviderDataToJeevaCare(providerData) {
    return {
      sourceProvider: 'DigiLocker',
      documents: (providerData.documents || []).map(doc =>
        this.mapDocumentToJeevaCare(doc)
      ),
      patient: providerData.patient ? {
        sourceId: providerData.patient.citizen_id,
        name: providerData.patient.name,
        dob: providerData.patient.dob,
      } : null,
      retrievedAt: new Date(),
    };
  }

  /**
   * Upload document to DigiLocker (if supported)
   */
  async uploadDocument(patientId, document) {
    if (this.mode === 'mock') {
      return {
        success: true,
        documentId: `digilocker-${Date.now()}`,
        message: 'Document upload simulated in mock mode',
      };
    }

    // DigiLocker typically doesn't support document upload
    // (it's for government-issued documents)
    return {
      success: false,
      error: 'DigiLocker does not support document uploads',
    };
  }

  /**
   * MOCK IMPLEMENTATIONS for development/testing
   */

  mockAuthenticate() {
    this.authToken = `mock-token-${Date.now()}`;
    this.tokenExpiresAt = new Date(Date.now() + 3600000);

    logger.info('DigiLocker mock authentication successful');
    return {
      success: true,
      token: this.authToken,
      expiresAt: this.tokenExpiresAt,
      note: 'Mock mode - simulated response',
    };
  }

  mockRetrieveDocuments(patientId, options = {}) {
    return {
      success: true,
      documents: [
        {
          id: 'cert-001',
          name: 'COVID-19 Vaccination Certificate',
          type: 'vaccination_certificate',
          date: new Date('2023-06-15'),
          facility: 'Government Health Center',
          mimeType: 'application/pdf',
          sourceProvider: 'DigiLocker',
        },
        {
          id: 'cert-002',
          name: 'Birth Certificate',
          type: 'birth_certificate',
          date: new Date('1995-03-20'),
          facility: 'Municipal Corporation',
          mimeType: 'application/pdf',
          sourceProvider: 'DigiLocker',
        },
      ],
      total: 2,
      note: 'Mock mode - simulated documents',
    };
  }

  mockRetrieveDocument(documentId) {
    return {
      success: true,
      document: {
        id: documentId,
        content: Buffer.from('Mock PDF content for document ' + documentId),
        mimeType: 'application/pdf',
        note: 'Mock mode - simulated content',
      },
    };
  }

  mockSearchDocuments(query, options = {}) {
    return {
      success: true,
      results: [
        {
          id: 'search-001',
          name: `Document matching "${query}"`,
          type: 'vaccination_certificate',
          date: new Date(),
          sourceProvider: 'DigiLocker',
        },
      ],
      total: 1,
      note: 'Mock mode - simulated search results',
    };
  }

  mockGetPatientInfo(patientId) {
    return {
      success: true,
      patient: {
        id: patientId,
        name: 'Demo Patient',
        dob: '1995-03-20',
        email: 'patient@example.com',
        phone: '+91-9999999999',
        aadhaarLinked: true,
        note: 'Mock mode - simulated patient info',
      },
    };
  }

  /**
   * HELPER METHODS
   */

  getApiUrl() {
    return this.mode === 'sandbox' ? this.sandbox_url : this.baseUrl;
  }

  getAuthUrl() {
    return this.mode === 'sandbox'
      ? this.sandbox_url
      : this.baseUrl.replace('/api', '');
  }

  /**
   * Get adapter status
   */
  async getStatus() {
    const baseStatus = await super.getStatus();

    return {
      ...baseStatus,
      supportedDocuments: this.supportedDocumentTypes,
      apiVersion: this.apiVersion,
    };
  }
}

export default new DigiLockerAdapter({
  enabled: process.env.DIGILOCKER_ENABLED === 'true',
  mode: process.env.DIGILOCKER_MODE || 'mock',
  baseUrl: process.env.DIGILOCKER_BASE_URL,
  sandbox_url: process.env.DIGILOCKER_SANDBOX_URL,
});

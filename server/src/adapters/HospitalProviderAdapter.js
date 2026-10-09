import HealthcareProviderAdapter from './HealthcareProviderAdapter.js';
import axios from 'axios';
import logger from '../utils/logger.js';

/**
 * HospitalProviderAdapter — Healthcare provider/hospital system integration
 *
 * Integrates with hospital EMR/HMIS systems:
 * - Patient records retrieval
 * - Clinical history access
 * - Laboratory results
 * - Radiology images
 * - Discharge summaries
 *
 * Supports:
 * - FHIR (HL7 FHIR) standard endpoints where available
 * - Hospital-specific APIs
 * - REST/XML endpoints
 *
 * Modes:
 * - 'live': Real hospital system (requires credentials)
 * - 'sandbox': Hospital sandbox/test environment
 * - 'mock': Simulated responses
 */
class HospitalProviderAdapter extends HealthcareProviderAdapter {
  constructor(config = {}) {
    const mergedConfig = {
      enabled: config.enabled || false,
      mode: config.mode || 'mock',
      baseUrl: config.baseUrl || 'https://hospital-api.example.com',
      timeout: config.timeout || 20000,
      credentials: config.credentials || {
        username: process.env.HOSPITAL_API_USERNAME,
        password: process.env.HOSPITAL_API_PASSWORD,
        apiKey: process.env.HOSPITAL_API_KEY,
      },
      fhirEnabled: config.fhirEnabled !== false,
      ...config,
    };

    super('HospitalProvider', mergedConfig);

    this.hospitalName = config.hospitalName || 'Generic Hospital';
    this.fhirBaseUrl = config.fhirBaseUrl || `${this.baseUrl}/fhir/r4`;
    this.supportedResourceTypes = [
      'Patient',
      'MedicationStatement',
      'Condition',
      'Procedure',
      'Observation',
      'DiagnosticReport',
      'DocumentReference',
    ];

    logger.info(
      `HospitalProviderAdapter initialized: ${this.hospitalName} (mode: ${this.mode})`
    );
  }

  /**
   * Basic HTTP authentication
   */
  async authenticate() {
    if (this.mode === 'mock') {
      return this.mockAuthenticate();
    }

    try {
      const auth = Buffer.from(
        `${this.credentials.username}:${this.credentials.password}`
      ).toString('base64');

      const response = await axios.get(`${this.baseUrl}/auth/verify`, {
        headers: {
          Authorization: `Basic ${auth}`,
          'X-API-Key': this.credentials.apiKey,
        },
        timeout: this.timeout,
      });

      if (response.status === 200) {
        this.sessionToken = response.data.token || auth;
        logger.info(`${this.hospitalName} authentication successful`);

        return {
          success: true,
          token: this.sessionToken,
        };
      }

      return {
        success: false,
        error: 'Authentication failed',
      };
    } catch (error) {
      logger.error(`${this.hospitalName} authentication error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify authentication
   */
  async verifyAuth() {
    if (this.mode === 'mock') {
      return { authenticated: true };
    }

    return {
      authenticated: !!this.sessionToken,
    };
  }

  /**
   * Retrieve FHIR Patient resource
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

        if (this.fhirEnabled) {
          return await this.retrieveFHIRDocuments(patientId, options);
        }

        // Fall back to custom API
        const url = `${this.baseUrl}/patients/${patientId}/documents`;
        const response = await axios.get(url, {
          headers: this.getAuthHeaders(),
          timeout: this.timeout,
        });

        return {
          success: true,
          documents: (response.data.documents || []).map(doc =>
            this.mapDocumentToJeevaCare(doc)
          ),
        };
      }, 'retrievePatientDocuments');
    } catch (error) {
      logger.error(
        `${this.hospitalName} document retrieval error: ${error.message}`
      );
      return {
        success: false,
        error: error.message,
        documents: [],
      };
    }
  }

  /**
   * Retrieve FHIR resources for patient
   */
  async retrieveFHIRDocuments(patientId, options = {}) {
    try {
      const documents = [];

      // Retrieve DocumentReference resources (documents)
      const docResponse = await axios.get(
        `${this.fhirBaseUrl}/DocumentReference?patient=${patientId}`,
        {
          headers: this.getAuthHeaders(),
          timeout: this.timeout,
        }
      );

      if (docResponse.data.entry) {
        docResponse.data.entry.forEach(entry => {
          documents.push(this.mapFHIRDocumentReference(entry.resource));
        });
      }

      // Retrieve DiagnosticReport (lab results, radiology)
      const diagResponse = await axios.get(
        `${this.fhirBaseUrl}/DiagnosticReport?subject=${patientId}`,
        {
          headers: this.getAuthHeaders(),
          timeout: this.timeout,
        }
      );

      if (diagResponse.data.entry) {
        diagResponse.data.entry.forEach(entry => {
          documents.push(this.mapFHIRDiagnosticReport(entry.resource));
        });
      }

      return {
        success: true,
        documents,
        source: 'FHIR',
      };
    } catch (error) {
      logger.error(`FHIR retrieval error: ${error.message}`);
      throw error;
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

        const url = `${this.baseUrl}/documents/${documentId}`;
        const response = await axios.get(url, {
          headers: this.getAuthHeaders(),
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
      logger.error(`${this.hospitalName} document error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Search documents
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

      const url = `${this.baseUrl}/documents/search`;
      const response = await axios.get(url, {
        headers: this.getAuthHeaders(),
        params: {
          q: query,
          limit: options.limit || 50,
        },
        timeout: this.timeout,
      });

      return {
        success: true,
        results: (response.data.results || []).map(doc =>
          this.mapDocumentToJeevaCare(doc)
        ),
        total: response.data.total || 0,
      };
    } catch (error) {
      logger.error(`${this.hospitalName} search error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        results: [],
      };
    }
  }

  /**
   * Get patient information
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

      // Try FHIR first
      if (this.fhirEnabled) {
        const fhirResponse = await axios.get(`${this.fhirBaseUrl}/Patient/${patientId}`, {
          headers: this.getAuthHeaders(),
          timeout: this.timeout,
        });

        if (fhirResponse.data) {
          return {
            success: true,
            patient: this.mapFHIRPatient(fhirResponse.data),
          };
        }
      }

      // Fall back to custom API
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
          email: response.data.email,
        },
      };
    } catch (error) {
      logger.error(`${this.hospitalName} patient info error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Upload document to hospital
   */
  async uploadDocument(patientId, document) {
    if (this.mode === 'mock') {
      return {
        success: true,
        documentId: `hospital-${Date.now()}`,
      };
    }

    try {
      const auth = await this.verifyAuth();
      if (!auth.authenticated) {
        throw new Error('Authentication failed');
      }

      const formData = new FormData();
      formData.append('file', document.content);
      formData.append('title', document.fileName);
      formData.append('type', document.documentType);

      const response = await axios.post(
        `${this.baseUrl}/patients/${patientId}/documents`,
        formData,
        {
          headers: {
            ...this.getAuthHeaders(),
            'Content-Type': 'multipart/form-data',
          },
          timeout: this.timeout,
        }
      );

      return {
        success: true,
        documentId: response.data.document_id,
      };
    } catch (error) {
      logger.error(`${this.hospitalName} upload error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Map FHIR DocumentReference to JeevaCare format
   */
  mapFHIRDocumentReference(resource) {
    return {
      id: resource.id,
      name: resource.description || 'Document',
      type: this.mapDocumentType(resource.type?.coding?.[0]?.display),
      date: resource.date || resource.created,
      content: resource.content?.[0]?.attachment?.data,
      mimeType: resource.content?.[0]?.attachment?.contentType,
      provider: resource.author?.[0]?.display,
    };
  }

  /**
   * Map FHIR DiagnosticReport to JeevaCare format
   */
  mapFHIRDiagnosticReport(resource) {
    return {
      id: resource.id,
      name: resource.code?.text || resource.code?.coding?.[0]?.display,
      type: this.mapDocumentType(resource.code?.coding?.[0]?.display),
      date: resource.issued,
      content: resource.presentedForm?.[0]?.data,
      mimeType: resource.presentedForm?.[0]?.contentType,
      provider: resource.performer?.[0]?.display,
      status: resource.status,
    };
  }

  /**
   * Map FHIR Patient to JeevaCare format
   */
  mapFHIRPatient(resource) {
    const name = resource.name?.[0];
    return {
      id: resource.id,
      name: name
        ? `${name.given?.join(' ')} ${name.family}`.trim()
        : 'Unknown',
      dob: resource.birthDate,
      email: resource.telecom?.find(t => t.system === 'email')?.value,
      phone: resource.telecom?.find(t => t.system === 'phone')?.value,
    };
  }

  /**
   * MOCK IMPLEMENTATIONS
   */

  mockAuthenticate() {
    this.sessionToken = `mock-token-${Date.now()}`;
    logger.info(`${this.hospitalName} mock authentication successful`);

    return {
      success: true,
      token: this.sessionToken,
      note: 'Mock mode - simulated response',
    };
  }

  mockRetrieveDocuments(patientId, options = {}) {
    return {
      success: true,
      documents: [
        {
          id: 'doc-001',
          name: 'Discharge Summary - 2024-01-15',
          type: 'discharge_summary',
          date: new Date('2024-01-15'),
          provider: 'Dr. Mock',
          sourceProvider: this.hospitalName,
        },
        {
          id: 'doc-002',
          name: 'Blood Test Report',
          type: 'lab_report',
          date: new Date('2024-02-10'),
          provider: 'Lab Department',
          sourceProvider: this.hospitalName,
        },
      ],
      note: 'Mock mode - simulated documents',
    };
  }

  mockRetrieveDocument(documentId) {
    return {
      success: true,
      document: {
        id: documentId,
        content: Buffer.from('Mock document content from ' + this.hospitalName),
        mimeType: 'application/pdf',
      },
    };
  }

  mockSearchDocuments(query, options = {}) {
    return {
      success: true,
      results: [
        {
          id: 'search-001',
          name: `Result for "${query}"`,
          type: 'lab_report',
          date: new Date(),
        },
      ],
      total: 1,
      note: 'Mock mode - simulated results',
    };
  }

  mockGetPatientInfo(patientId) {
    return {
      success: true,
      patient: {
        id: patientId,
        name: 'Mock Hospital Patient',
        dob: '1995-01-01',
        email: 'patient@hospital.com',
        phone: '+91-9876543210',
      },
    };
  }

  /**
   * HELPERS
   */

  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.sessionToken) {
      headers['Authorization'] = `Bearer ${this.sessionToken}`;
    }

    if (this.credentials.apiKey) {
      headers['X-API-Key'] = this.credentials.apiKey;
    }

    return headers;
  }

  async getStatus() {
    const baseStatus = await super.getStatus();

    return {
      ...baseStatus,
      hospitalName: this.hospitalName,
      fhirEnabled: this.fhirEnabled,
      supportedResources: this.supportedResourceTypes,
    };
  }
}

export default HospitalProviderAdapter;

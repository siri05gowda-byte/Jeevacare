import HealthcareProviderAdapter from './HealthcareProviderAdapter.js';
import axios from 'axios';
import logger from '../utils/logger.js';

/**
 * DiagnosticCenterAdapter — Radiology and diagnostic imaging integration
 *
 * Integrates with radiology/diagnostic centers:
 * - X-ray images and reports
 * - CT scans and reports
 * - MRI images and reports
 * - Ultrasound images and reports
 * - Mammography
 * - Other diagnostic images
 *
 * Handles DICOM standard where applicable
 */
class DiagnosticCenterAdapter extends HealthcareProviderAdapter {
  constructor(config = {}) {
    const mergedConfig = {
      enabled: config.enabled || false,
      mode: config.mode || 'mock',
      baseUrl: config.baseUrl || 'https://diag-api.example.com',
      timeout: config.timeout || 30000, // Imaging retrieval can be slow
      credentials: config.credentials || {
        centerId: process.env.DIAGNOSTIC_CENTER_ID,
        apiKey: process.env.DIAGNOSTIC_API_KEY,
      },
      dicomEnabled: config.dicomEnabled !== false,
      ...config,
    };

    super('DiagnosticCenter', mergedConfig);

    this.centerName = config.centerName || 'Diagnostic Center';
    this.supportedModalities = [
      'X-ray',
      'CT',
      'MRI',
      'Ultrasound',
      'Mammography',
      'Fluoroscopy',
      'Nuclear Medicine',
      'PET',
    ];
  }

  /**
   * Authenticate with diagnostic center
   */
  async authenticate() {
    if (this.mode === 'mock') {
      return this.mockAuthenticate();
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/auth`,
        {
          center_id: this.credentials.centerId,
          api_key: this.credentials.apiKey,
        },
        { timeout: this.timeout }
      );

      if (response.data.token) {
        this.centerToken = response.data.token;
        logger.info(`${this.centerName} authentication successful`);

        return {
          success: true,
          token: this.centerToken,
        };
      }

      return { success: false, error: 'Authentication failed' };
    } catch (error) {
      logger.error(`${this.centerName} auth error: ${error.message}`);
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

    return { authenticated: !!this.centerToken };
  }

  /**
   * Retrieve imaging studies for patient
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

        const url = `${this.baseUrl}/studies`;
        const response = await axios.get(url, {
          headers: this.getAuthHeaders(),
          params: {
            patient_id: patientId,
            include_reports: true,
            limit: options.limit || 50,
          },
          timeout: this.timeout,
        });

        return {
          success: true,
          documents: (response.data.studies || []).map(study =>
            this.mapStudyToJeevaCare(study)
          ),
        };
      }, 'retrievePatientDocuments');
    } catch (error) {
      logger.error(`${this.centerName} retrieval error: ${error.message}`);
      return { success: false, error: error.message, documents: [] };
    }
  }

  /**
   * Retrieve imaging study (may be DICOM or report)
   */
  async retrieveDocument(studyId) {
    try {
      if (this.mode === 'mock') {
        return this.mockRetrieveDocument(studyId);
      }

      const auth = await this.verifyAuth();
      if (!auth.authenticated) {
        throw new Error('Authentication failed');
      }

      // Retrieve study metadata and report
      const url = `${this.baseUrl}/studies/${studyId}`;
      const response = await axios.get(url, {
        headers: this.getAuthHeaders(),
        timeout: this.timeout,
      });

      // If DICOM available, retrieve it (compressed/streaming)
      let dicomData = null;
      if (this.dicomEnabled && response.data.has_dicom) {
        try {
          const dicomResponse = await axios.get(
            `${this.baseUrl}/studies/${studyId}/dicom`,
            {
              headers: this.getAuthHeaders(),
              responseType: 'arraybuffer',
              timeout: 60000, // DICOM can be large
            }
          );
          dicomData = dicomResponse.data;
        } catch (dicomError) {
          logger.warn(`DICOM retrieval failed for ${studyId}: ${dicomError.message}`);
          // Continue without DICOM data
        }
      }

      return {
        success: true,
        document: {
          id: studyId,
          studyId: studyId,
          report: response.data.report,
          reportFormat: response.data.report_format || 'pdf',
          dicomData: dicomData,
          metadata: {
            modality: response.data.modality,
            bodyPart: response.data.body_part,
            studyDate: response.data.study_date,
            radiologist: response.data.radiologist,
          },
          mimeType: 'application/pdf',
        },
      };
    } catch (error) {
      logger.error(`${this.centerName} document error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search for imaging studies
   */
  async searchDocuments(query, options = {}) {
    try {
      if (this.mode === 'mock') {
        return this.mockSearchDocuments(query, options);
      }

      const url = `${this.baseUrl}/studies/search`;
      const response = await axios.post(
        url,
        {
          query,
          filters: options.filters,
        },
        {
          headers: this.getAuthHeaders(),
          timeout: this.timeout,
        }
      );

      return {
        success: true,
        results: (response.data.results || []).map(study =>
          this.mapStudyToJeevaCare(study)
        ),
        total: response.data.total || 0,
      };
    } catch (error) {
      logger.error(`${this.centerName} search error: ${error.message}`);
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
          sex: response.data.sex,
        },
      };
    } catch (error) {
      logger.error(`${this.centerName} patient error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Upload imaging study (receive from external center)
   */
  async uploadDocument(patientId, document) {
    if (this.mode === 'mock') {
      return { success: true, documentId: `diag-${Date.now()}` };
    }

    try {
      const formData = new FormData();
      formData.append('patient_id', patientId);
      formData.append('modality', document.modality);
      formData.append('study_date', document.studyDate);
      if (document.dicom) formData.append('dicom_file', document.dicom);
      if (document.report) formData.append('report', document.report);

      const response = await axios.post(`${this.baseUrl}/studies`, formData, {
        headers: this.getAuthHeaders(),
        timeout: 60000,
      });

      return { success: true, documentId: response.data.study_id };
    } catch (error) {
      logger.error(`${this.centerName} upload error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Map imaging study to JeevaCare document format
   */
  mapStudyToJeevaCare(study) {
    return {
      id: study.study_id || study.id,
      name: `${study.modality} Study - ${study.body_part || 'Radiology'}`,
      type: 'radiology_report',
      date: study.study_date,
      sourceProvider: this.centerName,
      imaging: {
        modality: study.modality,
        bodyPart: study.body_part,
        studyDescription: study.description,
        radiologist: study.radiologist,
        findings: study.findings,
        impression: study.impression,
        status: study.status,
        hasDICOM: study.has_dicom || false,
      },
    };
  }

  /**
   * MOCK IMPLEMENTATIONS
   */

  mockAuthenticate() {
    this.centerToken = `mock-diag-token-${Date.now()}`;
    return { success: true, token: this.centerToken };
  }

  mockRetrieveDocuments(patientId, options = {}) {
    return {
      success: true,
      documents: [
        {
          id: 'study-001',
          name: 'Chest X-ray',
          type: 'radiology_report',
          date: new Date(),
          sourceProvider: this.centerName,
          imaging: {
            modality: 'X-ray',
            bodyPart: 'Chest',
            findings: 'No acute findings',
            status: 'completed',
          },
        },
        {
          id: 'study-002',
          name: 'CT Abdomen',
          type: 'radiology_report',
          date: new Date(),
          sourceProvider: this.centerName,
          imaging: {
            modality: 'CT',
            bodyPart: 'Abdomen',
            findings: 'Normal',
            status: 'completed',
          },
        },
      ],
    };
  }

  mockRetrieveDocument(studyId) {
    return {
      success: true,
      document: {
        id: studyId,
        report: 'Mock radiology report content',
        reportFormat: 'pdf',
        metadata: {
          modality: 'X-ray',
          bodyPart: 'Chest',
          radiologist: 'Dr. Radiologist',
        },
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
        name: 'Imaging Patient',
        dob: '1985-06-15',
        sex: 'M',
      },
    };
  }

  /**
   * HELPERS
   */

  getAuthHeaders() {
    return {
      Authorization: `Bearer ${this.centerToken || ''}`,
      'X-Center-ID': this.credentials.centerId,
    };
  }

  async getStatus() {
    const baseStatus = await super.getStatus();
    return {
      ...baseStatus,
      centerName: this.centerName,
      supportedModalities: this.supportedModalities,
      dicomEnabled: this.dicomEnabled,
    };
  }
}

export default new DiagnosticCenterAdapter({
  enabled: process.env.DIAGNOSTIC_CENTER_ENABLED === 'true',
  mode: process.env.DIAGNOSTIC_CENTER_MODE || 'mock',
  baseUrl: process.env.DIAGNOSTIC_CENTER_BASE_URL,
  centerName: process.env.DIAGNOSTIC_CENTER_NAME || 'Diagnostic Center',
  dicomEnabled: process.env.DIAGNOSTIC_DICOM_ENABLED !== 'false',
});

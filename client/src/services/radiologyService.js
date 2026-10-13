import api from './api';

/**
 * Radiology Service
 * Handles radiology report operations
 */

/**
 * Get all radiology records for a patient
 * @param {string} patientId - Patient ID
 * @param {Object} filters - Optional filters (modalityType, bodyPart, hasCriticalFindings, dateFrom, dateTo)
 * @returns {Promise<Array>} Array of radiology records
 */
export const getPatientRadiologyRecords = async (patientId, filters = {}) => {
  const response = await api.get(`/radiology/patient/${patientId}`, {
    params: filters,
  });
  return response.data.data;
};

/**
 * Get a single radiology record by ID
 * @param {string} radiologyId - Radiology record ID
 * @returns {Promise<Object>} Radiology record
 */
export const getRadiologyRecord = async (radiologyId) => {
  const response = await api.get(`/radiology/${radiologyId}`);
  return response.data.data;
};

/**
 * Upload a radiology report with file
 * @param {Object} data - Report data and file
 * @param {File} data.file - Report file (PDF/image)
 * @param {string} data.patientId - Patient ID
 * @param {string} data.hospitalId - Hospital ID
 * @param {string} data.studyDate - Study date (ISO8601)
 * @param {string} data.reportDate - Report date (ISO8601)
 * @param {string} data.modalityType - Modality type (x_ray|ct_scan|mri|ultrasound|pet_scan|dexa_scan|other)
 * @param {string} data.bodyPart - Body part
 * @param {string} [data.clinicalIndication] - Clinical indication (optional)
 * @param {string} [data.radiologistName] - Radiologist name (optional)
 * @param {string} [data.radiologistLicense] - Radiologist license (optional)
 * @param {string} [data.encounterId] - Encounter ID (optional)
 * @returns {Promise<Object>} Created radiology record
 */
export const uploadRadiologyReport = async (data) => {
  const formData = new FormData();
  
  // Append file
  formData.append('file', data.file);
  
  // Append required fields
  formData.append('patientId', data.patientId);
  formData.append('hospitalId', data.hospitalId);
  formData.append('studyDate', data.studyDate);
  formData.append('reportDate', data.reportDate);
  formData.append('modalityType', data.modalityType);
  formData.append('bodyPart', data.bodyPart);
  
  // Append optional fields if provided
  if (data.clinicalIndication) formData.append('clinicalIndication', data.clinicalIndication);
  if (data.radiologistName) formData.append('radiologistName', data.radiologistName);
  if (data.radiologistLicense) formData.append('radiologistLicense', data.radiologistLicense);
  if (data.encounterId) formData.append('encounterId', data.encounterId);

  // Use fetch to avoid axios Content-Type conflict with multipart boundary
  const response = await fetch(`${api.defaults.baseURL}/radiology/upload-report`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload radiology report');
  }

  const result = await response.json();
  return result.data;
};

/**
 * Get secure download URL for radiology report file
 * @param {string} radiologyId - Radiology record ID
 * @returns {Promise<Object>} Download URL and file metadata
 */
export const getRadiologyDownloadUrl = async (radiologyId) => {
  const response = await api.get(`/radiology/${radiologyId}/download`);
  return response.data.data;
};

/**
 * Download radiology report file
 * Opens file in new browser tab
 * @param {string} radiologyId - Radiology record ID
 * @returns {Promise<void>}
 */
export const downloadRadiologyReport = async (radiologyId) => {
  const downloadData = await getRadiologyDownloadUrl(radiologyId);
  window.open(downloadData.downloadUrl, '_blank');
};

/**
 * Create radiology record (metadata only, no file)
 * @param {Object} data - Radiology record data
 * @returns {Promise<Object>} Created radiology record
 */
export const createRadiologyRecord = async (data) => {
  const response = await api.post('/radiology', data);
  return response.data.data;
};

/**
 * Update/amend radiology record
 * @param {string} radiologyId - Radiology record ID
 * @param {Object} updateData - Fields to update
 * @param {string} updateData.reason - Reason for amendment (required)
 * @returns {Promise<Object>} Updated radiology record
 */
export const updateRadiologyRecord = async (radiologyId, updateData) => {
  const response = await api.put(`/radiology/${radiologyId}`, updateData);
  return response.data.data;
};

/**
 * Flag radiology record as critical
 * @param {string} radiologyId - Radiology record ID
 * @param {Object} data - Critical findings data
 * @param {string} data.findings - Critical findings description
 * @returns {Promise<Object>} Updated radiology record
 */
export const flagRadiologyAsCritical = async (radiologyId, data) => {
  const response = await api.patch(`/radiology/${radiologyId}/flag-critical`, data);
  return response.data.data;
};

/**
 * Extract text from radiology report using OCR
 * @param {string} radiologyId - Radiology record ID
 * @returns {Promise<Object>} Extracted text and confidence
 */
export const extractRadiologyText = async (radiologyId) => {
  const response = await api.post(`/radiology/${radiologyId}/extract-text`);
  return response.data;
};

/**
 * Generate AI explanation for radiology report
 * @param {string} radiologyId - Radiology record ID
 * @param {string} language - Target language (en, hi, kn, te, ta, ml)
 * @returns {Promise<Object>} AI-generated explanation
 */
export const explainRadiologyReport = async (radiologyId, language = 'en') => {
  const response = await api.post(`/radiology/${radiologyId}/explain`, { language });
  return response.data;
};

export default {
  getPatientRadiologyRecords,
  getRadiologyRecord,
  uploadRadiologyReport,
  getRadiologyDownloadUrl,
  downloadRadiologyReport,
  createRadiologyRecord,
  updateRadiologyRecord,
  flagRadiologyAsCritical,
  extractRadiologyText,
  explainRadiologyReport,
};

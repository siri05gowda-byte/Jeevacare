import api from './api';

export const documentService = {
  /**
   * Get all documents for a patient
   */
  getPatientDocuments: async (patientId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.status) params.append('status', filters.status);

    const queryString = params.toString();
    const url = `/documents/patient/${patientId}${queryString ? '?' + queryString : ''}`;
    
    try {
      const response = await api.get(url);
      return response;
    } catch (error) {
      console.error('Error fetching documents:', error);
      throw error;
    }
  },

  /**
   * Get a specific document
   */
  getDocument: async (documentId) => {
    try {
      const response = await api.get(`/documents/${documentId}`);
      return response;
    } catch (error) {
      console.error('Error fetching document:', error);
      throw error;
    }
  },

  /**
   * Get download URL for a document
   */
  getDownloadUrl: async (documentId) => {
    try {
      const response = await api.get(`/documents/${documentId}/download`);
      return response;
    } catch (error) {
      console.error('Error getting download URL:', error);
      throw error;
    }
  },

  /**
   * Upload a document
   */
  uploadDocument: async (file, metadata = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', metadata.type || metadata.documentType || 'other');
    if (metadata.patientId) formData.append('patientId', metadata.patientId);
    if (metadata.facilityId) formData.append('facilityId', metadata.facilityId);
    if (metadata.description) formData.append('description', metadata.description);
    if (metadata.title) formData.append('title', metadata.title);
    if (metadata.documentDate) formData.append('documentDate', metadata.documentDate);

    try {
      const response = await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  },

  /**
   * Delete a document
   */
  deleteDocument: async (documentId) => {
    try {
      const response = await api.delete(`/documents/${documentId}`);
      return response;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  },

  /**
   * Verify a document
   */
  verifyDocument: async (documentId, verificationData) => {
    try {
      const response = await api.post(`/documents/${documentId}/verify`, verificationData);
      return response;
    } catch (error) {
      console.error('Error verifying document:', error);
      throw error;
    }
  },

  /**
   * Trigger download by opening download URL in new tab
   */
  downloadDocument: async (documentId) => {
    try {
      const downloadData = await documentService.getDownloadUrl(documentId);
      
      if (downloadData.downloadUrl) {
        // Open in new tab/window
        window.open(downloadData.downloadUrl, '_blank', 'noopener,noreferrer');
        return true;
      }
      
      throw new Error('No download URL provided');
    } catch (error) {
      console.error('Error downloading document:', error);
      throw error;
    }
  },
};

/**
 * ClaraMed Platform Configuration
 * 
 * Configuration for the independent AI medical analysis platform.
 * ClaraMed handles medical document processing, OCR, chest X-ray inference,
 * and AI summarization.
 */

export const claraMedConfig = {
  /**
   * ClaraMed base URL
   * Set via VITE_CLARAMED_BASE_URL environment variable
   * Example: https://claramed.example.com
   */
  baseUrl: import.meta.env.VITE_CLARAMED_BASE_URL || null,

  /**
   * Check if ClaraMed is configured
   */
  isConfigured() {
    return !!this.baseUrl && this.baseUrl.trim() !== '';
  },

  /**
   * Get ClaraMed analysis URL for a radiology record
   * @param {string} radiologyId - JeevaCare radiology record ID
   * @param {string} patientId - JeevaCare patient ID
   * @returns {string} Full ClaraMed analysis URL
   */
  getAnalysisUrl(radiologyId, patientId) {
    if (!this.isConfigured()) {
      return null;
    }
    // Future: Will include auth token and callback URL
    return `${this.baseUrl}/analyze?record=${radiologyId}&patient=${patientId}`;
  },

  /**
   * Get configuration status message
   * @returns {string} User-friendly status message
   */
  getStatusMessage() {
    if (this.isConfigured()) {
      return `ClaraMed configured at: ${this.baseUrl}`;
    }
    return 'ClaraMed integration is not configured. Please contact your administrator.';
  }
};

export default claraMedConfig;

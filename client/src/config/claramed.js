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
   * Address of the ClaraMed website (its first tab is Radiology AI), or null when ClaraMed is not configured.
   * ClaraMed is a separate website; this is a plain link, so nothing about the user or a record is sent.
   * Read at call time (not cached) so tests and runtime config changes take effect.
   * Only https is accepted (http is allowed for localhost during development).
   * @returns {string|null}
   */
  getRadiologyAiUrl() {
    const base = (import.meta.env.VITE_CLARAMED_BASE_URL || '').trim().replace(/\/+$/, '');
    if (!base) return null;
    let parsed;
    try {
      parsed = new URL(base);
    } catch {
      return null;
    }
    const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLocalhost)) return null;
    return base;
  },

  /**
   * Kept for existing callers (RadiologyPage). ClaraMed no longer receives record or patient ids:
   * it is a separate service reached by a plain link, so this returns the same Radiology AI page URL.
   * @returns {string|null}
   */
  getAnalysisUrl() {
    return this.getRadiologyAiUrl();
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

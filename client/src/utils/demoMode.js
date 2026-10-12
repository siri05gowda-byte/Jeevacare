/**
 * Demo Mode Utility (Stub)
 * 
 * This module was removed due to hard-coded client-side secret.
 * These are safe stubs that always return false/empty values.
 * 
 * Demo mode should NOT be used for authorization or to bypass
 * backend authentication. Any demo/synthetic data should be
 * server-controlled with explicit database flags.
 */

/**
 * Check if demo mode is enabled
 * @returns {boolean} Always false - demo mode disabled
 */
export function isDemoModeEnabled() {
  // Demo mode functionality removed for security
  // Always returns false
  return false;
}

/**
 * Get demo badge label
 * @returns {string} Demo badge text
 */
export function getDemoBadgeLabel() {
  return '🔬 DEMO DATA - Not real patient records';
}

/**
 * Get demo data disclaimer
 * @returns {string} Demo disclaimer text
 */
export function getDemoDemoDataDisclaimer() {
  return 'This is demonstration data for testing and development purposes only. These are not real patient records.';
}

/**
 * Enable demo mode (disabled for security)
 * @returns {boolean} Always false
 */
export function enableDemoMode() {
  console.warn('Demo mode has been disabled for security reasons');
  return false;
}

/**
 * Disable demo mode
 */
export function disableDemoMode() {
  // No-op - demo mode always disabled
}

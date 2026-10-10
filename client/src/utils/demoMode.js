/**
 * Demo Mode Utility
 * 
 * Manages explicit demo/development mode for demonstration data.
 * Demo mode must be explicitly enabled and cannot be accidentally activated.
 * All demo data is prominently labeled.
 */

const DEMO_MODE_FLAG = '__JEEVACARE_DEMO_MODE_EXPLICIT__';
const DEMO_MODE_UNLOCK_KEY = 'jeevacare-demo-unlock-2026';

/**
 * Check if demo mode is explicitly enabled
 * @returns {boolean} True only if demo mode was explicitly activated
 */
export function isDemoModeEnabled() {
  try {
    // Check both sessionStorage (current session) and localStorage (persistent)
    const sessionDemoMode = sessionStorage.getItem(DEMO_MODE_FLAG);
    const localDemoMode = localStorage.getItem(DEMO_MODE_FLAG);
    
    // Return true only if explicitly set to 'true' (string comparison)
    return sessionDemoMode === 'true' || localDemoMode === 'true';
  } catch (e) {
    // If storage is unavailable, demo mode is OFF
    return false;
  }
}

/**
 * Explicitly enable demo mode (requires unlock key)
 * Intended only for development/staging environments
 * @param {string} unlockKey - Secret unlock key
 * @param {boolean} persistent - If true, demo mode persists across sessions
 * @returns {boolean} True if demo mode was successfully enabled
 */
export function enableDemoMode(unlockKey, persistent = false) {
  // Verify unlock key to prevent accidental activation
  if (unlockKey !== DEMO_MODE_UNLOCK_KEY) {
    console.warn('Demo mode unlock failed: invalid key');
    return false;
  }

  try {
    const storage = persistent ? localStorage : sessionStorage;
    storage.setItem(DEMO_MODE_FLAG, 'true');
    console.log('Demo mode enabled (explicit)');
    return true;
  } catch (e) {
    console.error('Failed to enable demo mode:', e);
    return false;
  }
}

/**
 * Explicitly disable demo mode
 */
export function disableDemoMode() {
  try {
    sessionStorage.removeItem(DEMO_MODE_FLAG);
    localStorage.removeItem(DEMO_MODE_FLAG);
    console.log('Demo mode disabled');
  } catch (e) {
    console.error('Failed to disable demo mode:', e);
  }
}

/**
 * Get demo mode unlock key (for authorized developers only)
 * Should not be exposed in production builds
 */
export function getDemoModeUnlockKey() {
  // Return key only in development/staging
  if (process.env.NODE_ENV !== 'production') {
    return DEMO_MODE_UNLOCK_KEY;
  }
  return null;
}

/**
 * Create demo data label badge
 * @returns {string} HTML-safe label text
 */
export function getDemoBadgeLabel() {
  return '🔬 DEMO DATA - Not real patient records';
}

/**
 * Create demo data disclaimer
 * @returns {string} User-facing disclaimer
 */
export function getDemoDemoDataDisclaimer() {
  return 'This is demonstration data for testing and development purposes only. These are not real patient records.';
}

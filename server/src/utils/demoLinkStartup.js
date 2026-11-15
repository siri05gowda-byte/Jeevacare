/**
 * Runs the demo doctor-patient linking when the server starts, right after the demo accounts are
 * bootstrapped. It is on by default and safe to repeat: patients that already have demo appointments
 * are skipped, and only the demo accounts are touched.
 *
 * DEMO_LINK_ON_STARTUP=false   switch it off
 * DEMO_LINK_ON_STARTUP=remove  take back everything it added (tagged "demo-seed:v1")
 */
export function resolveLinkMode(env = process.env) {
  if (env.NODE_ENV === 'test') return 'off';
  const value = (env.DEMO_LINK_ON_STARTUP || '').toLowerCase().trim();
  if (['false', '0', 'off', 'no'].includes(value)) return 'off';
  if (value === 'remove') return 'remove';
  return 'link';
}

export async function linkDemoDataOnStartup({ env = process.env, logger, run } = {}) {
  const mode = resolveLinkMode(env);
  if (mode === 'off') return;
  try {
    const runner = run || (await import('../scripts/linkDemoActivity.js')).linkDemoActivity;
    await runner({
      apply: true,
      remove: mode === 'remove',
      verbose: false,
      log: (message) => logger?.info?.(String(message).trim()),
    });
  } catch (error) {
    // Demo data is a nicety: it must never stop the server from starting.
    logger?.warn?.(`Demo doctor-patient linking skipped: ${error.message}`);
  }
}

export default linkDemoDataOnStartup;

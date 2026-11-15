import { describe, it, expect, vi } from 'vitest';
import { resolveLinkMode, linkDemoDataOnStartup } from './demoLinkStartup.js';

const logger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });

describe('resolveLinkMode', () => {
  it('links by default', () => {
    expect(resolveLinkMode({})).toBe('link');
    expect(resolveLinkMode({ DEMO_LINK_ON_STARTUP: 'true' })).toBe('link');
    expect(resolveLinkMode({ DEMO_LINK_ON_STARTUP: '' })).toBe('link');
  });

  it.each(['false', 'FALSE', '0', 'off', 'no', ' false '])('is switched off by %j', (value) => {
    expect(resolveLinkMode({ DEMO_LINK_ON_STARTUP: value })).toBe('off');
  });

  it('can remove what it added', () => {
    expect(resolveLinkMode({ DEMO_LINK_ON_STARTUP: 'remove' })).toBe('remove');
    expect(resolveLinkMode({ DEMO_LINK_ON_STARTUP: ' Remove ' })).toBe('remove');
  });

  it('never runs under test', () => {
    expect(resolveLinkMode({ NODE_ENV: 'test' })).toBe('off');
    expect(resolveLinkMode({ NODE_ENV: 'test', DEMO_LINK_ON_STARTUP: 'true' })).toBe('off');
  });
});

describe('linkDemoDataOnStartup', () => {
  it('applies the linking when the mode is link', async () => {
    const run = vi.fn(async () => {});
    await linkDemoDataOnStartup({ env: {}, logger: logger(), run });
    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0][0]).toMatchObject({ apply: true, remove: false });
  });

  it('removes when the mode is remove', async () => {
    const run = vi.fn(async () => {});
    await linkDemoDataOnStartup({ env: { DEMO_LINK_ON_STARTUP: 'remove' }, logger: logger(), run });
    expect(run.mock.calls[0][0]).toMatchObject({ apply: true, remove: true });
  });

  it('does nothing when switched off', async () => {
    const run = vi.fn(async () => {});
    await linkDemoDataOnStartup({ env: { DEMO_LINK_ON_STARTUP: 'false' }, logger: logger(), run });
    expect(run).not.toHaveBeenCalled();
  });

  it('never lets a failure stop the server from starting', async () => {
    const log = logger();
    const run = vi.fn(async () => {
      throw new Error('database went away');
    });
    await expect(linkDemoDataOnStartup({ env: {}, logger: log, run })).resolves.toBeUndefined();
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('database went away'));
  });

  it('sends the script output to the server log', async () => {
    const log = logger();
    const run = vi.fn(async ({ log: out }) => out('Wrote 33 doctor links and 75 appointments.'));
    await linkDemoDataOnStartup({ env: {}, logger: log, run });
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('Wrote 33 doctor links'));
  });
});

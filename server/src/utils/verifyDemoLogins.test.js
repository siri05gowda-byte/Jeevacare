import { describe, it, expect, vi } from 'vitest';
import { expectedDemoLogins, verifyDemoLogins } from './bootstrapDemoData.js';

const logger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });

describe('expectedDemoLogins', () => {
  it('lists every seeded account once', () => {
    const logins = expectedDemoLogins();
    expect(logins).toHaveLength(2 + 10 + 1 + 20);
    expect(new Set(logins.map((l) => l.email)).size).toBe(logins.length);
    expect(logins.find((l) => l.email === 'rajesh.kumar.pat@sanjivani.in').password).toBe('Patient@123');
    expect(logins.find((l) => l.email === 'swami.murti@jeevacare.in').password).toBe('SwamiMurti@123');
  });
});

describe('verifyDemoLogins', () => {
  const working = { status: 'active', comparePassword: async () => true };

  it('reports success when every account signs in', async () => {
    const log = logger();
    const result = await verifyDemoLogins({ findUser: async () => working, log });
    expect(result.failed).toEqual([]);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('names accounts that are missing, suspended or have the wrong password', async () => {
    const log = logger();
    const bad = {
      'asia.begum@sanjivani.in': null,
      'ansh.kumar@sanjivani.in': { status: 'suspended', comparePassword: async () => true },
      'siri.mn@aarogya.in': { status: 'active', comparePassword: async () => false },
    };
    const findUser = async (email) => (email in bad ? bad[email] : working);
    const result = await verifyDemoLogins({ findUser, log });
    expect(result.failed.sort()).toEqual(
      ['ansh.kumar@sanjivani.in', 'asia.begum@sanjivani.in', 'siri.mn@aarogya.in'].sort()
    );
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('asia.begum@sanjivani.in'));
  });
});

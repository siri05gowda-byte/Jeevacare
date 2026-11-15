// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCurrentUser = vi.hoisted(() => vi.fn());
vi.mock('../services/authService', () => ({ authService: { getCurrentUser } }));

import { useAuthStore } from './authStore';

const store = new Map();
const fakeStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const httpError = (status) => Object.assign(new Error(`HTTP ${status}`), { response: { status } });
const networkError = () => Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' });
const NO_WAIT = { retryDelaysMs: [0, 0] };

beforeEach(() => {
  vi.stubGlobal('localStorage', fakeStorage);
  store.clear();
  store.set('token', 'abc');
  store.set('refreshToken', 'def');
  getCurrentUser.mockReset();
  useAuthStore.setState({ user: null, token: 'abc', refreshToken: 'def', isInitialized: false, connectionError: false, error: null });
});

describe('authStore.initialize after a page refresh', () => {
  it('restores the user from a stored token', async () => {
    getCurrentUser.mockResolvedValue({ _id: 'u1', role: 'PATIENT' });
    await useAuthStore.getState().initialize(NO_WAIT);
    const s = useAuthStore.getState();
    expect(s.user).toMatchObject({ _id: 'u1' });
    expect(s.isInitialized).toBe(true);
    expect(s.connectionError).toBe(false);
  });

  it('signs out when the server says the token is invalid (401)', async () => {
    getCurrentUser.mockRejectedValue(httpError(401));
    await useAuthStore.getState().initialize(NO_WAIT);
    const s = useAuthStore.getState();
    expect(s.user).toBeNull();
    expect(s.token).toBeNull();
    expect(s.isInitialized).toBe(true);
    expect(store.has('token')).toBe(false);
    expect(store.has('refreshToken')).toBe(false);
    expect(getCurrentUser).toHaveBeenCalledTimes(1); // no pointless retries for a bad token
  });

  it('keeps the session and retries when the server is slow or waking up', async () => {
    getCurrentUser.mockRejectedValueOnce(networkError()).mockRejectedValueOnce(httpError(503)).mockResolvedValue({ _id: 'u1', role: 'PATIENT' });
    await useAuthStore.getState().initialize(NO_WAIT);
    const s = useAuthStore.getState();
    expect(getCurrentUser).toHaveBeenCalledTimes(3);
    expect(s.user).toMatchObject({ _id: 'u1' });
    expect(store.get('token')).toBe('abc');
  });

  it('does not sign the user out when the server stays unreachable', async () => {
    getCurrentUser.mockRejectedValue(networkError());
    await useAuthStore.getState().initialize(NO_WAIT);
    const s = useAuthStore.getState();
    expect(s.user).toBeNull();
    expect(s.token).toBe('abc'); // still signed in as far as storage is concerned
    expect(store.get('token')).toBe('abc');
    expect(store.get('refreshToken')).toBe('def');
    expect(s.connectionError).toBe(true);
    expect(s.isInitialized).toBe(true);
  });

  it('does nothing for visitors with no stored token', async () => {
    store.clear();
    useAuthStore.setState({ token: null, refreshToken: null });
    await useAuthStore.getState().initialize(NO_WAIT);
    expect(getCurrentUser).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isInitialized).toBe(true);
  });
});

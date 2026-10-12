import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';
import { authService } from '../services/authService';

describe('Auth Store - Registration and Error Mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      error: null,
    });
  });

  it('successfully registers patient and stores auth state', async () => {
    const mockResponse = {
      user: { id: 'u1', email: 'aarav@jeevacare.com', role: 'PATIENT' },
      tokens: { token: 'jwt-token-123', refreshToken: 'refresh-token-456' },
    };
    vi.spyOn(authService, 'register').mockResolvedValueOnce(mockResponse);

    const result = await useAuthStore.getState().register({
      email: 'aarav@jeevacare.com',
      password: 'Password123!',
      firstName: 'Aarav',
      lastName: 'Sharma',
      role: 'PATIENT',
    });

    expect(result).toEqual(mockResponse);
    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockResponse.user);
    expect(state.token).toBe('jwt-token-123');
    expect(state.refreshToken).toBe('refresh-token-456');
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('maps HTTP 429 rate limit error to a friendly message without raw Axios text', async () => {
    const error429 = new Error('Request failed with status code 429');
    error429.response = { status: 429, data: 'Too many requests from this IP' };
    vi.spyOn(authService, 'register').mockRejectedValueOnce(error429);

    await expect(
      useAuthStore.getState().register({ email: 'test@example.com' })
    ).rejects.toThrow();

    const state = useAuthStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).not.toBe('Request failed with status code 429');
    expect(state.error).toBe(
      'Too many registration attempts. Please wait a few moments and try again.'
    );
  });

  it('maps HTTP 409 conflict to a friendly duplicate account message', async () => {
    const error409 = new Error('Request failed with status code 409');
    error409.response = {
      status: 409,
      data: { error: { message: 'An account with this email address already exists. Please log in instead.' } },
    };
    vi.spyOn(authService, 'register').mockRejectedValueOnce(error409);

    await expect(
      useAuthStore.getState().register({ email: 'existing@example.com' })
    ).rejects.toThrow();

    const state = useAuthStore.getState();
    expect(state.error).toBe(
      'An account with this email address already exists. Please log in instead.'
    );
  });

  it('maps HTTP 403 role violation to safe user-friendly message', async () => {
    const error403 = new Error('Request failed with status code 403');
    error403.response = {
      status: 403,
      data: { error: { message: 'Self-registration for privileged roles is prohibited.' } },
    };
    vi.spyOn(authService, 'register').mockRejectedValueOnce(error403);

    await expect(
      useAuthStore.getState().register({ email: 'hacker@example.com', role: 'SYSTEM_ADMIN' })
    ).rejects.toThrow();

    const state = useAuthStore.getState();
    expect(state.error).toBe('Self-registration for privileged roles is prohibited.');
  });

  it('maps network failures (no response) to a friendly connection message', async () => {
    const networkError = new Error('Network Error');
    // network error has no response property
    vi.spyOn(authService, 'register').mockRejectedValueOnce(networkError);

    await expect(
      useAuthStore.getState().register({ email: 'offline@example.com' })
    ).rejects.toThrow();

    const state = useAuthStore.getState();
    expect(state.error).toBe(
      'Unable to connect to JeevaCare server. Please check your internet connection.'
    );
  });

  it('maps HTTP 500 server errors gracefully', async () => {
    const error500 = new Error('Request failed with status code 500');
    error500.response = { status: 500, data: {} };
    vi.spyOn(authService, 'register').mockRejectedValueOnce(error500);

    await expect(
      useAuthStore.getState().register({ email: 'servererror@example.com' })
    ).rejects.toThrow();

    const state = useAuthStore.getState();
    expect(state.error).toBe(
      'Registration service is temporarily unavailable. Please try again later.'
    );
  });

  it('clears errors and verifies role checking', () => {
    useAuthStore.setState({ error: 'Some prior error', user: { role: 'PATIENT' } });
    expect(useAuthStore.getState().error).toBe('Some prior error');

    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();

    expect(useAuthStore.getState().hasRole('PATIENT')).toBe(true);
    expect(useAuthStore.getState().hasRole('DOCTOR')).toBe(false);
  });
});

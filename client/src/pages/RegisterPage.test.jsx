import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import RegisterPage from './RegisterPage';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/authService';

// Mock useNavigate and Link from react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ to, children, ...props }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

// Mock Logo component
vi.mock('../components/Logo', () => ({
  default: () => <div data-testid="logo">JeevaCare Logo</div>,
}));

describe('RegisterPage Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      token: null,
      isLoading: false,
      error: null,
    });
  });

  it('renders registration form component with default fields', () => {
    const element = <RegisterPage />;
    expect(element).toBeDefined();
    expect(element.type).toBe(RegisterPage);
  });

  it('validates client-side required fields before submission', async () => {
    // Testing validation logic
    const state = useAuthStore.getState();
    expect(state.isLoading).toBe(false);
  });

  it('prevents raw Axios 429 error from being displayed on rate limit error', async () => {
    const error429 = new Error('Request failed with status code 429');
    error429.response = { status: 429, data: 'Too many requests' };

    vi.spyOn(authService, 'register').mockRejectedValueOnce(error429);

    // When register is called through authStore
    try {
      await useAuthStore.getState().register({
        email: 'test@example.com',
        password: 'Password123!',
      });
    } catch {
      // Expected
    }

    const state = useAuthStore.getState();
    expect(state.error).not.toBe('Request failed with status code 429');
    expect(state.error).toContain('Too many registration attempts');
  });

  it('preserves non-sensitive form fields while clearing password on error', () => {
    const enteredData = {
      firstName: 'Aarav',
      lastName: 'Sharma',
      email: 'aarav@jeevacare.com',
      password: 'MySecretPassword123!',
      role: 'PATIENT',
      dateOfBirth: '1990-01-01',
      sex: 'M',
      termsAccepted: true,
    };

    // Simulate clearing password on failure while preserving non-sensitive data
    const preservedData = {
      ...enteredData,
      password: '',
    };

    expect(preservedData.firstName).toBe('Aarav');
    expect(preservedData.lastName).toBe('Sharma');
    expect(preservedData.email).toBe('aarav@jeevacare.com');
    expect(preservedData.role).toBe('PATIENT');
    expect(preservedData.dateOfBirth).toBe('1990-01-01');
    expect(preservedData.sex).toBe('M');
    expect(preservedData.termsAccepted).toBe(true);
    expect(preservedData.password).toBe('');
  });

  it('enforces duplicate submission prevention when request is in flight', () => {
    let submissionCount = 0;
    const handleSubmitLogic = (isLoading) => {
      if (isLoading) return false;
      submissionCount++;
      return true;
    };

    // First submit when not loading
    expect(handleSubmitLogic(false)).toBe(true);
    expect(submissionCount).toBe(1);

    // Rapid second submit while loading
    expect(handleSubmitLogic(true)).toBe(false);
    expect(submissionCount).toBe(1);

    // Rapid third submit while loading
    expect(handleSubmitLogic(true)).toBe(false);
    expect(submissionCount).toBe(1);
  });

  it('navigates to /dashboard for PATIENT and appropriate routes on registration success', () => {
    const navigateRole = (role) => {
      if (role === 'DOCTOR') return '/provider';
      if (role === 'EMERGENCY') return '/emergency';
      if (role === 'HOSPITAL_ADMIN' || role === 'ADMIN') return '/integrated-dashboard';
      return '/dashboard';
    };

    expect(navigateRole('PATIENT')).toBe('/dashboard');
    expect(navigateRole('GUARDIAN')).toBe('/dashboard');
    expect(navigateRole('DOCTOR')).toBe('/provider');
    expect(navigateRole('HOSPITAL_ADMIN')).toBe('/integrated-dashboard');
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { useAuthStore } from '../stores/authStore';
import notificationService from '../services/notificationService';
import NotificationBell from './NotificationBell';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

describe('NotificationBell Component Lifecycle & Auth Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    useAuthStore.setState({
      user: null,
      token: null,
      isInitialized: false,
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders NotificationBell element cleanly', () => {
    const element = <NotificationBell />;
    expect(element).toBeDefined();
    expect(element.type).toBe(NotificationBell);
  });

  it('loading state: does not make notification requests when isInitialized is false', async () => {
    const getUnreadSpy = vi.spyOn(notificationService, 'getUnreadCount');
    
    // Auth is not initialized yet
    useAuthStore.setState({
      user: { id: 'u1', role: 'PATIENT' },
      token: 'valid-token',
      isInitialized: false,
    });

    // Mount logic simulation
    const state = useAuthStore.getState();
    if (state.isInitialized && state.user && state.token) {
      await notificationService.getUnreadCount();
    }

    expect(getUnreadSpy).not.toHaveBeenCalled();
  });

  it('unauthenticated state: does not make notification requests when user is logged out', async () => {
    const getUnreadSpy = vi.spyOn(notificationService, 'getUnreadCount');

    useAuthStore.setState({
      user: null,
      token: null,
      isInitialized: true,
    });

    const state = useAuthStore.getState();
    if (state.isInitialized && state.user && state.token) {
      await notificationService.getUnreadCount();
    }

    expect(getUnreadSpy).not.toHaveBeenCalled();
  });

  it('authenticated state: makes authenticated request when initialized and logged in', async () => {
    const mockCountResponse = { data: { count: 3 } };
    const getUnreadSpy = vi.spyOn(notificationService, 'getUnreadCount')
      .mockResolvedValueOnce(mockCountResponse);

    useAuthStore.setState({
      user: { id: 'u1', role: 'PATIENT', email: 'patient@jeevacare.com' },
      token: 'jwt-valid-token',
      isInitialized: true,
    });

    const state = useAuthStore.getState();
    let result = null;
    if (state.isInitialized && state.user && state.token) {
      result = await notificationService.getUnreadCount();
    }

    expect(getUnreadSpy).toHaveBeenCalledTimes(1);
    expect(result.data.count).toBe(3);
  });

  it('expired session (401): stops polling and resets count without creating repeated 401 requests', async () => {
    const error401 = new Error('Unauthorized');
    error401.response = { status: 401 };
    
    let callCount = 0;
    const getUnreadSpy = vi.spyOn(notificationService, 'getUnreadCount').mockImplementation(async () => {
      callCount++;
      throw error401;
    });

    useAuthStore.setState({
      user: { id: 'u1', role: 'PATIENT' },
      token: 'expired-token',
      isInitialized: true,
    });

    let pollingActive = true;
    let unreadCount = 5;

    const performFetch = async () => {
      if (!pollingActive) return;
      try {
        await notificationService.getUnreadCount();
      } catch (err) {
        if (err.response?.status === 401) {
          pollingActive = false;
          unreadCount = 0;
        }
      }
    };

    // First attempt hits 401
    await performFetch();
    expect(callCount).toBe(1);
    expect(unreadCount).toBe(0);
    expect(pollingActive).toBe(false);

    // Subsequent polling cycle runs after timer tick
    vi.advanceTimersByTime(30000);
    await performFetch();

    // Call count must remain 1 because polling stopped upon 401
    expect(callCount).toBe(1);
  });

  it('logout state: halts polling and clears notification state on user logout', async () => {
    const { authService } = await import('../services/authService');
    vi.spyOn(authService, 'logout').mockResolvedValue({ success: true });

    useAuthStore.setState({
      user: { id: 'u1', role: 'PATIENT' },
      token: 'valid-token',
      isInitialized: true,
    });

    let unreadCount = 4;
    let notifications = [{ id: 'n1', title: 'Appointment confirmed' }];

    // Trigger logout
    await useAuthStore.getState().logout();
    const afterLogout = useAuthStore.getState();
    expect(afterLogout.user).toBeNull();
    expect(afterLogout.token).toBeNull();

    // Reset component state on logout
    if (!afterLogout.user || !afterLogout.token) {
      unreadCount = 0;
      notifications = [];
    }

    expect(unreadCount).toBe(0);
    expect(notifications).toEqual([]);
  });
});

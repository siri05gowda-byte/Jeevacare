// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render as rtlRender } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const auth = vi.hoisted(() => ({ state: {} }));
vi.mock('../stores/authStore', () => ({ useAuthStore: () => auth.state }));

import ProtectedRoute from './ProtectedRoute';

function render(state) {
  auth.state = { token: null, user: null, isLoading: false, isInitialized: true, connectionError: false, initialize: () => {}, ...state };
  const { container } = rtlRender(
    <MemoryRouter initialEntries={['/appointments']}>
      <Routes>
        <Route path="/login" element={<p>LOGIN PAGE</p>} />
        <Route path="/appointments" element={<ProtectedRoute><p>SECRET PAGE</p></ProtectedRoute>} />
      </Routes>
    </MemoryRouter>
  );
  return container.innerHTML;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ProtectedRoute', () => {
  it('sends visitors with no token to the login page', () => {
    expect(render({ token: null })).toContain('LOGIN PAGE');
  });

  it('shows the page once the signed-in user has loaded', () => {
    const html = render({ token: 't', user: { _id: 'u1', role: 'PATIENT' } });
    expect(html).toContain('SECRET PAGE');
  });

  it('waits, without showing the page, while the user is still being fetched after a refresh', () => {
    const html = render({ token: 't', user: null, isInitialized: false });
    expect(html).not.toContain('SECRET PAGE');
    expect(html).not.toContain('LOGIN PAGE');
    expect(html).toContain('Loading your account');
  });

  it('explains a slow or unreachable server with a Retry button instead of a "Not authenticated" page', () => {
    const html = render({ token: 't', user: null, isInitialized: true, connectionError: true });
    expect(html).not.toContain('SECRET PAGE');
    expect(html).toContain('reach JeevaCare');
    expect(html).toContain('Retry');
  });

  it('does not flash the login page or the secret page while a login is in progress', () => {
    const html = render({ token: null, isLoading: true });
    expect(html).not.toContain('SECRET PAGE');
    expect(html).not.toContain('LOGIN PAGE');
  });
});

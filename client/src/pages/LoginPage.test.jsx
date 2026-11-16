import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../stores/authStore', () => ({
  useAuthStore: () => ({ login: vi.fn(), isLoading: false, error: null, clearError: vi.fn() }),
}));
vi.mock('../services/api', () => ({ default: { get: vi.fn(() => Promise.resolve({})) } }));

import LoginPage from './LoginPage';

const html = renderToStaticMarkup(
  <MemoryRouter>
    <LoginPage />
  </MemoryRouter>
);

describe('LoginPage', () => {
  it('still offers the sign-in form and a link to register', () => {
    expect(html).toContain('type="password"');
    expect(html.toLowerCase()).toContain('email');
    expect(html).toContain('Register here');
  });

  it('does not advertise demo accounts or passwords to visitors', () => {
    expect(html).not.toMatch(/demo accounts/i);
    expect(html).not.toContain('DemoPassword123');
    expect(html).not.toMatch(/@demo\.com/i);
    expect(html).not.toMatch(/Password:<\/strong>/);
  });
});

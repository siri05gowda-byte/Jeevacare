import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from './Sidebar';

// renderToStaticMarkup reads a zustand store's INITIAL state, so the signed-in user is supplied through a mock.
const session = vi.hoisted(() => ({ user: null }));
vi.mock('../stores/authStore', () => ({ useAuthStore: () => ({ user: session.user }) }));

const BASE = 'https://claramed.streamlit.app';

function render(role) {
  session.user = { role, profile: { firstName: 'A', lastName: 'B' } };
  return renderToStaticMarkup(
    <MemoryRouter>
      <Sidebar isOpen onClose={() => {}} />
    </MemoryRouter>
  );
}

afterEach(() => vi.unstubAllEnvs());

describe('Sidebar Radiology AI link', () => {
  it.each(['PATIENT', 'DOCTOR', 'RADIOLOGY_TECHNICIAN'])('opens ClaraMed in a new tab for %s', (role) => {
    vi.stubEnv('VITE_CLARAMED_BASE_URL', BASE);
    const html = render(role);
    expect(html).toContain('Radiology AI');
    expect(html).toContain(`href="${BASE}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('is hidden when ClaraMed is not configured', () => {
    vi.stubEnv('VITE_CLARAMED_BASE_URL', '');
    expect(render('PATIENT')).not.toContain('Radiology AI');
  });

  it('is hidden for roles without radiology access', () => {
    vi.stubEnv('VITE_CLARAMED_BASE_URL', BASE);
    expect(render('HOSPITAL_ADMIN')).not.toContain('Radiology AI');
    expect(render('SYSTEM_ADMIN')).not.toContain('Radiology AI');
  });

  it('keeps the existing in-app Radiology & Imaging page for patients', () => {
    vi.stubEnv('VITE_CLARAMED_BASE_URL', BASE);
    expect(render('PATIENT')).toContain('href="/radiology"');
  });
});

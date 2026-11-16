// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

const state = vi.hoisted(() => ({ user: null }));
vi.mock('../stores/authStore', () => ({ useAuthStore: () => ({ user: state.user }) }));
vi.mock('../config/claramed', () => ({ claraMedConfig: { getRadiologyAiUrl: () => null } }));

import Sidebar from './Sidebar';

const render = (user) => {
  state.user = user;
  return renderToStaticMarkup(
    <MemoryRouter>
      <Sidebar isOpen onClose={() => {}} />
    </MemoryRouter>
  );
};

describe('Register as Staff menu item', () => {
  it('shows for a doctor who is not verified yet', () => {
    expect(render({ role: 'DOCTOR', verificationStatus: 'pending', profile: {} })).toContain('Register as Staff');
  });

  it('goes away once a hospital has verified the doctor', () => {
    expect(render({ role: 'DOCTOR', verificationStatus: 'verified', profile: {} })).not.toContain('Register as Staff');
  });

  it('goes away for verified lab and radiology staff too', () => {
    expect(render({ role: 'RADIOLOGY_TECHNICIAN', verificationStatus: 'verified', profile: {} })).not.toContain(
      'Register as Staff'
    );
  });
});

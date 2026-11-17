// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const state = vi.hoisted(() => ({ role: null }));
vi.mock('../stores/authStore', () => ({
  useAuthStore: (select) => select({ user: state.role ? { role: state.role } : null }),
}));

import RoleRoute from './RoleRoute';
import { homeFor } from '../utils/roleHome';

afterEach(cleanup);

const renderAt = (role, roles) => {
  state.role = role;
  return render(
    <MemoryRouter initialEntries={['/provider']}>
      <Routes>
        <Route path="/provider" element={<RoleRoute roles={roles}><p>doctor workspace</p></RoleRoute>} />
        <Route path="/hospital/dashboard" element={<p>admin home</p>} />
        <Route path="/dashboard" element={<p>patient home</p>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('RoleRoute', () => {
  it('lets a listed role in', () => {
    renderAt('DOCTOR', ['DOCTOR']);
    expect(screen.getByText('doctor workspace')).toBeTruthy();
  });

  it('sends a hospital admin who wanders onto the doctor workspace to their own dashboard', () => {
    renderAt('HOSPITAL_ADMIN', ['DOCTOR']);
    expect(screen.queryByText('doctor workspace')).toBeNull();
    expect(screen.getByText('admin home')).toBeTruthy();
  });

  it('sends a patient to the patient home', () => {
    renderAt('PATIENT', ['DOCTOR']);
    expect(screen.getByText('patient home')).toBeTruthy();
  });
});

describe('homeFor', () => {
  it('gives each account its own home', () => {
    expect(homeFor('DOCTOR')).toBe('/provider');
    expect(homeFor('HOSPITAL_ADMIN')).toBe('/hospital/dashboard');
    expect(homeFor('SYSTEM_ADMIN')).toBe('/integrated-dashboard');
    expect(homeFor('PATIENT')).toBe('/dashboard');
    expect(homeFor(undefined)).toBe('/dashboard');
  });
});

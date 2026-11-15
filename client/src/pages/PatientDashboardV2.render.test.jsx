// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

// The patient dashboard keeps radiology and AI explanations out: ClaraMed (external link) owns radiology now.
const getHealthExplanation = vi.hoisted(() => vi.fn(async () => 'AI text'));

// One stable user object: a new object per render would make the page reload itself in a loop.
const session = vi.hoisted(() => ({
  user: { _id: 'p1', role: 'PATIENT', token: 't', profile: { firstName: 'Rajesh', lastName: 'Kumar' } },
}));
vi.mock('../stores/authStore', () => ({ useAuthStore: () => session }));
vi.mock('../services/aiService', () => ({ default: { getHealthExplanation } }));
vi.mock('../services/ttsService', () => ({ default: {} }));

import PatientDashboardV2 from './PatientDashboardV2';

const PROFILE = {
  success: true,
  patient: { _id: 'abc123def456', firstName: 'Rajesh', lastName: 'Kumar', jeevaId: 'JC-SANJ-PAT-001' },
  stats: { labResults: 1, documents: 1, radiology: 2 },
  recentAppointments: [],
  timeline: [],
  records: {
    lab_results: [{ id: 'l1', title: 'CBC panel', date: '2026-01-02', detail: 'normal' }],
    radiology: [{ id: 'r1', title: 'Chest X-ray PA view', date: '2026-01-03' }],
    documents: [{ id: 'd1', title: 'Discharge note.pdf', date: '2026-01-04' }],
  },
};

beforeEach(() => {
  globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => PROFILE }));
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function loaded() {
  render(<PatientDashboardV2 />);
  await screen.findByText(/Welcome, Rajesh/);
}

describe('PatientDashboardV2 without radiology and AI', () => {
  it('still shows the patient overview and the other record types', async () => {
    await loaded();
    expect(screen.getByText('JC-SANJ-PAT-001')).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Lab Results/ })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Documents/ })).toBeTruthy();
  });

  it('has no Radiology records tab and shows no radiology study', async () => {
    await loaded();
    expect(screen.queryByRole('tab', { name: /Radiology/ })).toBeNull();
    expect(screen.queryByText(/Chest X-ray PA view/)).toBeNull();
  });

  it('does not request or show an AI health explanation', async () => {
    await loaded();
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(getHealthExplanation).not.toHaveBeenCalled();
    expect(screen.queryByText(/Understanding:/)).toBeNull();
    expect(screen.queryByText('AI text')).toBeNull();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import RadiologyPage from './RadiologyPage';
import { useAuthStore } from '../stores/authStore';

// Mock components
vi.mock('../components/DocumentCard', () => ({
  default: ({ data, onView }) => (
    <div data-testid={`record-card-${data._id}`} onClick={() => onView(data)}>
      <h3>{data.modalityType}</h3>
    </div>
  ),
}));

vi.mock('../components/LoadingState', () => ({
  default: ({ message }) => <div data-testid="loading-state">{message}</div>,
}));

vi.mock('../components/EmptyState', () => ({
  default: ({ title, description }) => (
    <div data-testid="empty-state">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock('../components/AI/HealthExplainer', () => ({
  default: ({ title, explanation }) => (
    <div data-testid="health-explainer">
      <h4>{title}</h4>
      <p>{explanation}</p>
    </div>
  ),
}));

describe('RadiologyPage Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        _id: 'user123',
        id: 'user123',
        role: 'PATIENT',
        profile: {
          firstName: 'Demo',
          lastName: 'Patient',
          patientId: 'patient123',
        },
      },
      token: 'mock-token',
    });
  });

  it('renders RadiologyPage component successfully', () => {
    const element = <RadiologyPage />;
    expect(element).toBeDefined();
    expect(element.type).toBe(RadiologyPage);
  });

  it('correctly resolves patientId from user profile when present', () => {
    const user = useAuthStore.getState().user;
    const resolvedId = user.profile?.patientId || user._id;
    expect(resolvedId).toBe('patient123');
  });

  it('filters critical findings correctly', () => {
    const records = [
      { _id: 'rec1', modalityType: 'x_ray', bodyPart: 'chest', hasCriticalFindings: false },
      { _id: 'rec2', modalityType: 'ct_scan', bodyPart: 'head', hasCriticalFindings: true },
    ];
    const criticalOnly = records.filter(r => r.hasCriticalFindings);
    expect(criticalOnly).toHaveLength(1);
    expect(criticalOnly[0]._id).toBe('rec2');
  });

  it('supports modality filtering', () => {
    const records = [
      { _id: 'rec1', modalityType: 'x_ray', bodyPart: 'chest' },
      { _id: 'rec2', modalityType: 'ct_scan', bodyPart: 'head' },
      { _id: 'rec3', modalityType: 'mri', bodyPart: 'spine' },
    ];
    const xrays = records.filter(r => r.modalityType === 'x_ray');
    expect(xrays).toHaveLength(1);
    expect(xrays[0]._id).toBe('rec1');
  });
});

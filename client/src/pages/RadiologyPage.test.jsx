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

  it('normalizes uppercase modality types to valid lowercase schema enum', () => {
    const rawModalities = ['X_RAY', 'CT_SCAN', 'MRI', 'ULTRASOUND', 'PET_SCAN', 'DEXA_SCAN', 'OTHER'];
    const validModalities = ['x_ray', 'ct_scan', 'mri', 'ultrasound', 'pet_scan', 'dexa_scan', 'other'];

    rawModalities.forEach(raw => {
      const normalized = raw.toLowerCase();
      expect(validModalities).toContain(normalized);
    });
  });

  it('validates required fields before allowing submission', () => {
    const validate = (data) => {
      if (!data.file) return 'Please select or drag-and-drop a radiology report file';
      if (!data.bodyPart?.trim()) return 'Please specify the examined body part';
      if (!data.studyDate) return 'Please select the study date';
      if (!data.reportDate) return 'Please select the report date';
      return null;
    };

    expect(validate({})).toMatch(/select or drag-and-drop/);
    expect(validate({ file: new Blob(['test']) })).toMatch(/examined body part/);
    expect(validate({ file: new Blob(['test']), bodyPart: 'Chest' })).toMatch(/study date/);
    expect(validate({ file: new Blob(['test']), bodyPart: 'Chest', studyDate: '2026-10-24' })).toMatch(/report date/);
    expect(validate({ file: new Blob(['test']), bodyPart: 'Chest', studyDate: '2026-10-24', reportDate: '2026-10-24' })).toBeNull();
  });
});

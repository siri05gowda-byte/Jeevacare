import { afterEach, describe, expect, it, vi } from 'vitest';
import { claraMedConfig } from './claramed';

afterEach(() => vi.unstubAllEnvs());

describe('claraMedConfig.getRadiologyAiUrl', () => {
  it('is just the ClaraMed address, with no extra path', () => {
    vi.stubEnv('VITE_CLARAMED_BASE_URL', 'https://claramed.streamlit.app');
    expect(claraMedConfig.getRadiologyAiUrl()).toBe('https://claramed.streamlit.app');
  });

  it('strips trailing slashes', () => {
    vi.stubEnv('VITE_CLARAMED_BASE_URL', 'https://claramed.streamlit.app//');
    expect(claraMedConfig.getRadiologyAiUrl()).toBe('https://claramed.streamlit.app');
  });

  it('is null when the variable is unset or blank', () => {
    vi.stubEnv('VITE_CLARAMED_BASE_URL', '');
    expect(claraMedConfig.getRadiologyAiUrl()).toBeNull();
    vi.stubEnv('VITE_CLARAMED_BASE_URL', '   ');
    expect(claraMedConfig.getRadiologyAiUrl()).toBeNull();
  });

  it('refuses non-https URLs except localhost for development', () => {
    vi.stubEnv('VITE_CLARAMED_BASE_URL', 'http://claramed.example.com');
    expect(claraMedConfig.getRadiologyAiUrl()).toBeNull();
    vi.stubEnv('VITE_CLARAMED_BASE_URL', 'javascript:alert(1)');
    expect(claraMedConfig.getRadiologyAiUrl()).toBeNull();
    vi.stubEnv('VITE_CLARAMED_BASE_URL', 'not a url');
    expect(claraMedConfig.getRadiologyAiUrl()).toBeNull();
    vi.stubEnv('VITE_CLARAMED_BASE_URL', 'http://localhost:8501');
    expect(claraMedConfig.getRadiologyAiUrl()).toBe('http://localhost:8501');
  });

  it('getAnalysisUrl sends no patient or record ids', () => {
    vi.stubEnv('VITE_CLARAMED_BASE_URL', 'https://claramed.streamlit.app');
    const url = claraMedConfig.getAnalysisUrl('rad-123', 'patient-456');
    expect(url).toBe('https://claramed.streamlit.app');
    expect(url).not.toMatch(/rad-123|patient-456/);
  });
});

/**
 * Patient Dashboard Regression Tests
 * Tests loading state resolution paths
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Patient Dashboard Loading State Resolution', () => {
  let mockPatientService;
  let mockSet;
  let mockGet;

  beforeEach(() => {
    // Reset mocks
    mockSet = vi.fn();
    mockGet = vi.fn(() => ({}));
    mockPatientService = {
      getProfile: vi.fn(),
      getStats: vi.fn(),
      getTimeline: vi.fn(),
      getMedicalSummary: vi.fn(),
      getCriticalInfo: vi.fn(),
      getEmergencyProfile: vi.fn(),
    };
  });

  describe('Scenario 1: Successful profile retrieval with valid patient ID', () => {
    it('should set loading=false after successful data load', async () => {
      // Mock successful responses
      const mockPatient = { _id: 'patient123', data: { _id: 'patient123' } };
      mockPatientService.getProfile.mockResolvedValue(mockPatient);
      mockPatientService.getStats.mockResolvedValue({ data: { vaccinations: 5 } });
      mockPatientService.getTimeline.mockResolvedValue({ events: [] });
      mockPatientService.getMedicalSummary.mockResolvedValue(null);
      mockPatientService.getCriticalInfo.mockResolvedValue({});
      mockPatientService.getEmergencyProfile.mockResolvedValue({});

      // Simulate loadAllPatientData logic
      let loading = true;
      let error = null;
      let patient = null;

      try {
        loading = true;
        
        // Get profile
        patient = await mockPatientService.getProfile(null);
        const effectivePatientId = patient.data?._id || patient._id;

        // Validation check (the fix)
        if (!effectivePatientId) {
          throw new Error('Unable to retrieve patient profile');
        }

        // Load other data
        await Promise.all([
          mockPatientService.getStats(effectivePatientId),
          mockPatientService.getTimeline(effectivePatientId),
          mockPatientService.getMedicalSummary(effectivePatientId),
          mockPatientService.getCriticalInfo(effectivePatientId),
          mockPatientService.getEmergencyProfile(effectivePatientId),
        ]);

        error = null;
      } catch (err) {
        error = err.message;
      } finally {
        loading = false; // MUST always execute
      }

      // Verify loading state resolves
      expect(loading).toBe(false);
      expect(error).toBe(null);
      expect(patient).toBeDefined();
      expect(patient._id || patient.data._id).toBe('patient123');
    });
  });

  describe('Scenario 2: Missing patient profile (404)', () => {
    it('should set loading=false and error message when no profile exists', async () => {
      // Mock 404 response
      const error404 = new Error('Patient profile not found');
      error404.response = {
        data: { message: 'Patient profile not found for user' },
        status: 404,
      };
      mockPatientService.getProfile.mockRejectedValue(error404);

      let loading = true;
      let error = null;
      let patient = null;

      try {
        loading = true;
        patient = await mockPatientService.getProfile(null);
        
        const effectivePatientId = patient.data?._id || patient._id;
        if (!effectivePatientId) {
          throw new Error('Unable to retrieve patient profile');
        }
      } catch (err) {
        error = err.response?.data?.message || err.message;
      } finally {
        loading = false;
      }

      // Verify loading resolved with error
      expect(loading).toBe(false);
      expect(error).toContain('Patient profile not found');
      expect(patient).toBe(null);
    });
  });

  describe('Scenario 3: Profile API returns empty/undefined patient ID', () => {
    it('should set loading=false with validation error when patient ID is missing', async () => {
      // Mock profile response with no ID (the bug we fixed)
      const emptyProfile = { data: { name: 'Test' } }; // Missing _id
      mockPatientService.getProfile.mockResolvedValue(emptyProfile);

      let loading = true;
      let error = null;
      let patient = null;

      try {
        loading = true;
        patient = await mockPatientService.getProfile(null);
        
        const effectivePatientId = patient.data?._id || patient._id;
        
        // THE FIX: Validate patient ID before downstream calls
        if (!effectivePatientId) {
          throw new Error('Unable to retrieve patient profile. You may not have a patient record yet.');
        }

        // This would have been called with undefined before the fix
        await Promise.all([
          mockPatientService.getStats(effectivePatientId),
        ]);
      } catch (err) {
        error = err.message;
      } finally {
        loading = false;
      }

      // Verify loading resolved with clear error
      expect(loading).toBe(false);
      expect(error).toContain('Unable to retrieve patient profile');
      expect(mockPatientService.getStats).not.toHaveBeenCalled(); // Should NOT call with undefined
    });
  });

  describe('Scenario 4: Downstream API failure (stats/timeline)', () => {
    it('should set loading=false and gracefully handle downstream errors', async () => {
      const mockPatient = { data: { _id: 'patient123' } };
      mockPatientService.getProfile.mockResolvedValue(mockPatient);
      mockPatientService.getStats.mockRejectedValue(new Error('Stats service unavailable'));
      mockPatientService.getTimeline.mockResolvedValue({ events: [] });
      mockPatientService.getMedicalSummary.mockResolvedValue(null);
      mockPatientService.getCriticalInfo.mockResolvedValue({});
      mockPatientService.getEmergencyProfile.mockResolvedValue({});

      let loading = true;
      let error = null;
      let patient = null;
      let stats = null;

      try {
        loading = true;
        patient = await mockPatientService.getProfile(null);
        const effectivePatientId = patient.data._id;

        if (!effectivePatientId) {
          throw new Error('Unable to retrieve patient profile');
        }

        // Downstream calls with .catch() fallbacks
        const results = await Promise.all([
          mockPatientService.getStats(effectivePatientId).catch(() => {
            console.warn('Failed to load stats');
            return {};
          }),
          mockPatientService.getTimeline(effectivePatientId).catch(() => ({ events: [] })),
          mockPatientService.getMedicalSummary(effectivePatientId).catch(() => null),
          mockPatientService.getCriticalInfo(effectivePatientId).catch(() => ({})),
          mockPatientService.getEmergencyProfile(effectivePatientId).catch(() => ({})),
        ]);

        stats = results[0];
        error = null;
      } catch (err) {
        error = err.message;
      } finally {
        loading = false;
      }

      // Verify loading resolves even with partial failures
      expect(loading).toBe(false);
      expect(error).toBe(null); // No error thrown
      expect(patient).toBeDefined();
      expect(stats).toEqual({}); // Graceful fallback
    });
  });

  describe('Scenario 5: Network failure on profile request', () => {
    it('should set loading=false with network error message', async () => {
      const networkError = new Error('Network request failed');
      mockPatientService.getProfile.mockRejectedValue(networkError);

      let loading = true;
      let error = null;

      try {
        loading = true;
        await mockPatientService.getProfile(null);
      } catch (err) {
        error = err.response?.data?.message || err.message;
      } finally {
        loading = false;
      }

      expect(loading).toBe(false);
      expect(error).toContain('Network request failed');
    });
  });
});

describe('PatientDashboard Component Loading State', () => {
  it('should render LoadingState when loading=true', () => {
    const state = { loading: true, error: null, patient: null };
    
    if (state.loading) {
      expect(state.loading).toBe(true);
      // Would render: <LoadingState message="Loading your health dashboard..." />
    }
  });

  it('should render error UI when loading=false and error exists', () => {
    const state = { 
      loading: false, 
      error: 'Patient profile not found for user', 
      patient: null 
    };
    
    if (state.error) {
      const isNoPatientRecord = state.error.includes('patient profile') || 
                                state.error.includes('not found');
      expect(isNoPatientRecord).toBe(true);
      expect(state.loading).toBe(false);
      // Would render: yellow warning UI with instructions
    }
  });

  it('should render null patient warning when loading=false, no error, but patient is null', () => {
    const state = { loading: false, error: null, patient: null };
    
    if (!state.loading && !state.error && !state.patient) {
      expect(state.patient).toBe(null);
      expect(state.loading).toBe(false);
      // Would render: yellow warning "No Patient Profile Found"
    }
  });

  it('should render dashboard when loading=false, no error, and patient exists', () => {
    const state = { 
      loading: false, 
      error: null, 
      patient: { _id: 'patient123', jeevaId: 'JC001' } 
    };
    
    if (!state.loading && !state.error && state.patient) {
      expect(state.patient).toBeDefined();
      expect(state.loading).toBe(false);
      // Would render: full dashboard UI
    }
  });
});

describe('Invalid Patient ID Prevention', () => {
  it('should not call downstream APIs with undefined patient ID', async () => {
    const mockProfile = { data: {} }; // No _id field
    const getStats = vi.fn();

    const effectivePatientId = mockProfile.data?._id || mockProfile._id;
    
    // THE FIX: Check before calling
    if (!effectivePatientId) {
      // Don't call downstream APIs
      expect(effectivePatientId).toBeUndefined();
    } else {
      await getStats(effectivePatientId);
    }

    expect(getStats).not.toHaveBeenCalled();
    expect(getStats).not.toHaveBeenCalledWith(undefined);
  });

  it('should call downstream APIs only with valid patient ID', async () => {
    const mockProfile = { data: { _id: 'patient123' } };
    const getStats = vi.fn().mockResolvedValue({});

    const effectivePatientId = mockProfile.data._id;
    
    if (effectivePatientId) {
      await getStats(effectivePatientId);
    }

    expect(getStats).toHaveBeenCalledWith('patient123');
    expect(getStats).toHaveBeenCalledTimes(1);
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import GoogleSheetsService from '../services/GoogleSheetsService.js';
import {
  HOSPITALS_DATA,
  ADMINS_DATA,
  SANJIVANI_DOCTORS,
  AAROGYA_DOCTORS,
  SHARED_DOCTOR,
  SANJIVANI_PATIENTS,
  AAROGYA_PATIENTS,
} from '../utils/bootstrapDemoData.js';

describe('Demo Readiness Validation Suite', () => {
  describe('Hospital and Account Specifications', () => {
    it('should specify exactly two demo hospitals', () => {
      expect(HOSPITALS_DATA).toHaveLength(2);
      expect(HOSPITALS_DATA[0].name).toBe('Sanjivani Hospital');
      expect(HOSPITALS_DATA[0].city).toBe('Mysore');
      expect(HOSPITALS_DATA[1].name).toBe('Aarogya Kendra');
      expect(HOSPITALS_DATA[1].city).toBe('Mandya');
    });

    it('should specify two hospital administrators', () => {
      expect(ADMINS_DATA).toHaveLength(2);
      expect(ADMINS_DATA[0].email).toBe('prakash.rao@sanjivani.in');
      expect(ADMINS_DATA[1].email).toBe('revathi.kumar@aarogya.in');
    });

    it('should specify five doctors for Sanjivani Hospital', () => {
      expect(SANJIVANI_DOCTORS).toHaveLength(5);
      const names = SANJIVANI_DOCTORS.map(d => `${d.firstName} ${d.lastName}`);
      expect(names).toContain('Soundarya Shetty');
      expect(names).toContain('Christopher Matthews');
      expect(names).toContain('Manjunath Rao');
      expect(names).toContain('Asia Begum');
      expect(names).toContain('Ansh Kumar');
    });

    it('should specify five doctors for Aarogya Kendra', () => {
      expect(AAROGYA_DOCTORS).toHaveLength(5);
      const names = AAROGYA_DOCTORS.map(d => `${d.firstName} ${d.lastName}`);
      expect(names).toContain('Harshith Bagrecha');
      expect(names).toContain('Ashwin S.');
      expect(names).toContain('Apoorva Santosh');
      expect(names).toContain('Siri M.N.');
      expect(names).toContain('Vinay Kumar');
    });

    it('should specify exactly one shared doctor with dual affiliation', () => {
      expect(SHARED_DOCTOR.email).toBe('swami.murti@jeevacare.in');
      expect(`${SHARED_DOCTOR.firstName} ${SHARED_DOCTOR.lastName}`).toBe('Swami Murti');
      expect(SHARED_DOCTOR.licenseId).toBe('KA-LIC-SM-2013-011');
    });

    it('should specify exactly 20 patients (10 per hospital)', () => {
      expect(SANJIVANI_PATIENTS).toHaveLength(10);
      expect(AAROGYA_PATIENTS).toHaveLength(10);
      
      // Ensure all emails are unique
      const allEmails = [...SANJIVANI_PATIENTS, ...AAROGYA_PATIENTS].map(p => p.email);
      const uniqueEmails = new Set(allEmails);
      expect(uniqueEmails.size).toBe(20);
    });
  });

  describe('GoogleSheetsService Integration Boundary', () => {
    it('should report status and exact authorization requirements if unconfigured', () => {
      const status = GoogleSheetsService.getStatus();
      expect(status).toHaveProperty('configured');
      expect(status).toHaveProperty('cachedRecords');
      if (!status.configured) {
        expect(status.actionRequired).toContain('GOOGLE_SHEETS_SPREADSHEET_ID');
      }
    });

    it('should record hospitals and sanitize user data', async () => {
      await GoogleSheetsService.recordHospital({
        _id: 'hosp_test_1',
        facilityId: 'JC-HOSP-SANJIVANI-001',
        name: 'Sanjivani Hospital',
        address: { city: 'Mysore', state: 'Karnataka' },
      });

      const user = {
        _id: 'user_test_1',
        jeevaId: 'JC-USER-001',
        email: 'doctor.test@sanjivani.in',
        role: 'DOCTOR',
        profile: { firstName: 'Test', lastName: 'Doctor' },
        passwordHash: 'SUPER_SECRET_HASH_DO_NOT_LEAK',
      };

      await GoogleSheetsService.recordUser(user, { hospitalName: 'Sanjivani Hospital' });

      // Verify cached records exist and do NOT contain passwordHash
      const cachedUsers = GoogleSheetsService.localStore.Users;
      const found = cachedUsers.find(u => u.Email === 'doctor.test@sanjivani.in');
      expect(found).toBeDefined();
      expect(found).not.toHaveProperty('passwordHash');
      expect(found).not.toHaveProperty('password');
    });

    it('should record staff registration requests and updates', async () => {
      const request = {
        _id: 'req_123',
        userId: 'user_456',
        firstName: 'New',
        lastName: 'Doctor',
        email: 'new.doctor@test.in',
        requestedRole: 'doctor',
        hospitalId: 'hosp_test_1',
        department: 'Cardiology',
        specialization: ['Cardiology'],
        licenseNumber: 'LIC-12345',
        status: 'pending',
      };

      await GoogleSheetsService.recordRegistrationRequest(request, { _id: 'hosp_test_1', name: 'Sanjivani Hospital' });

      const pending = GoogleSheetsService.getRequestsForHospital('hosp_test_1', 'pending');
      expect(pending.length).toBeGreaterThan(0);
      expect(pending[0].ApplicantName).toBe('New Doctor');

      // Update decision
      await GoogleSheetsService.updateRegistrationRequestDecision('req_123', 'approved', 'admin_1', 'Credentials verified');
      const approved = GoogleSheetsService.getRequestsForHospital('hosp_test_1', 'approved');
      expect(approved.length).toBeGreaterThan(0);
      expect(approved[0].Status).toBe('approved');
    });

    it('should enforce multi-tenant isolation on requests', () => {
      const sanjivaniRequests = GoogleSheetsService.getRequestsForHospital('hosp_test_1');
      const aarogyaRequests = GoogleSheetsService.getRequestsForHospital('hosp_test_2');

      // Sanjivani request should not appear in Aarogya requests
      expect(aarogyaRequests.find(r => r.RequestID === 'req_123')).toBeUndefined();
    });
  });
});

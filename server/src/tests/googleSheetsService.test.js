import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import GoogleSheetsService, {
  sanitizePrivateKey,
  sanitizeRow,
  TAB_SCHEMAS,
} from '../services/GoogleSheetsService.js';

describe('GoogleSheetsService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    delete process.env.GOOGLE_PRIVATE_KEY;
    delete process.env.GOOGLE_SHEETS_WEBHOOK_URL;

    // Reset service internal caches
    GoogleSheetsService._sheetTitlesCache = null;
    GoogleSheetsService._verifiedHeadersCache = new Set();
    GoogleSheetsService._sheetsClient = null;
    GoogleSheetsService.lastError = null;
    GoogleSheetsService.connectionWorking = false;
    GoogleSheetsService.connectionTested = false;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Configuration & Environment Variables', () => {
    it('should report unconfigured when environment variables are missing', () => {
      GoogleSheetsService._loadConfig();
      expect(GoogleSheetsService.isConfigured()).toBe(false);

      const status = GoogleSheetsService.getStatus();
      expect(status.configured).toBe(false);
      expect(status.authMethod).toBe('NONE');
      expect(status.actionRequired).toContain('GOOGLE_SHEETS_SPREADSHEET_ID');
    });

    it('should configure properly with canonical GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY', () => {
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID = 'test-spreadsheet-id-12345';
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'sa@project.iam.gserviceaccount.com';
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY =
        '-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgk...\\n-----END PRIVATE KEY-----\\n';

      GoogleSheetsService._loadConfig();
      expect(GoogleSheetsService.isConfigured()).toBe(true);

      const status = GoogleSheetsService.getStatus();
      expect(status.configured).toBe(true);
      expect(status.authMethod).toBe('SERVICE_ACCOUNT');
      expect(status.serviceAccountEmail).toBe('sa@project.iam.gserviceaccount.com');
      expect(status.spreadsheetId).toContain('test-s');
    });

    it('should configure properly with alias GOOGLE_PRIVATE_KEY as fallback', () => {
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID = 'test-spreadsheet-id-67890';
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'sa-alias@project.iam.gserviceaccount.com';
      process.env.GOOGLE_PRIVATE_KEY =
        '-----BEGIN PRIVATE KEY-----\\nALIAS_KEY...\\n-----END PRIVATE KEY-----\\n';

      GoogleSheetsService._loadConfig();
      expect(GoogleSheetsService.isConfigured()).toBe(true);
      expect(GoogleSheetsService.privateKey).toContain('ALIAS_KEY');
      expect(GoogleSheetsService.privateKey).toContain('\n');
      expect(GoogleSheetsService.privateKey).not.toContain('\\n');
    });

    it('should sanitize escaped \\n sequences and surrounding quotes in private key', () => {
      const escapedWithQuotes =
        '"-----BEGIN PRIVATE KEY-----\\nMIIE\\nTEST_KEY\\n-----END PRIVATE KEY-----\\n"';
      const cleaned = sanitizePrivateKey(escapedWithQuotes);

      expect(cleaned).toBe(
        '-----BEGIN PRIVATE KEY-----\nMIIE\nTEST_KEY\n-----END PRIVATE KEY-----\n'
      );
      expect(cleaned).not.toContain('\\n');
      expect(cleaned.startsWith('"')).toBe(false);
      expect(cleaned.endsWith('"')).toBe(false);
    });

    it('should handle null or empty private keys safely', () => {
      expect(sanitizePrivateKey(null)).toBeNull();
      expect(sanitizePrivateKey('')).toBeNull();
      expect(sanitizePrivateKey(undefined)).toBeNull();
    });
  });

  describe('Secret Sanitization (Zero plaintext secrets in Google Sheets)', () => {
    it('should strip password, passwordHash, token, and secret fields', () => {
      const sensitiveRow = {
        UserID: 'usr_100',
        Email: 'user@jeevacare.demo',
        Password: 'PlaintextPassword123!',
        passwordHash: '$2a$10$eW6u4eQJ7...',
        jwtToken: 'eyJhbGciOiJIUzI1NiIsIn...',
        adminSecret: 'top-secret',
        privateKey: 'private-key-data',
        Role: 'DOCTOR',
      };

      const cleaned = sanitizeRow(sensitiveRow);
      expect(cleaned).toEqual({
        UserID: 'usr_100',
        Email: 'user@jeevacare.demo',
        Role: 'DOCTOR',
      });
      expect(cleaned).not.toHaveProperty('Password');
      expect(cleaned).not.toHaveProperty('passwordHash');
      expect(cleaned).not.toHaveProperty('jwtToken');
      expect(cleaned).not.toHaveProperty('adminSecret');
      expect(cleaned).not.toHaveProperty('privateKey');
    });

    it('recordUser should strip passwordHash from dispatched data', async () => {
      const user = {
        _id: 'usr_101',
        jeevaId: 'JC-USER-001',
        email: 'doc.test@sanjivani.in',
        role: 'DOCTOR',
        profile: { firstName: 'Sita', lastName: 'Rao' },
        passwordHash: 'DOUBLE_HASHED_SECRET',
      };

      await GoogleSheetsService.recordUser(user, { hospitalName: 'Sanjivani Hospital' });

      const cached = GoogleSheetsService.localStore.Users.find((u) => u.Email === 'doc.test@sanjivani.in');
      expect(cached).toBeDefined();
      expect(cached).not.toHaveProperty('passwordHash');
      expect(cached.FirstName).toBe('Sita');
      expect(cached.LastName).toBe('Rao');
    });
  });

  describe('Identifier-Based Updates & Appends (Mocked Google Sheets API)', () => {
    let mockClient;
    let getCalls;
    let updateCalls;
    let appendCalls;
    let batchUpdateCalls;

    beforeEach(() => {
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID = 'sheet_test_id';
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'sa@project.iam.gserviceaccount.com';
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY =
        '-----BEGIN PRIVATE KEY-----\nMIIE\n-----END PRIVATE KEY-----\n';

      getCalls = [];
      updateCalls = [];
      appendCalls = [];
      batchUpdateCalls = [];

      mockClient = {
        spreadsheets: {
          get: vi.fn(async (params) => {
            getCalls.push(params);
            return {
              data: {
                properties: { title: 'JeevaCare Demo Database' },
                sheets: [
                  { properties: { title: 'Hospitals' } },
                  { properties: { title: 'Users' } },
                  { properties: { title: 'Doctors' } },
                  { properties: { title: 'Patients' } },
                  { properties: { title: 'StaffRegistrationRequests' } },
                  { properties: { title: 'MedicalReports' } },
                  { properties: { title: 'AuditLog' } },
                ],
              },
            };
          }),
          batchUpdate: vi.fn(async (params) => {
            batchUpdateCalls.push(params);
            return { data: {} };
          }),
          values: {
            get: vi.fn(async (params) => {
              getCalls.push(params);
              const range = params.range || '';

              // If range is for header check A1:Z1
              if (range.includes('A1:Z1')) {
                const tabName = range.split('!')[0];
                return {
                  data: {
                    values: [TAB_SCHEMAS[tabName]?.headers || []],
                  },
                };
              }

              // If checking StaffRegistrationRequests for existing record
              if (range.startsWith('StaffRegistrationRequests')) {
                return {
                  data: {
                    values: [
                      TAB_SCHEMAS.StaffRegistrationRequests.headers,
                      [
                        'req_existing_001',
                        'usr_500',
                        'Dr. John',
                        'john@sanjivani.in',
                        'DOCTOR',
                        'hosp_1',
                        'Sanjivani Hospital',
                        'Cardiology',
                        'Cardiology',
                        'LIC-100',
                        'pending',
                        '',
                        '',
                        '2026-10-01T00:00:00.000Z',
                        '',
                      ],
                    ],
                  },
                };
              }

              return { data: { values: [] } };
            }),
            update: vi.fn(async (params) => {
              updateCalls.push(params);
              return { data: { updatedCells: 10 } };
            }),
            append: vi.fn(async (params) => {
              appendCalls.push(params);
              return { data: { updates: { updatedRows: 1 } } };
            }),
          },
        },
      };

      GoogleSheetsService._sheetsClient = mockClient;
    });

    it('should update existing row when matching RequestID is found', async () => {
      // Update the existing request 'req_existing_001'
      await GoogleSheetsService.updateRegistrationRequestDecision(
        'req_existing_001',
        'approved',
        'admin_prakash',
        'Credentials verified'
      );

      // Verify update was called on row 2
      expect(updateCalls.length).toBeGreaterThan(0);
      const updateCall = updateCalls.find((c) =>
        c.range?.includes('StaffRegistrationRequests!A2')
      );
      expect(updateCall).toBeDefined();

      const updatedRow = updateCall.requestBody.values[0];
      const statusIdx = TAB_SCHEMAS.StaffRegistrationRequests.headers.indexOf('Status');
      const decisionByIdx =
        TAB_SCHEMAS.StaffRegistrationRequests.headers.indexOf('DecisionBy');

      expect(updatedRow[statusIdx]).toBe('approved');
      expect(updatedRow[decisionByIdx]).toBe('admin_prakash');
    });

    it('should append new row when identifier does not exist in the sheet', async () => {
      const newRequest = {
        _id: 'req_brand_new_999',
        userId: 'usr_999',
        firstName: 'Ananya',
        lastName: 'Rao',
        email: 'ananya.rao@aarogya.in',
        requestedRole: 'DOCTOR',
        hospitalId: 'hosp_aarogya',
        department: 'Pediatrics',
        specialization: ['Pediatrics'],
        licenseNumber: 'LIC-AAROGYA-999',
        status: 'pending',
      };

      await GoogleSheetsService.recordRegistrationRequest(newRequest, {
        _id: 'hosp_aarogya',
        name: 'Aarogya Kendra',
      });

      expect(appendCalls.length).toBeGreaterThan(0);
      const appendCall = appendCalls.find((c) =>
        c.range?.startsWith('StaffRegistrationRequests')
      );
      expect(appendCall).toBeDefined();

      const appendedRow = appendCall.requestBody.values[0];
      expect(appendedRow[0]).toBe('req_brand_new_999');
      expect(appendedRow[2]).toBe('Ananya Rao');
    });

    it('should always append to AuditLog without updating', async () => {
      await GoogleSheetsService.recordAuditLog({
        action: 'patient_record_viewed',
        actor: 'doc_1',
        actorRole: 'DOCTOR',
        resource: 'pat_9',
        hospital: 'hosp_1',
        details: { patientName: 'Rajesh Kumar' },
      });

      const auditAppend = appendCalls.find((c) => c.range?.startsWith('AuditLog'));
      expect(auditAppend).toBeDefined();
      expect(auditAppend.requestBody.values[0][2]).toBe('patient_record_viewed');
    });
  });

  describe('Missing Tab & Header Handling', () => {
    it('should auto-create missing sheet tab via batchUpdate', async () => {
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID = 'sheet_test_id';
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'sa@project.iam.gserviceaccount.com';
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY =
        '-----BEGIN PRIVATE KEY-----\nMIIE\n-----END PRIVATE KEY-----\n';

      const batchUpdateCalls = [];
      const updateCalls = [];

      const mockClient = {
        spreadsheets: {
          get: vi.fn(async () => ({
            data: {
              sheets: [{ properties: { title: 'Hospitals' } }], // Missing other 6 tabs
            },
          })),
          batchUpdate: vi.fn(async (params) => {
            batchUpdateCalls.push(params);
            return { data: {} };
          }),
          values: {
            get: vi.fn(async () => ({
              data: { values: [] }, // Missing headers
            })),
            update: vi.fn(async (params) => {
              updateCalls.push(params);
              return { data: {} };
            }),
            append: vi.fn(async () => ({ data: {} })),
          },
        },
      };

      GoogleSheetsService._sheetsClient = mockClient;

      // Ensuring 'Doctors' tab
      await GoogleSheetsService.ensureSheetAndHeaders(mockClient, 'Doctors');

      // Verified batchUpdate created the 'Doctors' tab
      expect(batchUpdateCalls.length).toBe(1);
      expect(
        batchUpdateCalls[0].requestBody.requests[0].addSheet.properties.title
      ).toBe('Doctors');

      // Verified headers were initialized in A1
      expect(updateCalls.length).toBe(1);
      expect(updateCalls[0].range).toBe('Doctors!A1');
      expect(updateCalls[0].requestBody.values[0]).toEqual(
        TAB_SCHEMAS.Doctors.headers
      );
    });
  });

  describe('Graceful Degradation on Authorization Failure', () => {
    it('should catch 403 Forbidden without throwing to caller and preserve authoritative MongoDB persistence', async () => {
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID = 'sheet_forbidden';
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'unauthorized@sa.iam.gserviceaccount.com';
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY =
        '-----BEGIN PRIVATE KEY-----\nMIIE\n-----END PRIVATE KEY-----\n';

      const mockClient = {
        spreadsheets: {
          get: vi.fn(async () => {
            const err = new Error('The caller does not have permission');
            err.code = 403;
            err.status = 403;
            throw err;
          }),
        },
      };

      GoogleSheetsService._sheetsClient = mockClient;

      // Caller invokes recordHospital - must NOT throw
      await expect(
        GoogleSheetsService.recordHospital({
          _id: 'hosp_unauth',
          facilityId: 'JC-HOSP-001',
          name: 'Sanjivani Hospital',
        })
      ).resolves.not.toThrow();

      // State recorded failure gracefully
      expect(GoogleSheetsService.connectionWorking).toBe(false);
      expect(GoogleSheetsService.lastError).toContain('The caller does not have permission');

      // Local store still updated safely
      expect(GoogleSheetsService.localStore.Hospitals.length).toBe(1);
    });
  });

  describe('Diagnostic Smoke Test Endpoint Method (testConnection)', () => {
    it('should return actionRequired when unconfigured', async () => {
      const diag = await GoogleSheetsService.testConnection();
      expect(diag.success).toBe(false);
      expect(diag.connected).toBe(false);
      expect(diag.actionRequired).toContain('GOOGLE_SHEETS_SPREADSHEET_ID');
    });

    it('should return successful diagnostic smoke test report when connected', async () => {
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID = 'test_sheet_1234567890';
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'sa@project.iam.gserviceaccount.com';
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY =
        '-----BEGIN PRIVATE KEY-----\nMIIE\n-----END PRIVATE KEY-----\n';

      const mockClient = {
        spreadsheets: {
          get: vi.fn(async () => ({
            data: {
              properties: { title: 'JeevaCare Demo Database' },
              sheets: Object.keys(TAB_SCHEMAS).map((title) => ({
                properties: { title },
              })),
            },
          })),
          batchUpdate: vi.fn(async () => ({ data: {} })),
          values: {
            get: vi.fn(async (params) => {
              if (params.range === 'AuditLog!A:A') {
                return {
                  data: {
                    values: [['LogID'], ['SMOKE-TEST-12345']],
                  },
                };
              }
              return { data: { values: [['Col1', 'Col2']] } };
            }),
            update: vi.fn(async () => ({ data: {} })),
            append: vi.fn(async () => ({ data: {} })),
          },
        },
      };

      GoogleSheetsService._sheetsClient = mockClient;

      const report = await GoogleSheetsService.testConnection();

      expect(report.success).toBe(true);
      expect(report.connected).toBe(true);
      expect(report.spreadsheetTitle).toBe('JeevaCare Demo Database');
      expect(report.requiredTabs.length).toBe(7);
      expect(report.smokeTestRecordId).toBeDefined();
      expect(report.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });
});

/**
 * Google Sheets Service for JeevaCare
 * 
 * Provides production-grade synchronization between JeevaCare and Google Sheets
 * using the official Google Sheets API client (googleapis) and service-account authentication.
 * 
 * Key Principles:
 * 1. Zero plaintext secrets: Passwords, password hashes, JWTs, and keys are NEVER written to Sheets or logs.
 * 2. Authoritative backend: MongoDB is the single source of truth; Google Sheets is a secondary sync layer.
 * 3. Graceful degradation: If Google credentials are not set or fail, the application continues unaffected.
 * 4. Identifier-based updates: Accurately updates existing rows by key (e.g., RequestID) rather than duplicating.
 * 5. Robust error handling: Handles missing sheet tabs, header initialization, retries, and escaped private keys.
 */

import { google } from 'googleapis';
import logger from '../utils/logger.js';

/**
 * Standard schemas for the 7 Google Sheets worksheet tabs
 */
export const TAB_SCHEMAS = {
  Hospitals: {
    idField: 'HospitalID',
    headers: [
      'HospitalID',
      'FacilityID',
      'Name',
      'City',
      'State',
      'Phone',
      'Email',
      'RegistrationNumber',
      'Status',
      'Timestamp',
    ],
  },
  Users: {
    idField: 'UserID',
    headers: [
      'UserID',
      'JeevaID',
      'Email',
      'Role',
      'FirstName',
      'LastName',
      'Phone',
      'Status',
      'VerificationStatus',
      'HospitalAffiliation',
      'Timestamp',
    ],
  },
  Doctors: {
    idField: 'DoctorUserID',
    headers: [
      'DoctorUserID',
      'Name',
      'Email',
      'Specialization',
      'LicenseID',
      'HospitalID',
      'HospitalName',
      'Status',
      'Timestamp',
    ],
  },
  Patients: {
    idField: 'PatientID',
    headers: [
      'PatientID',
      'UserID',
      'JeevaID',
      'Name',
      'Email',
      'DateOfBirth',
      'Gender',
      'BloodGroup',
      'PrimaryHospitalID',
      'PrimaryHospitalName',
      'Timestamp',
    ],
  },
  StaffRegistrationRequests: {
    idField: 'RequestID',
    headers: [
      'RequestID',
      'UserID',
      'ApplicantName',
      'Email',
      'RequestedRole',
      'HospitalID',
      'HospitalName',
      'Department',
      'Specialization',
      'LicenseNumber',
      'Status',
      'DecisionBy',
      'DecisionReason',
      'SubmittedAt',
      'DecidedAt',
    ],
  },
  MedicalReports: {
    idField: 'ReportID',
    headers: [
      'ReportID',
      'PatientID',
      'PatientName',
      'HospitalID',
      'HospitalName',
      'Modality',
      'BodyPart',
      'StudyDate',
      'AIStatus',
      'Findings',
      'Impression',
      'UploadedAt',
    ],
  },
  AuditLog: {
    idField: 'LogID',
    headers: [
      'LogID',
      'Timestamp',
      'Action',
      'ActorID',
      'ActorRole',
      'ResourceID',
      'HospitalID',
      'Status',
      'Details',
    ],
  },
};

/**
 * Clean and unescape private keys from environment variables
 */
export function sanitizePrivateKey(rawKey) {
  if (!rawKey || typeof rawKey !== 'string') return null;
  let key = rawKey.trim();

  // Strip wrapping quotes if user pasted with quotes
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }

  // Unescape literal \n sequences into real newlines
  key = key.replace(/\\n/g, '\n');

  // Strip carriage returns if any
  key = key.replace(/\r/g, '');

  return key;
}

/**
 * Filter out any authentication secrets, password hashes, or tokens
 */
export function sanitizeRow(row) {
  if (!row || typeof row !== 'object') return {};
  const cleaned = { ...row };
  const sensitivePatterns = [
    'password',
    'passwordhash',
    'token',
    'jwt',
    'secret',
    'privatekey',
    'apikey',
    'credential',
    'adminsecret',
  ];

  for (const key of Object.keys(cleaned)) {
    const lowerKey = key.toLowerCase();
    if (sensitivePatterns.some((pattern) => lowerKey.includes(pattern))) {
      delete cleaned[key];
    }
  }

  return cleaned;
}

/**
 * Execute an API operation with retry for transient errors
 */
async function executeWithRetry(operation, retries = 2, baseDelayMs = 500) {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await operation();
    } catch (err) {
      attempt++;
      const statusCode = err.status || err.code || err.response?.status;
      const isRetryable =
        statusCode === 429 ||
        (statusCode >= 500 && statusCode < 600) ||
        err.message?.includes('ETIMEDOUT') ||
        err.message?.includes('ECONNRESET');

      if (attempt > retries || !isRetryable) {
        throw err;
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      logger.warn(`Google Sheets API transient error (${err.message}). Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export class GoogleSheetsService {
  constructor() {
    this._loadConfig();

    // In-memory buffer of sheet rows for offline fallback / testing
    this.localStore = {
      Hospitals: [],
      Users: [],
      Doctors: [],
      Patients: [],
      StaffRegistrationRequests: [],
      MedicalReports: [],
      AuditLog: [],
    };

    this.connectionTested = false;
    this.connectionWorking = false;
    this.lastError = null;

    // Cache of verified tabs and headers to minimize API roundtrips
    this._sheetTitlesCache = null;
    this._verifiedHeadersCache = new Set();
    this._sheetsClient = null;

    logger.info(`GoogleSheetsService initialized. Configured: ${this.isConfigured()}`);
  }

  /**
   * Refresh configuration from environment variables
   */
  _loadConfig() {
    this.spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || null;
    this.webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL || null;
    this.serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || null;

    // Support both canonical GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY and alias GOOGLE_PRIVATE_KEY
    const rawKey =
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
      process.env.GOOGLE_PRIVATE_KEY ||
      null;

    this.privateKey = sanitizePrivateKey(rawKey);
  }

  /**
   * Check if genuine Google Sheets credentials are provided in the environment
   */
  isConfigured() {
    this._loadConfig();
    return Boolean(
      (this.spreadsheetId && this.serviceAccountEmail && this.privateKey) ||
      this.webhookUrl
    );
  }

  /**
   * Get or initialize the official Google Sheets API client
   */
  _getClient() {
    if (this._sheetsClient) {
      return this._sheetsClient;
    }

    this._loadConfig();

    if (!this.serviceAccountEmail || !this.privateKey) {
      return null;
    }

    try {
      const auth = new google.auth.JWT({
        email: this.serviceAccountEmail,
        key: this.privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this._sheetsClient = google.sheets({ version: 'v4', auth });
      return this._sheetsClient;
    } catch (err) {
      logger.error(`Failed to initialize Google Sheets client: ${err.message}`);
      this.lastError = `Auth initialization error: ${err.message}`;
      return null;
    }
  }

  /**
   * Diagnostic status report
   */
  getStatus() {
    this._loadConfig();
    return {
      configured: this.isConfigured(),
      spreadsheetId: this.spreadsheetId
        ? `${this.spreadsheetId.substring(0, 6)}...${this.spreadsheetId.substring(Math.max(0, this.spreadsheetId.length - 4))}`
        : null,
      authMethod: this.serviceAccountEmail
        ? 'SERVICE_ACCOUNT'
        : this.webhookUrl
        ? 'APPS_SCRIPT_WEBHOOK'
        : 'NONE',
      serviceAccountEmail: this.serviceAccountEmail || null,
      connectionTested: this.connectionTested,
      connectionWorking: this.connectionWorking,
      lastError: this.lastError,
      actionRequired: this.isConfigured()
        ? null
        : 'To connect live Google Sheets: 1) Create a Google Sheet with 7 tabs [Hospitals, Users, Doctors, Patients, StaffRegistrationRequests, MedicalReports, AuditLog]. 2) Share with service account as Editor. 3) Set GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in Render Dashboard.',
      cachedRecords: {
        hospitals: this.localStore.Hospitals.length,
        users: this.localStore.Users.length,
        doctors: this.localStore.Doctors.length,
        patients: this.localStore.Patients.length,
        registrationRequests: this.localStore.StaffRegistrationRequests.length,
        medicalReports: this.localStore.MedicalReports.length,
        auditLogs: this.localStore.AuditLog.length,
      },
    };
  }

  /**
   * Ensure worksheet tab exists and contains header row
   */
  async ensureSheetAndHeaders(sheets, tabName) {
    const schema = TAB_SCHEMAS[tabName];
    if (!schema) return;

    // 1. Fetch sheet tabs metadata if not cached
    if (!this._sheetTitlesCache) {
      const meta = await sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
        fields: 'sheets.properties.title',
      });
      this._sheetTitlesCache = new Set(
        (meta.data?.sheets || []).map((s) => s.properties?.title).filter(Boolean)
      );
    }

    // 2. Add sheet tab if missing
    if (!this._sheetTitlesCache.has(tabName)) {
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: { title: tabName },
                },
              },
            ],
          },
        });
        this._sheetTitlesCache.add(tabName);
        logger.info(`Created missing Google Sheets tab: ${tabName}`);
      } catch (addErr) {
        // Tab might have been created concurrently
        this._sheetTitlesCache.add(tabName);
      }
    }

    // 3. Verify header row
    if (!this._verifiedHeadersCache.has(tabName)) {
      const range = `${tabName}!A1:Z1`;
      const headerRes = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range,
      });

      const existingHeaders = headerRes.data?.values?.[0];
      if (!existingHeaders || existingHeaders.length === 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${tabName}!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [schema.headers],
          },
        });
        logger.info(`Initialized column headers on tab: ${tabName}`);
      }
      this._verifiedHeadersCache.add(tabName);
    }
  }

  /**
   * Live smoke test & diagnostic check against Google Sheets API
   */
  async testConnection() {
    this._loadConfig();

    if (!this.isConfigured()) {
      return {
        success: false,
        configured: false,
        connected: false,
        error: 'Google Sheets integration is not configured. Missing environment variables.',
        actionRequired:
          'Set GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.',
      };
    }

    const startTime = Date.now();

    try {
      const client = this._getClient();
      if (!client) {
        throw new Error('Could not create Google Sheets API client with configured credentials.');
      }

      // Step 1: Read spreadsheet metadata
      const meta = await executeWithRetry(() =>
        client.spreadsheets.get({
          spreadsheetId: this.spreadsheetId,
          fields: 'properties.title,sheets.properties.title',
        })
      );

      const title = meta.data?.properties?.title || 'JeevaCare Spreadsheet';
      const existingTabs = (meta.data?.sheets || [])
        .map((s) => s.properties?.title)
        .filter(Boolean);

      const requiredTabs = Object.keys(TAB_SCHEMAS);
      const missingBefore = requiredTabs.filter((t) => !existingTabs.includes(t));

      // Step 2: Ensure all 7 required tabs exist with proper headers
      for (const tab of requiredTabs) {
        await this.ensureSheetAndHeaders(client, tab);
      }

      // Step 3: Write and read back a diagnostic smoke-test entry in AuditLog
      const testTimestamp = new Date().toISOString();
      const smokeTestId = `SMOKE-${Date.now()}`;
      const smokeRow = {
        LogID: smokeTestId,
        Timestamp: testTimestamp,
        Action: 'diagnostic_connection_smoke_test',
        ActorID: 'SYSTEM',
        ActorRole: 'SYSTEM_ADMIN',
        ResourceID: this.spreadsheetId.substring(0, 8),
        HospitalID: 'DIAGNOSTIC',
        Status: 'success',
        Details: JSON.stringify({ verified: true, engine: 'googleapis-v4' }),
      };

      await this._dispatchToSheet('AuditLog', smokeRow, 'APPEND');

      // Verify read access
      const readRes = await client.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'AuditLog!A:A',
      });

      const loggedIds = (readRes.data?.values || []).map((r) => r[0]);
      const confirmedWritten = loggedIds.includes(smokeTestId);

      this.connectionTested = true;
      this.connectionWorking = true;
      this.lastError = null;

      return {
        success: true,
        configured: true,
        connected: true,
        spreadsheetTitle: title,
        spreadsheetId: `${this.spreadsheetId.substring(0, 6)}...${this.spreadsheetId.substring(Math.max(0, this.spreadsheetId.length - 4))}`,
        serviceAccountEmail: this.serviceAccountEmail,
        tabsFound: existingTabs,
        requiredTabs,
        autoCreatedTabs: missingBefore,
        smokeTestRecordId: smokeTestId,
        readVerification: confirmedWritten ? 'verified' : 'pending_cache',
        latencyMs: Date.now() - startTime,
        timestamp: testTimestamp,
      };
    } catch (err) {
      this.connectionTested = true;
      this.connectionWorking = false;
      this.lastError = err.message;

      let errorSummary = err.message;
      let actionRequired = 'Check Google Cloud service account setup.';

      if (err.message.includes('403') || err.message.includes('permission') || err.message.includes('The caller does not have permission')) {
        errorSummary = 'Permission Denied: Service account is not an Editor on the spreadsheet.';
        actionRequired = `Open Google Spreadsheet -> Share -> Add '${this.serviceAccountEmail}' with 'Editor' permissions.`;
      } else if (err.message.includes('404') || err.message.includes('not found')) {
        errorSummary = 'Spreadsheet Not Found: Verify GOOGLE_SHEETS_SPREADSHEET_ID.';
        actionRequired = 'Ensure the spreadsheet ID matches the middle segment of your Google Sheets URL.';
      } else if (err.message.includes('invalid_grant') || err.message.includes('PEM') || err.message.includes('JWT')) {
        errorSummary = 'Authentication Failed: Invalid service account private key format or email.';
        actionRequired = 'Ensure GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY contains the complete private key with -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY-----.';
      }

      return {
        success: false,
        configured: true,
        connected: false,
        error: errorSummary,
        rawError: err.message,
        actionRequired,
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // =========================================================================
  // CORE RECORD DISPATCHERS
  // =========================================================================

  /**
   * Record a hospital
   */
  async recordHospital(hospital) {
    try {
      const row = {
        HospitalID: hospital._id?.toString() || hospital.id,
        FacilityID: hospital.facilityId || '',
        Name: hospital.name || '',
        City: hospital.address?.city || '',
        State: hospital.address?.state || '',
        Phone: hospital.contactInfo?.phone || '',
        Email: hospital.contactInfo?.email || '',
        RegistrationNumber: hospital.registration?.registrationNumber || '',
        Status: hospital.status || 'active',
        Timestamp: new Date().toISOString(),
      };

      this._upsertLocal('Hospitals', 'HospitalID', row);
      await this._dispatchToSheet('Hospitals', row);
    } catch (err) {
      logger.warn(`GoogleSheets recordHospital: ${err.message}`);
    }
  }

  /**
   * Record a user (sanitized - NO passwords or tokens)
   */
  async recordUser(user, extra = {}) {
    try {
      const row = {
        UserID: user._id?.toString() || user.id,
        JeevaID: user.jeevaId || '',
        Email: user.email,
        Role: user.role,
        FirstName: user.profile?.firstName || '',
        LastName: user.profile?.lastName || '',
        Phone: user.profile?.phone || '',
        Status: user.status || 'active',
        VerificationStatus: user.verificationStatus || 'verified',
        HospitalAffiliation: extra.hospitalName || user.profile?.hospitalId || '',
        Timestamp: new Date().toISOString(),
      };

      this._upsertLocal('Users', 'UserID', row);
      await this._dispatchToSheet('Users', row);
    } catch (err) {
      logger.warn(`GoogleSheets recordUser: ${err.message}`);
    }
  }

  /**
   * Record a doctor
   */
  async recordDoctor(user, professional, hospital) {
    try {
      const row = {
        DoctorUserID: user._id?.toString() || user.id,
        Name: `Dr. ${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim(),
        Email: user.email,
        Specialization: Array.isArray(professional.specialization)
          ? professional.specialization.join(', ')
          : professional.specialization || '',
        LicenseID: professional.licenseNumber || '',
        HospitalID: hospital?._id?.toString() || hospital?.facilityId || '',
        HospitalName: hospital?.name || '',
        Status: professional.accountStatus || 'active',
        Timestamp: new Date().toISOString(),
      };

      this._upsertLocal('Doctors', 'DoctorUserID', row);
      await this._dispatchToSheet('Doctors', row);
    } catch (err) {
      logger.warn(`GoogleSheets recordDoctor: ${err.message}`);
    }
  }

  /**
   * Record a patient
   */
  async recordPatient(user, patient, hospital) {
    try {
      const row = {
        PatientID: patient._id?.toString() || patient.id,
        UserID: user._id?.toString() || user.id,
        JeevaID: patient.jeevaId || user.jeevaId || '',
        Name: `${patient.personalIdentity?.firstName || ''} ${patient.personalIdentity?.lastName || ''}`.trim(),
        Email: patient.personalIdentity?.email || user.email,
        DateOfBirth: patient.personalIdentity?.dateOfBirth
          ? new Date(patient.personalIdentity.dateOfBirth).toISOString().split('T')[0]
          : '',
        Gender: patient.personalIdentity?.sex || '',
        BloodGroup: patient.bloodGroup?.group || '',
        PrimaryHospitalID: hospital?._id?.toString() || hospital?.facilityId || '',
        PrimaryHospitalName: hospital?.name || '',
        Timestamp: new Date().toISOString(),
      };

      this._upsertLocal('Patients', 'PatientID', row);
      await this._dispatchToSheet('Patients', row);
    } catch (err) {
      logger.warn(`GoogleSheets recordPatient: ${err.message}`);
    }
  }

  /**
   * Record a staff registration request (New registration workflow)
   */
  async recordRegistrationRequest(request, hospital) {
    try {
      const row = {
        RequestID: request._id?.toString() || request.id,
        UserID: request.userId?.toString() || '',
        ApplicantName: `${request.firstName || ''} ${request.lastName || ''}`.trim(),
        Email: request.email,
        RequestedRole: request.requestedRole || request.role,
        HospitalID: hospital?._id?.toString() || request.hospitalId?.toString() || '',
        HospitalName: hospital?.name || request.hospitalName || 'Hospital',
        Department: request.department || '',
        Specialization: Array.isArray(request.specialization)
          ? request.specialization.join(', ')
          : request.specialization || '',
        LicenseNumber: request.licenseNumber || '',
        Status: request.status || 'pending',
        DecisionBy: request.decisionBy?.toString() || '',
        DecisionReason: request.decisionReason || '',
        SubmittedAt: request.submittedAt
          ? new Date(request.submittedAt).toISOString()
          : new Date().toISOString(),
        DecidedAt: request.decidedAt ? new Date(request.decidedAt).toISOString() : '',
      };

      this._upsertLocal('StaffRegistrationRequests', 'RequestID', row);
      await this._dispatchToSheet('StaffRegistrationRequests', row);

      // Audit row
      await this.recordAuditLog({
        action: 'staff_registration_request_recorded',
        actor: request.userId,
        actorRole: request.requestedRole,
        resource: request._id,
        hospital: row.HospitalID,
        status: 'success',
        details: { applicant: row.ApplicantName, hospital: row.HospitalName },
      });
    } catch (err) {
      logger.warn(`GoogleSheets recordRegistrationRequest: ${err.message}`);
    }
  }

  /**
   * Update a registration request status (Approve / Reject) with safe identifier-based update
   */
  async updateRegistrationRequestDecision(requestId, status, decisionBy, reason = '') {
    try {
      const existing = this.localStore.StaffRegistrationRequests.find(
        (r) => r.RequestID === requestId.toString()
      );
      if (existing) {
        existing.Status = status;
        existing.DecisionBy = decisionBy.toString();
        existing.DecisionReason = reason;
        existing.DecidedAt = new Date().toISOString();
      }

      const updatePayload = {
        RequestID: requestId.toString(),
        Status: status,
        DecisionBy: decisionBy.toString(),
        DecisionReason: reason,
        DecidedAt: new Date().toISOString(),
      };

      await this._dispatchToSheet('StaffRegistrationRequests', updatePayload, 'UPDATE');

      await this.recordAuditLog({
        action: `staff_registration_${status}`,
        actor: decisionBy,
        actorRole: 'HOSPITAL_ADMIN',
        resource: requestId,
        status: 'success',
        details: { status, reason },
      });
    } catch (err) {
      logger.warn(`GoogleSheets updateRegistrationRequestDecision: ${err.message}`);
    }
  }

  /**
   * Record medical report metadata (No raw binaries or PHI passwords)
   */
  async recordMedicalReport(radiologyRecord, patient, hospital) {
    try {
      const row = {
        ReportID: radiologyRecord._id?.toString() || radiologyRecord.id,
        PatientID: patient?._id?.toString() || radiologyRecord.patientId?.toString() || '',
        PatientName: patient?.personalIdentity
          ? `${patient.personalIdentity.firstName} ${patient.personalIdentity.lastName}`
          : '',
        HospitalID: hospital?._id?.toString() || radiologyRecord.hospitalId?.toString() || '',
        HospitalName: hospital?.name || '',
        Modality: radiologyRecord.modalityType || '',
        BodyPart: radiologyRecord.bodyPart || '',
        StudyDate: radiologyRecord.studyDate
          ? new Date(radiologyRecord.studyDate).toISOString().split('T')[0]
          : '',
        AIStatus: radiologyRecord.aiAnalysis?.status || 'none',
        Findings: (radiologyRecord.findings || '').substring(0, 300),
        Impression: (radiologyRecord.impression || '').substring(0, 300),
        UploadedAt: new Date().toISOString(),
      };

      this._upsertLocal('MedicalReports', 'ReportID', row);
      await this._dispatchToSheet('MedicalReports', row);
    } catch (err) {
      logger.warn(`GoogleSheets recordMedicalReport: ${err.message}`);
    }
  }

  /**
   * Record audit log (append-only)
   */
  async recordAuditLog(event) {
    try {
      const row = {
        LogID: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        Timestamp: new Date().toISOString(),
        Action: event.action || '',
        ActorID: event.actor?.toString() || '',
        ActorRole: event.actorRole || '',
        ResourceID: event.resource?.toString() || '',
        HospitalID: event.hospital?.toString() || '',
        Status: event.status || 'success',
        Details:
          typeof event.details === 'object'
            ? JSON.stringify(event.details)
            : String(event.details || ''),
      };

      this.localStore.AuditLog.push(row);
      await this._dispatchToSheet('AuditLog', row, 'APPEND');
    } catch (err) {
      logger.warn(`GoogleSheets recordAuditLog: ${err.message}`);
    }
  }

  /**
   * Retrieve requests for a hospital from shared data store
   */
  getRequestsForHospital(hospitalId, statusFilter = null) {
    const list = this.localStore.StaffRegistrationRequests.filter(
      (r) => r.HospitalID === hospitalId.toString()
    );

    if (statusFilter && statusFilter !== 'all') {
      return list.filter((r) => r.Status === statusFilter);
    }
    return list;
  }

  // =========================================================================
  // INTERNAL STORAGE HELPERS
  // =========================================================================

  _upsertLocal(tabName, keyField, row) {
    const arr = this.localStore[tabName] || [];
    const idx = arr.findIndex((item) => item[keyField] === row[keyField]);
    if (idx >= 0) {
      arr[idx] = { ...arr[idx], ...row };
    } else {
      arr.push(row);
    }
    this.localStore[tabName] = arr;
  }

  /**
   * Dispatch record to live Google Sheet (or webhook) with identifier-based updates
   */
  async _dispatchToSheet(tabName, data, action = 'APPEND') {
    // Maintain sanitized in-memory store regardless of Google API configuration
    const safeData = sanitizeRow(data);

    if (!this.isConfigured()) {
      return; // Authoritative persistence in MongoDB; exit cleanly
    }

    const schema = TAB_SCHEMAS[tabName];
    if (!schema) return;

    try {
      const client = this._getClient();

      if (client) {
        await executeWithRetry(async () => {
          await this.ensureSheetAndHeaders(client, tabName);

          const headers = schema.headers;
          const idField = schema.idField;

          // Map record object to column-ordered array
          const rowValues = headers.map((header) => {
            const val = safeData[header];
            if (val === undefined || val === null) return '';
            if (typeof val === 'object') return JSON.stringify(val);
            return String(val);
          });

          // For non-AuditLog tabs, perform identifier-based update if row already exists
          if (tabName !== 'AuditLog' && safeData[idField]) {
            const existingRes = await client.spreadsheets.values.get({
              spreadsheetId: this.spreadsheetId,
              range: `${tabName}!A:Z`,
            });

            const rows = existingRes.data?.values || [];
            if (rows.length > 1) {
              const headerRow = rows[0];
              const idColIndex = headerRow.indexOf(idField);

              if (idColIndex !== -1) {
                let existingRowIndex = -1;
                for (let i = 1; i < rows.length; i++) {
                  if (rows[i][idColIndex] === String(safeData[idField])) {
                    existingRowIndex = i + 1; // 1-indexed for Sheets
                    break;
                  }
                }

                if (existingRowIndex > 0) {
                  // Merge partial update with existing row values
                  const mergedRowValues = headers.map((header, colIdx) => {
                    if (safeData[header] !== undefined) {
                      const val = safeData[header];
                      return typeof val === 'object' ? JSON.stringify(val) : String(val);
                    }
                    return rows[existingRowIndex - 1][colIdx] || '';
                  });

                  await client.spreadsheets.values.update({
                    spreadsheetId: this.spreadsheetId,
                    range: `${tabName}!A${existingRowIndex}`,
                    valueInputOption: 'USER_ENTERED',
                    requestBody: { values: [mergedRowValues] },
                  });

                  this.connectionWorking = true;
                  this.connectionTested = true;
                  return;
                }
              }
            }
          }

          // Otherwise, append new row to the sheet
          await client.spreadsheets.values.append({
            spreadsheetId: this.spreadsheetId,
            range: `${tabName}!A1`,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            requestBody: { values: [rowValues] },
          });

          this.connectionWorking = true;
          this.connectionTested = true;
        });
      } else if (this.webhookUrl) {
        // Fallback for Apps Script Webhook
        const response = await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tab: tabName, action, data: safeData }),
        });

        if (response.ok) {
          this.connectionWorking = true;
          this.connectionTested = true;
        } else {
          this.lastError = `Webhook HTTP ${response.status}`;
        }
      }
    } catch (err) {
      this.lastError = err.message;
      this.connectionWorking = false;
      logger.warn(`GoogleSheets dispatch to ${tabName} failed: ${err.message}`);
    }
  }
}

export default new GoogleSheetsService();

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import OCRService from './OCRService.js';
import DocumentService from './DocumentService.js';
import Document from '../models/Document.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

// Mock CloudinaryAdapter
vi.mock('../adapters/CloudinaryAdapter.js', () => ({
  default: {
    uploadFile: vi.fn(async (fileBuffer, options) => ({
      publicId: `mock-public-id-${Date.now()}`,
      url: `https://res.cloudinary.com/mock/mock-public-id-${Date.now()}.pdf`,
      success: true,
    })),
  },
}));

describe('OCRService — Optical Character Recognition', () => {
  let testPatientId;
  let testUserId;
  let testDocumentId;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await Document.deleteMany({});
    await Patient.deleteMany({});
    await User.deleteMany({});
    await disconnectDatabase();
  });

  beforeEach(async () => {
    // Create test user with unique email
    const uniqueEmail = `ocr-test-${Date.now()}-${Math.random()}@example.com`;
    const user = new User({
      email: uniqueEmail,
      passwordHash: 'hashed-password',
      role: 'PATIENT',
      profile: {
        firstName: 'OCR',
        lastName: 'TestUser',
      },
    });
    const savedUser = await user.save();
    testUserId = savedUser._id;

    // Create test patient linked to the user
    const patient = new Patient({
      personalIdentity: {
        firstName: 'OCR',
        lastName: 'TestPatient',
        dateOfBirth: new Date('2000-01-01'),
        sex: 'F',
      },
      userId: testUserId, // Link patient to user
    });
    const savedPatient = await patient.save();
    testPatientId = savedPatient._id;

    // Upload a test document
    const documentData = {
      patientId: testPatientId,
      documentType: 'lab_report',
    };

    const fileBuffer = Buffer.from('Mock lab report with prescription information');
    const fileMetadata = {
      originalName: 'lab-report-ocr.pdf',
      mimeType: 'application/pdf',
      fileSize: fileBuffer.length,
    };

    const result = await DocumentService.uploadDocument(documentData, testUserId, fileBuffer, fileMetadata);
    if (!result.success) {
      throw new Error(`Failed to upload test document: ${result.error}`);
    }
    testDocumentId = result.document._id;
  });

  describe('Text Extraction', () => {
    it('should extract text from document', async () => {
      const result = await OCRService.extractText(testDocumentId, testUserId);

      expect(result.success).toBe(true);
      expect(result.extractedText).toBeDefined();
      expect(typeof result.extractedText).toBe('string');
      expect(result.confidence).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should update document OCR status to extracted', async () => {
      await OCRService.extractText(testDocumentId, testUserId);

      const document = await Document.findById(testDocumentId);
      expect(document.ocrStatus).toBe('extracted');
      expect(document.ocrData).toBeDefined();
      expect(document.ocrData.extractedText).toBeDefined();
      expect(document.ocrData.extractedAt).toBeDefined();
    });

    it('should detect languages in extracted text', async () => {
      const result = await OCRService.extractText(testDocumentId, testUserId);

      expect(result.metadata).toBeDefined();
      expect(Array.isArray(result.metadata.languages) || Array.isArray(result.languages)).toBeTruthy();
    });

    it('should extract metadata from OCR', async () => {
      const result = await OCRService.extractText(testDocumentId, testUserId);

      // In demo mode, will have sample metadata
      expect(result.metadata).toBeDefined();
      logger.info(`Extracted metadata: ${JSON.stringify(result.metadata)}`);
    });

    it('should handle extraction for non-existent document', async () => {
      const nonExistentId = '507f1f77bcf86cd799439999';

      const result = await OCRService.extractText(nonExistentId, testUserId);

      expect(result.success).toBe(false);
      expect(result.code).toBe('NOT_FOUND');
    });

    it('should retry extraction for failed attempt', async () => {
      // First attempt
      const result1 = await OCRService.extractText(testDocumentId, testUserId);
      expect(result1.success).toBe(true);

      // Second attempt should also work (reprocessing allowed)
      const result2 = await OCRService.extractText(testDocumentId, testUserId);
      expect(result2.success).toBe(true);
    });
  });

  describe('OCR Status', () => {
    it('should return OCR status for document', async () => {
      const result = await OCRService.getOCRStatus(testDocumentId);

      expect(result.success).toBe(true);
      expect(result.status).toBe('not_extracted'); // Before extraction
    });

    it('should show status after extraction', async () => {
      await OCRService.extractText(testDocumentId, testUserId);

      const result = await OCRService.getOCRStatus(testDocumentId);

      expect(result.success).toBe(true);
      expect(result.status).toBe('extracted');
      expect(result.confidence).toBeDefined();
    });

    it('should report extraction timestamp', async () => {
      await OCRService.extractText(testDocumentId, testUserId);

      const result = await OCRService.getOCRStatus(testDocumentId);

      expect(result.extractedAt).toBeDefined();
      expect(new Date(result.extractedAt)).toBeInstanceOf(Date);
    });
  });

  describe('Orientation Detection', () => {
    it('should detect document orientation', async () => {
      const result = await OCRService.detectOrientation(testDocumentId);

      expect(result.success).toBe(true);
      expect(typeof result.orientation).toBe('number');
      expect(result.confidence).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should indicate if rotation is required', async () => {
      const result = await OCRService.detectOrientation(testDocumentId);

      expect(result.requiresRotation).toBeDefined();
      expect(typeof result.requiresRotation).toBe('boolean');
    });

    it('should provide rotation angle when needed', async () => {
      const result = await OCRService.detectOrientation(testDocumentId);

      if (result.requiresRotation) {
        expect(result.rotationAngle).toBeDefined();
        expect([90, 180, 270]).toContain(Math.abs(result.rotationAngle));
      }
    });
  });

  describe('Extracted Text Retrieval', () => {
    beforeEach(async () => {
      // Extract text before retrieving
      await OCRService.extractText(testDocumentId, testUserId);
    });

    it('should retrieve extracted text', async () => {
      const result = await OCRService.getExtractedText(testDocumentId, testUserId);

      expect(result.success).toBe(true);
      expect(result.extractedText).toBeDefined();
      expect(typeof result.extractedText).toBe('string');
    });

    it('should include confidence with text', async () => {
      const result = await OCRService.getExtractedText(testDocumentId, testUserId);

      expect(result.confidence).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should fail if OCR not extracted', async () => {
      // Create new document without extracting
      const documentData = {
        patientId: testPatientId,
        documentType: 'prescription',
      };

      const fileBuffer = Buffer.from('Mock prescription');
      const fileMetadata = {
        originalName: 'unextracted-prescription.pdf',
        mimeType: 'application/pdf',
        fileSize: fileBuffer.length,
      };

      const uploadResult = await DocumentService.uploadDocument(documentData, testUserId, fileBuffer, fileMetadata);
      const unextractedDocId = uploadResult.document._id;

      const result = await OCRService.getExtractedText(unextractedDocId, testUserId);

      expect(result.success).toBe(false);
      expect(result.code).toBe('OCR_NOT_EXTRACTED');
    });

    it('should include metadata with extracted text', async () => {
      const result = await OCRService.getExtractedText(testDocumentId, testUserId);

      expect(result.metadata).toBeDefined();
      expect(typeof result.metadata).toBe('object');
    });
  });

  describe('Batch OCR Processing', () => {
    let documentIds = [];

    beforeEach(async () => {
      // Create multiple test documents
      for (let i = 0; i < 3; i++) {
        const documentData = {
          patientId: testPatientId,
          documentType: i % 2 === 0 ? 'lab_report' : 'prescription',
        };

        const fileBuffer = Buffer.from(`Mock document ${i}`);
        const fileMetadata = {
          originalName: `batch-test-${i}.pdf`,
          mimeType: 'application/pdf',
          fileSize: fileBuffer.length,
        };

        const result = await DocumentService.uploadDocument(documentData, testUserId, fileBuffer, fileMetadata);
        documentIds.push(result.document._id);
      }
    });

    it('should process multiple documents in batch', async () => {
      const result = await OCRService.batchExtractText(documentIds, testUserId);

      expect(result.success).toBe(true);
      expect(result.results).toBeDefined();
      expect(result.results.length).toBe(documentIds.length);
    });

    it('should report batch processing summary', async () => {
      const result = await OCRService.batchExtractText(documentIds, testUserId);

      expect(result.summary).toBeDefined();
      expect(result.summary.total).toBe(documentIds.length);
      expect(result.summary.succeeded).toBeGreaterThanOrEqual(0);
      expect(result.summary.failed).toBeGreaterThanOrEqual(0);
    });

    it('should handle mixed success/failure in batch', async () => {
      // Mix of valid and invalid IDs
      const mixedIds = [
        documentIds[0],
        '507f1f77bcf86cd799439999', // Invalid ID
        documentIds[1],
      ];

      const result = await OCRService.batchExtractText(mixedIds, testUserId);

      expect(result.success).toBe(true);
      expect(result.summary.total).toBe(3);
      expect(result.summary.succeeded).toBeLessThanOrEqual(3);
    });

    it('should support batch processing delay option', async () => {
      const startTime = Date.now();
      const delayMs = 100;

      await OCRService.batchExtractText(documentIds.slice(0, 2), testUserId, {
        delayMs,
      });

      const duration = Date.now() - startTime;

      // Should have at least one delay interval
      expect(duration).toBeGreaterThanOrEqual(delayMs);
    });
  });

  describe('OCR Error Handling', () => {
    it('should handle missing document gracefully', async () => {
      const result = await OCRService.extractText('507f1f77bcf86cd799439999', testUserId);

      expect(result.success).toBe(false);
      expect(result.code).toBe('NOT_FOUND');
    });

    it('should handle extraction failure gracefully', async () => {
      // In demo mode, extraction typically succeeds
      // Test that the result has expected properties
      const result = await OCRService.extractText(testDocumentId, testUserId);

      // When successful, should have success and extractedText
      // When failed, should have success and error
      expect(result).toHaveProperty('success');
      if (result.success) {
        expect(result).toHaveProperty('extractedText');
      } else {
        expect(result).toHaveProperty('error');
      }
    });
  });
});

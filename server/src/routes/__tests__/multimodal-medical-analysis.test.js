/**
 * Integration Tests for Multi-Modal Medical Report Analysis
 * 
 * Tests verify:
 * 1. Laboratory report analysis with OCR text extraction and lab value parsing
 * 2. Chest X-ray detection and routing to inference
 * 3. Unsupported modality (CT, MRI, ultrasound) detection with honest labeling
 * 4. Document classification (laboratory, radiology, imaging, text-report)
 * 5. Authorization and patient isolation
 * 6. Result persistence with isMockData flag accuracy
 * 
 * Note: Real inference skipped (requires PyTorch worker); these tests verify the orchestration
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import Document from '../../models/Document.js';
import LaboratoryResult from '../../models/LaboratoryResult.js';
import RadiologyRecord from '../../models/RadiologyRecord.js';
import Patient from '../../models/Patient.js';
import User from '../../models/User.js';
import app from '../../index.js';

// Test data
let testPatient;
let testDoctor;
let testAuthToken;
let testAuthTokenPatient;

beforeAll(async () => {
  // Create test users
  testPatient = await Patient.create({
    name: 'Test Patient',
    email: 'patient@test.com',
    gender: 'M',
    dateOfBirth: new Date('1990-01-01'),
  });

  testDoctor = await User.create({
    name: 'Test Doctor',
    email: 'doctor@test.com',
    password: 'TestPass123!',
    role: 'DOCTOR',
    isActive: true,
  });

  // Mock authentication tokens
  testAuthToken = 'mock-doctor-token-' + testDoctor._id;
  testAuthTokenPatient = 'mock-patient-token-' + testPatient._id;

  // Mock authentication middleware for testing
  global.mockAuthMiddleware = (req, res, next) => {
    if (req.headers.authorization === `Bearer ${testAuthToken}`) {
      req.user = {
        _id: testDoctor._id,
        role: 'DOCTOR',
        patientId: testPatient._id,
      };
    } else if (req.headers.authorization === `Bearer ${testAuthTokenPatient}`) {
      req.user = {
        _id: testPatient._id,
        role: 'PATIENT',
        patientId: testPatient._id,
      };
    }
    next();
  };
});

afterAll(async () => {
  // Cleanup
  await Patient.deleteMany({});
  await User.deleteMany({});
  await Document.deleteMany({});
  await LaboratoryResult.deleteMany({});
  await RadiologyRecord.deleteMany({});
});

describe('Medical Report Analysis Integration Tests', () => {
  
  describe('Laboratory Report Analysis', () => {
    let labDocument;

    beforeAll(async () => {
      // Create a mock lab report document
      labDocument = await Document.create({
        patientId: testPatient._id,
        uploadedBy: testDoctor._id,
        documentType: 'lab_result',
        fileName: 'CBC_Report_2025-01-15.pdf',
        mimeType: 'application/pdf',
        fileReference: {
          cloudinaryPublicId: 'test-lab-doc-123',
          cloudinaryUrl: 'https://res.cloudinary.com/test/image/upload/test-lab-doc-123',
          fileSize: 45000,
          uploadedAt: new Date(),
        },
        ocrData: {
          extractedText: `
            Laboratory Report
            Patient: Test Patient
            Collection Date: 2025-01-15
            
            Complete Blood Count (CBC)
            
            Test Name | Value | Unit | Reference Range
            Hemoglobin | 14.5 | g/dL | 13.5-17.5
            Hematocrit | 42 | % | 41-53
            WBC | 7.2 | K/uL | 4.5-11.0
            Platelets | 250 | K/uL | 150-400
            Glucose | 105 | mg/dL H | 70-100
            Creatinine | 1.2 | mg/dL | 0.7-1.3
            Sodium | 138 | mEq/L | 136-145
          `,
          confidence: 0.92,
          extractedAt: new Date(),
        },
        ocrStatus: 'extracted',
        processingPipeline: {
          version: 'phase-8.2',
          processedAt: new Date(),
        },
      });
    });

    it('should classify laboratory report correctly', async () => {
      const DocumentClassifier = (await import('../../adapters/DocumentClassifier.js')).default;
      
      const classification = await DocumentClassifier.classify(labDocument);
      
      expect(classification.success).toBe(true);
      expect(classification.documentClass).toBe('laboratory');
      expect(classification.message).toContain('laboratory');
    });

    it('should extract lab values from OCR text', async () => {
      const LabReportExtractor = (await import('../../adapters/LabReportExtractor.js')).default;
      
      const extraction = await LabReportExtractor.extractLabValues(
        labDocument.ocrData.extractedText
      );
      
      expect(extraction.success).toBe(true);
      expect(extraction.values.length).toBeGreaterThan(0);
      
      // Check for specific extracted values
      const hemoglobinValue = extraction.values.find(v => v.testName.includes('hemoglobin'));
      expect(hemoglobinValue).toBeDefined();
      expect(hemoglobinValue.value).toBe('14.5');
      expect(hemoglobinValue.unit).toContain('g/dL');
      
      // Check abnormal detection
      expect(extraction.abnormal.length).toBeGreaterThan(0);
      const abnormalGlucose = extraction.abnormal.find(v => v.testName.includes('glucose'));
      expect(abnormalGlucose).toBeDefined();
      expect(abnormalGlucose.flag).toBe('H'); // High
    });

    it('should create LaboratoryResult with extracted values', async () => {
      const LabReportExtractor = (await import('../../adapters/LabReportExtractor.js')).default;
      
      const extraction = await LabReportExtractor.extractLabValues(
        labDocument.ocrData.extractedText
      );
      
      const labResult = new LaboratoryResult({
        patientId: labDocument.patientId,
        linkedDocument: labDocument._id,
        labName: extraction.labName || 'Unknown Laboratory',
        labTestName: extraction.testName || 'Various Tests',
        sampleCollectionDate: extraction.collectionDate || new Date(),
        resultReceivedDate: new Date(),
        results: extraction.values || [],
        interpretation: extraction.interpretation,
        ocrStatus: 'extracted',
        ocrData: {
          extractedText: labDocument.ocrData.extractedText,
          confidence: labDocument.ocrData.confidence,
          extractedAt: new Date(),
        },
        createdBy: testDoctor._id,
        verificationStatus: 'pending_review',
      });
      
      await labResult.save();
      
      expect(labResult._id).toBeDefined();
      expect(labResult.results.length).toBeGreaterThan(0);
      expect(labResult.verificationStatus).toBe('pending_review');
      expect(labResult.ocrStatus).toBe('extracted');
    });
  });

  describe('Radiology/Imaging Analysis', () => {
    let chestXrayDocument;
    let ctScanDocument;
    let mriDocument;

    beforeAll(async () => {
      // Chest X-ray (supported)
      chestXrayDocument = await Document.create({
        patientId: testPatient._id,
        uploadedBy: testDoctor._id,
        documentType: 'imaging',
        fileName: 'Chest_XRay_PA_2025-01-15.jpg',
        mimeType: 'image/jpeg',
        fileReference: {
          cloudinaryPublicId: 'test-cxr-doc-123',
          cloudinaryUrl: 'https://res.cloudinary.com/test/image/upload/test-cxr-doc-123',
          fileSize: 250000,
          uploadedAt: new Date(),
          imageWidth: 2048,
          imageHeight: 2048,
        },
      });

      // CT Scan (unsupported)
      ctScanDocument = await Document.create({
        patientId: testPatient._id,
        uploadedBy: testDoctor._id,
        documentType: 'imaging',
        fileName: 'CT_Chest_Series_001.dcm',
        mimeType: 'application/dicom',
        fileReference: {
          cloudinaryPublicId: 'test-ct-doc-456',
          cloudinaryUrl: 'https://res.cloudinary.com/test/image/upload/test-ct-doc-456',
          fileSize: 5000000,
          uploadedAt: new Date(),
        },
      });

      // MRI (unsupported)
      mriDocument = await Document.create({
        patientId: testPatient._id,
        uploadedBy: testDoctor._id,
        documentType: 'imaging',
        fileName: 'MRI_Brain_T1_2025-01-15.nii',
        mimeType: 'image/nii',
        fileReference: {
          cloudinaryPublicId: 'test-mri-doc-789',
          cloudinaryUrl: 'https://res.cloudinary.com/test/image/upload/test-mri-doc-789',
          fileSize: 3000000,
          uploadedAt: new Date(),
        },
      });
    });

    it('should detect chest X-ray modality correctly', async () => {
      const DocumentClassifier = (await import('../../adapters/DocumentClassifier.js')).default;
      const ModalityDetector = (await import('../../adapters/ModalityDetector.js')).default;
      
      const classification = await DocumentClassifier.classify(chestXrayDocument);
      expect(classification.documentClass).toBe('radiology');
      
      const modality = await ModalityDetector.detect(chestXrayDocument, classification);
      
      expect(modality.success).toBe(true);
      expect(modality.modality).toBe('chest_xray');
      expect(modality.isSupported).toBe(true);
      expect(modality.anatomicalRegion).toBe('chest');
    });

    it('should detect CT scan and mark as unsupported', async () => {
      const DocumentClassifier = (await import('../../adapters/DocumentClassifier.js')).default;
      const ModalityDetector = (await import('../../adapters/ModalityDetector.js')).default;
      
      const classification = await DocumentClassifier.classify(ctScanDocument);
      const modality = await ModalityDetector.detect(ctScanDocument, classification);
      
      expect(modality.success).toBe(true);
      expect(modality.modality).toBe('ct_scan');
      expect(modality.isSupported).toBe(false);
      expect(modality.message).toContain('not available');
    });

    it('should detect MRI and mark as unsupported', async () => {
      const DocumentClassifier = (await import('../../adapters/DocumentClassifier.js')).default;
      const ModalityDetector = (await import('../../adapters/ModalityDetector.js')).default;
      
      const classification = await DocumentClassifier.classify(mriDocument);
      const modality = await ModalityDetector.detect(mriDocument, classification);
      
      expect(modality.success).toBe(true);
      expect(modality.modality).toBe('mri');
      expect(modality.isSupported).toBe(false);
    });

    it('should validate image format', async () => {
      const ImagePreprocessor = (await import('../../adapters/ImagePreprocessor.js')).default;
      
      const validation = await ImagePreprocessor.validateImage(
        chestXrayDocument,
        { modality: 'chest_xray' }
      );
      
      expect(validation.valid).toBe(true);
      expect(validation.format).toBe('jpeg');
    });

    it('should assess image dimensions', async () => {
      const ImagePreprocessor = (await import('../../adapters/ImagePreprocessor.js')).default;
      
      const validation = await ImagePreprocessor.validateImage(
        chestXrayDocument,
        { modality: 'chest_xray' }
      );
      
      expect(validation.width).toBe(2048);
      expect(validation.height).toBe(2048);
      expect(validation.issues.length).toBe(0);
    });
  });

  describe('Document Classification', () => {
    let documents;

    beforeAll(async () => {
      documents = await Promise.all([
        Document.create({
          patientId: testPatient._id,
          uploadedBy: testDoctor._id,
          documentType: 'lab_result',
          fileName: 'blood_test_2025-01-15.pdf',
          mimeType: 'application/pdf',
        }),
        Document.create({
          patientId: testPatient._id,
          uploadedBy: testDoctor._id,
          documentType: 'radiology_report',
          fileName: 'Chest_Xray_Report.pdf',
          mimeType: 'application/pdf',
        }),
        Document.create({
          patientId: testPatient._id,
          uploadedBy: testDoctor._id,
          documentType: 'discharge_summary',
          fileName: 'Discharge_Summary_2025.txt',
          mimeType: 'text/plain',
        }),
        Document.create({
          patientId: testPatient._id,
          uploadedBy: testDoctor._id,
          documentType: 'other',
          fileName: 'random_document.pdf',
          mimeType: 'application/pdf',
        }),
      ]);
    });

    it('should classify laboratory document', async () => {
      const DocumentClassifier = (await import('../../adapters/DocumentClassifier.js')).default;
      
      const classification = await DocumentClassifier.classify(documents[0]);
      expect(classification.documentClass).toBe('laboratory');
    });

    it('should classify radiology document', async () => {
      const DocumentClassifier = (await import('../../adapters/DocumentClassifier.js')).default;
      
      const classification = await DocumentClassifier.classify(documents[1]);
      expect(classification.documentClass).toBe('radiology');
    });

    it('should classify text-report document', async () => {
      const DocumentClassifier = (await import('../../adapters/DocumentClassifier.js')).default;
      
      const classification = await DocumentClassifier.classify(documents[2]);
      expect(classification.documentClass).toBe('text-report');
    });

    it('should classify generic document', async () => {
      const DocumentClassifier = (await import('../../adapters/DocumentClassifier.js')).default;
      
      const classification = await DocumentClassifier.classify(documents[3]);
      expect(classification.documentClass).toBe('generic');
    });
  });

  describe('Authorization and Patient Isolation', () => {
    let testDoc;
    let anotherPatient;

    beforeAll(async () => {
      anotherPatient = await Patient.create({
        name: 'Another Patient',
        email: 'another@test.com',
        gender: 'F',
        dateOfBirth: new Date('1985-05-20'),
      });

      testDoc = await Document.create({
        patientId: testPatient._id,
        uploadedBy: testDoctor._id,
        documentType: 'lab_result',
        fileName: 'test_lab.pdf',
        mimeType: 'application/pdf',
        fileReference: {
          cloudinaryPublicId: 'test-doc-auth',
          cloudinaryUrl: 'https://res.cloudinary.com/test/image/upload/test-doc-auth',
          fileSize: 45000,
          uploadedAt: new Date(),
        },
        ocrData: {
          extractedText: 'Test lab data',
          confidence: 0.9,
          extractedAt: new Date(),
        },
      });
    });

    it('should allow doctor to analyze patient document', async () => {
      const MedicalReportAnalysisService = (
        await import('../../services/MedicalReportAnalysisService.js')
      ).default;

      const result = await MedicalReportAnalysisService.analyzeDocument(
        testDoc._id,
        {
          _id: testDoctor._id,
          role: 'DOCTOR',
          patientId: testPatient._id,
        },
        {}
      );

      expect(result.success).toBe(true);
    });

    it('should prevent unauthorized access', async () => {
      const MedicalReportAnalysisService = (
        await import('../../services/MedicalReportAnalysisService.js')
      ).default;

      const result = await MedicalReportAnalysisService.analyzeDocument(
        testDoc._id,
        {
          _id: anotherPatient._id,
          role: 'PATIENT',
          patientId: anotherPatient._id,
        },
        {}
      );

      expect(result.success).toBe(false);
      expect(result.code).toBe('UNAUTHORIZED');
    });
  });

  describe('isMockData Flag Accuracy', () => {
    it('should set isMockData false for real OCR extraction', async () => {
      const labDoc = await Document.create({
        patientId: testPatient._id,
        uploadedBy: testDoctor._id,
        documentType: 'lab_result',
        fileName: 'real_lab_report.pdf',
        mimeType: 'application/pdf',
        fileReference: {
          cloudinaryPublicId: 'test-real-lab',
          cloudinaryUrl: 'https://res.cloudinary.com/test/image/upload/test-real-lab',
          fileSize: 45000,
          uploadedAt: new Date(),
        },
        ocrData: {
          extractedText: 'Hemoglobin: 14.5 g/dL, WBC: 7.2 K/uL',
          confidence: 0.92,
          extractedAt: new Date(),
        },
        ocrStatus: 'extracted',
      });

      const MedicalReportAnalysisService = (
        await import('../../services/MedicalReportAnalysisService.js')
      ).default;

      const result = await MedicalReportAnalysisService.analyzeDocument(
        labDoc._id,
        {
          _id: testDoctor._id,
          role: 'DOCTOR',
          patientId: testPatient._id,
        },
        {}
      );

      expect(result.result).toBeDefined();
      expect(result.result.isMockData).toBe(false);
    });

    it('should mark unsupported modality clearly (not as mock)', async () => {
      const ctDoc = await Document.create({
        patientId: testPatient._id,
        uploadedBy: testDoctor._id,
        documentType: 'imaging',
        fileName: 'CT_scan.dcm',
        mimeType: 'application/dicom',
        fileReference: {
          cloudinaryPublicId: 'test-ct-mock',
          cloudinaryUrl: 'https://res.cloudinary.com/test/image/upload/test-ct-mock',
          fileSize: 5000000,
          uploadedAt: new Date(),
        },
      });

      const MedicalReportAnalysisService = (
        await import('../../services/MedicalReportAnalysisService.js')
      ).default;

      const result = await MedicalReportAnalysisService.analyzeDocument(
        ctDoc._id,
        {
          _id: testDoctor._id,
          role: 'DOCTOR',
          patientId: testPatient._id,
        },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result.isMockData).toBe(false); // Not mock, just unsupported
      expect(result.result.message).toContain('not available');
    });
  });
});

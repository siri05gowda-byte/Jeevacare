import Document from '../models/Document.js';
import ClinicalAuthorizationBoundary from '../utils/clinicalAuthorizationBoundary.js';
import AuditService from './AuditService.js';
import TimelineService from './TimelineService.js';
import CloudinaryAdapter from '../adapters/CloudinaryAdapter.js';
import logger from '../utils/logger.js';
import { ValidationError } from '../utils/errors.js';

/**
 * DocumentService — Medical document lifecycle management
 * Handles upload, verification, authorization, audit, timeline integration
 */
class DocumentService {
  /**
   * Upload a medical document
   */
  static async uploadDocument(documentData, requesterId, fileBuffer, fileMetadata = {}) {
    try {
      const { patientId, documentType, category, documentDate = new Date() } = documentData;

      // ===== AUTHORIZATION CHECK =====
      const authResult = await ClinicalAuthorizationBoundary.canAccessPatientRecords(
        requesterId,
        patientId
      );

      if (!authResult.authorized) {
        await AuditService.logEvent({
          actor: requesterId,
          action: 'document_uploaded',
          patient: patientId,
          status: 'denied',
          statusMessage: `Authorization failed: ${authResult.error}`,
          sensitivityLevel: 'high',
        });

        return {
          success: false,
          error: 'Not authorized to upload documents for this patient',
          code: 'UNAUTHORIZED',
        };
      }

      // ===== VALIDATION =====
      if (!documentType) {
        throw new ValidationError('documentType is required');
      }

      if (!fileBuffer || fileBuffer.length === 0) {
        throw new ValidationError('File buffer is empty');
      }

      // ===== FILE HANDLING =====
      let uploadResult;
      try {
        uploadResult = await CloudinaryAdapter.uploadFile(fileBuffer, {
          folder: `jeevacare/documents/${patientId}`,
          resourceType: 'auto',
          fileName: fileMetadata.originalName,
        });
      } catch (uploadError) {
        logger.error(`Document upload to Cloudinary failed: ${uploadError.message}`);
        throw uploadError;
      }

      // ===== CREATE DOCUMENT RECORD =====
      const document = new Document({
        patientId,
        uploadedBy: requesterId,
        documentType,
        category: category || documentType,
        fileName: fileMetadata.originalName || `document-${Date.now()}`,
        mimeType: fileMetadata.mimeType || 'application/octet-stream',
        fileReference: {
          cloudinaryPublicId: uploadResult.publicId,
          cloudinaryUrl: uploadResult.url,
          fileSize: fileMetadata.fileSize || 0,
          uploadedAt: new Date(),
        },
        verificationStatus: 'patient_uploaded',
        metadata: {
          documentDate,
          issuingFacility: documentData.issuingFacility || null,
          issuingProvider: documentData.issuingProvider || null,
        },
        createdBy: requesterId,
      });

      // ===== SET CONTENT HASH FOR IMMUTABILITY =====
      document.setContentHash(fileBuffer);

      const savedDocument = await document.save();

      // ===== TIMELINE INTEGRATION =====
      try {
        await TimelineService.addEvent({
          patientId,
          eventType: 'document_uploaded',
          sourceType: 'document',
          sourceId: savedDocument._id,
          title: `${category || documentType} uploaded`,
          description: `${fileMetadata.originalName || 'Document'} uploaded to JeevaCare`,
          timestamp: new Date(),
          facility: null,
          provider: requesterId,
          verificationStatus: 'patient_uploaded',
        });
      } catch (timelineError) {
        logger.warn(`Failed to add document to timeline: ${timelineError.message}`);
        // Continue anyway — document is saved
      }

      // ===== AUDIT LOGGING =====
      await AuditService.logEvent({
        actor: requesterId,
        action: 'document_uploaded',
        patient: patientId,
        resource: savedDocument._id,
        resourceType: 'document',
        status: 'success',
        details: {
          documentType,
          fileName: fileMetadata.originalName,
          fileSize: fileMetadata.fileSize,
          cloudinaryId: uploadResult.publicId,
        },
        sensitivityLevel: 'medium',
      });

      logger.info(`Document uploaded for patient ${patientId}: ${savedDocument._id}`);

      return {
        success: true,
        document: this.sanitizeDocument(savedDocument),
      };
    } catch (error) {
      logger.error(`Document upload error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieve document by ID with authorization
   */
  static async getDocument(documentId, requesterId) {
    try {
      const document = await Document.findById(documentId)
        .populate('patientId', 'jeevaId')
        .populate('uploadedBy', 'name email')
        .populate('verifiedBy', 'name email');

      if (!document) {
        return {
          success: false,
          error: 'Document not found',
          code: 'NOT_FOUND',
        };
      }

      // ===== AUTHORIZATION =====
      const authResult = await ClinicalAuthorizationBoundary.canAccessPatientRecords(
        requesterId,
        document.patientId._id
      );

      if (!authResult.authorized) {
        await AuditService.logEvent({
          actor: requesterId,
          action: 'document_accessed',
          patient: document.patientId._id,
          resource: documentId,
          status: 'denied',
          statusMessage: 'Unauthorized access',
          sensitivityLevel: 'high',
        });

        return {
          success: false,
          error: 'Not authorized to access this document',
          code: 'UNAUTHORIZED',
        };
      }

      // ===== AUDIT LOG =====
      await AuditService.logEvent({
        actor: requesterId,
        action: 'document_accessed',
        patient: document.patientId._id,
        resource: documentId,
        status: 'success',
        sensitivityLevel: 'medium',
      });

      return {
        success: true,
        document: this.sanitizeDocument(document),
      };
    } catch (error) {
      logger.error(`Get document error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all documents for a patient
   */
  static async getPatientDocuments(patientId, requesterId, filters = {}) {
    try {
      // ===== AUTHORIZATION =====
      const authResult = await ClinicalAuthorizationBoundary.canAccessPatientRecords(
        requesterId,
        patientId
      );

      if (!authResult.authorized) {
        return {
          success: false,
          error: 'Not authorized',
          code: 'UNAUTHORIZED',
        };
      }

      const query = {
        patientId,
        deletedAt: { $exists: false },
      };

      if (filters.documentType) {
        query.documentType = filters.documentType;
      }

      if (filters.verificationStatus) {
        query.verificationStatus = filters.verificationStatus;
      }

      if (filters.ocrStatus) {
        query.ocrStatus = filters.ocrStatus;
      }

      const documents = await Document.find(query)
        .populate('uploadedBy', 'name email')
        .populate('verifiedBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(filters.limit || 100);

      return {
        success: true,
        documents: documents.map(doc => this.sanitizeDocument(doc)),
        count: documents.length,
      };
    } catch (error) {
      logger.error(`Get patient documents error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify a document (provider workflow)
   */
  static async verifyDocument(documentId, requesterId, verificationData = {}) {
    try {
      const document = await Document.findById(documentId);

      if (!document) {
        return {
          success: false,
          error: 'Document not found',
          code: 'NOT_FOUND',
        };
      }

      // ===== CHECK VERIFICATION AUTHORITY =====
      // Only healthcare professionals/administrators can verify
      const verifierAuthResult = await ClinicalAuthorizationBoundary.canAccessPatientRecords(
        requesterId,
        document.patientId
      );

      if (!verifierAuthResult.authorized || (verifierAuthResult.user && verifierAuthResult.user.role === 'PATIENT')) {
        return {
          success: false,
          error: 'Not authorized to verify documents',
          code: 'UNAUTHORIZED',
        };
      }

      // ===== UPDATE VERIFICATION STATUS =====
      document.verificationStatus = 'provider_verified';
      document.verifiedBy = requesterId;
      document.verifiedAt = new Date();
      document.verificationNotes = verificationData.notes || '';

      const updatedDocument = await document.save();

      // ===== TIMELINE UPDATE =====
      try {
        await TimelineService.addEvent({
          patientId: document.patientId,
          eventType: 'document_verified',
          sourceType: 'document',
          sourceId: documentId,
          title: `${document.category} verified`,
          description: `Document verified by healthcare provider`,
          timestamp: new Date(),
          facility: null,
          provider: requesterId,
          verificationStatus: 'provider_verified',
        });
      } catch (timelineError) {
        logger.warn(`Failed to update timeline: ${timelineError.message}`);
      }

      // ===== AUDIT =====
      await AuditService.logEvent({
        actor: requesterId,
        action: 'document_verified',
        patient: document.patientId,
        resource: documentId,
        status: 'success',
        details: {
          verificationNotes: verificationData.notes,
        },
        sensitivityLevel: 'medium',
      });

      return {
        success: true,
        document: this.sanitizeDocument(updatedDocument),
      };
    } catch (error) {
      logger.error(`Document verification error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Request correction for a document (patient workflow)
   */
  static async requestCorrection(documentId, requesterId, correctionData = {}) {
    try {
      const document = await Document.findById(documentId)
        .populate('patientId', 'userId');

      if (!document) {
        return {
          success: false,
          error: 'Document not found',
          code: 'NOT_FOUND',
        };
      }

      // ===== AUTHORIZATION — Patient can only request correction on their own docs =====
      // The requesterId should be either the patientId (direct) or the userId linked to the patient
      const isPatientOwner = 
        document.patientId._id.toString() === requesterId.toString() ||
        document.patientId.userId?.toString() === requesterId.toString();

      if (!isPatientOwner) {
        return {
          success: false,
          error: 'Not authorized',
          code: 'UNAUTHORIZED',
        };
      }

      // Create correction request
      document.flaggedAsSensitive = true;
      const updatedDocument = await document.save();

      // ===== AUDIT =====
      await AuditService.logEvent({
        actor: requesterId,
        action: 'correction_request_created',
        patient: document.patientId._id,
        resource: documentId,
        status: 'success',
        details: {
          reason: correctionData.reason,
        },
        sensitivityLevel: 'medium',
      });

      return {
        success: true,
        document: this.sanitizeDocument(updatedDocument),
        message: 'Correction request submitted for review',
      };
    } catch (error) {
      logger.error(`Document correction request error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sanitize document for safe output
   */
  static sanitizeDocument(document) {
    const doc = document.toObject ? document.toObject() : document;

    // Remove sensitive fields if needed
    if (doc.fileReference) {
      // Keep cloudinary URL but not internal details if needed
    }

    return doc;
  }

  /**
   * Delete document (soft delete)
   */
  static async deleteDocument(documentId, requesterId) {
    try {
      const document = await Document.findById(documentId);

      if (!document) {
        return {
          success: false,
          error: 'Document not found',
          code: 'NOT_FOUND',
        };
      }

      // ===== AUTHORIZATION =====
      const authResult = await ClinicalAuthorizationBoundary.canAccessPatientRecords(
        requesterId,
        document.patientId
      );

      if (!authResult.authorized) {
        return {
          success: false,
          error: 'Not authorized',
          code: 'UNAUTHORIZED',
        };
      }

      // ===== SOFT DELETE =====
      document.deletedAt = new Date();
      document.deletedBy = requesterId;
      const deletedDocument = await document.save();

      // ===== AUDIT =====
      await AuditService.logEvent({
        actor: requesterId,
        action: 'document_deleted',
        patient: document.patientId,
        resource: documentId,
        status: 'success',
        sensitivityLevel: 'high',
      });

      return {
        success: true,
        message: 'Document deleted',
      };
    } catch (error) {
      logger.error(`Document deletion error: ${error.message}`);
      throw error;
    }
  }
}

export default DocumentService;

/**
 * Document Classifier
 * Detects document type based on filename, MIME type, and content patterns
 */

import logger from '../utils/logger.js';

class DocumentClassifier {
  /**
   * Classify document into category
   * Returns: { success: boolean, documentClass: string, message: string }
   * 
   * Categories:
   * - laboratory: Blood tests, biochemistry, urinalysis, etc.
   * - radiology: Chest X-rays, radiographs, general radiology
   * - imaging: CT, MRI, ultrasound, mammography, other advanced imaging
   * - text-report: Discharge summaries, clinical notes, prescriptions
   * - generic: Unclassifiable documents
   */
  static async classify(document) {
    try {
      const fileName = (document.fileName || '').toLowerCase();
      const mimeType = document.mimeType || '';
      const docType = (document.documentType || '').toLowerCase();

      logger.info(`[DocumentClassifier] Classifying: ${document.fileName}`);

      // Radiology reports (PDF, text reports of X-rays, etc.) - CHECK FIRST
      if (docType === 'radiology_report' || 
          fileName.includes('xray') || 
          fileName.includes('x-ray') ||
          fileName.includes('radiograph') ||
          (fileName.includes('report') && (fileName.includes('chest') || fileName.includes('thorax')))) {
        return { 
          success: true, 
          documentClass: 'radiology',
          message: 'Detected radiology report/radiograph'
        };
      }

      // Laboratory reports
      if (this._isLabReport(fileName, docType)) {
        return { 
          success: true, 
          documentClass: 'laboratory',
          message: 'Detected laboratory/blood test report'
        };
      }

      // Imaging documents (general) - IMAGE FILES
      if (mimeType.startsWith('image/')) {
        // Further determine if chest X-ray, bone X-ray, CT, MRI, etc.
        const modalityHint = this._extractModalityHint(fileName);
        
        if (modalityHint === 'ct' || modalityHint === 'mri' || 
            modalityHint === 'ultrasound' || modalityHint === 'mammography') {
          return {
            success: true,
            documentClass: 'imaging',
            modalityHint: modalityHint,
            message: `Detected ${modalityHint.toUpperCase()} imaging`
          };
        }
        
        // Default imaging to radiology (general X-rays)
        return {
          success: true,
          documentClass: 'radiology',
          modalityHint: 'xray',
          message: 'Detected radiology image (likely X-ray)'
        };
      }

      // Text-based reports (PDF, Word, TXT)
      if (docType.includes('discharge') || docType.includes('clinical') || 
          docType.includes('prescription') || docType.includes('note')) {
        return {
          success: true,
          documentClass: 'text-report',
          message: 'Detected text-based medical report'
        };
      }

      // Generic/unclassifiable
      return {
        success: true,
        documentClass: 'generic',
        message: 'Unable to determine specific document type'
      };

    } catch (error) {
      logger.error(`[DocumentClassifier] Classification error: ${error.message}`);
      return {
        success: false,
        documentClass: 'generic',
        message: `Classification failed: ${error.message}`
      };
    }
  }

  static _isLabReport(fileName, docType) {
    const labKeywords = [
      'lab', 'blood', 'test', 'report', 'CBC', 'complete blood count',
      'biochem', 'metabolic', 'liver', 'kidney', 'lipid', 'glucose',
      'urinalysis', 'urine', 'pathology', 'bilirubin', 'creatinine',
      'hemoglobin', 'glucose', 'triglyceride'
    ];

    // Check if it's explicitly a lab report
    const isLab = labKeywords.some(keyword => 
      fileName.includes(keyword.toLowerCase()) || 
      docType.toLowerCase().includes(keyword.toLowerCase())
    );

    // Explicitly exclude radiology reports
    const isNotRadiology = !fileName.includes('xray') && 
                          !fileName.includes('x-ray') && 
                          !docType.includes('radiology') &&
                          !docType.includes('chest') &&
                          !docType.includes('radiograph');

    return isLab && isNotRadiology;
  }

  static _extractModalityHint(fileName) {
    const hints = {
      'ct': ['ct', 'computed tomography', 'ct_scan', 'ctscan'],
      'mri': ['mri', 'magnetic resonance', 'mri_scan', 'mriscan'],
      'ultrasound': ['ultrasound', 'sono', 'sonography', 'us_', 'echo'],
      'mammography': ['mammo', 'breast', 'mammogram'],
      'xray': ['xray', 'x-ray', 'radiograph', 'chest', 'bone', 'skull', 'spine', 'dental']
    };

    for (const [modality, keywords] of Object.entries(hints)) {
      if (keywords.some(kw => fileName.includes(kw))) {
        return modality;
      }
    }

    return 'unknown';
  }
}

export default DocumentClassifier;

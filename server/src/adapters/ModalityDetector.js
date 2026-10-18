/**
 * Modality Detector
 * 
 * Detects imaging modality from document metadata, filename, and file headers
 * Identifies: chest X-ray, bone X-ray, CT, MRI, ultrasound, mammography, etc.
 * 
 * Returns honest assessment: supported for chest/bone X-ray only
 * All other modalities marked as "detected but inference unavailable"
 */

import logger from '../utils/logger.js';

class ModalityDetector {
  /**
   * Detect imaging modality from document
   * Returns: { modality, confidence, anatomicalRegion, bodyPart, isSupported, message }
   */
  static async detect(document, classification = {}) {
    try {
      const fileName = (document.fileName || '').toLowerCase();
      const docType = document.documentType || '';
      const mimeType = document.mimeType || '';

      logger.info(`[ModalityDetector] Detecting modality: ${document.fileName}`);

      // Extract all clues
      const filenameHint = this._analyzeFilename(fileName);
      const docTypeHint = this._analyzeDocType(docType);
      const classificationHint = classification.modalityHint || null;

      // Consolidate evidence
      const modality = this._determineModality(filenameHint, docTypeHint, classificationHint);
      const anatomicalRegion = this._determineAnatomicalRegion(modality, fileName);
      const confidence = this._calculateConfidence(filenameHint, docTypeHint, classificationHint);
      const isSupported = this._isModalitySupported(modality);

      logger.info(`[ModalityDetector] Detected: ${modality} (confidence: ${confidence})`);

      return {
        success: true,
        modality: modality,
        confidence: confidence,
        anatomicalRegion: anatomicalRegion,
        bodyPart: anatomicalRegion,
        isSupported: isSupported,
        supportedModalities: ['chest_xray', 'bone_xray'],
        message: isSupported 
          ? `${modality.toUpperCase()} detected and ready for AI analysis`
          : `${modality.toUpperCase()} detected but AI inference not available for this modality`,
        details: {
          fileNameHint: filenameHint,
          docTypeHint: docTypeHint,
          classificationHint: classificationHint
        }
      };

    } catch (error) {
      logger.error(`[ModalityDetector] Detection error: ${error.message}`);
      return {
        success: false,
        modality: 'unknown',
        confidence: 0,
        anatomicalRegion: 'unknown',
        isSupported: false,
        error: error.message,
        message: 'Unable to determine modality'
      };
    }
  }

  /**
   * Analyze filename for modality clues - prioritize specific modalities
   */
  static _analyzeFilename(fileName) {
    const clues = {
      ct: ['ct', 'ct_scan', 'ctscan', 'computed tomography', 'helical', 'multi-detector', 'computed_tomography'],
      mri: ['mri', 'mr_imaging', 'mri_scan', 'magnetic resonance', 'mriscan', 'fmri', 'magnetic_resonance'],
      bone_xray: ['bone', 'fracture', 'extremity', 'limb', 'humerus', 'femur', 'tibia', 'fibula', 'forearm', 'wrist', 'ankle', 'knee', 'shoulder', 'spine', 'pelvis', 'elbow'],
      ultrasound: ['ultrasound', 'sono', 'sonography', 'us_', 'echo', 'doppler', 'echo_'],
      mammography: ['mammo', 'mammogram', 'breast', 'mammography'],
      pet: ['pet', 'positron emission', 'pet_scan'],
      dexa: ['dexa', 'bone density', 'dual energy x-ray'],
      fluoroscopy: ['fluoro', 'fluoroscopy', 'barium'],
      chest_xray: ['chest', 'cxr', 'chest_xray', 'chestx-ray', 'pa', 'ap', 'erect', 'thorax', 'lungs', 'pa_view', 'ap_view'],
      xray_generic: ['radiograph', 'radiography', 'plain film', 'plain radiograph']
    };

    const detected = {};
    for (const [modality, keywords] of Object.entries(clues)) {
      for (const keyword of keywords) {
        if (fileName.includes(keyword)) {
          detected[modality] = (detected[modality] || 0) + 1;
        }
      }
    }

    return detected;
  }

  /**
   * Analyze document type for modality clues
   */
  static _analyzeDocType(docType) {
    docType = (docType || '').toLowerCase();

    if (docType.includes('ct')) return { ct: 2 };
    if (docType.includes('mri')) return { mri: 2 };
    if (docType.includes('ultrasound') || docType.includes('sono')) return { ultrasound: 2 };
    if (docType.includes('mammo') || docType.includes('breast')) return { mammography: 2 };
    if (docType.includes('pet')) return { pet: 2 };
    if (docType.includes('x-ray') || docType.includes('radiograph')) return { xray_generic: 1 };

    return {};
  }

  /**
   * Determine final modality from all clues
   */
  static _determineModality(filenameHint, docTypeHint, classificationHint) {
    // Combine evidence with priority: classification > docType > filename
    const allClues = {};

    // Add filename hints with lower weight
    for (const [k, v] of Object.entries(filenameHint)) {
      allClues[k] = (allClues[k] || 0) + v;
    }

    // Add docType hints with higher weight
    for (const [k, v] of Object.entries(docTypeHint)) {
      allClues[k] = (allClues[k] || 0) + (v * 1.5);
    }

    // Classification hint is strongest signal (add as bonus)
    if (classificationHint === 'ct') allClues['ct'] = (allClues['ct'] || 0) + 10; // Strong signal
    if (classificationHint === 'mri') allClues['mri'] = (allClues['mri'] || 0) + 10;
    if (classificationHint === 'ultrasound') allClues['ultrasound'] = (allClues['ultrasound'] || 0) + 10;
    if (classificationHint === 'mammography') allClues['mammography'] = (allClues['mammography'] || 0) + 10;
    if (classificationHint === 'xray') allClues['chest_xray'] = (allClues['chest_xray'] || 0) + 2; // Weaker default

    // Suppression rules: if we have specific modality evidence, suppress less-specific ones
    // If CT is present (any score), suppress chest_xray completely (they overlap)
    if (allClues['ct'] && allClues['ct'] > 0) {
      delete allClues['chest_xray'];
    }
    
    // If MRI is present, suppress everything generic
    if (allClues['mri'] && allClues['mri'] > 0) {
      delete allClues['chest_xray'];
      delete allClues['xray_generic'];
      delete allClues['bone_xray'];
    }

    // If bone_xray has good score, suppress ct
    if (allClues['bone_xray'] && allClues['bone_xray'] > 1) {
      if (allClues['ct']) delete allClues['ct'];
      if (allClues['chest_xray']) delete allClues['chest_xray'];
    }

    // Find highest scoring modality
    let bestModality = 'unknown';
    let bestScore = 0;

    for (const [modality, score] of Object.entries(allClues)) {
      if (score > bestScore) {
        bestScore = score;
        bestModality = modality;
      }
    }

    // Map internal codes to standard modalities
    return this._mapModality(bestModality);
  }

  /**
   * Map internal modality codes to standard names
   */
  static _mapModality(internalCode) {
    const mapping = {
      'chest_xray': 'chest_xray',
      'bone_xray': 'bone_xray',
      'xray_generic': 'radiograph',
      'ct': 'ct_scan',
      'mri': 'mri',
      'ultrasound': 'ultrasound',
      'mammography': 'mammography',
      'pet': 'pet_scan',
      'dexa': 'dexa_scan',
      'fluoroscopy': 'fluoroscopy',
      'unknown': 'unknown'
    };

    return mapping[internalCode] || 'unknown';
  }

  /**
   * Determine anatomical region from modality and filename
   */
  static _determineAnatomicalRegion(modality, fileName) {
    const regionClues = {
      chest: ['chest', 'cxr', 'pa', 'ap', 'erect', 'lungs', 'thorax'],
      abdomen: ['abdomen', 'abd', 'abdominal', 'pelvis', 'pelvic'],
      spine: ['spine', 'vertebra', 'cervical', 'thoracic', 'lumbar', 'sacral'],
      extremity: ['extremity', 'limb', 'humerus', 'femur', 'tibia', 'fibula', 'radius', 'ulna'],
      head: ['head', 'skull', 'brain', 'intracranial', 'face'],
      breast: ['breast', 'mammo'],
      pelvis: ['pelvis', 'pelvic', 'hip'],
      neck: ['neck', 'cervical'],
      shoulder: ['shoulder', 'clavicle', 'scapula']
    };

    for (const [region, keywords] of Object.entries(regionClues)) {
      for (const keyword of keywords) {
        if (fileName.includes(keyword)) {
          return region;
        }
      }
    }

    // Infer from modality
    if (modality === 'chest_xray') return 'chest';
    if (modality === 'bone_xray') return 'extremity';
    if (modality === 'mammography') return 'breast';

    return 'unknown';
  }

  /**
   * Calculate confidence score (0-1) based on evidence strength
   */
  static _calculateConfidence(filenameHint, docTypeHint, classificationHint) {
    let confidence = 0;

    // Classification hint is strongest evidence
    if (classificationHint) confidence += 0.5;

    // Filename hints
    if (Object.keys(filenameHint).length > 0) {
      const maxScore = Math.max(...Object.values(filenameHint));
      confidence += Math.min(0.3, maxScore * 0.1);
    }

    // DocType hints
    if (Object.keys(docTypeHint).length > 0) {
      confidence += 0.2;
    }

    return Math.min(1.0, confidence);
  }

  /**
   * Check if modality is supported for AI inference
   * Currently: chest X-ray and bone X-ray only
   */
  static _isModalitySupported(modality) {
    const supported = ['chest_xray', 'bone_xray'];
    return supported.includes(modality);
  }

  /**
   * Validate image file format and dimensions (preliminary)
   * Note: Full validation deferred to ImagePreprocessor
   */
  static async validateImageFormat(document) {
    try {
      const fileName = document.fileName || '';
      const mimeType = document.mimeType || '';

      // Supported image formats
      const supportedFormats = ['image/jpeg', 'image/png', 'image/jpg', 'image/dicom'];
      const supportedExtensions = ['.jpg', '.jpeg', '.png', '.dcm', '.dicom'];

      const isValidFormat = supportedFormats.includes(mimeType) ||
        supportedExtensions.some(ext => fileName.toLowerCase().endsWith(ext));

      return {
        success: isValidFormat,
        format: mimeType,
        message: isValidFormat ? 'Valid image format' : 'Unsupported image format'
      };

    } catch (error) {
      logger.error(`[ModalityDetector] Format validation error: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default ModalityDetector;

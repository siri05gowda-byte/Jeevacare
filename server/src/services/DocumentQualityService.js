import TesseractOCRAdapter from '../adapters/TesseractOCRAdapter.js';
import logger from '../utils/logger.js';

/**
 * DocumentQualityService — Real image quality assessment for documents and radiology
 * 
 * Provides pixel-based analysis for:
 * - Blur/sharpness detection
 * - Contrast measurement
 * - Brightness/exposure evaluation
 * - Cropping and edge visibility
 * - Orientation checking
 * - Resolution validation
 * 
 * Distinguishes between:
 * - Generic document quality
 * - Radiology-specific quality (more stringent requirements)
 * - Per-check findings with confidence/uncertainty indicators
 */
class DocumentQualityService {
  /**
   * Assess document image quality using real pixel analysis
   * Returns detailed findings from per-check analysis
   */
  static async assessDocumentQuality(imageBuffer) {
    try {
      logger.info('Performing real document quality assessment');
      const qualityResult = await TesseractOCRAdapter.assessQuality(imageBuffer);

      if (!qualityResult.success) {
        return {
          success: false,
          error: qualityResult.error,
          qualityScore: 0,
          qualityStatus: 'error',
          processable: false,
          checks: {},
          issues: [],
        };
      }

      // Extract individual check results
      const checks = qualityResult.checks || {};
      const issues = qualityResult.issues || [];

      return {
        success: true,
        qualityScore: qualityResult.score,
        qualityStatus: this.mapScoreToStatus(qualityResult.score),
        processable: qualityResult.score >= 50,
        feedback: qualityResult.feedback,
        recommendations: qualityResult.recommendations || [],
        assessedAt: new Date(),
        
        // Detailed per-check findings
        checks: {
          resolution: checks.resolution ? {
            name: 'Resolution',
            pass: checks.resolution.pass,
            finding: checks.resolution.finding,
            details: checks.resolution,
          } : null,
          blur: checks.blur ? {
            name: 'Sharpness',
            pass: checks.blur.pass,
            finding: checks.blur.finding,
            variance: checks.blur.variance,
            threshold: checks.blur.threshold,
          } : null,
          contrast: checks.contrast ? {
            name: 'Contrast',
            pass: checks.contrast.pass,
            finding: checks.contrast.finding,
            ratio: checks.contrast.contrastRatio,
          } : null,
          brightness: checks.brightness ? {
            name: 'Exposure',
            pass: checks.brightness.pass,
            finding: checks.brightness.finding,
            overexposure: checks.brightness.overexposurePercent,
            underexposure: checks.brightness.underexposurePercent,
          } : null,
          cropping: checks.cropping ? {
            name: 'Cropping',
            pass: checks.cropping.pass,
            finding: checks.cropping.finding,
          } : null,
          orientation: checks.orientation ? {
            name: 'Orientation',
            pass: checks.orientation.pass,
            finding: checks.orientation.finding,
            format: checks.orientation.format,
          } : null,
        },
        
        // User-friendly issue mapping
        issues: this.mapIssuesToUserFriendly(issues),
      };
    } catch (error) {
      logger.error(`Document quality assessment error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        qualityScore: 0,
        qualityStatus: 'error',
        processable: false,
        checks: {},
        issues: [],
      };
    }
  }

  /**
   * Map quality score to user-friendly status
   */
  static mapScoreToStatus(score) {
    if (score >= 80) return 'good';
    if (score >= 50) return 'fair';
    if (score >= 0) return 'poor';
    return 'error';
  }

  /**
   * Map technical issues to user-friendly language
   */
  static mapIssuesToUserFriendly(issues) {
    const issueMap = {
      blur: {
        issue: 'Image appears blurry',
        severity: 'high',
        recommendation: 'Hold the camera steady when taking the photo',
      },
      glare: {
        issue: 'Glare or reflection detected',
        severity: 'medium',
        recommendation: 'Move to a position where light does not reflect off the document',
      },
      cropping: {
        issue: 'Document edges are cut off',
        severity: 'high',
        recommendation: 'Ensure all four corners of the document are visible',
      },
      poor_visibility: {
        issue: 'Some text is difficult to read',
        severity: 'high',
        recommendation: 'Improve lighting and try again',
      },
      incorrect_orientation: {
        issue: 'Document appears to be in portrait orientation',
        severity: 'low',
        recommendation: 'Hold the document upright and parallel to the camera',
      },
      low_contrast: {
        issue: 'Poor contrast between text and background',
        severity: 'high',
        recommendation: 'Ensure good lighting to improve contrast',
      },
      low_resolution: {
        issue: 'Image resolution is too low',
        severity: 'high',
        recommendation: 'Move closer to the document for better detail',
      },
    };

    return issues.map(issue => issueMap[issue] || {
      issue: `Issue detected: ${issue}`,
      severity: 'medium',
      recommendation: 'Please retry with a higher quality image',
    });
  }

  /**
   * Get quality guidance messages for user display
   */
  static getQualityGuidance(qualityScore, issues = []) {
    const guidance = {
      title: '',
      message: '',
      tips: [],
      actionRequired: false,
    };

    if (qualityScore >= 80) {
      guidance.title = 'Excellent Quality';
      guidance.message = 'Document quality is excellent. You can proceed with uploading.';
      guidance.tips = ['You are ready to upload this document.'];
    } else if (qualityScore >= 50) {
      guidance.title = 'Fair Quality';
      guidance.message = 'Document quality is acceptable but could be improved for better accuracy.';
      guidance.tips = [
        'Document can be processed, but consider retaking for better results.',
        'Ensure all text is clearly visible.',
        'Avoid shadows and glare.',
        'Hold the camera steady and parallel to the document.',
      ];
      guidance.actionRequired = false;
    } else {
      guidance.title = 'Poor Quality';
      guidance.message = 'Document quality is too low. Please retake the photo.';
      guidance.tips = [
        'Ensure good lighting when capturing documents.',
        'Hold the camera steady and keep it parallel to the document.',
        'Ensure all four corners of the document are visible.',
        'Avoid shadows, glare, and reflections.',
        'Move closer to capture more detail.',
      ];
      guidance.actionRequired = true;
    }

    if (issues.length > 0) {
      guidance.detectedIssues = this.mapIssuesToUserFriendly(issues);
    }

    return guidance;
  }

  /**
   * Assess radiology image quality
   * More stringent thresholds than generic documents
   */
  static async assessRadiologyImageQuality(imageBuffer) {
    try {
      logger.info('Performing radiology image quality assessment');
      const qualityResult = await TesseractOCRAdapter.assessQuality(imageBuffer);

      if (!qualityResult.success) {
        return {
          success: false,
          error: qualityResult.error,
          qualityScore: 0,
          qualityStatus: 'error',
          processable: false,
        };
      }

      // Radiology images have stricter requirements
      const adjustedScore = Math.max(0, qualityResult.score - 10);
      const processable = adjustedScore >= 60; // Higher threshold for radiology

      return {
        success: true,
        qualityScore: adjustedScore,
        qualityStatus: this.mapScoreToStatus(adjustedScore),
        radiologyIssues: this.mapRadiologyIssuesToUserFriendly(qualityResult.issues || []),
        recommendations: this.getRadiologyRecommendations(qualityResult.issues || []),
        processable,
        feedback: qualityResult.feedback || 'Radiology image assessment complete',
        
        // Clinical-specific note
        clinicalNote: processable
          ? 'Image quality is adequate for diagnostic review'
          : 'Image quality may not be sufficient for reliable diagnostic review. Please retake.',
        
        assessedAt: new Date(),
      };
    } catch (error) {
      logger.error(`Radiology quality assessment error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Map radiology-specific issues
   */
  static mapRadiologyIssuesToUserFriendly(issues) {
    const radiologyIssueMap = {
      blur: {
        issue: 'Image motion blur detected',
        severity: 'critical',
        recommendation: 'Ensure steady positioning and adequate immobilization',
      },
      low_contrast: {
        issue: 'Low contrast between tissues',
        severity: 'critical',
        recommendation: 'Verify appropriate exposure and window/level settings',
      },
      cropping: {
        issue: 'Relevant anatomy appears cropped',
        severity: 'critical',
        recommendation: 'Ensure complete field of view with all relevant structures visible',
      },
      poor_visibility: {
        issue: 'Poor visibility of anatomical structures',
        severity: 'critical',
        recommendation: 'Improve image contrast and ensure proper technical parameters',
      },
      incorrect_orientation: {
        issue: 'Image appears to be rotated or inverted',
        severity: 'high',
        recommendation: 'Verify correct anatomical orientation',
      },
      low_resolution: {
        issue: 'Image resolution insufficient for diagnostic detail',
        severity: 'critical',
        recommendation: 'Use higher resolution imaging equipment or parameters',
      },
    };

    return issues.map(issue => radiologyIssueMap[issue] || {
      issue: `Potential issue: ${issue}`,
      severity: 'medium',
      recommendation: 'Consult imaging protocol and retake if necessary',
    });
  }

  /**
   * Get radiology-specific recommendations
   */
  static getRadiologyRecommendations(issues = []) {
    const baseRecommendations = [
      'Verify patient positioning is correct per protocol',
      'Ensure complete anatomical region is captured',
      'Check exposure and window/level settings',
      'Remove any metallic objects or artifacts from the field',
      'Confirm no patient motion during acquisition',
    ];

    if (issues.includes('motion_blur')) {
      baseRecommendations.push('Ensure adequate patient immobilization during capture');
    }

    if (issues.includes('cropping') || issues.includes('truncation')) {
      baseRecommendations.push('Expand field of view to include complete relevant anatomy');
    }

    if (issues.includes('low_contrast')) {
      baseRecommendations.push('Adjust technical parameters for improved tissue contrast');
    }

    return baseRecommendations;
  }

  /**
   * Real-time quality feedback (for frontend live preview)
   */
  static getRealTimeFeedback(qualityScore, status) {
    const feedback = {
      score: qualityScore,
      status,
      icon: status === 'good' ? '✓' : status === 'fair' ? '⚠' : '✗',
      color: status === 'good' ? 'green' : status === 'fair' ? 'yellow' : 'red',
      canProceed: qualityScore >= 50,
      message: this.getQualityMessage(qualityScore, status),
    };

    return feedback;
  }

  /**
   * Get brief quality message
   */
  static getQualityMessage(score, status) {
    if (status === 'good') return 'Image quality is excellent';
    if (status === 'fair') return 'Image quality is acceptable';
    if (status === 'poor') return 'Please improve image quality';
    return 'Unable to assess image quality';
  }
}

export default DocumentQualityService;

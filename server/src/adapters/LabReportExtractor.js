/**
 * Laboratory Report Extractor
 * 
 * Parses lab values, reference ranges, and abnormal flags from OCR-extracted text
 * Uses regex patterns to identify common lab test formats and values
 * Supports: CBC, metabolic panels, liver function, kidney function, lipid panels, etc.
 */

import logger from '../utils/logger.js';

class LabReportExtractor {
  /**
   * Extract lab values from OCR-extracted text
   * Returns: { success, values, testName, collectionDate, labName, interpretation, abnormal, limitations, message }
   */
  static async extractLabValues(extractedText) {
    try {
      if (!extractedText || typeof extractedText !== 'string') {
        return {
          success: false,
          values: [],
          message: 'No extracted text provided',
          limitations: ['Unable to parse OCR output']
        };
      }

      logger.info('[LabReportExtractor] Parsing lab values from extracted text');

      // Clean and normalize text
      const normalizedText = this._normalizeText(extractedText);

      // Extract lab values using regex patterns
      const labValues = this._extractLabValues(normalizedText);
      
      // Detect lab name and test type
      const labName = this._detectLabName(normalizedText);
      const testName = this._detectTestName(normalizedText);
      
      // Extract dates
      const collectionDate = this._extractDate(normalizedText);
      
      // Identify abnormal results
      const abnormalResults = labValues.filter(v => v.isAbnormal);
      
      // Generate basic interpretation based on abnormal values
      const interpretation = this._generateInterpretation(abnormalResults);

      const result = {
        success: labValues.length > 0,
        values: labValues,
        testName: testName || 'Laboratory Test',
        collectionDate: collectionDate,
        labName: labName || 'Unknown Laboratory',
        interpretation: interpretation,
        abnormal: abnormalResults,
        limitations: [
          'Values extracted from OCR - manual verification recommended',
          'Reference ranges may vary by laboratory and age/sex',
          'Clinical context required for proper interpretation'
        ],
        message: labValues.length > 0 
          ? `Extracted ${labValues.length} test values` 
          : 'No lab values detected in text'
      };

      logger.info(`[LabReportExtractor] Extracted ${labValues.length} values from text`);
      
      return result;

    } catch (error) {
      logger.error(`[LabReportExtractor] Extraction error: ${error.message}`);
      return {
        success: false,
        values: [],
        error: error.message,
        limitations: ['Lab extraction failed - manual review recommended']
      };
    }
  }

  /**
   * Normalize OCR text: lowercase, remove extra whitespace EXCEPT newlines
   * Preserves line structure for table parsing
   */
  static _normalizeText(text) {
    return text
      .toLowerCase()
      .split('\n')
      .map(line => line.replace(/\s+/g, ' ').trim())
      .filter(line => line.length > 0)
      .join('\n');
  }

  /**
   * Extract individual lab values using regex patterns
   * Handles multiple common lab report formats
   */
  static _extractLabValues(text) {
    const values = [];
    const seenTests = new Set();

    // PRIORITY 1: Table format with pipes (work line-by-line, not multiline regex)
    // "TestName | Value | Unit | Range | [Flag]"
    const lines = text.split('\n');
    for (const line of lines) {
      if (!line.includes('|')) continue;
      
      const parts = line.split('|').map(p => p.trim());
      // Expect: [testName, value, unit, range, optional flag]
      if (parts.length >= 4) {
        const testName = parts[0];
        const value = parts[1];
        const unit = parts[2];
        const range = parts[3];
        const flag = parts[4] || null;
        
        // Skip header rows (test name, result, unit, reference are noise keywords)
        if (this._isNoiseKeyword(testName) || this._isNoiseKeyword(value)) {
          continue;
        }
        
        // Only match if value looks numeric
        if (/^[-\d.,]+$/.test(value)) {
          const parsed = this._parseExtractedValue(testName, value, unit, range, flag, seenTests);
          if (parsed) values.push(parsed);
        }
      }
    }

    // PRIORITY 2: "Name: Value Unit (Range)" format or "Name: Value Unit Flag"
    // "Hemoglobin: 14.5 g/dL (13.5-17.5)"
    // "Glucose: 105 mg/dL H"
    // "WBC: 7.2 K/uL"
    // Match: "testname: number unit (range) flag" or "testname: number unit flag"
    const colonRegex = /([a-z()\/\s\-]+?):\s*([-\d.,]+)\s*([a-z/%°]*)\s*(?:\(([^)]*)\))?\s*([HLN])?/gi;
    let match;
    while ((match = colonRegex.exec(text)) !== null) {
      const testName = match[1].trim();
      const value = match[2];
      const unit = match[3];
      const range = match[4] || null;
      const flag = match[5] || null;
      
      // Skip noise (very short test names, common words)
      if (testName.length < 2 || this._isNoiseKeyword(testName)) {
        continue;
      }
      
      const parsed = this._parseExtractedValue(testName, value, unit, range, flag, seenTests);
      if (parsed) values.push(parsed);
    }

    // PRIORITY 3: Line-by-line parsing for OCR-corrupted spacing (no pipes, no colons)
    // "Hemoglobin                    14.5     g/dL     13.5-17.5"
    // After normalization becomes: "hemoglobin 14.5 g/dl 13.5-17.5"
    // Format: testname value unit range (where value is numeric, range may contain dashes/</>)
    for (const line of lines) {
      if (!line.trim() || line.includes('|') || line.includes(':')) continue; // Skip already-processed formats
      
      // Split into words
      const words = line.trim().split(/\s+/);
      if (words.length < 3) continue; // Need at least: testname, value, unit/range
      
      // Strategy: find the first numeric value (that's our lab result)
      let valueIdx = -1;
      for (let i = 1; i < words.length; i++) {
        if (/^[-\d.,]+$/.test(words[i])) {
          valueIdx = i;
          break;
        }
      }
      
      if (valueIdx === -1) continue; // No numeric value found
      
      // testName = all words before the value
      // value = the numeric word
      // unit = next word (usually a unit like g/dL, K/uL, %)
      // range = rest of the words joined (might be like "70-100" or "13.5-17.5")
      const testName = words.slice(0, valueIdx).join(' ');
      const value = words[valueIdx];
      const unit = words[valueIdx + 1] || '';
      const range = words.slice(valueIdx + 2).join(' ') || '';
      
      const parsed = this._parseExtractedValue(testName, value, unit, range || null, null, seenTests);
      if (parsed) values.push(parsed);
    }

    // PRIORITY 4: Fallback - aggressive extraction
    if (values.length === 0) {
      values.push(...this._extractNumericValues(text));
    }

    return values;
  }

  /**
   * Parse and validate an extracted value
   * Handles flags, commas, ranges, negative numbers, etc.
   */
  static _parseExtractedValue(name, value, unit, range, flag, seenTests) {
    // Sanitize inputs
    const testName = name.trim().replace(/\s+/g, ' ');
    const cleanValue = value.trim().replace(/,/g, '.'); // Handle comma decimals
    const cleanUnit = unit.trim();
    const cleanRange = range ? range.trim() : null;
    let cleanFlag = flag ? flag.trim().toUpperCase() : null; // UPPERCASE flag since text is lowercased

    // Filter noise
    if (testName.length < 2 || this._isNoiseKeyword(testName)) {
      return null;
    }

    // Parse numeric value
    const numValue = parseFloat(cleanValue);
    if (isNaN(numValue)) {
      return null;
    }

    // Deduplication
    const key = `${testName}_${cleanValue}`;
    if (seenTests.has(key)) {
      return null;
    }
    seenTests.add(key);

    // Determine abnormality
    let isAbnormal = false;
    let finalFlag = cleanFlag || 'N';

    // CASE 1: Flag explicitly provided (from table or colon format)
    if (cleanFlag && ['H', 'L'].includes(cleanFlag)) {
      isAbnormal = true;
      finalFlag = cleanFlag;
    } 
    // CASE 2: Check reference range for abnormality
    else if (cleanRange) {
      isAbnormal = this._isAbnormalValue({ testName, value: cleanValue, referenceRange: cleanRange });
      if (isAbnormal) {
        finalFlag = this._getAbnormalFlag({ testName, value: cleanValue, referenceRange: cleanRange }, true);
      }
    }

    return {
      testName: testName,
      value: cleanValue,
      unit: cleanUnit,
      referenceRange: cleanRange || '',
      normalRange: cleanRange || '',
      isAbnormal: isAbnormal,
      flag: finalFlag
    };
  }

  /**
   * Extract numeric values if standard patterns fail
   */
  static _extractNumericValues(text) {
    const values = [];
    
    // Very broad: "word: number" pattern
    const regex = /([a-z\s]+?):\s*([\d.]+)\s*([a-z/%\-]*)?/gi;
    let match;

    const seenTests = new Set();

    while ((match = regex.exec(text)) !== null) {
      const testName = match[1].trim();
      const value = match[2];
      const unit = match[3] || '';

      // Filter noise: exclude test names that are too short or generic
      if (testName.length > 2 && !this._isNoiseKeyword(testName)) {
        const key = `${testName}_${value}`;
        
        if (!seenTests.has(key)) {
          seenTests.add(key);
          values.push({
            testName: testName,
            value: value,
            unit: unit.trim(),
            referenceRange: '',
            normalRange: '',
            isAbnormal: false,
            flag: 'N'
          });
        }
      }
    }

    return values;
  }

  /**
   * Check if value appears abnormal based on common reference ranges
   */
  static _isAbnormalValue(parsed) {
    const { testName, value, referenceRange } = parsed;
    
    if (!referenceRange) return false;

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return false;

    // CASE 1: Standard range format "4.5-11.0" or "13.5-17.5"
    const rangeMatch = referenceRange.match(/([\d.]+)\s*-\s*([\d.]+)/);
    if (rangeMatch) {
      const minRef = parseFloat(rangeMatch[1]);
      const maxRef = parseFloat(rangeMatch[2]);
      return numValue < minRef || numValue > maxRef;
    }

    // CASE 2: Less-than format "<200", "< 100", "≤100"
    const lessThanMatch = referenceRange.match(/[<≤]\s*([\d.]+)/);
    if (lessThanMatch) {
      const maxRef = parseFloat(lessThanMatch[1]);
      return numValue > maxRef;
    }

    // CASE 3: Greater-than format ">40", "> 40", "≥40"
    const greaterThanMatch = referenceRange.match(/[>≥]\s*([\d.]+)/);
    if (greaterThanMatch) {
      const minRef = parseFloat(greaterThanMatch[1]);
      return numValue < minRef;
    }

    return false;
  }

  /**
   * Get abnormal flag: H (high), L (low), N (normal)
   */
  static _getAbnormalFlag(parsed, isAbnormal) {
    // If flag was directly extracted from source (e.g., from table), use it
    if (parsed.flag && ['H', 'L', 'N'].includes(parsed.flag)) {
      return parsed.flag;
    }

    if (!isAbnormal) return 'N';

    const { value, referenceRange } = parsed;
    const numValue = parseFloat(value);

    if (!referenceRange) return 'N';

    // CASE 1: Standard range format "4.5-11.0"
    let rangeMatch = referenceRange.match(/([\d.]+)\s*-\s*([\d.]+)/);
    if (rangeMatch) {
      const minRef = parseFloat(rangeMatch[1]);
      const maxRef = parseFloat(rangeMatch[2]);
      return numValue > maxRef ? 'H' : 'L';
    }

    // CASE 2: Less-than format "<200" (value too high)
    rangeMatch = referenceRange.match(/[<≤]\s*([\d.]+)/);
    if (rangeMatch) {
      return 'H'; // Value is above the upper limit
    }

    // CASE 3: Greater-than format ">40" (value too low)
    rangeMatch = referenceRange.match(/[>≥]\s*([\d.]+)/);
    if (rangeMatch) {
      return 'L'; // Value is below the lower limit
    }

    return 'N';
  }

  /**
   * Detect if keyword is noise (not a test name)
   */
  static _isNoiseKeyword(keyword) {
    const noise = ['the', 'and', 'or', 'for', 'with', 'from', 'to', 'in', 'at', 'by', 'a', 'an', 'report', 'date', 'time', 'sample', 'page'];
    return noise.includes(keyword.toLowerCase());
  }

  /**
   * Detect lab/facility name from text
   */
  static _detectLabName(text) {
    const patterns = [
      /laboratory name:\s*([^\n]+)/i,
      /lab:\s*([^\n]+)/i,
      /facility:\s*([^\n]+)/i,
      /^([a-z\s]+(?:lab|laboratory|diagnostic|center|pathology).*?)$/mi
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim().substring(0, 100);
      }
    }

    return null;
  }

  /**
   * Detect test type from text
   */
  static _detectTestName(text) {
    const testPatterns = {
      'CBC': /complete blood count|cbc|full blood count/i,
      'Metabolic Panel': /metabolic panel|chemistry panel|cmp/i,
      'Liver Function': /liver function|lfts|hepatic panel/i,
      'Kidney Function': /kidney function|renal function|creatinine/i,
      'Lipid Panel': /lipid panel|cholesterol|triglyceride/i,
      'Thyroid Panel': /thyroid|tsh|t3|t4/i,
      'Diabetes Screen': /glucose|diabetes|fasting glucose/i,
      'Urinalysis': /urinalysis|urine|ua/i
    };

    for (const [testName, pattern] of Object.entries(testPatterns)) {
      if (pattern.test(text)) {
        return testName;
      }
    }

    return null;
  }

  /**
   * Extract date from text
   */
  static _extractDate(text) {
    const patterns = [
      /collection date:\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /date:\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          return new Date(match[1]);
        } catch {
          continue;
        }
      }
    }

    return new Date();
  }

  /**
   * Generate basic interpretation from abnormal values
   */
  static _generateInterpretation(abnormalResults) {
    if (abnormalResults.length === 0) {
      return 'All values within normal range.';
    }

    const highlights = abnormalResults
      .slice(0, 3)
      .map(r => `${r.testName}: ${r.value} ${r.unit} (${r.flag === 'H' ? 'elevated' : 'low'})`)
      .join('; ');

    const moreText = abnormalResults.length > 3 ? `and ${abnormalResults.length - 3} more.` : '';

    return `Abnormal values detected: ${highlights}${moreText ? '; ' + moreText : ''}. Manual review recommended.`;
  }
}

export default LabReportExtractor;

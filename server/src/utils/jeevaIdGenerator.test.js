import { describe, it, expect, vi } from 'vitest';
import { validateJeevaIdFormat, extractYearFromJeevaId } from './jeevaIdGenerator.js';

describe('JeevaId Generator', () => {
  it('should validate correct JeevaId format', () => {
    const validIds = [
      'JJ25-ABC12',
      'JJ24-XY7K2',
      'JJ26-H7K2M',
    ];

    validIds.forEach(id => {
      expect(validateJeevaIdFormat(id)).toBe(true);
    });
  });

  it('should reject invalid JeevaId format', () => {
    const invalidIds = [
      'JJ-ABC12',      // missing year
      'J25-ABC12',     // single J
      'JJ25ABC12',     // missing dash
      'JJ25-ABC',      // too short
      'JJ25-ABC123',   // too long
      'AB25-ABC12',    // wrong prefix
    ];

    invalidIds.forEach(id => {
      expect(validateJeevaIdFormat(id)).toBe(false);
    });
  });

  it('should extract year from JeevaId', () => {
    const jeevaId = 'JJ25-ABC12';
    const year = extractYearFromJeevaId(jeevaId);
    expect(year).toBe('202025');
  });

  it('should return null for invalid JeevaId when extracting year', () => {
    const year = extractYearFromJeevaId('INVALID');
    expect(year).toBeNull();
  });
});

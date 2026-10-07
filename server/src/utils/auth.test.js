import { describe, it, expect, vi } from 'vitest';
import { generateToken, verifyToken, generateRefreshToken, verifyRefreshToken } from './auth.js';

describe('Authentication Utilities', () => {
  it('should generate a JWT token', () => {
    const token = generateToken('user123', 'PATIENT');
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('should verify a valid JWT token', () => {
    const token = generateToken('user123', 'PATIENT');
    const decoded = verifyToken(token);
    expect(decoded).toBeDefined();
    expect(decoded.userId).toBe('user123');
    expect(decoded.role).toBe('PATIENT');
  });

  it('should return null for invalid token', () => {
    const decoded = verifyToken('invalid.token.here');
    expect(decoded).toBeNull();
  });

  it('should generate refresh token', () => {
    const refreshToken = generateRefreshToken('user123');
    expect(refreshToken).toBeDefined();
    expect(typeof refreshToken).toBe('string');
  });

  it('should verify refresh token', () => {
    const refreshToken = generateRefreshToken('user123');
    const decoded = verifyRefreshToken(refreshToken);
    expect(decoded).toBeDefined();
    expect(decoded.userId).toBe('user123');
  });
});

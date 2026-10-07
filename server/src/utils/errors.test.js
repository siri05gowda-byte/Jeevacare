import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  PatientIsolationViolationError,
  RecordImmutabilityError,
  formatErrorResponse,
} from './errors.js';

describe('Error Classes', () => {
  it('should create ValidationError', () => {
    const error = new ValidationError('Invalid input', [{ field: 'email', message: 'Invalid' }]);
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
  });

  it('should create AuthenticationError', () => {
    const error = new AuthenticationError('Invalid credentials');
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('should create AuthorizationError', () => {
    const error = new AuthorizationError('Permission denied');
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('AUTHORIZATION_ERROR');
  });

  it('should create NotFoundError', () => {
    const error = new NotFoundError('User not found', 'User');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
  });

  it('should create PatientIsolationViolationError', () => {
    const error = new PatientIsolationViolationError();
    expect(error.statusCode).toBe(403);
  });

  it('should create RecordImmutabilityError', () => {
    const error = new RecordImmutabilityError();
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('RECORD_IMMUTABLE');
  });

  it('should format error response', () => {
    const error = new ValidationError('Test error');
    const response = formatErrorResponse(error);
    expect(response.success).toBe(false);
    expect(response.error.code).toBe('VALIDATION_ERROR');
    expect(response.error.statusCode).toBe(400);
  });
});

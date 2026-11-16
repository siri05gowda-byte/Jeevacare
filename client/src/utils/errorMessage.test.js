import { describe, it, expect } from 'vitest';
import { errorMessage } from './errorMessage';

const fromServer = (data) => ({ response: { data }, message: 'Request failed with status code 400' });

describe('errorMessage', () => {
  it('reads each shape the server uses', () => {
    expect(errorMessage(fromServer({ message: 'Facility not found' }))).toBe('Facility not found');
    expect(errorMessage(fromServer({ error: 'Hospital administrator role is required' }))).toBe(
      'Hospital administrator role is required'
    );
    expect(errorMessage(fromServer({ error: { message: 'Validation failed', code: 'VALIDATION_ERROR' } }))).toBe(
      'Validation failed'
    );
  });

  it('prefers the first validation detail', () => {
    expect(errorMessage(fromServer({ message: 'Validation error', errors: [{ msg: 'Invalid facility ID' }] }))).toBe(
      'Invalid facility ID'
    );
  });

  it('never returns an object', () => {
    expect(typeof errorMessage(fromServer({ error: { code: 'X' } }))).toBe('string');
    expect(errorMessage({}, 'fallback')).toBe('fallback');
  });
});

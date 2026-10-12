/**
 * Secret Redactor Tests
 * Verify that sensitive credentials are never exposed in logs
 */

import { describe, it, expect } from 'vitest';
import {
  redactMongoURI,
  redactSecrets,
  redactError,
  redactObject,
  safeMongoDisplay,
} from '../secretRedactor.js';

describe('secretRedactor', () => {
  describe('redactMongoURI', () => {
    it('should redact mongodb:// URIs with credentials', () => {
      const uri = 'mongodb://user:password123@localhost:27017/jeevacare';
      const result = redactMongoURI(uri);
      
      expect(result).toBe('mongodb://***:***@localhost:27017/jeevacare');
      expect(result).not.toContain('password123');
      expect(result).not.toContain('user');
    });

    it('should redact mongodb+srv:// URIs with credentials', () => {
      const uri = 'mongodb+srv://dbuser:SecretPass456@cluster.mongodb.net/production?retryWrites=true';
      const result = redactMongoURI(uri);
      
      expect(result).toBe('mongodb+srv://***:***@cluster.mongodb.net/production?retryWrites=true');
      expect(result).not.toContain('SecretPass456');
      expect(result).not.toContain('dbuser');
    });

    it('should redact real-world MongoDB Atlas URI format', () => {
      const uri = 'mongodb+srv://testuser:ComplexP@ssw0rd!@jeevacare-cluster.abc123.mongodb.net/jeevacare?retryWrites=true&w=majority';
      const result = redactMongoURI(uri);
      
      expect(result).not.toContain('testuser');
      expect(result).not.toContain('ComplexP@ssw0rd!');
      expect(result).toContain('***:***@');
    });

    it('should handle URIs in error messages', () => {
      const message = 'Connection failed to mongodb+srv://admin:secret@cluster.net/db';
      const result = redactMongoURI(message);
      
      expect(result).not.toContain('admin');
      expect(result).not.toContain('secret');
      expect(result).toContain('***:***@');
    });

    it('should not modify non-URI strings', () => {
      const text = 'This is just a regular log message without secrets';
      const result = redactMongoURI(text);
      
      expect(result).toBe(text);
    });
  });

  describe('redactSecrets', () => {
    it('should redact API keys in JSON', () => {
      const json = '{"apiKey":"sk_live_1234567890abcdef","data":"test"}';
      const result = redactSecrets(json);
      
      expect(result).not.toContain('sk_live_1234567890abcdef');
      expect(result).toContain('***');
    });

    it('should redact Bearer tokens', () => {
      const header = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature';
      const result = redactSecrets(header);
      
      expect(result).toBe('Authorization: Bearer ***');
      expect(result).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });

    it('should redact password in URL parameters', () => {
      const url = 'https://api.example.com/login?username=user&password=secret123&remember=true';
      const result = redactSecrets(url);
      
      expect(result).not.toContain('secret123');
      expect(result).toContain('password=***');
    });

    it('should redact MongoDB URIs', () => {
      const log = 'Connecting to mongodb+srv://user:pass@cluster.net/db';
      const result = redactSecrets(log);
      
      expect(result).not.toContain('user:pass');
      expect(result).toContain('***:***@');
    });
  });

  describe('redactError', () => {
    it('should redact MongoDB URI from error message', () => {
      const error = new Error('Failed to connect to mongodb://admin:secret@host/db');
      const result = redactError(error);
      
      expect(result.message).not.toContain('admin');
      expect(result.message).not.toContain('secret');
      expect(result.message).toContain('***:***@');
    });

    it('should redact credentials from error stack', () => {
      const error = new Error('Database error');
      error.stack = 'Error: Cannot connect\n  at mongodb://user:password@host:27017/db\n  at Connection.connect';
      
      const result = redactError(error);
      
      expect(result.stack).not.toContain('user:password');
      expect(result.stack).toContain('***:***@');
    });

    it('should preserve error metadata', () => {
      const error = new Error('Test error');
      error.code = 'ERR_CONNECTION';
      error.statusCode = 500;
      
      const result = redactError(error);
      
      expect(result.code).toBe('ERR_CONNECTION');
      expect(result.statusCode).toBe(500);
      expect(result.name).toBe('Error');
    });

    it('should handle nested errors', () => {
      const cause = new Error('Database: mongodb://user:pass@host/db');
      const error = new Error('Operation failed');
      error.cause = cause;
      
      const result = redactError(error);
      
      expect(result.cause.message).not.toContain('user:pass');
      expect(result.cause.message).toContain('***:***@');
    });
  });

  describe('redactObject', () => {
    it('should redact password fields', () => {
      const obj = {
        username: 'user',
        password: 'secret123',
        email: 'user@example.com',
      };
      
      const result = redactObject(obj);
      
      expect(result.password).toBe('***');
      expect(result.username).toBe('user');
      expect(result.email).toBe('user@example.com');
    });

    it('should redact nested secret fields', () => {
      const obj = {
        user: {
          name: 'John',
          passwordHash: 'hashed_value',
        },
        database: {
          uri: 'mongodb://user:pass@host/db',
        },
      };
      
      const result = redactObject(obj);
      
      expect(result.user.passwordHash).toBe('***');
      expect(result.database.uri).not.toContain('user:pass');
    });

    it('should redact API keys and tokens', () => {
      const obj = {
        apiKey: 'sk_test_1234567890',
        accessToken: 'token_abc123',
        refreshToken: 'refresh_xyz789',
        secret: 'my_secret',
      };
      
      const result = redactObject(obj);
      
      expect(result.apiKey).toBe('***');
      expect(result.accessToken).toBe('***');
      expect(result.refreshToken).toBe('***');
      expect(result.secret).toBe('***');
    });

    it('should handle arrays', () => {
      const obj = {
        users: [
          { name: 'Alice', password: 'alice123' },
          { name: 'Bob', password: 'bob456' },
        ],
      };
      
      const result = redactObject(obj);
      
      expect(result.users[0].password).toBe('***');
      expect(result.users[1].password).toBe('***');
      expect(result.users[0].name).toBe('Alice');
    });

    it('should not fail on circular references', () => {
      const obj = { name: 'test' };
      obj.self = obj;
      
      // Should not throw (may not fully handle circular, but shouldn't crash)
      expect(() => redactObject(obj)).not.toThrow();
    });
  });

  describe('safeMongoDisplay', () => {
    it('should safely display MongoDB URI', () => {
      const uri = 'mongodb+srv://user:password@cluster.mongodb.net/jeevacare';
      const result = safeMongoDisplay(uri);
      
      expect(result).not.toContain('password');
      expect(result).toContain('***:***@');
    });

    it('should handle invalid URIs', () => {
      const result = safeMongoDisplay('not a uri');
      
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should handle null/undefined', () => {
      expect(safeMongoDisplay(null)).toBe('[no URI configured]');
      expect(safeMongoDisplay(undefined)).toBe('[no URI configured]');
    });
  });

  describe('Integration: No synthetic credentials in output', () => {
    it('should never expose test MongoDB credentials', () => {
      const testCases = [
        'mongodb+srv://testuser:TestPass123@cluster.mongodb.net/jeevacare-test',
        'Error: Authentication failed for mongodb://admin:SuperSecret!@localhost:27017',
        'Connection string: mongodb+srv://dbuser:P@ssw0rd123@cluster.abc.mongodb.net/?retryWrites=true',
        JSON.stringify({
          database: {
            uri: 'mongodb://user:password@host/db',
            password: 'secret',
            apiKey: 'key_1234567890',
          },
        }),
      ];

      testCases.forEach((testCase) => {
        const result = redactSecrets(testCase);
        
        // Assert no actual password VALUES appear
        expect(result).not.toContain('TestPass123');
        expect(result).not.toContain('SuperSecret!');
        expect(result).not.toContain('P@ssw0rd123');
        expect(result).not.toContain('key_1234567890');
        
        // Assert specific password values are redacted
        expect(result).not.toMatch(/password['":\s=]+secret/i); // "password":"secret" or password=secret
        
        // Assert redaction markers present
        expect(result).toMatch(/\*\*\*/);
      });
    });
  });
});

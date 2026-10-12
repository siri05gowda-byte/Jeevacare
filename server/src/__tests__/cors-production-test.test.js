/**
 * Production CORS Configuration Test
 * 
 * Tests the exact production scenario:
 * - Origin: https://jeevacare-cmdm.vercel.app
 * - Endpoint: POST /api/v1/auth/login
 * - OPTIONS preflight request
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import config from '../config/index.js';
import mongoose from 'mongoose';
import User from '../models/User.js';
import AuditService from '../services/AuditService.js';

describe('Production CORS Configuration', () => {
  beforeAll(async () => {
    // Mock User query and audit to avoid remote DB dependency during CORS tests
    vi.spyOn(User, 'findOne').mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });
    vi.spyOn(AuditService, 'logEvent').mockResolvedValue(true);

    // Log CORS configuration (without exposing full env vars)
    console.log('\n=== CORS Configuration at Runtime ===');
    console.log('CORS origin type:', typeof config.cors.origin);
    console.log('CORS origin is array:', Array.isArray(config.cors.origin));
    console.log('CORS origin length:', Array.isArray(config.cors.origin) ? config.cors.origin.length : 'N/A');
    console.log('CORS origin values:');
    if (Array.isArray(config.cors.origin)) {
      config.cors.origin.forEach((origin, index) => {
        console.log(`  [${index}]: "${origin}" (length: ${origin.length})`);
      });
    } else {
      console.log('  (not an array):', config.cors.origin);
    }
    console.log('CORS methods:', config.cors.methods);
    console.log('CORS allowedHeaders:', config.cors.allowedHeaders);
    console.log('CORS optionsSuccessStatus:', config.cors.optionsSuccessStatus);
    console.log('=====================================\n');
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  describe('Exact Production Scenario', () => {
    const PRODUCTION_ORIGIN = 'https://jeevacare-cmdm.vercel.app';

    it('should check if production origin is in allowlist', () => {
      const isInAllowlist = Array.isArray(config.cors.origin) 
        ? config.cors.origin.includes(PRODUCTION_ORIGIN)
        : config.cors.origin === PRODUCTION_ORIGIN;
      
      console.log(`\nProduction origin "${PRODUCTION_ORIGIN}" in allowlist:`, isInAllowlist);
      
      if (!isInAllowlist && Array.isArray(config.cors.origin)) {
        console.log('\nChecking for similar origins (typos):');
        config.cors.origin.forEach(allowed => {
          if (allowed.includes('jeevacare') && allowed.includes('vercel')) {
            const similarity = allowed === PRODUCTION_ORIGIN ? 'EXACT' : 'DIFFERENT';
            console.log(`  "${allowed}" - ${similarity}`);
            if (similarity === 'DIFFERENT') {
              console.log(`    Difference: expected "cmdm", found "${allowed.match(/jeevacare-([^.]+)/)?.[1] || 'unknown'}"`);
            }
          }
        });
      }
    });

    it('should return OPTIONS with Access-Control-Allow-Origin for production origin', async () => {
      const response = await request(app)
        .options('/api/v1/auth/login')
        .set('Origin', PRODUCTION_ORIGIN)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization');

      console.log('\n=== OPTIONS Response ===');
      console.log('Status:', response.status);
      console.log('Access-Control-Allow-Origin:', response.headers['access-control-allow-origin'] || 'MISSING');
      console.log('Access-Control-Allow-Methods:', response.headers['access-control-allow-methods'] || 'MISSING');
      console.log('Access-Control-Allow-Headers:', response.headers['access-control-allow-headers'] || 'MISSING');
      console.log('All CORS-related headers:');
      Object.keys(response.headers).forEach(header => {
        if (header.toLowerCase().startsWith('access-control')) {
          console.log(`  ${header}: ${response.headers[header]}`);
        }
      });
      console.log('========================\n');

      // Assert the expected behavior
      expect([200, 204]).toContain(response.status);
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-origin']).toBe(PRODUCTION_ORIGIN);
      expect(response.headers['access-control-allow-methods']).toMatch(/POST/);
    });

    it('should return POST with Access-Control-Allow-Origin for production origin', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Origin', PRODUCTION_ORIGIN)
        .send({ email: 'test@example.com', password: 'test123' });

      console.log('\n=== POST Response ===');
      console.log('Status:', response.status);
      console.log('Access-Control-Allow-Origin:', response.headers['access-control-allow-origin'] || 'MISSING');
      console.log('=====================\n');

      // CORS header must be present even on error responses
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-origin']).toBe(PRODUCTION_ORIGIN);
    });

    it('should reject unknown origin', async () => {
      const UNKNOWN_ORIGIN = 'https://evil.com';
      
      const response = await request(app)
        .options('/api/v1/auth/login')
        .set('Origin', UNKNOWN_ORIGIN)
        .set('Access-Control-Request-Method', 'POST');

      console.log('\n=== Unknown Origin Test ===');
      console.log('Origin:', UNKNOWN_ORIGIN);
      console.log('Status:', response.status);
      console.log('Access-Control-Allow-Origin:', response.headers['access-control-allow-origin'] || 'CORRECTLY MISSING');
      console.log('===========================\n');

      // Should NOT have CORS header for disallowed origin
      expect(response.headers['access-control-allow-origin']).not.toBe(UNKNOWN_ORIGIN);
    });
  });

  describe('Test with X-Forwarded-For (Render proxy)', () => {
    const PRODUCTION_ORIGIN = 'https://jeevacare-cmdm.vercel.app';

    it('should handle OPTIONS with X-Forwarded-For header', async () => {
      const response = await request(app)
        .options('/api/v1/auth/login')
        .set('Origin', PRODUCTION_ORIGIN)
        .set('X-Forwarded-For', '1.2.3.4')
        .set('Access-Control-Request-Method', 'POST');

      console.log('\n=== OPTIONS with X-Forwarded-For ===');
      console.log('Status:', response.status);
      console.log('Access-Control-Allow-Origin:', response.headers['access-control-allow-origin'] || 'MISSING');
      console.log('Trust proxy setting active:', response.status !== 500);
      console.log('=====================================\n');

      expect([200, 204]).toContain(response.status);
      expect(response.headers['access-control-allow-origin']).toBe(PRODUCTION_ORIGIN);
    });
  });
});

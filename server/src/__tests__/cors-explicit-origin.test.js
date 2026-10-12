/**
 * Explicit CORS Origin Test
 * 
 * Tests with explicitly set CORS_ORIGIN environment variable
 * to verify the code works correctly with the production origin
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import User from '../models/User.js';
import AuditService from '../services/AuditService.js';

describe('CORS with Explicit Production Origin', () => {
  let app;
  let config;
  
  beforeAll(async () => {
    // Mock User query and audit to avoid remote DB dependency during CORS tests
    vi.spyOn(User, 'findOne').mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });
    vi.spyOn(AuditService, 'logEvent').mockResolvedValue(true);

    // EXPLICITLY SET CORS_ORIGIN to production value
    process.env.CORS_ORIGIN = 'http://localhost:5173,http://localhost:3000,http://localhost:8000,https://jeevacare-cmdm.vercel.app';
    
    console.log('\n=== Explicit CORS_ORIGIN Set ===');
    console.log('process.env.CORS_ORIGIN:', process.env.CORS_ORIGIN);
    console.log('================================\n');
    
    // IMPORTANT: Clear module cache to force re-import with new env var
    delete require.cache[require.resolve('../config/index.js')];
    delete require.cache[require.resolve('../index.js')];
    
    // Now import after setting env var
    const configModule = await import('../config/index.js?t=' + Date.now());
    config = configModule.default;
    
    const appModule = await import('../index.js?t=' + Date.now());
    app = appModule.default;
    
    console.log('\n=== Config After Explicit Set ===');
    console.log('config.cors.origin:', config.cors.origin);
    console.log('=================================\n');
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  describe('Production Origin: https://jeevacare-cmdm.vercel.app', () => {
    const PRODUCTION_ORIGIN = 'https://jeevacare-cmdm.vercel.app';

    it('should include production origin in config', () => {
      console.log('\n=== Origin Check ===');
      console.log('Looking for:', PRODUCTION_ORIGIN);
      console.log('Config origins:', config.cors.origin);
      
      const isIncluded = config.cors.origin.includes(PRODUCTION_ORIGIN);
      console.log('Is included:', isIncluded);
      console.log('====================\n');
      
      expect(config.cors.origin).toContain(PRODUCTION_ORIGIN);
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
      console.log('========================\n');

      // Assert expected behavior
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

      // CORS header must be present
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-origin']).toBe(PRODUCTION_ORIGIN);
    });
  });

  describe('Wrong Origin: https://jeevacare-cdmd.vercel.app (typo)', () => {
    const WRONG_ORIGIN = 'https://jeevacare-cdmd.vercel.app';

    it('should NOT return Access-Control-Allow-Origin for wrong origin', async () => {
      const response = await request(app)
        .options('/api/v1/auth/login')
        .set('Origin', WRONG_ORIGIN)
        .set('Access-Control-Request-Method', 'POST');

      console.log('\n=== Wrong Origin Test ===');
      console.log('Origin:', WRONG_ORIGIN);
      console.log('Status:', response.status);
      console.log('Access-Control-Allow-Origin:', response.headers['access-control-allow-origin'] || 'CORRECTLY MISSING');
      console.log('=========================\n');

      // Should NOT have CORS header for wrong origin
      expect(response.headers['access-control-allow-origin']).not.toBe(WRONG_ORIGIN);
      
      // Should either be undefined or a different allowed origin
      if (response.headers['access-control-allow-origin']) {
        expect(response.headers['access-control-allow-origin']).not.toBe(WRONG_ORIGIN);
      }
    });
  });
});

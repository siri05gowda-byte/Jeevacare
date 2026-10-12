/**
 * Authentication Routes and CORS Integration Test
 * 
 * Tests:
 * 1. POST /api/v1/auth/login route is registered
 * 2. OPTIONS preflight succeeds with correct CORS headers
 * 3. POST request is accepted from allowed Vercel origin
 * 4. Trust proxy configuration works with X-Forwarded-For header
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import mongoose from 'mongoose';
import config from '../config/index.js';
import User from '../models/User.js';

describe('Auth Routes - CORS and Proxy Trust', () => {
  beforeAll(async () => {
    // Mock User query to return query object with .select() chained method
    vi.spyOn(User, 'findOne').mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });

    // If a database is available, connect with short timeout; otherwise proceed without blocking CORS assertions
    if (mongoose.connection.readyState === 0 && config.database?.uri) {
      try {
        await mongoose.connect(config.database.uri, {
          serverSelectionTimeoutMS: 1000,
          connectTimeoutMS: 1000,
        });
      } catch {
        // CORS and route registration assertions do not require active MongoDB connectivity
      }
    }
  });

  afterAll(async () => {
    // Disconnect from test database
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  describe('OPTIONS Preflight', () => {
    it('should return 200 for OPTIONS /api/v1/auth/login', async () => {
      const response = await request(app)
        .options('/api/v1/auth/login')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST');

      expect([200, 204]).toContain(response.status);
    });

    it('should include CORS headers in OPTIONS response', async () => {
      const response = await request(app)
        .options('/api/v1/auth/login')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toMatch(/POST/);
    });
  });

  describe('POST /api/v1/auth/login Route Registration', () => {
    it('should have POST /api/v1/auth/login route registered', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Origin', 'http://localhost:5173')
        .send({ email: 'test@example.com', password: 'test' });

      // Route exists (not 404), even if validation/auth fails
      expect(response.status).not.toBe(404);
    });

    it('should include CORS headers in POST response', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Origin', 'http://localhost:5173')
        .send({ email: 'test@example.com', password: 'test123' });

      // CORS header must be present (even on error responses)
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should return 400 for invalid login payload (validation)', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Origin', 'http://localhost:5173')
        .send({ email: 'invalid', password: '' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Trust Proxy with X-Forwarded-For', () => {
    it('should accept requests with X-Forwarded-For header', async () => {
      const response = await request(app)
        .options('/api/v1/auth/login')
        .set('Origin', 'http://localhost:5173')
        .set('X-Forwarded-For', '1.2.3.4')
        .set('Access-Control-Request-Method', 'POST');

      // Should not fail with ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
      expect([200, 204]).toContain(response.status);
    });

    it('should not return rate limit error when trust proxy is configured', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Origin', 'http://localhost:5173')
        .set('X-Forwarded-For', '1.2.3.4, 5.6.7.8')
        .send({ email: 'test@example.com', password: 'test123' });

      // Should not be 500 or contain rate limit proxy error
      expect(response.status).not.toBe(500);
      expect(response.text).not.toMatch(/ERR_ERL_UNEXPECTED_X_FORWARDED_FOR/i);
    });
  });

  describe('CORS Origin Validation', () => {
    it('should allow localhost origin', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Origin', 'http://localhost:5173')
        .send({ email: 'test@example.com', password: 'test123' });

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('should reject disallowed origin', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Origin', 'https://evil.com')
        .send({ email: 'test@example.com', password: 'test123' });

      // CORS middleware should not set Access-Control-Allow-Origin for disallowed origins
      expect(response.headers['access-control-allow-origin']).not.toBe('https://evil.com');
    });
  });
});

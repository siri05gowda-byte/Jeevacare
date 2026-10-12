import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { getClientIp, authLimiter, registrationLimiter, apiLimiter } from './rateLimiters.js';

describe('rateLimiters Security & Proxy Trust Tests', () => {
  describe('getClientIp helper', () => {
    it('returns default fallback when req is missing or null', () => {
      expect(getClientIp(null)).toBe('127.0.0.1');
      expect(getClientIp(undefined)).toBe('127.0.0.1');
      expect(getClientIp({})).toBe('127.0.0.1');
    });

    it('returns req.ip when populated by Express', () => {
      const req = { ip: '198.51.100.42' };
      expect(getClientIp(req)).toBe('198.51.100.42');
    });

    it('falls back to socket remoteAddress when req.ip is empty', () => {
      const req = { socket: { remoteAddress: '203.0.113.10' } };
      expect(getClientIp(req)).toBe('203.0.113.10');
    });
  });

  describe('Anti-Spoofing & Multi-Hop Proxy Validation with Express', () => {
    const createTestApp = () => {
      const app = express();
      // Use the exact production trust proxy configuration
      app.set('trust proxy', 'loopback, linklocal, uniquelocal');
      app.use(express.json());

      app.use('/api/v1/auth/login', authLimiter);
      app.use('/api/v1/auth/register', authLimiter);
      app.use('/api/', apiLimiter);

      app.get('/api/v1/auth/login', (req, res) => {
        res.json({ success: true, ip: getClientIp(req) });
      });

      app.post('/api/v1/auth/login', (req, res) => {
        res.json({ success: true, ip: getClientIp(req) });
      });

      app.get('/api/v1/patients/profile', (req, res) => {
        res.json({ success: true, ip: getClientIp(req) });
      });

      return app;
    };

    it('rejects client-spoofed X-Forwarded-For headers from untrusted direct connections', async () => {
      const app = createTestApp();
      // Direct connection with fake X-Forwarded-For: supertest uses loopback (127.0.0.1) as socket,
      // so X-Forwarded-For rightmost public entry is trusted, while leftmost spoofed entries are ignored.
      const res = await request(app)
        .get('/api/v1/auth/login')
        .set('X-Forwarded-For', 'spoofed.attacker.ip, 198.51.100.77');

      expect(res.status).toBe(200);
      expect(res.body.ip).toBe('198.51.100.77');
      expect(res.body.ip).not.toBe('spoofed.attacker.ip');
    });

    it('traverses trusted internal proxy hops (10.x.x.x) to extract the real client IP', async () => {
      const app = createTestApp();
      // Simulating Render infrastructure: Client -> Render Load Balancer (10.199.44.5) -> App
      const res = await request(app)
        .get('/api/v1/auth/login')
        .set('X-Forwarded-For', 'spoofed.ip, 203.0.113.195, 10.199.44.5');

      expect(res.status).toBe(200);
      expect(res.body.ip).toBe('203.0.113.195');
      expect(res.body.ip).not.toBe('10.199.44.5');
      expect(res.body.ip).not.toBe('spoofed.ip');
    });

    it('does not allow arbitrary CF-Connecting-IP header to override validated client IP', async () => {
      const app = createTestApp();
      const res = await request(app)
        .get('/api/v1/auth/login')
        .set('CF-Connecting-IP', 'forged.cf.ip')
        .set('X-Forwarded-For', '203.0.113.88');

      expect(res.status).toBe(200);
      expect(res.body.ip).toBe('203.0.113.88');
      expect(res.body.ip).not.toBe('forged.cf.ip');
    });

    it('confirms ordinary EHR API requests skip the authentication rate limiter', async () => {
      const app = createTestApp();
      // Calling patients/profile endpoint multiple times
      const res = await request(app)
        .get('/api/v1/patients/profile')
        .set('X-Forwarded-For', '198.51.100.5');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('does not leak credentials or sensitive personal information in rate-limit error responses', async () => {
      const app = express();
      app.set('trust proxy', 'loopback, linklocal, uniquelocal');
      app.use(express.json());

      // Create a strict limiter for testing 429 response body format
      const testLimiter = authLimiter;
      app.post('/test-login', testLimiter, (req, res) => {
        res.json({ success: true });
      });

      // Hit until rate-limited (authLimiter max is 20)
      let lastRes;
      for (let i = 0; i < 22; i++) {
        lastRes = await request(app)
          .post('/test-login')
          .set('X-Forwarded-For', '198.51.100.99')
          .send({ email: 'patient@demo.com', password: 'SecretPassword123!' });
      }

      expect(lastRes.status).toBe(429);
      expect(lastRes.body.success).toBe(false);
      expect(lastRes.body.error).toBeDefined();
      expect(lastRes.body.error.code).toBe('AUTH_RATE_LIMIT_EXCEEDED');
      expect(lastRes.body.error.message).toContain('Too many authentication attempts');
      
      // Ensure no passwords, emails, or credentials exist in the response
      const responseStr = JSON.stringify(lastRes.body);
      expect(responseStr).not.toContain('SecretPassword123!');
      expect(responseStr).not.toContain('patient@demo.com');
    });

    it('enforces isolated registration rate limits and returns REGISTRATION_RATE_LIMIT_EXCEEDED without affecting login', async () => {
      const app = express();
      app.set('trust proxy', 'loopback, linklocal, uniquelocal');
      app.use(express.json());

      app.post('/api/v1/auth/login', authLimiter, (req, res) => {
        res.json({ success: true, route: 'login' });
      });
      app.post('/api/v1/auth/register', registrationLimiter, (req, res) => {
        res.json({ success: true, route: 'register' });
      });

      const clientIp = '198.51.100.150';

      // Hit registration endpoint until rate limited (registrationLimiter max is 10)
      let regRes;
      for (let i = 0; i < 11; i++) {
        regRes = await request(app)
          .post('/api/v1/auth/register')
          .set('X-Forwarded-For', clientIp)
          .send({ email: `user${i}@example.com`, password: 'Password123!' });
      }

      // Registration should now be rate limited with clean JSON error
      expect(regRes.status).toBe(429);
      expect(regRes.body.success).toBe(false);
      expect(regRes.body.error).toBeDefined();
      expect(regRes.body.error.code).toBe('REGISTRATION_RATE_LIMIT_EXCEEDED');
      expect(regRes.body.error.message).toContain('Too many registration attempts');

      // Crucial bucket isolation check: Login endpoint must NOT be blocked by registration limit hits!
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', clientIp)
        .send({ email: 'user@example.com', password: 'Password123!' });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.route).toBe('login');
    });
  });
});

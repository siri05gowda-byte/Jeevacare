import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';

// Import the actual Express app from index.js
// This tests the real registered route, not a duplicate
const appModule = await import('../index.js');
const app = appModule.default;

describe('GET /healthz - Integration Test (Actual Route)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return 200 when MongoDB is connected (actual route)', async () => {
    // Mock MongoDB as connected
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);

    const response = await request(app).get('/healthz');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'healthy',
      database: 'connected',
    });
  });

  it('should return 503 when MongoDB is disconnected (actual route)', async () => {
    // Mock MongoDB as disconnected
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(0);

    const response = await request(app).get('/healthz');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: 'unhealthy',
      database: 'disconnected',
    });
  });

  it('should return 503 when MongoDB is connecting (actual route)', async () => {
    // Mock MongoDB as connecting
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(2);

    const response = await request(app).get('/healthz');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: 'unhealthy',
      database: 'disconnected',
    });
  });

  it('should not expose sensitive information (actual route)', async () => {
    // Mock MongoDB as connected
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);

    const response = await request(app).get('/healthz');

    // Verify no sensitive data
    expect(response.body).not.toHaveProperty('uri');
    expect(response.body).not.toHaveProperty('password');
    expect(response.body).not.toHaveProperty('credentials');
    expect(response.body).not.toHaveProperty('environment');
    expect(response.body).not.toHaveProperty('config');
    expect(response.body).not.toHaveProperty('stack');
    expect(response.body).not.toHaveProperty('stackTrace');

    // Verify minimal response
    expect(Object.keys(response.body)).toEqual(['status', 'database']);
  });
});

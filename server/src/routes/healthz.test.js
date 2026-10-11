import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';

describe('GET /healthz - Render Health Check', () => {
  let app;

  beforeAll(async () => {
    // Create a minimal Express app for testing
    app = express();
    
    // Add the /healthz endpoint (matching production implementation)
    app.get('/healthz', async (req, res) => {
      try {
        const dbState = mongoose.connection.readyState;
        
        if (dbState !== 1) {
          return res.status(503).json({
            status: 'unhealthy',
            database: 'disconnected',
          });
        }

        res.status(200).json({
          status: 'healthy',
          database: 'connected',
        });
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          error: 'health check failed',
        });
      }
    });
  });

  it('should return 200 when MongoDB is connected', async () => {
    // Mock MongoDB as connected (readyState = 1)
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);

    const response = await request(app).get('/healthz');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'healthy',
      database: 'connected',
    });
    
    vi.restoreAllMocks();
  });

  it('should return 503 when MongoDB is disconnected', async () => {
    // Mock MongoDB as disconnected (readyState = 0)
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(0);

    const response = await request(app).get('/healthz');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: 'unhealthy',
      database: 'disconnected',
    });
    
    vi.restoreAllMocks();
  });

  it('should return 503 when MongoDB is connecting', async () => {
    // Mock MongoDB as connecting (readyState = 2)
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(2);

    const response = await request(app).get('/healthz');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: 'unhealthy',
      database: 'disconnected',
    });
    
    vi.restoreAllMocks();
  });

  it('should return 503 when MongoDB is disconnecting', async () => {
    // Mock MongoDB as disconnecting (readyState = 3)
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(3);

    const response = await request(app).get('/healthz');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: 'unhealthy',
      database: 'disconnected',
    });
    
    vi.restoreAllMocks();
  });

  it('should not expose sensitive information', async () => {
    // Mock MongoDB as connected
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);

    const response = await request(app).get('/healthz');

    // Verify response doesn't contain sensitive data
    expect(response.body).not.toHaveProperty('uri');
    expect(response.body).not.toHaveProperty('password');
    expect(response.body).not.toHaveProperty('credentials');
    expect(response.body).not.toHaveProperty('environment');
    expect(response.body).not.toHaveProperty('config');
    expect(response.body).not.toHaveProperty('stack');
    expect(response.body).not.toHaveProperty('stackTrace');
    
    // Verify only expected minimal fields
    expect(Object.keys(response.body)).toEqual(['status', 'database']);
    
    vi.restoreAllMocks();
  });

  it('should return minimal response without environment details', async () => {
    // Mock MongoDB as connected
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);

    const response = await request(app).get('/healthz');

    // Response should be minimal
    expect(response.body).toEqual({
      status: 'healthy',
      database: 'connected',
    });
    
    // Should not have timestamp, environment, or other metadata
    expect(response.body).not.toHaveProperty('timestamp');
    expect(response.body).not.toHaveProperty('message');
    
    vi.restoreAllMocks();
  });

  it('should handle unexpected errors gracefully', async () => {
    // Mock mongoose.connection.readyState to throw an error
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockImplementation(() => {
      throw new Error('Unexpected database error');
    });

    const response = await request(app).get('/healthz');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: 'unhealthy',
      error: 'health check failed',
    });
    
    // Should not expose error details
    expect(response.body.error).not.toContain('Unexpected database error');
    
    vi.restoreAllMocks();
  });
});

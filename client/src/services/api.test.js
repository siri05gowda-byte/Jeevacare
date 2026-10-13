import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import api from './api';
import fs from 'fs';
import path from 'path';

describe('API Service Interceptors and Vercel Routing Configuration', () => {
  let localStorageStore = {};

  beforeEach(() => {
    localStorageStore = {};
    const mockLocalStorage = {
      getItem: vi.fn((key) => localStorageStore[key] || null),
      setItem: vi.fn((key, val) => { localStorageStore[key] = String(val); }),
      removeItem: vi.fn((key) => { delete localStorageStore[key]; }),
      clear: vi.fn(() => { localStorageStore = {}; }),
    };

    global.window = {
      location: {
        href: 'https://jeevacare-cmdm.vercel.app/login',
        pathname: '/login',
      },
      localStorage: mockLocalStorage,
    };
    global.localStorage = mockLocalStorage;
  });

  afterEach(() => {
    delete global.window;
    delete global.localStorage;
    vi.restoreAllMocks();
  });

  it('should not redirect window.location.href to /login on 401 for /auth/login requests', async () => {
    const error = {
      config: { url: '/auth/login' },
      response: {
        status: 401,
        data: {
          success: false,
          error: { message: 'Invalid email or password' },
        },
      },
    };

    const interceptor = api.interceptors.response.handlers[0].rejected;
    global.window.location.href = 'https://jeevacare-cmdm.vercel.app/login';

    await expect(interceptor(error)).rejects.toEqual(error);
    expect(global.window.location.href).toBe('https://jeevacare-cmdm.vercel.app/login');
  });

  it('should not redirect window.location.href to /login on 401 for /auth/register requests', async () => {
    const error = {
      config: { url: '/auth/register' },
      response: {
        status: 401,
        data: {
          success: false,
          error: { message: 'Unauthorized registration' },
        },
      },
    };

    const interceptor = api.interceptors.response.handlers[0].rejected;
    global.window.location.href = 'https://jeevacare-cmdm.vercel.app/register';

    await expect(interceptor(error)).rejects.toEqual(error);
    expect(global.window.location.href).toBe('https://jeevacare-cmdm.vercel.app/register');
  });

  it('should redirect to /login for non-auth requests on 401 when on protected pages without refresh token', async () => {
    global.window.location.pathname = '/dashboard';
    global.window.location.href = 'https://jeevacare-cmdm.vercel.app/dashboard';

    const error = {
      config: { url: '/patients/123' },
      response: {
        status: 401,
        data: { message: 'Token expired' },
      },
    };

    const interceptor = api.interceptors.response.handlers[0].rejected;

    await expect(interceptor(error)).rejects.toEqual(error);
    expect(global.window.location.href).toBe('/login');
    expect(global.localStorage.removeItem).toHaveBeenCalledWith('token');
    expect(global.localStorage.removeItem).toHaveBeenCalledWith('refreshToken');
  });

  it('should have valid Vercel SPA routing in client/vercel.json without cleanUrls conflict', () => {
    const vercelConfigPath = path.resolve(__dirname, '../../vercel.json');
    expect(fs.existsSync(vercelConfigPath)).toBe(true);

    const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf-8'));
    expect(config.rewrites).toBeDefined();

    const spaRewrite = config.rewrites.find(
      (r) => (r.source === '/(.*)' || r.source === '/:path*') && r.destination === '/index.html'
    );
    expect(spaRewrite).toBeDefined();

    const apiRewrite = config.rewrites.find(
      (r) => r.source === '/api/:path*' && r.destination.includes('onrender.com')
    );
    expect(apiRewrite).toBeDefined();

    // cleanUrls must not be true for Vite SPA to avoid Vercel 404 file lookups
    expect(config.cleanUrls).not.toBe(true);
  });

  it('should have default timeout >= 30000ms to accommodate Render cold starts', () => {
    expect(api.defaults.timeout).toBeGreaterThanOrEqual(30000);
  });

  it('should configure authService login and register with extended timeout for cloud sleep recovery', async () => {
    const { authService } = await import('./authService');
    const postSpy = vi.spyOn(api, 'post').mockResolvedValueOnce({
      success: true,
      tokens: { token: 'mock-token', refreshToken: 'mock-refresh' },
      user: { role: 'PATIENT' },
    });

    await authService.login('patient@demo.com', 'DemoPassword123');
    expect(postSpy).toHaveBeenCalledWith(
      '/auth/login',
      { email: 'patient@demo.com', password: 'DemoPassword123' },
      expect.objectContaining({ timeout: 45000 })
    );
  });
});

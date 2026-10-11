# Render Deployment Fix - Trust Proxy Configuration

## Problem Summary

**Production login requests were failing with:**
1. `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` from express-rate-limit
2. POST requests showing zero response bytes despite OPTIONS preflight succeeding
3. Render logs showing rate-limit errors preventing request processing

## Root Cause

Express was not configured to trust proxy headers from Render's load balancer. When Render forwards requests, it includes `X-Forwarded-For` headers to preserve client IP addresses. The `express-rate-limit` middleware detected these headers but Express was not configured to trust them, causing validation errors.

**From Render logs:**
```
ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
```

This error occurs when:
- `X-Forwarded-For` header is present
- Express `trust proxy` setting is `false` (default)
- Rate limiting middleware tries to validate the client IP

## Solution

Added Express trust proxy configuration in `server/src/index.js`:

```javascript
// Trust proxy - Required for Render deployment
// Render uses X-Forwarded-* headers which Express must trust for rate limiting and client IP detection
// Trust only the first proxy (Render's load balancer)
app.set('trust proxy', 1);
```

**Why `trust proxy` = 1:**
- `1` means trust the first proxy hop (Render's load balancer)
- Does not blindly trust arbitrary forwarded headers
- Secure for Render's deployment architecture
- Required for rate limiting, client IP detection, and CORS to work correctly

## Files Changed

### 1. `server/src/index.js`
**Change:** Added trust proxy configuration after app initialization
**Lines:** Added 5 lines (including comments)
**Impact:** Fixes rate-limit validation and request handling

### 2. `server/src/__tests__/auth-routes-cors.test.js` (NEW)
**Purpose:** Comprehensive test coverage for:
- POST /api/v1/auth/login route registration
- OPTIONS preflight CORS headers
- POST request CORS headers
- X-Forwarded-For header handling with trust proxy
- CORS origin validation (allow/reject)

**Test Results:** ✅ All 9 tests passed

## Verification

### Local Test Results
```
Test Files  1 passed (1)
Tests       9 passed (9)
Duration    12.07s
```

**Tests Confirm:**
- ✅ POST /api/v1/auth/login route is registered
- ✅ OPTIONS preflight returns 200/204 with CORS headers
- ✅ POST requests include CORS headers in responses
- ✅ X-Forwarded-For headers are accepted without errors
- ✅ No ERR_ERL_UNEXPECTED_X_FORWARDED_FOR errors
- ✅ Allowed origins receive Access-Control-Allow-Origin header
- ✅ Disallowed origins are properly rejected

### Required Render Environment Variables

**CORS_ORIGIN must include the Vercel preview/production URL:**

Current value (from earlier):
```
CORS_ORIGIN=http://localhost:5173,http://localhost:3000,http://localhost:8000,https://jeevacare-cdmd.vercel.app
```

**Verify this includes:**
- ✅ `https://jeevacare-cdmd.vercel.app` (production Vercel deployment)
- ✅ Any Vercel preview URLs if needed

## Production Deployment Checklist

### Before Deploying:
1. ✅ Trust proxy configuration added to server/src/index.js
2. ✅ Tests pass locally
3. ✅ Verify CORS_ORIGIN in Render includes Vercel URL
4. ⚠️ Verify Vercel environment variables include VITE_API_BASE_URL=/api/v1

### After Deploying to Render:
1. Check Render logs for successful startup (no ERR_ERL errors)
2. Verify `/healthz` returns healthy status
3. Test OPTIONS preflight: `curl -X OPTIONS https://jeevacare-th88.onrender.com/api/v1/auth/login -H "Origin: https://jeevacare-cdmd.vercel.app"`
4. Test POST login from Vercel frontend
5. Verify CORS headers in browser DevTools Network tab

## Expected Behavior After Fix

### OPTIONS Preflight:
- **Status:** 200 or 204
- **Headers:** 
  - `Access-Control-Allow-Origin: https://jeevacare-cdmd.vercel.app`
  - `Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type, Authorization`

### POST /api/v1/auth/login:
- **Status:** 401 (invalid credentials) or 200 (success)
- **Headers:**
  - `Access-Control-Allow-Origin: https://jeevacare-cdmd.vercel.app`
- **Body:** JSON response with success/error details

### Rate Limiting:
- No `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` errors
- Rate limiting works correctly using client IP from X-Forwarded-For
- Render logs show clean request processing

## Security Notes

- Trust proxy set to `1` (trust only first proxy)
- Does not trust arbitrary forwarded headers
- CORS origin allowlist enforced (no wildcards)
- Rate limiting remains active and functional
- No secrets or credentials exposed in configuration

## References

- [Express trust proxy documentation](https://expressjs.com/en/guide/behind-proxies.html)
- [Render proxy configuration](https://render.com/docs/tls#proxies-and-x-forwarded-for)
- [express-rate-limit trust proxy guide](https://github.com/express-rate-limit/express-rate-limit#:~:text=trust%20proxy)

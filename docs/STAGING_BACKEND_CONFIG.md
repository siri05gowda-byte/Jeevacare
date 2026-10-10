# JeevaCare Staging Backend Configuration Guide

**For Render Deployment**

## Overview

This document specifies all environment variables required to deploy the JeevaCare backend to Render staging environment. All values marked **[CHANGE]** must be updated from development defaults before deployment.

## Critical Security Rules

⚠️ **FAIL-SAFE: Strong JWT Secrets Required**

The backend MUST fail to start if production JWT secrets are not configured. Development defaults (`dev-jeevacare-secret-key-*`) are **strictly forbidden** in staging and production.

See the "JWT Configuration" section below.

---

## Environment Variables (Complete Reference)

### Node Environment

```
NODE_ENV=staging
PORT=5000
```

**Notes:**
- `NODE_ENV=staging` enables appropriate logging and error handling
- `PORT=5000` is standard; Render provides the port via `$PORT` environment variable

---

### Database (MongoDB Atlas)

```
MONGODB_URI=mongodb+srv://[USERNAME]:[PASSWORD]@[CLUSTER]/jeevacare?retryWrites=true&w=majority
```

**Required steps:**
1. Create/use existing MongoDB Atlas cluster for **staging** database
2. Create dedicated staging database user with read/write permissions on `jeevacare` database only
3. Add Render IP whitelist to MongoDB Atlas network access
4. Use **URL encoding** for special characters in password (e.g., `@` → `%40`)

**Example format (do not use actual credentials):**
```
mongodb+srv://staging_user_v1:P%40ssw0rd%2B123@jeevacare-staging.abc123.mongodb.net/jeevacare?retryWrites=true&w=majority
```

**Validation:**
- Verify connection string targets `jeevacare` database (not default)
- Test connection before deploying: `mongosh "MONGODB_URI_HERE"`

---

### JWT Configuration

#### JWT_SECRET (Access Token Secret)

```
JWT_SECRET=[CHANGE] - 64+ character random string
JWT_EXPIRATION=24h
```

**Requirements:**
- **Minimum 64 characters**
- Cryptographically random (use: `openssl rand -base64 48` or https://www.random.org/)
- **Must NOT contain development keyword** `dev-` or `development`
- **Must NOT be** `dev-jeevacare-secret-key-change-in-production-12345`

**Generation command:**
```bash
openssl rand -base64 48
```

**Validation:**
Backend will fail with error if `JWT_SECRET` contains `dev-` or `development` keyword.

---

#### REFRESH_TOKEN_SECRET

```
REFRESH_TOKEN_SECRET=[CHANGE] - 64+ character random string (different from JWT_SECRET)
REFRESH_TOKEN_EXPIRATION=7d
```

**Requirements:**
- **Minimum 64 characters**
- Cryptographically random
- **Must NOT contain** `dev-` or `development`
- **Must be different from JWT_SECRET**

**Generation command:**
```bash
openssl rand -base64 48
```

---

### API Keys

#### Groq AI API Key (Required for AI Features)

```
GROQ_API_KEY=[CHANGE] - Obtain from https://console.groq.com/keys
GROQ_MODEL=openai/gpt-oss-120b
```

**Obtain key:**
1. Create account at https://console.groq.com
2. Generate API key in dashboard
3. Store securely in Render environment variables

**Validation:**
- Start with `gsk_`
- Test in staging before production deployment

---

#### Cloudinary Credentials (Optional - For Image Upload)

```
CLOUDINARY_CLOUD_NAME=[optional]
CLOUDINARY_API_KEY=[optional]
CLOUDINARY_API_SECRET=[optional]
```

**If disabled:**
Document upload will use local file storage (acceptable for staging).

**If enabled:**
1. Create account at https://cloudinary.com
2. Obtain credentials from Dashboard
3. Use staging/test account (not production)

---

### CORS Configuration

```
CORS_ORIGIN=https://jeevacare-staging.vercel.app,https://staging.jeevacare.local
```

**Required:**
- Add comma-separated list of **all frontend origins** that will access this backend
- Include both Vercel staging URL and any custom staging domains
- Example: `https://jeevacare-staging.vercel.app,https://staging-internal.example.com`

**Security:**
- Never use wildcard `*` in production/staging
- Include only authorized frontend origins

---

### Logging

```
LOG_LEVEL=info
LOG_FORMAT=combined
```

**Options:**
- `LOG_LEVEL`: `error`, `warn`, `info`, `debug` (staging: use `info` or `debug`)
- `LOG_FORMAT`: `combined` (production format) or `simple`

---

### Rate Limiting

```
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Meaning:**
- Max 100 requests per IP per 15 minutes
- Staging: consider increasing to 200 for testing

---

### OTP Configuration

```
OTP_ENABLED=false
OTP_PROVIDER=console
```

**For staging:**
- Keep `OTP_ENABLED=false` (use demo authentication)
- When enabling in production, configure SMS/Email provider

---

### Text-to-Speech (TTS)

```
TTS_SERVICE_ENABLED=false
TTS_SERVICE_PROVIDER=google
```

**For staging:**
- Keep `TTS_SERVICE_ENABLED=false` (uses demo mode)
- Production deployment must configure external TTS provider

---

### DigiLocker Integration

```
DIGILOCKER_ENABLED=false
```

**For staging:**
- Keep disabled (not available in development)
- Production deployment requires DigiLocker OAuth credentials

---

### OCR Service

```
OCR_SERVICE_ENABLED=true
OCR_SERVICE_PROVIDER=tesseract
OCR_TIMEOUT_MS=60000
OCR_MAX_FILE_SIZE=10485760
```

**For staging:**
- `OCR_SERVICE_ENABLED=true` (uses Tesseract.js embedded)
- No external credentials required

---

## Complete Render Environment Variables (Ready to Paste)

Use this template in Render environment settings:

```
NODE_ENV=staging
PORT=5000
MONGODB_URI=mongodb+srv://[staging_user]:[PASSWORD_URLENCODED]@jeevacare-staging.abc123.mongodb.net/jeevacare?retryWrites=true&w=majority
JWT_SECRET=[CHANGE_64+_RANDOM_CHARS]
JWT_EXPIRATION=24h
REFRESH_TOKEN_SECRET=[CHANGE_64+_RANDOM_CHARS_DIFFERENT]
REFRESH_TOKEN_EXPIRATION=7d
GROQ_API_KEY=gsk_[CHANGE_YOUR_GROQ_KEY]
GROQ_MODEL=openai/gpt-oss-120b
CORS_ORIGIN=https://jeevacare-staging.vercel.app
LOG_LEVEL=info
LOG_FORMAT=combined
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
OTP_ENABLED=false
OTP_PROVIDER=console
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
AI_SERVICE_ENABLED=false
OCR_SERVICE_ENABLED=true
OCR_SERVICE_PROVIDER=tesseract
OCR_TIMEOUT_MS=60000
OCR_MAX_FILE_SIZE=10485760
TTS_SERVICE_ENABLED=false
TTS_SERVICE_PROVIDER=google
DIGILOCKER_ENABLED=false
```

---

## Deployment Checklist

- [ ] MongoDB Atlas: Created staging database + user + network access
- [ ] MongoDB Atlas: Verified staging user can connect
- [ ] JWT_SECRET: Generated 64+ random characters (no `dev-` keyword)
- [ ] REFRESH_TOKEN_SECRET: Generated 64+ random characters (no `dev-` keyword, different from JWT_SECRET)
- [ ] GROQ_API_KEY: Obtained from Groq console
- [ ] CORS_ORIGIN: Updated with actual staging frontend URL
- [ ] All variables added to Render environment settings
- [ ] Render health check: `GET /health` returns 200 OK
- [ ] Test: POST to `/api/v1/auth/register` with patient credentials
- [ ] Test: Verify JWT token issued (Bearer token in response)
- [ ] Test: Verify token validation on subsequent requests

---

## Validation: Backend Startup Check

After deploying to Render, verify startup:

```bash
# View logs in Render dashboard
# Look for successful messages:
# "✓ JeevaCare API Server running on port 5000"
# "📚 Environment: staging"
# "🗄️ Database: mongodb+srv://..."
```

**Fail-safe verification:**
If backend starts with development JWT secret, it will fail with:
```
Error: JWT_SECRET contains development keyword. Production/staging deployment requires strong secret.
```

This is intentional—development defaults are not allowed in staging/production.

---

## Troubleshooting

**Issue: "bad auth : authentication failed" on MongoDB**
- Verify credentials are URL-encoded (especially special characters)
- Check MongoDB Atlas network access includes Render IP
- Test connection string locally with mongosh

**Issue: CORS errors from frontend**
- Verify `CORS_ORIGIN` includes the exact Vercel staging URL
- Include protocol (https://), not just domain

**Issue: JWT token validation fails**
- Verify `JWT_SECRET` matches across requests (Render environment)
- Verify token expiration (`JWT_EXPIRATION=24h`)
- Check Authorization header format: `Bearer [token]`

---

## Next Steps

1. Prepare backend environment variables (this document)
2. Deploy to Render using `render.yaml` configuration
3. Verify health check endpoint
4. Test authentication flow end-to-end
5. Configure frontend (see `STAGING_FRONTEND_CONFIG.md`)
6. Run smoke tests (see `STAGING_SMOKE_TESTS.md`)

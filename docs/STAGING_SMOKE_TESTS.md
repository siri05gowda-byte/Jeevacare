# JeevaCare Staging Smoke Test Checklist

**Complete end-to-end validation tests for staging deployment**

---

## Pre-Deployment Tests (Local)

Run these tests locally before deploying to staging.

### 1. Backend Unit Tests

```bash
cd server
npm run test:quick
```

**Expected result:**
```
✓ src/utils/errors.test.js (7)
✓ src/utils/auth.test.js (5)
Test Files  2 passed (2)
Tests  12 passed (12)
```

**Failure means:** Do not deploy. Fix auth or error handling.

---

### 2. Frontend Tests

```bash
cd client
npm test -- --run
```

**Expected result:**
```
Test Files  5 passed (5)
Tests  60 passed (60)
```

**Failure means:** Do not deploy. Fix component or integration issues.

---

### 3. Production Build

```bash
npm run build
```

**Expected result:**
```
✓ 1,474 modules transformed
✓ built in 41s
dist/assets/index-[hash].js   387.02 kB │ gzip: 110.64 kB
```

**Failure means:** Do not deploy. Fix build errors.

---

### 4. JWT Secret Validation

Test that development secrets are rejected in staging mode:

```bash
# Local test: Start server with staging environment
NODE_ENV=staging JWT_SECRET=dev-secret npm run start:server
```

**Expected result:**
```
[SECURITY FAIL-SAFE] JWT_SECRET is not secure for staging environment.
Requirement: JWT_SECRET must be:
  • At least 32 characters long (preferably 64+)
  • Cryptographically random
  • NOT contain 'dev-' or 'development' keywords
```

**Server should NOT start. This is correct behavior.**

---

### 5. Database Connection Test

```bash
# Verify test database connects with corrected TEST_MONGODB_URI
cd server
npm test 2>&1 | grep -i "test database connected"
```

**Expected result:**
```
✓ Test database connected (MongoDB Atlas jeevacare-test)
```

**Note:** Integration tests may time out; this is expected. Look for the "connected" message.

---

## Post-Deployment Tests (Staging)

Run these tests after deploying to Render backend + Vercel frontend.

---

## Test 1: Backend Health Check

```bash
curl -i https://jeevacare-staging-api.onrender.com/health
```

**Expected response (200 OK):**
```json
{
  "success": true,
  "message": "JeevaCare API is running",
  "environment": "staging",
  "timestamp": "2024-10-10T12:45:00.000Z"
}
```

**Failure indicates:**
- Backend not running
- Port not exposed
- Environment variables not loaded

---

## Test 2: Patient Registration (Create Account)

```bash
curl -X POST https://jeevacare-staging-api.onrender.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-patient-'$(date +%s)'@jeevacare.local",
    "password": "SecurePass123!@",
    "name": "Test Patient",
    "role": "PATIENT",
    "dateOfBirth": "1990-01-15"
  }'
```

**Expected response (201 Created):**
```json
{
  "success": true,
  "message": "Patient registered successfully",
  "data": {
    "userId": "...ObjectId...",
    "jeevaId": "JCA-...",
    "email": "test-patient-...",
    "token": "eyJhbGc..."
  }
}
```

**Verify:**
- [ ] Status is 201
- [ ] Response contains `token` (JWT)
- [ ] `jeevaId` is assigned (format: `JCA-*`)
- [ ] Token is valid JWT (3 parts separated by dots)

---

## Test 3: Patient Login

```bash
PATIENT_EMAIL="test-patient-..@jeevacare.local"  # Use email from Test 2
PATIENT_PASSWORD="SecurePass123!@"

curl -X POST https://jeevacare-staging-api.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$PATIENT_EMAIL\",
    \"password\": \"$PATIENT_PASSWORD\",
    \"role\": \"PATIENT\"
  }"
```

**Expected response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "userId": "...",
      "email": "...",
      "role": "PATIENT"
    }
  }
}
```

**Verify:**
- [ ] Status is 200
- [ ] Response contains valid JWT token
- [ ] Token matches token from registration

---

## Test 4: Protected Route Authorization

Using token from Test 3:

```bash
TOKEN="eyJhbGc..."  # Use token from Test 3

curl -i https://jeevacare-staging-api.onrender.com/api/v1/patients/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Expected response (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": "...",
    "email": "...",
    "role": "PATIENT"
  }
}
```

**Verify:**
- [ ] Status is 200 (authorized)
- [ ] Response returns patient data
- [ ] No 401/403 errors

---

## Test 5: Invalid Token Rejection

```bash
curl -i https://jeevacare-staging-api.onrender.com/api/v1/patients/profile \
  -H "Authorization: Bearer invalid.token.here" \
  -H "Content-Type: application/json"
```

**Expected response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

**Verify:**
- [ ] Status is 401
- [ ] Request is rejected

---

## Test 6: Frontend Loads (Browser)

Open in browser:
```
https://jeevacare-staging.vercel.app
```

**Expected:**
- [ ] Page loads without 5xx errors
- [ ] No CORS errors in browser console
- [ ] Dashboard displays (may show login)

---

## Test 7: Frontend Registration Flow

In browser (https://jeevacare-staging.vercel.app):

1. Click "Register" or navigate to registration
2. Enter patient details:
   - Name: "Test User $(date +%s)"
   - Email: "frontend-test-$(date +%s)@example.local"
   - Password: "SecurePass123!@"
   - DOB: "1990-01-15"
3. Click Submit

**Expected:**
- [ ] Form submits without error
- [ ] Browser makes POST to correct API endpoint (verify in DevTools Network)
- [ ] Response contains JWT token
- [ ] Token stored in localStorage: `localStorage.getItem('token')`
- [ ] Redirected to dashboard or home page

---

## Test 8: Frontend Dashboard Access

After successful registration (Test 7):

**Expected:**
- [ ] Dashboard loads
- [ ] Patient name displayed
- [ ] No 401/403 errors
- [ ] Network requests go to staging API endpoint

---

## Test 9: Rate Limiting

From browser console or curl, make 150 rapid requests to any endpoint:

```bash
for i in {1..150}; do
  curl -s https://jeevacare-staging-api.onrender.com/health > /dev/null
done
```

**Expected:**
- [ ] Requests 1-100: 200 OK
- [ ] Requests 101-150: 429 Too Many Requests

**Verify rate limiting works** (protects against abuse)

---

## Test 10: CORS Security

From a different domain (e.g., http://localhost:3000), test:

```javascript
// In browser console (from different origin)
fetch('https://jeevacare-staging-api.onrender.com/api/v1/patients/profile', {
  method: 'GET',
  headers: { 'Authorization': 'Bearer ...' }
})
```

**Expected:**
- [ ] Request succeeds if `CORS_ORIGIN` includes origin
- [ ] Request fails if origin not in `CORS_ORIGIN`

---

## Test 11: Database Isolation

Verify test database is separate from production:

```bash
# In MongoDB Atlas UI:
# 1. Check "jeevacare" database has staging data (from registration tests)
# 2. Check "jeevacare-test" database exists separately
# 3. Verify production database is NOT touched
```

**Expected:**
- [ ] Two separate databases visible
- [ ] Staging data in "jeevacare"
- [ ] Production database untouched

---

## Test 12: Security Headers

```bash
curl -i https://jeevacare-staging-api.onrender.com/health | grep -i "X-"
```

**Expected headers:**
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY`
- [ ] `Strict-Transport-Security: ...`

---

## Test 13: Frontend Security Headers

```bash
curl -i https://jeevacare-staging.vercel.app | grep -i "X-"
```

**Expected headers:**
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY`

---

## Test 14: API Versioning

Verify API routes are versioned:

```bash
curl -i https://jeevacare-staging-api.onrender.com/api/v1/health
```

**Expected:**
- [ ] Works with `/api/v1/` prefix
- [ ] Old unversioned routes (if any) return 404

---

## Test 15: Error Handling

Request with invalid data:

```bash
curl -X POST https://jeevacare-staging-api.onrender.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "invalid-email"}'
```

**Expected (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [...]
}
```

**Verify:**
- [ ] Status is 400 (not 5xx)
- [ ] Error message is helpful
- [ ] No internal stack trace exposed

---

## Smoke Test Execution Checklist

- [ ] All 15 tests executed
- [ ] All expected results verified
- [ ] No critical failures
- [ ] Response times acceptable (< 2s typical)
- [ ] No security warnings in browser console

---

## Failure Diagnostics

If a test fails, check:

### Backend Issues
```bash
# View Render logs
# Render Dashboard → jeevacare-backend → Logs

# Check environment variables
# Render Dashboard → jeevacare-backend → Environment

# Verify database connection
# Test MongoDB Atlas connection with staging credentials

# Check CORS configuration
# Verify CORS_ORIGIN includes frontend URL
```

### Frontend Issues
```bash
# View browser console (F12)
# Check Network tab for failed requests
# Check localStorage for token presence

# Verify Vercel build
# Vercel Dashboard → Deployments → View logs

# Check environment variables
# Vercel Dashboard → Settings → Environment Variables
```

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| 502/503 backend error | Backend crashed or not running | Check Render logs, verify JWT secrets are not dev- defaults |
| CORS error from frontend | `CORS_ORIGIN` missing frontend URL | Add Vercel URL to backend `CORS_ORIGIN` |
| 404 on API routes | Wrong API base URL in frontend | Verify `VITE_API_BASE_URL` matches Render backend URL |
| 401 on protected routes | Token not sent or expired | Verify Bearer token in Authorization header |
| Token validation fails | JWT_SECRET mismatch | Verify same `JWT_SECRET` used to sign and verify tokens |

---

## Performance Baseline (Expected)

| Endpoint | Response Time | Status |
|----------|----------------|--------|
| `/health` | < 100ms | 200 |
| `/api/v1/auth/register` | < 500ms | 201 |
| `/api/v1/auth/login` | < 500ms | 200 |
| `/api/v1/patients/profile` | < 300ms | 200 |

---

## Sign-Off

After all 15 tests pass:

- [ ] Date: ____________
- [ ] Tester: ____________
- [ ] Status: ✓ STAGING READY FOR PRODUCTION VALIDATION

---

## Next Steps

1. ✓ Backend health and auth working
2. ✓ Frontend connected to staging API
3. ✓ Database properly isolated
4. ✓ Security headers in place
5. → Deploy to production (repeat smoke tests)

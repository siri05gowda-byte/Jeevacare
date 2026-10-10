# JeevaCare Staging Frontend Configuration Guide

**For Vercel Deployment**

## Overview

This document specifies all environment variables and configuration required to deploy the JeevaCare frontend to Vercel staging environment.

---

## Frontend Environment Variables

### API Connection

```
VITE_API_BASE_URL=https://jeevacare-staging-api.onrender.com
```

**Requirements:**
- Must match the Render backend staging URL
- Include protocol (`https://`)
- No trailing slash
- Must be accessible from browser (public URL)

**Example:**
```
VITE_API_BASE_URL=https://jeevacare-staging-backend.onrender.com
```

---

### Demo Mode Configuration

```
VITE_DEMO_MODE=false
VITE_DEMO_MODE_UNLOCK_KEY=not-used-in-staging
```

**For staging:**
- `VITE_DEMO_MODE=false` - Use real API calls to backend
- `VITE_DEMO_MODE_UNLOCK_KEY` - Can be empty string (not needed in staging)

---

### Feature Flags (Optional)

```
VITE_ENABLE_DEBUG_LOGS=false
VITE_ENABLE_PERFORMANCE_MONITORING=true
```

**For staging:**
- Debug logs: `false` (production mode)
- Performance monitoring: `true` (track issues before production)

---

## Complete Vercel Environment Variables (Ready to Paste)

Use this template in Vercel environment settings:

```
VITE_API_BASE_URL=https://jeevacare-staging-api.onrender.com
VITE_DEMO_MODE=false
VITE_DEMO_MODE_UNLOCK_KEY=
VITE_ENABLE_DEBUG_LOGS=false
VITE_ENABLE_PERFORMANCE_MONITORING=true
```

---

## Vercel Deployment Configuration

### vercel.json Setup

Create or update `vercel.json` in workspace root:

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "client/dist",
  "env": {
    "VITE_API_BASE_URL": {
      "default": "https://localhost:5000",
      "production": "https://jeevacare-api.onrender.com",
      "preview": "https://jeevacare-staging-api.onrender.com"
    }
  },
  "regions": ["iad1"],
  "framework": "vite",
  "buildCache": {
    "nodeModulesPattern": "**/node_modules/**"
  }
}
```

---

## Deployment Steps

### 1. Connect Repository

- [ ] Push code to GitHub/GitLab
- [ ] Connect repository to Vercel
- [ ] Select monorepo structure with `client` root

### 2. Build Settings in Vercel Dashboard

- [ ] Build Command: `npm install && npm run build --workspace=client`
- [ ] Output Directory: `client/dist`
- [ ] Environment: Node.js 18+

### 3. Environment Variables in Vercel Dashboard

Add all variables from "Complete Vercel Environment Variables" above:

- [ ] `VITE_API_BASE_URL=https://jeevacare-staging-api.onrender.com`
- [ ] `VITE_DEMO_MODE=false`
- [ ] `VITE_DEMO_MODE_UNLOCK_KEY=` (empty)
- [ ] `VITE_ENABLE_DEBUG_LOGS=false`
- [ ] `VITE_ENABLE_PERFORMANCE_MONITORING=true`

### 4. Deploy

- [ ] Click "Deploy" in Vercel dashboard
- [ ] Wait for build to complete (should take 2-3 minutes)
- [ ] Verify deployment URL is assigned

---

## Verification After Deployment

### Health Checks

1. **Frontend loads:**
   ```
   https://jeevacare-staging.vercel.app → Should render without 5xx errors
   ```

2. **API connectivity:**
   - Open browser DevTools → Network tab
   - Try to register a patient
   - Verify requests go to `https://jeevacare-staging-api.onrender.com/api/v1/...`

3. **Authentication flow:**
   - [ ] Register new patient account
   - [ ] Verify JWT token stored in localStorage
   - [ ] Navigate to dashboard
   - [ ] Verify dashboard loads patient data

---

## Frontend File Structure

```
client/
├── dist/                    # Built output (Vercel serves this)
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── stores/
│   └── utils/
├── vite.config.js           # Vite configuration
├── package.json
└── .env.production          # Production env file (local reference only)
```

**Important:** `.env` files are NOT deployed to Vercel. Use Vercel dashboard to set environment variables.

---

## Environment Variables Resolution Order

Vercel resolves variables in this order:

1. Vercel Environment Variables (highest priority)
2. `.env.production` in repository (if checked in)
3. `.env` in repository (fallback)

**Best practice:**
- Do NOT check in `.env` files
- Use Vercel dashboard for all sensitive variables
- `.env.local` is in `.gitignore` (verified)

---

## CORS Configuration

### Backend CORS Must Allow Frontend Origin

The backend's `CORS_ORIGIN` environment variable must include:
```
https://jeevacare-staging.vercel.app
```

If frontend receives CORS errors:
1. Check backend `CORS_ORIGIN` in Render environment
2. Add staging Vercel URL if missing
3. Restart backend

---

## Troubleshooting

**Issue: "Cannot GET /" (404)**
- Verify `outputDirectory: client/dist` in vercel.json
- Verify build command produces `client/dist/index.html`

**Issue: API calls fail with CORS error**
- Check backend `CORS_ORIGIN` includes Vercel frontend URL
- Verify `VITE_API_BASE_URL` matches backend domain

**Issue: Authentication fails (token not stored)**
- Check browser console for errors
- Verify localStorage is enabled in browser
- Verify backend `/api/v1/auth/register` returns JWT token

**Issue: 502/503 errors from API**
- Check backend is running on Render
- Check `VITE_API_BASE_URL` is correct in Vercel env
- Check network connectivity from Vercel region to Render

---

## Performance Considerations

- Build output should be < 400 KB gzipped (current: 387 KB ✓)
- Vercel uses Edge Network CDN automatically
- Static assets are cached indefinitely
- API responses are not cached (fresh on each request)

---

## Security Best Practices

- [ ] Never store secrets in frontend code
- [ ] Never store JWT in URL or query parameters
- [ ] Use `localStorage` for JWT (HttpOnly not applicable for SPA)
- [ ] Always use HTTPS endpoints (never HTTP)
- [ ] CORS_ORIGIN on backend is strict (not wildcard)

---

## Next Steps

1. Prepare backend environment variables (see `STAGING_BACKEND_CONFIG.md`)
2. Deploy backend to Render first
3. Prepare frontend environment variables (this document)
4. Deploy frontend to Vercel
5. Run smoke tests (see `STAGING_SMOKE_TESTS.md`)

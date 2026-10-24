# JeevaCare Render Deployment Guide

## Overview

This guide explains how to deploy JeevaCare to Render with the synthetic multi-hospital demo data.

**Key Principle**: For a **staging/demo** deployment, both the application and the seed runner must use the **same isolated test database** (`jeevacare-test`).

---

## Environment Configuration

### Step 1: Determine Your Database

You need **one MongoDB Atlas database** (separate from production):
- Database name: `jeevacare-test` (critical — seed runner validates this)
- Status: Isolated for demo/staging use only
- Cluster: Your MongoDB Atlas cluster

Example URI structure:
```
mongodb+srv://username:password@cluster.mongodb.net/jeevacare-test?appName=JeevaCare
```

### Step 2: Set Render Environment Variables

In the **Render Dashboard** for the `jeevacare-backend` service, add these environment variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `staging` | Already set in render.yaml |
| `MONGODB_URI` | `mongodb+srv://...jeevacare-test...` | **Must match TEST_MONGODB_URI** |
| `TEST_MONGODB_URI` | `mongodb+srv://...jeevacare-test...` | Used by seed runner |
| `JWT_SECRET` | (32+ char random string, no 'dev-' prefix) | Generate new for staging |
| `REFRESH_TOKEN_SECRET` | (32+ char random string, no 'dev-' prefix) | Generate new for staging |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary account | Optional for demo |
| `CLOUDINARY_API_KEY` | Your Cloudinary API key | Optional for demo |
| `CLOUDINARY_API_SECRET` | Your Cloudinary secret | Optional for demo |
| `GROQ_API_KEY` | Your Groq API key | Optional; demo mode if unset |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | `your-spreadsheet-id` | 44-character spreadsheet ID from URL |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `sa-name@project-id.iam.gserviceaccount.com` | Service account email shared as Editor |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | `"-----BEGIN PRIVATE KEY-----\n..."` | Full private key from JSON (alias `GOOGLE_PRIVATE_KEY` also supported) |
| `RUN_SEED_ACTUAL` | `false` | Keep false by default — set to `true` only to execute seed |
| `RUN_SEED_DRY_RUN` | `false` | Keep false — set to `true` to validate seed without writes |

**Critical**: 
- `MONGODB_URI` and `TEST_MONGODB_URI` **must be identical** for staging
- Both must point to `jeevacare-test` database
- For Google Sheets synchronization: Ensure the spreadsheet is shared with the service account email as **Editor**. Escaped `\n` sequences in `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` are automatically unescaped. You can verify live connection status via `GET /api/v1/health/sheets` or run a smoke test via `POST /api/v1/health/sheets/test`.

---

## Seeding the Demo Database

### Dry-Run First (Recommended)

**Purpose**: Validate seed logic without writing to database

1. In Render Dashboard, set `RUN_SEED_DRY_RUN=true`
2. Trigger a manual deploy
3. Observe logs:
   - Should see `🌱 JeevaCare Seed Runner - DRY_RUN Mode`
   - Should show all entities that **would** be created (hospitals, admins, doctors, patients)
   - **No database writes** occur
4. Verify output includes:
   ```
   ✅ Seed operation completed successfully (exit code: 0)
   ```
5. After dry-run succeeds, set `RUN_SEED_DRY_RUN=false` (reset)

### Execute Actual Seed

**Purpose**: Populate demo database with all synthetic data

1. Ensure dry-run has completed and succeeded
2. In Render Dashboard, set `RUN_SEED_ACTUAL=true`
3. Trigger a manual deploy
4. Monitor logs:
   - Should see `🌱 JeevaCare Seed Runner - ACTUAL Mode`
   - Should show creation of 2 hospitals, 2 admins, 11 doctors (5+5+1), 20 patients
   - Should complete with exit code 0
5. **After deploy succeeds**, set `RUN_SEED_ACTUAL=false` (critical to prevent re-seeding on next deploy)

---

## Verification

### 1. Check Seed Completed

In Render logs after deploy:
```
🏥 Seeding hospitals...
  ✓ Sanjivani Hospital (JC-HOSP-SANJIVANI-001)
  ✓ Aarogya Kendra (JC-HOSP-AAROGYA-KENDRA-001)

👤 Seeding hospital administrators...
  ✓ Prakash Rao (Sanjivani)
  ✓ Revathi Kumar (Aarogya Kendra)

🏥 Sanjivani Hospital doctors...
  ✓ Soundarya Shetty
  ✓ Christopher Matthews
  ✓ Manjunath Rao
  ✓ Asia Begum
  ✓ Ansh Kumar

🏥 Aarogya Kendra doctors...
  ✓ Harshith Bagrecha
  ✓ Ashwin S.
  ✓ Apoorva Santosh
  ✓ Siri M.N.
  ✓ Vinay Kumar

👨‍⚕️ Shared doctor across hospitals...
  ✓ Swami Murti

👥 Seeding patients...
  [Sanjivani: 10 patients]
  [Aarogya Kendra: 10 patients]

✅ Seed operation completed successfully (exit code: 0)
```

### 2. Test Login (Frontend)

Use credentials from `DEMO_CREDENTIALS.json` (local, never committed):

**Admin - Sanjivani Hospital:**
- Email: `prakash.rao@sanjivani.in`
- Password: `PrakashRao@123`

**Admin - Aarogya Kendra:**
- Email: `revathi.kumar@aarogya.in`
- Password: `RevathiKumar@123`

**Doctor - Aarogya Kendra:**
- Email: `harshith.bagrecha@aarogya.in`
- Password: `HarshithBagrecha@123`

**Doctor - Shared (both hospitals):**
- Email: `swami.murti@jeevacare.in`
- Password: `SwamiMurti@123`

### 3. Check Database Records

Query MongoDB `jeevacare-test`:

```javascript
// Count records
db.hospitals.countDocuments()  // Should be 2
db.users.countDocuments()       // Should include 2 admins, 11 doctors (staff DOCTOR role), 20 patients
db.healthcareprofessionals.countDocuments()  // Should be 11 (one for each doctor)
db.patients.countDocuments()    // Should be 20
db.hospitalstaff.countDocuments()  // Should include doctor-hospital associations
```

---

## Troubleshooting

### Seed Fails with "Database mismatch" error

```
❌ SAFETY CHECK FAILED
   Expected database: jeevacare-test
   Got: other-database-name
```

**Cause**: `TEST_MONGODB_URI` points to wrong database
**Fix**: Update `TEST_MONGODB_URI` in Render Dashboard to include `/jeevacare-test` in the URI path

### Seed Fails with "TEST_MONGODB_URI not set"

```
❌ SAFETY CHECK FAILED
   TEST_MONGODB_URI environment variable is not set
```

**Cause**: Environment variable not set in Render Dashboard
**Fix**: Add `TEST_MONGODB_URI` to Render Dashboard environment variables

### Login Fails with "Invalid email or password"

Possible causes:
1. Seed hasn't been executed (users don't exist in database)
2. User email doesn't match exactly (case-sensitive)
3. Password is wrong

**Debug**:
- Check Render logs that seed completed successfully
- Try from `DEMO_CREDENTIALS.json` exactly
- Verify database connection (`MONGODB_URI` is correct)

### Shared Doctor "Swami Murti" Not Accessible in Both Hospitals

**Expected behavior**: Swami Murti should have single user identity with facility associations to **both** hospitals.

**Check**:
- Query HealthcareProfessional for `email: 'swami.murti@jeevacare.in'`
- Verify `facilityAssociations` array contains 2 hospital IDs (one for each hospital)
- Do NOT create duplicate accounts

---

## Health Checks

### API Health Endpoint

```bash
curl https://your-render-app.onrender.com/health
```

Expected response:
```json
{
  "success": true,
  "message": "JeevaCare API v1 is healthy",
  "timestamp": "2026-10-07T..."
}
```

### Health Config Endpoint

```bash
curl https://your-render-app.onrender.com/health/config
```

Expected response shows deployed configuration (no secrets):
```json
{
  "success": true,
  "config": {
    "environment": "staging",
    "port": 5000,
    "supportedLanguages": ["en", "hi", "kn", "te", "ta", "ml"],
    "piperTtsSupported": [],
    "corsOrigins": ["https://jeevacare-cmdm.vercel.app", "http://localhost:5173"]
  }
}
```

---

## Security Notes

1. **DEMO_CREDENTIALS.json** is never committed; it's local-only reference
2. **Plaintext passwords** in `DEMO_CREDENTIALS.json` are **synthetic/fictional** — for demo only
3. **JWT_SECRET** and **REFRESH_TOKEN_SECRET** must be strong, unique strings (32+ chars)
4. **Production deployment**: Use separate production database and different secrets
5. **RUN_SEED_ACTUAL** must be reset to `false` after seeding to prevent re-running on every deploy
6. **No production data** should ever use the seed runner or `jeevacare-test` database

---

## Next Steps

1. Set environment variables in Render Dashboard
2. Run dry-run seed (set `RUN_SEED_DRY_RUN=true` → deploy)
3. Verify dry-run succeeds in logs
4. Run actual seed (set `RUN_SEED_ACTUAL=true` → deploy)
5. Verify records in database
6. Test logins with admin and doctor accounts
7. Reset `RUN_SEED_ACTUAL=false` to prevent re-seeding
8. Generate credentials PDF for authorized users

---

## Database Safety Guards

The seed runner implements multiple safety layers:

✅ **Requires explicit flags** (`RUN_SEED_ACTUAL=true`) — won't seed by default  
✅ **Validates database name** — rejects non-`jeevacare-test` databases  
✅ **Validates NODE_ENV** — forces `development` during seed  
✅ **Idempotent** — safe to re-run; checks existing records before creating  
✅ **Dry-run mode** — validates logic without writes  
✅ **No production fallback** — rejects production environment  

---

**Last Updated**: October 7, 2026  
**JeevaCare Version**: Demo/Staging  
**Status**: Ready for deployment

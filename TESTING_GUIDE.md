# Testing Guide for Dashboard Fixes

**Date:** October 7, 2026  
**Fixes Applied:** Patient ID confusion, HospitalStaff association, Verification migration

---

## Pre-Testing: Database Verification

### Step 1: Check Current Database State

Connect to production MongoDB and run these **read-only** queries:

```javascript
// 1. Find demo patient
const demoPatient = db.users.findOne({ email: "patient@demo.com" });
console.log("Demo Patient User ID:", demoPatient._id);
console.log("Verification Status:", demoPatient.verificationStatus);

// 2. Find demo patient profile
const patientProfile = db.patients.findOne({ userId: demoPatient._id });
console.log("Patient Profile ID:", patientProfile._id);
console.log("JeevaID:", patientProfile.jeevaId);

// 3. Find demo doctor
const demoDoctor = db.users.findOne({ email: "doctor@demo.com" });
console.log("Demo Doctor User ID:", demoDoctor._id);
console.log("Role:", demoDoctor.role);

// 4. Check doctor's HospitalStaff record
const doctorStaff = db.hospitalstaff.findOne({ 
  userId: demoDoctor._id,
  associationStatus: "active" 
});
console.log("HospitalStaff Record:", doctorStaff ? "EXISTS" : "MISSING");
if (doctorStaff) {
  console.log("Hospital ID:", doctorStaff.hospitalId);
  console.log("Permissions:", doctorStaff.permissions);
}

// 5. Count pending patients
const pendingCount = db.users.countDocuments({ 
  role: "PATIENT", 
  verificationStatus: "pending" 
});
console.log("Patients with pending status:", pendingCount);
```

**Record the results** - you'll need them for troubleshooting.

---

## Applying Fixes

### Fix #1: Frontend Code (Already Applied)

**Files Modified:**
- `client/src/pages/DocumentsPage.jsx`
- `client/src/pages/PatientAppointmentsPage.jsx`

**Changes:**
- Updated `getPatientId()` to never fallback to User ID
- Added proper error handling and messages
- Throws clear errors when patient profile unavailable

**Deployment Required:** Yes - Vercel must rebuild frontend

### Fix #2: Create HospitalStaff Association

**Only run if Step 1 verification shows NO staff record for demo doctor**

```bash
cd server
node src/scripts/verifyAndFixDemoDoctor.js
```

**Expected Output:**
```
✓ Connected to MongoDB
✓ Found doctor: doctor@demo.com
✗ No active HospitalStaff association found
✓ Found hospital: [Hospital Name]
✓ HospitalStaff association created successfully
✓ Verification successful!
✓ ALL STEPS COMPLETED SUCCESSFULLY
```

**If script fails:**
- Check MongoDB connection string
- Verify demo doctor email exists
- Ensure at least one verified hospital exists

### Fix #3: Execute Verification Migration

**Only run if Step 1 verification shows pending patients > 0**

```bash
cd server
node src/scripts/migratePatientVerificationStatus.js
```

**Expected Output:**
```
Pre-flight check:
- Patients with pending status: X

Updating patient verification status...
✓ Updated X patient records to verified status

Verification:
- Patients with pending status: 0
- Patients with verified status: [total patient count]
```

---

## Testing Workflows

### Environment

- **Frontend:** https://jeevacare-cmdm.vercel.app
- **Backend:** https://jeevacare-th88.onrender.com
- **Test Accounts:** 
  - Patient: `patient@demo.com` / [password]
  - Doctor: `doctor@demo.com` / [password]

### Browser Setup

1. Open browser in **Incognito/Private mode** (clean session)
2. Open **Developer Tools** (F12)
3. Go to **Console** tab (watch for errors)
4. Go to **Network** tab (watch API calls)
5. Keep both tabs visible during testing

---

## Patient Workflow Tests

### Test #1: Patient Documents Page ✅ PRIORITY HIGH

**Issue:** Generic "Something went wrong" error  
**Root Cause:** Wrong Patient ID passed to API  
**Fix:** Updated `getPatientId()` function

**Steps:**
1. Login as `patient@demo.com`
2. Navigate to `/documents`
3. **Watch console** for errors
4. **Watch network tab** for `GET /api/v1/documents/patient/:id`

**Expected Results:**
- ✅ Page loads successfully
- ✅ Shows "No documents yet" if empty, or document list if populated
- ✅ No "Something went wrong" error
- ✅ Network call to `/api/v1/documents/patient/[CORRECT_PATIENT_ID]`
- ✅ HTTP 200 response
- ✅ Response body: `{ success: true, documents: [...], count: N }`

**If FAILS:**
- Check console error message
- Copy network response body
- Verify Patient Profile ID from database matches API call
- Check if `/api/v1/patients/profile` returns valid data

**Browser Console Check:**
```javascript
// Should NOT see: "Failed to get patient ID"
// Should NOT see: HTTP 400 "Patient not found"
// Should see valid patient ID logged
```

---

### Test #2: Patient Appointments Page ✅ PRIORITY HIGH

**Issue:** HTTP 400 error  
**Root Cause:** Wrong Patient ID passed to API  
**Fix:** Updated `getPatientId()` function

**Steps:**
1. Still logged in as `patient@demo.com`
2. Navigate to `/appointments`
3. **Watch console** for errors
4. **Watch network tab** for `GET /api/v1/appointments/patient/:id`

**Expected Results:**
- ✅ Page loads successfully
- ✅ Shows "No Appointments Found" if empty, or appointment list if populated
- ✅ No HTTP 400 error
- ✅ Network call to `/api/v1/appointments/patient/[CORRECT_PATIENT_ID]`
- ✅ HTTP 200 response
- ✅ Response body: `{ success: true, data: [...], count: N }`

**If FAILS:**
- Check console error message
- Copy network response body
- Verify error is not "Patient not found: [user-id]"
- If still HTTP 400, check backend logs for actual error

**Browser Console Check:**
```javascript
// Should NOT see: "Patient not found: [some-id]"
// Should NOT see: HTTP 400 
// Should see appointment data or empty array
```

---

### Test #3: Patient Account Settings ✅ PRIORITY MEDIUM

**Issue:** Shows "Pending" verification status  
**Root Cause:** Migration script not executed  
**Fix:** Ran `migratePatientVerificationStatus.js`

**Steps:**
1. Still logged in as `patient@demo.com`
2. Navigate to `/settings` or `/profile`
3. Look for **Verification Status** field

**Expected Results:**
- ✅ Status shows "Verified" (green badge/checkmark)
- ✅ NOT "Pending" or "Pending Verification"
- ✅ Patient can access all features without restrictions

**If FAILS:**
- Re-run migration script
- Check database: `db.users.findOne({ email: "patient@demo.com" }, { verificationStatus: 1 })`
- Should return: `{ verificationStatus: "verified" }`
- If still "pending", migration didn't apply

---

## Doctor Workflow Tests

### Test #4: Doctor Appointments Page ✅ PRIORITY HIGH

**Issue:** HTTP 403 "Insufficient permissions"  
**Root Cause:** Missing HospitalStaff association → no facilityId  
**Fix:** Created HospitalStaff record via script

**Steps:**
1. **Logout** patient, **Login** as `doctor@demo.com`
2. Navigate to `/hospital/appointments`
3. **Watch console** for errors
4. **Watch network tab** for `GET /api/v1/appointments/doctor/:id`

**Expected Results:**
- ✅ Page loads successfully
- ✅ Shows "No Appointments Found" if empty, or appointment list if populated
- ✅ No HTTP 403 error
- ✅ No "No facility associated" error
- ✅ Network call includes `facilityId` parameter
- ✅ HTTP 200 response
- ✅ Response body: `{ success: true, data: [...], count: N }`

**If FAILS:**
- Check if script created HospitalStaff record
- Verify in DB: `db.hospitalstaff.findOne({ userId: [doctor-id], associationStatus: "active" })`
- Check error message in console
- If still "No facility", auth middleware may not be resolving facilityId

**Browser Console Check:**
```javascript
// Should NOT see: "No facility associated with your account"
// Should NOT see: HTTP 403
// Should see appointment data or empty array
```

---

### Test #5: Doctor Schedule Page ✅ PRIORITY HIGH

**Issue:** "No facility associated with your account"  
**Root Cause:** Missing HospitalStaff association  
**Fix:** Created HospitalStaff record via script

**Steps:**
1. Still logged in as `doctor@demo.com`
2. Navigate to `/hospital/schedule`
3. **Watch console** for errors

**Expected Results:**
- ✅ Page loads successfully
- ✅ Shows schedule interface (calendar/time slots)
- ✅ No "No facility associated" error message
- ✅ Can view/modify availability

**If FAILS:**
- Same troubleshooting as Test #4
- Check if page makes API call with facilityId
- Verify HospitalStaff record exists

---

### Test #6: Doctor Patients Page ✅ PRIORITY HIGH

**Issue:** Generic "Something went wrong" error  
**Root Cause:** Missing HospitalStaff association → no facilityId  
**Fix:** Created HospitalStaff record via script

**Steps:**
1. Still logged in as `doctor@demo.com`
2. Navigate to `/hospital/patients`
3. Try searching for a patient
4. **Watch console** and **network tab**

**Expected Results:**
- ✅ Page loads successfully
- ✅ Search interface available
- ✅ Can search patients by name/ID
- ✅ Results scoped to doctor's facility
- ✅ No generic error

**If FAILS:**
- Check API endpoint called (likely `/api/v1/patients/search` or similar)
- Verify facilityId is included in request
- Check backend authorization logic

---

### Test #7: Doctor Document Upload ✅ PRIORITY HIGH

**Issue:** Generic "Something went wrong" error  
**Root Cause:** Missing HospitalStaff association → no facilityId context  
**Fix:** Created HospitalStaff record via script

**Steps:**
1. Still logged in as `doctor@demo.com`
2. Navigate to a patient's medical records page
3. Find "Upload Document" button
4. Select a test PDF file
5. Fill document type and description
6. Click "Upload"
7. **Watch console** and **network tab**

**Expected Results:**
- ✅ Upload interface loads
- ✅ Can select file and fill metadata
- ✅ Upload succeeds
- ✅ Network call to `POST /api/v1/documents/upload`
- ✅ Request includes `patientId`, `facilityId`, file
- ✅ HTTP 200 response
- ✅ Document appears in patient's document list
- ✅ Success toast notification

**If FAILS:**
- Check request payload in network tab
- Verify facilityId is included
- Check if file upload configuration (Cloudinary) is working
- Verify document persists and can be retrieved

**Additional Verification:**
After successful upload:
1. Logout doctor
2. Login as the patient whose document was uploaded
3. Navigate to patient `/documents`
4. Verify uploaded document appears in list
5. Try downloading it

---

## Regression Testing

### Backend Tests

```bash
cd server
npm test
```

**Expected:**
- ✅ All tests pass (or at least same failures as before)
- ✅ No new test failures
- ✅ Auth tests still pass
- ✅ Appointment tests pass

### Frontend Build

```bash
cd client
npm run build
```

**Expected:**
- ✅ Build succeeds
- ✅ No TypeScript/ESLint errors
- ✅ No new warnings

### Manual Security Checks

**Test Patient Isolation:**
1. Login as `patient@demo.com`
2. Get patient ID from `/api/v1/patients/profile`
3. Try accessing another patient's data (if you have another patient ID)
4. **Expected:** HTTP 403 "Cannot access other patients' records"

**Test Facility Isolation:**
1. Login as `doctor@demo.com`
2. Try accessing appointments with a different facilityId
3. **Expected:** Empty results or HTTP 403

---

## Results Documentation Template

### Test Execution Date: [DATE]
### Tester: [YOUR NAME]
### Environment: Production (Vercel + Render)

| Test | Status | Notes | Screenshots |
|------|--------|-------|-------------|
| Pre-Test DB Verification | ☐ PASS / ☐ FAIL | Patient ID: ___, Doctor Staff ID: ___ | |
| Fix #1: Frontend Deploy | ☐ PASS / ☐ FAIL | Vercel deployment: ___ | |
| Fix #2: HospitalStaff Script | ☐ PASS / ☐ FAIL / ☐ SKIP | Script output: ___ | |
| Fix #3: Migration Script | ☐ PASS / ☐ FAIL / ☐ SKIP | Updated X records | |
| Test #1: Patient Documents | ☐ PASS / ☐ FAIL | HTTP Status: ___ | |
| Test #2: Patient Appointments | ☐ PASS / ☐ FAIL | HTTP Status: ___ | |
| Test #3: Patient Verification | ☐ PASS / ☐ FAIL | Status: ___ | |
| Test #4: Doctor Appointments | ☐ PASS / ☐ FAIL | HTTP Status: ___ | |
| Test #5: Doctor Schedule | ☐ PASS / ☐ FAIL | | |
| Test #6: Doctor Patients | ☐ PASS / ☐ FAIL | HTTP Status: ___ | |
| Test #7: Doctor Upload | ☐ PASS / ☐ FAIL | Document ID: ___ | |
| Backend Tests | ☐ PASS / ☐ FAIL | X/Y passing | |
| Frontend Build | ☐ PASS / ☐ FAIL | | |
| Security Checks | ☐ PASS / ☐ FAIL | | |

### Issues Found
[List any failures, unexpected behavior, or edge cases discovered]

### Additional Notes
[Any other observations, performance issues, or recommendations]

---

## Troubleshooting

### Issue: "Unable to load your patient profile"

**Cause:** `/api/v1/patients/profile` endpoint failing

**Debug:**
```bash
# Test endpoint directly
curl https://jeevacare-th88.onrender.com/api/v1/patients/profile \
  -H "Authorization: Bearer <patient-token>"
```

**Check:**
- Is user logged in with PATIENT role?
- Does patient profile exist in database?
- Is backend route registered?

### Issue: Doctor features still say "No facility"

**Cause:** HospitalStaff record not created or inactive

**Debug:**
```javascript
// In MongoDB
db.hospitalstaff.findOne({ 
  userId: ObjectId("[doctor-user-id]")
});

// Should return document with:
// - associationStatus: "active"
// - employmentStatus: "active"
// - hospitalId: ObjectId(...)
```

**Fix:**
- Re-run `verifyAndFixDemoDoctor.js`
- Manually create record if script fails
- Check for typos in associationStatus/employmentStatus

### Issue: Migration didn't update patients

**Cause:** Script didn't run or MongoDB connection failed

**Debug:**
```javascript
// Count pending patients
db.users.countDocuments({ 
  role: "PATIENT", 
  verificationStatus: "pending" 
});

// Should be 0 after migration
```

**Fix:**
- Re-run migration script
- Check script output for errors
- Manually update if needed:
```javascript
db.users.updateMany(
  { role: "PATIENT", verificationStatus: "pending" },
  { $set: { verificationStatus: "verified" } }
);
```

---

## Success Criteria Summary

**ALL of the following must be true:**

✅ Patient Documents page loads without errors  
✅ Patient Appointments page loads without HTTP 400  
✅ Patient account shows "Verified" status  
✅ Doctor Appointments page loads without HTTP 403  
✅ Doctor Schedule page loads without "No facility" error  
✅ Doctor Patients page search works  
✅ Doctor document upload succeeds and persists  
✅ Backend tests pass  
✅ Frontend builds successfully  
✅ Patient isolation still enforced  
✅ Facility isolation still enforced  

**If any test fails, DO NOT mark as complete. Document the failure and investigate root cause.**

---

## Next Steps After Testing

### If All Tests Pass:
1. Document successful test results
2. Close related issues/tickets
3. Monitor production for 24-48 hours
4. Consider adding automated E2E tests for these workflows

### If Any Test Fails:
1. Document exact failure with screenshots/logs
2. Identify which fix didn't work
3. Debug root cause
4. Apply additional fixes
5. Re-test complete workflow

---

**END OF TESTING GUIDE**

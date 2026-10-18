# JeevaCare Synthetic Test Cheatsheet

**Last Updated:** October 2026  
**Environment:** Development/Staging  
**Status:** Synthetic Data (NOT Production)

---

## ⚠️ IMPORTANT

This document describes a **fictional, synthetic healthcare dataset** created for testing and demonstration purposes only.

- **NOT Real Hospitals**: Aarogya and Sanjeevani are fictional institutions
- **NOT Real Patients**: All patient data is synthetically generated
- **NOT Clinical Data**: Records are for UI/UX testing, not clinical research
- **For Testing Only**: Never use this dataset for production decisions
- **Safe to Reset**: Entire dataset is ephemeral and can be recreated

---

## 🏥 Hospitals

### Hospital A: Aarogya Multispeciality Hospital

| Field | Value |
|-------|-------|
| **Name** | Aarogya Multispeciality Hospital |
| **Facility ID** | `JC-HOSP-AROGYA-001` |
| **Location** | Bengaluru, Karnataka |
| **Address** | 123 Whitefield Road, Bengaluru 560066 |
| **Phone** | +91-080-40615000 |
| **Email** | info@aarogyahosp.in |
| **Status** | Active & Verified |
| **Services** | Emergency, Cardiology, Orthopedics, Pediatrics, General Surgery |

### Hospital B: Sanjeevani City Hospital

| Field | Value |
|-------|-------|
| **Name** | Sanjeevani City Hospital |
| **Facility ID** | `JC-HOSP-SANJEEVANI-001` |
| **Location** | Mysuru, Karnataka |
| **Address** | 456 Indiranagar, Mysuru 570001 |
| **Phone** | +91-0821-2345678 |
| **Email** | admin@sanjeevani-hosp.in |
| **Status** | Active & Verified |
| **Services** | Emergency, Neurology, ENT, Obstetrics, Dermatology |

---

## 👨‍💼 System Administrators

There is currently **1 System Administrator** seeded (existing demo account, preserved):

| Email | Password | Role | Hospital | Status |
|-------|----------|------|----------|--------|
| `admin@demo.jeevacare` | `demo_admin_123` | SYSTEM_ADMIN | None (Platform-level) | Active |

To create additional system administrators:
- Use the secure bootstrap endpoint (requires environment secret)
- OR use the provisioning script
- See "System Administrator Provisioning" section below

---

## 🏨 Hospital Administrators

Each hospital has a dedicated hospital administrator:

### Aarogya Hospital Admin

| Field | Value |
|-------|-------|
| **Email** | `admin@aarogya.in` |
| **Password** | `hospital_admin_123` |
| **Name** | Rajesh Kumar |
| **JeevaCare ID** | `JC-ADM-H0000` |
| **Hospital** | Aarogya Multispeciality Hospital |
| **Role** | HOSPITAL_ADMIN |
| **Affiliation Status** | Active |
| **Responsibilities** | Approve/reject staff registrations, manage facility users |

### Sanjeevani Hospital Admin

| Field | Value |
|-------|-------|
| **Email** | `admin@sanjeevani.in` |
| **Password** | `hospital_admin_123` |
| **Name** | Priya Sharma |
| **JeevaCare ID** | `JC-ADM-H0001` |
| **Hospital** | Sanjeevani City Hospital |
| **Role** | HOSPITAL_ADMIN |
| **Affiliation Status** | Active |
| **Responsibilities** | Approve/reject staff registrations, manage facility users |

---

## 👨‍⚕️ Doctors (Synthetic)

Up to **5 synthetic doctors** are created by the seed script, distributed across both hospitals.

### Example Doctor Accounts

Sample credentials (exact accounts vary with seed):

| Name | Email | Password | Hospital(s) | Specialization |
|------|-------|----------|-------------|-----------------|
| Dr. Arun Sharma | `dr.arun.sharma@jeevacare.in` | `doctor_123` | Aarogya | General Practitioner |
| Dr. Vikram Kumar | `dr.vikram.kumar@jeevacare.in` | `doctor_123` | Sanjeevani | Cardiology |
| Dr. Priya Nair | `dr.priya.nair@jeevacare.in` | `doctor_123` | Aarogya | Pediatrics |
| ... | ... | ... | ... | ... |

**All doctors:**
- Can view/create patient records
- Can create diagnoses and prescriptions
- Can manage their appointments
- Are initially affiliated with one hospital
- Can request affiliation with additional hospitals

**To find exact doctor names:**
```bash
# Query database
db.users.find({ role: "DOCTOR" }, { email: 1, profile: 1 })
```

---

## 👥 Patients (Synthetic)

Up to **15 synthetic patients** are created by the seed script.

### Example Patient Accounts

| Name | Email | Password | JeevaCare ID | Blood Group |
|------|-------|----------|--------------|-------------|
| Sample Patient 1 | `arun.sharma@example.com` | `patient_123` | `JC-PAT-0000` | O+ |
| Sample Patient 2 | `priya.kumar@example.com` | `patient_123` | `JC-PAT-0001` | A- |
| ... | ... | ... | ... | ... |

**All patients:**
- Can view their own medical records
- Can see their appointments
- Can upload personal documents
- Can access emergency profile
- Can see doctors they've consulted

**To find exact patient names:**
```bash
# Query database
db.patients.find({}, { personalIdentity: 1 })
```

---

## 📋 Two-Browser Test Walkthrough

This test verifies that registration requests are **persistent across browsers and sessions**.

### Setup

1. **Browser 1 (Chrome):** Log in as Hospital Admin
   - Email: `admin@aarogya.in`
   - Password: `hospital_admin_123`

2. **Browser 2 (Edge/Firefox):** Log in as a Healthcare Professional OR prepare to register a new one

### Test Scenario

**Browser 2:**
1. Create a new account as a DOCTOR (register as new user)
   - Email: `test.doctor@jeevacare.in`
   - Role: DOCTOR
   - Password: `test_pass_123`
2. Log in with the new account
3. Navigate to "Request Hospital Affiliation"
4. Select "Aarogya Multispeciality Hospital"
5. Submit registration request
6. Note the submission message ("Request submitted")

**Browser 1 (Check Admin Inbox):**
1. Remain logged in as hospital admin OR log in if needed
2. Navigate to "Registration Requests" or "Admin Inbox"
3. **VERIFY:** The new request from `test.doctor@jeevacare.in` appears
4. **VERIFY:** The doctor's name, email, and requested role are correct
5. **Optional:** Approve or reject the request

**Browser 2 (Check Applicant Status):**
1. Refresh the page or navigate to "My Requests" / "Registration Status"
2. **VERIFY:** The status shows "Pending" or "Approved" (depending on admin action)
3. **VERIFY:** The status reflects the admin's action without the applicant logging out

---

## 🔧 Seeding Instructions

### Run the Synthetic Seed Script

```bash
# From project root
npm run seed:synthetic

# OR manually in server directory
cd server
NODE_ENV=development node src/scripts/seedSyntheticData.js
```

**Output:**
```
🔌 Connecting to MongoDB...
✓ Connected to MongoDB
🏥 Seeding hospitals...
  ✓ Hospital already exists: Aarogya Multispeciality Hospital
  ✓ Hospital already exists: Sanjeevani City Hospital
👨‍💼 Seeding hospital administrators...
  ✓ Created hospital admin: admin@aarogya.in
  ✓ Created hospital admin: admin@sanjeevani.in
👨‍⚕️ Seeding doctors...
  ✓ Created doctor: dr.arun.sharma@jeevacare.in
  ✓ Created doctor: dr.vikram.kumar@jeevacare.in
  ... [more doctors]
👥 Seeding patients...
  ✓ Created patient: arun.sharma@example.com
  ... [more patients]
📅 Seeding appointments...
  ✓ Created appointment between Arun and Sample Patient 1
  ... [more appointments]

✅ Synthetic data seeding completed successfully!

📋 Created:
  - 2 hospitals
  - 2 hospital administrators
  - 5 doctors
  - 15 patients

🔑 Test Credentials:
  Hospital Admin: admin@aarogya.in / hospital_admin_123
  Doctor: dr.arun.sharma@jeevacare.in / doctor_123
  Patient: arun.sharma@example.com / patient_123
```

### Idempotency

The seed script is **idempotent**:
- Running it multiple times is safe
- Existing records are not duplicated
- New accounts are only created if they don't exist
- Can be safely re-run to add missing records

### Safety

The script:
- ❌ **REFUSES** to run in production (`NODE_ENV=production`)
- ✅ Only creates synthetic data in development/staging
- ✅ Preserves existing demo accounts
- ✅ Never deletes data

---

## 🔐 Credentials Management

### Provided Test Credentials

All test credentials are provided in this document for **local development only**.

- ✅ Share this cheat sheet for local testing
- ❌ **DO NOT** commit plaintext passwords to Git
- ❌ **DO NOT** expose credentials in public deployments
- ❌ **DO NOT** use these credentials in staging or production

### Password Security

In production:
- Passwords are hashed with bcryptjs
- Aadhaar numbers are masked (last 4 digits only)
- Never transmitted in plain text
- Enforced minimum 8 characters
- Rate limiting on login attempts

---

## 🔄 Resetting Synthetic Data

To completely reset and recreate the synthetic dataset:

```bash
# Option 1: Re-run the seed script
npm run seed:synthetic

# Option 2: Clear database and reseed (⚠️ USE WITH CAUTION)
# This requires direct database access:
# mongo jeevacare
# db.dropDatabase()
# npm run seed:synthetic
```

**Impact:**
- ✅ All test data is recreated
- ✅ Existing demo accounts are preserved (separate seed script)
- ✅ Safe for development/staging environments
- ❌ **NEVER** run this in production

---

## 🧪 Common Test Workflows

### Test Workflow #1: Doctor Registration & Approval

1. **Register new doctor account**
   - Visit `/register` as a new user
   - Select Role: DOCTOR
   - Fill in professional details

2. **Request hospital affiliation**
   - Log in as new doctor
   - Navigate to "Hospital Affiliations"
   - Click "Request Affiliation"
   - Select hospital and submit

3. **Hospital admin approves**
   - Log in as hospital admin (`admin@aarogya.in`)
   - View pending requests
   - Click "Approve"
   - Doctor is now affiliated with hospital

4. **Verify doctor can now access hospital resources**
   - Doctor logs in
   - Can see patients at affiliated hospital
   - Can upload radiology reports
   - Can create clinical records

### Test Workflow #2: Multi-Hospital Doctor

1. **Create doctor affiliated with Hospital A**
   - Follow Workflow #1 for Hospital A

2. **Request second hospital affiliation**
   - Doctor requests affiliation with Hospital B
   - Hospital B admin approves

3. **Verify doctor sees both hospitals**
   - Doctor has two active affiliations
   - Can select active hospital in dropdown
   - Can work at both hospitals with one account

### Test Workflow #3: Patient Document Upload

1. **Patient registers**
   - Self-register as PATIENT

2. **Patient uploads document**
   - Select hospital where they consulted
   - Upload radiology report or lab result
   - Document is associated with correct patient/hospital

3. **Doctor retrieves patient record**
   - Doctor logs in at same hospital
   - Finds patient
   - Sees the uploaded document
   - Document has correct metadata

---

## 📊 Database Schema Reference

### Relevant Collections

- **Users**: Stores login credentials, roles, profile data
- **Patients**: Patient identity, demographics, medical info
- **Hospitals**: Hospital details, verification status
- **HospitalStaff**: Staff-hospital affiliations (ACTIVE relationships)
- **StaffRegistrationRequest**: Pending staff registration requests (NEW for approval workflow)
- **HealthcareProfessional**: Professional credentials and specialization

### Key Relationships

```
User (DOCTOR)
  ├─ HospitalStaff (Hospital A) [ACTIVE]
  ├─ HospitalStaff (Hospital B) [ACTIVE]
  └─ HealthcareProfessional [Specialization info]

User (PATIENT)
  └─ Patient [Demographics, emergency profile]

StaffRegistrationRequest
  ├─ Pending (New doctor at Hospital A)
  ├─ Approved → Creates HospitalStaff
  └─ Rejected
```

---

## 🚀 Deployment Verification

### Local Development

- ✅ Synthetic data can be seeded
- ✅ Registration requests can be submitted
- ✅ Hospital admin can approve/reject
- ✅ Staff affiliations are created correctly
- ✅ Multi-hospital scenarios work

### Staging

- ✅ Use test database (`TEST_MONGODB_URI`)
- ✅ Run seed script to populate staging
- ✅ Test cross-browser workflows
- ✅ Verify notification persistence

### Production

- ❌ Synthetic data seed is **disabled** (safety check)
- ❌ Do NOT use these test credentials
- ✅ Use real hospital onboarding process
- ✅ Use secure bootstrap for first admin

---

## ❓ Troubleshooting

### "Hospital ID not found" Error

**Fixed in:** RadiologyPage.jsx (use `user.facilityId` instead of `user.profile.hospitalId`)

If still occurring:
1. Verify user has active HospitalStaff affiliation
2. Check that affiliation has `associationStatus: 'active'`
3. Re-login to refresh user context
4. Check browser console for detailed error

### Registration Request Doesn't Appear for Admin

**Possible causes:**
1. Admin is logged in as wrong hospital
2. Request was submitted to different hospital
3. Request status is not 'pending' (check if already approved/rejected)
4. Admin doesn't have 'hospital_admin' role
5. Cache issue - refresh browser

**Verification:**
```bash
# Check admin's hospital affiliation
db.hospitalstaffs.findOne({ userId: ObjectId("admin_user_id"), role: "hospital_admin" })

# Check pending requests for hospital
db.staffregistrationrequests.find({ hospitalId: ObjectId("hospital_id"), status: "pending" })
```

### Patient Cannot See Hospital Affiliation

If a patient doesn't have hospital context:
1. Patients don't need to be affiliated with hospitals
2. Patients can be associated through consultations/appointments
3. If patient wants to upload documents, they select the hospital where they visited

---

## 📞 Support

For issues or questions:
1. Check the implementation commit: `987ed0c` (Multi-hospital foundation)
2. Verify StaffRegistrationService is working
3. Check browser console and server logs
4. Verify MongoDB has StaffRegistrationRequest collection

---

## 📝 Version History

| Date | Changes |
|------|---------|
| Oct 2026 | Initial synthetic dataset documentation |

---

**Reminder:** This is a **test dataset** only. All data is fictional, synthetic, and for demonstration purposes. Never use in production.

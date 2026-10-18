# JeevaCare Complete Demo Setup Guide

**Status**: Ready for deployment and seeding  
**Date**: October 7, 2026  
**Version**: 2.0 - Complete Multi-Hospital Implementation  

⚠️ **SECURITY NOTE**: This document contains demo credentials for testing purposes only. These are synthetic demo accounts and should never be used in production. Keep this guide private and do not distribute to unauthorized users.

## 📋 Overview

This guide describes the complete JeevaCare demo setup with:
- ✅ 2 fully specified hospitals
- ✅ 2 hospital administrators
- ✅ 11 named doctors (5 per hospital + 1 shared)
- ✅ 20 patients (10 per hospital)
- ✅ Synthetic clinical data
- ✅ Radiology reports
- ✅ Cross-browser approval workflow support
- ✅ Comprehensive credentials documentation

## 🏥 Hospital Specifications

### Hospital 1: Sanjivani Hospital
- **Location**: Mysore, Karnataka, India
- **Facility ID**: JC-HOSP-SANJIVANI-001
- **Address**: 42 Vinoba Puram, Mysore, 570001
- **Phone**: +91-0821-4321567
- **Email**: admin@sanjivani-mysore.in

#### Administrator: Prakash Rao
- Email: `prakash.rao@sanjivani.in`
- Password: `PrakashRao@123`

#### Doctors (5 hospital-specific):
1. **Soundarya Shetty** - Internal Medicine (KA-LIC-SMD-2015-001)
   - Email: `soundarya.shetty@sanjivani.in` | Password: `SoundaryaShetty@123`
2. **Christopher Matthews** - Cardiology (KA-LIC-CM-2014-002)
   - Email: `christopher.matthews@sanjivani.in` | Password: `ChristopherMatthews@123`
3. **Manjunath Rao** - Orthopedics (KA-LIC-MR-2013-003)
   - Email: `manjunath.rao@sanjivani.in` | Password: `ManjunathRao@123`
4. **Asia Begum** - Pediatrics (KA-LIC-AB-2016-004)
   - Email: `asia.begum@sanjivani.in` | Password: `AsiaBegum@123`
5. **Ansh Kumar** - Neurology (KA-LIC-AK-2017-005)
   - Email: `ansh.kumar@sanjivani.in` | Password: `AnshKumar@123`

#### Patients (10 patients):
- Rajesh Kumar, Meera Singh, Anil Patel, Divya Sharma, Suresh Desai,
- Priya Nair, Vikram Rao, Anjali Chopra, Arjun Gupta, Kavya Iyer
- All patients: Password: `Patient@123`

---

### Hospital 2: Aarogya Kendra
- **Location**: Mandya, Karnataka, India
- **Facility ID**: JC-HOSP-AAROGYA-KENDRA-001
- **Address**: 156 NH Highway, Mandya, 571401
- **Phone**: +91-08232-256789
- **Email**: admin@aarogya-mandya.in

#### Administrator: Revathi Kumar
- Email: `revathi.kumar@aarogya.in`
- Password: `RevathiKumar@123`

#### Doctors (5 hospital-specific):
1. **Harshith Bagrecha** - General Surgery (KA-LIC-HB-2015-006)
   - Email: `harshith.bagrecha@aarogya.in` | Password: `HarshithBagrecha@123`
2. **Ashwin S.** - ENT (KA-LIC-AS-2014-007)
   - Email: `ashwin.s@aarogya.in` | Password: `AshwinS@123`
3. **Apoorva Santosh** - Obstetrics & Gynecology (KA-LIC-AP-2016-008)
   - Email: `apoorva.santosh@aarogya.in` | Password: `ApoorvaSantosh@123`
4. **Siri M.N.** - Dermatology (KA-LIC-SM-2015-009)
   - Email: `siri.mn@aarogya.in` | Password: `SiriMN@123`
5. **Vinay Kumar** - Radiology (KA-LIC-VK-2017-010)
   - Email: `vinay.kumar@aarogya.in` | Password: `VinayKumar@123`

#### Patients (10 patients):
- Ramesh Krishnan, Sneha Verma, Nikhil Pandey, Isha Joshi, Rohan Bansal,
- Neha Menon, Sanjay Agarwal, Pallavi Saxena, Ashok Tripathi, Ritika Pathak
- All patients: Password: `Patient@123`

---

### Shared Doctor: Swami Murti
- **Specialization**: Anesthesiology
- **License**: KA-LIC-SM-2013-011
- **Email**: `swami.murti@jeevacare.in`
- **Password**: `SwamiMurti@123`
- **Affiliations**: Both Sanjivani Hospital AND Aarogya Kendra
- **Important**: Single stable identity, NOT duplicated into two accounts

---

## 🚀 Quick Start

### Prerequisites
1. Node.js 18+ installed
2. MongoDB connection (local or Atlas)
3. Environment variables configured (.env file)

### 1. Install Dependencies

```bash
cd c:\Users\user\OneDrive\Desktop\JeevaCare
npm install
```

### 2. Configure Environment

Ensure `.env` has:
```env
NODE_ENV=development
MONGODB_URI=<your_mongodb_connection_string>
JWT_SECRET=<your_jwt_secret>
JEEVACARE_ADMIN_SECRET=<your_admin_secret>
```

### 3. Seed Synthetic Data

```bash
npm run seed:synthetic
```

This will:
- ✅ Create 2 hospitals
- ✅ Create 2 hospital administrators
- ✅ Create 11 doctors (5 per hospital + 1 shared)
- ✅ Create 20 patients (10 per hospital)
- ✅ Create doctor-patient relationships
- ✅ Create synthetic radiology reports
- ✅ Create appointments
- ✅ Display all credentials in console

**Output Example**:
```
✅ SYNTHETIC DATA SEEDING COMPLETED SUCCESSFULLY!
...
🏥 HOSPITALS & ADMINISTRATORS:
  Hospital 1: Sanjivani Hospital
  📍 Location: Mysore, Karnataka
  🆔 Facility ID: JC-HOSP-SANJIVANI-001
  Administrator: Prakash Rao
  📧 Email: prakash.rao@sanjivani.in
  🔑 Password: PrakashRao@123
...
```

### 4. Start Backend

```bash
npm run start:server
```

### 5. Start Frontend

In another terminal:
```bash
npm run start:client
```

### 6. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health**: http://localhost:5000/healthz

---

## 🧪 Testing Scenarios

### Scenario 1: Hospital Admin Dashboard

**Browser**: Chrome or Edge

1. Navigate to http://localhost:3000
2. Click "Login"
3. Enter:
   - Email: `prakash.rao@sanjivani.in`
   - Password: `PrakashRao@123`
4. You should see the Sanjivani Hospital admin dashboard
5. Navigate to "Staff Registrations" to view pending requests
6. Create synthetic requests and approve them

### Scenario 2: Doctor Portal

**Browser**: Chrome or Edge

1. Login with: `soundarya.shetty@sanjivani.in` / `SoundaryaShetty@123`
2. View assigned patients and medical records
3. Access radiology reports
4. Create clinical notes and appointments

### Scenario 3: Patient Dashboard

**Browser**: Chrome or Edge

1. Login with: `rajesh.kumar.pat@sanjivani.in` / `Patient@123`
2. View medical history
3. Check appointments
4. Access emergency profile

### Scenario 4: Cross-Browser Approval Workflow

#### Part A: Register Staff (Chrome)
1. Open Chrome to http://localhost:3000
2. If not logged in, logout first
3. Go to register page or click "Register as Staff"
4. Fill in:
   - Email: `newdoctor.test@example.com`
   - Hospital: "Sanjivani Hospital"
   - Role: "Doctor"
   - Specialization: "Test Specialization"
5. Submit registration
6. You should see "Pending" status

#### Part B: Approve Request (Edge)
1. Open Edge to http://localhost:3000
2. Login as: `prakash.rao@sanjivani.in` / `PrakashRao@123`
3. Go to "Staff Registrations" → "Pending"
4. Find the new request from Part A
5. Click "Approve"
6. Request should move to "Approved" tab

#### Part C: Verify Update (Chrome)
1. Return to Chrome window
2. Refresh the page
3. Request status should now show "Approved"
4. New doctor can now login

---

## 📊 Data Structure

### Database Collections Created

- **Hospitals** (2 records)
  - Sanjivani Hospital
  - Aarogya Kendra

- **Users** (35 records)
  - 2 Hospital Admins
  - 11 Doctors
  - 20 Patients
  - (+ System Admins as created)

- **HealthcareProfessional** (11 records)
  - One per doctor
  - Includes facility associations
  - Verification status: verified

- **HospitalStaff** (12 records)
  - 2 admins (1 per hospital)
  - 5 + 5 hospital-specific doctors
  - 1 shared doctor (2 associations, 1 per hospital)

- **Patient** (20 records)
  - 10 per hospital
  - With synthetic medical histories
  - Blood group information

- **ClinicalRecord** (20 records minimum)
  - Initial assessments for each patient
  - Doctor-patient relationships

- **Appointment** (15+ records)
  - Appointments between doctors and patients
  - Dates in future

- **RadiologyRecord** (6+ records)
  - Synthetic radiology reports
  - Marked as demo data
  - Associated with patients

---

## 🔐 Security Notes

⚠️ **These are SYNTHETIC DEMO credentials only!**

### Never do this in production:
- ❌ Use default or simple passwords
- ❌ Commit credentials to Git
- ❌ Share passwords in plaintext
- ❌ Use demo accounts for real patient data
- ❌ Deploy without rotating credentials

### What to do:
- ✅ Delete or rotate demo accounts before production
- ✅ Use strong unique passwords for real admins
- ✅ Implement proper MFA
- ✅ Use secure credential management (AWS Secrets Manager, etc.)
- ✅ Audit all staff registrations and approvals

---

## 📝 Credential Reference

A comprehensive credential reference is available in:
- **JSON Format**: `DEMO_CREDENTIALS.json`
- **Generated PDF**: `JeevaCare_Demo_Credentials_and_Test_Guide.pdf` (after running PDF generation script)

### To Generate PDF Credentials:

```bash
npm run credentials:pdf
```

This will create `JeevaCare_Demo_Credentials_and_Test_Guide.pdf` in the root directory.

---

## 🐛 Troubleshooting

### Issue: "MongoDB not connected"

**Solution**: Ensure MongoDB is running
```bash
# Local MongoDB
mongod

# Or use MongoDB Atlas connection string in .env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/jeevacare
```

### Issue: "Hospital not found" error during seeding

**Solution**: Check that hospitals are created before doctors
- The seed script creates in order: Hospitals → Admins → Doctors → Patients
- If it fails, check MongoDB connection and try again

### Issue: Duplicate key error

**Solution**: The seed script is idempotent
- If you run it twice, it will reuse existing records
- To reset: Drop the jeevacare database and reseed

### Issue: "Port 5000 already in use"

**Solution**: Kill the existing process
```powershell
Get-Process node | Stop-Process -Force
npm run start:server
```

---

## 📈 Verification Checklist

After seeding, verify:

- [ ] 2 hospitals exist in database
- [ ] 2 hospital administrators exist and can login
- [ ] 11 doctors exist (5 per hospital + 1 shared)
- [ ] 20 patients exist (10 per hospital)
- [ ] Shared doctor has 2 hospital affiliations
- [ ] Each doctor can access only their hospital's patients
- [ ] Hospital admin can see pending staff requests
- [ ] Staff registration workflow functions end-to-end
- [ ] Radiology reports are retrievable
- [ ] Cross-browser approval works (Chrome + Edge)

---

## 🌐 Deployed Environment

### Production Frontend
- URL: https://jeevacare-cmdm.vercel.app
- Status: Live
- Auto-deployed from main branch

### Production Backend
- URL: https://jeevacare-th88.onrender.com
- Status: Live (commit 821d540)
- Database: MongoDB Atlas

### To Deploy Seeded Data to Production:

1. Seed data locally:
   ```bash
   NODE_ENV=development npm run seed:synthetic
   ```

2. Export data:
   ```bash
   mongodump --uri="mongodb://..." --out=backup/
   ```

3. Import to production:
   ```bash
   mongorestore --uri="mongodb+srv://..." backup/
   ```

**⚠️ WARNING**: Only do this on explicit request. This overwrites production data!

---

## 📞 Support & Next Steps

For issues or questions:

1. Check the troubleshooting section above
2. Review seed script output for errors
3. Inspect MongoDB collections directly
4. Check backend logs: `npm run start:server`
5. Verify credentials in DEMO_CREDENTIALS.json

---

## 📄 Document Index

- This file: `DEMO_SETUP_GUIDE.md` - Complete setup and testing guide
- JSON Credentials: `DEMO_CREDENTIALS.json` - Machine-readable credentials
- PDF Guide: `JeevaCare_Demo_Credentials_and_Test_Guide.pdf` - Printable guide (after generation)
- Seed Script: `server/src/scripts/seedSyntheticData.js` - Performs all seeding
- PDF Generator: `server/src/scripts/generateCredentialsPDF.js` - Creates PDF

---

**Last Updated**: October 7, 2026  
**Maintainer**: JeevaCare Development Team  
**Status**: Ready for testing and deployment

# JeevaCare Multi-Hospital Platform - Quick Start Guide

## 🚀 30-Second Setup

```bash
# 1. Install & seed
npm install
npm run seed:synthetic

# 2. Run backend (Terminal 1)
npm run start:server

# 3. Run frontend (Terminal 2)
npm run start:client

# 4. Open http://localhost:3000
```

## 🧪 Test Credentials (Ready to Use)

### Hospital Admin (Aarogya Hospital)
- **Email:** admin@aarogya.in
- **Password:** hospital_admin_123
- **Path:** Click "Staff Registrations" in sidebar

### Hospital Admin (Sanjeevani Hospital)
- **Email:** admin@sanjeevani.in
- **Password:** hospital_admin_123
- **Path:** Click "Staff Registrations" in sidebar

### Sample Doctor
- **Email:** dr.cardiology@jeevacare.in
- **Password:** doctor_123
- **Path:** Click "Register as Staff" in sidebar

### Sample Patient
- **Email:** patient1@example.com
- **Password:** patient_123
- **Path:** Dashboard → Radiology for upload test

---

## ✨ What's New

### Frontend Pages
- **`/staff/registration`** — Request staff affiliation with a hospital
- **`/hospital/dashboard`** — Hospital admin reviews & approves requests

### Features
✅ Submit staff registration requests  
✅ View request status (Pending, Approved, Rejected)  
✅ Hospital admin approval workflow  
✅ Multi-hospital support  
✅ Real-time validation  
✅ Error handling & feedback  

---

## 🎯 Test Workflows

### Workflow 1: New User Registration (5 min)

**Browser 1:**
1. Go to `/register`
2. Create: `testdoctor@example.com` / `TestDoc123!`
3. Select: DOCTOR
4. Complete registration
5. Go to `/staff/registration`
6. Select: Aarogya Hospital, DOCTOR role, "Cardiology"
7. Submit
8. See: ⏳ Pending status

**Browser 2:**
1. Login: `admin@aarogya.in` / `hospital_admin_123`
2. Go to `/hospital/dashboard`
3. View pending request
4. Click request to expand
5. Click "Approve"
6. See: ✅ Approved

**Browser 1 (Verify):**
1. Refresh page
2. See: ✅ Approved status

---

### Workflow 2: Rejection (5 min)

**Browser 2 (Same as above):**
1. Back to `/hospital/dashboard`
2. Tab to "Pending"
3. Expand different request
4. Fill rejection reason: "License verification required"
5. Click "Reject"
6. Request moves to "Rejected" tab

**Browser 1:**
1. Check rejection reason is visible
2. Can submit new request to same hospital

---

## 📁 Key Files

### Frontend
- `client/src/pages/StaffRegistrationPage.jsx` — Registration form
- `client/src/pages/HospitalAdminDashboardPage.jsx` — Admin interface
- `client/src/App.jsx` — Routes definition
- `client/src/components/Sidebar.jsx` — Navigation menu

### Backend
- `server/src/routes/staffRegistrationRoutes.js` — Registration endpoints
- `server/src/routes/hospitalAdminRoutes.js` — Admin endpoints
- `server/src/services/StaffRegistrationService.js` — Business logic
- `server/src/models/StaffRegistrationRequest.js` — Data model
- `server/src/scripts/seedSyntheticData.js` — Test data

---

## 🔧 Troubleshooting

### Issue: "Hospital not connected to my account" (Admin)
**Solution:** System admin must assign hospital to admin user
```bash
# Use provisioning endpoint or seed script
```

### Issue: Hospital dropdown is empty
**Solution:** Run seed script to load hospitals
```bash
npm run seed:synthetic
```

### Issue: "Page not found" for `/hospital/dashboard`
**Solution:** You must be logged in as HOSPITAL_ADMIN
- Check login with hospital admin credentials
- Check user role is HOSPITAL_ADMIN (shown in sidebar)

### Issue: Registration submit fails with 409 error
**Solution:** You already have a pending request for this hospital/role
- Check existing requests below the form
- Withdraw existing request if needed

### Issue: Backend not responding
**Solution:** Start backend server
```bash
npm run start:server
```

### Issue: Frontend not loading
**Solution:** Start frontend server
```bash
npm run start:client
```

---

## 📊 Database

### Seeded Data
- **2 Hospitals:** Aarogya (Bengaluru), Sanjeevani (Mysuru)
- **2 Hospital Admins:** One per hospital
- **5 Doctors:** Various specializations
- **15 Patients:** Synthetic Indian names
- **Sample Appointments:** Cross-hospital

### MongoDB Connection
- **Local:** `mongodb://localhost:27017/jeevacare`
- **Cloud:** Set `MONGODB_URI` in `.env`

---

## 🔐 Environment Setup

### Create .env File
```bash
cp .env.example .env
```

### Required Variables
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/jeevacare
JWT_SECRET=dev-jwt-secret-min-32-characters
REFRESH_TOKEN_SECRET=dev-refresh-secret
CORS_ORIGIN=http://localhost:3000
JEEVACARE_ADMIN_SECRET=dev-admin-secret
```

---

## 📚 Documentation

- **IMPLEMENTATION_COMPLETE.md** — Full feature overview
- **JEEVACARE_FRONTEND_IMPLEMENTATION.md** — Component architecture & API details
- **JEEVACARE_SYNTHETIC_TEST_CHEATSHEET.md** — Detailed test guide

---

## ✅ Success Criteria

After following this guide, you should be able to:

✅ See "Staff Registrations" in hospital admin sidebar  
✅ Submit staff registration requests as a user  
✅ Approve/reject requests as hospital admin  
✅ See status updates persist across page refreshes  
✅ Radiology uploads work without "Hospital ID not found" error  

---

## 🚀 Next Steps

1. **Test locally** — Follow workflows above
2. **Deploy to staging** — Use `npm run build`
3. **Add real hospitals** — Use hospital admin routes
4. **Assign admins** — Use hospital admin provisioning
5. **Launch to production** — Set proper environment variables

---

## 💡 Tips

- Open two browser windows side-by-side for better testing
- Use browser DevTools Network tab to see API calls
- Check backend logs for detailed error messages
- Refresh page to see updates (live notifications coming soon)

---

**All Systems Ready. Happy Testing! 🎉**

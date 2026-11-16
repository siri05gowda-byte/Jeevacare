<div align="center">

![JeevaCare — Lifelong Health Journey](https://raw.githubusercontent.com/siri05gowda-byte/Jeevacare/main/client/src/assets/logos/jeevacare-logo-wordmark.png)

</div>

**JeevaCare** is a healthcare information platform designed to organize patient medical records, enable emergency-access workflows, facilitate healthcare-provider interactions, and connect patients to **ClaraMed**, a separate AI service that explains X-rays in plain English.

> **Academic/Demo Prototype** — Built to address fragmented medical records and demonstrate lifelong healthcare continuity principles. Not a certified medical device; all clinical decisions require qualified healthcare professional review.

---

## The Problem

Patients' medical records are fragmented across hospitals, clinics, and cities. During emergencies—when time is critical—essential information is unavailable, identity verification is unclear, and healthcare is delayed.

**Key Challenges:**
- Records scattered across multiple providers
- No unified health timeline or chronological view
- Difficult emergency access to critical information
- Unclear verification status and data provenance
- Language and accessibility barriers for diverse populations

## The Solution

JeevaCare creates a **single, auditable health record** that follows the patient across their lifetime:

1. **Unified Patient Identity** — One consistent identity across all providers
2. **Chronological Timeline** — All healthcare events organized by date and provider
3. **Verified Clinical Records** — Only authenticated healthcare providers can create official records
4. **Emergency Access** — Rapid access to critical information after identity verification
5. **AI-Assisted Intelligence** — Summaries and explanations available in 6 languages (demo/mock mode by default)
6. **Accessibility** — Text-to-speech, multilingual interface, and intuitive navigation
7. **Complete Audit Trail** — All access logged for security and compliance
8. **Patient Control** — Patients can view records and manage personal health information without altering provider data

---

## Implemented Features

### Patient Portal

- **Health Timeline** — Chronological view of all medical encounters, diagnoses, procedures, lab results, and documents
- **Medical Records** — Secure viewing of clinical information created by providers
- **Appointments** — Pick a hospital and doctor, then book, reschedule or cancel. A new patient is registered at a hospital the first time they book there
- **JeevaCare ID** — One permanent ID per person (format `JJYY-XXXXX`, for example `JJ26-H7K2M`), shown on the dashboard and in Settings. The account and the patient record share it, and every user of every role gets one
- **Emergency Profile** — Document critical information (allergies, medications, conditions, emergency contacts)
- **Document Upload** — Add personal medical records and documents for verification by providers
- **Clinical Records** — View clinical encounters, diagnoses, procedures, medications, and notes
- **Lab Results** — Access laboratory test results and reference ranges
- **Vaccinations** — Track vaccination history
- **Discharge Summaries** — View hospital discharge documents and summaries
- **AI Summaries** — AI-generated medical history summaries (demo/mock mode if unconfigured)
- **Radiology AI (ClaraMed)** — A sidebar link opens ClaraMed in a new tab, where patients upload an X-ray (PNG, JPEG, DICOM or PDF) and get a plain-English explanation. Shown when `VITE_CLARAMED_BASE_URL` is set, and it replaces the in-app radiology page
- **Multilingual Interface** — 6 supported languages with language-specific content

### Healthcare Provider Workspace

- **Patient Search** — Secure patient matching to prevent wrong-patient access (JeevaCare ID, phone, email validation)
- **Clinical Records** — Create and view encounters, diagnoses, medications, procedures, and clinical notes
- **Appointment Management** — View schedule, book new appointments, and manage existing appointments
- **Document Verification** — Review patient-uploaded documents and verify accuracy
- **Record Amendment** — Create amendments and corrections with full audit history (original record preserved)
- **Lab Management** — Record and manage laboratory results
- **Radiology Management** — Upload radiology reports and manage imaging data
- **Discharge Documentation** — Create and manage discharge summaries

### Hospital Administration

- **Staff Management** — Register clinical staff and manage role assignments
- **Appointment Scheduling** — Create clinic schedules and manage provider availability
- **Staff Verification** — Approve or reject staff registration requests
- **Facility Management** — Configure hospital information and settings

### Emergency Access

- **Emergency Patient Lookup** — Identify patients by JeevaCare ID, phone, or email
- **Identity Verification** — Multi-factor verification to authorize access
- **Critical Summary** — Display essential information first (allergies, blood group, medications)
- **Full History Access** — Complete timeline available when needed
- **Access Logging** — Audit trail shows who accessed what information and when
- **Emergency Incident Tracking** — Record emergency access reasons and outcomes

### Authorization & Security

- **Role-Based Access Control** — 8 user roles: Patient, Guardian, Doctor, Nurse, Hospital Admin, Emergency Access, Staff, System Admin
- **Facility-Level Isolation** — Staff access limited to their assigned hospital only
- **Patient-Level Isolation** — Patients cannot access other patients' records
- **9-Point Clinical Authorization** — User identity, professional credentials, facility assignment, staff role, permissions, patient affiliation, patient authorization, verification status, and time-based access
- **Server-Side Enforcement** — All authorization decisions made by backend; frontend cannot bypass permissions
- **Complete Audit Trail** — Sensitive operations logged (login/logout, record access, emergency access, modifications)

### Data Integrity

- **Provider-Verified Records** — Clinical data created by authenticated providers
- **Patient-Uploaded Records** — Personal documents (initially unverified)
- **Verification Workflow** — Providers can review and verify patient uploads
- **Amendment History** — Changes create new versions; original records preserved
- **Immutability** — Patients cannot directly modify provider-created records
- **Correction Requests** — Patients can request corrections; providers review and approve/reject

---

## Technology Stack

### Frontend
- **React 18** — UI framework with Vite build tooling
- **Tailwind CSS** — Utility-first CSS styling
- **Zustand** — Lightweight state management
- **React Router** — Client-side routing
- **Axios** — HTTP client

### Backend
- **Node.js + Express.js** — REST API framework
- **MongoDB + Mongoose** — Document database and ODM
- **JWT** — Token-based authentication and authorization
- **bcryptjs** — Secure password hashing
- **Winston** — Structured logging
- **Helmet.js** — HTTP security headers

### External Services (All with Demo/Mock Modes)
- **Groq AI** — Medical text summaries (demo/mock if unconfigured)
- **Piper TTS** — Text-to-speech audio (3 languages: English, Hindi, Malayalam; demo/mock for others)
- **ClaraMed** — Separate Streamlit app that analyses chest X-rays and explains them in plain English; linked from the patient sidebar (see [Radiology AI](#radiology-ai-claramed))
- **Tesseract OCR** — Text extraction from medical documents (optional)
- **Cloudinary** — File/document storage (optional; local filesystem used if unconfigured)
- **DigiLocker** — Government document integration (demo mode by default)

### Deployment
- **Frontend** — Vercel (https://jeevacare-cmdm.vercel.app)
- **Backend** — Render (https://jeevacare-th88.onrender.com)
- **Database** — MongoDB Atlas
- **Version Control** — GitHub

---

## Architecture

### System Overview

```
┌─ Frontend (React + Vite)
│  ├─ Patient Portal UI
│  ├─ Provider Workspace UI
│  ├─ Admin Dashboard
│  └─ Authentication UI
│
├─ API Gateway (Express.js)
│  ├─ REST Endpoints
│  ├─ JWT Middleware
│  ├─ Authorization Checks
│  └─ Audit Logging
│
├─ Services
│  ├─ AI Summary Service (Groq integration)
│  ├─ TTS Service (Piper)
│  ├─ Medical Image Analysis (ClaraMed integration pending)
│  ├─ OCR Service (optional)
│  └─ Document Storage (Cloudinary)
│
├─ Database (MongoDB)
│  ├─ Users & Authentication
│  ├─ Patients & Medical Records
│  ├─ Hospitals & Providers
│  ├─ Appointments & Schedules
│  ├─ Documents & Radiology
│  ├─ Audit Events
│  └─ Emergency Access Logs
│
└─ External AI Platform
   └─ ClaraMed (Medical image AI analysis - integration pending)
```

### Data Model

**Core Entities:**
- **User** — Authentication identity (email, password hash, role)
- **Patient** — Personal health record container
- **Hospital** — Healthcare facility with administrators and staff
- **HealthcareProfessional** — Doctor, nurse, or clinical staff profile
- **HospitalStaff** — Hospital-provider affiliation and permissions
- **Appointment** — Scheduled encounter between patient and provider
- **Encounter** — Individual clinical visit with diagnoses, medications, procedures
- **ClinicalRecord** — Provider-created clinical documentation
- **RadiologyRecord** — Medical imaging metadata and reports
- **Document** — Patient-uploaded medical documents (with verification status)
- **EmergencyProfile** — Patient-declared critical information
- **EmergencyAccess** — Emergency access event with audit trail
- **AuditEvent** — Log of all sensitive operations

---

## Getting Started

### Prerequisites

- **Node.js 18+** and npm
- **MongoDB** (local or MongoDB Atlas)
- **Python 3.8+** (optional, for real medical image inference)

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/siri05gowda-byte/Jeevacare.git
cd JeevaCare
```

#### 2. Install Dependencies

```bash
npm install
```

This installs dependencies for the root workspace and all child workspaces (client, server).

#### 3. Configure Backend Environment

```bash
cp server/.env.example server/.env
# Edit server/.env with your configuration
```

#### 4. Start Development Servers

```bash
# Terminal 1: Start backend (http://localhost:5000)
npm run start:server

# Terminal 2: Start frontend (http://localhost:5173)
npm run start:client
```

#### 5. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/health

### Testing Demo Accounts

Demo logins are not published here or on the login page. They are kept in your local `DEMO_CREDENTIALS.json` (never committed). To try the app as a new patient, use **Register**.

**Synthetic Multi-Hospital Demo:**
On every start the server creates two demo hospitals (Sanjivani Hospital and Aarogya Kendra) with their administrators, 11 doctors and 20 patients. It gives every user a JeevaCare ID, then links the doctors to the patients and adds an appointment history, so the dashboards look like a working hospital. This is safe to repeat and only touches the demo accounts. See [docs/DEMO_DATA_LINKING.md](docs/DEMO_DATA_LINKING.md). The logins are kept in your local `DEMO_CREDENTIALS.json` (never committed); see also `docs/RENDER_DEPLOYMENT_GUIDE.md`.

---

## Environment Configuration

### Required Backend Variables (server/.env)

```env
# Server & Database
NODE_ENV=development              # development, staging, or production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/jeevacare

# Authentication (32+ chars in staging/production, no 'dev-' prefix)
JWT_SECRET=your-32-char-secret-key-here
REFRESH_TOKEN_SECRET=your-32-char-refresh-secret-here

# Optional: Test Database (for integration tests)
TEST_MONGODB_URI=mongodb+srv://...jeevacare-test

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

### Optional Backend Variables

```env
# AI Services (all have demo/mock fallback modes)
GROQ_API_KEY=                     # Leave empty for AI demo mode
GROQ_MODEL=mixtral-8x7b-32768

# Demo data (see docs/DEMO_DATA_LINKING.md)
DEMO_LINK_ON_STARTUP=true         # false stops the startup linking; "remove" takes back what it added
DEMO_MODE=                        # leave unset. "true" makes demo accounts accept fixed built-in passwords (demos only)

# File Storage (optional; local filesystem used if unconfigured)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Text-to-Speech (optional; demo/mock mode if unconfigured)
PIPER_TTS_ENABLED=false
PIPER_BINARY_PATH=
PIPER_MODELS_PATH=

# Logging
LOG_LEVEL=info
```

### Frontend Variables (Vercel, or client/.env)

```env
VITE_API_BASE_URL=                # Backend URL (production uses the /api/v1 proxy)
VITE_CLARAMED_BASE_URL=           # Your ClaraMed address, https only (for example https://your-claramed-app.streamlit.app).
                                  # Adds the "Radiology AI" link to the patient sidebar. Baked in at build time: redeploy after changing it.
```

---

## Available Commands

```bash
# Development
npm run dev                    # Start both frontend and backend
npm run start:server          # Start backend only
npm run start:client          # Start frontend only

# Building
npm run build                 # Build frontend for production
npm run build --workspace=server   # Build backend

# Testing
npm run test                  # Run all tests
npm run test:backend          # Run backend tests
npm run test:frontend         # Run frontend tests
npm run test:quick            # Run quick unit tests
# Backend tests run one file at a time because they share one database. See "Testing" below.

# Linting
npm run lint                  # Lint all workspaces

# Database Seeding (local development)
npm run seed:synthetic        # Seed synthetic demo data
```

---

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` — Register new user
- `POST /api/v1/auth/login` — Login with email and password
- `GET /api/v1/auth/current-user` — Get logged-in user profile
- `POST /api/v1/auth/refresh` — Refresh JWT token
- `POST /api/v1/auth/logout` — Logout

### Health & Status
- `GET /health` — API health status
- `GET /healthz` — Render health check
- `GET /api/v1/health/config` — Configuration summary (non-sensitive)
- `GET /api/v1/health/services` — External service status

### Patient Records
- `GET /api/v1/patients/:id` — Get patient profile
- `POST /api/v1/patients` — Create new patient
- `GET /api/v1/patients/:id/timeline` — Get chronological health timeline
- `GET /api/v1/patients/:id/encounters` — Get clinical encounters
- `POST /api/v1/patients/:id/documents` — Upload medical documents

### Appointments
- `POST /api/v1/appointments/book` — Book an appointment (`POST /api/v1/appointments` also works)
- `GET /api/v1/appointments/patient/:patientId` — A patient's appointments
- `GET /api/v1/appointments/doctor/:doctorId` — A doctor's appointments
- `GET /api/v1/appointments/:id` — Appointment details
- `POST /api/v1/appointments/:id/reschedule` — Reschedule to a new time
- `POST /api/v1/appointments/:id/cancel` — Cancel (`DELETE /api/v1/appointments/:id` also works)
- `PUT /api/v1/appointments/:id/status` — Update the status

### Clinical Records (Provider)
- `GET /api/v1/encounters` — List provider's encounters
- `POST /api/v1/encounters` — Create new encounter
- `GET /api/v1/clinical-records/:id` — Get clinical record
- `POST /api/v1/clinical-records` — Create clinical record

### Radiology
- `GET /api/v1/radiology/:id` — Get radiology record
- `POST /api/v1/radiology/upload` — Upload radiology report
- `POST /api/v1/radiology/:id/analyze-image` — Image analysis has moved to ClaraMed; this backend no longer runs an X-ray model
- `GET /api/v1/radiology/:id/ai-status` — Check AI analysis status

### Emergency Access
- `POST /api/v1/emergency/lookup` — Find patient in emergency
- `POST /api/v1/emergency/access` — Request emergency access
- `GET /api/v1/emergency/history` — View emergency access history

### AI Features
- `POST /api/v1/ai-summary/:patientId` — Generate medical summary (demo/mock)
- `POST /api/v1/tts/speak` — Generate speech from text (English, Hindi, Malayalam with Piper; demo/mock for others)
- **Medical image AI analysis lives in ClaraMed, linked from the patient sidebar**

---

## Security & Privacy

### Authentication & Authorization

**JWT Security:**
- Development/Testing: Flexible configuration
- Staging/Production: **Enforced fail-safe**
  - JWT_SECRET must be 32+ characters
  - Cannot contain `dev-` prefix
  - Separate REFRESH_TOKEN_SECRET required
  - Backend startup fails if constraints violated

**Role-Based Access Control:**
- 8 user roles with distinct permissions
- Server-side authorization enforcement (frontend cannot bypass)
- Patient isolation (cannot access other patients)
- Facility isolation (staff limited to assigned hospital)
- 9-point clinical authorization boundary

### Data Protection

- **Passwords**: bcryptjs hashing (11 rounds)
- **Transmission**: HTTPS/TLS (enforced on Render and Vercel)
- **Storage**: Encrypted at rest (MongoDB Atlas)
- **Audit Trail**: All sensitive operations logged
- **Rate Limiting**: 100 requests per IP per 15 minutes
- **CORS**: Strict origin validation
- **Security Headers**: Helmet.js protections

### Demo Data Handling

- **Synthetic credentials** kept in local `DEMO_CREDENTIALS.json` (ignored by Git, never committed)
- **Plaintext demo passwords** are fictional and only for development/testing
- **Mock AI modes** clearly labeled and cannot be mistaken for real analysis
- **Built-in demo passwords are off by default.** Demo accounts sign in with their own password only. Setting `DEMO_MODE=true` makes them also accept fixed fallback passwords, even after a password change; do not enable that on a deployment real patients use. On each start the server resets the demo accounts to their documented passwords.

---

## Radiology AI (ClaraMed)

X-ray analysis is **not** done inside JeevaCare. It lives in **ClaraMed**, a separate Streamlit app. Patients reach it from the **Radiology AI** item in the sidebar, which opens ClaraMed in a new tab. Nothing is sent from JeevaCare to ClaraMed: the patient uploads the image there directly.

**What ClaraMed does:**
- Accepts PNG, JPEG, DICOM and PDF (first page).
- Chest X-rays go through a pretrained TorchXRayVision model. The result is turned into a plain-English report: an overall verdict (including a clear "no issues were flagged"), each flagged finding explained in everyday words with a low, moderate or high level of concern, faint borderline signs mentioned gently, what looks normal, next steps, and questions to ask a doctor.
- Other body parts (hand, leg, spine and so on) are described by a vision language model. The page states that, for this option, the image is sent to the AI provider (Groq).
- Reports can be written in the language chosen in the app.

**Connecting it:** set `VITE_CLARAMED_BASE_URL` to your ClaraMed address on the frontend host and redeploy. If it is not set, the patient sidebar keeps the in-app radiology page and no link is shown.

**Important disclaimers:**
- It is an AI explanation, **not a diagnosis**, and never a substitute for a radiologist's interpretation.
- The model is pretrained (a published research model), with no custom training on JeevaCare data. AI can miss problems or flag things that are not there.
- Always requires review by a licensed healthcare professional.

The earlier on-server chest X-ray worker (a Python process inside the backend) has been removed. `docs/MEDICAL_IMAGE_AI_SETUP.md` and `docs/RADIOLOGY_AI_QUICK_START.md` describe that old setup and are kept for reference only.

### OCR Processing

Text extraction from uploaded medical documents (optional feature).

### AI Safety Guardrails

- ✓ No autonomous diagnosis
- ✓ AI never invents medical facts
- ✓ All AI output clearly marked "AI-generated" or "Demo"
- ✓ Linked to original records and source documents
- ✓ Cannot become official clinical record
- ✓ Requires clinician approval for clinical decisions

---

## Multilingual Support

| Language | Code | UI | Text-to-Speech |
|---|---|---|---|
| English | en | ✓ | ✓ Real (Piper) |
| हिन्दी (Hindi) | hi | ✓ | ✓ Real (Piper) |
| മലയാളം (Malayalam) | ml | ✓ | ✓ Real (Piper) |
| ಕನ್ನಡ (Kannada) | kn | ✓ | Demo/Mock |
| తెలుగు (Telugu) | te | ✓ | Demo/Mock |
| தமிழ் (Tamil) | ta | ✓ | Demo/Mock |

**Notes:**
- Piper TTS officially supports 3 languages with verified models
- Other languages use demo/mock audio unless custom TTS providers integrated
- UI translations available for all 6 languages
- See `docs/RENDER_DEPLOYMENT_GUIDE.md` for language-specific deployment configuration

---

## Deployment

### Frontend (Vercel)

Currently deployed at: **https://jeevacare-cmdm.vercel.app**

**Setup:**
1. Push code to GitHub
2. Connect repository to Vercel dashboard
3. Configure environment variable:
   ```
   VITE_API_BASE_URL=https://jeevacare-th88.onrender.com
   VITE_CLARAMED_BASE_URL=https://your-claramed-app.streamlit.app   # optional: adds the Radiology AI link
   ```
   Vite bakes these in at build time, so redeploy after changing them.
4. Build: `npm run build --workspace=client`
5. Output: `client/dist`

### Backend (Render)

Currently deployed at: **https://jeevacare-th88.onrender.com**

**Setup:**
1. Push code to GitHub
2. Connect repository to Render dashboard
3. Use `render.yaml` configuration
4. Configure required environment variables:
   ```
   NODE_ENV=staging
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=[32+ char random string]
   REFRESH_TOKEN_SECRET=[32+ char random string]
   CORS_ORIGIN=https://jeevacare-cmdm.vercel.app
   ```
5. Optional: Configure Google Sheets Demo Synchronization (Secondary Sync Layer):
   ```
   GOOGLE_SHEETS_SPREADSHEET_ID=[44-char spreadsheet id from URL]
   GOOGLE_SERVICE_ACCOUNT_EMAIL=[service-account@project.iam.gserviceaccount.com]
   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
   ```
   *Note: Ensure the spreadsheet is shared with the service account email as Editor. The alias `GOOGLE_PRIVATE_KEY` is also supported.*
6. Optional: Configure external services (Groq, Piper TTS, Cloudinary)
7. Demo data (optional): `DEMO_LINK_ON_STARTUP` (default on) links the demo doctors to patients on each start, and `DEMO_MODE=true` (off by default) allows the built-in demo passwords. See [docs/DEMO_DATA_LINKING.md](docs/DEMO_DATA_LINKING.md).

On the free tier the backend sleeps when idle, so the first request after a pause can take 20 seconds or more. The app waits and retries, and offers a Retry button instead of logging you out.

**Health Check:** `https://jeevacare-th88.onrender.com/health`
**Sheets Diagnostic:** `https://jeevacare-th88.onrender.com/api/v1/health/sheets` (or `POST /api/v1/health/sheets/test` for smoke test)

### Seeding Staging Demo Data

See `docs/RENDER_DEPLOYMENT_GUIDE.md` for complete instructions on:
- Setting up isolated `jeevacare-test` database
- Running dry-run seed (validates logic without writes)
- Executing actual seed (creates demo hospitals, administrators, doctors, patients)
- Verifying seeded records
- Testing synthetic demo logins

The server also links the demo doctors to the demo patients on startup; see [docs/DEMO_DATA_LINKING.md](docs/DEMO_DATA_LINKING.md).

---

## Testing

### Test Coverage

```bash
npm run test                  # Run all tests
npm run test:backend          # Backend tests
npm run test:frontend         # Frontend tests
```

**Available Tests:**
- Unit tests for authentication, authorization, validation
- Integration tests for API endpoints (require MongoDB)
- Frontend component tests
- Production regression tests (23 verified fixes)

**Test Status:**
- Backend: Unit and integration tests; the database-backed ones run one file at a time because they share one test database
- Frontend: 100+ tests (Vitest with jsdom and Testing Library)
- Production builds: Validated (exit 0)
- Deployment: Health checks configured

**Running the backend tests:**
- `TEST_MONGODB_URI` must point at a database named `jeevacare-test`; the tests refuse to run against anything else. MongoDB Atlas only accepts connections from allow-listed IP addresses.
- `server/src/__tests__/demo-flows.verification.test.js` walks the real user flows (register, sign in, settings, password change, document upload, booking, cancel and reschedule, the new-patient journey, JeevaCare IDs). It only runs when `FLOW_TEST_MONGODB_URI` points at a throwaway database, and it never reads `MONGODB_URI`:
  ```bash
  FLOW_TEST_MONGODB_URI=mongodb://127.0.0.1:27017/jeevacare-test npx vitest run src/__tests__/demo-flows.verification.test.js
  ```

---

## Known Limitations

| Feature | Status | Notes |
|---|---|---|
| Full Integration Tests | Configurable | Requires TEST_MONGODB_URI |
| AI Medical Summaries | Demo Mode | Groq API optional; mock responses if unconfigured |
| X-Ray Analysis | In ClaraMed | A separate app; not run inside JeevaCare |
| Demo Passwords | Off by default | Fixed fallback passwords only work with `DEMO_MODE=true` |
| Free-Tier Backend | Cold starts | The first request after idle can take 20+ seconds |
| Text-to-Speech | Real/Mock Switchable | Piper TTS for English/Hindi/Malayalam; demo/mock for others |
| DigiLocker Integration | Optional | Demo mode by default |
| Cloudinary File Storage | Optional | Local filesystem used if unconfigured |
| Production Scaling | Configurable | Free tier: 1 instance; can enable autoscaling on paid plans |

---

## Important Disclaimers

### Medical Disclaimer

JeevaCare is a **healthcare information platform**, not a diagnostic or clinical decision system:

- **Blocked Functions:**
  - Does NOT diagnose diseases
  - Does NOT replace qualified healthcare professionals
  - Does NOT provide independent medical advice
  - Cannot be used as sole basis for clinical decisions

- **Supported Functions:**
  - Organizes and presents patient medical information
  - Provides secure access to provider-created records
  - Assists in data explanation and accessibility
  - Requires clinician review and approval for clinical decisions

**⚠️ All clinical decisions must be made by qualified healthcare professionals.**

### AI & Machine Learning Disclaimer

All AI-assisted features are:
- **Assistive only** — Supports clinicians; does not diagnose
- **Clearly labeled** — Always marked "AI-generated" or "Demo"
- **Source-tracked** — Linked to original records
- **Not autonomous** — Requires human review and clinical judgment
- **Experimental** — Research-based models, not clinically validated
- **Zero custom training** — Uses pretrained weights; no JeevaCare-specific model training performed

**Chest X-Ray Analysis Specifics:**
- Uses pretrained ResNet50 from TorchXRayVision
- Detects patterns consistent with 18 common pathologies
- NOT a substitute for radiologist interpretation
- Predictions are experimental; require qualified radiologist review
- No custom training on JeevaCare datasets

### External Dependencies

All external services have demo/fallback modes:
- **Groq AI**: Optional text summaries (mock mode if unconfigured)
- **Piper TTS**: Optional text-to-speech (demo/mock if unconfigured)
- **Cloudinary**: Optional file storage (local filesystem fallback)
- **DigiLocker**: Optional government documents (demo mode by default)
- **TorchXRayVision**: Optional medical image analysis (mock mode by default)

---

## Documentation

- **[Build_spec.md](Build_spec.md)** — Technical architecture and detailed specifications
- **[objective.md](objective.md)** — Feature requirements and verification checklist
- **[docs/RENDER_DEPLOYMENT_GUIDE.md](docs/RENDER_DEPLOYMENT_GUIDE.md)** — Staging deployment with synthetic demo data
- **[docs/DEMO_DATA_LINKING.md](docs/DEMO_DATA_LINKING.md)** — Linking demo doctors to patients, and how to control it
- **[docs/CLARAMED_INTEGRATION.md](docs/CLARAMED_INTEGRATION.md)** — How ClaraMed fits in
- **[docs/MEDICAL_IMAGE_AI_SETUP.md](docs/MEDICAL_IMAGE_AI_SETUP.md)** — The old on-server chest X-ray setup (reference only; replaced by ClaraMed)
- **[docs/JEEVACARE_FRONTEND_IMPLEMENTATION.md](docs/JEEVACARE_FRONTEND_IMPLEMENTATION.md)** — Frontend architecture
- **[docs/RADIOLOGY_AI_QUICK_START.md](docs/RADIOLOGY_AI_QUICK_START.md)** — Quick start for the old on-server radiology features (reference only)

---

## Contributing

Contributions follow the specifications in **Build_spec.md** and **objective.md**.

**Process:**
1. Read Build_spec.md for architecture guidelines
2. Review objective.md for feature requirements
3. Create feature branch: `git checkout -b feature/your-feature`
4. Make meaningful commits with clear messages
5. Include tests for new code
6. Update README for user-facing changes
7. Ensure frontend builds successfully
8. Submit pull request

---

## License

Apache License 2.0

## Attribution & Acknowledgments

- Built as an academic prototype for lifelong healthcare continuity
- Designed to address fragmented medical records across providers
- Inspired by real healthcare access challenges
- Focuses on patient safety, security, and accessibility
- Community healthcare philosophy: organized health information saves lives

---

**Current Status**: Phase 1 Foundation — Ready for academic demonstration and further development

**Live Deployment**: 
- Frontend: https://jeevacare-cmdm.vercel.app
- Backend: https://jeevacare-th88.onrender.com
- Health: https://jeevacare-th88.onrender.com/health

**Latest Commit**: See [Git history](https://github.com/siri05gowda-byte/Jeevacare) for recent changes

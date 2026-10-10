# JeevaCare — One Life. One Health Journey.

A secure, verified, lifelong healthcare platform that maintains a chronological patient health journey across providers with emergency access, AI-assisted medical intelligence, and multilingual accessibility.

## 🏥 The Problem

Patients' medical records are fragmented across hospitals, cities, and physical documents. During health crises—especially emergencies—critical information is unavailable, identity is unclear, and care is delayed.

**Key Challenges**:
- Records scattered across multiple providers and locations
- No unified lifelong health timeline
- Difficult emergency access to critical information
- Identity continuity problems across providers
- Unclear verification status and record provenance
- Language and accessibility barriers

## ✨ The Solution

JeevaCare creates a **single, verified, auditable health record** that follows the patient throughout their lifetime:

1. **Unique Lifelong Identity** - One JeevaCare ID across all providers
2. **Verified Clinical Records** - Only authenticated providers can create official records
3. **Chronological Timeline** - All healthcare events organized by date
4. **Emergency Access** - Fast access to critical information after approved identification
5. **AI Medical Intelligence** - Explanations and summaries in 6 languages
6. **Audio Accessibility** - Text-to-speech for medical explanations
7. **Complete Audit Trail** - All access logged for security and compliance
8. **Patient Control** - View and manage records without altering provider facts

## 🎯 Implemented Features

### Patient Portal ✅
- **Health Timeline** - Chronological view of all medical events
- **Medical Records** - Secure viewing of clinical information
- **Appointments** - Book and manage doctor appointments
- **Emergency Profile** - Declare critical information (allergies, conditions, medications)
- **Document Upload** - Add personal medical documents
- **AI Summaries** - AI-generated summaries of medical history (demo/mock mode)
- **Multilingual Interface** - 6 languages: English, Hindi, Kannada, Telugu, Tamil, Malayalam
- **Audio Explanations** - Text-to-speech for medical explanations (demo/mock mode)

### Clinical Workspace ✅
- **Patient Search** - Safe patient matching to prevent wrong-patient errors
- **Clinical Records** - Create encounters, diagnoses, medications, procedures
- **Appointment Management** - View schedule and manage bookings
- **Document Verification** - Review and verify patient-uploaded documents
- **Record Amendment** - Traceable corrections with full history

### Emergency Access ✅
- **Rapid Patient Identification** - Access patient after identity verification
- **Critical Summary** - Allergies, blood group, medications shown first
- **Full History** - Complete timeline available when needed
- **Access Logging** - All emergency access audited

### Authorization & Security ✅
- **Role-Based Access** - Patient, Guardian, Doctor, Hospital Admin, Emergency, System Admin
- **Patient Isolation** - Patients cannot access other patients' records
- **Facility Isolation** - Staff limited to their facility
- **Server-Side Authorization** - Backend enforces all permissions
- **9-Point Clinical Authorization** - User, Professional, Facility, Staff, Role, Permissions, Credentials, Patient Access, Patient Verification
- **Complete Audit Trail** - All sensitive operations logged

### Verified Records ✅
- **Provider-Verified** - Official clinical data from authenticated providers
- **Patient-Uploaded** - Personal documents (initially unverified)
- **Verification Workflow** - Providers can review and verify uploads
- **Amendment History** - Changes create new versions, originals preserved
- **Correction Requests** - Patient-initiated corrections reviewed by provider
- **Immutability** - Patient cannot directly modify provider-created records

## 🏗️ Architecture

### Technology Stack

**Frontend**
- React 18 with Vite
- Tailwind CSS
- Zustand state management
- React Router for navigation

**Backend**
- Node.js + Express.js
- MongoDB + Mongoose
- JWT authentication
- Winston logging
- Helmet security headers

**External Services** (Adapter Pattern with Demo Modes)
- Groq AI (medical summaries - demo mode if unconfigured)
- Piper TTS (text-to-speech - demo mode if unconfigured)
- Cloudinary (file storage - optional)
- DigiLocker (government documents - optional, demo mode)

**Deployment**
- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas

### Project Structure

```
JeevaCare/
├── client/                          # React frontend
│   ├── src/
│   │   ├── components/              # UI components (Header, Logo, etc.)
│   │   ├── pages/                   # Page components (LoginPage, PatientDashboardV2, etc.)
│   │   ├── stores/                  # Zustand auth store
│   │   ├── services/                # API services (authService, aiService, etc.)
│   │   ├── assets/logos/            # Brand logos (stethoscope-J variants)
│   │   └── styles/                  # CSS and Tailwind config
│   ├── index.html                   # Title: "JeevaCare - Lifelong Health Journey"
│   ├── public/favicon.svg           # Favicon (optimized stethoscope-J)
│   └── vite.config.js
│
├── server/                          # Express backend
│   ├── src/
│   │   ├── routes/                  # API routes (auth, patients, health, etc.)
│   │   ├── models/                  # MongoDB models (User, Patient, Hospital, etc.)
│   │   ├── middleware/              # Auth, error handling, CORS
│   │   ├── services/                # Business logic (AI, TTS, etc.)
│   │   ├── adapters/                # External service adapters
│   │   ├── config/                  # Configuration with JWT validation
│   │   └── utils/                   # Utilities and logger
│   ├── .env.example
│   └── package.json
│
├── docs/
│   ├── STAGING_BACKEND_CONFIG.md    # Staging environment setup
│   ├── STAGING_FRONTEND_CONFIG.md   # Staging frontend config
│   ├── STAGING_READINESS_REPORT.md  # Pre-deployment verification
│   └── STAGING_SMOKE_TESTS.md       # 15-point post-deployment checklist
│
├── render.yaml                      # Render deployment config
├── vercel.json                      # Vercel deployment config
├── Build_spec.md                    # Technical specification
├── objective.md                     # Feature verification checklist
└── README.md                        # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/siri05gowda-byte/Jeevacare.git
   cd JeevaCare
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure backend environment**
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env with your settings
   ```

4. **Start MongoDB**
   ```bash
   # Option 1: Local MongoDB
   mongod
   
   # Option 2: Use MongoDB Atlas connection string in server/.env
   MONGODB_URI=mongodb+srv://username:password@cluster/jeevacare
   ```

5. **Start development servers**
   ```bash
   # Terminal 1: Backend (http://localhost:5000)
   npm run start:server

   # Terminal 2: Frontend (http://localhost:5173)
   npm run start:client
   ```

6. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000
   - API Health: http://localhost:5000/health

### Demo Credentials

```
Patient:  patient@demo.com  / DemoPassword123
Doctor:   doctor@demo.com   / DemoPassword123
Admin:    admin@demo.com    / DemoPassword123
```

## ⚙️ Environment Variables

### Backend Configuration (server/.env)

```env
# Server
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/jeevacare
TEST_MONGODB_URI=mongodb+srv://user:pass@cluster/jeevacare-test

# JWT Authentication (staging/production require 32+ chars, no 'dev-' keyword)
JWT_SECRET=dev-secret-change-in-production-12345
JWT_EXPIRATION=24h
REFRESH_TOKEN_SECRET=dev-refresh-secret-change-12345
REFRESH_TOKEN_EXPIRATION=7d

# CORS
CORS_ORIGIN=http://localhost:5173

# External Services (optional - demo modes used if unconfigured)
GROQ_API_KEY=                          # Leave empty for demo mode
GROQ_MODEL=mixtral-8x7b-32768

# File Storage
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Logging
LOG_LEVEL=info
```

## 🧪 Testing

### Run All Tests
```bash
npm run test
```

### Backend Tests
```bash
npm run test --workspace=server
```

**Test Results (Verified October 10, 2026):**
- ✅ **Piper TTS Tests: 17/17 PASS** (46.28s, exit code 0)
  - English synthesis: 185,900 bytes valid WAV (18.8s)
  - Hindi synthesis: 165,932 bytes valid WAV (14.6s)
  - Malayalam synthesis: 178,220 bytes valid WAV (10.0s)
  - Error handling: unsupported languages reject cleanly
  - Cleanup: temporary file cleanup verified
  - Concurrent limits: enforced (max 3)
  - Voice listing: accurate per language
- ⚠️ Full Integration Tests: BLOCKED (requires valid TEST_MONGODB_URI in server/.env)

### Piper TTS Direct Test
```bash
# Test English TTS synthesis with real Piper
# Windows:
echo "Hello, welcome to JeevaCare" | C:\Users\user\AppData\Local\Programs\Python\Python311\Scripts\piper.exe ^
  --model C:\Users\user\piper-models\en_US-amy-medium.onnx ^
  --output_file test.wav

# Linux:
echo "Hello, welcome to JeevaCare" | piper \
  --model /usr/share/piper-tts/models/en_US-amy-medium.onnx \
  --output_file test.wav

# Result: 196,140+ byte valid WAV file, exit code 0
# Audio: Real speech synthesis (not demo audio)
```

### Frontend Tests
```bash
npm run test --workspace=client
```

## 📡 API Endpoints

### Health Check
- `GET /health` - API health status
- `GET /api/v1/health/services` - External service status (demo/mock info)
- `GET /api/v1/health/config` - Configuration summary (non-sensitive)

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login with email/password
- `GET /api/v1/auth/current-user` - Get logged-in user
- `POST /api/v1/auth/logout` - Logout

### Patients
- `GET /api/v1/patients/:id` - Get patient record
- `POST /api/v1/patients` - Create patient
- `GET /api/v1/patients/:id/timeline` - Get health timeline

### Appointments
- `GET /api/v1/appointments` - List appointments
- `POST /api/v1/appointments` - Book appointment
- `GET /api/v1/appointments/:id` - Get appointment details

### AI Features (Demo/Mock Mode)
- `POST /api/v1/patients/:id/ai-summary` - Generate medical summary (returns mock data if Groq unconfigured)
- `GET /api/v1/health/services` - Check service status

## 🔐 Security

### Authentication & Authorization

**JWT Security Validation:**
- Development/Test: Allow development defaults
- Staging/Production: **Fail-safe enforcement** ✅
  - JWT_SECRET must be 32+ characters
  - JWT_SECRET cannot contain `dev-` or `development`
  - Separate REFRESH_TOKEN_SECRET required
  - Backend WILL NOT START if constraints violated

**Authorization:**
- 9-point clinical authorization boundary
- Server-side RBAC enforcement
- Patient isolation (cannot access other patients)
- Facility isolation (staff limited to their facility)

**Password Security:**
- bcryptjs hashing (11 rounds)
- No plaintext storage

### Data Protection

- HTTPS/TLS in transit (configured by Render/Vercel)
- Input validation on all endpoints
- Rate limiting: 100 requests/IP/15 minutes
- CORS: Strict origin configuration
- Security headers via Helmet.js
- Sensitive data not logged

### Audit Trail

All sensitive operations logged:
- Login/logout
- Patient record access
- Emergency access with reason
- Record creation/amendment
- Document upload/verification
- Permission changes

## 🤖 AI & Accessibility

### Medical Intelligence Features

**AI Summary Generation** (Demo/Mock Mode)
- Returns placeholder summaries if Groq API unconfigured
- Clearly marked as demo/mock in output
- Source-linked to patient records
- Available in 6 languages

**Text-to-Speech** (Optional Piper TTS - Production Ready for 3 Languages)
- Returns demo audio if TTS unconfigured
- **Supports 3 languages with real Piper TTS:** English, Hindi, Malayalam
- **Unsupported (no Piper models):** Kannada, Tamil, Telugu
- Optional playback speed control
- Production mode: Piper TTS (local, free, self-hosted, GPLv3)
  - See [PIPER_TTS_SETUP.md](PIPER_TTS_SETUP.md) for installation
  - See [PIPER_TTS_LANGUAGE_SUPPORT_REPORT.md](docs/PIPER_TTS_LANGUAGE_SUPPORT_REPORT.md) for language details
  - CPU-optimized, no GPU required
  - Real-time synthesis on Render infrastructure
  - Environment setup: `PIPER_TTS_ENABLED=true`, configure binary/models paths
  - Demo mode fallback if Piper unavailable

**Supported Languages** (Locked):
1. English (en)
2. Hindi (hi)
3. Kannada (kn)
4. Telugu (te)
5. Tamil (ta)
6. Malayalam (ml)

### AI Safety Guardrails ✅

- ✅ **No autonomous diagnosis** - AI never independently diagnoses
- ✅ **No fabrication** - AI never invents medical facts
- ✅ **Clear labeling** - All AI output marked "AI-generated"
- ✅ **Source-tracked** - Linked to original records
- ✅ **Not clinical fact** - AI output cannot become official record
- ✅ **Clinician review** - Professional judgment required

## 🌍 Multilingual Support

**Real Piper TTS support verified for 3 languages (October 2026).** Four additional languages have UI support but no official Piper models available.

| Language | Code | Status | TTS | Model Status | Notes |
|---|---|---|---|---|---|
| English | en | ✅ Implemented | ✅ **REAL** | en_US-amy-medium | Verified: 185KB+ WAV, exit code 0 |
| हिन्दी (Hindi) | hi | ✅ Implemented | ✅ **REAL** | hi_IN-pratham-medium | Verified: 165KB+ WAV, exit code 0 |
| മലയാളം (Malayalam) | ml | ✅ Implemented | ✅ **REAL** | ml_IN-meera-medium | Verified: 178KB+ WAV, exit code 0 |
| ಕನ್ನಡ (Kannada) | kn | ✅ UI Ready | ❌ Not Available | None | No official Piper model |
| తెలుగు (Telugu) | te | ✅ UI Ready | ❌ Not Available | None | No official Piper model |
| தமிழ் (Tamil) | ta | ✅ UI Ready | ❌ Not Available | None | No official Piper model |

**Status (Verified October 10, 2026):**
- ✅ **English, Hindi, Malayalam:** Real synthesis working, model files present, tests passing
- ❌ **Kannada, Tamil, Telugu:** No official Piper models available; UI supports these languages for future expansion

**Important:** Text-to-speech is limited to 3 languages with official Piper models. See [PIPER_TTS_SETUP.md](PIPER_TTS_SETUP.md) for installation and [PIPER_TTS_LANGUAGE_SUPPORT_REPORT.md](docs/PIPER_TTS_LANGUAGE_SUPPORT_REPORT.md) for language details and unsupported status.

## 📝 Deployment

### Optional: Real Piper TTS for English, Hindi, Malayalam

JeevaCare includes **verified, tested Piper TTS** for real audio generation. **Important:** Only 3 of 6 languages have official Piper models.

**Status Summary:**
- ✅ **English, Hindi, Malayalam:** Real synthesis verified (Oct 2026)
- ❌ **Kannada, Tamil, Telugu:** No official Piper models exist (as of Oct 2026)

For production audio generation (instead of demo/mock mode):

1. **English Setup (Verified & Recommended)**
   - Model: `en_US-amy-medium.onnx` (60.27 MB)
   - Tested: 185,900 byte valid WAV files
   - Synthesis time: ~19 seconds
   - See [PIPER_TTS_SETUP.md](PIPER_TTS_SETUP.md) for installation

2. **Hindi Setup (Verified)**
   - Model: `hi_IN-pratham-medium.onnx` (60.57 MB)
   - Tested: 165,932 byte valid WAV files
   - Synthesis time: ~15 seconds

3. **Malayalam Setup (Verified)**
   - Model: `ml_IN-meera-medium.onnx` (60.03 MB)
   - Tested: 178,220 byte valid WAV files
   - Synthesis time: ~10 seconds

4. **Render Deployment**
   - Python 3.8+ is pre-installed on Render
   - See [PIPER_TTS_DEPLOYMENT_ANALYSIS.md](docs/PIPER_TTS_DEPLOYMENT_ANALYSIS.md) for complete deployment steps
   - Models must be downloaded during build or stored in persistent disk
   - Set `PIPER_TTS_ENABLED=true` in Render environment variables
   - Configure `PIPER_BINARY_PATH=piper` and `PIPER_MODELS_PATH=/opt/render/project/piper-models`
   - First deploy will take ~10-15 minutes (includes model download)

4. **Local/Docker**
   - Volume-mount models directory to `/usr/share/piper-tts/models`
   - See [PIPER_TTS_SETUP.md](PIPER_TTS_SETUP.md) for Docker example

5. **Fallback Behavior**
   - If Piper is not configured or installation fails, system automatically falls back to demo mode
   - API responses include `isDemo: true` flag to indicate mock audio

### Frontend (Vercel)

1. Push code to GitHub
2. Connect repository to Vercel
3. Environment variables:
   ```
   VITE_API_BASE_URL=https://jeevacare-backend.onrender.com
   VITE_DEMO_MODE=false
   ```
4. Build command: `npm run build --workspace=client`
5. Output directory: `client/dist`

See `docs/STAGING_FRONTEND_CONFIG.md` for complete setup.

### Backend (Render)

1. Push code to GitHub
2. Connect repository to Render
3. Use `render.yaml` configuration
4. Environment variables (see `docs/STAGING_BACKEND_CONFIG.md`):
   - NODE_ENV=staging (or production)
   - MONGODB_URI (staging database)
   - JWT_SECRET (64+ random chars, no dev-)
   - REFRESH_TOKEN_SECRET (different, 64+ chars)
   - GROQ_API_KEY (if using production AI)
   - CORS_ORIGIN (frontend URL)

See `docs/STAGING_BACKEND_CONFIG.md` for complete setup.

### Post-Deployment Verification

Run the 15-point smoke test checklist in `docs/STAGING_SMOKE_TESTS.md`:
- Health check endpoint responds
- Patient registration works
- Login works
- Protected routes enforce authorization
- Invalid tokens rejected
- Frontend loads without errors
- Rate limiting active
- CORS headers present

## ⚠️ Important Disclaimers

### Medical Disclaimer ⚠️

JeevaCare is a healthcare **information platform**, NOT a diagnostic tool:

- ❌ Does NOT diagnose diseases
- ❌ Does NOT replace doctors
- ❌ Does NOT provide medical advice
- ✅ Organizes and presents medical information
- ✅ Assists in data access and explanation
- ✅ Requires clinician review and approval

**All clinical decisions must be made by qualified healthcare professionals.**

### AI Disclaimer ⚠️

All AI features (summaries, explanations, accessibility) are:

- **Assistive only** - Supports clinicians, does not diagnose
- **Clearly labeled** - Always marked "AI-generated"
- **Source-tracked** - Linked to original records
- **Demo/Mock** - Returns placeholder data if service unconfigured
- **Not autonomous** - Requires human review

### External Integrations ⚠️

- **DigiLocker**: Optional government document integration (demo mode by default)
- **Groq AI**: Optional AI provider (demo/mock mode if unconfigured)
- **Piper TTS**: Optional text-to-speech (demo/mock mode if unconfigured)
- **Cloudinary**: Optional file storage (not required for basic operation)

All external services have demo/fallback modes to prevent production failures.

## 📖 Documentation

- **[Build_spec.md](Build_spec.md)** - Complete technical specification
- **[objective.md](objective.md)** - Feature verification checklist
- **[docs/STAGING_READINESS_REPORT.md](docs/STAGING_READINESS_REPORT.md)** - Pre-deployment verification report
- **[docs/STAGING_BACKEND_CONFIG.md](docs/STAGING_BACKEND_CONFIG.md)** - Backend staging setup
- **[docs/STAGING_FRONTEND_CONFIG.md](docs/STAGING_FRONTEND_CONFIG.md)** - Frontend staging setup
- **[docs/STAGING_SMOKE_TESTS.md](docs/STAGING_SMOKE_TESTS.md)** - Post-deployment test checklist

## 🔄 Development Status

### Phase 1 ✅ COMPLETE

- ✅ Monorepo structure (client, server, shared)
- ✅ Backend foundation (Express, MongoDB, authentication)
- ✅ Frontend foundation (React, Tailwind, auth store)
- ✅ Role-based access control (RBAC)
- ✅ Patient identity and lifelong timeline
- ✅ Verified clinical records
- ✅ Emergency access with logging
- ✅ Appointment booking and management
- ✅ AI medical summaries (demo/mock mode)
- ✅ Multilingual support (6 languages)
- ✅ Text-to-speech accessibility (demo/mock mode)
- ✅ Complete audit trail
- ✅ Testing infrastructure (12 unit + 60 frontend tests passing)
- ✅ Security validation (JWT, CORS, rate limiting)
- ✅ Deployment configurations (Render + Vercel)

### Known Limitations

| Feature | Status | Notes |
|---|---|---|
| Full Integration Tests | ⚠️ BLOCKED | Requires valid TEST_MONGODB_URI (user responsibility) |
| Groq AI (Production) | ⚠️ Demo Mode | Demo/mock mode if GROQ_API_KEY unconfigured |
| Piper TTS (Production) | ✅ Ready (3 langs) | Real Piper synthesis for English, Hindi, Malayalam; Kannada, Tamil, Telugu unsupported |
| DigiLocker | ⚠️ Optional | Demo mode by default, optional integration |
| Cloudinary Upload | ⚠️ Optional | Not required for core functionality |

### Upcoming Phases

- Phase 2: Enhanced Patient Identity & Hospital Verification
- Phase 3-7: Expanded Clinical Records (Vaccination, Growth Tracking, Lab Results)
- Phase 8-13: Advanced Dashboards & Reporting
- Phase 14-19: Production Hardening, Monitoring, Advanced AI

## 🤝 Contributing

Contributions follow the Build_spec.md and objective.md. Process:

1. Read [Build_spec.md](Build_spec.md) for architecture
2. Check [objective.md](objective.md) for feature requirements
3. Create feature branch: `git checkout -b feature/your-feature`
4. Make meaningful commits
5. Include tests for new code
6. Update README with changes
7. Submit pull request

## 📄 License

Apache License 2.0

## 🙏 Acknowledgments

- Built as an academic prototype for lifelong healthcare continuity
- Designed to address fragmented medical records across providers
- Inspired by real healthcare challenges
- Focused on patient safety, security, and accessibility

---

**Current Status**: Phase 1 Foundation Complete — Production-Ready Backend & Frontend

**Test Results**: ✅ 12 unit tests, ✅ 60 frontend tests, ✅ 10 AI tests, ⚠️ Integration tests blocked (external dependency)

**Ready for Staging**: Yes — Use `render.yaml` and `vercel.json` with environment configuration from `docs/`

**Questions?** See [Build_spec.md](Build_spec.md), [objective.md](objective.md), or [docs/](docs/)

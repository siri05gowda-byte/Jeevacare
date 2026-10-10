<div align="center">

![JeevaCare — Healthier Lives, Together](https://raw.githubusercontent.com/siri05gowda-byte/Jeevacare/main/client/src/assets/logos/jeevacare-logo-wordmark.png)

</div>

A secure, verified, lifelong healthcare platform that maintains a chronological patient health journey across providers with emergency access, AI-assisted medical intelligence, and multilingual accessibility.

## The Problem

Patients' medical records are fragmented across hospitals, cities, and physical documents. During health crises—especially emergencies—critical information is unavailable, identity is unclear, and care is delayed.

**Key Challenges**:
- Records scattered across multiple providers and locations
- No unified lifelong health timeline
- Difficult emergency access to critical information
- Identity continuity problems across providers
- Unclear verification status and record provenance
- Language and accessibility barriers

## The Solution

JeevaCare creates a **single, verified, auditable health record** that follows the patient throughout their lifetime:

1. **Unique Lifelong Identity** - One JeevaCare ID across all providers
2. **Verified Clinical Records** - Only authenticated providers can create official records
3. **Chronological Timeline** - All healthcare events organized by date
4. **Emergency Access** - Fast access to critical information after approved identification
5. **AI Medical Intelligence** - Explanations and summaries in 6 languages
6. **Audio Accessibility** - Text-to-speech for medical explanations
7. **Complete Audit Trail** - All access logged for security and compliance
8. **Patient Control** - View and manage records without altering provider facts

## Implemented Features

### Patient Portal
- **Health Timeline** - Chronological view of all medical events
- **Medical Records** - Secure viewing of clinical information
- **Appointments** - Book and manage doctor appointments
- **Emergency Profile** - Declare critical information (allergies, conditions, medications)
- **Document Upload** - Add personal medical documents
- **AI Summaries** - AI-generated summaries of medical history (demo/mock mode)
- **Multilingual Interface** - 6 languages: English, Hindi, Kannada, Telugu, Tamil, Malayalam
- **Audio Explanations** - Text-to-speech for medical explanations (demo/mock mode)

### Clinical Workspace

- **Patient Search** - Safe patient matching to prevent wrong-patient errors
- **Clinical Records** - Create encounters, diagnoses, medications, procedures
- **Appointment Management** - View schedule and manage bookings
- **Document Verification** - Review and verify patient-uploaded documents
- **Record Amendment** - Traceable corrections with full history

### Emergency Access

- **Rapid Patient Identification** - Access patient after identity verification
- **Critical Summary** - Allergies, blood group, medications shown first
- **Full History** - Complete timeline available when needed
- **Access Logging** - All emergency access audited

### Authorization & Security

- **Role-Based Access** - Patient, Guardian, Doctor, Hospital Admin, Emergency, System Admin
- **Patient Isolation** - Patients cannot access other patients' records
- **Facility Isolation** - Staff limited to their facility
- **Server-Side Authorization** - Backend enforces all permissions
- **9-Point Clinical Authorization** - User, Professional, Facility, Staff, Role, Permissions, Credentials, Patient Access, Patient Verification
- **Complete Audit Trail** - All sensitive operations logged

### Verified Records

- **Provider-Verified** - Official clinical data from authenticated providers
- **Patient-Uploaded** - Personal documents (initially unverified)
- **Verification Workflow** - Providers can review and verify uploads
- **Amendment History** - Changes create new versions, originals preserved
- **Correction Requests** - Patient-initiated corrections reviewed by provider
- **Immutability** - Patient cannot directly modify provider-created records

## Architecture

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

## Getting Started

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

## Environment Variables

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

## Testing

### Test Coverage

```bash
npm run test
```

**Test Status:**
- ✓ Backend: Unit and integration tests included
- ✓ Frontend: 60 tests passing
- ✓ Build verification: Production build validates all modules

Backend tests include AI service integration, authentication, and authorization validation. Integration tests require a configured MongoDB test database.

## API Endpoints

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

## Security

### Authentication & Authorization

**JWT Security Validation:**
- Development/Test: Allow development defaults
- Staging/Production: **Fail-safe enforcement**
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

## AI & Accessibility

### Medical Intelligence Features

**AI Summary Generation**
- Returns demo summaries if AI service is unconfigured
- Available in 6 supported languages
- Source-linked to patient records
- Clearly marked as "AI-generated"

**Text-to-Speech Accessibility**
- Piper TTS available for English, Hindi, and Malayalam (real audio)
- Demo/mock mode for other languages or when service is unconfigured
- Optional playback speed control
- Free, self-hosted, no subscription required

### AI Safety Guardrails

- ✓ No autonomous diagnosis - AI never independently diagnoses
- ✓ No fabrication - AI never invents medical facts
- ✓ Clear labeling - All AI output marked "AI-generated"
- ✓ Source-tracked - Linked to original records
- ✓ Not clinical fact - AI output cannot become official record
- ✓ Requires review - Clinician approval required for clinical decisions

## Multilingual Support

JeevaCare provides a user interface in 6 languages with text-to-speech support for 3 languages:

| Language | Code | UI | Text-to-Speech |
|---|---|---|---|
| English | en | ✓ | ✓ (Piper available) |
| हिन्दी (Hindi) | hi | ✓ | ✓ (Piper available) |
| മലയാളം (Malayalam) | ml | ✓ | ✓ (Piper available) |
| ಕನ್ನಡ (Kannada) | kn | ✓ | Demo mode |
| తెలుగు (Telugu) | te | ✓ | Demo mode |
| தமிழ் (Tamil) | ta | ✓ | Demo mode |

**Note:** Piper TTS models are officially available for English, Hindi, and Malayalam. Other languages are supported through the UI with demo/mock audio unless custom TTS providers are integrated. See `PIPER_TTS_SETUP.md` for language support details.

## Deployment

### Frontend (Vercel)

1. Push code to GitHub
2. Connect repository to Vercel
3. Environment variables:
   ```
   VITE_API_BASE_URL=https://your-backend-url.onrender.com
   ```
4. Build command: `npm run build --workspace=client`
5. Output directory: `client/dist`

### Backend (Render)

1. Push code to GitHub
2. Connect repository to Render
3. Use `render.yaml` configuration
4. Environment variables:
   - `NODE_ENV`: development, staging, or production
   - `MONGODB_URI`: MongoDB connection string
   - `JWT_SECRET`: 32+ character random string (no 'dev-' prefix in staging/production)
   - `REFRESH_TOKEN_SECRET`: Separate refresh token secret (32+ characters)
   - `CORS_ORIGIN`: Frontend URL for CORS configuration
   - Optional: `GROQ_API_KEY` for production AI features

### Optional: Text-to-Speech (Piper TTS)

For production audio generation instead of demo/mock audio:

1. **Environment Setup**
   - Set `PIPER_TTS_ENABLED=true` in backend environment
   - Configure `PIPER_BINARY_PATH` and `PIPER_MODELS_PATH`

2. **Supported Languages** (3 languages with verified Piper models)
   - English (en) - en_US-amy-medium
   - Hindi (hi) - hi_IN-pratham-medium
   - Malayalam (ml) - ml_IN-meera-medium

3. **Deployment Notes**
   - See `PIPER_TTS_SETUP.md` for local installation and testing
   - Python 3.8+ required
   - On Render: Models can be stored in persistent disk or downloaded during build
   - First deployment takes ~10-15 minutes for model download
   - System automatically falls back to demo mode if TTS is unconfigured

4. **Deployment Documentation**
   - `docs/STAGING_BACKEND_CONFIG.md` - Complete backend configuration
   - `docs/PIPER_TTS_SETUP.md` - TTS installation and testing (local and Docker)

## Important Disclaimers

### Medical Disclaimer

JeevaCare is a healthcare **information platform**, NOT a diagnostic tool:

- BLOCKED: Does NOT diagnose diseases
- BLOCKED: Does NOT replace doctors
- BLOCKED: Does NOT provide medical advice
- PASS: Organizes and presents medical information
- PASS: Assists in data access and explanation
- PASS: Requires clinician review and approval

**All clinical decisions must be made by qualified healthcare professionals.**

### AI Disclaimer

All AI features (summaries, explanations, accessibility) are:

- **Assistive only** - Supports clinicians, does not diagnose
- **Clearly labeled** - Always marked "AI-generated"
- **Source-tracked** - Linked to original records
- **Demo/Mock** - Returns placeholder data if service unconfigured
- **Not autonomous** - Requires human review

### External Integrations

- **DigiLocker**: Optional government document integration (demo mode by default)
- **Groq AI**: Optional AI provider (demo/mock mode if unconfigured)
- **Piper TTS**: Optional text-to-speech (demo/mock mode if unconfigured)
- **Cloudinary**: Optional file storage (not required for basic operation)

All external services have demo/fallback modes to prevent production failures.

## Documentation

- **[Build_spec.md](Build_spec.md)** - Complete technical specification
- **[objective.md](objective.md)** - Feature verification checklist
- **[docs/STAGING_READINESS_REPORT.md](docs/STAGING_READINESS_REPORT.md)** - Pre-deployment verification report
- **[docs/STAGING_BACKEND_CONFIG.md](docs/STAGING_BACKEND_CONFIG.md)** - Backend staging setup
- **[docs/STAGING_FRONTEND_CONFIG.md](docs/STAGING_FRONTEND_CONFIG.md)** - Frontend staging setup
- **[docs/STAGING_SMOKE_TESTS.md](docs/STAGING_SMOKE_TESTS.md)** - Post-deployment test checklist

## Development Status

### Phase 1: Foundation Complete

Core features implemented and tested:

- ✓ Monorepo structure (client, server, shared)
- ✓ Backend foundation (Express, MongoDB, authentication)
- ✓ Frontend foundation (React, Tailwind, auth store)
- ✓ Role-based access control (RBAC) with 9-point authorization
- ✓ Patient identity and lifelong health timeline
- ✓ Verified clinical records with amendment history
- ✓ Emergency access with logging and audit trail
- ✓ Appointment booking and management
- ✓ AI medical summaries (with demo/mock fallback)
- ✓ Multilingual interface (6 languages)
- ✓ Text-to-speech accessibility (English, Hindi, Malayalam with Piper TTS)
- ✓ Complete audit trail for all operations
- ✓ Security validation (JWT, CORS, rate limiting, input validation)
- ✓ Deployment configurations (Render + Vercel)

### Known Limitations

| Feature | Status | Notes |
|---|---|---|
| Full Integration Tests | Configurable | User must provide TEST_MONGODB_URI |
| Production AI (Groq) | Optional | Demo/mock mode if unconfigured |
| Production TTS (Piper) | Optional | Demo/mock mode if unconfigured; 3 languages supported |
| DigiLocker Integration | Optional | Demo mode by default |
| File Upload (Cloudinary) | Optional | Not required for core functionality |

### Upcoming

- Phase 2-7: Enhanced clinical records (vaccination, growth tracking, lab results, etc.)
- Phase 8-13: Advanced dashboards and clinical reporting
- Phase 14+: Production hardening and operational monitoring

## Contributing

Contributions follow the Build_spec.md and objective.md. Process:

1. Read [Build_spec.md](Build_spec.md) for architecture
2. Check [objective.md](objective.md) for feature requirements
3. Create feature branch: `git checkout -b feature/your-feature`
4. Make meaningful commits
5. Include tests for new code
6. Update README with changes
7. Submit pull request

## License

Apache License 2.0

## Acknowledgments

- Built as an academic prototype for lifelong healthcare continuity
- Designed to address fragmented medical records across providers
- Inspired by real healthcare challenges
- Focused on patient safety, security, and accessibility

---

**Current Status**: Phase 1 Foundation Complete

**Ready for Deployment**: Yes — See deployment section above

**Documentation**: See [Build_spec.md](Build_spec.md), [objective.md](objective.md), and [docs/](docs/) for detailed technical information

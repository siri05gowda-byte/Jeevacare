# JeevaCare

**"One Life. One Health Journey."**

A secure, open-source lifelong healthcare platform designed to maintain a verified, chronological patient health journey across healthcare providers, with emergency access, AI-assisted medical intelligence, and radiology support.

## 🏥 The Problem

Patients' medical records are fragmented across different hospitals, cities, and physical documents, making it difficult to maintain complete medical history and access care efficiently—especially during emergencies.

**Key Challenges**:
- Records scattered across multiple providers and locations
- Lack of unified lifelong health timeline
- Difficult emergency access to critical information
- Identity continuity problems
- Unclear verification status and record provenance
- Poor-quality photographs of physical documents
- Complex medical terminology barrier
- Language and accessibility gaps

## ✨ The Solution

JeevaCare creates a **single, verified, auditable health record** that follows the patient throughout their lifetime:

1. **Secure Patient Identity** - Unique JeevaCare ID that remains constant across providers
2. **Verified Clinical Records** - Only authenticated healthcare providers can create official records
3. **Chronological Timeline** - All healthcare events organized by date, searchable and filterable
4. **Emergency Access** - Rapid access to critical patient information after approved identification
5. **AI Medical Intelligence** - Summaries and explanations of medical records and radiology
6. **Accessibility** - Multilingual support (6 languages), audio/TTS, readable explanations
7. **Audit Trail** - Complete logging of who accessed what, when, and why
8. **Patient Control** - View records without altering provider-verified clinical facts

## 🎯 Core Features

### Patient Portal
- **Health Timeline** - Chronological view of all medical events (vaccinations, consultations, medications, lab results, radiology)
- **Medical Records** - Secure viewing of all clinical information
- **Appointments** - Book, reschedule, or cancel doctor appointments
- **Emergency Profile** - Manage critical information (allergies, conditions, medications)
- **Document Upload** - Add personal medical documents with quality assistance
- **AI Summaries** - AI-generated summaries of medical history
- **Accessible Interface** - Language selection, audio explanations, readable text

### Hospital/Provider Portal
- **Patient Search** - Safe patient matching to prevent wrong-patient errors
- **Clinical Workspace** - Create encounters, record diagnoses, medications, procedures
- **Appointment Management** - View schedule, manage patient bookings
- **Radiology Integration** - Upload reports, access AI-assisted explanations
- **Document Verification** - Review and verify patient-uploaded medical documents
- **Staff Management** - Manage authorized clinical staff and roles

### Emergency Portal
- **Rapid Patient Access** - Identify patient and access critical information immediately
- **Critical Summary** - Show allergies, blood group, conditions, medications first
- **Full History** - Detailed medical history available when needed
- **Incident Tracking** - Document emergency events and rescuer information
- **Access Logging** - All emergency access audited and reviewed

### Lifelong Health Timeline

A central feature showing:
- **Birth Records** - Newborn information, birth weight, initial observations
- **Vaccinations** - Complete immunization history
- **Growth Tracking** - Historical height, weight, head circumference measurements
- **Consultations** - Doctor visits and reason for visit
- **Diagnoses** - Conditions and diagnoses with verification status
- **Medications** - Prescribed medications and history
- **Allergies** - Documented allergies and reactions
- **Laboratory Results** - Lab tests with results and interpretation
- **Radiology** - Imaging reports with AI explanations
- **Surgeries/Procedures** - Surgical history and procedures
- **Hospitalizations** - Admission records and discharge summaries

### Verified Healthcare Records

- **Provider-Verified Records** - Official clinical data from authenticated providers
- **Patient-Uploaded Records** - Personal documents (initially unverified)
- **Verification Workflow** - Providers can review and verify patient uploads
- **Amendment History** - Changes create new versions, never overwrite originals
- **Provenance Tracking** - Know who created/verified each record and when
- **Correction Requests** - Patient-initiated correction workflow with provider review

### AI-Assisted Medical Intelligence

**Medical History Summaries**:
- AI generates concise summaries of medical records
- Clearly marked as AI-generated assistance (not medical advice)
- Multiple language support (6 languages)
- Optional audio/text-to-speech

**Medical Report Explanations**:
- Simplify complex medical terminology
- Explain findings and recommendations
- Source-linked to original reports
- Available in 6 languages

**Radiology Explanations**:
- Specialized explanations for radiology reports
- X-ray, CT, MRI, ultrasound support
- Clear distinction between AI output and official diagnosis
- Available in 6 languages

### Radiology & Document Assistance

**Document Quality Checks**:
- Detect blur, glare, cropping, visibility issues
- Provide actionable feedback ("Hold camera steady", "Reduce glare")
- Validate orientation and readability

**Radiology Image Support**:
- Upload and process medical images
- Quality assessment and feedback
- OCR text extraction from reports
- AI-assisted predictions with clear disclaimers

**OCR (Optical Character Recognition)**:
- Extract text from scanned medical documents
- Support for prescriptions, reports, certificates
- Manual correction capability
- Metadata extraction (date, provider, facility)

### Multilingual & Audio Accessibility

**6 Supported Languages** (locked):
1. English (en)
2. Hindi (hi) - हिन्दी
3. Kannada (kn) - ಕನ್ನಡ
4. Telugu (te) - తెలుగు
5. Tamil (ta) - தமிழ்
6. Malayalam (ml) - മലയാളം

**Audio Explanations**:
- Text-to-speech for medical summaries
- Audio-ready format for explanations
- Language-specific voices
- Adjustable playback speed

### Security & RBAC

**Role-Based Access**:
- PATIENT - View own records, upload documents, manage emergency info
- GUARDIAN - Manage minor's records and access
- DOCTOR - Create clinical records, prescribe treatments, verify documents
- HOSPITAL_ADMIN - Manage facility staff and verify professionals
- EMERGENCY - Rapid emergency access after patient identification
- SYSTEM_ADMIN - System configuration and oversight

**Security Features**:
- JWT authentication with short expiration
- Password hashing (bcryptjs)
- Server-side authorization enforcement
- Patient isolation (cannot access other patients' records)
- Facility isolation (staff limited to their facility)
- Account lockout after failed attempts
- HTTPS/TLS encryption
- Rate limiting on sensitive endpoints

### Auditability & Compliance

**Complete Audit Trail**:
- Login/logout events
- Patient record access
- Emergency access with reasons
- Clinical record creation and amendments
- Document uploads and verification
- Permission and role changes
- AI explanations generated
- Failed access attempts

**Compliance Features**:
- Sensitive operation logging
- Historical preservation (no silent overwrites)
- Amendment tracking
- Identity linking audit
- Provider verification trails
- Facility verification history

## 🏗️ Architecture

### Technology Stack

**Frontend**
- React 18
- Vite (build tool)
- Tailwind CSS (styling)
- Zustand (state management)
- Axios (HTTP client)
- React Router (navigation)

**Backend**
- Node.js + Express.js
- MongoDB + Mongoose
- JWT authentication
- Winston logging
- express-validator (validation)
- Helmet (security headers)

**AI & Services**
- Python AI service (medical summaries)
- Tesseract OCR (document processing)
- Text-to-Speech service (accessibility)
- Cloudinary (file storage)
- DigiLocker (government documents - optional)

**Deployment**
- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas
- File Storage: Cloudinary

### Project Structure

```
JeevaCare/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── layouts/       # Layout components
│   │   ├── stores/        # Zustand state management
│   │   ├── services/      # API integration
│   │   └── utils/         # Utility functions
│   ├── vite.config.js
│   └── tailwind.config.js
├── server/                 # Express backend
│   ├── src/
│   │   ├── models/        # MongoDB models
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Express middleware
│   │   ├── services/      # Business logic
│   │   ├── adapters/      # External service adapters
│   │   ├── config/        # Configuration
│   │   └── utils/         # Utility functions
│   └── .env.example
├── shared/                 # Shared types/utils
├── docs/                   # Documentation
│   ├── PHASE_1_REPORT.md
│   └── datasets/          # Dataset documentation (PART 11)
├── tests/                  # Test files
├── Build_spec.md          # Implementation specification
├── objective.md           # Verification checklist
└── README.md              # This file
```

## 🚀 Local Development Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/siri05gowda-byte/Jeevacare.git
   cd Jeevacare
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   # Backend configuration
   cp server/.env.example server/.env
   # Edit server/.env with your configuration
   ```

4. **Start MongoDB**
   ```bash
   mongod
   # Or use MongoDB Atlas connection string in .env
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
Email: patient@demo.com
Password: DemoPassword123

Also available:
doctor@demo.com
admin@demo.com
(same password)
```

## ⚙️ Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/jeevacare

# Authentication
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRATION=24h

# External Services (optional)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# AI Service
AI_SERVICE_ENABLED=false
AI_SERVICE_URL=http://localhost:8000

# CORS
CORS_ORIGIN=http://localhost:5173
```

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run backend tests
npm run test --workspace=server

# Run frontend tests
npm run test --workspace=client
```

## 🌍 Deployment

### Frontend (Vercel)
```bash
npm run build --workspace=client
# Deploy dist/ to Vercel
```

### Backend (Render)
```bash
npm run build --workspace=server
# Deploy to Render with MONGODB_URI and JWT_SECRET
```

## 🛡️ Security

### Authentication
- JWT tokens with 24-hour expiration
- Password hashing (bcryptjs)
- Refresh token rotation
- OTP capability (email/SMS configurable)

### Authorization
- Server-side RBAC enforcement
- Patient isolation (cannot access other patients' data)
- Facility isolation (staff limited to their facility)
- Role-based endpoint access control

### Data Protection
- HTTPS/TLS encryption in transit
- Secure secret management (environment variables)
- Input validation and sanitization
- Rate limiting on API endpoints
- CORS configuration
- Helmet security headers

### Audit & Compliance
- Complete audit trail for all sensitive operations
- User access logging
- Clinical record change history
- Amendment tracking
- Identity verification logging
- Sensitive information protection

## 🤖 AI & Medical Intelligence

### Medical Summary Generation
- Generates concise summaries from existing medical records
- AI clearly marked as assistive (not a diagnosis)
- Sources preserved and linked
- Available in 6 languages
- Optional audio output

### Medical Report Explanation
- Simplifies medical terminology
- Explains findings and recommendations
- Source-linked to original reports
- Available in 6 languages

### Radiology Report Explanation
- Specialized for radiology (X-ray, CT, MRI, ultrasound)
- Explains findings in accessible language
- Clear disclaimer: AI-assisted, not autonomous diagnosis
- Available in 6 languages

### AI Safety Guardrails
- ✅ AI does NOT independently diagnose
- ✅ AI does NOT invent medical facts
- ✅ AI explanations are clearly labeled
- ✅ Original medical records remain authoritative
- ✅ AI output cannot become official diagnosis
- ✅ Clinician review and approval required for clinical decisions

## 📖 Documentation

- **[PHASE_1_REPORT.md](docs/PHASE_1_REPORT.md)** - Foundation architecture and implementation details
- **[Build_spec.md](Build_spec.md)** - Complete technical specification
- **[objective.md](objective.md)** - Feature verification checklist
- **[docs/datasets/](docs/datasets/)** - Medical imaging dataset strategy and research

## 🔄 Development Status

### Phase 1 ✅ COMPLETE
- ✅ Monorepo structure
- ✅ Backend foundation (Express, MongoDB)
- ✅ Frontend foundation (React, Tailwind)
- ✅ Authentication & Authorization
- ✅ Database models (9 collections)
- ✅ Testing infrastructure
- ✅ Documentation

### Upcoming Phases
- Phase 2: Patient Identity & Hospital Verification
- Phase 3-7: Core Features (Appointments, Radiology, Clinical Records)
- Phase 8-13: Dashboards (Patient, Hospital, Emergency)
- Phase 14-19: AI, Multilingual, Production Release

## 📝 Research Datasets

JeevaCare is designed to support medical imaging AI for radiology analysis. Current research focuses on:

- **RSNA Pneumonia Detection** - Recommended starting point
- **NIH ChestX-ray14** - Large-scale multi-label dataset
- **CheXpert** - Expert-labeled chest X-rays
- **MIMIC-CXR** - Real clinical data (credentialed access required)

See [docs/datasets/](docs/datasets/) for dataset strategy, licensing requirements, and implementation plan.

### AI Model Architecture
- Modular adapter pattern for future models
- Clear separation: radiology image → AI output → clinician review
- No fabrication, no autonomous diagnosis
- Source tracking and attribution
- Explainability requirements

## ⚠️ Important Disclaimers

### Medical Disclaimer
JeevaCare is a healthcare information platform, NOT a diagnostic tool:
- ❌ JeevaCare does NOT diagnose diseases
- ❌ JeevaCare does NOT replace doctors
- ❌ JeevaCare does NOT provide medical advice
- ✅ JeevaCare organizes and presents medical information
- ✅ JeevaCare assists in data access and explanation
- ✅ JeevaCare requires clinician review and approval

### AI Disclaimer
All AI features (medical summaries, report explanations, radiology assistance) are:
- **Assistive only** - Not autonomous diagnosis
- **Clearly labeled** - Always marked "AI-generated"
- **Source-tracked** - Linked to original records
- **Clinician-reviewed** - Require professional judgment
- **Compliant** - Follow regulatory guidelines

### Dataset Disclaimer
- Datasets are used for research and development
- All datasets must be obtained and used per their licensing terms
- Patient-identifiable data must be de-identified
- Clinical use requires appropriate approvals
- Government credentials required for restricted datasets

## 🤝 Contributing

Contributions follow the Build_spec.md and objective.md requirements. Please:
1. Read Build_spec.md for architecture understanding
2. Check objective.md for feature requirements
3. Create a feature branch
4. Make meaningful commits
5. Submit a pull request with clear description
6. Include tests for new features

## 📄 License

Apache License 2.0

## 🙏 Acknowledgments

- Built as an academic prototype for comprehensive healthcare continuity
- Designed to address fragmented medical records across providers
- Inspired by real healthcare challenges
- Focused on patient safety, security, and accessibility

---

**Status**: Phase 1 Foundation Complete - Production-Ready Backend & Frontend  
**Next**: Phase 2 Patient Identity & Hospital Verification  
**Questions?** See [docs/](docs/) or Build_spec.md

## 🏗️ Architecture

### Monorepo Structure

```
jeevacare/
├── client/                 # React.js frontend (Vite + Tailwind)
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── stores/        # Zustand state management
│   │   ├── services/      # API integration
│   │   ├── layouts/       # Layout components
│   │   └── utils/         # Utilities
│   ├── vite.config.js
│   └── tailwind.config.js
├── server/                 # Express.js backend
│   ├── src/
│   │   ├── models/        # MongoDB Mongoose models
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Express middleware
│   │   ├── services/      # Business logic
│   │   ├── controllers/   # Route controllers
│   │   ├── adapters/      # External service adapters
│   │   ├── config/        # Configuration
│   │   └── utils/         # Utilities
│   ├── .env.example       # Environment template
│   └── package.json
├── shared/                 # Shared types/utilities (future)
├── docs/                   # Documentation
├── tests/                  # Test files
├── package.json            # Root package with workspaces
└── .gitignore
```

### Technology Stack

**Frontend**
- React.js 18
- Vite
- Tailwind CSS
- Zustand (state management)
- Axios (HTTP client)
- Lucide React (icons)

**Backend**
- Node.js
- Express.js
- MongoDB + Mongoose
- JWT + OTP authentication
- Winston (logging)
- Express Rate Limit

**External Services** (Adapters)
- Cloudinary (file storage)
- AI Service (medical summaries)
- Tesseract OCR (document processing)
- Text-to-Speech (accessibility)
- DigiLocker (government integration - optional)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or cloud)
- npm or yarn

### Installation

1. **Clone or set up the project**
   ```bash
   cd JeevaCare
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   **Server** (`.env`):
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env with your configuration
   ```

4. **Start MongoDB**
   ```bash
   # Local MongoDB
   mongod
   # Or use MongoDB Atlas connection string in .env
   ```

5. **Start the development servers**

   **Terminal 1 - Backend**:
   ```bash
   npm run start:server
   ```

   **Terminal 2 - Frontend**:
   ```bash
   npm run start:client
   ```

   Or start both concurrently:
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000
   - API Health: http://localhost:5000/health

## 📋 Database Models

### Core Collections

- **User**: Authentication and user profiles
- **Patient**: Unique patient identity and lifelong health journey
- **Hospital**: Healthcare facility information and verification
- **GuardianRelationship**: Parent/guardian relationships for minors
- **Encounter**: Clinical visit/interaction
- **ClinicalRecord**: Medical events (diagnosis, medication, vaccination, etc.)
- **Document**: Uploaded medical documents with OCR and quality checks
- **Appointment**: Doctor scheduling and booking
- **AuditEvent**: Comprehensive audit trail for compliance
- **EmergencyProfile**: Patient-declared emergency information

### Key Design Principles

1. **Patient Identity Separation**: Personal identity data is never overwritten by clinical observations
2. **Record Immutability**: Provider-verified records cannot be directly modified; use amendment workflow
3. **Verification Status**: Clear tracking of verification status for all clinical information
4. **Amendment History**: All versions of records are preserved for audit
5. **Facility Scope**: Staff permissions are scoped to their facility

## 🔐 Security

### Authentication

- JWT-based authentication
- Password hashing with bcryptjs
- OTP capability (email/SMS - configurable)
- Session management
- Account lockout after failed attempts
- Refresh token rotation

### Authorization

- Role-Based Access Control (RBAC)
- Server-side authorization middleware
- Facility-scoped permissions
- Patient isolation enforcement
- Emergency access logging

### Data Protection

- HTTPS/TLS encryption in transit
- Secure secret management (environment variables)
- Input validation and sanitization
- Rate limiting on API endpoints
- CORS configuration
- Helmet security headers

## 📡 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Authenticate user
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/refresh-token` - Refresh access token
- `GET /api/v1/auth/current-user` - Get authenticated user

### Health Check
- `GET /health` - Health check
- `GET /api/v1/health/services` - External services status
- `GET /api/v1/health/config` - Configuration (non-sensitive)

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run backend tests
npm run test --workspace=server

# Run frontend tests
npm run test --workspace=client
```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api/v1
```

### Authentication Header
```
Authorization: Bearer <JWT_TOKEN>
```

### Example: Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"patient@demo.com","password":"DemoPassword123"}'
```

## 🎨 Design System

### Brand Colors
- **Primary Blue**: `#1e3a8a` (Stethoscope J)
- **Light Blue**: `#3b82f6`
- **Navy**: `#0f172a`
- **Success Green**: `#10b981`
- **Warning Amber**: `#f59e0b`
- **Danger Red**: `#ef4444`

### Component Classes
- `.btn-primary` - Primary button
- `.btn-secondary` - Secondary button
- `.card` - Card container
- `.badge-success` / `.badge-warning` / `.badge-danger` - Badges
- `.alert-success` / `.alert-error` / `.alert-warning` - Alerts
- `.form-input` - Input field
- `.form-label` - Form label

## 🌍 Multilingual Support

Locked supported languages:
1. **English** (en)
2. **Hindi** (hi) - हिन्दी
3. **Kannada** (kn) - ಕನ್ನಡ
4. **Telugu** (te) - తెలుగు
5. **Tamil** (ta) - தமிழ்
6. **Malayalam** (ml) - മലയാളം

## 🔌 External Service Adapters

All external services use adapter pattern with demo/fallback modes:

### Cloudinary Adapter
- **Status**: Demo mode if credentials unavailable
- **Purpose**: File storage and document management
- **Config**: `CLOUDINARY_*` environment variables

### AI Service Adapter
- **Status**: Demo mode if credentials unavailable
- **Purpose**: Medical summary generation, report explanations
- **Config**: `AI_SERVICE_*` environment variables
- **Demo**: Mock summaries with placeholder data

### OCR Adapter
- **Status**: Demo mode if credentials unavailable
- **Purpose**: Document text extraction
- **Config**: `OCR_SERVICE_*` environment variables

### TTS Adapter
- **Status**: Demo mode if credentials unavailable
- **Purpose**: Text-to-speech for accessibility
- **Config**: `TTS_SERVICE_*` environment variables

### DigiLocker Adapter
- **Status**: Optional - demo mode by default
- **Purpose**: Government document integration
- **Config**: `DIGILOCKER_*` environment variables
- **Note**: No live integration without credentials

## 📖 Demo Accounts

### Testing Credentials
- **Email**: `patient@demo.com` / `doctor@demo.com` / `admin@demo.com`
- **Password**: `DemoPassword123`

These are created via seed script (implement in Phase 19).

## 🛠️ Development Workflow

### Creating a New Feature

1. Create backend model/schema
2. Create API routes and controllers
3. Implement authorization checks
4. Add audit logging
5. Create frontend components
6. Connect to API
7. Add tests
8. Document in README

### Code Style

- Backend: ES6+ modules
- Frontend: React functional components + hooks
- Formatting: Consistent indentation, clear naming
- Error handling: Try-catch with proper error responses

## 📝 Environment Configuration

### Server (.env)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/jeevacare

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRATION=24h

# External Services (optional)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# AI Service
AI_SERVICE_ENABLED=false
AI_SERVICE_URL=http://localhost:8000

# CORS
CORS_ORIGIN=http://localhost:5173
```

## 🚨 Important Security Rules

1. **Never expose secrets** in frontend code
2. **Always enforce authorization** server-side
3. **Never trust frontend-only authorization**
4. **Log sensitive operations** for audit
5. **Use HTTPS** in production
6. **Never silently overwrite** clinical records
7. **Never guess patient identity** in emergencies
8. **Patient isolation** must be enforced
9. **Facility scope** must be enforced for staff
10. **AI safety**: No fabrication, clear labeling

## 📞 Support & Documentation

- **Build Specification**: See `Build_spec.md`
- **Verification Checklist**: See `objective.md`
- **Architecture Guide**: See `docs/architecture.md` (to be created)
- **API Guide**: See `docs/api.md` (to be created)

## 📄 License

Apache License 2.0

## 🤝 Contributing

This is an academic prototype for JeevaCare. Contributions follow the specification in `Build_spec.md` and verification in `objective.md`.

---

**Status**: Phase 1 Foundation Complete (✓ Database, Auth, API, UI Foundation)

**Next Phases**: 
- Patient Identity & Unique JeevaCare ID
- Hospital Verification
- Clinical Records
- Dashboards
- AI Features
- Multilingual Support

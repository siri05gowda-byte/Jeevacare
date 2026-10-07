# JeevaCare — One Life. One Health Journey.

A secure, comprehensive lifelong healthcare platform designed to maintain a verified, chronological patient health journey across healthcare providers.

## 🏥 Project Overview

JeevaCare addresses fragmented medical records by providing a single secure platform where authorized patients' healthcare journeys are organized chronologically. The system maintains official provider records, supports emergency access, includes AI-assisted summaries, and provides multilingual accessibility.

### Core Principles

- **Lifelong Continuity**: Healthcare journey from birth through adulthood
- **Verified Authority**: Only verified providers can create official records
- **Patient Visibility**: Patients can view their records without modifying provider-verified clinical facts
- **Emergency Ready**: Fast access to critical information during emergencies
- **Auditable**: All sensitive access and changes are logged
- **Multilingual**: Support for 6 languages: English, Hindi, Kannada, Telugu, Tamil, Malayalam

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

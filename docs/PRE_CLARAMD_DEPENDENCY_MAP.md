# JeevaCare Pre-ClaraMed Dependency Map

**Created**: October 7, 2026  
**Purpose**: Comprehensive inventory of AI dependencies before decoupling for ClaraMed architecture

---

## Executive Summary

JeevaCare currently has **direct TorchXRayVision/PyTorch inference** embedded in its backend runtime. This document maps all dependencies that must be removed or preserved during the ClaraMed decoupling cleanup.

### What Will Be Decoupled
- Python ML worker (`ChestXRayInferenceWorker.py`)
- Direct TorchXRayVision/PyTorch inference runtime
- Python 3.11 environment provisioning for ML
- Heavy ML dependencies (torch, torchvision, torchxrayvision)

### What Will Be Preserved
- RadiologyRecord model (metadata, AI analysis results storage)
- Radiology record retrieval APIs (patient history, report viewing)
- Existing radiology records in database
- Authentication and authorization for radiology features
- Medical document management (non-AI aspects)
- OCR service (still useful for general medical documents)

---

## 1. Python ML Dependencies

### 1.1 Requirements File
**File**: `requirements.txt` (root + server/)
**Purpose**: Pinned PyTorch + TorchXRayVision dependencies for CPU inference

```
# Deep Learning Framework (CPU-optimized)
torch==2.3.1
torchvision==0.18.1
torchxrayvision==1.5.5

# Numerical & Image Preprocessing
numpy==1.26.4
scikit-image==0.26.0
Pillow>=9.0.0,<11.0.0
scipy>=1.10.0,<1.13.0
```

**Action**: Remove torch, torchvision, torchxrayvision. Preserve numpy, Pillow, scipy (used by other services).

### 1.2 Python Version Configuration
**Files**:
- `.python-version` (root)
- `server/.python-version`
- Environment variable: `PYTHON_VERSION=3.11.10`

**Purpose**: Enforce Python 3.11 for PyTorch 2.3.1 compatibility

**Action**: Remove if no other Python dependencies require 3.11. Check OCR service requirements first.

### 1.3 Python Environment Provisioning
**File**: `server/src/scripts/setupPythonEnv.js`
**Purpose**: Install Python 3.11 + create .venv + install ML dependencies on Render build
**Called by**: `render.yaml` buildCommand

**Action**: REMOVE entirely. No longer needed after ML decoupling.

---

## 2. Python Inference Worker

### 2.1 Worker Implementation
**File**: `server/src/adapters/ChestXRayInferenceWorker.py`
**Size**: ~400 lines
**Purpose**: Loads TorchXRayVision ResNet50, runs inference, communicates via JSON-RPC

**Entry Point**: Spawned by `MedicalImageAnalyzer.js` as child process
**Dependencies**: torch, torchvision, torchxrayvision, skimage, numpy

**Action**: REMOVE. This will be replaced by ClaraMed API calls.

### 2.2 Worker Memory Test Script
**File**: `server/test_memory_measurement.py`
**Purpose**: Measure actual PyTorch memory usage (501MB peak)

**Action**: MOVE to `docs/archive/` for reference. Not needed in production.

---

## 3. Backend Node.js Integration Layer

### 3.1 Medical Image Analyzer Adapter
**File**: `server/src/adapters/MedicalImageAnalyzer.js`
**Purpose**: Spawns Python worker, manages JSON-RPC communication, handles mock/real inference modes

**Key Methods**:
- `initializeWorker()` - Spawns ChestXRayInferenceWorker.py child process
- `inferWithWorker(imagePath, language)` - Sends inference request to Python worker
- `analyzeImage(imageInput, options)` - Main entry point for chest X-ray analysis

**Dependencies**:
- `ChestXRayInferenceWorker.py` (spawned process)
- Python binary detection (`.venv/bin/python` or system python3)

**Callers**:
- `RadiologyAIService.processStudyWithInference()`

**Action**: REMOVE worker spawning logic. Replace with "ClaraMed integration pending" stub that returns status indicating ClaraMed is required.

### 3.2 Radiology AI Service
**File**: `server/src/services/RadiologyAIService.js`
**Purpose**: Orchestrates automatic radiology study processing (OCR + ML inference + Groq explanation)

**Key Methods**:
- `autoProcessRadiologyStudy()` - Triggered after upload
- `_runWithLock()` - Acquire lock, run analysis pipeline
- `processStudyWithInference()` - Calls MedicalImageAnalyzer for chest X-rays

**Dependencies**:
- `MedicalImageAnalyzer` (direct TorchXRayVision inference)
- `OCRAdapter` (Tesseract OCR - PRESERVE)
- `AIService` (Groq explanations - PRESERVE)
- `RadiologyRecord` model (PRESERVE)

**Action**: 
- Remove auto-processing trigger (autoProcessRadiologyStudy)
- Keep API endpoints for manual analysis requests (will be redirected to ClaraMed)
- Preserve record retrieval and status checking

### 3.3 Radiology Routes
**File**: `server/src/routes/radiologyRoutes.js`
**Purpose**: HTTP endpoints for radiology operations

**Key Endpoints**:
- `POST /api/radiology/upload-report` - Upload + auto-trigger AI analysis
- `GET /api/radiology/patient/:patientId` - Retrieve patient's radiology records
- `POST /api/radiology/:id/analyze-image` - Manual analysis trigger
- `GET /api/radiology/:id/ai-status` - Check AI analysis status
- `GET /api/radiology/ai-service-status` - Service health check

**Action**:
- PRESERVE upload endpoint (remove auto-analysis trigger)
- PRESERVE retrieval endpoints (existing records)
- REMOVE or stub manual analysis endpoints (will be ClaraMed's responsibility)
- UPDATE service status endpoint to report "ClaraMed integration required"

---

## 4. Frontend Radiology Components

### 4.1 Radiology Page
**File**: `client/src/pages/RadiologyPage.jsx`
**Size**: ~650 lines
**Purpose**: Patient-facing radiology dashboard (upload, view reports, AI analysis)

**Key Features**:
- Upload radiology images (chest X-ray, CT, MRI, etc.)
- Display existing radiology records
- Show AI analysis status and results
- Filter by modality, critical findings
- Poll for AI analysis completion

**Dependencies**:
- `radiologyService.uploadRadiologyReport()`
- `radiologyService.getPatientRadiologyRecords()`
- `radiologyService.getRadiologyAIStatus()`
- `RadiologyAIAnalyzer` component

**Action**: 
- REPLACE upload workflow with ClaraMed integration
- Add "Analyze with ClaraMed" button that navigates to ClaraMed (with auth handoff)
- PRESERVE existing record viewing and filtering
- Remove AI analysis polling (ClaraMed will handle this)

### 4.2 Radiology AI Analyzer Component
**File**: `client/src/components/RadiologyAIAnalyzer.jsx`
**Purpose**: Displays AI analysis results, findings, explanations

**Action**: PRESERVE for viewing existing AI analysis results. Update to show "Analyzed by ClaraMed" for new studies.

### 4.3 Radiology Service (Frontend)
**File**: `client/src/services/radiologyService.js`
**Purpose**: Frontend API client for radiology operations

**Key Methods**:
- `uploadRadiologyReport(data)` - PRESERVE
- `getPatientRadiologyRecords(patientId, filters)` - PRESERVE
- `analyzeRadiologyImage(radiologyId, options)` - STUB (ClaraMed will handle)
- `retryRadiologyAnalysis(radiologyId, options)` - STUB

**Action**:
- Keep retrieval methods
- Update analysis methods to return "ClaraMed integration required" message

---

## 5. Database Schema

### 5.1 RadiologyRecord Model
**File**: `server/src/models/RadiologyRecord.js`
**Purpose**: MongoDB schema for radiology records and AI analysis results

**Critical Fields to PRESERVE**:
- `patientId`, `encounterId`, `clinicalRecordId`
- `studyDate`, `reportDate`, `modalityType`, `bodyPart`
- `imageReference` (Cloudinary URLs)
- `aiAnalysis` (stores completed AI analysis results)
- `aiJob` (job recovery tracking)
- `verificationStatus`, `hasCriticalFindings`
- `ocrStatus`, `ocrData`

**Action**: PRESERVE entire model. ClaraMed will populate `aiAnalysis` fields via API callbacks.

### 5.2 Existing Database Records
**Databases**: MongoDB (production, staging, development)

**Action**: 
- DO NOT DELETE existing RadiologyRecord documents
- DO NOT DROP collections
- PRESERVE all completed AI analyses
- PRESERVE all uploaded images (Cloudinary)

---

## 6. TTS and Bhashini References

### 6.1 TTS Service
**File**: `server/src/services/TextToSpeechService.js`
**Status**: ON HOLD (not fully implemented)
**Dependencies**: PiperTTSAdapter, BhashiniTTSAdapter

**Action**: 
- LEAVE AS IS (already stubbed/mocked)
- Do not remove (may be used by other features)
- Do not configure new credentials

### 6.2 Piper TTS Adapter
**File**: `server/src/adapters/PiperTTSAdapter.js`
**Status**: Adapter exists, not actively used

**Action**: PRESERVE (unrelated to radiology AI)

### 6.3 Bhashini TTS Adapter
**File**: `server/src/adapters/BhashiniTTSAdapter.js`
**Status**: Adapter exists, not actively used

**Action**: PRESERVE (unrelated to radiology AI)

### 6.4 TTS Routes
**File**: `server/src/routes/ttsRoutes.js`
**Status**: Exists but not critical

**Action**: PRESERVE (may be used by other dashboard features)

---

## 7. OCR Services

### 7.1 OCR Adapter
**File**: `server/src/adapters/OCRAdapter.js`
**Purpose**: Wrapper for Tesseract OCR
**Used By**: 
- RadiologyAIService (extract text from PDF reports)
- MedicalReportAnalysisService (general medical documents)
- DocumentService (document text extraction)

**Action**: PRESERVE (still useful for non-radiology medical documents)

### 7.2 Tesseract OCR Adapter
**File**: `server/src/adapters/TesseractOCRAdapter.js`
**Dependencies**: `tesseract.js` (JavaScript library, NOT Python)

**Action**: PRESERVE (no Python dependency, useful for general OCR)

---

## 8. Render Deployment Configuration

### 8.1 Render YAML
**File**: `render.yaml`
**Current buildCommand**:
```yaml
buildCommand: npm install && node server/src/scripts/setupPythonEnv.js
```

**Action**: 
```yaml
buildCommand: npm install
# Remove Python environment setup entirely
```

### 8.2 Environment Variables (Render Dashboard)
**ML-Related Variables**:
- `PYTHON_VERSION=3.11.10` - REMOVE
- `MEDICAL_IMAGE_AI_ENABLED=true` - SET TO `false` or REMOVE
- `PIPER_TTS_ENABLED=false` - LEAVE AS IS (already disabled)

**To Preserve**:
- `NODE_ENV=staging`
- `PORT=5000`
- `JWT_SECRET`, `MONGODB_URI`, `GROQ_API_KEY` (authentication, DB, AI explanations)
- `CLOUDINARY_*` (file storage)

---

## 9. Dependencies That Must Wait for ClaraMed Integration

These features currently depend on the local ML inference and will need to be reconnected to ClaraMed:

### 9.1 Automatic AI Analysis After Upload
**Current**: `RadiologyAIService.autoProcessRadiologyStudy()` runs immediately after upload
**Future**: Upload to JeevaCare → Forward image URL to ClaraMed → ClaraMed processes → Callback to JeevaCare with results

### 9.2 Manual Analysis Retry
**Current**: `POST /api/radiology/:id/retry-ai` re-runs local inference
**Future**: Forward retry request to ClaraMed

### 9.3 Real-Time Analysis Status
**Current**: Frontend polls `/api/radiology/:id/ai-status` every 5 seconds
**Future**: ClaraMed webhook notifies JeevaCare when analysis complete

---

## 10. Unaffected Core Features (PRESERVE)

### 10.1 Authentication & Authorization
- JWT-based auth
- Role-based access control (PATIENT, DOCTOR, RADIOLOGY_TECHNICIAN, etc.)
- Hospital isolation
- Patient-doctor relationships

### 10.2 Healthcare Management
- Patient registration and profiles
- Doctor schedules and availability
- Appointment booking and management
- Hospital administration dashboards

### 10.3 Medical Records (Non-Radiology)
- Clinical records
- Laboratory results
- Discharge summaries
- Vaccinations
- Medical document uploads

### 10.4 Existing Radiology Features
- Radiology record metadata storage
- Patient-radiology associations
- Report retrieval and viewing
- Critical findings flagging
- Access permissions and audit logging

---

## 11. Test Files Requiring Updates

### 11.1 Radiology Tests
**Files**:
- `client/src/pages/RadiologyPage.test.jsx`
- `server/src/routes/radiologyRoutes.test.js`
- `server/src/routes/__tests__/radiology-e2e-integration.test.js`
- `server/src/routes/__tests__/multimodal-medical-analysis.test.js`

**Action**: Update to skip ML inference tests, focus on upload/retrieval/authorization

### 11.2 Service Tests
**Files**:
- `server/src/services/Phase7AITests.test.js`
- `server/src/services/Phase7IndependentVerification.test.js`

**Action**: Update to reflect ClaraMed architecture (stub AI analysis)

---

## 12. Documentation Requiring Updates

### 12.1 README
**File**: `README.md`
**Sections to Update**:
- Remove TorchXRayVision mentions
- Update architecture diagram (remove Python worker)
- Add ClaraMed reference

### 12.2 Technical Docs
**Files**:
- `docs/DEEP_LEARNING_SETUP.md` - ARCHIVE
- `docs/RENDER_MEMORY_AND_AI_AUDIT.md` - ARCHIVE
- `docs/RADIOLOGY_AI_ANALYSIS_FIX.md` - ARCHIVE
- `docs/ZERO_COST_TORCHXRAYVISION_FEASIBILITY.md` - ARCHIVE

**Action**: Move to `docs/archive/pre-claramed/` for historical reference

---

## 13. Deployment Verification Checklist

After cleanup, verify:

- ✅ Backend starts without Python dependencies installed
- ✅ Frontend builds successfully
- ✅ All backend tests pass (excluding ML-specific tests)
- ✅ All frontend tests pass
- ✅ Authentication and role-based access work
- ✅ Patient can view existing radiology records
- ✅ Patient can see existing AI analysis results
- ✅ Upload flow works (without triggering AI analysis)
- ✅ No broken imports or dead references
- ✅ No Python worker spawn errors in logs
- ✅ Render deployment succeeds without Python provisioning
- ✅ Application startup time improved (no ML model loading)
- ✅ Memory usage reduced (no PyTorch in memory)

---

## 14. Summary of Files to Modify/Remove

### Files to REMOVE:
1. `server/src/scripts/setupPythonEnv.js`
2. `server/src/adapters/ChestXRayInferenceWorker.py`
3. `server/test_memory_measurement.py`
4. `requirements.txt` (ML dependencies only)
5. `.python-version` (if OCR doesn't need it)

### Files to MODIFY:
1. `render.yaml` - Remove Python setup from buildCommand
2. `server/src/adapters/MedicalImageAnalyzer.js` - Remove worker spawning
3. `server/src/services/RadiologyAIService.js` - Remove auto-processing
4. `server/src/routes/radiologyRoutes.js` - Stub AI analysis endpoints
5. `client/src/pages/RadiologyPage.jsx` - Add ClaraMed entry point
6. `client/src/services/radiologyService.js` - Update analysis methods
7. `README.md` - Update architecture section
8. Test files - Update to reflect ClaraMed architecture

### Files to PRESERVE (No Changes):
1. `server/src/models/RadiologyRecord.js`
2. All authentication/authorization modules
3. All non-radiology medical record modules
4. OCR adapters (Tesseract)
5. TTS adapters (Piper, Bhashini)
6. Groq AI adapter (medical explanations)
7. Cloudinary adapter (file storage)
8. All hospital/patient/appointment modules

---

## Next Steps

1. ✅ Create this dependency map
2. ⏳ Execute cleanup (remove ML dependencies)
3. ⏳ Add ClaraMed integration placeholder
4. ⏳ Run test suite and verify
5. ⏳ Deploy to staging and test
6. ⏳ Document ClaraMed integration requirements
7. ⏳ Commit and push changes

---

**End of Dependency Map**

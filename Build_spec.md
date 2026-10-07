# JeevaCare — Complete Build Specification

**Project:** JeevaCare  
**Tagline:** One Life. One Health Journey.  
**Document:** `Build_spec.md`  
**Purpose:** Master implementation specification for Kiro  
**Target:** Complete academic prototype / demonstration-ready web application  
**Primary principle:** Build the complete JeevaCare system end-to-end from this specification. Do not reduce the project to a generic CRUD healthcare app.

---

## 0. KIRO EXECUTION DIRECTIVE

You are the primary implementation agent for JeevaCare.

Your task is to inspect the existing repository first, understand what already exists, and then implement the complete system described in this specification.

### Mandatory execution behavior

1. **Inspect before changing**
   - Inspect the repository structure.
   - Inspect existing source code, package files, environment files, database models, routes, components, tests and documentation.
   - Identify what is already implemented, partially implemented, broken, or missing.
   - Preserve useful existing work instead of unnecessarily rewriting it.

2. **Build end-to-end**
   - Implement frontend, backend, database models, authentication, authorization, dashboards, clinical workflows, documents, AI assistance, OCR/image-quality assistance, emergency mode, multilingual/audio presentation, audit logging, testing and deployment configuration.
   - Connect the frontend to real backend APIs.
   - Do not leave major screens as static mockups if the corresponding backend functionality can be implemented.

3. **Do not invent medical capabilities**
   - JeevaCare is a healthcare information and continuity platform.
   - AI is assistive only.
   - AI must not independently diagnose disease.
   - Image-quality assistance must not claim to perform autonomous radiology diagnosis.
   - Official clinical records must remain provider-controlled.

4. **Do not weaken security for convenience**
   - Enforce RBAC server-side.
   - Never trust frontend-only authorization.
   - Protect patient records by default.
   - Log sensitive access.
   - Validate ownership and patient identity before record access.
   - Never expose secrets in frontend code.

5. **Use graceful fallbacks**
   - If an external API key/service is unavailable, the application should still run in a clearly marked demo/development mode.
   - Use adapter/service interfaces so external providers can be configured through environment variables.
   - Do not hard-code API keys or credentials.

6. **Quality bar**
   - The UI must look like a serious healthcare product, not a generic college CRUD project.
   - Responsive desktop/mobile layouts are required.
   - Empty, loading, error, success and permission-denied states must be designed.
   - Forms require validation.
   - Destructive actions require confirmation.
   - Critical emergency information must be immediately visible.

7. **Testing**
   - Add and run unit, integration, API, RBAC, database, upload, emergency, AI, accessibility/usability and security-focused tests where practical.
   - Fix failures rather than simply documenting them.

8. **Documentation**
   - Maintain a clear README.
   - Document environment variables.
   - Document how to run frontend/backend.
   - Document database setup.
   - Document demo accounts/seed data.
   - Document external API configuration.
   - Document important security assumptions and limitations.

9. **No fake completion**
   - Never say a feature is complete if it is only a UI placeholder.
   - If a real external integration cannot be executed because credentials are unavailable, implement the integration boundary, mock/demo adapter and setup instructions.

---

# 1. PROJECT OVERVIEW

## 1.1 Product definition

JeevaCare is a secure lifelong healthcare platform designed around one core idea:

> A patient's medical history should remain a continuous health journey rather than becoming fragmented whenever the patient changes a hospital, city or healthcare provider.

JeevaCare maintains a chronological health journey containing healthcare events such as:

- Birth/neonatal information
- Vaccinations
- Consultations
- Diagnoses
- Medications
- Allergies
- Medical conditions
- Laboratory results
- Radiology information
- Surgeries and procedures
- Hospitalizations
- Discharge summaries
- Supporting medical documents

The system separates **visibility** from **authority**:

- Patients can view their healthcare information.
- Guardians can manage permitted access for minors.
- Verified healthcare providers create or verify official clinical records.
- Patients cannot directly edit or delete official provider-created clinical history.
- Patient-uploaded material can remain pending until reviewed.
- Every important access/change event should be auditable.

The platform has three major user-facing areas:

1. **Patient**
2. **Hospital / Healthcare Provider**
3. **Emergency**

Additional supporting roles include:

- Guardian
- Hospital administrator
- Doctor / authorized healthcare professional
- System administrator
- Security/compliance-oriented administrative functions

---

# 2. PROBLEM STATEMENT

Patients' medical records are scattered across different hospitals, cities and physical documents, making it difficult to maintain and access complete and reliable medical history, especially during emergencies.

The problem includes:

- Fragmented records across hospitals and locations
- Difficulty maintaining lifelong continuity
- Difficulty retrieving old reports
- Identity continuity problems
- Lack of clear record provenance
- Unclear verification status
- Authorization and access-control challenges
- Slow retrieval during emergencies
- Unconscious patients being unable to provide history
- Poor-quality photographs of physical medical documents
- Blur, glare, cropping and incorrect image orientation
- Long medical histories making critical information difficult to identify
- Difficulty understanding complex medical terminology
- Language/accessibility barriers

JeevaCare addresses these problems by maintaining a verified chronological health journey, separating official provider records from unverified uploads, and prioritizing relevant information during emergency access.

---

# 3. PROPOSED SOLUTION

JeevaCare provides a single secure platform where an authorized patient's healthcare journey can be organized chronologically.

### Core solution

1. Secure patient/guardian registration
2. Unique internal JeevaCare patient ID
3. Hospital/facility onboarding and verification
4. Authorized healthcare staff accounts
5. Provider-controlled medical record creation
6. Verification and provenance metadata
7. Lifelong chronological health timeline
8. Patient view access
9. Hospital clinical workspace
10. Emergency-focused critical information
11. AI-assisted medical history summary
12. Multilingual explanation
13. Optional audio presentation
14. Medical document/radiology image quality assistance
15. RBAC and least-privilege access
16. Detailed audit logging
17. Traceable amendments instead of silent overwrites

---

# 4. EXISTING SOLUTIONS AND THEIR GAPS

JeevaCare is not claiming that digital healthcare records do not exist.

Existing healthcare systems include:

- Hospital EHR/EMR systems
- Laboratory portals
- Diagnostic/radiology systems
- Pharmacy/prescription systems
- Physical medical documents
- Cloud storage/document storage
- Digital health initiatives and interoperable health ecosystems

The core gap JeevaCare explores is the **continuity and usability of the patient's complete lifelong health journey across authorized providers**, especially when the patient moves between locations or needs emergency treatment.

## 4.1 Identified gaps

### Gap 1 — Fragmented records
Healthcare information is distributed across multiple providers and documents.

### Gap 2 — Lack of a single lifelong timeline
Records may exist digitally but are not necessarily presented as one understandable chronological journey.

### Gap 3 — Emergency retrieval difficulty
A clinician may need to search through years of records before finding critical information.

### Gap 4 — Identity continuity
The system needs a reliable internal patient identity and duplicate prevention.

### Gap 5 — Record verification
Not every uploaded document should automatically be treated as an official clinical fact.

### Gap 6 — Provenance
Users should be able to understand who created/verified a record, which facility it belongs to and when it was recorded.

### Gap 7 — Authority vs visibility
Patients need visibility without being allowed to silently modify official provider-created clinical history.

### Gap 8 — Physical-document digitization quality
Photos of reports may be blurry, cropped, reflective or incorrectly oriented.

### Gap 9 — Information overload
A lifelong medical history can become too large to manually interpret quickly.

### Gap 10 — Language barrier
Medical records may contain terminology that patients find difficult to understand.

### Gap 11 — Accessibility
Some users benefit from simplified explanations and audio output.

### Gap 12 — Emergency prioritization
Emergency workflows should show the information most relevant to immediate care before the entire record.

### Gap 13 — Auditability
Sensitive medical information requires traceable access and changes.

### Gap 14 — Wrong-patient risk
A healthcare system must never casually attach one person's medical history to another person.

### Gap 15 — Traceable amendments
Historical information should not be silently overwritten.

---

# 5. AIM

To design and develop a secure lifelong healthcare platform that maintains a verified, chronological patient health journey and enables authorized healthcare professionals to access relevant medical information efficiently.

---

# 6. OBJECTIVES — 15 IMPLEMENTATION OBJECTIVES

## Objective 1 — Secure authentication
Provide secure role-based registration, login and session management.

## Objective 2 — Unique patient identity
Create a unique internal JeevaCare patient profile and identifier.

## Objective 3 — Guardian management
Support guardian-managed access for minors and transition toward independent adult access.

## Objective 4 — Lifelong timeline
Maintain a chronological health timeline across life stages and healthcare events.

## Objective 5 — Verified healthcare providers
Allow verified healthcare facilities and authorized professionals to create official records.

## Objective 6 — Comprehensive clinical records
Support vaccination, consultation, diagnosis, medication, surgery, laboratory, radiology, hospitalization and discharge information.

## Objective 7 — Verification and provenance
Maintain source, author, facility, timestamp, verification state and amendment information.

## Objective 8 — Emergency access
Provide authorized emergency users with prioritized critical information after approved patient identification and professional authentication.

## Objective 9 — AI-assisted medical summary
Generate concise summaries from existing medical records without inventing information or diagnosing disease.

## Objective 10 — Multilingual explanation
Provide simplified presentation of healthcare information in exactly these supported languages: English, Hindi, Kannada, Telugu, Tamil, and Malayalam.

## Objective 11 — Audio accessibility
Provide optional audio-ready/text-to-speech presentation of suitable summaries and explanations.

## Objective 12 — Document/image quality assistance
Detect basic quality issues in manually captured medical documents and radiology images, including blur, glare, cropping, visibility and orientation.

## Objective 13 — Patient visibility without clinical authority
Allow patients to view official records while preventing direct editing/deletion of provider-created clinical facts.

## Objective 14 — Security and auditability
Implement RBAC, least privilege, encryption practices, secure storage, access logging and audit trails.

## Objective 15 — Record integrity and continuity
Maintain reliable relationships between patient, encounter, provider, facility and medical event while preserving amendment history instead of silently overwriting historical records.

---

# 7. TECHNOLOGY STACK

Use the following stack unless the existing repository makes an equivalent implementation technically necessary.

## Frontend

- React.js
- Tailwind CSS
- React Router
- Modern component architecture
- Responsive design
- Accessible UI components
- API service layer

## Backend

- Node.js
- Express.js
- REST API
- Middleware-based authentication/authorization
- Input validation
- Error handling

## Database

- MongoDB
- Mongoose or equivalent MongoDB ODM
- Indexed identifiers and commonly queried fields

## Authentication

- JWT
- OTP-based verification where configured
- Password hashing using a secure password hashing algorithm
- Role-based authorization
- Secure session/token handling

## File storage

- Cloudinary
- Secure document/image references
- Metadata stored in MongoDB
- Do not store sensitive files directly in public frontend assets

## AI

- Python service or backend AI adapter
- Configurable AI API provider
- AI-assisted medical-history summarization
- Translation/simplification
- Audio-ready output
- Strict source grounding

## OCR

- Tesseract OCR
- Extract text from uploaded medical documents where appropriate
- OCR output must be treated as extracted/unverified data until reviewed
- OCR must not automatically become official clinical history

## Security

- RBAC
- Encryption in transit
- Secure storage practices
- Least privilege
- Audit logs
- Rate limiting
- Input validation
- Secure secret management

## Deployment

- Vercel — frontend
- Render — backend/API
- MongoDB hosted environment
- Cloudinary
- Configurable AI API

---

# 8. HIGH-LEVEL ARCHITECTURE

Implement a modular architecture:

```text
                    ┌─────────────────────────┐
                    │       React Frontend    │
                    │   Tailwind + Router     │
                    └────────────┬────────────┘
                                 │ HTTPS / REST
                    ┌────────────▼────────────┐
                    │     Express Backend     │
                    │ Auth / RBAC / APIs      │
                    └────────────┬────────────┘
                                 │
       ┌─────────────────────────┼─────────────────────────┐
       │                         │                         │
┌──────▼──────┐          ┌───────▼────────┐        ┌──────▼──────┐
│   MongoDB   │          │ Cloudinary     │        │ AI Service  │
│ Clinical DB │          │ Documents      │        │ Summary     │
└─────────────┘          └────────────────┘        └──────┬───────┘
                                                         │
                                                  ┌──────▼──────┐
                                                  │ Tesseract   │
                                                  │ OCR / Image │
                                                  └─────────────┘
```

Logical layers:

1. Presentation layer
2. Authentication layer
3. Authorization/RBAC layer
4. Application/business layer
5. Clinical data layer
6. Document layer
7. AI/OCR layer
8. Audit/security layer

---

# 9. USER ROLES

Implement role-based access.

## 9.1 Patient

Can:

- Register/login
- View profile
- View JeevaCare ID
- View health timeline
- View vaccinations
- View allergies/alerts
- View diagnoses/conditions
- View medications
- View consultations
- View lab results
- View radiology records
- View surgeries/procedures
- View discharge summaries
- Upload personal historical documents
- See verification status
- Request/review appropriate information
- Generate AI-assisted summaries
- Select language
- Use audio presentation
- View access history where permitted

Cannot:

- Edit official provider-created clinical facts
- Delete official provider-created records
- Change provider provenance
- Mark an unverified record as provider verified

## 9.2 Guardian

Can:

- Manage permitted access for a minor
- View the minor's records within authorized scope
- Manage permitted profile/access actions
- Transition access when the patient reaches the configured independent-access state

Cannot:

- Modify official provider-created clinical facts

## 9.3 Hospital Administrator

Can:

- Register/onboard hospital
- Submit organization information
- Manage facility profile
- Manage authorized staff
- Assign permitted roles
- Review staff access
- Support facility verification workflow

Cannot:

- Arbitrarily modify patient clinical facts without authorized clinical role

## 9.4 Doctor / Healthcare Professional

Can:

- Securely authenticate
- Search/identify authorized patients
- View relevant patient history
- Create clinical encounters
- Add diagnoses
- Add medications
- Add consultations
- Add vaccinations
- Add procedures/surgeries
- Add lab results
- Add radiology information
- Add discharge summaries
- Verify eligible uploaded documents
- Amend records through traceable amendments
- View AI-assisted summary
- Use emergency access when authorized

## 9.5 Emergency Healthcare Professional

Can:

- Authenticate
- Perform approved patient identification
- Request/use emergency access
- View prioritized critical information
- Open relevant detailed history
- Have every emergency access event audited

## 9.6 System Administrator

Can:

- Manage technical configuration
- Manage users/facility verification workflows
- Monitor security/audit events
- Manage system configuration

Must not silently alter clinical facts.

---

# 10. PATIENT IDENTITY AND UNIQUENESS

Create an internal unique JeevaCare patient identifier.

Requirements:

- Unique identifier
- Stable throughout the patient's JeevaCare journey
- Never expose database internal IDs unnecessarily
- Identity verification workflow
- Duplicate detection
- Search/matching safeguards
- Audit trail for identity linking
- Confirmation before attaching records
- No automatic guessing of patient identity in emergency scenarios

### Important

Aadhaar must **not** be treated as a mandatory technical dependency for the academic prototype.

The prototype should use an approved identity-verification abstraction and can use demo identity verification data.

---

# 11. HOSPITAL ONBOARDING

Hospital onboarding must include:

- Hospital/facility name
- Registration/license information
- Address/contact details
- Facility type
- Verification status
- Admin account
- Staff accounts
- Staff roles
- Department information where useful
- Account status
- Audit events

Verification states may include:

- Pending
- Verified
- Suspended
- Rejected

Only verified facilities and appropriately authorized staff should be able to create official provider records.

---

# 12. CLINICAL RECORD SYSTEM

Create a flexible but structured clinical record architecture.

## Encounter fields

At minimum:

- Patient
- Hospital/facility
- Provider
- Encounter date/time
- Encounter type
- Reason for visit
- Clinical observations
- Diagnoses/conditions
- Medications
- Procedures
- Laboratory results
- Radiology references
- Discharge information
- Follow-up information
- Verification status
- Created timestamp
- Updated timestamp

## Medical record categories

Support:

- Birth/neonatal
- Vaccination
- Consultation
- Diagnosis
- Medication
- Allergy
- Chronic condition
- Surgery
- Procedure
- Hospitalization
- Laboratory
- Radiology
- Discharge
- Supporting document

---

# 13. RECORD VERIFICATION AND PROVENANCE

Every medical record should preserve:

- Source
- Author/provider
- Facility
- Created timestamp
- Verification status
- Amendment history
- Supporting document reference where applicable

Recommended verification states:

- `PROVIDER_VERIFIED`
- `PATIENT_UPLOADED`
- `PENDING_REVIEW`
- `AMENDED`
- `RESTRICTED`

### Rules

- Patient uploads start as unverified/pending.
- Authorized providers can review and verify appropriate material.
- Verification must be auditable.
- Historical records should not be silently overwritten.
- Amendments create traceable history.

---

# 14. LIFELONG HEALTH TIMELINE

The timeline is one of the central features.

Display healthcare events chronologically.

Filters:

- Date range
- Hospital/facility
- Event type
- Verification status
- Provider
- Life stage where available

Life-stage examples:

- Birth/neonatal
- Infancy
- Childhood
- Adolescence
- Young adulthood
- Adulthood
- Later life

Each event card should show:

- Date
- Event category
- Short description
- Facility
- Provider
- Verification badge
- Expand/view action
- Supporting document link where available

---

# 15. PATIENT DASHBOARD

The Patient Dashboard must be polished and clinically understandable.

## Main sections

### Header

- JeevaCare branding
- Patient name
- JeevaCare ID
- Profile/avatar
- Notification/status area
- Language selector
- User menu

### Critical summary area

Show:

- Allergies
- Critical conditions
- Blood group if verified/available
- Current medications
- Important alerts

### Dashboard cards

- Health timeline
- Vaccinations
- Conditions
- Allergies
- Medications
- Consultations
- Laboratory
- Radiology
- Surgeries/procedures
- Discharge summaries
- Documents
- AI summary

### Timeline

Large central timeline showing lifelong healthcare journey.

### AI Summary

Button/action:

> Generate Health Summary

Summary must clearly indicate it is AI-assisted and source-linked.

### Accessibility

- Language selection
- Audio/read-aloud
- Clear typography
- Strong contrast
- Keyboard accessibility

---

# 16. HOSPITAL DASHBOARD

The Hospital Dashboard should feel like a clinical workspace.

## Sections

- Hospital overview
- Staff/account management
- Patient search
- Patient identification
- Patient summary
- Relevant history
- New encounter
- Consultation entry
- Diagnosis
- Medication
- Vaccination
- Procedure/surgery
- Lab result
- Radiology
- Document upload
- Discharge summary
- Verification queue
- Amendments
- Audit/access history

### Patient search safety

Do not attach records based solely on an ambiguous name.

Use appropriate matching attributes and require confirmation before clinical record attachment.

---

# 17. EMERGENCY DASHBOARD

This is a flagship feature.

The interface must prioritize speed and relevance.

## Critical information

Display prominently:

1. Critical allergies
2. Verified blood group if available
3. Current medications
4. Major known conditions
5. Important previous surgeries
6. Recent hospitalizations
7. Relevant recent investigations

The user should be able to open:

> View Full Health History

after reviewing the emergency summary.

## Visual requirements

- Emergency mode must look visually distinct.
- Critical information must be scannable within seconds.
- Avoid excessive decoration.
- Use clear severity/status indicators.
- Do not hide critical alerts inside tabs.
- Show verification status for sensitive information.

---

# 18. EMERGENCY ACCESS WORKFLOW

```text
Emergency occurs
       ↓
Hospital attempts approved patient identification
       ↓
Healthcare professional authenticates
       ↓
System verifies role + emergency permission
       ↓
Emergency access event is logged
       ↓
Critical emergency summary displayed
       ↓
Relevant detailed history available
       ↓
Access remains auditable
```

### Safety rule

If an unconscious patient cannot be reliably identified, JeevaCare must **not guess the patient's identity**.

Emergency treatment continues under appropriate clinical protocols while identification is established.

---

# 19. AI-ASSISTED MEDICAL HISTORY SUMMARY

The AI layer must summarize existing records only.

## Possible summary sections

- Major previous conditions
- Important allergies
- Current/recent medications
- Previous surgeries
- Recent hospitalizations
- Important investigations
- Clinically relevant events
- Follow-up items clearly present in source records

## AI safety requirements

The AI must:

- Use only supplied patient records as the source
- Preserve links to source records
- Avoid inventing facts
- Indicate missing/uncertain information
- Never fabricate medication
- Never fabricate diagnosis
- Never fabricate surgery
- Never claim certainty when source information is uncertain
- State that the summary is assistive
- Never replace professional clinical judgment

### Recommended AI pipeline

```text
Authorized request
      ↓
Fetch authorized patient records
      ↓
Normalize structured records
      ↓
Select relevant source records
      ↓
Send grounded context to AI service
      ↓
Generate structured summary
      ↓
Validate response
      ↓
Attach source references
      ↓
Display summary
```

---

# 20. MULTILINGUAL AND AUDIO ACCESSIBILITY

Implement presentation-layer accessibility.

Features:

- Language selector
- Simplified explanations
- AI-assisted translation where configured
- Text-to-speech/audio-ready output
- Preserve original clinical record unchanged

Important rule:

> Translation is a presentation layer. It must never overwrite the original clinical source.

---

# 21. DOCUMENT AND RADIOLOGY UPLOAD ASSISTANT

The feature is an **upload-quality assistant**, not a radiology diagnosis engine.

## Input

- Camera image
- Uploaded image
- Medical document
- Radiology image/document

## Checks

- Blur
- Glare
- Cropping
- Visibility
- Orientation
- Basic readability
- OCR extraction where applicable

## User feedback examples

- "Image appears blurry. Hold the camera steady and retake."
- "Glare is obscuring part of the document. Move away from direct light."
- "Document edges are cropped. Capture the entire page."
- "Image orientation appears incorrect. Rotate the document."

## Flow

```text
Capture/upload
      ↓
Image quality analysis
      ↓
Orientation analysis
      ↓
OCR if applicable
      ↓
User correction/confirmation
      ↓
Upload
      ↓
Patient-uploaded / Pending Review
      ↓
Provider verification if applicable
```

---

# 22. OCR

Use Tesseract where appropriate.

OCR output must be:

- Clearly marked as extracted text
- Reviewable by the user/provider
- Associated with the original document
- Not automatically treated as verified clinical fact

OCR can assist with:

- Report title
- Date
- Patient name
- Lab values
- Prescription text
- Provider/facility information

Any extraction uncertainty should remain visible.

---

# 23. DOCUMENT STORAGE

Use Cloudinary or configured secure file storage.

Store metadata in MongoDB.

Document metadata should include:

- Patient
- Uploaded by
- Source type
- Category
- File reference
- Upload timestamp
- Verification status
- Provider/facility if applicable
- OCR status
- Quality status
- Access restrictions

Do not expose sensitive files through unrestricted public URLs if the storage configuration allows private/controlled access.

---

# 24. DATABASE MODEL

Implement at minimum:

- `Patient`
- `GuardianRelationship`
- `Hospital`
- `User`
- `Encounter`
- `ClinicalRecord`
- `Vaccination`
- `LaboratoryResult`
- `RadiologyRecord`
- `Document`
- `AuditEvent`

Additional supporting collections/models may be introduced where they improve integrity.

## Important relationships

```text
Patient
 ├── GuardianRelationship
 ├── Encounter
 │    └── ClinicalRecord
 ├── Vaccination
 ├── LaboratoryResult
 ├── RadiologyRecord
 ├── Document
 └── AuditEvent

Hospital
 └── Users / Providers

User
 └── Provider / Staff identity
```

---

# 25. DATABASE INTEGRITY

The database must preserve relationships between:

- Patient
- Encounter
- Provider
- Hospital
- Medical event
- Document
- Verification
- Audit event

Every relevant clinical record should have:

- Unique ID
- Patient reference
- Provider reference
- Facility reference
- Timestamp
- Verification status
- Amendment history

### Never silently overwrite important historical clinical information.

Use amendments/versioning where appropriate.

---

# 26. REST API REQUIREMENTS

Create clean API modules.

Suggested route groups:

```text
/api/auth
/api/patients
/api/guardians
/api/hospitals
/api/users
/api/providers
/api/encounters
/api/records
/api/vaccinations
/api/labs
/api/radiology
/api/documents
/api/timeline
/api/emergency
/api/ai
/api/ocr
/api/audit
/api/admin
```

All protected routes must enforce authorization server-side.

---

# 27. AUTHENTICATION

Implement:

- Registration
- Login
- Logout/session invalidation strategy
- Password hashing
- JWT authentication
- OTP verification where configured
- Role enforcement
- Account status checks
- Rate limiting for authentication endpoints
- Secure token handling

Do not place sensitive tokens/secrets in unsafe client-side storage unless there is a strong documented reason.

---

# 28. RBAC

Permissions should be granular.

Example:

```text
PATIENT
  VIEW_OWN_RECORDS
  UPLOAD_DOCUMENT
  GENERATE_SUMMARY
  VIEW_ACCESS_HISTORY

GUARDIAN
  VIEW_MINOR_RECORDS
  MANAGE_MINOR_ACCESS

DOCTOR
  VIEW_AUTHORIZED_PATIENT
  CREATE_CLINICAL_RECORD
  VERIFY_DOCUMENT
  CREATE_AMENDMENT
  VIEW_AI_SUMMARY

EMERGENCY_DOCTOR
  EMERGENCY_ACCESS
  VIEW_CRITICAL_INFO
  VIEW_RELEVANT_HISTORY

HOSPITAL_ADMIN
  MANAGE_STAFF
  MANAGE_FACILITY

SYSTEM_ADMIN
  MANAGE_TECHNICAL_CONFIGURATION
  VIEW_SECURITY_AUDIT
```

Implement authorization at API/service level.

---

# 29. AUDIT LOGGING

Create an audit event for sensitive actions.

Examples:

- Login
- Failed login
- Patient record access
- Emergency access
- Clinical record creation
- Clinical record amendment
- Document upload
- Document verification
- AI summary generation
- Permission changes
- Staff role changes
- Hospital verification
- Identity linking

Audit events should capture appropriate metadata such as:

- Actor
- Role
- Patient/resource
- Action
- Timestamp
- Result/status
- Relevant request/context metadata

Avoid storing unnecessary sensitive content inside audit logs.

---

# 30. SECURITY REQUIREMENTS

Security is a core product feature.

Implement:

- HTTPS-ready deployment
- Password hashing
- JWT validation
- RBAC
- Least privilege
- Input validation
- Request validation
- Rate limiting
- CORS configuration
- Secure headers
- Secure environment variables
- File upload restrictions
- File type validation
- File size limits
- Audit logging
- Access checks
- Error handling without sensitive leakage
- Backup/recovery considerations
- Dependency/security review

Never:

- Hard-code secrets
- Commit API keys
- Trust role information sent by the frontend
- Return unrestricted patient data from generic endpoints
- Let a patient edit official provider records
- Guess patient identity

---

# 31. UI / UX DESIGN REQUIREMENTS

This is a **major requirement**, not an optional polish step.

JeevaCare must not look like a basic college CRUD application.

## Design direction

The UI should communicate:

- Trust
- Security
- Healthcare
- Continuity
- Clarity
- Calmness
- Professionalism

## Visual characteristics

- Modern healthcare SaaS aesthetic
- Clean cards
- Strong hierarchy
- Excellent spacing
- Consistent typography
- Professional icons
- Clear badges
- Subtle motion
- Responsive layout
- Accessible contrast
- Clear empty states
- Clear error states
- Loading skeletons
- Toast/inline feedback where appropriate

Avoid:

- Overly flashy gradients
- Excessive animations
- Cluttered dashboards
- Tiny text
- Generic admin-template appearance
- Excessive decorative elements in emergency mode

## Navigation

Use clear role-specific navigation.

### Patient

- Overview
- Health Timeline
- Records
- Medications
- Vaccinations
- Labs
- Radiology
- Documents
- AI Summary
- Access History
- Profile

### Hospital

- Dashboard
- Patients
- Encounters
- Clinical Records
- Documents
- Verification
- Staff
- Audit

### Emergency

- Patient Identification
- Emergency Summary
- Critical Alerts
- Relevant History
- Full History
- Access Log

---

# 32. REQUIRED UI STATES

Every important page/component should support:

- Loading
- Empty
- Success
- Error
- Unauthorized
- Forbidden
- Not found
- Offline/network failure where practical
- Form validation errors
- Upload progress
- Processing state
- AI generation state

---

# 33. RESPONSIVE DESIGN

The system must work on:

- Desktop
- Laptop
- Tablet
- Mobile

Prioritize mobile usability for patient-facing screens.

Emergency interface should remain usable on smaller screens without hiding critical information.

---

# 34. CORE USER FLOWS

## Flow A — Patient registration

```text
Landing page
→ Register
→ Identity information
→ Verification
→ Account creation
→ JeevaCare ID generation
→ Profile setup
→ Dashboard
```

## Flow B — Guardian/minor

```text
Guardian account
→ Add/link minor
→ Relationship verification
→ Authorized access
→ Minor health timeline
```

## Flow C — Hospital onboarding

```text
Hospital registration
→ Organization details
→ License/registration details
→ Verification
→ Hospital account
→ Staff management
```

## Flow D — Doctor creates record

```text
Doctor login
→ Patient identification
→ Confirm patient
→ View relevant history
→ New encounter
→ Clinical information
→ Save
→ Provider verification
→ Timeline update
→ Audit event
```

## Flow E — Patient uploads old report

```text
Patient
→ Upload document
→ Quality check
→ OCR where applicable
→ Preview/extracted data
→ Confirm
→ Upload
→ PATIENT_UPLOADED / PENDING_REVIEW
→ Provider can review
```

## Flow F — Provider verifies document

```text
Doctor
→ Verification queue
→ Open document
→ Review
→ Verify / reject / restrict
→ Audit event
→ Verification status updated
```

## Flow G — AI summary

```text
Authorized user
→ Generate summary
→ Retrieve authorized records
→ Normalize context
→ AI service
→ Validate response
→ Source links
→ Summary displayed
```

## Flow H — Emergency

```text
Emergency
→ Patient identification
→ Professional authentication
→ Permission check
→ Emergency access logged
→ Critical summary
→ Relevant history
→ Full history if required
```

---

# 35. AI GUARDRAILS

Implement explicit system prompts and validation rules.

The AI must be told:

- Do not diagnose.
- Do not infer unsupported conditions.
- Do not invent medication.
- Do not invent allergies.
- Do not invent surgeries.
- Do not invent test results.
- Use only supplied records.
- Say when information is missing.
- Preserve uncertainty.
- Cite/link source records where possible.
- Do not modify source records.

If AI output fails validation, show a safe error or request regeneration instead of presenting unsupported information as fact.

---

# 36. IMAGE-QUALITY GUARDRAILS

The image assistant should:

- Detect obvious quality problems
- Give actionable capture instructions
- Avoid claiming medical interpretation
- Avoid claiming a scan is clinically normal/abnormal
- Avoid diagnosing disease from radiology images

The feature is about **document/image usability**, not clinical diagnosis.

---

# 37. NOTIFICATION / FEEDBACK SYSTEM

Implement appropriate feedback for:

- Record successfully created
- Document uploaded
- Verification completed
- Verification rejected
- AI summary generated
- Upload quality failure
- Unauthorized access attempt
- Permission changes
- Important account/security events

---

# 38. SEARCH AND FILTERING

Implement efficient search.

Patient search:

- JeevaCare ID
- Name
- Approved matching attributes
- Other non-sensitive demo identifiers where configured

Timeline filters:

- Date
- Category
- Facility
- Provider
- Verification status

Never make ambiguous search results silently attach to a patient.

---

# 39. PERFORMANCE REQUIREMENTS

Optimize for:

- Fast dashboard loading
- Paginated long timelines
- Lazy-loaded documents
- Efficient MongoDB indexes
- Minimal unnecessary API calls
- Image compression/optimization where appropriate
- Loading states
- AI request feedback
- Upload progress

The emergency summary should load the prioritized information without requiring the entire medical history to be rendered first.

---

# 40. TESTING STRATEGY

Implement tests covering:

## Unit tests

- Validation
- Permissions
- Patient identity matching
- Timeline sorting
- Verification state transitions
- AI response validation
- Image-quality logic

## Integration tests

- Authentication
- Registration
- Patient creation
- Hospital onboarding
- Clinical record creation
- Document upload
- Verification
- Timeline retrieval
- Emergency access
- AI summary

## Security/RBAC tests

Explicitly test:

- Patient cannot access another patient's records
- Patient cannot edit provider records
- Patient cannot delete provider records
- Doctor cannot access unauthorized patients
- Unverified hospital staff cannot create official records
- Emergency access requires correct permission
- Audit logs are created
- Role escalation is blocked

## Edge cases

- Duplicate patient
- Wrong patient selection
- Missing patient
- Expired token
- Invalid role
- Poor image
- Unsupported file type
- Large file
- AI service unavailable
- OCR unavailable
- Cloudinary unavailable
- Database unavailable
- Empty medical history
- Conflicting historical information

---

# 41. SEED / DEMO DATA

Create realistic but fictional demo data.

Do not use real patient data.

Recommended demo users:

### Patient
- Fictional patient
- Complete sample timeline
- Vaccinations
- Allergies
- Medications
- Conditions
- Labs
- Radiology
- Surgery
- Documents

### Doctor
- Fictional verified doctor
- Associated with fictional verified hospital

### Emergency doctor
- Emergency access permission

### Hospital admin
- Staff management permissions

### Guardian
- Linked to fictional minor patient

The demo dataset should make the dashboards visually meaningful immediately after setup.

---

# 42. SAMPLE EMERGENCY DATA

The demo emergency profile should contain clearly visible examples such as:

- Critical allergy
- Verified blood group
- Current medication
- Major condition
- Previous surgery
- Recent hospitalization
- Recent lab/investigation

All data must be fictional.

---

# 43. ERROR HANDLING

Create a consistent backend error format.

Frontend should translate errors into human-readable messages.

Never expose:

- Stack traces
- Secrets
- Database credentials
- Internal implementation details
- Sensitive patient data in generic errors

---

# 44. ENVIRONMENT CONFIGURATION

Create `.env.example`.

Expected categories:

```text
NODE_ENV=
PORT=
MONGODB_URI=
JWT_SECRET=
JWT_EXPIRES_IN=

OTP_PROVIDER=
OTP_API_KEY=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

AI_API_KEY=
AI_API_URL=
AI_MODEL=

OCR_ENABLED=
TESSERACT_PATH=

CLIENT_URL=
CORS_ORIGIN=
```

Use the actual variable names chosen by the implementation, but document every one.

Never commit real credentials.

---

# 45. DEPLOYMENT

## Frontend

Deploy to Vercel.

Requirements:

- Production build works
- Environment variables configured
- API base URL configurable
- SPA routing correctly configured

## Backend

Deploy to Render.

Requirements:

- Production start command
- Environment variables
- CORS configuration
- Health endpoint
- Logging
- Graceful error handling

## Database

Use MongoDB hosted deployment/configuration.

## Storage

Use Cloudinary or configured secure document storage.

## AI

Use configurable AI API.

## OCR

Ensure OCR service/path is documented for deployment environment.

---

# 46. HEALTH CHECK

Implement:

```text
GET /api/health
```

Response should indicate:

- Application status
- API status
- Database connectivity status
- Version/build information where appropriate

Do not expose secrets.

---

# 47. ACCESSIBILITY

Implement:

- Semantic HTML
- Keyboard navigation
- Accessible labels
- Focus states
- Contrast
- Screen-reader-friendly buttons
- Form error association
- Meaningful status indicators
- Avoid color-only meaning
- Responsive text sizing

Emergency alerts must not rely only on color.

---

# 48. SCOPE — MUST IMPLEMENT

### In scope

- Patient workflow
- Guardian workflow
- Hospital workflow
- Doctor workflow
- Emergency workflow
- Lifelong medical timeline
- Provider-controlled clinical records
- Patient view-only official records
- Document upload
- Radiology/document upload assistance
- OCR
- AI medical history summary
- Multilingual presentation
- Audio presentation
- Emergency-focused information
- RBAC
- Audit logging
- Verification status
- Record provenance
- Traceable amendments
- Security controls
- Responsive UI
- Testing
- Deployment configuration

---

# 49. OUT OF SCOPE — DO NOT BUILD AS CLAIMED FEATURES

Do not represent the following as implemented capabilities:

1. Independent AI medical diagnosis
2. Autonomous radiology diagnosis
3. Replacing a doctor's clinical judgment
4. Patient editing/deleting official clinical records
5. Automatic access to every hospital/country without integration and authorization
6. Automatic identity guessing for unconscious patients
7. Birth certificate generation
8. Death certificate generation
9. Real-world clinical deployment without privacy/legal/clinical validation

---

# 50. DESIGN PRINCIPLES

The implementation must follow:

### Lifelong continuity
The record follows the patient's health journey.

### Provider accountability
Official clinical information is created/verified by authorized providers.

### Patient visibility
Patients can understand and view their health information.

### Least privilege
Users only receive access required for their role.

### Emergency first
Critical information is prioritized when time matters.

### Provenance
Users can understand where information came from.

### Traceability
Important access and changes are recorded.

### Safety
The system must minimize wrong-patient attachment and unsupported AI output.

### Usability
Healthcare information must be understandable and accessible.

---

# 51. INFORMATION HIERARCHY

The UI should prioritize information based on context.

## Patient context

```text
Critical alerts
↓
Current health state
↓
Recent activity
↓
Timeline
↓
Historical records
↓
Documents
```

## Doctor context

```text
Critical information
↓
Current medications/conditions
↓
Recent encounters
↓
Relevant investigations
↓
AI summary
↓
Full timeline
```

## Emergency context

```text
Critical allergies
↓
Blood group
↓
Current medication
↓
Major conditions
↓
Previous surgeries
↓
Recent hospitalization/investigation
↓
Relevant detailed history
```

---

# 52. COMPONENT REQUIREMENTS

Create reusable UI components where appropriate:

- Navbar
- Sidebar
- DashboardCard
- CriticalAlert
- VerificationBadge
- Timeline
- TimelineEvent
- RecordCard
- MedicalRecordViewer
- PatientIdentityCard
- SearchPatient
- UploadDropzone
- UploadQualityResult
- OCRPreview
- AI SummaryCard
- LanguageSelector
- AudioButton
- Modal
- ConfirmationDialog
- Toast
- EmptyState
- ErrorState
- LoadingSkeleton
- AccessLogTable
- EmergencySummary
- MedicationList
- AllergyList
- LabResultCard
- RadiologyCard
- DocumentCard

---

# 53. PAGES / ROUTES

At minimum implement:

## Public

- `/`
- `/about`
- `/login`
- `/register`
- `/verify`

## Patient

- `/patient`
- `/patient/profile`
- `/patient/timeline`
- `/patient/records`
- `/patient/vaccinations`
- `/patient/medications`
- `/patient/labs`
- `/patient/radiology`
- `/patient/documents`
- `/patient/ai-summary`
- `/patient/access-history`

## Guardian

- `/guardian`
- `/guardian/minors/:id`

## Hospital

- `/hospital`
- `/hospital/patients`
- `/hospital/patients/:id`
- `/hospital/encounters`
- `/hospital/records`
- `/hospital/documents`
- `/hospital/verification`
- `/hospital/staff`
- `/hospital/audit`

## Emergency

- `/emergency`
- `/emergency/identify`
- `/emergency/patient/:id`
- `/emergency/patient/:id/history`

## Admin

- `/admin`
- `/admin/hospitals`
- `/admin/users`
- `/admin/audit`

---

# 54. API RESPONSE PRINCIPLES

APIs should:

- Return only authorized fields
- Use consistent status codes
- Validate input
- Paginate large collections
- Avoid N+1 database patterns
- Return useful error messages
- Never leak sensitive implementation details

For patient history endpoints, support filtering and pagination.

---

# 55. DATA CONSISTENCY RULES

When creating a clinical record:

1. Confirm authenticated provider.
2. Confirm provider role.
3. Confirm facility association.
4. Confirm facility status.
5. Confirm patient identity.
6. Validate clinical payload.
7. Save record.
8. Add provenance metadata.
9. Add verification status.
10. Create audit event.
11. Update timeline indexing/derived data if used.

---

# 56. EMERGENCY ACCESS CONSISTENCY RULES

Before showing emergency data:

1. Authenticate healthcare professional.
2. Validate emergency role/permission.
3. Identify patient through approved workflow.
4. Confirm identity.
5. Create audit event.
6. Fetch only authorized emergency information.
7. Display emergency summary.
8. Permit relevant detail access.
9. Log subsequent sensitive access.

---

# 57. AI DATA CONSISTENCY RULES

Before AI request:

1. Authenticate user.
2. Authorize patient access.
3. Fetch permitted records.
4. Normalize records.
5. Remove unnecessary sensitive information from the prompt where possible.
6. Send only authorized source context.
7. Generate summary.
8. Validate response.
9. Associate source references.
10. Display uncertainty.
11. Log AI summary generation.

---

# 58. IMPLEMENTATION PRIORITY

If implementation must be sequenced internally, use:

### Priority 1 — Foundation
- Repository inspection
- Architecture
- Database
- Authentication
- RBAC
- Core UI shell

### Priority 2 — Patient
- Registration
- Profile
- JeevaCare ID
- Timeline
- Records
- Documents

### Priority 3 — Hospital
- Hospital verification
- Staff
- Patient identification
- Clinical records
- Verification

### Priority 4 — Emergency
- Emergency authentication
- Identification
- Emergency summary
- Audit

### Priority 5 — Intelligence
- AI summary
- OCR
- Image quality
- Translation
- Audio

### Priority 6 — Hardening
- Security
- Testing
- Performance
- Accessibility
- Deployment
- Documentation

---

# 59. ACCEPTANCE CRITERIA

The build is considered functionally complete only when:

- [ ] A user can register/login.
- [ ] Roles are enforced server-side.
- [ ] A patient receives a unique JeevaCare ID.
- [ ] Guardians can be represented and authorized.
- [ ] Hospitals can be onboarded.
- [ ] Hospital staff can have role-based accounts.
- [ ] Doctors can identify authorized patients.
- [ ] Doctors can create clinical records.
- [ ] Records contain provenance.
- [ ] Records have verification states.
- [ ] Patients can view official records.
- [ ] Patients cannot directly modify/delete official provider records.
- [ ] Patients can upload historical documents.
- [ ] Uploaded documents remain unverified until appropriate review.
- [ ] Documents can be quality checked.
- [ ] OCR can be used where configured.
- [ ] Providers can review/verify eligible uploads.
- [ ] The lifelong timeline displays healthcare events chronologically.
- [ ] Timeline filtering works.
- [ ] Emergency access requires authentication and authorization.
- [ ] Emergency access is audited.
- [ ] Emergency dashboard prioritizes critical information.
- [ ] Wrong/unknown patient identity is not guessed.
- [ ] AI summary uses existing records only.
- [ ] AI summary does not claim diagnosis.
- [ ] AI output can reference source records.
- [ ] Missing/uncertain information is represented.
- [ ] Multilingual presentation works where configured.
- [ ] Audio/read-aloud works where configured.
- [ ] RBAC tests pass.
- [ ] Unauthorized patient access is blocked.
- [ ] Audit logging works.
- [ ] File upload restrictions work.
- [ ] Secrets are not committed.
- [ ] Frontend builds successfully.
- [ ] Backend starts successfully.
- [ ] Database connection works.
- [ ] Deployment configuration is documented.
- [ ] Demo seed data exists.
- [ ] README explains setup and operation.
- [ ] Major UI screens are polished and responsive.

---

# 60. FINAL UI QUALITY CHECKLIST

Before declaring the project complete, visually inspect every major screen.

### Check:

- Is the layout professional?
- Is the information hierarchy obvious?
- Are critical medical alerts visible?
- Are cards aligned?
- Is spacing consistent?
- Are typography sizes readable?
- Are badges consistent?
- Are icons meaningful?
- Are forms easy to understand?
- Are errors clear?
- Are empty states useful?
- Are loading states polished?
- Does mobile layout work?
- Does emergency mode feel fast and focused?
- Does the product look like a healthcare platform rather than a generic admin dashboard?

---

# 61. DEMO / PRESENTATION REQUIREMENTS

The application should support a complete demonstration:

### Demo sequence

1. Open JeevaCare landing page.
2. Register/login as patient.
3. Show unique JeevaCare ID.
4. Show patient dashboard.
5. Show critical information.
6. Open lifelong timeline.
7. Open vaccination history.
8. Open consultation.
9. Open lab/radiology.
10. Upload an old medical document.
11. Show image-quality/OCR assistance.
12. Show pending verification.
13. Login as doctor.
14. Identify patient.
15. Verify uploaded document.
16. Add a new consultation.
17. Return to patient timeline.
18. Generate AI summary.
19. Switch language.
20. Demonstrate audio.
21. Login as emergency professional.
22. Perform emergency identification.
23. Show emergency summary.
24. Open relevant history.
25. Show audit trail.

The demo should use fictional data only.

---

# 62. README REQUIREMENTS

The final repository README should include:

- Project overview
- Problem statement
- Solution
- Features
- Architecture
- Technology stack
- Folder structure
- Installation
- Environment variables
- Database setup
- Cloudinary setup
- AI setup
- OCR setup
- Running frontend
- Running backend
- Running tests
- Seed/demo data
- Demo credentials
- Deployment
- Security notes
- AI limitations
- Scope/out-of-scope
- Academic prototype disclaimer

---

# 63. SUGGESTED PROJECT STRUCTURE

Adapt this to the existing repository rather than blindly replacing it:

```text
JEEVACARE/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── context/
│   │   ├── utils/
│   │   └── assets/
│   └── ...
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── validators/
│   │   ├── utils/
│   │   └── app/
│   └── ...
│
├── ai-service/
│   ├── summarization/
│   ├── translation/
│   ├── validation/
│   └── ...
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── security/
│   └── e2e/
│
├── docs/
│
├── .env.example
├── README.md
└── Build_spec.md
```

---

# 64. IMPORTANT IMPLEMENTATION RULES

### Rule 1
Do not build separate disconnected mock dashboards.

### Rule 2
The three dashboards must operate on the same underlying patient/clinical data model.

### Rule 3
Patient, hospital and emergency interfaces must enforce permissions against the same backend authorization system.

### Rule 4
Never let the frontend decide whether a user is authorized.

### Rule 5
Never treat patient-uploaded documents as automatically verified clinical facts.

### Rule 6
Never allow a patient to directly edit/delete provider-created official clinical history.

### Rule 7
Never silently overwrite important historical medical information.

### Rule 8
Never guess the identity of an unconscious patient.

### Rule 9
Never allow AI to independently diagnose.

### Rule 10
Never allow the image-quality/radiology assistant to claim clinical diagnosis.

### Rule 11
Never expose real secrets.

### Rule 12
Never use real patient data in the demo.

### Rule 13
Do not sacrifice UI quality for implementation speed.

### Rule 14
Do not leave major functionality as fake buttons.

### Rule 15
When an external service is unavailable, use a clean adapter/mock mode rather than breaking the entire application.

---

# 65. FINAL KIRO TASK

After reading this specification:

1. Inspect the repository.
2. Map the existing implementation to this specification.
3. Produce an internal implementation checklist.
4. Identify:
   - Already implemented
   - Partially implemented
   - Missing
   - Broken
5. Implement all missing and incomplete functionality.
6. Integrate all modules end-to-end.
7. Upgrade the UI to the required professional healthcare standard.
8. Add tests.
9. Run the tests.
10. Fix failures.
11. Run production builds.
12. Fix build errors.
13. Verify all critical user flows.
14. Verify RBAC/security boundaries.
15. Verify emergency access.
16. Verify AI safety behavior.
17. Verify document/OCR/image-quality behavior.
18. Verify responsive UI.
19. Update README and environment documentation.
20. Provide a final implementation report containing:
   - Features implemented
   - Files/modules changed
   - Tests run
   - Test results
   - Remaining external configuration requirements
   - Known limitations
   - How to run the complete project

### Final instruction

**Build JeevaCare as one integrated, polished, secure academic healthcare platform according to this specification. Do not stop after generating a plan. Inspect the repository, implement the features, connect the modules, test them, fix issues, and leave the project in the most complete runnable state possible.**

---

# 66. LOCKED PRODUCT UPDATES — BIRTH TO LIFELONG CARE

This section is authoritative for all requirements added after the original build specification. Implement these requirements in addition to the earlier specification.

## 66.1 BRAND IDENTITY AND LOGO

Create a custom JeevaCare healthcare identity. The primary logo must use a **stethoscope forming the letter J**, followed by the word **JeevaCare**. Keep it minimal, professional, recognizable at small sizes, and suitable for web, mobile, reports and hospital dashboards.

Required variants:
- Primary horizontal logo
- Icon-only mark
- Light-background version
- Dark-background version
- Monochrome version
- Favicon/app icon

Do not clutter the mark with unnecessary medical symbols; the stethoscope-as-J is the core identity.

## 66.2 LOCKED VISUAL THEME

Use a modern medical **blue + white** theme with semantic accents:
- Medical blue: primary
- White / very light blue: backgrounds
- Dark navy/slate: text
- Green: verified/success
- Amber: warning/pending
- Red: emergency/danger

The product must feel trustworthy, calm, modern and healthcare-focused, not like a generic college CRUD dashboard.

# 67. BIRTH-FIRST HEALTHCARE JOURNEY

JeevaCare begins at birth and follows the person throughout life.

Authorized healthcare facilities must be able to create a newborn profile containing appropriate birth information, including where applicable:
- Baby name
- Date of birth
- Time of birth
- Sex
- Place of birth
- Birth weight
- Blood group when available and verified
- Birth-related observations
- Birth complications where applicable
- Neonatal information
- Initial vaccination/immunization information

Establish verified parent relationships. Where a parent already has a JeevaCare ID, prefer linking the relationship to that identity.

```text
Child
 ├── Mother → JeevaCare ID where available → verified relationship
 └── Father → JeevaCare ID where available → verified relationship
```

Birth weight, height, weight and other measurements are dated clinical observations, not permanent identity attributes.

# 68. PERMANENT IDENTITY VS DYNAMIC CLINICAL DATA

Separate core identity from changing clinical observations.

## Core identity
- JeevaCare ID
- Name
- Date of birth
- Sex
- Parent/guardian relationships
- Verified identity references
- Contact information
- Other approved identity attributes

Sensitive identity changes require a controlled correction/update workflow.

## Dynamic clinical information
Examples:
- Height
- Weight
- Blood pressure
- Heart rate
- Blood glucose
- BMI
- Growth measurements
- Head circumference where clinically appropriate
- Current medications
- Current conditions
- Other vital observations

Every new measurement creates a new dated observation. Never silently overwrite previous measurements.

# 69. CHILD GROWTH TRACKING

Authorized providers should be able to record longitudinal pediatric growth observations such as height/length, weight, BMI, head circumference where appropriate, measurement date/time, age, facility, provider and verification status.

The patient interface may show a growth timeline/chart. Historical measurements must remain preserved.

# 70. LIFELONG VACCINATION JOURNEY

Vaccinations are individual healthcare events and must remain part of the lifelong timeline.

Support, where applicable:
- Vaccine name
- Dose
- Administration date
- Facility
- Healthcare professional
- Batch/lot information
- Next scheduled dose
- Verification status
- Supporting certificate/document

Provide vaccination history and, where configured, upcoming/due vaccination information. Never overwrite a previous vaccination; use controlled amendments for corrections.

# 71. GOVERNMENT AND DIGITAL DOCUMENT INTEGRATION

Create a document-integration abstraction for eligible government and healthcare documents.

Potential categories include identity documents where legally/technically permitted, birth certificates, other eligible certificates, vaccination certificates, discharge summaries, prescriptions, medical certificates, laboratory reports and radiology reports.

Architecture:

```text
Document Integration Layer
 ├── DigiLocker Adapter
 ├── Hospital Adapter
 ├── Laboratory Adapter
 └── Diagnostic Centre Adapter
```

DigiLocker is an external integration requiring appropriate authorization, credentials and applicable approval. If live credentials are unavailable, implement a clearly labeled mock/demo adapter and integration boundary. Never present a mock as a live government connection and never hard-code credentials.

Imported/referenced documents must retain source/provenance metadata.

# 72. OFFICIAL RECORD IMMUTABILITY

Patients must **not** directly edit or delete official provider-created records, including blood tests, radiology reports, diagnoses, prescriptions, vaccinations, surgery records, hospitalization records, discharge summaries, doctor notes, laboratory values, provider-entered observations, provider identity, issuing facility or verification status.

This must be enforced by the backend, not merely hidden in the UI.

# 73. CORRECTION REQUEST WORKFLOW

If a patient believes an official record is wrong, provide **Request Correction**.

```text
Patient → Request Correction → Authorized provider/facility review
        → Accept / Reject / Clarify
        → If accepted: traceable amendment/version
        → Original history preserved + audit event
```

Never silently replace historical clinical facts.

# 74. DOCUMENT SOURCE AND TRUST MODEL

Every important record/document must expose source and verification status.

Examples:

| Information | Source | Status |
|---|---|---|
| Birth record | Hospital | Provider Verified |
| Vaccination | Hospital | Provider Verified |
| Blood test | Laboratory | Provider Verified |
| CT report | Diagnostic Centre | Provider Verified |
| Old scanned report | Patient | Patient Uploaded |
| Patient-declared allergy | Patient | Patient Reported |
| Doctor-confirmed allergy | Doctor | Provider Verified |
| AI explanation | JeevaCare AI | AI Generated |

AI-generated information is explanatory and is never an official clinical fact.

# 75. HOSPITAL / FACILITY VERIFICATION

A user must not be able to claim a hospital identity and immediately edit records.

Hospital onboarding must support:
- Facility name/type
- Address/contact
- Applicable registration/licensing information
- Official identifiers where applicable
- Verification status
- Facility administrator
- Authorized staff
- Departments where useful
- Audit history

Facility states:
- Pending
- Verified
- Suspended
- Rejected

Only appropriately verified facilities may create official provider records.

# 76. FACILITY IDENTITY

Each approved facility should have a unique internal **JeevaCare Facility ID**, appropriate official credential/reference metadata, verification status and authorized administrators/staff. Do not hard-code a single real-world identifier for every facility type.

# 77. HEALTHCARE PROFESSIONAL VERIFICATION

Doctors and other clinical professionals must not receive editing authority merely by self-declaring a professional title.

```text
Professional registration
 → Identity / credential information
 → Professional registration reference
 → Hospital/facility association
 → Verification
 → JeevaCare professional account
 → Role + permissions
```

Each professional has a unique JeevaCare user identity. Credential/reference types must be extensible for different professions.

# 78. FACILITY STAFF RBAC

Support facility-scoped roles such as:
- Hospital Administrator
- Doctor
- Nurse
- Laboratory Technician
- Radiology Technician
- Pharmacist
- Reception/Appointment Staff

Permissions differ by role and must be enforced server-side. Facility membership alone does not grant clinical editing permissions.

# 79. DOCTOR APPOINTMENT AND TOKEN BOOKING

Add online doctor appointment/token booking.

Patient flow:
1. Search hospital/facility
2. Search doctor
3. View availability
4. View available slots
5. Book
6. Receive confirmation
7. Receive appointment/token reference
8. Check status
9. Cancel/reschedule where permitted

The system must use doctor-specific availability and capacity rather than assuming a universal daily limit.

# 80. DOCTOR CAPACITY AND AVAILABILITY

Doctor scheduling must support:
- Working hours
- Available days
- Appointment duration
- Daily capacity
- Breaks
- Leave/unavailable periods
- Existing bookings

Available slots are calculated from these constraints.

Appointment states:
- Available
- Reserved
- Confirmed
- Checked-in
- In consultation
- Completed
- Cancelled
- No-show

Where practical:

```text
Appointment → Check-in → Encounter → Clinical record → Timeline
```

# 81. EMERGENCY PROFILE

Patients should have a dedicated emergency profile containing, where appropriate:
- Emergency contacts
- Critical allergies
- Critical conditions
- Current critical medication
- Important warnings
- Blood group if available
- Previous major surgeries
- Other emergency-relevant information

Patient-declared information is not automatically provider-verified. Always display source/status.

Example:

```text
Patient declares: Penicillin allergy
Status: Patient Reported
Doctor verifies: Provider Verified
```

# 82. EMERGENCY INCIDENT / ACCIDENT RECORD

Add a separate emergency incident entity rather than placing accident/rescuer information directly into permanent medical history.

Support:
- Patient JeevaCare ID
- Incident date/time
- Location
- Incident type
- Description
- Receiving hospital
- Rescuer information where available
- Witness information where appropriate
- Supporting documents
- Audit history

# 83. RESCUER / STRANGER INFORMATION

Support three states:

1. **Registered rescuer** — rescuer provides JeevaCare ID and authorized identity/contact information can be associated.
2. **Unknown rescuer** — preserve the fact that an unknown person assisted and record whatever information is available.
3. **Anonymous rescuer** — preserve the incident without unnecessarily forcing identity disclosure.

Rescuer information belongs to the emergency incident, not the patient's permanent medical history.

# 84. EMERGENCY IDENTIFICATION WHEN PHONE IS DAMAGED

The JeevaCare ID is an independent identity reference and must not depend entirely on the patient's phone.

```text
JeevaCare ID + approved identity verification + authorized professional
→ patient identification → emergency access
```

Never guess a patient's identity from an ambiguous match.

# 85. RADIOLOGY AND MEDICAL REPORT AI EXPLANATION

Add AI-assisted explanation for:
- Radiology reports
- Other medical reports
- Provider-uploaded reports
- Patient-uploaded reports

Radiology receives special priority because radiology terminology can be difficult for non-clinicians.

# 86. TWO RADIOLOGY INPUT MODES

## Provider/laboratory/diagnostic-centre upload

```text
Authorized provider → Upload → Verification → Official record → Explain with JeevaCare AI
```

## Patient upload

```text
Patient → Upload → Quality/OCR → AI explanation → Patient Uploaded / Pending Review
```

Patient-uploaded material does not automatically become an official provider-verified record.

# 87. EXPLAIN THIS REPORT

Eligible reports should provide an action such as **Explain with JeevaCare AI**.

Support:
- Simple explanation
- Detailed explanation
- Key findings
- Impression explanation
- Explanation of recommendations explicitly present in the source
- Source-linked explanation
- Multilingual explanation
- Audio/read-aloud explanation

The AI must distinguish what the source report actually says from the AI-generated explanation.

# 88. RADIOLOGY IMAGE VS RADIOLOGY REPORT

Distinguish between a text-based radiology report and the underlying diagnostic image.

The primary AI capability should be grounded explanation of the report text. If visual AI is implemented for X-ray, CT, MRI, ultrasound or other images, it must be clearly assistive and must not be presented as an autonomous radiologist or diagnostic replacement.

Image/document quality assistance remains separate from medical diagnosis.

# 89. CONTEXT-AWARE AI EXPLANATION

For authorized users, the AI may receive relevant patient context such as relevant diagnoses, medications, laboratory results, previous radiology and hospitalizations.

```text
Current report + relevant authorized context
→ grounded AI context
→ patient-specific explanation
```

Only relevant authorized records should be supplied. The AI must distinguish source facts from generated explanation.

# 90. AI SAFETY FOR REPORT/RADIOLOGY EXPLANATION

The AI must:
- Use authorized source records
- Preserve source links
- Explain terminology without inventing facts
- Never invent findings, diagnoses, medications or results
- Never turn uncertainty into certainty
- State when information is missing/unclear
- Preserve the original report unchanged
- Clearly label output as AI-generated assistance
- Encourage professional review where appropriate

The AI must never claim to independently diagnose disease.

# 91. LOCKED SIX-LANGUAGE SUPPORT

JeevaCare's multilingual support is now explicitly locked to these **six languages**:

1. English
2. Hindi
3. Kannada
4. Telugu
5. Tamil
6. Malayalam

These are the required supported languages for the patient-facing explanation layer, especially:
- AI medical-history summaries
- Medical report explanations
- Radiology report explanations
- Radiology/image-related explanatory output where applicable
- Simplified medical explanations
- Audio-ready explanations
- Patient education/explanation UI

Do not silently replace these with a generic "regional languages" requirement.

# 92. LANGUAGE ARCHITECTURE

The authoritative clinical source is never overwritten by translation.

```text
Original clinical record/report
        ↓
Source preservation
        ↓
AI explanation layer
        ↓
English / Hindi / Kannada / Telugu / Tamil / Malayalam
        ↓
Patient presentation
```

Language selection changes presentation only.

# 93. AUDIO + LANGUAGE

For supported content, the user can:
1. Select one of the six languages.
2. Generate/view the explanation in that language.
3. Play audio where text-to-speech is configured.

The language selector must expose:
- English
- Hindi
- Kannada
- Telugu
- Tamil
- Malayalam

If a TTS provider or language is temporarily unavailable, fail gracefully and preserve the text explanation.

# 94. RADIOLOGY LANGUAGE UX

Radiology report pages should include:
- Original report
- Original-language indicator where available
- AI explanation
- Six-language selector
- Key findings section
- Impression explanation
- Source reference
- Verification status
- Audio control
- Clear AI-assistance label

The original report must always remain accessible.

# 95. UPDATED LOGICAL DATA ENTITIES

The data model should now support at least:

```text
Patient
GuardianRelationship
ParentRelationship

Hospital
HospitalVerification
HealthcareProfessional
ProfessionalCredential
HospitalStaff

Encounter
ClinicalRecord
Vaccination
Medication
Diagnosis
Allergy
VitalObservation
GrowthObservation

LaboratoryResult
RadiologyRecord
Document

Appointment
DoctorSchedule
DoctorAvailability
Booking

EmergencyProfile
EmergencyContact
EmergencyIncident
EmergencyAccess
Rescuer

CorrectionRequest

AISummary
AIExplanation

GovernmentDocument
ExternalDocumentReference

AuditEvent
```

These are logical entities; choose collections/subdocuments based on integrity and access patterns.

# 96. UPDATED LIFELONG JOURNEY

The central product journey is:

```text
Birth
 ↓
Newborn registration
 ↓
Parent relationship
 ↓
JeevaCare ID
 ↓
Birth documents
 ↓
Vaccinations
 ↓
Growth observations
 ↓
Childhood healthcare
 ↓
Doctor appointments
 ↓
Consultations
 ↓
Diagnoses / conditions
 ↓
Medications
 ↓
Laboratory
 ↓
Radiology
 ↓
Surgeries / hospitalization
 ↓
AI explanations
 ↓
Multilingual / audio accessibility
 ↓
Emergency incidents
 ↓
Emergency access
 ↓
Adult healthcare
 ↓
Lifelong health timeline
```

# 97. UPDATED DEMONSTRATION FLOW

The final demo should ideally show:

1. Newborn registration
2. Parent relationship
3. JeevaCare ID generation
4. Birth record
5. Vaccination entry
6. Growth observation
7. Doctor appointment booking
8. Doctor check-in
9. Clinical encounter
10. Lab report
11. Radiology report
12. AI explanation of radiology report
13. Switch explanation between the six supported languages
14. Audio explanation
15. Patient uploads an old report
16. OCR/quality check
17. Patient-uploaded status
18. Doctor reviews and verifies it
19. Patient attempts to edit an official record and is denied
20. Patient submits a correction request
21. Authorized provider processes correction
22. Emergency profile
23. Accident/emergency incident
24. Rescuer JeevaCare ID / unknown rescuer
25. Emergency professional authentication
26. Emergency summary
27. Relevant history
28. Audit trail

# 98. ADDITIONAL ACCEPTANCE CRITERIA

- [ ] Stethoscope-shaped J logo is implemented.
- [ ] Blue/white healthcare visual system is consistent.
- [ ] Newborn onboarding exists.
- [ ] Parent relationships can be represented and verified.
- [ ] Newborn receives a unique JeevaCare ID.
- [ ] Birth information can be recorded.
- [ ] Vaccinations are individual events.
- [ ] Vaccination history is visible.
- [ ] Growth observations are longitudinal and never overwrite history.
- [ ] Government/digital document integration architecture exists.
- [ ] DigiLocker integration boundary/adapter exists.
- [ ] Mock government integration is clearly labeled as mock/demo.
- [ ] Patients cannot edit official provider records.
- [ ] Patients cannot delete official provider records.
- [ ] Correction requests exist.
- [ ] Corrections preserve historical traceability.
- [ ] Hospitals have verification states.
- [ ] Facilities have unique JeevaCare identities.
- [ ] Doctors require appropriate verification/credential information.
- [ ] Hospital staff roles are facility-scoped.
- [ ] Doctor permissions are role-based.
- [ ] Appointment booking exists.
- [ ] Doctor availability is configurable.
- [ ] Doctor capacity is configurable.
- [ ] Appointment states are supported.
- [ ] Appointments can lead to clinical encounters.
- [ ] Emergency profile exists.
- [ ] Emergency contacts can be stored.
- [ ] Patient-declared emergency information displays its source/status.
- [ ] Emergency incidents can be recorded.
- [ ] Rescuer information can be associated with an incident.
- [ ] Registered rescuers can be referenced by JeevaCare ID where appropriate.
- [ ] Unknown/anonymous rescuer states are supported.
- [ ] Emergency identification never guesses identity.
- [ ] Radiology reports support AI-assisted explanations.
- [ ] Patient-uploaded reports support AI-assisted explanations.
- [ ] Provider-uploaded reports support AI-assisted explanations.
- [ ] Relevant authorized context can be used for explanations.
- [ ] AI explanation is separated from official clinical facts.
- [ ] Radiology image handling does not claim autonomous diagnosis.
- [ ] English is supported.
- [ ] Hindi is supported.
- [ ] Kannada is supported.
- [ ] Telugu is supported.
- [ ] Tamil is supported.
- [ ] Malayalam is supported.
- [ ] All six languages are available for report/radiology explanations.
- [ ] Audio output is supported where configured.
- [ ] Original clinical reports remain unchanged.
- [ ] Source/provenance remains visible.
- [ ] AI-generated explanations are appropriately labeled/auditable.

# 99. FINAL LOCKED PRODUCT DEFINITION

> **JeevaCare is a secure, verified lifelong healthcare identity and continuity platform that begins at birth and follows an individual throughout their health journey. It connects newborn/birth information, parent relationships, vaccinations, growth observations, appointments, consultations, diagnoses, medications, laboratory results, radiology, surgeries, hospitalizations, emergency information and authorized healthcare documents into one chronological journey. Official clinical records remain under authorized healthcare-provider control, while patients receive visibility, correction-request capabilities and understandable AI-assisted explanations. Verified hospitals and healthcare professionals operate through facility-scoped identity and permissions. JeevaCare also provides appointment booking, emergency incident handling, emergency access, document integration, OCR, multilingual explanations and audio accessibility. AI assists understanding and organization—including explanation of radiology reports—but does not replace clinical judgment or independently diagnose disease. The required explanation languages are English, Hindi, Kannada, Telugu, Tamil and Malayalam.**

# 100. FINAL KIRO INSTRUCTION — UPDATED

After reading the complete specification:

1. Inspect the existing repository first.
2. Preserve useful existing implementation.
3. Map existing functionality against every requirement in this specification.
4. Identify implemented, partial, missing and broken functionality.
5. Update the architecture and data model where required by the locked requirements.
6. Implement the complete birth-to-lifelong healthcare journey.
7. Implement verified hospital/provider workflows.
8. Implement immutable official clinical records and correction requests.
9. Implement doctor availability, capacity, appointments and token booking.
10. Implement emergency profile, emergency incident and rescuer workflows.
11. Implement government/document integration abstractions, including the DigiLocker adapter boundary.
12. Implement OCR and document/image-quality assistance.
13. Implement AI medical-history, medical-report and radiology-report explanations.
14. Implement support for exactly these six required languages: English, Hindi, Kannada, Telugu, Tamil and Malayalam.
15. Implement audio presentation where configured.
16. Implement strong RBAC, facility scoping and auditability.
17. Build polished Patient, Hospital and Emergency interfaces using the JeevaCare brand requirements.
18. Ensure all interfaces operate on the same underlying data and authorization system.
19. Add realistic fictional demo data covering the birth-to-lifelong journey.
20. Run tests and fix failures.
21. Run production builds and fix build errors.
22. Verify all acceptance criteria and critical security boundaries.
23. Update README and setup documentation.
24. Clearly identify external credentials/integrations still requiring configuration.
25. Never claim an unavailable external integration is live.
26. Never leave major features as fake buttons or disconnected mock screens.
27. Do not stop at planning. Inspect, implement, integrate, test, fix and polish the repository.

**Build JeevaCare as one integrated, polished, secure academic healthcare platform according to the entire specification.**

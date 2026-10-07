# JeevaCare Radiology AI Architecture

**Purpose**: Design the AI/ML layer for radiology image analysis and report explanation  
**Status**: Pre-Implementation Architecture  
**Goal**: Clear separation of Image → AI Output → Clinician Decision

---

## 1. Three Distinct Entities (CRITICAL)

JeevaCare must maintain strict separation between three different things:

### 1.1 Radiology Image
- **Definition**: The original patient medical image (X-ray, CT scan, MRI)
- **Preservation**: Must never be deleted or modified
- **Ownership**: Patient medical record (official)
- **Authority**: Source of visual truth
- **Storage**: Cloudinary or secure medical image storage
- **Access**: Controlled via RBAC

**Database Model**:
```javascript
radiologyImage: {
    patientId,
    fileReference,      // Cloudinary URL
    modality,          // 'chest_xray', 'ct', 'mri', etc.
    bodyPart,          // anatomical region
    uploadedDate,
    source,            // 'patient_uploaded' | 'provider_created'
    verificationStatus,
    originalFileName,
    sizeBytes,
    format,            // DICOM, PNG, etc.
}
```

### 1.2 Radiology Report
- **Definition**: Radiologist's written interpretation and findings
- **Preservation**: Official clinical document
- **Ownership**: Radiologist/Healthcare provider
- **Authority**: Clinical truth for text interpretation
- **Content**: Findings, impressions, recommendations, diagnoses
- **Status**: Provider-verified clinical record

**Database Model**:
```javascript
radiologyReport: {
    patientId,
    imageIds,          // linked radiology images
    reportDate,
    reportedBy,        // radiologist/provider
    facility,
    findings,          // clinical findings text
    impression,        // clinical impression
    diagnosis,         // radiologist's diagnosis
    recommendations,   // clinical recommendations
    verificationStatus: 'provider_verified',
    historyPreserved,  // amendments tracked
    aiAssistanceUsed,  // if AI was involved
    aiOutputReferenceId, // link to AI analysis
}
```

### 1.3 AI Output
- **Definition**: Automated predictions from machine learning model
- **Status**: ASSISTIVE ONLY (not clinical)
- **Authority**: Suggestion/second opinion only
- **Must Include**: Confidence scores, uncertainty, limitations
- **Must NOT Be**: Diagnosis, clinical decision, or medical advice
- **Clinician Review**: REQUIRED before clinical use

**Database Model**:
```javascript
aiRadiologyOutput: {
    patientId,
    imageId,           // which image analyzed
    modelName,         // model identifier
    modelVersion,
    analysisDate,
    processingTimeMs,
    
    // AI Predictions
    findings: [
        {
            name: 'pneumonia',
            confidence: 0.87,      // 0.0-1.0
            description: 'findings',
            boundingBoxes,         // optional spatial info
            explanation,           // why this finding
        }
    ],
    
    // Uncertainty & Calibration
    overallConfidence: 0.85,
    uncertaintyQuantified: true,
    uncertaintyRange: { min: 0.75, max: 0.95 },
    
    // Safety Information
    disclaimer: 'AI-ASSISTED PREDICTION - NOT A DIAGNOSIS',
    isOfficial: false,
    requiresClinicianReview: true,
    clinicianReviewedBy: null,  // filled when reviewed
    clinicianReviewedAt: null,
    
    // Explainability
    explanations: {
        topPredictions: [],
        attentionMaps: [],
        contributingFeatures: [],
    },
    
    // Lineage
    sourceImage: imageId,
    linkedReport: reportId,  // if report exists
    linkedDiagnosis: null,   // filled when clinician creates official diagnosis
    
    // Status
    status: 'generated' | 'reviewed_by_clinician' | 'incorporated_into_report' | 'superseded',
    auditTrail: [],
}
```

---

## 2. Workflow Architecture

### 2.1 Image → AI Analysis → Clinician Review → Clinical Record

```
┌──────────────────────────────────────────────────────────────────┐
│ STEP 1: IMAGE ACQUISITION                                        │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─ Patient uploads radiology image
    ├─ Healthcare provider uploads image
    │  └─ STORED: Radiology image preserved
    │
    └─ Image quality assessment
       ├─ Check blur, glare, orientation
       ├─ Validate format
       └─ Pass/Fail → user feedback

┌──────────────────────────────────────────────────────────────────┐
│ STEP 2: IMAGE PREPROCESSING                                      │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─ Normalize image (resizing, pixel value normalization)
    ├─ Apply DICOM windowing if applicable
    ├─ De-identify metadata (PHI removal)
    │
    └─ STORED: Processed image (for model input)

┌──────────────────────────────────────────────────────────────────┐
│ STEP 3: AI MODEL INFERENCE                                       │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─ Load trained model
    ├─ Run inference on preprocessed image
    ├─ Generate predictions with confidence scores
    ├─ Calculate uncertainty quantification
    │
    ├─ GENERATE: AI output
    │  ├─ Finding: pneumonia, confidence: 0.87
    │  ├─ Finding: consolidation, confidence: 0.72
    │  ├─ Overall confidence: 0.85
    │  └─ Uncertainty range: ±0.10
    │
    └─ CRITICAL: Mark output as "AI-GENERATED"

┌──────────────────────────────────────────────────────────────────┐
│ STEP 4: EXPLAINABILITY GENERATION                                │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─ Generate attention maps (where did model focus?)
    ├─ Extract key features contributing to prediction
    ├─ Create human-readable explanation
    ├─ Show uncertainty quantification
    │
    └─ EXPLANATION: "Model detected opacity in right lower lobe
                     (confidence: 87%) suggesting possible pneumonia.
                     See attached attention map for model focus area."

┌──────────────────────────────────────────────────────────────────┐
│ STEP 5: CLINICIAN REVIEW                                         │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─ Display original image
    ├─ Show AI output with confidence scores
    ├─ Show AI explanations and attention maps
    ├─ Display AI uncertainty quantification
    │
    ├─ Clinician reviews:
    │  ├─ "I agree with AI analysis" → incorporates into report
    │  ├─ "Partially agree" → modifies findings
    │  ├─ "Disagree" → rejects AI, creates own findings
    │  └─ "Uncertain" → requests additional views/study
    │
    └─ CRITICAL: Clinician makes final decision

┌──────────────────────────────────────────────────────────────────┐
│ STEP 6: OFFICIAL REPORT CREATION                                 │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─ Radiologist creates official diagnosis
    ├─ May reference AI output ("AI suggested pneumonia,
    │   which I confirm with high confidence")
    ├─ OR ("AI suggested pneumonia, but I find insufficient
    │   evidence")
    ├─ Report SIGNED by radiologist
    │
    └─ STORED: Radiology report (OFFICIAL clinical record)

┌──────────────────────────────────────────────────────────────────┐
│ STEP 7: CLINICAL RECORD CREATION                                 │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─ Create clinical record: verificationStatus = "provider_verified"
    ├─ Link original image
    ├─ Link official report
    ├─ PRESERVE AI output as reference (not as official finding)
    ├─ Create audit trail
    │
    └─ STORED: Official clinical diagnosis in patient timeline
```

---

## 3. Report Explanation Pipeline (Separate)

Radiology reports may also need AI explanation (separate from image analysis):

```
┌──────────────────────────────────────────────────────────────────┐
│ RADIOLOGY REPORT TEXT                                            │
│ "There is consolidation in right lower lobe consistent with     │
│  pneumonia. Possible pleural effusion. Follow-up chest X-ray    │
│  recommended."                                                   │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ NLP/AI EXPLANATION PIPELINE                                      │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─ Extract key findings: ["consolidation", "pleural effusion"]
    ├─ Extract clinical implications: ["pneumonia"]
    ├─ Extract recommendations: ["follow-up chest X-ray"]
    ├─ Generate simple explanation:
    │  "The X-ray shows an infiltrate (fluid) in your right lung
    │   which suggests a lung infection. You may need a follow-up
    │   X-ray to monitor progress."
    │
    └─ GENERATE: Simplified explanation with disclaimer

┌──────────────────────────────────────────────────────────────────┐
│ MULTILINGUAL TRANSLATION                                         │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─ Translate to 6 languages
    ├─ Maintain medical accuracy
    ├─ Preserve clarity
    │
    └─ AVAILABLE: Explanations in English, Hindi, Kannada, Telugu, Tamil, Malayalam

┌──────────────────────────────────────────────────────────────────┐
│ AUDIO/TTS CONVERSION                                             │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─ Convert simplified text to speech
    ├─ Language-specific voice
    ├─ Adjustable playback speed
    │
    └─ AVAILABLE: Audio explanation for accessibility
```

---

## 4. Model Adapter Interface

### Core Interface (Python/FastAPI)

```python
class RadiologyAIProvider:
    """
    Base class for radiology AI models.
    Implementations can be swapped out independently of JeevaCare.
    """

    def __init__(self, config: dict):
        """Initialize model with config (path, weights, hyperparams)."""
        self.model_name = config.get('model_name')
        self.model_version = config.get('version')
        self.modality = config.get('modality', 'chest_xray')
        self.device = config.get('device', 'cpu')
        self._initialize_model()

    def _initialize_model(self):
        """Load model weights, initialize inference engine."""
        pass

    def predict(self, image_array: np.ndarray, metadata: dict = None):
        """
        Run inference on image.
        
        Args:
            image_array: numpy array (H, W) or (H, W, 3)
            metadata: optional metadata (patient age, sex, etc.)
            
        Returns:
            {
                'status': 'success',
                'model': {
                    'name': 'pneumonia_detector_v1',
                    'version': '1.0.0',
                    'modality': 'chest_xray'
                },
                'findings': [
                    {
                        'finding': 'pneumonia',
                        'confidence': 0.87,
                        'location': 'right lower lobe',
                        'description': 'opacity detected',
                        'boundingBox': {...}  # if spatial
                    }
                ],
                'overallConfidence': 0.85,
                'uncertaintyRange': {'min': 0.75, 'max': 0.95},
                'processingTimeMs': 342,
                'timestamp': datetime.now(),
                'disclaimer': 'AI-Assisted prediction. Requires clinician review.'
            }
        """
        pass

    def explain(self, image_array: np.ndarray, finding: str = None):
        """
        Generate explainability for predictions.
        
        Returns:
            {
                'finding': 'pneumonia',
                'explanation': 'Model detected opacity...',
                'confidence': 0.87,
                'attentionMap': base64_image,  # heatmap
                'topFeatures': ['consolidation', 'opacity'],
                'relatedAnatomy': ['right_lower_lobe'],
                'linkedResearch': ['pneumonia_ref_1', 'ref_2']
            }
        """
        pass

    def model_info(self):
        """Return model metadata."""
        return {
            'name': self.model_name,
            'version': self.model_version,
            'modality': self.modality,
            'supported_findings': ['pneumonia', 'consolidation', ...],
            'training_dataset': 'RSNA Pneumonia Detection',
            'accuracy': {
                'sensitivity': 0.92,
                'specificity': 0.95,
                'auc': 0.96
            },
            'calibration': {
                'method': 'temperature_scaling',
                'calibrationDataset': 'validation_set_20%'
            },
            'lastUpdated': '2024-10-07',
            'maintenanceMode': False
        }

    def health_check(self):
        """Verify model is ready."""
        return {
            'status': 'ready' | 'degraded' | 'unavailable',
            'modelLoaded': True,
            'gpuAvailable': True,
            'lastHealthCheck': datetime.now(),
            'message': 'Model ready for inference'
        }

    def update_model(self, weights_path: str, version: str):
        """Update model weights (A/B testing, improvements)."""
        pass
```

### Demo Implementation (Until Real Model Ready)

```python
class DemoRadiologyAIProvider(RadiologyAIProvider):
    """
    Mock implementation for development/testing.
    Clearly labeled as DEMO - NOT FUNCTIONAL.
    """

    def predict(self, image_array: np.ndarray, metadata: dict = None):
        return {
            'status': 'demo',
            'disclaimer': 'THIS IS DEMO OUTPUT - NOT A REAL ANALYSIS',
            'disclaimer_caps': 'DEMO MODE - NO ACTUAL RADIOLOGY AI MODEL LOADED',
            'model': {
                'name': 'DEMO_MODEL',
                'version': '0.0.1-dev',
                'modality': 'chest_xray'
            },
            'findings': [
                {
                    'finding': '[DEMO] Chest appears normal',
                    'confidence': 0.0,  # Explicitly zero confidence
                    'description': 'This is demo output. Awaiting trained model.',
                }
            ],
            'overallConfidence': 0.0,
            'processingTimeMs': 10,
            'timestamp': datetime.now(),
            'message': 'Replace DemoRadiologyAIProvider with actual trained model'
        }

    def model_info(self):
        return {
            'name': 'DEMO_MODEL',
            'version': '0.0.1-dev',
            'status': 'NOT_READY',
            'message': 'Demo model - replace with trained model',
            'trainedModelPath': None,
            'accuracyMetrics': 'N/A'
        }
```

### JeevaCare Backend Integration

```javascript
// server/src/adapters/RadiologyAIAdapter.js
import axios from 'axios';

class RadiologyAIAdapter {
    constructor(config) {
        this.serviceUrl = config.aiServiceUrl || 'http://localhost:8001';
        this.enabled = config.enabled || false;
    }

    async analyzeImage(imageBuffer, metadata = {}) {
        if (!this.enabled) {
            return this.mockAnalysis(metadata);
        }

        try {
            const response = await axios.post(
                `${this.serviceUrl}/api/radiology/predict`,
                { image: imageBuffer.toString('base64'), metadata },
                { timeout: 30000 }
            );

            return this.formatResponse(response.data);
        } catch (error) {
            logger.error(`Radiology AI error: ${error.message}`);
            return this.fallbackAnalysis(metadata);
        }
    }

    async explainFinding(imageBuffer, finding) {
        if (!this.enabled) {
            return this.mockExplanation(finding);
        }

        const response = await axios.post(
            `${this.serviceUrl}/api/radiology/explain`,
            { image: imageBuffer.toString('base64'), finding }
        );

        return response.data;
    }

    mockAnalysis(metadata) {
        return {
            status: 'demo',
            disclaimer: 'DEMO MODE - NOT A REAL ANALYSIS',
            findings: [],
            confidence: 0.0,
            requiresReview: true
        };
    }

    formatResponse(data) {
        // Ensure response has safety disclaimers
        return {
            ...data,
            disclaimer: 'AI-Assisted Prediction - Requires Clinician Review',
            isOfficial: false,
            requiresClinicianReview: true
        };
    }
}

export default RadiologyAIAdapter;
```

---

## 5. AI Safety Boundaries

### MUST HAVE

✅ **Clear AI Label on Every Output**
```
╔══════════════════════════════════════════════════════════════╗
║                   ⚠️  AI-ASSISTED PREDICTION                 ║
║                                                              ║
║ This analysis is computer-generated assistance.             ║
║ It is NOT a medical diagnosis.                              ║
║ It MUST be reviewed by a qualified radiologist.             ║
╚══════════════════════════════════════════════════════════════╝

Finding: Possible pneumonia (confidence: 87%)
Location: Right lower lobe
Explanation: Model detected consolidation opacity

⚠️ NOT an official diagnosis. Clinician review required.
```

✅ **Confidence Scores**
- Every prediction must include 0.0-1.0 confidence
- Calibrated confidence (matches actual accuracy)
- Uncertainty quantification

✅ **Source Preservation**
- Original image never deleted/modified
- Link to source in AI output
- Maintain audit trail

✅ **Clinician Review Workflow**
- AI output PENDING until reviewed
- Cannot auto-create diagnosis
- Radiologist makes final decision
- Approval captured in audit

### MUST NOT HAVE

❌ **Autonomous Diagnosis**
- AI cannot independently diagnose
- Cannot auto-generate clinical report
- Cannot bypass clinician review

❌ **Fabrication**
- Cannot invent findings
- Cannot hallucinate anomalies
- Must be grounded in image content

❌ **Clinical Authority**
- AI cannot sign official reports
- Cannot act as sole diagnostic source
- Cannot replace radiologist judgment

❌ **Silent Clinical Action**
- Cannot auto-order tests
- Cannot auto-prescribe
- Cannot auto-create medical record

---

## 6. Database Model Changes Required

### New Collections

```javascript
// RadiologyImage
db.createCollection("radiologyImages", {
    validator: {
        bsonType: "object",
        properties: {
            patientId: { bsonType: "objectId" },
            fileReference: { bsonType: "string" },  // Cloudinary
            modality: { enum: ["chest_xray", "ct", "mri", "ultrasound"] },
            uploadedDate: { bsonType: "date" },
            verificationStatus: { enum: ["patient_uploaded", "provider_verified"] }
        }
    }
});

// RadiologyOutput (AI analysis)
db.createCollection("radiologyAIOutputs", {
    validator: {
        properties: {
            patientId: { bsonType: "objectId" },
            imageId: { bsonType: "objectId" },
            modelName: { bsonType: "string" },
            findings: { bsonType: "array" },
            disclaimer: { bsonType: "string" },  // REQUIRED
            isOfficial: { bsonType: "bool", const: false },
            requiresClinicianReview: { bsonType: "bool", const: true }
        }
    }
});

// RadiologyReport (Clinical)
db.createCollection("radiologyReports", {
    validator: {
        properties: {
            patientId: { bsonType: "objectId" },
            imageIds: { bsonType: "array" },
            reportedBy: { bsonType: "objectId" },
            diagnosis: { bsonType: "string" },
            verificationStatus: { enum: ["provider_verified"] }
        }
    }
});
```

### Indexes for Performance

```javascript
db.radiologyImages.createIndex({ patientId: 1, uploadedDate: -1 });
db.radiologyAIOutputs.createIndex({ patientId: 1, analysisDate: -1 });
db.radiologyAIOutputs.createIndex({ imageId: 1 });
db.radiologyReports.createIndex({ patientId: 1, reportDate: -1 });
```

---

## 7. API Endpoints Required

```
POST /api/v1/radiology/analyze
    Input: { imageBuffer, patientId, modality }
    Output: radiologyAIOutput (with disclaimer)
    
GET /api/v1/radiology/:patientId/images
    Output: List of radiology images
    
GET /api/v1/radiology/:imageId/analysis
    Output: AI analysis + explanation
    
POST /api/v1/radiology/:analysisId/review
    Input: { clinicianDecision, notes }
    Output: Updated analysis status
    
POST /api/v1/radiology/:analysisId/incorporate
    Action: Create official clinical record from approved analysis
    Output: Clinical record ID
    
GET /api/v1/radiology/:reportId/explanation
    Output: Simplified report explanation + translations
```

---

## 8. Frontend UI Components Required

### AI Output Display Component

```jsx
<AIRadiologyOutput
    finding={{
        name: 'pneumonia',
        confidence: 0.87,
        description: 'opacity detected'
    }}
    image={radiologyImage}
    disclaimer="AI-ASSISTED PREDICTION - NOT A DIAGNOSIS"
    attentionMap={heatmapImage}
/>
```

### Clinician Review Interface

```jsx
<ClinicianReviewPanel
    aiAnalysis={analysis}
    originalImage={image}
    onApprove={() => { /* create report */ }}
    onReject={() => { /* discard AI */ }}
    onModify={() => { /* edit findings */ }}
/>
```

---

## 9. Model Evolution Path

```
DemoRadiologyAIProvider (current)
    ↓
RSNAPneumoniaModel (RSNA trained)
    ↓
MultiDiseaseModel (ChestX-ray14/CheXpert trained)
    ↓
ClinicalDataModel (MIMIC-trained)
    ↓
ProductionEnsembleModel (multiple models combined)
```

Each can be swapped without changing JeevaCare core code.

---

## 10. Deployment Strategy

### Training Environment (Separate)
```
/ai/radiology/
    /training/
        /notebooks/
        /datasets/
        /checkpoints/
    /models/
        /trained_models/
    /tests/
```

### Production Integration
```
JeevaCare Backend
    ├── Radiology API Service (FastAPI)
    ├── Model Loading
    ├── Inference Pipeline
    └── Response Formatting
```

---

**Status**: Architecture Designed  
**Next**: Implement Demo Model Adapter  
**Then**: Train on RSNA Pneumonia  
**Finally**: Integrate with JeevaCare backend


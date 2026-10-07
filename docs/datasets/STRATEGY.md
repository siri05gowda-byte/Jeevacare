# JeevaCare Medical Imaging & Radiology AI Strategy

**Document**: Dataset Research & Implementation Plan  
**Status**: Pre-Implementation Planning  
**Goal**: Establish AI radiology layer with proper safety boundaries and phased approach

---

## 1. Problem Statement

JeevaCare needs to support AI-assisted radiology analysis to help clinicians interpret medical images and reports. However, this must be architected carefully to:

- Maintain clear boundaries between AI output and clinical diagnosis
- Ensure AI does NOT replace radiologist/clinician judgment
- Preserve medical record integrity
- Protect patient privacy
- Use appropriate datasets with proper licensing
- Implement explainability and safety guardrails

---

## 2. Candidate Datasets

### RSNA Pneumonia Detection Challenge

**Overview**:
- Pneumonia detection in chest X-rays
- Public competition dataset
- Well-documented and accessible

**Details**:
- **Modality**: Chest X-ray (radiographs)
- **Scale**: ~26,000 training images, ~3,500 test images
- **Labels**: Binary classification + bounding boxes (pneumonia present/absent)
- **Population**: Adult and pediatric patients
- **Source**: RSNA and NIH collaboration
- **Format**: DICOM files

**Access Requirements**:
- Free and publicly available
- No special credentials required
- Can download via Kaggle or RSNA website

**Licensing**:
- Public domain / research use
- Check RSNA terms for specific restrictions
- Suitable for academic prototypes

**JeevaCare Use**:
- ✅ Recommended as Phase 1 starting point
- ✅ Manageable dataset size (~26K images)
- ✅ Clear single-task focus (pneumonia detection)
- ✅ Good for demonstrating AI pipeline
- ⚠️ Limited to pneumonia - not multi-disease

**Storage**: ~5-10 GB for full dataset

**Training Implications**:
- Baseline CNN can achieve ~90%+ accuracy
- Good for proof-of-concept models
- Transfer learning recommended (ResNet, EfficientNet)

---

### NIH Chest X-ray14 (ChestX-ray14)

**Overview**:
- Large-scale chest X-ray dataset
- Multi-label disease classification
- Highly popular in medical imaging research

**Details**:
- **Modality**: Chest X-ray (radiographs)
- **Scale**: ~112,000 images from ~30,000 patients
- **Labels**: 14 disease labels (multi-label): Atelectasis, Consolidation, Infiltration, Pneumothorax, Edema, Emphysema, Fibrosis, Pleural Thickening, Pleural Effusion, Pneumonia, Cardiomegaly, Nodule, Mass, Hernia
- **Population**: Adult patients
- **Source**: NIH Clinical Center
- **Format**: PNG images

**Access Requirements**:
- Free access but requires registration
- May have usage agreements
- Available via NIH or Kaggle

**Licensing**:
- Public domain (most images)
- Some images may have restrictions
- Check NIH Clinical Center terms

**JeevaCare Use**:
- ✅ Multi-disease support (more realistic)
- ✅ Large dataset for production models
- ✅ Good for Phase 2 expansion
- ⚠️ Larger dataset (more storage, compute)
- ⚠️ Class imbalance issues

**Storage**: ~35-50 GB

**Training Implications**:
- Multi-label problem (more complex)
- Class imbalance significant
- Weighted loss functions needed
- Baseline ~80% AUC on individual diseases

---

### CheXpert (Stanford)

**Overview**:
- Curated chest X-ray dataset with expert labels
- High-quality expert annotations
- Well-documented clinical information

**Details**:
- **Modality**: Chest X-ray (radiographs)
- **Scale**: ~224,000 images from ~64,000 patients
- **Labels**: 5 observation categories: No Finding, Enlarged Cardiomediastinum, Cardiomegaly, Airspace Opacity, Pleural Effusion, Pleural Other, Fracture + Uncertainty labels (U-ONES strategy)
- **Population**: Adult patients
- **Source**: Stanford University
- **Format**: DICOM and PNG

**Access Requirements**:
- Free registration required
- Must agree to Stanford research terms
- Available via official CheXpert website

**Licensing**:
- Research use with attribution
- Check specific terms for clinical application
- Suitable for academic research

**JeevaCare Use**:
- ✅ High-quality expert labels
- ✅ Larger scale than RSNA
- ✅ Uncertainty labels useful for AI safety
- ✅ Good for Phase 2 production model
- ⚠️ Requires registration and approval

**Storage**: ~60-80 GB

**Training Implications**:
- Uncertainty labels improve model calibration
- Lower class imbalance than ChestX-ray14
- Baseline ~85-90% AUC
- More realistic clinical distribution

---

### MIMIC-CXR

**Overview**:
- Real clinical data from ICU patients
- Includes DICOM images and clinical notes
- Credentialed access required

**Details**:
- **Modality**: Chest X-ray (radiographs)
- **Scale**: ~377,000 images from ~65,000 patients
- **Labels**: Multiple chest X-ray report classifications
- **Population**: ICU patients (critically ill)
- **Source**: MIT MIMIC-IV project
- **Format**: DICOM files

**Access Requirements**:
- ⚠️ **CREDENTIALED ACCESS REQUIRED**
- Requires CITI training completion
- Institution affiliation needed
- Access request approval process (days to weeks)
- IRB/ethical review may be needed

**Licensing**:
- Research use only
- Cannot be redistributed
- Requires data use agreement
- Citation mandatory

**JeevaCare Use**:
- ✅ Real clinical data
- ✅ ICU context (useful for emergency radiology)
- ✅ Phase 3+ for advanced models
- ❌ NOT suitable for initial prototype
- ❌ Credentialed access requirement
- ❌ Complex access process

**Storage**: ~500 GB+

**Training Implications**:
- More complex clinical presentations
- Requires sophisticated models
- Privacy-critical (real patient data)
- Not suitable for public/demo models

---

### MIMIC-IV-Note

**Overview**:
- Clinical notes paired with imaging from MIMIC-IV
- Radiology report text paired with images
- Useful for report explanation AI

**Details**:
- **Modality**: Text radiology reports + imaging
- **Scale**: ~500,000+ radiology reports
- **Labels**: Unstructured clinical text
- **Use**: Report understanding, NLP tasks
- **Source**: MIT MIMIC-IV project
- **Format**: Text files + linked imaging

**Access Requirements**:
- ⚠️ **CREDENTIALED ACCESS REQUIRED** (same as MIMIC-CXR)
- IRB approval likely needed
- Data use agreement binding

**JeevaCare Use**:
- ✅ Useful for Phase 3+ report explanation AI
- ✅ Real clinical notes
- ❌ Not for initial prototype
- ❌ Credentialed access required

---

### LIDC-IDRI (Lung Imaging Database Consortium)

**Overview**:
- CT imaging for lung nodule detection
- Multiple radiologist annotations per image
- Research-focused dataset

**Details**:
- **Modality**: Lung CT (Computed Tomography)
- **Scale**: ~1,000 CT scans with 1,600+ nodules
- **Labels**: Nodule detection + characteristics (size, subtlety, malignancy)
- **Population**: Screening and diagnostic patients
- **Source**: NCI Cancer Imaging Archive
- **Format**: DICOM files

**Access Requirements**:
- Free access (public domain)
- Registration may be required
- Available via Cancer Imaging Archive

**JeevaCare Use**:
- ✅ Lung nodule detection
- ✅ Phase 3+ CT support
- ⚠️ Smaller scale (1,000 scans)
- ⚠️ Focus on CT (not initial X-ray phase)

---

### PadChest (Hospital San Juan)

**Overview**:
- Large chest X-ray dataset from Spanish hospital
- Multi-label annotations
- Diverse patient population

**Details**:
- **Modality**: Chest X-ray
- **Scale**: ~160,000 images from ~67,000 patients
- **Labels**: 193 different radiological findings
- **Population**: Adult patients
- **Source**: Hospital San Juan de Alicante
- **Format**: PNG files

**Access Requirements**:
- Free access
- Registration with author approval
- Available via Zenodo or official source

**JeevaCare Use**:
- ✅ Large scale
- ✅ Diverse findings (193 labels)
- ✅ European patient population
- ✅ Good for Phase 2+ expansion

---

## 3. Phased Implementation Strategy

### Phase 1: Proof of Concept (RECOMMENDED: RSNA Pneumonia)

**Objective**: Establish AI pipeline and safety architecture

**Dataset**: RSNA Pneumonia Detection
- Why: Small, well-documented, free, public
- Start: Immediate (no approval needed)
- Size: ~26,000 images
- Task: Binary pneumonia classification

**Implementation**:
1. Set up model training environment
2. Implement radiology image processing pipeline
3. Create model adapter interface
4. Build AI output formatting (safety disclaimers)
5. Integrate with JeevaCare backend
6. Test AI→Clinician workflow

**Deliverables**:
- Trained pneumonia detection model
- Model adapter/service interface
- AI safety harness (labeling, disclaimers)
- Integration with JeevaCare API

**Timeline**: 2-3 weeks

---

### Phase 2: Multi-Disease Expansion (NIH ChestX-ray14 or CheXpert)

**Objective**: Support multiple diseases, improve model quality

**Dataset Options**:
- Option A: NIH ChestX-ray14 (free, large, multi-label)
- Option B: CheXpert (smaller but higher quality, requires approval)

**Implementation**:
1. Expand model to multi-label classification
2. Handle class imbalance
3. Improve model calibration
4. Deploy updated models
5. Extend UI for multiple findings

**Timeline**: 4-6 weeks

---

### Phase 3: Clinical Data (MIMIC-CXR / MIMIC-IV-Note)

**Objective**: Real clinical data and report understanding

**Prerequisites**:
- ✅ CITI training completion
- ✅ Institutional affiliation
- ✅ IRB/ethical approval
- ✅ Data use agreement signed

**Implementation**:
1. Complete credentialed access approval
2. Download and process MIMIC data
3. Train on real clinical presentations
4. Implement report explanation AI (using MIMIC-IV-Note)
5. Advanced model evaluation

**Timeline**: 6-8 weeks (after approvals)

---

### Phase 4: Advanced Modalities (CT/MRI)

**Objective**: Support additional imaging modalities

**Datasets**: LIDC-IDRI (CT), Brain Tumor datasets, etc.

**Implementation**:
1. Adapt pipeline for 3D imaging (CT/MRI)
2. Train models on additional modalities
3. Extend UI for new modality types

**Timeline**: 8+ weeks

---

### Phase 5: Multimodal Intelligence

**Objective**: Combine images, reports, and clinical context

**Approach**: Use models like RadImageNet, ALIGN, or custom multimodal architectures

**Timeline**: 10+ weeks

---

## 4. Recommended Prototype Path

### IMMEDIATE: RSNA Pneumonia Detection

**Why This First?**:
- ✅ No approval process (instant start)
- ✅ Publicly available (no credentialed access)
- ✅ Small dataset (faster iteration)
- ✅ Clear task (easier to implement)
- ✅ Good for establishing AI architecture
- ✅ Demonstrates end-to-end pipeline

**Timeline**: 2-3 weeks to have working model

**Expected Accuracy**: ~90%+ (binary classification)

**JeevaCare Integration**: Pneumonia detection endpoint

---

### SECOND: Transition to CheXpert or ChestX-ray14

**Why This Second?**:
- Multi-disease support (more realistic)
- Production-quality dataset
- Better model performance requirements

**Timeline**: 4-6 weeks

---

### THIRD: MIMIC Data (after approvals)

**Why This Third?**:
- Real clinical context
- Only after credentialed access approved
- Advanced model requirements

---

## 5. Radiology AI Architecture

### Clear Separation of Concerns

```
┌─────────────────────────────────────────────────────┐
│  CLINICAL SOURCE (AUTHORITATIVE)                    │
│  - Patient radiology image                          │
│  - Radiology report (if exists)                     │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  AI PROCESSING LAYER (ASSISTIVE)                    │
│  - Image preprocessing                             │
│  - Model inference                                 │
│  - Prediction generation                           │
│  - Explainability generation                       │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  AI OUTPUT (LABELED & SEPARATED)                    │
│  ⚠️ CLEAR LABEL: "AI-ASSISTED PREDICTION"          │
│  ⚠️ NOT DIAGNOSIS                                   │
│  ⚠️ NOT REPLACEMENT FOR RADIOLOGIST                │
│  - Confidence scores                               │
│  - Findings with uncertainty                       │
│  - Linked source (original image/report)           │
│  - Timestamp                                       │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  CLINICIAN REVIEW & APPROVAL                        │
│  - Radiologist interprets AI output                │
│  - Creates official clinical diagnosis             │
│  - Approves/modifies AI suggestions                │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  OFFICIAL CLINICAL RECORD                           │
│  - Clinician diagnosis (authoritative)             │
│  - AI output preserved as reference                │
│  - Versioning & audit trail                        │
└─────────────────────────────────────────────────────┘
```

### Radiology Image vs Report vs AI Output

**DIFFERENT ENTITIES**:

1. **Radiology Image**
   - Original patient medical image (X-ray, CT, MRI)
   - Preserved unchanged
   - Never removed
   - Source of truth for visual analysis

2. **Radiology Report**
   - Radiologist's written interpretation
   - Findings, impressions, recommendations
   - Official clinical documentation
   - May include AI assistance, but radiologist judgment prevails

3. **AI Output**
   - Automated predictions/detections from model
   - Clearly labeled "AI-Assisted"
   - Cannot replace radiologist judgment
   - Provides suggestions/second opinions
   - Confidence scores and uncertainty
   - Explainability scores

---

## 6. Model Adapter Interface

### RadiologyModelProvider (Planned Architecture)

```python
class RadiologyModelProvider:
    """
    Interface for pluggable radiology models.
    Allows swapping between different models without changing
    JeevaCare clinical system.
    """

    def __init__(self, config):
        """Initialize model with configuration."""
        pass

    def predict(self, image_array, metadata=None):
        """
        Generate predictions for a radiology image.
        
        Args:
            image_array: numpy array of image pixel data
            metadata: patient/image metadata dict
            
        Returns:
            {
                'model_name': str,
                'model_version': str,
                'timestamp': datetime,
                'findings': [
                    {
                        'finding': str,
                        'confidence': float,  # 0.0-1.0
                        'description': str,
                        'recommendation': str
                    }
                ],
                'summary': str,
                'confidence_overall': float,
                'uncertainty_quantified': bool,
                'processing_time_ms': float
            }
        """
        pass

    def explain(self, image_array, finding=None):
        """
        Generate explainability for predictions.
        
        Returns:
            {
                'explanation': str,
                'key_regions': [...],  # Attention maps, etc.
                'evidence': [...]
            }
        """
        pass

    def model_metadata(self):
        """Get model information."""
        return {
            'name': str,
            'version': str,
            'modality': str,  # 'chest_xray', 'ct', etc.
            'supported_findings': [str],
            'accuracy_metrics': dict,
            'training_dataset': str,
            'last_updated': datetime
        }

    def health_check(self):
        """Verify model availability and health."""
        return {
            'status': 'ready' | 'unavailable' | 'error',
            'message': str,
            'model_loaded': bool,
            'last_used': datetime
        }
```

### Demo Adapter (Until Model Available)

```python
class DemoRadiologyModelProvider(RadiologyModelProvider):
    """
    Demo adapter returning mock predictions.
    Clearly labeled as demo/non-functional.
    Used until actual model is trained.
    """

    def predict(self, image_array, metadata=None):
        return {
            'model_name': 'DEMO_MODEL',
            'model_version': '0.0.1-dev',
            'timestamp': datetime.now(),
            'findings': [
                {
                    'finding': '[DEMO] Normal chest X-ray',
                    'confidence': 0.85,
                    'description': '[DEMO MODE - NO REAL ANALYSIS PERFORMED]',
                    'recommendation': 'See trained model for real analysis'
                }
            ],
            'summary': '[DEMO MODE - This is not a real medical analysis]',
            'confidence_overall': 0.0,
            'is_demo': True,
            'disclaimer': 'This is demo output for development purposes only'
        }
```

---

## 7. AI Safety Boundaries

### What AI MUST NOT Do

❌ **Autonomous Diagnosis**
- AI output is NOT a diagnosis
- Cannot be stored as official diagnosis without clinician review
- Clinician must make final diagnosis

❌ **Fabrication**
- Model cannot invent findings not visible in image
- Confidence scores must reflect actual model confidence
- Uncertainty must be quantified

❌ **Replacement**
- AI does NOT replace radiologist
- AI does NOT replace doctor
- AI is ASSISTIVE only

❌ **Automatic Clinical Action**
- AI output cannot automatically trigger clinical decisions
- Cannot auto-prescribe
- Cannot auto-order additional tests
- Requires clinician approval

### What AI MUST Do

✅ **Clear Labeling**
- Every AI output must be labeled "AI-Assisted"
- Clear distinction from clinical diagnosis
- Timestamp and model version

✅ **Source Attribution**
- Link to original image/report
- Preserve source data
- Maintain audit trail

✅ **Uncertainty Quantification**
- Confidence scores
- Model calibration
- Explicit uncertainty ranges

✅ **Explainability**
- Provide reasons for predictions
- Show attention/focus areas
- Explain confidence decisions

✅ **Clinician Review**
- Workflow requires human review
- Suggestion-based, not autonomous
- Professional judgment prevails

---

## 8. Data Privacy & De-identification

### Dataset Categories (Keep Separate)

1. **Public Research Datasets**
   - RSNA Pneumonia
   - NIH ChestX-ray14
   - CheXpert
   - PadChest
   - Pre-labeled, anonymized

2. **Credentialed Research Data**
   - MIMIC-CXR
   - MIMIC-IV-Note
   - Real clinical data
   - De-identified but sensitive
   - IRB governance required

3. **Production Data**
   - Real patient medical images
   - Real radiology reports
   - PHI-protected
   - Separate storage/access

4. **Demo Data**
   - Synthetic or safe test data
   - UI demonstrations
   - Public examples
   - Clearly non-clinical

### Storage Strategy

```
/data/
    /raw/
        /research/              # Never commit
            /rsna_pneumonia/
            /chexpert/
        /mimic/                 # Credentialed only
    /processed/
        /training_sets/
        /validation_sets/
    /models/
        /checkpoints/
        /trained_models/
    /metadata/
        DATASET_MANIFEST.md
        LICENSING.md
        ACCESS_REQUIREMENTS.md
```

### .gitignore for Datasets

```
# Datasets (NEVER commit)
/data/raw/
/data/processed/
*.dcm          # DICOM files
*.nii          # NIfTI files
*.nii.gz
/datasets/
/training_data/

# Models
*.pkl
*.h5
*.pt
*.pth
*.onnx
*.pb

# Large temporary files
*.zip
*.tar.gz
*.7z
```

---

## 9. Storage Implications

### Dataset Size Estimates

| Dataset | Size | Notes |
|---------|------|-------|
| RSNA Pneumonia | 5-10 GB | Starting point |
| NIH ChestX-ray14 | 35-50 GB | Phase 2 |
| CheXpert | 60-80 GB | Phase 2 alternative |
| MIMIC-CXR | 500 GB+ | Phase 3+ |
| MIMIC-IV-Note | 50-100 GB | Phase 3+ |

### Compute Requirements

- **GPU**: NVIDIA A100 or similar (training)
- **CPU**: 8+ cores
- **RAM**: 32-64 GB minimum
- **Storage**: 1-2 TB for full pipeline
- **Development**: Can start with CPU-based training on RSNA

---

## 10. Implementation Timeline

### Week 1-2: RSNA Pneumonia Setup
- Environment setup
- Dataset download/preparation
- Baseline model training

### Week 3: Integration
- Model adapter implementation
- JeevaCare API endpoint
- Safety harness

### Week 4-6: Expansion
- CheXpert or ChestX-ray14 training
- Multi-disease support
- Model evaluation

### Week 7+: Advanced
- MIMIC data (after approvals)
- Report explanation AI
- Advanced models

---

## 11. Licensing & Attribution

### RSNA Pneumonia Detection
- **License**: Public domain / research use
- **Citation**: RSNA and NIH collaboration
- **Terms**: Check RSNA.org for current requirements

### NIH ChestX-ray14
- **License**: Public domain (NIH data)
- **Citation**: Wang et al. (2017)
- **Terms**: NIH Clinical Center data use agreement

### CheXpert
- **License**: Research use with attribution
- **Citation**: Rajpurkar et al. (2017) - Stanford University
- **Terms**: Must accept CheXpert data use agreement

### MIMIC-CXR
- **License**: PhysioNet data use agreement
- **Citation**: Johnson et al. (2019)
- **Terms**: CITI training + institutional affiliation required

### MIMIC-IV-Note
- **License**: PhysioNet data use agreement (same as MIMIC-CXR)
- **Citation**: MIMIC-IV collaboration
- **Terms**: Credentialed access required

---

## 12. Do NOT Proceed Without

Before downloading datasets:

- [ ] Understand the dataset license
- [ ] Check access requirements
- [ ] Verify institutional approvals (if needed)
- [ ] Create storage location outside Git
- [ ] Document dataset location
- [ ] Update .gitignore
- [ ] Plan model training approach
- [ ] Establish safety evaluation process

---

## Next Steps

1. **IMMEDIATE**: Confirm RSNA Pneumonia dataset selection
2. **THIS WEEK**: Set up training environment
3. **THIS MONTH**: Train baseline model
4. **MONTH 2**: Integrate with JeevaCare
5. **MONTH 3**: Expand to multi-disease models

---

**Status**: Pre-Implementation Planning  
**Recommendation**: Start with RSNA Pneumonia Detection  
**Not Ready For**: Clinical production use (requires additional approvals and validation)


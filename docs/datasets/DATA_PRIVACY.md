# Data Privacy & De-identification Requirements

**Context**: JeevaCare handles healthcare information requiring strict privacy protection  
**Scope**: Research datasets, production data, demo data, synthetic data  
**Objective**: Keep different data categories strictly separated

---

## 1. Data Categories (MUST KEEP SEPARATE)

### Category 1: Public Research Datasets

**Examples**: RSNA Pneumonia, NIH ChestX-ray14, CheXpert

**Characteristics**:
- ✅ Publicly available
- ✅ Pre-anonymized
- ✅ No patient identification
- ✅ Published research datasets
- ✅ Can be downloaded freely

**Storage Location**: `/data/raw/research/`
**Git Policy**: ❌ NEVER commit to Git
**Access**: Can be shared with team
**Privacy Concern**: Low (already de-identified)

**Example Licensing**: Public domain, research use, CC-BY, etc.

---

### Category 2: Credentialed Research Data

**Examples**: MIMIC-CXR, MIMIC-IV-Note

**Characteristics**:
- ⚠️ Requires institutional credentials
- ⚠️ Data use agreement required
- ⚠️ De-identified but sensitive
- ⚠️ Real clinical data
- ⚠️ IRB oversight may be needed

**Storage Location**: `/data/raw/mimic/` (isolated)
**Git Policy**: ❌ NEVER commit to Git
**Access**: Only credentialed team members
**Privacy Concern**: High (real clinical data)

**Access Process**:
1. CITI training completion
2. Institutional affiliation
3. IRB approval
4. Data use agreement
5. Access request approval

---

### Category 3: Production Patient Data

**Characteristics**:
- 🔐 Real patient medical images
- 🔐 Real patient information
- 🔐 Patient-identifiable information (PII)
- 🔐 Protected health information (PHI)
- 🔐 Requires HIPAA/medical privacy compliance

**Storage Location**: Production database + secure file storage (NOT local)
**Git Policy**: ❌ ABSOLUTELY NEVER - criminally protected
**Access**: Only authorized clinical staff
**Encryption**: ✅ REQUIRED (at rest + in transit)
**Privacy Concern**: CRITICAL

**Requirements**:
- HIPAA compliance
- Audit logging
- Access control
- Encryption
- Regular security audits
- Breach notification procedures

---

### Category 4: Demo/Test Data

**Characteristics**:
- ✅ Synthetic or clearly non-clinical
- ✅ No real patient information
- ✅ Safe for public demonstration
- ✅ UI mockup data

**Storage Location**: Version control + public repository OK
**Git Policy**: ✅ CAN commit (no real data)
**Access**: Public (if desired)
**Privacy Concern**: Minimal (synthetic only)

**Examples**:
```javascript
// Safe demo patient
{
    name: 'John Doe (Demo)',
    jeevaId: 'JJ25-DEMO1',
    dateOfBirth: '1990-01-01',
    sex: 'M',
    condition: 'Demo patient for UI testing'
}

// Safe demo X-ray reference
{
    description: '[DEMO X-RAY] Normal chest X-ray mockup',
    modality: 'chest_xray_demo',
    modelPrediction: 'Normal - confidence: 0.92',
    disclaimer: 'This is synthetic data for demonstration only'
}
```

---

### Category 5: Training Dataset (Processed)

**Characteristics**:
- De-identified research data after preprocessing
- Prepared for machine learning
- Normalized and standardized
- May include data augmentations

**Storage Location**: `/data/processed/training_sets/`
**Git Policy**: ❌ NEVER commit
**Access**: Team members working on model development

**Lifecycle**:
1. Download from source (RSNA, CheXpert, etc.)
2. Validate licensing
3. Run de-identification check
4. Store in `/data/processed/`
5. Generate `.gitignore` entry
6. Document in MANIFEST

---

## 2. De-identification Standards

### What Must Be Removed

❌ Patient names  
❌ Medical record numbers  
❌ Patient dates (birth, admission, discharge)  
❌ Addresses  
❌ Phone numbers  
❌ Email addresses  
❌ Social security numbers  
❌ Insurance information  
❌ Provider names (from images)  
❌ Facility names (sometimes)  
❌ Any other unique identifiers  

### For Medical Imaging (DICOM)

❌ Patient name (0010,0010)  
❌ Patient ID (0010,0020)  
❌ Patient birth date (0010,0030)  
❌ Patient sex (0010,0040) - sometimes  
❌ Study date (0008,0020)  
❌ Study time (0008,0030)  
❌ Series date/time  
❌ Acquisition date/time  
❌ Content date/time  
❌ Referring physician  
❌ Performing physician  
❌ Reading physician  
❌ Institution name  
❌ Station name  

### What Can Remain

✅ Age (not specific DOB)  
✅ Sex/Gender (clinical context)  
✅ Medical findings (clinical data)  
✅ Pathology notes  
✅ Study descriptions  
✅ Image dimensions  
✅ Modality information  

---

## 3. Storage Strategy

### Recommended Directory Structure

```
/data/
├── raw/
│   ├── research/
│   │   ├── rsna_pneumonia/     # RSNA dataset
│   │   ├── chexpert/           # CheXpert dataset
│   │   └── chestx14/           # NIH ChestX-ray14
│   │
│   └── mimic/                  # CREDENTIALED ONLY
│       ├── mimic_cxr/
│       └── mimic_iv_note/
│
├── processed/
│   ├── training_sets/
│   │   ├── train_split_v1/
│   │   ├── val_split_v1/
│   │   └── test_split_v1/
│   │
│   └── metadata/
│       ├── dataset_manifest.json
│       ├── licensing.txt
│       └── access_requirements.txt
│
├── models/
│   ├── checkpoints/
│   │   └── pneumonia_model_checkpoint_epoch_50.pt
│   │
│   └── trained_models/
│       └── pneumonia_detector_v1.pt
│
├── scripts/
│   ├── download_dataset.py
│   ├── preprocess.py
│   ├── train.py
│   └── evaluate.py
│
└── README.md


# IMPORTANT .gitignore entries
/data/raw/                    # Raw datasets
/data/processed/              # Processed datasets
/data/models/                 # Model checkpoints/binaries (if large)
*.dcm                        # DICOM files
*.nii                        # NIfTI files
*.nii.gz
*.zip
*.tar.gz
/datasets/
```

---

## 4. Privacy Checklist Before Using Dataset

- [ ] Dataset license reviewed
- [ ] Access requirements documented
- [ ] De-identification verified
- [ ] Storage location outside Git
- [ ] .gitignore updated
- [ ] Access restricted to authorized personnel
- [ ] IRB approval obtained (if needed)
- [ ] Data use agreement signed
- [ ] Audit trail established
- [ ] Encryption configured (if sensitive)
- [ ] Team trained on data privacy
- [ ] Retention period defined
- [ ] Disposal procedure documented

---

## 5. RSNA Pneumonia Dataset Example

### Safe to Download ✅

```bash
# RSNA pneumonia is public, de-identified
# Can be downloaded freely
python download_rsna_dataset.py
# → /data/raw/research/rsna_pneumonia/
```

### .gitignore Entry

```
# Research datasets (local development only)
/data/raw/research/rsna_pneumonia/**
/data/raw/research/chexpert/**
/data/raw/research/chestx14/**
```

### Documentation

```
DATASET: RSNA Pneumonia Detection Challenge
LOCATION: /data/raw/research/rsna_pneumonia/
LICENSE: Public domain
ACCESS: Free download from Kaggle/RSNA
CITATION: RSNA and NIH
DE-IDENTIFIED: Yes (verified)
STORAGE: Git ignored (local only)
SIZE: ~5-10 GB
```

---

## 6. MIMIC Dataset Example

### Requires Credentialed Access ⚠️

```bash
# MIMIC requires:
# 1. CITI training
# 2. Institutional affiliation
# 3. IRB approval
# 4. PhysioNet data use agreement

# Only download after approvals obtained
python download_mimic_dataset.py --credentials ./credentials.json
# → /data/raw/mimic/
```

### .gitignore Entry

```
# MIMIC data (credentialed access only)
/data/raw/mimic/**
```

### Documentation

```
DATASET: MIMIC-CXR
LOCATION: /data/raw/mimic/
LICENSE: PhysioNet Data Use Agreement
ACCESS: Credentialed (CITI + IRB + institutional)
CITATION: Johnson et al. (2019) + PhysioNet
DE-IDENTIFIED: Yes (real clinical data)
STORAGE: Git ignored (local only)
SIZE: 500 GB+
ACCESS_TEAM: Listed in credentials

APPROVED_FOR:
- Research only
- Academic institution
- Not for commercial use
- Citation required
```

---

## 7. Production Data Handling

### DO NOT

❌ Store in Git  
❌ Commit real patient images  
❌ Store unencrypted  
❌ Use in development  
❌ Use for training  
❌ Share with external parties  
❌ Back up to consumer cloud  
❌ Use unsecured network  

### DO

✅ Store in secure healthcare database  
✅ Encrypt at rest + in transit  
✅ Implement RBAC  
✅ Audit all access  
✅ Regular security audits  
✅ HIPAA compliance  
✅ Patient consent  
✅ Data retention policies  
✅ Breach notification procedures  

---

## 8. Synthetic Data for Development

### Creating Safe Demo Data

```python
# Safe synthetic patient
demo_patient = {
    'name': 'Alex Johnson (Demo)',
    'jeevaId': 'JJ25-DEMO2',
    'dateOfBirth': '1985-06-15',  # Can use specific date - it's not real
    'sex': 'M',
    'note': '[DEMO DATA - NOT A REAL PATIENT]',
    'bloodGroup': 'O+',
    'conditions': ['Diabetes (demo)', 'Hypertension (demo)']
}

# Safe synthetic radiology
demo_xray = {
    'description': '[SYNTHETIC] Normal chest X-ray for UI testing',
    'modality': 'chest_xray_demo',
    'sourceNote': 'Computer-generated synthetic image',
    'disclaimer': 'This is not a real medical image',
    'aiPrediction': {
        'finding': 'Normal',
        'confidence': 0.95,
        'note': '[DEMO MODEL OUTPUT - NOT REAL]'
    }
}
```

### Marking Demo Data

Always include:
```
[DEMO DATA]
[SYNTHETIC]
[NOT A REAL PATIENT]
[NOT A REAL IMAGE]
```

---

## 9. Data Lifecycle

### Research Dataset Lifecycle

```
ACQUIRE
    ↓
[Check License]
    ↓
DOWNLOAD
    ↓
[Store in /data/raw/]
    ↓
[Update .gitignore]
    ↓
PREPROCESS
    ↓
[Validate de-identification]
    ↓
[Store in /data/processed/]
    ↓
TRAIN
    ↓
[Generate metrics]
    ↓
EVALUATE
    ↓
[Archive checkpoints]
    ↓
DEPLOY (to production model)
    ↓
RETAIN
    ↓
[Delete after retention period]
```

---

## 10. Privacy by Design

### For JeevaCare

1. **Minimize Data Collection**
   - Only collect necessary medical information
   - Don't collect data you don't use

2. **Separate Systems**
   - Training data separate from production
   - Demo data separate from real data
   - Research data separate from clinical data

3. **Access Control**
   - Least privilege principle
   - Role-based access
   - Audit all access

4. **Encryption**
   - At rest (database + storage)
   - In transit (HTTPS)
   - End-to-end where possible

5. **Anonymization**
   - De-identify research data
   - Remove PII before processing
   - Use synthetic data for demos

6. **Retention**
   - Define data retention periods
   - Delete data after period
   - Audit deletion

7. **Transparency**
   - Inform users about data use
   - Clear privacy policies
   - Consent mechanisms

---

## 11. Checklist for New Dataset

Before downloading any medical dataset:

- [ ] License reviewed and documented
- [ ] Access requirements met
- [ ] IRB/ethical approval obtained (if needed)
- [ ] Data use agreement signed
- [ ] De-identification verified
- [ ] Storage location outside Git
- [ ] Team access restricted
- [ ] Encryption configured
- [ ] Audit logging enabled
- [ ] Retention period defined
- [ ] Disposal procedure documented

---

## 12. Important Rules

✅ **DO**:
- Store datasets outside Git
- Use .gitignore extensively
- De-identify before development
- Restrict access to credentialed data
- Document all dataset sources
- Get IRB approval when needed
- Encrypt sensitive data
- Audit all access

❌ **DON'T**:
- Commit patient data
- Use real data for demos
- Share without permission
- Ignore licensing terms
- Store unencrypted
- Use consumer cloud storage
- Mix data categories
- Bypass privacy requirements

---

**Status**: Privacy Framework Designed  
**Next**: Implement in JeevaCare backend  
**Then**: Establish audit logging  
**Finally**: Regular privacy audits


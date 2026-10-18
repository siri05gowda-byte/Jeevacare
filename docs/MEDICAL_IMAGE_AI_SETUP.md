# Medical Image AI Setup Guide

## Overview

JeevaCare includes an AI-powered radiology image analysis feature that can assist healthcare providers by automatically analyzing medical images. This guide explains how to set up and use this feature.

⚠️ **Important Medical Disclaimer**: This AI analysis is provided as a supportive tool only. All AI-generated findings must be reviewed and validated by qualified healthcare professionals. Never rely solely on AI analysis for clinical decisions.

## Current Status

**Default Mode**: Mock Analysis (No Model Required)
- The feature runs in mock mode by default
- No additional setup needed for development/testing
- Clearly labeled as "mock data" in all outputs
- Perfect for UI development and integration testing

**Production Mode**: Requires Manual Model Setup
- Real AI inference requires downloading and configuring a pretrained model
- Supported modality: Chest X-rays only (initially)
- Hardware requirements: 2-4GB RAM minimum
- ⚠️ **Render Free Tier Limitation**: The free tier (512MB RAM) is insufficient for running ML models. Production deployment on Render requires a paid plan or keeping the feature in mock mode.

## Supported Modalities

| Modality | Status | Model Required | Notes |
|----------|--------|----------------|-------|
| Chest X-ray | ✅ Supported | Yes (for real inference) | CheXNet-style models recommended |
| CT Scan | ❌ Not Supported | N/A | Returns "unsupported_modality" status |
| MRI | ❌ Not Supported | N/A | Returns "unsupported_modality" status |
| Ultrasound | ❌ Not Supported | N/A | Returns "unsupported_modality" status |
| Other X-rays | ❌ Not Supported | N/A | Only chest X-rays supported initially |

## Installation (Real Model - Optional)

### Prerequisites

- Node.js 18+ with npm
- Python 3.8+ (for model inference)
- 2-4GB available RAM
- Storage: ~500MB-2GB for model weights

### Step 1: Choose a Model

We recommend using a CheXNet-style model trained on chest X-rays:

**Option A: CheXNet (Stanford)**
- **Size**: ~100MB
- **Input**: 224x224 RGB images
- **Output**: 14 thoracic disease probabilities
- **License**: MIT (check current license)
- **Source**: https://github.com/zoogzog/chexnet

**Option B: DenseNet-121 (TorchXRayVision)**
- **Size**: ~30MB
- **Input**: Variable (normalized to 224x224)
- **Output**: Multiple pathology predictions
- **License**: Apache 2.0
- **Source**: https://github.com/mlmed/torchxrayvision

**Option C: Vision Transformer for CXR**
- **Size**: ~300MB-1GB
- **Better accuracy but higher compute requirements
- **Source**: Search Hugging Face for "chest-xray-vit"

### Step 2: Download Model Weights

```bash
# Example: Using torchxrayvision (recommended)
cd server
mkdir -p models/chest-xray
pip install torchxrayvision torch torchvision
python -c "import torchxrayvision as xrv; model = xrv.models.DenseNet(weights='densenet121-res224-all'); print('Model downloaded')"
```

The model will be cached in your Python environment. Note the path for configuration.

### Step 3: Create Model Inference Script

Create `server/models/chest-xray/infer.py`:

```python
#!/usr/bin/env python3
import sys
import json
import torch
import torchxrayvision as xrv
import numpy as np
from PIL import Image
import io

def load_model():
    """Load the pretrained chest X-ray model"""
    model = xrv.models.DenseNet(weights='densenet121-res224-all')
    model.eval()
    return model

def preprocess_image(image_bytes):
    """Convert image bytes to model input tensor"""
    image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    # Resize to 224x224 as expected by model
    image = image.resize((224, 224))
    # Convert to numpy array and normalize
    img_array = np.array(image).astype(np.float32) / 255.0
    # Convert to tensor and add batch dimension
    img_tensor = torch.from_numpy(img_array).permute(2, 0, 1).unsqueeze(0)
    return img_tensor

def analyze(model, image_tensor):
    """Run inference and return predictions"""
    with torch.no_grad():
        outputs = model(image_tensor)
    
    # Get pathology labels and confidence scores
    pathologies = model.pathologies
    scores = torch.sigmoid(outputs[0]).cpu().numpy()
    
    # Create findings list (only report significant findings)
    findings = []
    for pathology, score in zip(pathologies, scores):
        if score > 0.5:  # Threshold for positive finding
            findings.append({
                'condition': pathology,
                'confidence': float(score)
            })
    
    # Generate summary
    if len(findings) == 0:
        summary = "No significant abnormalities detected"
        confidence = 0.85
    else:
        summary = f"Detected {len(findings)} potential findings requiring review"
        confidence = float(np.mean([f['confidence'] for f in findings]))
    
    return {
        'findings': findings,
        'summary': summary,
        'confidence': confidence
    }

def main():
    """Main entry point for model inference"""
    try:
        # Read image bytes from stdin
        image_bytes = sys.stdin.buffer.read()
        
        # Load model
        model = load_model()
        
        # Preprocess
        image_tensor = preprocess_image(image_bytes)
        
        # Analyze
        result = analyze(model, image_tensor)
        
        # Output JSON result
        print(json.dumps(result))
        sys.exit(0)
        
    except Exception as e:
        error_result = {
            'error': str(e),
            'status': 'failed'
        }
        print(json.dumps(error_result), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
```

Make it executable:
```bash
chmod +x server/models/chest-xray/infer.py
```

### Step 4: Configure Environment Variables

Add to `server/.env`:

```bash
# Enable medical image AI
MEDICAL_IMAGE_AI_ENABLED=true

# Path to inference script
MEDICAL_IMAGE_AI_MODEL_PATH=./models/chest-xray/infer.py

# Device: 'cpu' or 'cuda' (if GPU available)
MEDICAL_IMAGE_AI_DEVICE=cpu
```

### Step 5: Update MedicalImageAnalyzer

Modify `server/src/adapters/MedicalImageAnalyzer.js` to call your inference script:

```javascript
async analyzeWithModel(imageBuffer, options = {}) {
  const { spawn } = require('child_process');
  const modelPath = config.medicalImageAI.modelPath;
  
  return new Promise((resolve, reject) => {
    const process = spawn('python3', [modelPath]);
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (err) {
          reject(new Error('Failed to parse model output'));
        }
      } else {
        reject(new Error(stderr || 'Model inference failed'));
      }
    });
    
    // Write image buffer to stdin
    process.stdin.write(imageBuffer);
    process.stdin.end();
  });
}
```

### Step 6: Test the Setup

```bash
# Start the server
cd server
npm start

# Test the service status endpoint
curl http://localhost:5000/api/radiology/ai-service-status

# Should return:
# {
#   "available": true,
#   "mode": "model", // Changed from "mock"
#   "supportedModalities": ["chest_xray"],
#   "healthy": true
# }
```

## API Usage

### 1. Analyze Radiology Image

**Endpoint**: `POST /api/radiology/:radiologyId/analyze-image`

**Authentication**: Required (Doctor or Radiology Technician role)

**Request Body**:
```json
{
  "language": "en"  // Optional: en, hi, kn, te, ta, ml
}
```

**Response (Success - Supported Modality)**:
```json
{
  "success": true,
  "data": {
    "status": "completed",
    "model": "densenet121-res224-all",
    "detectedModality": "chest_xray",
    "findings": [
      "Normal cardiac silhouette",
      "Clear lung fields",
      "No pleural effusion"
    ],
    "summary": "Normal chest X-ray",
    "explanation": "The chest radiograph shows a heart of normal size...",
    "confidence": 0.85,
    "disclaimers": [
      "This is an AI-generated analysis and must be reviewed by a qualified healthcare professional.",
      "AI analysis is not a substitute for professional medical judgment."
    ],
    "isMockData": false,
    "language": "en",
    "analyzedAt": "2024-10-07T10:30:00Z"
  }
}
```

**Response (Unsupported Modality)**:
```json
{
  "success": true,
  "data": {
    "status": "unsupported_modality",
    "detectedModality": "ct_scan",
    "error": "CT Scan analysis is not yet supported. Currently, only chest X-ray analysis is available."
  }
}
```

### 2. Check Analysis Status

**Endpoint**: `GET /api/radiology/:radiologyId/ai-status`

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "completed",  // or "not_analyzed", "analyzing", "failed", "unsupported_modality"
    "model": "densenet121-res224-all",
    "detectedModality": "chest_xray",
    "findings": [...],
    "isMockData": false
  }
}
```

### 3. Get Service Status

**Endpoint**: `GET /api/radiology/ai-service-status`

**Authentication**: Not required (public)

**Response**:
```json
{
  "success": true,
  "data": {
    "available": true,
    "mode": "mock",  // or "model" when real inference is active
    "supportedModalities": ["chest_xray"],
    "supportedLanguages": ["en", "hi", "kn", "te", "ta", "ml"],
    "healthy": true
  }
}
```

## Frontend Integration

The existing `client/src/services/radiologyService.js` already has helper methods. To add AI analysis:

```javascript
// Add to radiologyService.js
export const analyzeRadiologyImage = async (radiologyId, options = {}) => {
  const response = await api.post(
    `/api/radiology/${radiologyId}/analyze-image`,
    options
  );
  return response.data;
};

export const getAIAnalysisStatus = async (radiologyId) => {
  const response = await api.get(`/api/radiology/${radiologyId}/ai-status`);
  return response.data;
};

export const getAIServiceStatus = async () => {
  const response = await api.get('/api/radiology/ai-service-status');
  return response.data;
};
```

Example usage in a React component:

```jsx
import { analyzeRadiologyImage, getAIAnalysisStatus } from '../services/radiologyService';

const RadiologyDetail = ({ radiologyId }) => {
  const [aiAnalysis, setAIAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeRadiologyImage(radiologyId, {
        language: 'en'
      });
      setAIAnalysis(result.data);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div>
      <button onClick={handleAnalyze} disabled={isAnalyzing}>
        {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
      </button>
      
      {aiAnalysis && aiAnalysis.status === 'completed' && (
        <div className="ai-analysis">
          {aiAnalysis.isMockData && (
            <div className="mock-badge">Mock Data - For Testing Only</div>
          )}
          <h3>AI Analysis Results</h3>
          <p><strong>Summary:</strong> {aiAnalysis.summary}</p>
          <div>
            <strong>Findings:</strong>
            <ul>
              {aiAnalysis.findings.map((finding, i) => (
                <li key={i}>{finding}</li>
              ))}
            </ul>
          </div>
          <div className="disclaimers">
            {aiAnalysis.disclaimers.map((disclaimer, i) => (
              <p key={i} className="disclaimer">{disclaimer}</p>
            ))}
          </div>
        </div>
      )}
      
      {aiAnalysis && aiAnalysis.status === 'unsupported_modality' && (
        <div className="unsupported-message">
          <p>{aiAnalysis.error}</p>
        </div>
      )}
    </div>
  );
};
```

## Testing

Run the test suite:

```bash
cd server
npm test -- MedicalImageAnalyzer
npm test -- RadiologyAIService
npm test -- radiologyRoutes.ai
```

## Deployment Considerations

### Development
- Mock mode works perfectly for development
- No additional setup required
- Full API available for frontend integration

### Production (Render Free Tier)
- ⚠️ **Keep in mock mode** - insufficient RAM (512MB) for models
- Feature will work but return clearly labeled mock data
- Consider this a demo/preview mode for users

### Production (Paid Hosting)
- Upgrade to plan with 2GB+ RAM
- Follow installation steps above
- Set `MEDICAL_IMAGE_AI_ENABLED=true`
- Monitor resource usage and response times

### Alternative: Separate Inference Service
If you want real inference without upgrading Render:

1. Deploy model inference on a separate free-tier service (e.g., Hugging Face Spaces, Railway)
2. Create API endpoint for image analysis
3. Update `MedicalImageAnalyzer.js` to call external API
4. Keep main JeevaCare deployment lightweight

## Security Considerations

1. **Patient Data Protection**
   - Never log full image buffers
   - Minimize sensitive data in error messages
   - Use audit logging for all analyses
   - Respect existing authorization checks

2. **Model Security**
   - Validate model outputs
   - Implement rate limiting on analysis endpoints
   - Monitor for unusual patterns
   - Keep dependencies updated

3. **Clinical Safety**
   - Always display disclaimers prominently
   - Never hide mock data status
   - Preserve original images unchanged
   - Log all AI interactions for audit

## Troubleshooting

### "Service unavailable" errors
- Check `MEDICAL_IMAGE_AI_ENABLED` is set to `true`
- Verify model path exists and is executable
- Check Python dependencies are installed

### High memory usage
- Consider model quantization
- Use ONNX Runtime for optimized inference
- Monitor with `process.memoryUsage()`

### Slow inference
- Check CPU vs GPU configuration
- Consider batch processing for multiple images
- Add caching for repeated analyses

### "Unsupported modality" for chest X-rays
- Check filename detection logic
- Verify `type` field in radiology record
- Review modality detection heuristics

## Roadmap

### Near-term
- [ ] Add support for other X-ray body parts
- [ ] Implement model quantization for reduced memory
- [ ] Add confidence threshold configuration
- [ ] Improve modality detection accuracy

### Medium-term
- [ ] Support for CT scan analysis
- [ ] Multi-model ensemble for better accuracy
- [ ] Integration with PACS systems
- [ ] Batch analysis capabilities

### Long-term
- [ ] MRI analysis support
- [ ] Automated report generation
- [ ] Comparison with historical images
- [ ] Integration with clinical decision support

## References

- [CheXNet Paper](https://arxiv.org/abs/1711.05225)
- [TorchXRayVision Documentation](https://mlmed.org/torchxrayvision/)
- [Medical Image Analysis Best Practices](https://www.nature.com/articles/s41746-021-00438-5)
- [FDA Guidance on AI/ML in Medical Devices](https://www.fda.gov/medical-devices/software-medical-device-samd/artificial-intelligence-and-machine-learning-aiml-enabled-medical-devices)

## Support

For questions or issues:
1. Check this documentation
2. Review test files for usage examples
3. Inspect `RADIOLOGY_AI_IMPLEMENTATION_PLAN.md` for technical details
4. Open an issue in the repository

---

**Remember**: This feature is designed to assist, not replace, healthcare professionals. Always prioritize patient safety and clinical judgment over AI suggestions.

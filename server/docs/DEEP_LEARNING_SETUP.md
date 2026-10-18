# Deep Learning Inference Setup Guide

## Current Status

**Real inference implementation:** ✅ Coded (Node.js + Python worker)  
**Model loaded & tested:** ⚠️ Blocked (PyTorch DLL issue on current system)  
**Fallback/Alternative:** ✅ ONNX Runtime (already installed)

---

## System Capabilities

| Component | Status | Details |
|-----------|--------|---------|
| Python | ✅ 3.11.9 (64-bit) | Available |
| ONNX Runtime | ✅ 1.31.0 | Installed & working |
| PyTorch | ❌ DLL error | `torch/lib/shm.dll` corrupted/mismatched |
| TorchXRayVision | Not tested | Requires working PyTorch |
| RAM | ✅ 7.88 GB | Sufficient for inference |
| GPU | Intel HD Graphics | No CUDA support |
| Node.js | ✅ ES modules | Backend framework |

---

## Option 1: Fix PyTorch (Recommended Long-term)

### Root Cause
PyTorch CPU build has a corrupted DLL (`shm.dll`). This occurs when:
- Installation was interrupted
- Python/system architecture mismatch
- Corrupted download

### Solution

```bash
# Step 1: Uninstall corrupted PyTorch
pip uninstall torch torchvision torchaudio -y

# Step 2: Reinstall with verbose output
pip install torch --index-url https://download.pytorch.org/whl/cpu -v

# Step 3: Verify
python -c "import torch; print(f'PyTorch {torch.__version__}')"
```

### If Issue Persists

```bash
# Try pre-built wheel (Windows only)
pip install torch==2.0.1+cpu -f https://download.pytorch.org/whl/torch_stable.html
```

---

## Option 2: Use ONNX Runtime (Current Environment)

### Advantages
- ✅ Already installed (1.31.0)
- ✅ No PyTorch DLL dependencies
- ✅ Fast inference on CPU
- ✅ Cross-platform compatible

### Setup TorchXRayVision as ONNX Models

```bash
# Step 1: Export TorchXRayVision models to ONNX
pip install skimage-python numpy pillow

# Step 2: Use pre-exported ONNX models from HuggingFace
# Download: https://huggingface.co/torchxrayvision/
```

### Inference with ONNX

```python
import onnxruntime as ort
import numpy as np

# Load ONNX model
session = ort.InferenceSession("resnet50-res512-all.onnx")

# Prepare input (512x512 grayscale)
input_name = session.get_inputs()[0].name
input_data = np.random.randn(1, 1, 512, 512).astype(np.float32)

# Inference
outputs = session.run(None, {input_name: input_data})
predictions = outputs[0]  # 18 pathology scores
```

---

## Option 3: Streaming Inference (Production)

For deployment without PyTorch bloat:

```bash
# Install only ONNX Runtime + image dependencies
pip install onnxruntime numpy pillow scikit-image

# This is ~300MB vs 1.5GB for full PyTorch
```

---

## Current Implementation

### Architecture

```
Node.js Backend (RadiologyAI Service)
    ↓
    spawn Python Worker Process
    ↓
ChestXRayInferenceWorker.py
    ├─ Load Model (TorchXRayVision ResNet50)
    ├─ Preprocess Image (512x512, normalize)
    ├─ Run Inference (18 pathology outputs)
    └─ Post-process Predictions
    ↓
Return JSON-RPC Response
    ├─ Findings (pathology + confidence)
    ├─ Summary
    ├─ Patient-friendly explanation
    └─ Metadata
```

### Inference Performance

**Expected on current hardware (8GB RAM, Intel HD Graphics CPU):**

| Task | Time | Notes |
|------|------|-------|
| Model load (first time) | ~5-10s | HuggingFace download + initialize |
| Model load (cached) | <1s | Already in memory |
| Image preprocess | ~100ms | Resize 512x512, normalize |
| Inference (ResNet50) | ~2-5s | CPU-only on 8GB system |
| Post-process | ~50ms | Score sigmoid, threshold |
| **Total (first run)** | ~10-20s | Model download dominant |
| **Total (subsequent)** | ~2-6s | Real inference time |

---

## Models Supported

### TorchXRayVision ResNet50

**18 Pathologies Detected:**

1. Atelectasis
2. Cardiomegaly
3. Consolidation
4. Edema
5. Effusion
6. Emphysema
7. Fibrosis
8. Infiltration
9. Mass
10. Nodule
11. Pleural Thickening
12. Pneumonia
13. Pneumothorax
14. Tortuous Aorta
15. Tuberculosis
16. Enlarged Cardiomediastinum
17. Subcutaneous Emphysema
18. Aortic Enlargement

**Dataset:** NIH, RSNA, SIIM, VinBigData (multi-dataset)  
**License:** Apache 2.0 (free, open-source)  
**Model Size:** ~98MB  
**Input:** 512x512 grayscale chest X-ray  
**Output:** 18 confidence scores [0-1]

### Confidence Interpretation

```
Score > 0.7:  High confidence finding
Score 0.3-0.7: Moderate confidence finding
Score < 0.3:   Low confidence (usually ignored)
```

---

## Model Weights Download

### Automatic (on first inference)

```python
# Python worker automatically downloads from HuggingFace
model = xrv.models.get_model("resnet50-res512-all", from_hf_hub=True)
# Downloads to ~/.cache/huggingface/hub/
```

### Manual Download

```bash
# Clone TorchXRayVision repo
git clone https://github.com/mlmed/torchxrayvision
cd torchxrayvision
python scripts/download_models.py

# Or use Hugging Face CLI
huggingface-cli download torchxrayvision/resnet50-res512-all
```

---

## Testing Real Inference

### Prerequisites

1. **Fix PyTorch** (Option 1 above), OR
2. **Use ONNX models** (Option 2 above)

### Test Script

```bash
# Test Python worker directly
python server/src/adapters/ChestXRayInferenceWorker.py << 'EOF'
{"method": "load", "params": {"model_name": "resnet50-res512-all", "device": "cpu"}}
{"method": "infer", "params": {"image_path": "test_chest_xray.jpg"}}
EOF
```

### Test via Node.js

```bash
# Start server with MEDICAL_IMAGE_AI_ENABLED=true
MEDICAL_IMAGE_AI_ENABLED=true npm start

# Call API
curl -X POST http://localhost:5000/api/radiology/123/analyze-image \
  -H "Content-Type: application/json" \
  -d '{"language": "en"}'
```

---

## Known Issues & Solutions

### PyTorch DLL Error

**Error:** `OSError: [WinError 193] %1 is not a valid Win32 application`

**Cause:** Corrupted `torch/lib/shm.dll`

**Solution:**
```bash
pip install --upgrade torch --force-reinstall --no-cache-dir
```

### Model Download Timeout

**Error:** `ConnectionError: Failed to download model from HuggingFace`

**Solution:**
- Check internet connection
- Manual download: `huggingface-cli download torchxrayvision/resnet50-res512-all`
- Specify cache dir: `HF_HOME=/path/to/cache`

### Inference Timeout

**Error:** `Python worker timeout after 30s`

**Solution:**
- Increase timeout in `MedicalImageAnalyzer.js` (line ~XXX)
- Pre-load model on startup
- Use ONNX for faster inference

### Memory Issues

**Error:** `MemoryError` or OOM during inference

**Symptoms:**
- System becomes unresponsive
- Process crashes

**Solution:**
- Current system: 7.88GB RAM is sufficient for ResNet50 inference
- Fallback: Use lighter models (MobileNet, EfficientNet)
- Or: Use ONNX quantized models (4-bit)

---

## Next Steps

### For Development

1. Fix PyTorch installation (recommended)
2. Test Python worker with sample chest X-ray
3. Enable inference in production with `MEDICAL_IMAGE_AI_ENABLED=true`

### For Production (Render, AWS, etc.)

1. Use ONNX Runtime (no PyTorch bloat)
2. Pre-download model weights to container
3. Set `MEDICAL_IMAGE_AI_MODEL_PATH=/models/resnet50.onnx`
4. Cold-start first inference will be slow (~10s); subsequent fast (~3s)

---

## Troubleshooting Checklist

- [ ] Python 3.11+ installed
- [ ] ONNX Runtime working (`python -c "import onnxruntime"`)
- [ ] PyTorch installed correctly (test: `python -c "import torch"`)
- [ ] TorchXRayVision installed (`pip list | grep torchxrayvision`)
- [ ] scikit-image + numpy available
- [ ] Internet connection (for model download)
- [ ] Sufficient disk space (~500MB for models + cache)
- [ ] Sufficient RAM (7GB+ recommended)

---

## References

- **TorchXRayVision:** https://github.com/mlmed/torchxrayvision
- **ResNet50 Model Card:** https://huggingface.co/torchxrayvision/resnet50-res512-all
- **PyTorch Installation:** https://pytorch.org
- **ONNX Runtime:** https://onnxruntime.ai

---

## Cost Summary

**Complete Setup Cost: ₹0**

- TorchXRayVision: Free (Apache 2.0)
- ResNet50 weights: Free (public dataset)
- PyTorch: Free (open-source)
- Inference: Free (local CPU, no API calls)

**No GPU rental, API subscriptions, or paid services required.**

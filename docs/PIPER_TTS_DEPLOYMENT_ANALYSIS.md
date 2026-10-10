# Piper TTS Deployment Feasibility Analysis

**Date:** October 2026  
**Status:** VERIFIED - Real Piper TTS ready for staging deployment

---

## Executive Summary

Real Piper TTS has been successfully enabled locally and is ready for deployment. However, **deployment to Render requires special consideration** because:

1. **Piper must be installed** on the Render instance (not pre-installed)
2. **Voice models must be downloaded and persisted** (180MB total for 3 languages)
3. **Build time will increase** (~5-10 minutes for initial setup)
4. **Disk space is limited** on Render's default plans

This document outlines the deployment strategy and requirements.

---

## Current Local Verification

### ✓ Installation Status
- **Piper Runtime:** Installed (1.8.0) via pip
- **Executable:** `piper.exe` at `C:\Users\user\AppData\Local\Programs\Python\Python311\Scripts\piper.exe`
- **Models Downloaded:** All 3 supported languages (180.90MB total)
  - English: 60.27MB (en_US-amy-medium.onnx)
  - Hindi: 60.57MB (hi_IN-pratham-medium.onnx)
  - Malayalam: 60.03MB (ml_IN-meera-medium.onnx)

### ✓ Synthesis Verification
- **English:** 192.54KB WAV generated successfully
- **Hindi:** 164.54KB WAV generated successfully
- **Malayalam:** 170.54KB WAV generated successfully
- **Result:** 3/3 synthesis tests PASS

---

## Deployment Architecture

### Option A: Install Piper on Render (Recommended for Now)

```yaml
# render.yaml
services:
  - type: web
    name: jeevacare-backend
    runtime: node
    buildCommand: |
      # Step 1: Install Node dependencies
      npm install
      
      # Step 2: Install Python (pre-installed on Render)
      # Render Node images include Python 3.8+
      
      # Step 3: Install Piper via pip
      pip install piper-tts==1.8.0
      
      # Step 4: Create models directory
      mkdir -p /opt/render/project/piper-models
      
      # Step 5: Download voice models (requires manual setup)
      # Note: Download before deployment or use environment variable
      
    startCommand: cd server && npm start
    
    # Disk configuration
    disk:
      name: piper-models-storage
      mountPath: /opt/render/project/piper-models
      sizeGB: 2  # Minimum 1GB for models + buffer
    
    envVars:
      - key: PIPER_TTS_ENABLED
        value: true
      - key: PIPER_BINARY_PATH
        value: piper  # Available in PATH after pip install
      - key: PIPER_MODELS_PATH
        value: /opt/render/project/piper-models
```

### Option B: Docker-Based Deployment (Future)

For production, consider Docker to pre-build with models:

```dockerfile
FROM node:18-alpine

# Install Python and dependencies
RUN apk add --no-cache python3 py3-pip espeak-ng

# Install Piper
RUN pip install piper-tts==1.8.0

# Create models directory
RUN mkdir -p /app/piper-models

# Copy models (if pre-built into image)
# COPY piper-models /app/piper-models

# Install Node dependencies
COPY package.json /app/
WORKDIR /app
RUN npm ci --production

# Start server
CMD ["node", "src/index.js"]
```

---

## Render Deployment Considerations

### ✓ Feasible
- **Piper Installation:** Python and pip are available on Render
- **Model Download:** Can be scripted in buildCommand
- **Disk Space:** Render provides persistent disks (1-2GB sufficient)
- **CPU/Memory:** Standard Node instance (0.5 CPU, 512MB RAM) sufficient for synthesis
- **Concurrency:** Limited to 3 concurrent requests (configurable, current default)

### ⚠ Challenges
| Challenge | Impact | Mitigation |
|-----------|--------|-----------|
| **Build Time** | First deploy will take 10-15min | Cache dependencies; use separate build service |
| **Model Downloads** | 180MB needs to be cached | Store in persistent disk; don't re-download on restart |
| **Model Licensing** | Piper uses GPLv3 (different from MIT) | Ensure compliance; models are GPLv3 compatible |
| **Cold Start** | First synthesis request may timeout | Pre-warm models during startup (optional) |
| **Disk Space** | Voice models consume 180MB | Upgrade disk plan if needed |

### ✗ Not Feasible (Without Workarounds)
- **Real-time Model Training:** Training new voices requires significant resources
- **All 6 Languages:** Only 3 have official Piper support; Kannada, Tamil, Telugu unavailable

---

## Deployment Checklist

### Pre-Deployment
- [ ] Verify Piper version compatibility (1.8.0 tested)
- [ ] Confirm all 3 voice models download successfully
- [ ] Test synthesis with sample text for each language
- [ ] Verify disk space quota on Render
- [ ] Create build script to automate model download

### Configuration on Render Dashboard
- [ ] Set `NODE_ENV=staging` or `production`
- [ ] Set `PIPER_TTS_ENABLED=true`
- [ ] Set `PIPER_BINARY_PATH=piper` (after pip install in build)
- [ ] Set `PIPER_MODELS_PATH=/opt/render/project/piper-models`
- [ ] Set `PIPER_DEFAULT_VOICE=en`
- [ ] Configure persistent disk for `/opt/render/project/piper-models`
- [ ] Set all other required variables (JWT_SECRET, MONGODB_URI, GROQ_API_KEY, etc.)

### Post-Deployment
- [ ] Test health endpoint: `GET /health`
- [ ] Test TTS endpoint: `POST /api/v1/tts/generate`
- [ ] Monitor first synthesis request (may be slow on cold start)
- [ ] Check disk usage: `du -sh /opt/render/project/piper-models`
- [ ] Verify cleanup job runs daily (if configured)

---

## Build Script for Render

```bash
#!/bin/bash
# scripts/setup-piper-render.sh

set -e

echo "Installing Piper TTS on Render..."

# Install Piper via pip
echo "Installing piper-tts..."
pip install piper-tts==1.8.0

# Create models directory
MODELS_DIR="/opt/render/project/piper-models"
mkdir -p "$MODELS_DIR"

echo "Downloading Piper voice models..."

# Download English (required)
echo "Downloading English model..."
python3 -c "
import urllib.request
from pathlib import Path

models_dir = Path('$MODELS_DIR')
models_dir.mkdir(parents=True, exist_ok=True)

voice = 'en_US-amy-medium'
base_url = 'https://huggingface.co/rhasspy/piper-voices/resolve/main'

model_url = f'{base_url}/en/en_US/amy/medium/{voice}.onnx'
config_url = f'{base_url}/en/en_US/amy/medium/{voice}.onnx.json'

print(f'Downloading {voice}...')
urllib.request.urlretrieve(model_url, models_dir / f'{voice}.onnx')
urllib.request.urlretrieve(config_url, models_dir / f'{voice}.onnx.json')
print(f'✓ {voice} downloaded')
"

# Download Hindi (optional - can add logic to skip if quota exceeded)
echo "Downloading Hindi model..."
python3 -c "
import urllib.request
from pathlib import Path

models_dir = Path('$MODELS_DIR')

voice = 'hi_IN-pratham-medium'
base_url = 'https://huggingface.co/rhasspy/piper-voices/resolve/main'

model_url = f'{base_url}/hi/hi_IN/pratham/medium/{voice}.onnx'
config_url = f'{base_url}/hi/hi_IN/pratham/medium/{voice}.onnx.json'

print(f'Downloading {voice}...')
urllib.request.urlretrieve(model_url, models_dir / f'{voice}.onnx')
urllib.request.urlretrieve(config_url, models_dir / f'{voice}.onnx.json')
print(f'✓ {voice} downloaded')
"

# Download Malayalam (optional)
echo "Downloading Malayalam model..."
python3 -c "
import urllib.request
from pathlib import Path

models_dir = Path('$MODELS_DIR')

voice = 'ml_IN-meera-medium'
base_url = 'https://huggingface.co/rhasspy/piper-voices/resolve/main'

model_url = f'{base_url}/ml/ml_IN/meera/medium/{voice}.onnx'
config_url = f'{base_url}/ml/ml_IN/meera/medium/{voice}.onnx.json'

print(f'Downloading {voice}...')
urllib.request.urlretrieve(model_url, models_dir / f'{voice}.onnx')
urllib.request.urlretrieve(config_url, models_dir / f'{voice}.onnx.json')
print(f'✓ {voice} downloaded')
"

echo "✓ Piper TTS setup complete"
du -sh "$MODELS_DIR"
```

---

## Language Support Status

| Language | Model | Status | Tested | Notes |
|----------|-------|--------|--------|-------|
| English | en_US-amy-medium.onnx | ✅ READY | ✓ | Primary language, high quality |
| Hindi | hi_IN-pratham-medium.onnx | ✅ READY | ✓ | Indian Hindi speaker |
| Malayalam | ml_IN-meera-medium.onnx | ✅ READY | ✓ | Kerala Malayalam |
| Kannada | — | ❌ NOT AVAILABLE | ✗ | No official Piper model |
| Tamil | — | ❌ NOT AVAILABLE | ✗ | No official Piper model |
| Telugu | — | ❌ NOT AVAILABLE | ✗ | No official Piper model |

---

## Performance Considerations

### Synthesis Benchmarks (Local - Windows)
- **English (192KB):** ~2-3 seconds
- **Hindi (164KB):** ~2-3 seconds
- **Malayalam (170KB):** ~2-3 seconds

### On Render
Expected to be similar or slightly slower due to:
- Shared CPU (0.5 CPU on standard plan)
- Network latency for model I/O
- Possible cold starts

### Optimizations
1. **Pre-warm models** on service startup (optional)
2. **Cache synthesis results** for common phrases
3. **Use SSD disk** (Render default) for faster model loading
4. **Implement request queuing** (already done: max 3 concurrent)

---

## Licensing & Compliance

### Piper License
- **License:** GPLv3 (changed from MIT in v1.2.0+)
- **Impact:** Any derivative work must be GPLv3
- **Voice Models:** Also GPLv3 compatible
- **Compliance:** JeevaCare uses Piper as-is; no modifications needed

### Deployment Compliance
- ✓ No secrets committed to git
- ✓ Models not committed (too large; downloaded at build time)
- ✓ GPL license maintained
- ✓ Attribution: Piper by Rhasspy (https://github.com/rhasspy/piper)

---

## Fallback Strategy

### If Piper Installation Fails on Render
1. **Demo Mode Activates:** `PIPER_TTS_ENABLED=false`
2. **Service Returns Demo Audio:** Metadata-only responses
3. **No Service Outage:** Backend continues functioning
4. **Client Notification:** `isDemo: true` flag in response

### If Models Cannot Be Downloaded
1. **Service Degrades to Demo Mode**
2. **Logs Alert:** Clear indication of misconfiguration
3. **Manual Fix:** Re-deploy with corrected setup

---

## Next Steps

1. **Prepare Render Build Script:** Test model download script locally
2. **Configure Render Disk:** Request/allocate 2GB persistent disk
3. **Stage Deployment:** Deploy to staging environment first
4. **Monitor Build Time:** Typical first deploy: 10-15 minutes
5. **Verify Synthesis:** Test all 3 languages on Render
6. **Production Deployment:** Deploy to production after staging verification

---

## Resources

- **Piper GitHub:** https://github.com/rhasspy/piper
- **Piper Voice Models:** https://huggingface.co/rhasspy/piper-voices
- **Render Documentation:** https://render.com/docs
- **JeevaCare TTS Setup:** See PIPER_TTS_SETUP.md
- **Build Spec:** See Build_spec.md

---

**Status:** ✅ Ready for Staging Deployment  
**Date Verified:** October 7, 2026  
**Verified By:** TTS Integration Testing Suite

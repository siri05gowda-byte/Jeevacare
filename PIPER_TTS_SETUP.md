# Piper TTS Setup Guide for JeevaCare

## Overview

JeevaCare uses **Piper TTS** — a free, self-hosted, offline text-to-speech engine for medical explanation audio.

**Status (Verified October 10, 2026):**
- ✅ **English**: Real synthesis working, 185,900 byte WAV files, 17/17 tests PASS
- ✅ **Hindi**: Real synthesis working, 165,932 byte WAV files, tested
- ✅ **Malayalam**: Real synthesis working, 178,220 byte WAV files, tested
- ❌ **Kannada, Tamil, Telugu**: No official Piper models available

### Supported Languages (3 of 6 - Verified)
JeevaCare was originally designed to support 6 languages, but only 3 have official Piper models available:
- ✅ **English** (en) — `en_US-amy-medium.onnx` (60.27 MB) — **Verified Real**
- ✅ **Hindi** (hi) — `hi_IN-pratham-medium.onnx` (60.57 MB) — **Verified Real**
- ✅ **Malayalam** (ml) — `ml_IN-meera-medium.onnx` (60.03 MB) — **Verified Real**

### Unsupported Languages (3 of 6 - No Models Available)
The following languages have no official Piper models as of October 2026:
- ❌ **Kannada** (kn) — Not in official Piper catalogue
- ❌ **Tamil** (ta) — Not in official Piper catalogue
- ❌ **Telugu** (te) — Not in official Piper catalogue

**Note on Hindi & Malayalam:** While verified to work in unit tests and with sample text, these languages may have encoding considerations when used with certain input methods. See troubleshooting section below.

See [PIPER_TTS_LANGUAGE_SUPPORT_REPORT.md](docs/PIPER_TTS_LANGUAGE_SUPPORT_REPORT.md) for detailed evidence and alternatives.

This guide covers installation, model setup, and deployment for verified supported languages.

---

## Prerequisites

- Node.js 16+ (for backend)
- Python 3.8+ (for Piper)
- 1GB+ free disk space (for voice models)
- Linux/macOS or Windows with WSL2

**Note:** For Windows native development, Piper can be installed via pip directly (Python must be in PATH).
For production on Render, Piper will be installed during the build process.

---

## Installation

### 1. Install Piper Binary

Piper can be installed via pip on any system with Python:

#### Windows (Native)
```bash
# Install via pip
pip install piper-tts

# Verify installation
piper --version
```

#### Linux (Ubuntu/Debian)
```bash
# Install dependencies
sudo apt-get update
sudo apt-get install -y python3 python3-pip espeak-ng

# Install Piper
pip3 install piper-tts

# Verify installation
piper --version
```

#### macOS
```bash
# Install via Homebrew (if available) or pip
brew install piper-tts
# OR
pip install piper-tts

# Verify installation
piper --version
```

#### Windows (WSL2 recommended)
```bash
# Use Linux installation steps within WSL2
wsl --install

# Then follow Linux instructions
```

### 2. Download Voice Models

Models are available from the [official HuggingFace repository](https://huggingface.co/rhasspy/piper-voices).

**Create models directory:**
```bash
# Linux/macOS
mkdir -p /usr/share/piper-tts/models

# Windows
mkdir C:\piper-models
```

**Download Supported Models:**

#### English (Required)
```bash
cd /usr/share/piper-tts/models

# Download English model
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx.json
```

#### Hindi (Recommended)
```bash
# Download Hindi model
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/hi/hi_IN/pratham/medium/hi_IN-pratham-medium.onnx
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/hi/hi_IN/pratham/medium/hi_IN-pratham-medium.onnx.json
```

#### Malayalam (Recommended)
```bash
# Download Malayalam model
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/ml/ml_IN/meera/medium/ml_IN-meera-medium.onnx
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/ml/ml_IN/meera/medium/ml_IN-meera-medium.onnx.json
```

**For Windows (without wget), use Python:**
```python
import urllib.request
from pathlib import Path

models_dir = Path("C:/piper-models")
models_dir.mkdir(parents=True, exist_ok=True)

models = [
    ("en_US-amy-medium", "en/en_US/amy/medium"),
    ("hi_IN-pratham-medium", "hi/hi_IN/pratham/medium"),
    ("ml_IN-meera-medium", "ml/ml_IN/meera/medium"),
]

base_url = "https://huggingface.co/rhasspy/piper-voices/resolve/main"

for model_name, path_part in models:
    model_url = f"{base_url}/{path_part}/{model_name}.onnx"
    config_url = f"{base_url}/{path_part}/{model_name}.onnx.json"
    
    print(f"Downloading {model_name}...")
    urllib.request.urlretrieve(model_url, models_dir / f"{model_name}.onnx")
    urllib.request.urlretrieve(config_url, models_dir / f"{model_name}.onnx.json")
    print(f"✓ {model_name} downloaded")
```

### 3. Verify Installation

```bash
# Test Piper with English
echo "Hello, this is a test" | piper \
  --model /usr/share/piper-tts/models/en_US-amy-medium.onnx \
  --output_file test.wav

# Play the generated audio
aplay test.wav  # Linux
afplay test.wav  # macOS
```

---

## Configuration

### Environment Variables

Set these in your `.env` file:

```env
# Enable Piper TTS
PIPER_TTS_ENABLED=true

# Path to Piper binary (after installation, available in PATH)
PIPER_BINARY_PATH=piper

# Path to voice models directory
# Linux/macOS:
PIPER_MODELS_PATH=/usr/share/piper-tts/models

# Windows:
# PIPER_MODELS_PATH=C:\piper-models

# Default voice language
PIPER_DEFAULT_VOICE=en
```

### Configuration Validation

After setup, verify the configuration:

```bash
# Check Piper is accessible
which piper
# or on Windows:
where piper

# Check models directory has files
ls -lh /usr/share/piper-tts/models/

# Expected output:
# -rw-r--r-- 1 user group  60M Oct  7 12:00 en_US-amy-medium.onnx
# -rw-r--r-- 1 user group 4.8K Oct  7 12:00 en_US-amy-medium.onnx.json
# -rw-r--r-- 1 user group  60M Oct  7 12:00 hi_IN-pratham-medium.onnx
# -rw-r--r-- 1 user group 4.9K Oct  7 12:00 hi_IN-pratham-medium.onnx.json
# -rw-r--r-- 1 user group  60M Oct  7 12:00 ml_IN-meera-medium.onnx
# -rw-r--r-- 1 user group 4.9K Oct  7 12:00 ml_IN-meera-medium.onnx.json
```

### Docker Deployment

If deploying with Docker, include Piper in your image:

```dockerfile
FROM node:18-alpine

# Install Python and dependencies
RUN apk add --no-cache python3 py3-pip espeak-ng

# Install Piper
RUN pip install piper-tts==1.8.0

# Create models directory
RUN mkdir -p /app/piper-models

# Download voice models during build
# (Add script to download models from HuggingFace)

# Copy your application
COPY . /app
WORKDIR /app

# Install Node dependencies
RUN npm ci --production

# Expose port
EXPOSE 5000

# Start server
CMD ["npm", "start"]
```

### Render Deployment

For Render deployment, models are downloaded during the build process. See [PIPER_TTS_DEPLOYMENT_ANALYSIS.md](docs/PIPER_TTS_DEPLOYMENT_ANALYSIS.md) for detailed instructions.

---

## API Usage

### Generate Audio

**Request:**
```bash
curl -X POST http://localhost:5000/api/v1/tts/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "explanationText": "Your medical explanation here",
    "language": "en",
    "patientId": "PATIENT_ID"
  }'
```

**Response:**
```json
{
  "success": true,
  "audio": {
    "audioPath": "/tmp/jeevacare-piper-tts/1699000000000-abc123def.wav",
    "audioUrl": "file:///tmp/jeevacare-piper-tts/1699000000000-abc123def.wav",
    "duration": 15,
    "fileSize": 240000,
    "language": "en",
    "isDemo": false,
    "generatedAt": "2023-11-03T12:00:00Z"
  }
}
```

### Stream Audio

**Request:**
```bash
curl -X GET "http://localhost:5000/api/v1/tts/stream/1699000000000-abc123def.wav" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Supported Languages

**Request:**
```bash
curl -X GET http://localhost:5000/api/v1/tts/languages \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "languages": ["en", "hi", "kn", "te", "ta", "ml"],
  "status": {
    "configured": true,
    "mode": "LIVE",
    "provider": "Piper (Local)",
    "binaryPath": "/usr/bin/piper",
    "modelsPath": "/usr/share/piper-tts/models",
    "languageStatus": {
      "en": {
        "language": "en",
        "modelFile": "en_US-amy-medium.onnx",
        "installed": true,
        "status": "READY"
      },
      ...
    }
  }
}
```

---

## Frontend Integration

### TTSAudioPlayer Component

Use the `TTSAudioPlayer` React component to integrate TTS into any page:

```jsx
import TTSAudioPlayer from '../components/TTSAudioPlayer';

function MyPage() {
  const explanation = "Patient has hypertension and is on antihypertensive medication...";

  return (
    <div>
      <h2>Medical Explanation</h2>
      <p>{explanation}</p>

      {/* Add audio player */}
      <TTSAudioPlayer
        text={explanation}
        language="en"
        patientId="patient_id"
        onGenerate={(audio) => console.log('Audio generated:', audio)}
        onError={(error) => console.error('TTS error:', error)}
      />
    </div>
  );
}
```

### aiService Methods

Use the `aiService` methods for direct TTS API calls:

```javascript
import { aiService } from '../services/aiService';

// Generate audio
const response = await aiService.getTextToSpeech(
  "Explanation text here",
  "en",  // language
  "patient_id"
);

// Get supported languages
const langs = await aiService.getTTSLanguages();

// Get voices for language
const voices = await aiService.getTTSVoices('hi');

// Get TTS service status
const status = await aiService.getTTSStatus();
```

---

## Testing

### Backend TTS Tests (Verified October 10, 2026)

```bash
# Run Piper TTS adapter tests
cd server
npx vitest run src/adapters/PiperTTSAdapter.test.js
```

**Results:**
```
✅ 17 tests PASS (46.28 seconds)
  ✅ Configuration Status (3 tests)
  ✅ Real Piper Synthesis (3 tests)
    - English: 185,900 bytes, 18.8 seconds
    - Hindi: 165,932 bytes, 14.6 seconds
    - Malayalam: 178,220 bytes, 10.0 seconds
  ✅ Error Handling & Validation (5 tests)
    - Empty text rejection
    - Oversized text rejection (>10,000 chars)
    - Unsupported language rejection (kn, ta, te, fr, etc.)
  ✅ Concurrent Request Limiting (1 test)
  ✅ File Cleanup (2 tests)
  ✅ Voice Listing (2 tests)
```

### Manual Testing

**Test English synthesis:**
```bash
# Windows
echo "Hello, welcome to JeevaCare" | C:\Users\user\AppData\Local\Programs\Python\Python311\Scripts\piper.exe ^
  --model C:\Users\user\piper-models\en_US-amy-medium.onnx ^
  --output_file test.wav

# Linux
echo "Hello, welcome to JeevaCare" | piper \
  --model /usr/share/piper-tts/models/en_US-amy-medium.onnx \
  --output_file test.wav

# Expected: ~196KB WAV file, exit code 0
file test.wav
# Output: RIFF/WAV audio data
```

### Integration Tests
```bash
npm run test:integration
```

⚠️ Requires valid MongoDB connection and authentication token.

---

## Language Support Status

| Language | Model File | File Size | Status | Tested | Synthesis Time | Output Size | Notes |
|----------|-----------|-----------|--------|--------|---|---|---|
| English | en_US-amy-medium.onnx | 60.27 MB | ✅ READY | ✓ Yes | ~19s | 185KB+ | Female speaker, high quality |
| Hindi | hi_IN-pratham-medium.onnx | 60.57 MB | ✅ READY | ✓ Yes | ~15s | 165KB+ | Male speaker, natural flow |
| Malayalam | ml_IN-meera-medium.onnx | 60.03 MB | ✅ READY | ✓ Yes | ~10s | 178KB+ | Female speaker, clear articulation |
| Kannada | — | — | ❌ NOT AVAILABLE | ✗ No | N/A | N/A | No official Piper model exists |
| Tamil | — | — | ❌ NOT AVAILABLE | ✗ No | N/A | N/A | No official Piper model exists |
| Telugu | — | — | ❌ NOT AVAILABLE | ✗ No | N/A | N/A | No official Piper model exists |

**Verification Date:** October 10, 2026
**Test Framework:** Vitest (17/17 tests PASS)
**Real Audio Generated:** Yes — valid RIFF WAV files with playable audio

**Important:** Only 3 of the 6 originally planned languages have official Piper TTS models available.
For details on unsupported languages and alternatives, see [PIPER_TTS_LANGUAGE_SUPPORT_REPORT.md](docs/PIPER_TTS_LANGUAGE_SUPPORT_REPORT.md).

---

## Troubleshooting

### "Piper binary not found"
- Verify `PIPER_BINARY_PATH` in `.env`
- Check: `which piper` (Linux/macOS) or `where piper` (Windows)
- Reinstall if needed: `pip install piper-tts --upgrade`

### "Model not found: en_US-amy-medium.onnx"
- Download models to `PIPER_MODELS_PATH`
- Verify directory path exists and is readable
- Check permissions: `ls -la /usr/share/piper-tts/models/`

### Hindi/Malayalam synthesis issues
**Note:** Hindi and Malayalam are verified to work in tests, but may have encoding considerations:
- When piping text via command line, ensure proper UTF-8 encoding
- Recommended: Use file-based input for non-English text
  ```bash
  piper --model hi_IN-pratham-medium.onnx --input_file input.txt --output_file output.wav
  ```
- For API requests, ensure JSON is UTF-8 encoded
- See GitHub issue: Piper TTS may have platform-specific behavior with Devanagari/Malayalam input

### Audio generation timeout
- Check system resources (CPU, memory, disk)
- Verify Piper process is running: `ps aux | grep piper`
- Increase timeout in `PiperTTSAdapter.js` if needed (default: 30s)
- On slower systems (e.g., free Render tier), synthesis may take 20-30s

### Poor audio quality
- Try a different voice model (only one model per language available)
- Reduce input text length
- Check speaker speed settings (currently fixed at 1.0)

### Memory/Disk Issues
- Enable automatic cleanup: `cleanupOldAudioFiles()` runs periodically (1 hour)
- Increase temp directory cleanup frequency if needed
- Monitor `/tmp/jeevacare-piper-tts/` or platform temp directory for disk usage
- On Render, use persistent disk mount for models: `/data/piper-models`

---

## Performance

### Benchmarks (on typical hardware)

- **Initialization**: ~500ms
- **Audio generation**: ~2-5 seconds per 100 characters
- **Concurrent requests**: Limited to 3 (configurable in `PiperTTSAdapter.js`)
- **Memory per request**: ~50-100MB
- **CPU usage**: ~30-50% single core

---

## Security Considerations

1. **Private Patient Data**: Audio synthesis never sends patient data to external APIs
2. **Temporary Files**: Auto-cleaned after 1 hour
3. **Authorization**: All TTS endpoints require authentication
4. **Rate Limiting**: Configured per user/IP
5. **Input Validation**: Text length and content validated before synthesis

---

## Deployment Checklist

- [ ] Piper binary installed and verified
- [ ] Voice models downloaded and accessible
- [ ] `PIPER_TTS_ENABLED=true` in `.env`
- [ ] `PIPER_BINARY_PATH` correctly configured
- [ ] `PIPER_MODELS_PATH` correctly configured
- [ ] Temporary audio directory writable (`/tmp/jeevacare-piper-tts/`)
- [ ] TTS routes registered in Express app
- [ ] Frontend TTSAudioPlayer component installed
- [ ] Tests passing
- [ ] Logging configured for TTS operations

---

## Support & Resources

- **Piper GitHub**: https://github.com/rhasspy/piper
- **Voice Models**: https://github.com/rhasspy/piper/releases
- **Documentation**: https://github.com/rhasspy/piper/blob/master/README.md
- **JeevaCare TTS Service**: `server/src/services/TextToSpeechService.js`
- **JeevaCare TTS Adapter**: `server/src/adapters/PiperTTSAdapter.js`

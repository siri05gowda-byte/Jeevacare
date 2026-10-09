# Piper TTS Setup Guide for JeevaCare

## Overview

JeevaCare uses **Piper TTS** — a free, self-hosted, offline text-to-speech engine supporting 6 languages:
- English (en)
- Hindi (hi)
- Kannada (kn)
- Telugu (te)
- Tamil (ta)
- Malayalam (ml)

This guide covers installation, model setup, and deployment.

---

## Prerequisites

- Node.js 16+ (for backend)
- Python 3.8+ (for Piper)
- 1GB+ free disk space (for voice models)
- Linux/macOS or Windows with WSL2

---

## Installation

### 1. Install Piper Binary

#### Linux (Ubuntu/Debian)
```bash
# Install dependencies
sudo apt-get update
sudo apt-get install -y python3 python3-pip espeak-ng

# Install Piper
pip install piper-tts

# Verify installation
piper --help
```

#### macOS
```bash
# Install via Homebrew
brew install piper-tts

# Verify installation
piper --help
```

#### Windows (WSL2 recommended)
```bash
# Use Linux installation steps within WSL2
wsl --install

# Then follow Linux instructions
```

### 2. Download Voice Models

Download voice models for supported languages from the [Piper releases](https://github.com/rhasspy/piper/releases/tag/2023.11.14-1):

```bash
# Create models directory
mkdir -p /usr/share/piper-tts/models

# Download English (required minimum)
cd /usr/share/piper-tts/models
wget https://github.com/rhasspy/piper/releases/download/2023.11.14-1/en_US-amy-medium.onnx

# Download Hindi
wget https://github.com/rhasspy/piper/releases/download/2023.11.14-1/hi_IN-male-medium.onnx

# Download Kannada
wget https://github.com/rhasspy/piper/releases/download/2023.11.14-1/kn_IN-male-medium.onnx

# Download Telugu
wget https://github.com/rhasspy/piper/releases/download/2023.11.14-1/te_IN-male-medium.onnx

# Download Tamil
wget https://github.com/rhasspy/piper/releases/download/2023.11.14-1/ta_IN-male-medium.onnx

# Download Malayalam
wget https://github.com/rhasspy/piper/releases/download/2023.11.14-1/ml_IN-male-medium.onnx
```

### 3. Verify Installation

```bash
# Test Piper with English
echo "Hello, this is a test" | piper \
  --model /usr/share/piper-tts/models/en_US-amy-medium.onnx \
  --output_file test.wav

# Play the generated audio
aplay test.wav  # Linux
# or
afplay test.wav  # macOS
```

---

## Configuration

### Environment Variables

Set these in your `.env` file:

```env
# Enable Piper TTS
PIPER_TTS_ENABLED=true

# Path to Piper binary
PIPER_BINARY_PATH=/usr/bin/piper

# Path to voice models
PIPER_MODELS_PATH=/usr/share/piper-tts/models

# Default voice language
PIPER_DEFAULT_VOICE=en
```

### Docker Deployment

If deploying with Docker, include Piper in your image:

```dockerfile
FROM node:18-alpine

# Install Python and dependencies
RUN apk add --no-cache python3 py3-pip espeak-ng

# Install Piper
RUN pip install piper-tts

# Create models directory
RUN mkdir -p /usr/share/piper-tts/models

# Copy your application
COPY . /app
WORKDIR /app

# Install Node dependencies
RUN npm ci --production

# Download models (optional - can be volume-mounted instead)
# RUN wget -O /usr/share/piper-tts/models/en_US-amy-medium.onnx \
#     https://github.com/rhasspy/piper/releases/download/2023.11.14-1/en_US-amy-medium.onnx

# Expose port
EXPOSE 5000

# Start server
CMD ["npm", "start"]
```

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

### Backend TTS Tests

```bash
# Test TTS adapter (when configured)
npm run test:tts

# Or run integration tests
npm run test:integration
```

### Manual Testing

```bash
# Test with curl (requires auth token)
curl -X POST http://localhost:5000/api/v1/tts/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "explanationText": "Hello, this is a test",
    "language": "en"
  }'

# Playback the audio
# Audio files are stored in /tmp/jeevacare-piper-tts/
ls /tmp/jeevacare-piper-tts/
```

---

## Language Support Status

| Language | Model File | Status | Notes |
|----------|-----------|--------|-------|
| English | en_US-amy-medium.onnx | ✅ READY | Primary language, high quality |
| Hindi | hi_IN-male-medium.onnx | ✅ READY | Indian Hindi speaker |
| Kannada | kn_IN-male-medium.onnx | ✅ READY | Kannada speaker |
| Telugu | te_IN-male-medium.onnx | ✅ READY | Telugu speaker |
| Tamil | ta_IN-male-medium.onnx | ✅ READY | Tamil speaker |
| Malayalam | ml_IN-male-medium.onnx | ✅ READY | Malayalam speaker |

---

## Troubleshooting

### "Piper binary not found"
- Verify `PIPER_BINARY_PATH` in `.env`
- Check: `which piper`
- Reinstall if needed: `pip install piper-tts --upgrade`

### "Model not found: en_US-amy-medium.onnx"
- Download models to `PIPER_MODELS_PATH`
- Verify directory path exists and is readable
- Check permissions: `ls -la /usr/share/piper-tts/models/`

### Audio generation timeout
- Check system resources (CPU, memory, disk)
- Verify Piper process is running
- Increase timeout in `PiperTTSAdapter.js` if needed (default: 30s)

### Poor audio quality
- Try a different voice model
- Reduce input text length
- Check speaker speed settings

### Memory/Disk Issues
- Enable automatic cleanup: `cleanupOldAudioFiles()` runs periodically
- Increase temp directory cleanup frequency
- Monitor `/tmp/jeevacare-piper-tts/` disk usage

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

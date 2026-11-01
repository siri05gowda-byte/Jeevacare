# ClaraMed Integration Guide

**Status**: Pending Implementation  
**Last Updated**: October 7, 2026

---

## Overview

ClaraMed is the independent AI medical analysis platform that will handle:
- Medical document processing (OCR, classification)
- Chest X-ray inference using TorchXRayVision
- AI-powered medical summarization
- Analysis job management

JeevaCare has decoupled its medical image AI capabilities to prepare for ClaraMed integration.

---

## Architecture

### Before (Coupled)
```
JeevaCare Backend
├── Node.js API
├── Python Worker (TorchXRayVision)
├── MongoDB
└── Cloudinary Storage
```

### After (Decoupled)
```
JeevaCare Backend               ClaraMed Platform
├── Node.js API      ←→         ├── Python API
├── MongoDB          webhooks   ├── TorchXRayVision
└── Cloudinary       callbacks  ├── Job Queue
                                └── Model Cache
```

---

## Integration Requirements

### 1. ClaraMed Platform Setup

ClaraMed will be a standalone service with:
- **Base URL**: Configurable via `VITE_CLARAMED_BASE_URL` (frontend) and `CLARAMED_API_URL` (backend)
- **Authentication**: Shared JWT or API key
- **Endpoints**:
  - `POST /analyze` - Submit radiology image for analysis
  - `GET /status/:jobId` - Check analysis status
  - `POST /callback` - Webhook to notify JeevaCare when analysis complete

### 2. JeevaCare Backend Changes

#### Add ClaraMed API Client
Create `server/src/adapters/ClaraMedAPIClient.js`:

```javascript
class ClaraMedAPIClient {
  constructor() {
    this.baseUrl = config.claraMed?.apiUrl || null;
    this.apiKey = config.claraMed?.apiKey || null;
  }

  async submitAnalysis(radiologyRecord) {
    // Submit image URL + metadata to ClaraMed
    // Returns jobId for tracking
  }

  async getAnalysisStatus(jobId) {
    // Query ClaraMed for analysis status
  }

  async receiveCallback(callbackData) {
    // Process ClaraMed webhook callback
    // Update RadiologyRecord with AI analysis results
  }
}
```

#### Update RadiologyAIService
Restore auto-processing, but delegate to ClaraMed:

```javascript
static async autoProcessRadiologyStudy(radiologyId, requestingUser, options = {}) {
  const record = await RadiologyRecord.findById(radiologyId);
  
  // Submit to ClaraMed
  const jobId = await ClaraMedAPIClient.submitAnalysis(record);
  
  // Update record with ClaraMed job tracking
  await RadiologyRecord.findByIdAndUpdate(radiologyId, {
    $set: {
      'aiAnalysis.status': 'queued',
      'aiAnalysis.claraMedJobId': jobId,
      'aiJob.dispatchedAt': new Date(),
    },
  });
}
```

#### Add Webhook Endpoint
Create `server/src/routes/claraMedWebhookRoutes.js`:

```javascript
router.post('/webhook/claramed-callback', 
  authMiddleware, // Verify ClaraMed API key
  async (req, res) => {
    const { jobId, radiologyId, results } = req.body;
    
    // Update RadiologyRecord with AI analysis results
    await RadiologyRecord.findByIdAndUpdate(radiologyId, {
      $set: {
        'aiAnalysis.status': 'completed',
        'aiAnalysis.findings': results.findings,
        'aiAnalysis.summary': results.summary,
        'aiAnalysis.confidence': results.confidence,
        'aiAnalysis.analyzedAt': new Date(),
      },
    });
    
    res.json({ success: true });
  }
);
```

### 3. JeevaCare Frontend Changes

#### Add ClaraMed Button
Update `client/src/pages/RadiologyPage.jsx`:

```jsx
import { claraMedConfig } from '../config/claramed';

// After upload success
if (claraMedConfig.isConfigured()) {
  <button onClick={() => navigateToClaraMed(uploadedStudyId)}>
    Analyze with ClaraMed
  </button>
} else {
  <div className="bg-yellow-50 p-4">
    ClaraMed integration not configured. Contact administrator.
  </div>
}

const navigateToClaraMed = (radiologyId) => {
  const url = claraMedConfig.getAnalysisUrl(radiologyId, patientId);
  window.open(url, '_blank');
};
```

### 4. Environment Configuration

#### Backend `.env`
```
CLARAMED_API_URL=https://claramed.example.com
CLARAMED_API_KEY=your-api-key-here
CLARAMED_WEBHOOK_SECRET=your-webhook-secret-here
CLARAMED_CALLBACK_URL=https://jeevacare-backend.onrender.com/api/webhook/claramed-callback
```

#### Frontend `.env`
```
VITE_CLARAMED_BASE_URL=https://claramed.example.com
```

---

## Security Considerations

### Authentication
- **Option A**: Shared JWT - JeevaCare passes its JWT to ClaraMed, which validates against JeevaCare's public key
- **Option B**: API Key - ClaraMed issues API key to JeevaCare for server-to-server calls
- **Option C**: OAuth 2.0 - Full OAuth flow for user consent

**Recommended**: Option B (API Key) for simplicity + Option A (JWT) for user context

### Data Privacy
- **Image URLs**: Use signed Cloudinary URLs with expiration (1 hour)
- **Callback Authentication**: HMAC signature on webhook payloads
- **Patient Data**: Never pass patient name or DOB in query parameters
- **PHI Encryption**: All data in transit over HTTPS

### Authorization
- ClaraMed must verify that the requesting user has permission to access the radiology record
- JeevaCare backend validates callback requests before updating records

---

## Data Flow

### Upload → Analysis Flow
```
1. Patient uploads X-ray to JeevaCare
   ↓
2. JeevaCare saves RadiologyRecord + uploads to Cloudinary
   ↓
3. JeevaCare calls ClaraMed API: POST /analyze
   Body: { radiologyId, imageUrl (signed), patientId, metadata }
   ↓
4. ClaraMed queues job, returns jobId
   ↓
5. JeevaCare updates record: aiAnalysis.status = 'queued'
   ↓
6. ClaraMed processes (TorchXRayVision inference)
   ↓
7. ClaraMed sends webhook: POST /webhook/claramed-callback
   Body: { jobId, radiologyId, results: {...} }
   ↓
8. JeevaCare updates record: aiAnalysis.status = 'completed'
   ↓
9. Frontend polls /api/radiology/:id and displays results
```

### Alternative: Frontend-Direct Flow
```
1. Patient uploads X-ray to JeevaCare
   ↓
2. Frontend shows "Analyze with ClaraMed" button
   ↓
3. User clicks → opens ClaraMed in new tab with JWT
   ↓
4. ClaraMed validates JWT, fetches image from JeevaCare API
   ↓
5. ClaraMed performs analysis, displays results
   ↓
6. ClaraMed sends callback to JeevaCare with results
   ↓
7. Results appear in JeevaCare on next page refresh
```

**Recommended**: Backend-triggered flow (first option) for automatic processing

---

## Testing Strategy

### Phase 1: Stub Integration
- Mock ClaraMed API client that returns fake results immediately
- Verify JeevaCare can submit analysis requests
- Verify webhook callback updates RadiologyRecord correctly

### Phase 2: Local Development
- Run ClaraMed locally (localhost:8080)
- Configure JeevaCare to use local ClaraMed
- Test full flow with real TorchXRayVision inference

### Phase 3: Staging Deployment
- Deploy ClaraMed to staging environment
- Configure JeevaCare staging to use ClaraMed staging
- Test with real medical images
- Verify analysis results accuracy

### Phase 4: Production Deployment
- Deploy ClaraMed to production
- Gradual rollout: enable for subset of patients
- Monitor error rates, latency, accuracy
- Full production launch after validation

---

## Deployment Checklist

### ClaraMed Platform
- [ ] Deploy ClaraMed to Hugging Face Spaces (ZeroGPU)
- [ ] Configure TorchXRayVision model cache
- [ ] Set up Redis job queue
- [ ] Configure webhook callback URL
- [ ] Test inference endpoint with sample X-ray
- [ ] Monitor memory usage and latency

### JeevaCare Backend
- [ ] Add ClaraMed API client adapter
- [ ] Update RadiologyAIService for delegation
- [ ] Add webhook callback route
- [ ] Configure environment variables
- [ ] Test callback payload handling
- [ ] Update audit logging

### JeevaCare Frontend
- [ ] Add ClaraMed configuration
- [ ] Update RadiologyPage with ClaraMed button
- [ ] Handle ClaraMed unavailable state gracefully
- [ ] Update user documentation
- [ ] Test frontend → ClaraMed navigation

### Monitoring
- [ ] ClaraMed API error rate alerts
- [ ] Webhook callback failure alerts
- [ ] Analysis completion time tracking
- [ ] Model accuracy metrics
- [ ] Patient satisfaction surveys

---

## Rollback Plan

If ClaraMed integration causes issues:

1. **Disable auto-processing**: Set `CLARAMED_ENABLED=false`
2. **Preserve existing records**: All uploaded images remain accessible
3. **Manual review**: Radiologists can still review images without AI
4. **Graceful degradation**: Frontend shows "AI analysis unavailable"

---

## Timeline

| Phase | Description | Duration | Status |
|-------|-------------|----------|--------|
| 1 | ClaraMed platform development | 2-3 weeks | Not started |
| 2 | JeevaCare backend integration | 1 week | Not started |
| 3 | JeevaCare frontend updates | 3 days | Not started |
| 4 | Local testing | 1 week | Not started |
| 5 | Staging deployment | 1 week | Not started |
| 6 | Production launch | 2 weeks | Not started |

**Estimated Total**: 8-10 weeks

---

## References

- [TorchXRayVision GitHub](https://github.com/mlmed/torchxrayvision)
- [Hugging Face ZeroGPU Documentation](https://huggingface.co/docs/hub/spaces-zerogpu)
- [JeevaCare Zero-Cost TorchXRayVision Feasibility](./ZERO_COST_TORCHXRAYVISION_FEASIBILITY.md)
- [Pre-ClaraMed Dependency Map](./PRE_CLARAMD_DEPENDENCY_MAP.md)

---

**End of ClaraMed Integration Guide**

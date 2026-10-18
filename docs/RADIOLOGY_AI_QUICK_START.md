# Radiology AI - Quick Start Guide

## For Developers

### 5-Minute Setup (Mock Mode)

**No configuration needed!** The feature works out of the box in mock mode.

1. **Start the server**
   ```bash
   cd server
   npm start
   ```

2. **Test the service**
   ```bash
   # Check service status
   curl http://localhost:5000/api/radiology/ai-service-status

   # Should return: { "mode": "mock", "available": true }
   ```

3. **Use the API**
   ```javascript
   // In your React component
   import { analyzeRadiologyImage } from '../services/radiologyService';

   const handleAnalyze = async () => {
     const result = await analyzeRadiologyImage(radiologyId, { language: 'en' });
     console.log(result); // Mock data, clearly labeled
   };
   ```

Done! No model download, no Python setup, no GPU required.

---

## API Quick Reference

### Trigger Analysis
```http
POST /api/radiology/:radiologyId/analyze-image
Authorization: Bearer <token>
Content-Type: application/json

{
  "language": "en"  // Optional: en, hi, kn, te, ta, ml
}
```

**Response (Chest X-ray)**:
```json
{
  "success": true,
  "data": {
    "status": "completed",
    "detectedModality": "chest_xray",
    "findings": ["Normal cardiac silhouette", "Clear lung fields"],
    "summary": "Normal chest X-ray",
    "isMockData": true,
    "disclaimers": ["AI-generated analysis..."]
  }
}
```

**Response (Unsupported - CT/MRI/Ultrasound)**:
```json
{
  "success": true,
  "data": {
    "status": "unsupported_modality",
    "detectedModality": "ct_scan",
    "error": "CT Scan analysis is not yet supported..."
  }
}
```

### Check Status
```http
GET /api/radiology/:radiologyId/ai-status
Authorization: Bearer <token>
```

### Check Service
```http
GET /api/radiology/ai-service-status
# No auth required
```

---

## Frontend Integration

### Add to radiologyService.js
```javascript
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
```

### React Component Example
```jsx
const RadiologyAIButton = ({ radiologyId }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const result = await analyzeRadiologyImage(radiologyId);
      setAnalysis(result.data);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleAnalyze} disabled={loading}>
        {loading ? 'Analyzing...' : 'Analyze with AI'}
      </button>
      
      {analysis?.status === 'completed' && (
        <div className="ai-results">
          {analysis.isMockData && (
            <span className="badge">MOCK DATA</span>
          )}
          <h4>AI Analysis</h4>
          <p>{analysis.summary}</p>
          <ul>
            {analysis.findings.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
          <div className="disclaimers">
            {analysis.disclaimers.map((d, i) => (
              <p key={i} className="text-sm text-gray-600">{d}</p>
            ))}
          </div>
        </div>
      )}
      
      {analysis?.status === 'unsupported_modality' && (
        <div className="alert alert-warning">
          {analysis.error}
        </div>
      )}
    </div>
  );
};
```

---

## Testing

### Run Tests
```bash
cd server

# Test analyzer
npm test -- MedicalImageAnalyzer

# Test service
npm test -- RadiologyAIService

# Test routes
npm test -- radiologyRoutes.ai

# Run all
npm test
```

### Manual API Testing
```bash
# Get service status
curl http://localhost:5000/api/radiology/ai-service-status

# Analyze (requires valid auth token and radiology ID)
curl -X POST http://localhost:5000/api/radiology/RAD123/analyze-image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"language": "en"}'

# Check status
curl http://localhost:5000/api/radiology/RAD123/ai-status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Common Questions

### Q: Do I need to download anything?
**A:** No! Mock mode works immediately. Real inference requires manual model setup (optional).

### Q: Will this work on Render free tier?
**A:** Yes, in mock mode. Real inference needs 2GB+ RAM (paid plan).

### Q: What modalities are supported?
**A:** Chest X-rays only. CT/MRI/ultrasound return "unsupported_modality" status.

### Q: How do I know if it's mock data?
**A:** Check the `isMockData` flag in the response. Always `true` unless you've set up a real model.

### Q: Can I test the frontend without a backend?
**A:** Yes! Create a mock service:
```javascript
// mockRadiologyService.js
export const analyzeRadiologyImage = async () => ({
  data: {
    status: 'completed',
    findings: ['Mock finding 1', 'Mock finding 2'],
    isMockData: true
  }
});
```

### Q: How do I add a real model?
**A:** See `docs/MEDICAL_IMAGE_AI_SETUP.md` for complete instructions.

### Q: Is this safe for production?
**A:** Yes! Mock mode is explicitly labeled and all disclaimers are shown. Never fabricates clinical data.

---

## Troubleshooting

### "Service unavailable"
- Check backend is running
- Verify endpoint: `http://localhost:5000/api/radiology/ai-service-status`

### "Radiology record not found"
- Verify radiology ID exists in database
- Check user has permission to access that record

### "No image available for analysis"
- Radiology record must have `imageReference` field populated
- Image must be uploaded to Cloudinary first

### Mock mode when expecting real inference
- Check `MEDICAL_IMAGE_AI_ENABLED` is `true` in `.env`
- Verify model path is correct
- Confirm model inference script exists and is executable

---

## Next Steps

1. **Build UI** - Add analyze button to radiology detail page
2. **Test flow** - Upload X-ray → Analyze → View results
3. **Handle edge cases** - Unsupported modalities, errors, loading states
4. **Translations** - Translate UI elements for all 6 languages
5. **Optional**: Setup real inference following full guide

---

## Resources

- **Full Setup**: `docs/MEDICAL_IMAGE_AI_SETUP.md`
- **Implementation Plan**: `RADIOLOGY_AI_IMPLEMENTATION_PLAN.md`
- **Tests**: `server/src/adapters/__tests__/MedicalImageAnalyzer.test.js`
- **API Docs**: `README.md` (API Endpoints section)

---

**Remember**: Mock mode is not a limitation, it's a feature! It enables:
- ✅ Rapid development without ML dependencies
- ✅ Testing and demos without infrastructure
- ✅ Free-tier deployment with full functionality
- ✅ Clear separation between demo and production data

Happy coding! 🚀

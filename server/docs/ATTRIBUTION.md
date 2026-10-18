# Attribution & License Information

## TorchXRayVision

**License:** Apache 2.0 (open-source, permissive)  
**Repository:** https://github.com/mlmed/torchxrayvision  
**Paper:** "TorchXRayVision: A library of chest X-ray datasets and models"

### Citation

```bibtex
@article{cohen2020torchxrayvision,
  title={TorchXRayVision: A library of chest X-ray datasets and models},
  author={Cohen, Joseph Paul and Dao, Lily and Roth, Dan and others},
  journal={arXiv preprint arXiv:2102.05171},
  year={2021}
}
```

## ResNet50-ResNet512-All Model Weights

**License:** Apache 2.0 (free to use)  
**Training Data Sources:**
- NIH Chest X-Ray Dataset (free, public domain)
- RSNA Pneumonia Detection Challenge (free, public)
- SIIM-FISABELLA COVID-19 Detection (free, public)
- VinBigData Chest X-ray Abnormality Detection (free, public)

**Attribution:** Multi-dataset training (see TorchXRayVision repo for details)

## PyTorch

**License:** BSD (open-source)  
**Repository:** https://github.com/pytorch/pytorch  
**Use:** Deep learning framework for inference

## Scikit-Image

**License:** BSD (open-source)  
**Use:** Image preprocessing and utilities

## NumPy

**License:** BSD (open-source)  
**Use:** Numerical computation

---

## Important Disclaimers

⚠️ **NOT A CLINICAL TOOL**

This implementation is for **educational and research purposes only**:

1. **Not Validated for Clinical Use**
   - AI models have not been validated for diagnostic accuracy
   - No FDA approval or clinical validation
   - Predictions should not be used for clinical decision-making

2. **Always Require Professional Review**
   - Results must be reviewed by qualified radiologists
   - Never rely solely on AI output
   - Use as preliminary screening tool only

3. **No Medical Advice**
   - System is not providing medical diagnosis
   - Patient consultation with healthcare professionals required
   - For emergency conditions, contact medical services immediately

4. **Data Privacy Considerations**
   - Medical images contain sensitive patient information
   - Follow HIPAA/GDPR regulations when handling real patient data
   - Never use production patient data for testing

5. **Model Limitations**
   - Trained on specific populations and datasets
   - Performance may vary by demographics, image quality, pathology type
   - Rare conditions may have poor detection rates
   - See model card for detailed performance metrics

---

## License Compliance

This project complies with all open-source licenses:

✅ TorchXRayVision (Apache 2.0) - Attribution provided  
✅ PyTorch (BSD) - No restrictions  
✅ Scikit-Image (BSD) - No restrictions  
✅ NumPy (BSD) - No restrictions  
✅ Model weights (Apache 2.0) - Attribution provided  

**No proprietary or restricted components used.**

---

## Third-Party Components

See `server/package.json` and `client/package.json` for complete dependency list and licenses.

To view licenses of all dependencies:

```bash
npm ls --depth=0
npm ls licenses
```

To generate license report:

```bash
npm install license-checker -g
license-checker --json > licenses.json
```

---

## How to Cite This Work

```bibtex
@software{jeevacare2026,
  title={JeevaCare: Healthcare Platform with AI Radiology Analysis},
  author={JeevaCare Team},
  year={2026},
  url={https://github.com/your-org/JeevaCare},
  note={Uses TorchXRayVision for chest X-ray analysis}
}
```

Include mention of TorchXRayVision:

> "This work uses TorchXRayVision (Cohen et al., 2021) for automated chest X-ray analysis."

---

## Production Deployment Notes

When deploying to production:

1. **Include License Files**
   - Add `LICENSES/` folder with all open-source licenses
   - Include `ATTRIBUTION.md` in app documentation

2. **Disclaimers in UI**
   - Display "NOT FOR CLINICAL DIAGNOSIS" clearly
   - Include "Results reviewed by radiologist" note
   - Add "For research/educational purposes only"

3. **Data Handling**
   - Encrypt sensitive patient data at rest and in transit
   - Log all AI analysis requests for audit trail
   - Comply with healthcare regulations (HIPAA, GDPR, etc.)

4. **Model Documentation**
   - Link to model card: https://huggingface.co/torchxrayvision/resnet50-res512-all
   - Document performance metrics
   - Include known limitations

---

## Contact & Support

For questions about licensing or attribution:
- TorchXRayVision: https://github.com/mlmed/torchxrayvision/issues
- PyTorch: https://github.com/pytorch/pytorch
- Open source licenses: https://opensource.org

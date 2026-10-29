#!/usr/bin/env python3
"""
Chest X-Ray Inference Worker

Real deep-learning inference using TorchXRayVision + ResNet50.
Communicates with Node.js via JSON-RPC protocol over stdin/stdout.

Architecture:
- Input: JSON with image URL/path, device preference, and request ID
- Process: Load model, preprocess image, run inference
- Output: JSON with request ID, real pathology scores, confidence, metadata

Supported Modality: Chest Radiographs (18 pathologies)
"""

import json
import sys
import os
import io
import base64
import urllib.request
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import traceback

# Configure logging to stderr so stdout is reserved for JSON-RPC
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - ChestXRayWorker - %(levelname)s - %(message)s',
    stream=sys.stderr
)
logger = logging.getLogger(__name__)

# Import deep learning libraries
try:
    import torch
    import torchvision
    import torchxrayvision as xrv
    import skimage.io
    import numpy as np
    
    logger.info("✅ All deep learning libraries loaded successfully")
except ImportError as e:
    logger.error(f"❌ Failed to import required libraries: {e}")
    logger.error("Install with: pip install torch torchvision torchxrayvision scikit-image numpy")
    sys.exit(1)

# Global model cache
_MODEL_CACHE = {}
_DEVICE = "cpu"


class ChestXRayInferenceWorker:
    """Real chest X-ray inference using pretrained TorchXRayVision ResNet50."""
    
    DEFAULT_PATHOLOGIES = [
        "Atelectasis",
        "Consolidation",
        "Infiltration",
        "Pneumothorax",
        "Edema",
        "Emphysema",
        "Fibrosis",
        "Effusion",
        "Pneumonia",
        "Pleural_Thickening",
        "Cardiomegaly",
        "Nodule",
        "Mass",
        "Hernia",
        "Lung Lesion",
        "Fracture",
        "Lung Opacity",
        "Enlarged Cardiomediastinum"
    ]
    
    CONFIDENCE_THRESHOLD = 0.30  # Report findings above 30% confidence

    def __init__(self, model_name: str = "resnet50-res512-all", device: str = "cpu"):
        self.model_name = model_name
        self.device = device
        self.model = None
        self.pathologies = self.DEFAULT_PATHOLOGIES
        
        # Load from cache if already loaded
        if model_name in _MODEL_CACHE:
            self.model = _MODEL_CACHE[model_name]
            if hasattr(self.model, 'pathologies'):
                self.pathologies = list(self.model.pathologies)

    def load_model(self) -> Dict[str, Any]:
        """Load pretrained model from cache or TorchXRayVision hub."""
        global _MODEL_CACHE
        try:
            if self.model_name in _MODEL_CACHE:
                self.model = _MODEL_CACHE[self.model_name]
                if hasattr(self.model, 'pathologies'):
                    self.pathologies = list(self.model.pathologies)
                return {
                    "success": True,
                    "message": "Model loaded from cache",
                    "model": self.model_name,
                    "source": "cache",
                    "pathologies": self.pathologies
                }
            
            logger.info(f"Loading TorchXRayVision model: {self.model_name}")
            self.model = xrv.models.get_model(self.model_name)
            self.model = self.model.to(self.device)
            self.model.eval()
            
            _MODEL_CACHE[self.model_name] = self.model
            if hasattr(self.model, 'pathologies'):
                self.pathologies = list(self.model.pathologies)
            
            logger.info(f"✅ Model loaded successfully: {self.model_name} with {len(self.pathologies)} pathologies")
            
            return {
                "success": True,
                "message": "Model loaded successfully",
                "model": self.model_name,
                "source": "torchxrayvision",
                "pathologies": self.pathologies
            }
        except Exception as e:
            logger.error(f"❌ Failed to load model: {e}\n{traceback.format_exc()}")
            return {
                "success": False,
                "error": str(e),
                "message": "Model loading failed"
            }

    def _read_image(self, image_path: str) -> np.ndarray:
        """Fetch image from local path, http/https URL, or base64 data URL."""
        if not image_path or not isinstance(image_path, str):
            raise ValueError("Invalid or empty image path provided")

        image_path = image_path.strip()

        if image_path.startswith(('http://', 'https://')):
            logger.info(f"Downloading image from URL: {image_path[:80]}...")
            req = urllib.request.Request(
                image_path,
                headers={'User-Agent': 'JeevaCare-RadiologyWorker/1.0'}
            )
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = resp.read()
            if len(data) == 0:
                raise ValueError("Downloaded image payload is empty")
            return skimage.io.imread(io.BytesIO(data))

        elif image_path.startswith('data:'):
            logger.info("Decoding base64 image data URL...")
            if ',' not in image_path:
                raise ValueError("Malformed data URL format")
            b64_str = image_path.split(',', 1)[1]
            data = base64.b64decode(b64_str)
            if len(data) == 0:
                raise ValueError("Decoded base64 image payload is empty")
            return skimage.io.imread(io.BytesIO(data))

        else:
            # Local filesystem path
            path_obj = Path(image_path)
            if not path_obj.exists():
                raise FileNotFoundError(f"Local image file not found: {image_path}")
            return skimage.io.imread(str(path_obj))

    def preprocess_image(self, image_path: str) -> Dict[str, Any]:
        """Preprocess chest X-ray into standard TorchXRayVision 512x512 tensor."""
        try:
            raw_img = self._read_image(image_path)
            
            if raw_img is None or raw_img.size == 0:
                return {
                    "success": False,
                    "error": "Image is empty or unreadable",
                    "code": "INVALID_IMAGE"
                }

            original_shape = list(raw_img.shape)
            logger.info(f"Loaded image: shape={original_shape}, dtype={raw_img.dtype}")

            # Handle color channels -> convert to 2D grayscale
            if len(raw_img.shape) == 3:
                if raw_img.shape[2] == 4:
                    # RGBA -> take RGB
                    raw_img = raw_img[:, :, :3]
                # Weighted or mean RGB to grayscale
                img_gray = raw_img.mean(axis=2).astype(np.float32)
            elif len(raw_img.shape) == 2:
                img_gray = raw_img.astype(np.float32)
            else:
                return {
                    "success": False,
                    "error": f"Unsupported image dimensions: {raw_img.shape}",
                    "code": "INVALID_SHAPE"
                }

            # Check image variance (reject blank/uniform images)
            if np.std(img_gray) < 1.0:
                return {
                    "success": False,
                    "error": "Image appears to be blank or has insufficient contrast for analysis",
                    "code": "INADEQUATE_IMAGE_QUALITY"
                }

            # Normalize to [-1024, 1024] using TorchXRayVision dataset normalizer
            max_val = 65535.0 if img_gray.max() > 255.0 else 255.0
            img_norm = xrv.datasets.normalize(img_gray, maxval=max_val)

            # Apply standard Center Crop and Resizer to 512x512 for ResNet50
            transform = torchvision.transforms.Compose([
                xrv.datasets.XRayCenterCrop(),
                xrv.datasets.XRayResizer(512)
            ])
            img_transformed = transform(img_norm[None, :, :])
            img_tensor = torch.from_numpy(img_transformed).unsqueeze(0).float()

            return {
                "success": True,
                "tensor": img_tensor,
                "original_shape": original_shape,
                "tensor_shape": list(img_tensor.shape)
            }
        except Exception as e:
            logger.error(f"Image preprocessing error: {e}\n{traceback.format_exc()}")
            return {
                "success": False,
                "error": str(e),
                "code": "PREPROCESSING_FAILED"
            }

    def infer(self, image_path: str) -> Dict[str, Any]:
        """Run deep-learning inference on chest X-ray image."""
        try:
            # Ensure model is ready
            if self.model is None:
                load_res = self.load_model()
                if not load_res.get("success"):
                    return {
                        "success": False,
                        "error": load_res.get("error", "Model loading failed"),
                        "code": "MODEL_LOAD_FAILED"
                    }

            # Preprocess image
            prep_res = self.preprocess_image(image_path)
            if not prep_res.get("success"):
                return prep_res

            img_tensor = prep_res["tensor"].to(self.device)

            logger.info(f"Running TorchXRayVision inference on {self.device}...")
            with torch.no_grad():
                raw_preds = self.model(img_tensor).cpu()

            # ResNet50 outputs raw logits; sigmoid gives probabilities in [0, 1]
            probabilities = torch.sigmoid(raw_preds)[0].numpy()

            findings = []
            all_pathologies = {}

            for idx, pathology in enumerate(self.pathologies):
                if idx < len(probabilities):
                    score = float(probabilities[idx])
                    all_pathologies[pathology] = round(score, 4)
                    
                    if score >= self.CONFIDENCE_THRESHOLD:
                        severity = "high" if score > 0.70 else "moderate" if score > 0.50 else "low"
                        findings.append({
                            "pathology": pathology.replace('_', ' '),
                            "rawPathology": pathology,
                            "confidence": round(score, 4),
                            "severity": severity
                        })

            findings.sort(key=lambda x: x["confidence"], reverse=True)

            # Plain-language grounded summary
            if findings:
                top_findings_str = ", ".join([f"{f['pathology']} ({f['confidence']:.1%})" for f in findings[:3]])
                summary = f"Automated analysis identified findings exceeding the clinical reporting threshold ({self.CONFIDENCE_THRESHOLD:.0%}): {top_findings_str}."
            else:
                summary = f"No focal abnormalities detected exceeding the reporting threshold ({self.CONFIDENCE_THRESHOLD:.0%}) across {len(self.pathologies)} supported chest pathologies."

            limitations = [
                "TorchXRayVision ResNet-50 is a deep-learning clinical decision-support model, not an autonomous diagnostic system.",
                f"Evaluates only {len(self.pathologies)} specific chest radiograph pathologies and cannot diagnose conditions outside this set.",
                "Absence of reported findings does not guarantee normal health or absence of pathology.",
                "Clinical correlation and formal interpretation by a licensed radiologist are strictly required."
            ]

            return {
                "success": True,
                "isMockData": False,
                "model": f"TorchXRayVision-{self.model_name}",
                "pipelineVersion": "2.0.0-torchxrayvision",
                "device": self.device,
                "modality": "chest_xray",
                "findings": findings,
                "positiveFindings": len(findings),
                "pathologiesTested": len(self.pathologies),
                "confidenceThreshold": self.CONFIDENCE_THRESHOLD,
                "summary": summary,
                "allPathologies": all_pathologies,
                "limitations": limitations,
                "metadata": {
                    "originalShape": prep_res["original_shape"],
                    "tensorShape": prep_res["tensor_shape"],
                    "thresholdUsed": self.CONFIDENCE_THRESHOLD,
                    "modelArchitecture": "ResNet50",
                    "weights": "resnet50-res512-all"
                }
            }
        except Exception as e:
            logger.error(f"Inference execution failed: {e}\n{traceback.format_exc()}")
            return {
                "success": False,
                "isMockData": False,
                "error": str(e),
                "code": "INFERENCE_FAILED"
            }


def handle_request(request: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle single JSON-RPC request from Node.js.
    Always includes the request 'id' so Node.js can resolve the request promise.
    """
    req_id = request.get("id")
    try:
        method = request.get("method")
        params = request.get("params", {})
        
        worker = ChestXRayInferenceWorker(
            model_name=params.get("model_name", "resnet50-res512-all"),
            device=params.get("device", "cpu")
        )
        
        if method == "load":
            result = worker.load_model()
        elif method == "infer":
            image_path = params.get("image_path")
            if not image_path:
                return {"id": req_id, "error": "Missing image_path parameter"}
            result = worker.infer(image_path)
        elif method == "preprocess":
            image_path = params.get("image_path")
            if not image_path:
                return {"id": req_id, "error": "Missing image_path parameter"}
            result = worker.preprocess_image(image_path)
            # Remove tensor from JSON response
            if "tensor" in result:
                del result["tensor"]
        elif method == "status":
            result = {
                "ready": True,
                "model": "resnet50-res512-all",
                "device": "cpu",
                "pathologies": worker.DEFAULT_PATHOLOGIES
            }
        else:
            return {"id": req_id, "error": f"Unknown RPC method: {method}"}
            
        return {"id": req_id, "result": result}
    except Exception as e:
        logger.error(f"Request handler error: {e}\n{traceback.format_exc()}")
        return {"id": req_id, "error": str(e)}


def main():
    """Main JSON-RPC line loop reading from stdin and outputting to stdout."""
    logger.info("ChestXRayInferenceWorker daemon started, awaiting Node.js RPC requests...")
    try:
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                req = json.loads(line)
                resp = handle_request(req)
                sys.stdout.write(json.dumps(resp) + "\n")
                sys.stdout.flush()
            except json.JSONDecodeError as err:
                sys.stdout.write(json.dumps({"error": f"Invalid JSON input: {str(err)}"}) + "\n")
                sys.stdout.flush()
    except KeyboardInterrupt:
        logger.info("ChestXRayInferenceWorker shutting down")
        sys.exit(0)
    except Exception as err:
        logger.error(f"Fatal worker error: {err}\n{traceback.format_exc()}")
        sys.exit(1)


if __name__ == "__main__":
    main()

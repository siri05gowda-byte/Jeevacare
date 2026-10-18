#!/usr/bin/env python3
"""
Chest X-Ray Inference Worker

Real deep-learning inference using TorchXRayVision + ResNet50.
Runs as a standalone Python process, communicating with Node.js via JSON.

Architecture:
- Input: JSON with image URL/path, device preference
- Process: Load model, preprocess image, run inference
- Output: JSON with pathology scores, confidence, metadata

Cost: ₹0 (free/open-source models only)
Hardware: CPU-optimized (no GPU required)
"""

import json
import sys
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import traceback

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - ChestXRayWorker - %(levelname)s - %(message)s'
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
    logger.error("Install with: pip install torch torchxrayvision scikit-image")
    sys.exit(1)

# Global model cache
_MODEL_CACHE = {}
_DEVICE = "cpu"  # CPU only (no CUDA for Intel HD Graphics)


class ChestXRayInferenceWorker:
    """Real chest X-ray inference using pretrained DenseNet/ResNet."""
    
    # 18 pathologies detected by TorchXRayVision models
    PATHOLOGIES = [
        "Atelectasis",
        "Cardiomegaly", 
        "Consolidation",
        "Edema",
        "Effusion",
        "Emphysema",
        "Fibrosis",
        "Infiltration",
        "Mass",
        "Nodule",
        "Pleural Thickening",
        "Pneumonia",
        "Pneumothorax",
        "Tortuous Aorta",
        "Tuberculosis",
        "Enlarged Cardiomediastinum",
        "Subcutaneous Emphysema",
        "Aortic Enlargement"
    ]
    
    # Confidence threshold for reporting findings
    CONFIDENCE_THRESHOLD = 0.3  # Report findings above 30% confidence
    
    def __init__(self, model_name: str = "resnet50-res512-all", device: str = "cpu"):
        """
        Initialize inference worker.
        
        Args:
            model_name: TorchXRayVision model identifier
            device: "cpu" or "cuda" (cuda not supported on Intel HD)
        """
        self.model_name = model_name
        self.device = device
        self.model = None
        self.metadata = {
            "model": model_name,
            "device": device,
            "pathologies": self.PATHOLOGIES,
            "confidence_threshold": self.CONFIDENCE_THRESHOLD
        }
        logger.info(f"ChestXRayInferenceWorker initialized: model={model_name}, device={device}")
    
    def load_model(self) -> Dict[str, Any]:
        """
        Load pretrained model from HuggingFace hub or cache.
        
        Returns:
            Status dict with success flag and metadata
        """
        try:
            # Check cache first
            if self.model_name in _MODEL_CACHE:
                logger.info(f"✅ Model loaded from cache: {self.model_name}")
                self.model = _MODEL_CACHE[self.model_name]
                return {
                    "success": True,
                    "message": f"Model loaded from cache",
                    "model": self.model_name,
                    "source": "cache"
                }
            
            logger.info(f"Loading model from disk/cache: {self.model_name}")
            
            # Load model using correct TorchXRayVision API
            # get_model(weights) where weights is the model name
            self.model = xrv.models.get_model(self.model_name)
            
            # Move to device (CPU)
            self.model = self.model.to(self.device)
            self.model.eval()  # Set to evaluation mode
            
            # Cache model
            _MODEL_CACHE[self.model_name] = self.model
            
            logger.info(f"✅ Model loaded successfully: {self.model_name}")
            
            return {
                "success": True,
                "message": f"Model loaded from HuggingFace",
                "model": self.model_name,
                "source": "huggingface",
                "weights_url": "https://huggingface.co/torchxrayvision/resnet50-res512-all"
            }
        
        except Exception as e:
            logger.error(f"❌ Failed to load model: {e}\n{traceback.format_exc()}")
            return {
                "success": False,
                "error": str(e),
                "message": "Model loading failed - check internet connection and HuggingFace access"
            }
    
    def preprocess_image(self, image_path: str) -> Dict[str, Any]:
        """
        Load and preprocess image for inference.
        
        Args:
            image_path: Path or URL to chest X-ray image
            
        Returns:
            Dict with preprocessed tensor and metadata, or error
        """
        try:
            logger.info(f"Loading image: {image_path}")
            
            # Load image
            img = skimage.io.imread(image_path)
            logger.info(f"Image shape: {img.shape}, dtype: {img.dtype}")
            
            # Validate image
            if img.size == 0:
                return {
                    "success": False,
                    "error": "Image is empty",
                    "code": "INVALID_IMAGE"
                }
            
            # Normalize to [0, 1]
            if img.dtype == np.uint8:
                img = img.astype(np.float32) / 255.0
            elif img.dtype == np.uint16:
                img = img.astype(np.float32) / 65535.0
            
            # Convert to grayscale if needed
            if len(img.shape) > 2:
                # Multi-channel - convert to grayscale
                img = img[:, :, 0]  # Take first channel (R for RGB, or only channel for RGBA)
                logger.info(f"Converted to grayscale: {img.shape}")
            
            # Ensure 2D
            if len(img.shape) != 2:
                return {
                    "success": False,
                    "error": f"Image has invalid shape: {img.shape}",
                    "code": "INVALID_SHAPE"
                }
            
            # Apply TorchXRayVision normalization
            img_normalized = xrv.datasets.normalize(img, 255)
            
            # Apply center crop transform
            transform = torchvision.transforms.Compose([
                xrv.datasets.XRayCenterCrop()
            ])
            
            img_transformed = transform(img_normalized[None, :, :])
            
            # Convert to tensor
            img_tensor = torch.from_numpy(img_transformed).unsqueeze(0).float()
            
            logger.info(f"Preprocessing complete: tensor shape {img_tensor.shape}")
            
            return {
                "success": True,
                "tensor_shape": list(img_tensor.shape),
                "original_shape": list(img.shape),
                "preprocessed": True
            }
        
        except Exception as e:
            logger.error(f"❌ Preprocessing failed: {e}\n{traceback.format_exc()}")
            return {
                "success": False,
                "error": str(e),
                "code": "PREPROCESSING_FAILED"
            }
    
    def infer(self, image_path: str) -> Dict[str, Any]:
        """
        Run inference on chest X-ray image.
        
        Args:
            image_path: Path or URL to image
            
        Returns:
            Dict with pathology scores, findings, and metadata
        """
        try:
            # Ensure model is loaded
            if self.model is None:
                load_result = self.load_model()
                if not load_result.get("success"):
                    return {
                        "success": False,
                        "error": "Model failed to load",
                        "details": load_result
                    }
            
            # Preprocess image
            logger.info(f"Preprocessing image...")
            img = skimage.io.imread(image_path)
            
            # Validate and normalize
            if len(img.shape) > 2:
                img = img[:, :, 0]
            if len(img.shape) != 2:
                raise ValueError(f"Invalid image shape: {img.shape}")
            
            img_normalized = xrv.datasets.normalize(img, 255)
            transform = torchvision.transforms.Compose([
                xrv.datasets.XRayCenterCrop()
            ])
            img_transformed = transform(img_normalized[None, :, :])
            img_tensor = torch.from_numpy(img_transformed).unsqueeze(0).float()
            
            # Move to device
            img_tensor = img_tensor.to(self.device)
            
            # Run inference
            logger.info(f"Running inference on {self.device}...")
            with torch.no_grad():
                predictions = self.model(img_tensor).cpu()
            
            # Convert to probabilities (predictions are logits)
            probabilities = torch.sigmoid(predictions)[0].numpy()
            
            logger.info(f"Inference complete. Shape: {probabilities.shape}")
            
            # Build pathology findings
            findings = []
            pathology_scores = {}
            
            for idx, pathology in enumerate(self.PATHOLOGIES):
                score = float(probabilities[idx])
                pathology_scores[pathology] = score
                
                # Report findings above threshold
                if score >= self.CONFIDENCE_THRESHOLD:
                    findings.append({
                        "pathology": pathology,
                        "confidence": score,
                        "severity": "high" if score > 0.7 else "moderate" if score > 0.5 else "low"
                    })
            
            # Sort findings by confidence
            findings.sort(key=lambda x: x["confidence"], reverse=True)
            
            # Generate summary
            if findings:
                top_finding = findings[0]
                summary = f"Possible {top_finding['pathology'].lower()} detected with {top_finding['confidence']:.1%} confidence"
            else:
                summary = "No significant abnormalities detected at threshold"
            
            return {
                "success": True,
                "isMockData": False,
                "model": self.model_name,
                "device": self.device,
                "findings": findings,
                "summary": summary,
                "all_pathologies": pathology_scores,
                "confidence_threshold": self.CONFIDENCE_THRESHOLD,
                "pathologies_tested": len(self.PATHOLOGIES),
                "positive_findings": len(findings)
            }
        
        except Exception as e:
            logger.error(f"❌ Inference failed: {e}\n{traceback.format_exc()}")
            return {
                "success": False,
                "error": str(e),
                "code": "INFERENCE_FAILED",
                "isMockData": False
            }


def handle_request(request: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle single RPC request from Node.js.
    
    Protocol:
    - request: {"method": "load" | "infer", "params": {...}}
    - response: {"result": {...}} or {"error": "..."}
    """
    try:
        method = request.get("method")
        params = request.get("params", {})
        
        logger.info(f"Processing request: method={method}")
        
        worker = ChestXRayInferenceWorker(
            model_name=params.get("model_name", "resnet50-res512-all"),
            device=params.get("device", "cpu")
        )
        
        if method == "load":
            result = worker.load_model()
        elif method == "infer":
            image_path = params.get("image_path")
            if not image_path:
                return {"error": "Missing image_path"}
            result = worker.infer(image_path)
        elif method == "status":
            result = {
                "ready": True,
                "model": params.get("model_name", "resnet50-res512-all"),
                "device": "cpu",
                "pathologies": len(ChestXRayInferenceWorker.PATHOLOGIES)
            }
        else:
            return {"error": f"Unknown method: {method}"}
        
        return {"result": result}
    
    except Exception as e:
        logger.error(f"Request handling error: {e}\n{traceback.format_exc()}")
        return {"error": str(e)}


def main():
    """
    Main entry point for JSON-RPC communication with Node.js.
    Reads JSON lines from stdin, processes, writes JSON to stdout.
    """
    logger.info("ChestXRayInferenceWorker started, waiting for requests...")
    
    try:
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            
            try:
                request = json.loads(line)
                response = handle_request(request)
                print(json.dumps(response))
                sys.stdout.flush()
            
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON: {e}")
                print(json.dumps({"error": f"Invalid JSON: {e}"}))
                sys.stdout.flush()
    
    except KeyboardInterrupt:
        logger.info("ChestXRayInferenceWorker shut down")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Unexpected error: {e}\n{traceback.format_exc()}")
        sys.exit(1)


if __name__ == "__main__":
    main()

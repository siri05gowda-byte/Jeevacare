#!/usr/bin/env python3
"""
Memory Measurement Script for TorchXRayVision

Measures actual memory usage at different stages:
1. Baseline (Python + imports)
2. After loading PyTorch/TorchXRayVision
3. After loading model
4. During inference
5. After inference cleanup

DO NOT DEPLOY - Local testing only
"""

import sys
import os
import json
import psutil
import time
from pathlib import Path

def get_memory_mb():
    """Get current process memory usage in MB."""
    process = psutil.Process(os.getpid())
    mem = process.memory_info().rss / (1024 * 1024)  # Convert to MB
    return round(mem, 2)

def print_memory(stage):
    """Print current memory usage."""
    mem_mb = get_memory_mb()
    print(f"[{stage}] Memory: {mem_mb} MB", file=sys.stderr)
    return mem_mb

# Stage 1: Baseline
baseline_mem = print_memory("Baseline")

# Stage 2: Import deep learning libraries
print("\nImporting PyTorch and TorchXRayVision...", file=sys.stderr)
import torch
import torchvision
import torchxrayvision as xrv
import numpy as np
from PIL import Image

imports_mem = print_memory("After imports")
print(f"  Import overhead: +{imports_mem - baseline_mem:.2f} MB\n", file=sys.stderr)

# Stage 3: Load model
print("Loading TorchXRayVision ResNet50 model...", file=sys.stderr)
model_name = "resnet50-res512-all"
device = "cpu"

model = xrv.models.get_model(model_name)
model = model.to(device)
model.eval()

model_loaded_mem = print_memory("After model load")
print(f"  Model overhead: +{model_loaded_mem - imports_mem:.2f} MB", file=sys.stderr)
print(f"  Model pathologies: {len(model.pathologies)}", file=sys.stderr)
print(f"  Device: {device}\n", file=sys.stderr)

# Stage 4: Create dummy image for inference
print("Creating dummy 512x512 grayscale image...", file=sys.stderr)
dummy_img = np.random.rand(512, 512).astype(np.float32)

# Normalize using TorchXRayVision standard
img_norm = xrv.datasets.normalize(dummy_img, maxval=255.0)

# Apply transforms
transform = torchvision.transforms.Compose([
    xrv.datasets.XRayCenterCrop(),
    xrv.datasets.XRayResizer(512)
])
img_transformed = transform(img_norm[None, :, :])
img_tensor = torch.from_numpy(img_transformed).unsqueeze(0).float().to(device)

preprocess_mem = print_memory("After preprocessing")
print(f"  Preprocessing overhead: +{preprocess_mem - model_loaded_mem:.2f} MB", file=sys.stderr)
print(f"  Tensor shape: {img_tensor.shape}\n", file=sys.stderr)

# Stage 5: Run inference
print("Running inference...", file=sys.stderr)
start_time = time.time()

with torch.no_grad():
    raw_preds = model(img_tensor).cpu()

end_time = time.time()
inference_time_ms = (end_time - start_time) * 1000

inference_mem = print_memory("During inference")
print(f"  Inference overhead: +{inference_mem - preprocess_mem:.2f} MB", file=sys.stderr)
print(f"  Inference time: {inference_time_ms:.0f} ms\n", file=sys.stderr)

# Stage 6: Post-processing
probabilities = torch.sigmoid(raw_preds)[0].numpy()
findings = []
for idx, pathology in enumerate(model.pathologies):
    if idx < len(probabilities):
        score = float(probabilities[idx])
        if score >= 0.30:  # Threshold
            findings.append({
                "pathology": pathology,
                "confidence": round(score, 4)
            })

postprocess_mem = print_memory("After post-processing")
print(f"  Findings detected: {len(findings)}", file=sys.stderr)

# Stage 7: Cleanup
del img_tensor
del raw_preds
del probabilities
import gc
gc.collect()

cleanup_mem = print_memory("After cleanup")
print(f"  Memory released: -{postprocess_mem - cleanup_mem:.2f} MB\n", file=sys.stderr)

# Summary
print("=" * 60, file=sys.stderr)
print("MEMORY USAGE SUMMARY", file=sys.stderr)
print("=" * 60, file=sys.stderr)
print(f"Baseline (Python):           {baseline_mem:>8.2f} MB", file=sys.stderr)
print(f"After imports:               {imports_mem:>8.2f} MB  (+{imports_mem - baseline_mem:.2f})", file=sys.stderr)
print(f"After model load:            {model_loaded_mem:>8.2f} MB  (+{model_loaded_mem - imports_mem:.2f})", file=sys.stderr)
print(f"Peak during inference:       {inference_mem:>8.2f} MB  (+{inference_mem - model_loaded_mem:.2f})", file=sys.stderr)
print(f"After cleanup:               {cleanup_mem:>8.2f} MB  (-{postprocess_mem - cleanup_mem:.2f})", file=sys.stderr)
print("=" * 60, file=sys.stderr)
print(f"\nInference latency (CPU): {inference_time_ms:.0f} ms", file=sys.stderr)
print(f"Render Free Tier: 512 MB", file=sys.stderr)
print(f"Fits in 512MB? {'✅ YES' if inference_mem <= 512 else '❌ NO'}", file=sys.stderr)
print(f"Fits in 1GB? {'✅ YES' if inference_mem <= 1024 else '❌ NO'}", file=sys.stderr)
print("=" * 60, file=sys.stderr)

# Output JSON result for programmatic parsing
result = {
    "baseline_mb": baseline_mem,
    "imports_mb": imports_mem,
    "model_loaded_mb": model_loaded_mem,
    "inference_peak_mb": inference_mem,
    "cleanup_mb": cleanup_mem,
    "inference_latency_ms": inference_time_ms,
    "fits_512mb": inference_mem <= 512,
    "fits_1024mb": inference_mem <= 1024,
    "device": device,
    "model": model_name,
    "findings_count": len(findings)
}

print(json.dumps(result, indent=2))

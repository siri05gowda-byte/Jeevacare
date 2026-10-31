#!/usr/bin/env node
/**
 * Setup Python Virtual Environment for TorchXRayVision Inference
 * 
 * Ensures a dedicated, isolated Python environment (.venv) exists
 * and contains all pinned deep learning dependencies (PyTorch CPU, TorchXRayVision).
 * Runs during build step on Render and local production builds.
 * 
 * FATAL on any failure: exits with code 1 if dependencies cannot be installed or verified.
 */

import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, '..', '..');
const venvDir = path.join(serverDir, '.venv');
const requirementsPath = path.join(serverDir, 'requirements.txt');

console.log('===========================================================');
console.log('🌱 JeevaCare: Setting up Python Environment for ML Inference');
console.log('===========================================================');
console.log(`Working directory: ${serverDir}`);
console.log(`Target .venv path: ${venvDir}`);

// 1. Locate host Python binary
function findHostPython() {
  if (process.env.PYTHON_PATH && fs.existsSync(process.env.PYTHON_PATH)) {
    return process.env.PYTHON_PATH;
  }
  const candidates = process.platform === 'win32'
    ? ['python', 'python3', 'py']
    : ['python3', 'python'];

  for (const bin of candidates) {
    try {
      const ver = execSync(`${bin} --version 2>&1`, { encoding: 'utf8' }).trim();
      console.log(`✓ Found host Python: ${bin} (${ver})`);
      return bin;
    } catch (e) {
      // try next
    }
  }
  throw new Error('No Python interpreter found on the system. Python 3.8+ is required.');
}

// 2. Determine paths inside venv
function getVenvPaths() {
  const isWin = process.platform === 'win32';
  return {
    python: isWin ? path.join(venvDir, 'Scripts', 'python.exe') : path.join(venvDir, 'bin', 'python'),
    pip: isWin ? path.join(venvDir, 'Scripts', 'pip.exe') : path.join(venvDir, 'bin', 'pip'),
  };
}

async function main() {
  const hostPython = findHostPython();
  const venvPaths = getVenvPaths();

  // If already in a working local environment where system python has all ML libraries,
  // we can use it or create a venv. On Linux/Render, a dedicated .venv is required.
  const isCIorRender = process.env.RENDER || process.env.CI || process.platform !== 'win32';

  // 3. Create or reuse virtual environment
  let needsVenvCreation = !fs.existsSync(venvPaths.python);

  if (needsVenvCreation) {
    console.log(`\n📦 Creating Python virtual environment at ${venvDir}...`);
    try {
      execSync(`"${hostPython}" -m venv "${venvDir}"`, { stdio: 'inherit' });
      console.log('✓ Virtual environment created successfully.');
    } catch (venvErr) {
      console.error('❌ Failed to create virtual environment:', venvErr.message);
      if (isCIorRender) {
        throw new Error(`Virtualenv creation failed on Render. Ensure python3-venv is present: ${venvErr.message}`);
      }
    }
  } else {
    console.log(`✓ Existing virtual environment found at: ${venvDir}`);
  }

  // Determine active Python and Pip to use for installation
  let activePython = fs.existsSync(venvPaths.python) ? venvPaths.python : hostPython;
  let activePip = fs.existsSync(venvPaths.pip) ? venvPaths.pip : `${hostPython} -m pip`;

  console.log(`Active Python: ${activePython}`);
  console.log(`Active Pip:    ${activePip}`);

  // 4. Verify requirements file exists
  if (!fs.existsSync(requirementsPath)) {
    throw new Error(`requirements.txt not found at ${requirementsPath}`);
  }

  // 5. Upgrade pip in the environment
  console.log('\n⬆️  Upgrading pip...');
  try {
    execSync(`"${activePython}" -m pip install --upgrade pip`, { stdio: 'inherit' });
  } catch (e) {
    console.warn('⚠️  Pip upgrade warning (non-fatal):', e.message);
  }

  // 6. Install pinned dependencies from requirements.txt
  console.log(`\n📦 Installing pinned dependencies from ${requirementsPath}...`);
  try {
    execSync(`"${activePython}" -m pip install --no-cache-dir -r "${requirementsPath}"`, {
      stdio: 'inherit',
    });
    console.log('✓ All Python packages installed successfully.');
  } catch (installErr) {
    console.error('❌ FATAL: Failed to install Python dependencies from requirements.txt');
    console.error(installErr.message);
    process.exit(1);
  }

  // 7. Verify all ML libraries import cleanly
  console.log('\n🔍 Verifying ML library imports (torch, torchvision, torchxrayvision, skimage, numpy)...');
  const verifyCmd = `"${activePython}" -c "import torch, torchvision, torchxrayvision as xrv, skimage, numpy as np; print('   - PyTorch:', torch.__version__); print('   - TorchXRayVision:', xrv.__version__); print('   - Scikit-Image:', skimage.__version__); print('   - NumPy:', np.__version__); print('   - Device availability:', 'CPU' if not torch.cuda.is_available() else 'CUDA')"`;
  
  try {
    execSync(verifyCmd, { stdio: 'inherit' });
    console.log('✅ All deep learning dependencies verified successfully.');
  } catch (verifyErr) {
    console.error('❌ FATAL: Dependency verification failed. Required imports could not be resolved in the Python environment:');
    console.error(verifyErr.message);
    process.exit(1);
  }

  // 8. Pre-download / pre-warm model weights into cache
  console.log('\n📥 Pre-warming TorchXRayVision ResNet50 model weights...');
  const prewarmCmd = `"${activePython}" -c "import torchxrayvision as xrv; m = xrv.models.get_model('resnet50-res512-all'); print('[OK] ResNet50 loaded. Pathologies supported:', len(m.pathologies))"`;
  try {
    execSync(prewarmCmd, { stdio: 'inherit', timeout: 120000 });
    console.log('✅ Model weights pre-warmed and cached successfully.');
  } catch (prewarmErr) {
    console.warn('⚠️  Model pre-warming deferred to runtime (non-fatal):', prewarmErr.message);
  }

  console.log('\n===========================================================');
  console.log('🎉 Python ML Environment Setup Complete & Verified');
  console.log('===========================================================');
}

main().catch(err => {
  console.error('\n❌ FATAL Python environment setup error:', err);
  process.exit(1);
});

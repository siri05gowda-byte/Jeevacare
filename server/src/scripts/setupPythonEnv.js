#!/usr/bin/env node
/**
 * Setup Python 3.11 Virtual Environment for TorchXRayVision Inference
 * 
 * Guarantees a dedicated, isolated Python 3.11 environment (.venv) exists
 * and contains all pinned deep learning dependencies (PyTorch 2.3.1 CPU, TorchXRayVision 1.5.5).
 * 
 * Works seamlessly on Render Linux (Ubuntu) where system Python defaults to 3.14,
 * by detecting or provisioning Python 3.11.x and creating an isolated .venv.
 * 
 * FATAL on any failure: exits with code 1 if dependencies cannot be installed or verified.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, '..', '..');
const venvDir = path.join(serverDir, '.venv');
const requirementsPath = path.join(serverDir, 'requirements.txt');
const pythonVersionFile = path.join(serverDir, '.python-version');
const rootPythonVersionFile = path.resolve(serverDir, '..', '.python-version');

console.log('===========================================================');
console.log('🌱 JeevaCare: Setting up Python 3.11 Environment for ML Inference');
console.log('===========================================================');
console.log(`Working directory: ${serverDir}`);
console.log(`Target .venv path: ${venvDir}`);

// 1. Determine target Python major.minor (must be 3.11 for PyTorch 2.3.1 CPU)
const TARGET_VERSION = '3.11';
let pinnedFullVersion = '3.11.10';
if (fs.existsSync(pythonVersionFile)) {
  pinnedFullVersion = fs.readFileSync(pythonVersionFile, 'utf8').trim() || pinnedFullVersion;
} else if (fs.existsSync(rootPythonVersionFile)) {
  pinnedFullVersion = fs.readFileSync(rootPythonVersionFile, 'utf8').trim() || pinnedFullVersion;
} else if (process.env.PYTHON_VERSION) {
  pinnedFullVersion = process.env.PYTHON_VERSION.trim();
}
console.log(`Target Python version: ${TARGET_VERSION} (pinned release: ${pinnedFullVersion})`);

// Helper: Check if a binary is Python 3.11
function isPython311(bin) {
  try {
    const out = execSync(`"${bin}" -c "import sys; print(f'{sys.version_info[0]}.{sys.version_info[1]}')"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
      timeout: 10000,
    }).trim();
    return out === TARGET_VERSION;
  } catch (e) {
    return false;
  }
}

// Helper: Get full Python version string
function getPythonVersionString(bin) {
  try {
    return execSync(`"${bin}" --version 2>&1`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
      timeout: 5000,
    }).trim();
  } catch (e) {
    return 'unknown';
  }
}

// 2. Determine paths inside venv
function getVenvPaths() {
  const isWin = process.platform === 'win32';
  return {
    python: isWin ? path.join(venvDir, 'Scripts', 'python.exe') : path.join(venvDir, 'bin', 'python'),
    pip: isWin ? path.join(venvDir, 'Scripts', 'pip.exe') : path.join(venvDir, 'bin', 'pip'),
  };
}

// 3. Find or install Python 3.11 interpreter
function findOrProvisionPython311() {
  // Option A: Explicit PYTHON_PATH
  if (process.env.PYTHON_PATH && fs.existsSync(process.env.PYTHON_PATH)) {
    if (isPython311(process.env.PYTHON_PATH)) {
      console.log(`✓ Using PYTHON_PATH override: ${process.env.PYTHON_PATH} (${getPythonVersionString(process.env.PYTHON_PATH)})`);
      return process.env.PYTHON_PATH;
    } else {
      console.warn(`⚠️  PYTHON_PATH is set to ${process.env.PYTHON_PATH} (${getPythonVersionString(process.env.PYTHON_PATH)}), but Python 3.11 is required. Searching other candidates...`);
    }
  }

  // Option B: Candidate interpreters
  const isWin = process.platform === 'win32';
  const candidates = isWin
    ? ['py -3.11', 'python3.11', 'python', 'python3']
    : [
        'python3.11',
        '/opt/render/project/.pyenv/shims/python3.11',
        '/opt/render/project/.pyenv/versions/3.11.10/bin/python',
        '/opt/render/project/.pyenv/versions/3.11.9/bin/python',
        '/root/.pyenv/shims/python3.11',
        '/usr/bin/python3.11',
        '/usr/local/bin/python3.11',
        'python3',
        'python',
      ];

  for (const bin of candidates) {
    if (isPython311(bin)) {
      console.log(`✓ Found compatible host Python 3.11 interpreter: ${bin} (${getPythonVersionString(bin)})`);
      return bin;
    }
  }

  // If on Linux/Render and system Python is incompatible (e.g. Render default 3.14)
  if (!isWin) {
    console.log(`\n⬇️  No host Python 3.11 interpreter found in PATH (host system has ${getPythonVersionString('python3')}).`);
    console.log('⬇️  Provisioning standalone, portable CPython 3.11.10 (python-build-standalone for Linux x86_64)...');
    
    const standaloneDir = path.join(serverDir, '.standalone-python');
    const standalonePython = path.join(standaloneDir, 'python', 'bin', 'python3');

    if (fs.existsSync(standalonePython) && isPython311(standalonePython)) {
      console.log(`✓ Existing standalone Python 3.11 found at: ${standalonePython}`);
      return standalonePython;
    }

    fs.mkdirSync(standaloneDir, { recursive: true });
    const tarballUrl = 'https://github.com/indygreg/python-build-standalone/releases/download/20241016/cpython-3.11.10+20241016-x86_64-unknown-linux-gnu-install_only_stripped.tar.gz';
    
    console.log(`Downloading CPython 3.11.10 binary from: ${tarballUrl}`);
    execSync(`curl -sSL "${tarballUrl}" | tar -xz -C "${standaloneDir}"`, {
      stdio: 'inherit',
      timeout: 120000,
    });

    if (fs.existsSync(standalonePython) && isPython311(standalonePython)) {
      console.log(`✅ Standalone CPython 3.11.10 provisioned successfully at: ${standalonePython}`);
      return standalonePython;
    } else {
      throw new Error(`Failed to extract or verify standalone Python 3.11 at: ${standalonePython}`);
    }
  }

  throw new Error(`Python 3.11 is required for PyTorch 2.3.1 CPU inference, but was not found. Please install Python 3.11.`);
}

async function main() {
  const venvPaths = getVenvPaths();

  // 4. Validate existing .venv if present
  let needsVenvCreation = true;
  if (fs.existsSync(venvPaths.python)) {
    if (isPython311(venvPaths.python)) {
      console.log(`✓ Existing virtual environment at ${venvDir} is verified Python 3.11 (${getPythonVersionString(venvPaths.python)}).`);
      needsVenvCreation = false;
    } else {
      const existingVer = getPythonVersionString(venvPaths.python);
      console.warn(`⚠️  Existing .venv uses incompatible ${existingVer} (3.11 required). Recreating environment...`);
      fs.rmSync(venvDir, { recursive: true, force: true });
      needsVenvCreation = true;
    }
  }

  // 5. Create virtual environment if needed
  if (needsVenvCreation) {
    const python311 = findOrProvisionPython311();
    console.log(`\n📦 Creating Python 3.11 virtual environment at ${venvDir} using ${python311}...`);
    execSync(`"${python311}" -m venv "${venvDir}"`, { stdio: 'inherit' });

    if (!fs.existsSync(venvPaths.python) || !isPython311(venvPaths.python)) {
      throw new Error(`FATAL: Virtual environment at ${venvDir} was not created with Python 3.11! Version: ${getPythonVersionString(venvPaths.python)}`);
    }
    console.log(`✓ Python 3.11 virtual environment created successfully: ${getPythonVersionString(venvPaths.python)}`);
  }

  const activePython = venvPaths.python;
  console.log(`Active Python: ${activePython} (${getPythonVersionString(activePython)})`);

  // 6. Verify requirements file exists
  if (!fs.existsSync(requirementsPath)) {
    throw new Error(`requirements.txt not found at ${requirementsPath}`);
  }

  // 7. Upgrade pip in the virtual environment
  console.log('\n⬆️  Upgrading pip in virtual environment...');
  try {
    execSync(`"${activePython}" -m pip install --upgrade pip`, { stdio: 'inherit' });
  } catch (e) {
    console.warn('⚠️  Pip upgrade warning (non-fatal):', e.message);
  }

  // 8. Install pinned dependencies from requirements.txt
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

  // 9. Verify all ML libraries import cleanly
  console.log('\n🔍 Verifying ML library imports (torch, torchvision, torchxrayvision, skimage, numpy)...');
  const verifyCmd = `"${activePython}" -c "import sys, torch, torchvision, torchxrayvision as xrv, skimage, numpy as np; print('   - Python:', sys.version.split()[0]); print('   - PyTorch:', torch.__version__); print('   - Torchvision:', torchvision.__version__); print('   - TorchXRayVision:', xrv.__version__); print('   - Scikit-Image:', skimage.__version__); print('   - NumPy:', np.__version__); print('   - Device:', 'CPU' if not torch.cuda.is_available() else 'CUDA')"`;
  
  try {
    execSync(verifyCmd, { stdio: 'inherit' });
    console.log('✅ All deep learning dependencies verified successfully.');
  } catch (verifyErr) {
    console.error('❌ FATAL: Dependency verification failed. Required imports could not be resolved in the Python environment:');
    console.error(verifyErr.message);
    process.exit(1);
  }

  // 10. Pre-download / pre-warm model weights into cache
  console.log('\n📥 Pre-warming TorchXRayVision ResNet50 model weights...');
  const prewarmCmd = `"${activePython}" -c "import torchxrayvision as xrv; m = xrv.models.get_model('resnet50-res512-all'); print('[OK] ResNet50 loaded. Pathologies supported:', len(m.pathologies))"`;
  try {
    execSync(prewarmCmd, { stdio: 'inherit', timeout: 120000 });
    console.log('✅ Model weights pre-warmed and cached successfully.');
  } catch (prewarmErr) {
    console.warn('⚠️  Model pre-warming deferred to runtime (non-fatal):', prewarmErr.message);
  }

  console.log('\n===========================================================');
  console.log('🎉 Python 3.11 ML Environment Setup Complete & Verified');
  console.log('===========================================================');
}

main().catch(err => {
  console.error('\n❌ FATAL Python environment setup error:', err);
  process.exit(1);
});

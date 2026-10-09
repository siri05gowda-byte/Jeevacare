import React, { useRef, useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Loader } from 'lucide-react';

/**
 * DocumentUpload Component
 * 
 * Drag-and-drop document/image upload with quality checks.
 * Validates file size, type, and optionally image resolution.
 * 
 * @component
 * @param {Object} props
 * @param {Function} props.onUpload - Callback when file is ready: (file, metadata) => void
 * @param {Array<string>} [props.acceptedTypes=['application/pdf', 'image/jpeg', 'image/png']] - Accepted MIME types
 * @param {number} [props.maxFileSize=10485760] - Max file size in bytes (default 10MB)
 * @param {number} [props.minImageWidth=300] - Minimum image width for quality check
 * @param {number} [props.minImageHeight=300] - Minimum image height for quality check
 * @param {boolean} [props.isLoading=false] - Loading state during upload
 * @param {string} [props.title='Upload Health Document'] - Component title
 * @returns {React.ReactElement}
 */
export default function DocumentUpload({
  onUpload = null,
  acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png'],
  maxFileSize = 10485760, // 10MB
  minImageWidth = 300,
  minImageHeight = 300,
  isLoading = false,
  title = 'Upload Health Document',
}) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [validation, setValidation] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const validateFile = async (file) => {
    const errors = [];
    const warnings = [];

    // Check MIME type
    if (!acceptedTypes.includes(file.type)) {
      errors.push(`File type not supported. Accepted: ${acceptedTypes.join(', ')}`);
    }

    // Check file size
    if (file.size > maxFileSize) {
      errors.push(`File size exceeds ${(maxFileSize / 1024 / 1024).toFixed(0)}MB limit`);
    }

    // Check image dimensions if it's an image
    if (file.type.startsWith('image/')) {
      try {
        const dimensions = await getImageDimensions(file);
        if (dimensions.width < minImageWidth || dimensions.height < minImageHeight) {
          warnings.push(
            `Image resolution is ${dimensions.width}x${dimensions.height}. Recommended minimum: ${minImageWidth}x${minImageHeight}px for better quality.`
          );
        }
      } catch (err) {
        console.error('Error checking image dimensions:', err);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  };

  const getImageDimensions = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (file) => {
    if (!file) return;

    const validation = await validateFile(file);
    setValidation(validation);

    if (validation.valid) {
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleInputChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !onUpload) return;

    try {
      setUploadProgress(33);

      // Simulate upload progress
      await new Promise((resolve) => setTimeout(resolve, 500));
      setUploadProgress(66);

      // Call parent callback
      const metadata = {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
        uploadedAt: new Date().toISOString(),
      };

      await onUpload(selectedFile, metadata);

      setUploadProgress(100);
      setSelectedFile(null);
      setValidation(null);
      setUploadProgress(0);

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      setValidation({
        valid: false,
        errors: ['Upload failed. Please try again.'],
        warnings: [],
      });
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-xs text-gray-600">
          Upload health documents, test results, or medical images
        </p>
      </div>

      {/* Drag and Drop Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${
            isDragging
              ? 'border-jeevacare-blue bg-blue-50'
              : selectedFile
              ? 'border-green-300 bg-green-50'
              : 'border-gray-300 bg-gray-50 hover:border-jeevacare-blue'
          }
        `}
        role="button"
        tabIndex="0"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            inputRef.current?.click();
          }
        }}
        aria-label="Drop files here or click to select"
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleInputChange}
          className="hidden"
          aria-hidden="true"
        />

        {selectedFile ? (
          <>
            <CheckCircle size={32} className="text-green-600 mx-auto mb-2" />
            <p className="font-medium text-gray-900">{selectedFile.name}</p>
            <p className="text-xs text-gray-600 mt-1">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </>
        ) : (
          <>
            <Upload size={32} className="text-gray-400 mx-auto mb-2" />
            <p className="font-medium text-gray-900">
              Drop your file here
            </p>
            <p className="text-xs text-gray-600 mt-1">
              or click to browse
            </p>
            <p className="text-xs text-gray-500 mt-3">
              Max size: {(maxFileSize / 1024 / 1024).toFixed(0)}MB • {acceptedTypes.length} formats supported
            </p>
          </>
        )}
      </div>

      {/* Validation Messages */}
      {validation && (
        <div className="space-y-2">
          {validation.errors.length > 0 && (
            <div className="alert-error">
              {validation.errors.map((err, i) => (
                <p key={i} className="text-sm flex items-start gap-2">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  {err}
                </p>
              ))}
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="alert-warning">
              {validation.warnings.map((warn, i) => (
                <p key={i} className="text-sm flex items-start gap-2">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  {warn}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Progress */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Uploading...</span>
            <span className="text-gray-600">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-jeevacare-blue h-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {selectedFile ? (
          <>
            <button
              onClick={handleUpload}
              disabled={!validation?.valid || isLoading}
              className="btn btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Upload Document
                </>
              )}
            </button>
            <button
              onClick={() => {
                setSelectedFile(null);
                setValidation(null);
                if (inputRef.current) inputRef.current.value = '';
              }}
              className="btn btn-secondary"
            >
              Clear
            </button>
          </>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            <FileText size={16} />
            Select File
          </button>
        )}
      </div>

      {/* File Info */}
      <p className="text-xs text-gray-500 text-center">
        Your documents are encrypted and securely stored. Only you and your healthcare providers can access them.
      </p>
    </div>
  );
}

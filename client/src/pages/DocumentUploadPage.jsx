import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Upload, FileText, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import PageContainer from '../components/Layout/PageContainer';
import SectionTitle from '../components/Layout/SectionTitle';

export default function DocumentUploadPage() {
  const { user } = useAuthStore();
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState('medical_record');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const token = user?.token || localStorage.getItem('token');
  const patientId = user?._id || user?.id;

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patientId', patientId);
      formData.append('documentType', docType);

      const response = await fetch('/api/v1/documents/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        setSuccess('Document uploaded successfully');
        setFile(null);
      } else {
        const err = await response.json();
        setError(err.error || 'Upload failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContainer>
      <SectionTitle icon={Upload} title="Upload Medical Documents" />
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-2">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-2">
              <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document Type
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="medical_record">Medical Record</option>
              <option value="lab_result">Lab Result</option>
              <option value="radiology_report">Radiology Report</option>
              <option value="discharge_summary">Discharge Summary</option>
              <option value="vaccination_record">Vaccination Record</option>
              <option value="prescription">Prescription</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File (PDF, JPEG, PNG)
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              accept=".pdf,.jpg,.jpeg,.png"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || isLoading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader size={20} className="animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={20} />
                Upload Document
              </>
            )}
          </button>
        </div>
      </div>
    </PageContainer>
  );
}

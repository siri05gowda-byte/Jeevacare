import React, { useState, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Upload, FileText, AlertCircle, CheckCircle, Loader, Search, X } from 'lucide-react';
import PageContainer from '../components/Layout/PageContainer';
import SectionTitle from '../components/Layout/SectionTitle';
import api from '../services/api';
import { documentService } from '../services/documentService';

export default function StaffDocumentUpload() {
  const { user } = useAuthStore();
  
  // Patient search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Document form state
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState('');
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().split('T')[0]);
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  /**
   * Document type options based on user role
   */
  const getDocumentTypeOptions = () => {
    const baseTypes = [
      { value: 'medical_record', label: 'Medical Record' },
      { value: 'other', label: 'Other' },
    ];

    // Role-specific document types
    if (user?.role === 'DOCTOR') {
      return [
        { value: 'prescription', label: 'Prescription' },
        { value: 'medical_record', label: 'Clinical Notes' },
        ...baseTypes,
      ];
    }

    if (user?.role === 'LAB_TECHNICIAN') {
      return [
        { value: 'lab_result', label: 'Lab Report' },
        ...baseTypes,
      ];
    }

    if (user?.role === 'RADIOLOGY_TECHNICIAN') {
      return [
        { value: 'radiology_report', label: 'Radiology Report' },
        { value: 'imaging', label: 'Imaging' },
        ...baseTypes,
      ];
    }

    return baseTypes;
  };

  /**
   * Search for patients
   */
  const handlePatientSearch = useCallback(async (query) => {
    setSearchQuery(query);

    if (query.trim().length < 2) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    try {
      setIsSearching(true);
      setSearchError(null);

      const response = await api.get(`/patients/search?q=${encodeURIComponent(query)}&limit=10`);
      const patients = response?.data?.patients || response?.patients || [];
      setSearchResults(patients);
    } catch (err) {
      if (err.response?.status === 401) {
        setSearchError('Session expired. Please log in again.');
      } else if (err.response?.status === 403) {
        setSearchError(err.response?.data?.message || 'You do not have permission to search patients.');
      } else {
        setSearchError(err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to search patients.');
      }
    } finally {
      setIsSearching(false);
    }
  }, []);

  /**
   * Select a patient from search results
   */
  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setSearchResults([]);
    setSearchQuery('');
  };

  /**
   * Clear selected patient
   */
  const handleClearPatient = () => {
    setSelectedPatient(null);
    setFile(null);
    setDocumentType('');
    setDocumentTitle('');
    setDocumentDescription('');
    setError(null);
    setSuccess(null);
  };

  /**
   * Upload document
   */
  const handleUpload = async (e) => {
    e.preventDefault();

    if (!selectedPatient) {
      setError('Please select a patient');
      return;
    }

    if (!documentType) {
      setError('Please select a document type');
      return;
    }

    if (!file) {
      setError('Please select a file');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      await documentService.uploadDocument(file, {
        patientId: selectedPatient._id,
        type: documentType,
        documentDate,
        title: documentTitle,
        description: documentDescription,
      });

      const patientName = `${selectedPatient.personalIdentity?.firstName || ''} ${selectedPatient.personalIdentity?.lastName || ''}`.trim() || 'patient';
      setSuccess(`Document uploaded successfully for ${patientName}`);
      // Reset form
      setFile(null);
      setDocumentType('');
      setDocumentTitle('');
      setDocumentDescription('');
      setSelectedPatient(null);
    } catch (err) {
      console.error('Upload failed:', err);
      const serverCode = err.response?.data?.code;
      const serverMessage = err.response?.data?.error || err.response?.data?.message;

      if (serverCode === 'STORAGE_NOT_CONFIGURED' || err.response?.status === 503) {
        setError(serverMessage || 'Document storage is currently unavailable. Cloudinary storage is not configured on the server. Please contact system administrator.');
      } else if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
      } else if (err.response?.status === 403) {
        setError(serverMessage || 'You do not have permission to upload documents for this patient.');
      } else {
        setError(serverMessage || err.message || 'Upload failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Format patient display name with identity info
   */
  const formatPatientDisplay = (patient) => {
    const name = `${patient.personalIdentity.firstName} ${patient.personalIdentity.lastName}`;
    const dob = patient.personalIdentity.dateOfBirth
      ? new Date(patient.personalIdentity.dateOfBirth).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
      : 'N/A';
    const jeevaId = patient.jeevaId || 'N/A';
    return `${name} (DOB: ${dob}) | JeevaId: ${jeevaId}`;
  };

  return (
    <PageContainer>
      <SectionTitle icon={Upload} title="Upload Documents for Patients" />
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
              <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {/* Patient Selection Section */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 1: Select Patient</h3>

            {!selectedPatient ? (
              <div className="space-y-3">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search for Patient
                  </label>
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handlePatientSearch(e.target.value)}
                      placeholder="Search by name, JeevaId, or phone..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Search error */}
                  {searchError && (
                    <p className="text-sm text-red-600 mt-2">{searchError}</p>
                  )}

                  {/* Search results dropdown */}
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                      {isSearching ? (
                        <div className="p-4 flex items-center justify-center gap-2">
                          <Loader size={16} className="animate-spin" />
                          <span className="text-sm text-gray-600">Searching...</span>
                        </div>
                      ) : (
                        <ul className="max-h-60 overflow-y-auto">
                          {searchResults.map((patient) => (
                            <li key={patient._id}>
                              <button
                                type="button"
                                onClick={() => handleSelectPatient(patient)}
                                className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-b-0 text-sm"
                              >
                                <div className="font-medium text-gray-900">
                                  {formatPatientDisplay(patient)}
                                </div>
                                {patient.status && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Status: {patient.status}
                                  </div>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* No results message */}
                  {searchQuery && searchResults.length === 0 && !isSearching && !searchError && (
                    <div className="text-sm text-gray-500 mt-2">
                      No patients found. Try searching by name or JeevaId.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Selected Patient:</p>
                  <p className="text-sm text-gray-700">{formatPatientDisplay(selectedPatient)}</p>
                </div>
                <button
                  type="button"
                  onClick={handleClearPatient}
                  className="p-2 hover:bg-blue-100 rounded-lg transition"
                >
                  <X size={18} className="text-gray-600" />
                </button>
              </div>
            )}
          </div>

          {/* Document Upload Section */}
          {selectedPatient && (
            <form onSubmit={handleUpload} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 2: Document Details</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Type *
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a document type</option>
                  {getDocumentTypeOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Date
                </label>
                <input
                  type="date"
                  value={documentDate}
                  onChange={(e) => setDocumentDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Title (Optional)
                </label>
                <input
                  type="text"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  placeholder="e.g., Blood Test Results"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={documentDescription}
                  onChange={(e) => setDocumentDescription(e.target.value)}
                  placeholder="Add any notes about this document..."
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File (PDF, JPEG, PNG, TIFF, DOCX, DOC, TXT) *
                </label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif,.docx,.doc,.txt"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-transparent"
                  required
                />
                {file && (
                  <p className="text-sm text-gray-600 mt-2">
                    Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!file || !documentType || isLoading}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
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
            </form>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

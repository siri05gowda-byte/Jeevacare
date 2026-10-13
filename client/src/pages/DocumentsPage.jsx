import React, { useState, useEffect } from 'react';
import { FileText, Download, Trash2, Upload, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import PageContainer from '../components/Layout/PageContainer';
import SectionTitle from '../components/Layout/SectionTitle';
import DocumentUpload from '../components/Documents/DocumentUpload';
import LoadingSkeleton from '../components/State/LoadingSkeleton';
import EmptyState from '../components/State/EmptyState';
import { useToast, ToastContainer } from '../components/State/Toast';
import { documentService } from '../services/documentService';

/**
 * DocumentsPage
 * 
 * Comprehensive document management interface for patients.
 * Allows uploading, viewing, downloading, and organizing health documents.
 */
export default function DocumentsPage() {
  const { user } = useAuthStore();
  const { toasts, success, error: showError, remove } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [downloading, setDownloading] = useState(null);

  // Get patient ID from user
  const getPatientId = async () => {
    if (user?.patientId) {
      return user.patientId;
    }
    
    // For PATIENT role, fetch from profile
    if (user?.role === 'PATIENT') {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/v1/patients/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          return data.data?._id || data._id;
        }
      } catch (err) {
        console.error('Failed to get patient ID:', err);
      }
    }
    
    return user?._id;
  };

  useEffect(() => {
    loadDocuments();
  }, [user]);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const patientId = await getPatientId();
      
      if (!patientId) {
        showError('Unable to identify patient');
        return;
      }

      const response = await documentService.getPatientDocuments(patientId);
      setDocuments(response.documents || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
      showError('Failed to load documents');
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (file, metadata) => {
    try {
      setIsLoading(true);
      
      const patientId = await getPatientId();
      const uploadMetadata = {
        ...metadata,
        patientId,
      };

      await documentService.uploadDocument(file, uploadMetadata);
      
      success(`Document "${file.name}" uploaded successfully!`);
      setShowUploadForm(false);
      
      // Reload documents
      await loadDocuments();
    } catch (err) {
      console.error('Upload error:', err);
      showError(err.message || 'Failed to upload document. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await documentService.deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d._id !== docId));
      success('Document deleted successfully');
    } catch (err) {
      showError(err.message || 'Failed to delete document');
    }
  };

  const handleDownload = async (doc) => {
    try {
      setDownloading(doc._id);
      
      // Check if file reference exists
      if (!doc.fileReference?.cloudinaryPublicId || !doc.fileReference?.cloudinaryUrl) {
        showError('This document does not have an associated file');
        return;
      }

      await documentService.downloadDocument(doc._id);
      success(`Downloading "${doc.name}"...`);
    } catch (err) {
      console.error('Download error:', err);
      showError(err.message || 'Failed to download document');
    } finally {
      setDownloading(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDocumentType = (doc) => {
    // Map document types to display names
    const typeMap = {
      'lab_result': 'Lab Results',
      'radiology_report': 'Radiology',
      'discharge_summary': 'Discharge Summary',
      'prescription': 'Prescription',
      'vaccination_record': 'Vaccination',
      'imaging': 'Imaging',
      'medical_record': 'Medical Record',
      'other': 'Other',
    };
    return typeMap[doc.type] || doc.type || 'Document';
  };

  const hasDownloadableFile = (doc) => {
    return !!(doc.fileReference?.cloudinaryPublicId || doc.fileReference?.cloudinaryUrl);
  };

  if (isLoading) {
    return (
      <PageContainer>
        <SectionTitle title="Health Documents" icon={<FileText size={32} />} />
        <LoadingSkeleton count={5} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <SectionTitle
          title="Health Documents"
          description="Manage and organize your health records and documents"
          icon={<FileText size={32} />}
        />
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="btn btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <Upload size={16} />
          Upload Document
        </button>
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={remove} position="bottom-right" />

      {/* Upload Form */}
      {showUploadForm && (
        <div className="card mb-8">
          <DocumentUpload
            onUpload={handleUpload}
            isLoading={isLoading}
            title="Upload New Document"
          />
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card-compact">
          <p className="text-xs text-gray-600 mb-1">Total Documents</p>
          <p className="text-2xl font-bold text-jeevacare-blue">{documents.length}</p>
        </div>
        <div className="card-compact">
          <p className="text-xs text-gray-600 mb-1">Total Size</p>
          <p className="text-2xl font-bold text-jeevacare-green">
            {formatFileSize(
              documents.reduce((sum, doc) => sum + (doc.fileReference?.fileSize || 0), 0)
            )}
          </p>
        </div>
        <div className="card-compact">
          <p className="text-xs text-gray-600 mb-1">With Files</p>
          <p className="text-2xl font-bold text-jeevacare-amber">
            {documents.filter(doc => hasDownloadableFile(doc)).length}
          </p>
        </div>
        <div className="card-compact">
          <p className="text-xs text-gray-600 mb-1">Latest Upload</p>
          <p className="text-sm font-bold text-jeevacare-orange">
            {documents.length > 0 ? formatDate(documents[0].uploadedAt || documents[0].createdAt) : 'N/A'}
          </p>
        </div>
      </div>

      {/* Documents List */}
      {documents.length > 0 ? (
        <div className="space-y-4">
          {documents.map((doc) => (
            <div key={doc._id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between gap-4">
                {/* Document Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-jeevacare-blue bg-opacity-10 rounded-lg flex-shrink-0">
                      <FileText size={24} className="text-jeevacare-blue" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 truncate">
                        {doc.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mt-1">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                          {getDocumentType(doc)}
                        </span>
                        {hasDownloadableFile(doc) ? (
                          <span className="text-green-600 text-xs font-medium">✓ File Available</span>
                        ) : (
                          <span className="text-amber-600 text-xs font-medium">⚠ Metadata Only</span>
                        )}
                        <span>•</span>
                        <span>{formatFileSize(doc.fileReference?.fileSize || 0)}</span>
                        <span>•</span>
                        <span>{formatDate(doc.uploadedAt || doc.createdAt)}</span>
                      </div>
                      {doc.description && (
                        <p className="text-sm text-gray-600 mt-2">{doc.description}</p>
                      )}
                      {doc.status && (
                        <div className="mt-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            doc.status === 'verified' ? 'bg-green-100 text-green-800' :
                            doc.status === 'pending_verification' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {doc.status.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  {hasDownloadableFile(doc) ? (
                    <button
                      onClick={() => handleDownload(doc)}
                      disabled={downloading === doc._id}
                      className="p-2 hover:bg-jeevacare-blue hover:bg-opacity-10 rounded-lg transition-colors disabled:opacity-50"
                      aria-label="Download document"
                      title="Download"
                    >
                      {downloading === doc._id ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-jeevacare-blue"></div>
                      ) : (
                        <Download size={18} className="text-jeevacare-blue" />
                      )}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="p-2 rounded-lg opacity-30 cursor-not-allowed"
                      aria-label="No file available"
                      title="No file available"
                    >
                      <Download size={18} className="text-gray-400" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(doc._id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Delete document"
                    title="Delete"
                  >
                    <Trash2 size={18} className="text-gray-600 hover:text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          type="no-records"
          title="No documents yet"
          description="Start by uploading your health documents, test results, or medical records."
          icon={<AlertCircle size={48} className="text-gray-300" />}
          action={{
            label: 'Upload First Document',
            onClick: () => setShowUploadForm(true),
          }}
        />
      )}
    </PageContainer>
  );
}

import React, { useState } from 'react';
import { FileText, Download, Trash2, Upload, AlertCircle } from 'lucide-react';
import PageContainer from '../components/Layout/PageContainer';
import SectionTitle from '../components/Layout/SectionTitle';
import DocumentUpload from '../components/Documents/DocumentUpload';
import LoadingSkeleton from '../components/State/LoadingSkeleton';
import EmptyState from '../components/State/EmptyState';
import { useToast, ToastContainer } from '../components/State/Toast';

/**
 * DocumentsPage
 * 
 * Comprehensive document management interface for patients.
 * Allows uploading, viewing, downloading, and organizing health documents.
 */
export default function DocumentsPage() {
  const { toasts, success, error: showError, remove } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [documents, setDocuments] = useState([
    {
      id: 'doc-1',
      name: 'Blood Test Results - October 2026.pdf',
      type: 'pdf',
      size: 512000,
      uploadedAt: new Date(Date.now() - 86400000 * 5),
      uploadedBy: 'City Medical Lab',
      category: 'Lab Results',
      tags: ['lab', 'blood-test', 'routine'],
    },
    {
      id: 'doc-2',
      name: 'Chest X-Ray Scan.jpg',
      type: 'image',
      size: 2048000,
      uploadedAt: new Date(Date.now() - 86400000 * 30),
      uploadedBy: 'Imaging Center',
      category: 'Radiology',
      tags: ['xray', 'chest', 'imaging'],
    },
    {
      id: 'doc-3',
      name: 'Hospital Discharge Summary.pdf',
      type: 'pdf',
      size: 256000,
      uploadedAt: new Date(Date.now() - 86400000 * 90),
      uploadedBy: 'General Hospital',
      category: 'Discharge Summary',
      tags: ['discharge', 'hospital', 'summary'],
    },
  ]);

  const handleUpload = async (file, metadata) => {
    try {
      setIsLoading(true);

      // Simulate upload to backend
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const newDocument = {
        id: `doc-${Date.now()}`,
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : 'pdf',
        size: file.size,
        uploadedAt: new Date(),
        uploadedBy: 'You',
        category: file.type.startsWith('image/') ? 'Images' : 'Documents',
        tags: [],
      };

      setDocuments((prev) => [newDocument, ...prev]);
      success(`Document "${file.name}" uploaded successfully!`);
      setShowUploadForm(false);
    } catch (err) {
      console.error('Upload error:', err);
      showError('Failed to upload document. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (docId) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      const doc = documents.find((d) => d.id === docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      success(`Document deleted`);
    }
  };

  const handleDownload = (doc) => {
    success(`Downloading "${doc.name}"...`);
    // In real implementation, would trigger actual download
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Group documents by category
  const documentsByCategory = documents.reduce((acc, doc) => {
    if (!acc[doc.category]) {
      acc[doc.category] = [];
    }
    acc[doc.category].push(doc);
    return acc;
  }, {});

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
              documents.reduce((sum, doc) => sum + doc.size, 0)
            )}
          </p>
        </div>
        <div className="card-compact">
          <p className="text-xs text-gray-600 mb-1">Categories</p>
          <p className="text-2xl font-bold text-jeevacare-amber">
            {Object.keys(documentsByCategory).length}
          </p>
        </div>
        <div className="card-compact">
          <p className="text-xs text-gray-600 mb-1">Recent</p>
          <p className="text-2xl font-bold text-jeevacare-orange">
            {documents.length > 0 ? formatDate(documents[0].uploadedAt) : 'N/A'}
          </p>
        </div>
      </div>

      {/* Documents by Category */}
      {documents.length > 0 ? (
        <div className="space-y-8">
          {Object.entries(documentsByCategory).map(([category, docs]) => (
            <div key={category}>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                {category}
              </h2>
              <div className="space-y-2">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="card-compact flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText size={24} className="text-gray-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-gray-900 truncate">
                          {doc.name}
                        </h4>
                        <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-600">
                          <span>{formatFileSize(doc.size)}</span>
                          <span>•</span>
                          <span>{formatDate(doc.uploadedAt)}</span>
                          {doc.uploadedBy && (
                            <>
                              <span>•</span>
                              <span>{doc.uploadedBy}</span>
                            </>
                          )}
                        </div>
                        {doc.tags && doc.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {doc.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus-visible:outline-offset-2"
                        aria-label="Download document"
                        title="Download"
                      >
                        <Download size={18} className="text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors focus-visible:outline-offset-2"
                        aria-label="Delete document"
                        title="Delete"
                      >
                        <Trash2 size={18} className="text-gray-600 hover:text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
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

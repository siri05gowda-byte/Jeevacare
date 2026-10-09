import React, { useState } from 'react';
import { FileText, Download, Eye, Share2 } from 'lucide-react';
import LoadingSkeleton from '../State/LoadingSkeleton';
import EmptyState from '../State/EmptyState';

/**
 * RecordsBrowser Component
 * 
 * Displays organized health records in a tabbed interface.
 * Records include lab results, radiology, discharge summaries, etc.
 * 
 * @component
 * @param {Object} props
 * @param {Object} props.recordsByType - Records organized by type: { lab_results: [], radiology: [], etc. }
 * @param {boolean} [props.isLoading=false] - Loading state
 * @param {Function} [props.onViewRecord] - Callback when viewing a record
 * @param {Function} [props.onDownloadRecord] - Callback when downloading a record
 * @returns {React.ReactElement}
 */
export default function RecordsBrowser({
  recordsByType = {},
  isLoading = false,
  onViewRecord = null,
  onDownloadRecord = null,
}) {
  const [selectedType, setSelectedType] = useState(
    Object.keys(recordsByType)[0] || 'lab_results'
  );

  const recordTypeConfig = {
    lab_results: {
      label: 'Lab Results',
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    radiology: {
      label: 'Radiology',
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    discharge_summaries: {
      label: 'Discharge Summaries',
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    vaccinations: {
      label: 'Vaccinations',
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    documents: {
      label: 'Documents',
      icon: FileText,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
  };

  const currentRecords = recordsByType[selectedType] || [];
  const config = recordTypeConfig[selectedType] || recordTypeConfig.documents;

  if (isLoading) {
    return <LoadingSkeleton type="card" count={2} />;
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex flex-wrap gap-1 -mb-px">
          {Object.entries(recordsByType).map(([type, records]) => {
            const tabConfig = recordTypeConfig[type] || recordTypeConfig.documents;
            const isActive = selectedType === type;

            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`
                  px-4 py-3 font-medium text-sm border-b-2 transition-colors
                  ${
                    isActive
                      ? 'border-jeevacare-blue text-jeevacare-blue'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }
                `}
                aria-selected={isActive}
                role="tab"
              >
                {tabConfig.label}
                <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded-full">
                  {records?.length || 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Records List */}
      {currentRecords.length > 0 ? (
        <div className="space-y-3">
          {currentRecords.map((record, index) => (
            <div
              key={record.id || index}
              className={`p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow ${config.bgColor}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <FileText size={24} className={`flex-shrink-0 ${config.color}`} />
                  <div className="min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {record.title || record.name || `${config.label} #${index + 1}`}
                    </h4>
                    {record.provider && (
                      <p className="text-sm text-gray-600">
                        {record.provider}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(record.date || record.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    {record.detail && (
                      <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                        {record.detail}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  {onViewRecord && (
                    <button
                      onClick={() => onViewRecord(record)}
                      className="p-2 hover:bg-white/50 rounded-lg transition-colors focus-visible:outline-offset-2"
                      aria-label="View record"
                      title="View details"
                    >
                      <Eye size={18} className="text-gray-600 hover:text-gray-900" />
                    </button>
                  )}
                  {onDownloadRecord && record.fileUrl && (
                    <button
                      onClick={() => onDownloadRecord(record)}
                      className="p-2 hover:bg-white/50 rounded-lg transition-colors focus-visible:outline-offset-2"
                      aria-label="Download record"
                      title="Download"
                    >
                      <Download size={18} className="text-gray-600 hover:text-gray-900" />
                    </button>
                  )}
                  <button
                    className="p-2 hover:bg-white/50 rounded-lg transition-colors focus-visible:outline-offset-2"
                    aria-label="Share record"
                    title="Share"
                  >
                    <Share2 size={18} className="text-gray-600 hover:text-gray-900" />
                  </button>
                </div>
              </div>

              {/* Status badge */}
              {record.status && (
                <div className="mt-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    record.status === 'verified'
                      ? 'bg-green-100 text-green-800'
                      : record.status === 'pending'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {record.status?.charAt(0).toUpperCase() + record.status?.slice(1)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          type="no-records"
          title={`No ${config.label.toLowerCase()}`}
          description={`You don't have any ${config.label.toLowerCase()} yet.`}
        />
      )}
    </div>
  );
}

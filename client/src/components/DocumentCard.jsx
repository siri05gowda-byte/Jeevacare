import React from 'react';
import VerificationBadge from './VerificationBadge';

export default function DocumentCard({ 
  data,
  onView = null,
  onDelete = null,
  type = 'document'
}) {
  const getTypeIcon = (type) => {
    switch(type) {
      case 'vaccination': return '💉';
      case 'laboratory': return '🧪';
      case 'radiology': return '🩻';
      case 'discharge': return '📋';
      case 'document': return '📄';
      default: return '📎';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTitle = () => {
    switch(type) {
      case 'vaccination':
        return `${data.vaccineName} (${data.dose})`;
      case 'laboratory':
        return data.labTestName;
      case 'radiology':
        return `${data.modalityType?.replace('_', ' ').toUpperCase()} - ${data.bodyPart}`;
      case 'discharge':
        return `Discharge: ${data.primaryDiagnosis}`;
      default:
        return data.fileName || 'Untitled';
    }
  };

  const getDate = () => {
    switch(type) {
      case 'vaccination':
        return data.administrationDate;
      case 'laboratory':
        return data.resultReceivedDate;
      case 'radiology':
        return data.reportDate;
      case 'discharge':
        return data.dischargeDate;
      default:
        return data.createdAt;
    }
  };

  const getDescription = () => {
    switch(type) {
      case 'vaccination':
        return `By ${data.provider} • Batch: ${data.batchNumber || 'N/A'}`;
      case 'laboratory':
        return data.isCritical ? '⚠️ Critical Results' : `${data.results?.length || 0} tests`;
      case 'radiology':
        return data.hasCriticalFindings ? '⚠️ Critical Findings' : 'Normal findings';
      case 'discharge':
        return `${data.lengthOfStay || 0} days • Disposition: ${data.dischargeDisposition}`;
      default:
        return `Type: ${data.documentType || 'Document'}`;
    }
  };

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4">
          <div className="text-4xl">{getTypeIcon(type)}</div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{getTitle()}</h3>
            <p className="text-sm text-gray-600 mt-1">{getDescription()}</p>
            <p className="text-xs text-gray-500 mt-2">{formatDate(getDate())}</p>
          </div>
        </div>
        <VerificationBadge status={data.verificationStatus} />
      </div>

      {(data.flaggedAsSensitive || data.isCritical || data.hasCriticalFindings) && (
        <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded">
          <p className="text-xs text-red-800 font-medium">
            {data.flaggedAsSensitive && '🔒 Sensitive Information'}
            {data.isCritical && '⚠️ Critical Result'}
            {data.hasCriticalFindings && '⚠️ Critical Findings'}
          </p>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        {onView && (
          <button
            onClick={() => onView(data)}
            className="btn-text text-jeevacare-blue hover:text-jeevacare-blue-dark text-sm"
          >
            View Details
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(data._id)}
            className="btn-text text-red-600 hover:text-red-700 text-sm"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

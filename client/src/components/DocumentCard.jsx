import React from 'react';
import { Beaker, Stethoscope, FileText, File, Paperclip, AlertCircle, Lock, Syringe, Sparkles } from 'lucide-react';
import VerificationBadge from './VerificationBadge';

export default function DocumentCard({ 
  data,
  onView = null,
  onDelete = null,
  type = 'document'
}) {
  const getTypeIcon = (type) => {
    switch(type) {
      case 'vaccination': return <Syringe size={32} className="text-blue-600" />;
      case 'laboratory': return <Beaker size={32} className="text-purple-600" />;
      case 'radiology': return <Stethoscope size={32} className="text-blue-600" />;
      case 'discharge': return <FileText size={32} className="text-amber-600" />;
      case 'document': return <File size={32} className="text-gray-600" />;
      default: return <Paperclip size={32} className="text-gray-600" />;
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
        return data.isCritical ? <span className="flex items-center gap-1"><AlertCircle size={14} className="text-red-600" /> Critical Results</span> : `${data.results?.length || 0} tests`;
      case 'radiology':
        return data.hasCriticalFindings ? <span className="flex items-center gap-1"><AlertCircle size={14} className="text-red-600" /> Critical Findings</span> : 'Normal findings';
      case 'discharge':
        return `${data.lengthOfStay || 0} days • Disposition: ${data.dischargeDisposition}`;
      default:
        return `Type: ${data.documentType || 'Document'}`;
    }
  };

  const getAiBadge = () => {
    if (type !== 'radiology' || !data.aiAnalysis?.status) return null;
    const status = data.aiAnalysis.status;
    if (status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Sparkles size={12} className="text-emerald-600" /> AI Analyzed
        </span>
      );
    }
    if (['queued', 'processing', 'analyzing'].includes(status)) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" /> Analyzing AI...
        </span>
      );
    }
    if (status === 'unsupported_modality') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
          Report Reviewed
        </span>
      );
    }
    if (status === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200">
          Analysis Pending
        </span>
      );
    }
    return null;
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
        <div className="flex flex-col items-end gap-1.5">
          <VerificationBadge status={data.verificationStatus} />
          {getAiBadge()}
        </div>
      </div>

      {(data.flaggedAsSensitive || data.isCritical || data.hasCriticalFindings) && (
        <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded">
          <p className="text-xs text-red-800 font-medium flex items-center gap-1">
            {data.flaggedAsSensitive && <><Lock size={14} /> Sensitive Information</>}
            {data.isCritical && <><AlertCircle size={14} /> Critical Result</>}
            {data.hasCriticalFindings && <><AlertCircle size={14} /> Critical Findings</>}
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

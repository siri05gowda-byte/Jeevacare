import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Stethoscope, Upload } from 'lucide-react';
import PageContainer from '../components/Layout/PageContainer';
import SectionTitle from '../components/Layout/SectionTitle';
import LoadingSkeleton from '../components/State/LoadingSkeleton';
import { useAuthStore } from '../stores/authStore';
import { patientService } from '../services/patientService';
import { documentService } from '../services/documentService';
import { errorMessage } from '../utils/errorMessage';
import { assignedFacilityId, patientName } from '../utils/patientDisplay';

const DOCUMENT_LABELS = {
  prescription: 'Prescription',
  lab_result: 'Lab report',
  radiology_report: 'Radiology report',
  imaging: 'Imaging',
  discharge_summary: 'Discharge summary',
  vaccination_record: 'Vaccination record',
  medical_record: 'Medical record',
  other: 'Other',
};

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-IN') : '—');

/**
 * A doctor's view of one patient: who they are, their uploaded documents and clinical notes,
 * with shortcuts to upload a document or start an encounter.
 */
export default function PatientRecordsPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [patient, setPatient] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    const failures = {};
    const [profile, docs, notes] = await Promise.allSettled([
      patientService.getProfile(patientId),
      documentService.getPatientDocuments(patientId),
      patientService.getClinicalRecords(patientId),
    ]);

    if (profile.status === 'fulfilled') {
      setPatient(profile.value?.data?.patient || profile.value?.data || profile.value?.patient || null);
    } else {
      failures.patient = errorMessage(profile.reason, 'Could not load this patient');
    }
    if (docs.status === 'fulfilled') {
      setDocuments(docs.value?.documents || []);
    } else {
      failures.documents = errorMessage(docs.reason, 'Could not load documents');
    }
    if (notes.status === 'fulfilled') {
      const list = notes.value?.records || notes.value?.data?.records || notes.value?.data || [];
      setRecords(Array.isArray(list) ? list : []);
    } else {
      failures.records = errorMessage(notes.reason, 'Could not load clinical notes');
    }
    setErrors(failures);
    setLoading(false);
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  const startEncounter = () => {
    const facility = assignedFacilityId(patient, user?._id) || user?.facilityId;
    navigate(`/encounter?patientId=${patientId}${facility ? `&facilityId=${facility}` : ''}`);
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingSkeleton />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <SectionTitle
        title={patient ? patientName(patient) : 'Patient record'}
        description={patient?.jeevaId ? `JeevaCare ID: ${patient.jeevaId}` : undefined}
        icon={<Stethoscope size={32} />}
        action={
          <div className="flex gap-2">
            <button
              className="btn-secondary"
              onClick={() => navigate('/staff/upload-documents', { state: { patient: patient || { _id: patientId } } })}
            >
              <Upload size={16} className="inline mr-1" /> Upload document
            </button>
            <button className="btn-primary" onClick={startEncounter}>
              Start encounter
            </button>
          </div>
        }
      />

      {errors.patient && <p className="text-sm text-red-600 mb-4">{errors.patient}</p>}

      <section className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          <FileText size={20} className="inline-block mr-2" />
          Documents ({documents.length})
        </h2>
        {errors.documents && <p className="text-sm text-red-600">{errors.documents}</p>}
        {!errors.documents && documents.length === 0 && (
          <p className="text-sm text-gray-600">No documents have been uploaded for this patient yet.</p>
        )}
        <ul className="divide-y divide-gray-100">
          {documents.map((doc) => (
            <li key={doc._id} className="py-3 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-gray-900">{doc.title || doc.fileName || doc.originalName || 'Document'}</p>
                <p className="text-xs text-gray-500">
                  {DOCUMENT_LABELS[doc.documentType] || doc.documentType} · {formatDate(doc.createdAt)}
                  {doc.verificationStatus === 'provider_verified' ? ' · Added by a provider' : ''}
                </p>
              </div>
              <button
                type="button"
                className="text-jeevacare-blue hover:underline text-sm flex items-center gap-1"
                onClick={() => documentService.downloadDocument(doc._id).catch(() => {})}
              >
                <Download size={14} /> Open
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Clinical notes ({records.length})</h2>
        {errors.records && <p className="text-sm text-red-600">{errors.records}</p>}
        {!errors.records && records.length === 0 && (
          <p className="text-sm text-gray-600">No clinical notes yet. Start an encounter to add one.</p>
        )}
        <ul className="divide-y divide-gray-100">
          {records.map((record) => (
            <li key={record._id} className="py-3">
              <p className="font-medium text-gray-900">
                {record.data?.diagnosis || String(record.recordType || '').replace(/_/g, ' ')}
              </p>
              <p className="text-xs text-gray-500">
                {String(record.recordType || '').replace(/_/g, ' ')} · {formatDate(record.recordDate || record.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </PageContainer>
  );
}

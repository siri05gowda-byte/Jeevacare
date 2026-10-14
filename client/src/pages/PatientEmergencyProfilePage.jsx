/**
 * Patient Emergency Profile Page
 * Allows patients to manage their emergency profile, contacts, and access QR code
 */

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { emergencyService } from '../services/emergencyService';
import {
  QrCode,
  Plus,
  AlertTriangle,
  Heart,
  Pill,
  Droplet,
  Phone,
  Download,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import PageContainer from '../components/Layout/PageContainer';
import SectionTitle from '../components/Layout/SectionTitle';
import LoadingSkeleton from '../components/State/LoadingSkeleton';
import EmptyState from '../components/State/EmptyState';
import { useToast, ToastContainer } from '../components/State/Toast';

const PatientEmergencyProfilePage = () => {
  const { user } = useAuthStore();
  const { toasts, success: showSuccess, error: showError, remove } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [qrCode, setQrCode] = useState(null);
  const [tokenStatus, setTokenStatus] = useState(null);

  // Dialog states
  const [allergyDialog, setAllergyDialog] = useState(false);
  const [conditionDialog, setConditionDialog] = useState(false);
  const [medicationDialog, setMedicationDialog] = useState(false);
  const [contactDialog, setContactDialog] = useState(false);
  const [qrDialog, setQrDialog] = useState(false);

  // Form states
  const [allergyForm, setAllergyForm] = useState({ allergen: '', severity: 'moderate', reaction: '' });
  const [conditionForm, setConditionForm] = useState({ condition: '', severity: 'moderate', onsetDate: '' });
  const [medicationForm, setMedicationForm] = useState({
    medicationName: '',
    dosage: '',
    frequency: '',
    indication: '',
  });
  const [contactForm, setContactForm] = useState({
    contactName: '',
    relationship: 'spouse',
    contactMethods: [{ type: 'phone', value: '', isPrimary: true }],
  });

  useEffect(() => {
    if (user?._id) {
      loadEmergencyProfile();
      loadEmergencyContacts();
      loadTokenStatus();
    }
  }, [user]);

  const loadEmergencyProfile = async () => {
    try {
      setLoading(true);
      const response = await emergencyService.getEmergencyProfile(user._id);
      setProfile(response.data);
    } catch (err) {
      if (err.response?.status !== 404) {
        showError('Failed to load emergency profile');
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadEmergencyContacts = async () => {
    try {
      const response = await emergencyService.getEmergencyContacts(user._id);
      setContacts(response.data);
    } catch (err) {
      console.error('Failed to load emergency contacts:', err);
    }
  };

  const loadTokenStatus = async () => {
    try {
      const response = await emergencyService.getTokenStatus(user._id);
      setTokenStatus(response.data);
    } catch (err) {
      console.error('Failed to load token status:', err);
    }
  };

  const handleAddAllergy = async () => {
    try {
      await emergencyService.addAllergy(user._id, allergyForm);
      showSuccess('Allergy added successfully');
      setAllergyDialog(false);
      setAllergyForm({ allergen: '', severity: 'moderate', reaction: '' });
      loadEmergencyProfile();
    } catch (err) {
      showError('Failed to add allergy');
      console.error(err);
    }
  };

  const handleAddCondition = async () => {
    try {
      await emergencyService.addCondition(user._id, conditionForm);
      showSuccess('Critical condition added successfully');
      setConditionDialog(false);
      setConditionForm({ condition: '', severity: 'moderate', onsetDate: '' });
      loadEmergencyProfile();
    } catch (err) {
      showError('Failed to add condition');
      console.error(err);
    }
  };

  const handleAddMedication = async () => {
    try {
      await emergencyService.addMedication(user._id, medicationForm);
      showSuccess('Medication added successfully');
      setMedicationDialog(false);
      setMedicationForm({ medicationName: '', dosage: '', frequency: '', indication: '' });
      loadEmergencyProfile();
    } catch (err) {
      showError('Failed to add medication');
      console.error(err);
    }
  };

  const handleAddContact = async () => {
    try {
      await emergencyService.addEmergencyContact(user._id, contactForm);
      showSuccess('Emergency contact added successfully');
      setContactDialog(false);
      setContactForm({
        contactName: '',
        relationship: 'spouse',
        contactMethods: [{ type: 'phone', value: '', isPrimary: true }],
      });
      loadEmergencyContacts();
    } catch (err) {
      showError('Failed to add emergency contact');
      console.error(err);
    }
  };

  const handleGenerateToken = async () => {
    try {
      await emergencyService.generateEmergencyToken(user._id);
      showSuccess('Emergency QR code generated successfully');
      loadTokenStatus();
      loadQrCode();
    } catch (err) {
      showError('Failed to generate emergency token');
      console.error(err);
    }
  };

  const handleRevokeToken = async () => {
    try {
      await emergencyService.revokeEmergencyToken(user._id, 'User requested revocation');
      showSuccess('Emergency QR code revoked successfully');
      setQrCode(null);
      loadTokenStatus();
    } catch (err) {
      showError('Failed to revoke token');
      console.error(err);
    }
  };

  const loadQrCode = async () => {
    try {
      const response = await emergencyService.getQrCode(user._id);
      setQrCode(response.data);
      setQrDialog(true);
    } catch (err) {
      showError('Failed to load QR code');
      console.error(err);
    }
  };

  const downloadQrCode = () => {
    if (qrCode?.qrCode) {
      const link = document.createElement('a');
      link.href = qrCode.qrCode;
      link.download = `jeevacare-emergency-${user.jeevaId || 'qr'}.png`;
      link.click();
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingSkeleton count={3} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header */}
      <SectionTitle
        title="Emergency Profile"
        description="Manage your emergency medical information and access QR code"
        icon={<AlertTriangle size={32} />}
      />

      <ToastContainer toasts={toasts} onRemove={remove} />

      {/* Emergency QR Code Card */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Emergency Access QR Code</h3>
          {tokenStatus?.isActive ? (
            <div className="flex gap-2">
              <button onClick={loadQrCode} className="btn btn-primary btn-sm">
                <QrCode size={16} className="mr-1" />
                View QR Code
              </button>
              <button onClick={handleRevokeToken} className="btn btn-secondary btn-sm">
                <Trash2 size={16} className="mr-1" />
                Revoke
              </button>
            </div>
          ) : (
            <button onClick={handleGenerateToken} className="btn btn-primary btn-sm">
              <RefreshCw size={16} className="mr-1" />
              Generate QR Code
            </button>
          )}
        </div>
        {tokenStatus?.isActive ? (
          <div className="alert-success">
            <p className="font-medium">✓ Active emergency QR code available</p>
            <p className="text-sm mt-1">
              Expires: {new Date(tokenStatus.expiresAt).toLocaleString()}
            </p>
          </div>
        ) : (
          <div className="alert-info">
            Generate a QR code that emergency responders can scan to access your critical medical
            information when you're unable to communicate.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Allergies */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-red-600" size={20} />
              <h3 className="font-semibold">Allergies</h3>
            </div>
            <button onClick={() => setAllergyDialog(true)} className="btn btn-sm btn-secondary">
              <Plus size={16} />
            </button>
          </div>
          {profile?.allergies?.length > 0 ? (
            <div className="space-y-2">
              {profile.allergies.map((allergy, idx) => (
                <div
                  key={idx}
                  className={`px-3 py-2 rounded ${
                    allergy.severity === 'life-threatening' ? 'bg-red-100' : 'bg-yellow-100'
                  }`}
                >
                  <span className="font-medium">{allergy.allergen}</span>
                  <span className="text-sm text-gray-600 ml-2">({allergy.severity})</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No allergies recorded</p>
          )}
        </div>

        {/* Critical Conditions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Heart className="text-red-600" size={20} />
              <h3 className="font-semibold">Critical Conditions</h3>
            </div>
            <button onClick={() => setConditionDialog(true)} className="btn btn-sm btn-secondary">
              <Plus size={16} />
            </button>
          </div>
          {profile?.criticalConditions?.length > 0 ? (
            <div className="space-y-2">
              {profile.criticalConditions.map((condition, idx) => (
                <div key={idx} className="px-3 py-2 bg-red-100 rounded">
                  <span className="font-medium">{condition.condition}</span>
                  <span className="text-sm text-gray-600 ml-2">({condition.severity})</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No critical conditions recorded</p>
          )}
        </div>

        {/* Current Medications */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Pill className="text-blue-600" size={20} />
              <h3 className="font-semibold">Current Medications</h3>
            </div>
            <button onClick={() => setMedicationDialog(true)} className="btn btn-sm btn-secondary">
              <Plus size={16} />
            </button>
          </div>
          {profile?.currentMedications?.length > 0 ? (
            <div className="space-y-2">
              {profile.currentMedications.map((med, idx) => (
                <div key={idx} className="border-b pb-2">
                  <p className="font-medium">{med.medicationName}</p>
                  <p className="text-sm text-gray-600">
                    {med.dosage} - {med.frequency}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No medications recorded</p>
          )}
        </div>

        {/* Blood Group */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Droplet className="text-red-600" size={20} />
            <h3 className="font-semibold">Blood Group</h3>
          </div>
          <div className="text-center py-4">
            <p className="text-4xl font-bold text-red-600">
              {profile?.bloodGroup?.group || 'Unknown'}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {profile?.bloodGroup?.source === 'provider_verified'
                ? 'Verified by healthcare provider'
                : 'Self-reported'}
            </p>
          </div>
        </div>
      </div>

      {/* Emergency Contacts */}
      <div className="card mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Phone className="text-blue-600" size={20} />
            <h3 className="font-semibold">Emergency Contacts</h3>
          </div>
          <button onClick={() => setContactDialog(true)} className="btn btn-sm btn-secondary">
            <Plus size={16} />
          </button>
        </div>
        {contacts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contacts.map((contact, idx) => (
              <div key={idx} className="border rounded p-3">
                <p className="font-medium">{contact.contactName}</p>
                <p className="text-sm text-gray-600 capitalize">{contact.relationship}</p>
                {contact.contactMethods.map((method, midx) => (
                  <p key={midx} className="text-xs text-gray-500">
                    {method.type}: {method.value}
                  </p>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No emergency contacts added</p>
        )}
      </div>

      {/* Allergy Dialog */}
      {allergyDialog && (
        <Dialog onClose={() => setAllergyDialog(false)} title="Add Allergy">
          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label">Allergen</label>
              <input
                type="text"
                className="form-input"
                value={allergyForm.allergen}
                onChange={(e) => setAllergyForm({ ...allergyForm, allergen: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Severity</label>
              <select
                className="form-input"
                value={allergyForm.severity}
                onChange={(e) => setAllergyForm({ ...allergyForm, severity: e.target.value })}
              >
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
                <option value="life-threatening">Life-Threatening</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Reaction (optional)</label>
              <textarea
                className="form-input"
                rows={2}
                value={allergyForm.reaction}
                onChange={(e) => setAllergyForm({ ...allergyForm, reaction: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setAllergyDialog(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleAddAllergy} className="btn btn-primary">
                Add
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Condition Dialog */}
      {conditionDialog && (
        <Dialog onClose={() => setConditionDialog(false)} title="Add Critical Condition">
          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label">Condition</label>
              <input
                type="text"
                className="form-input"
                value={conditionForm.condition}
                onChange={(e) => setConditionForm({ ...conditionForm, condition: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Severity</label>
              <select
                className="form-input"
                value={conditionForm.severity}
                onChange={(e) => setConditionForm({ ...conditionForm, severity: e.target.value })}
              >
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
                <option value="life-threatening">Life-Threatening</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Onset Date (optional)</label>
              <input
                type="date"
                className="form-input"
                value={conditionForm.onsetDate}
                onChange={(e) => setConditionForm({ ...conditionForm, onsetDate: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConditionDialog(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleAddCondition} className="btn btn-primary">
                Add
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Medication Dialog */}
      {medicationDialog && (
        <Dialog onClose={() => setMedicationDialog(false)} title="Add Medication">
          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label">Medication Name</label>
              <input
                type="text"
                className="form-input"
                value={medicationForm.medicationName}
                onChange={(e) =>
                  setMedicationForm({ ...medicationForm, medicationName: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Dosage (optional)</label>
              <input
                type="text"
                className="form-input"
                value={medicationForm.dosage}
                onChange={(e) => setMedicationForm({ ...medicationForm, dosage: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Frequency (optional)</label>
              <input
                type="text"
                className="form-input"
                value={medicationForm.frequency}
                onChange={(e) => setMedicationForm({ ...medicationForm, frequency: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setMedicationDialog(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleAddMedication} className="btn btn-primary">
                Add
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Contact Dialog */}
      {contactDialog && (
        <Dialog onClose={() => setContactDialog(false)} title="Add Emergency Contact">
          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label">Contact Name</label>
              <input
                type="text"
                className="form-input"
                value={contactForm.contactName}
                onChange={(e) => setContactForm({ ...contactForm, contactName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Relationship</label>
              <select
                className="form-input"
                value={contactForm.relationship}
                onChange={(e) => setContactForm({ ...contactForm, relationship: e.target.value })}
              >
                <option value="spouse">Spouse</option>
                <option value="parent">Parent</option>
                <option value="sibling">Sibling</option>
                <option value="child">Child</option>
                <option value="grandparent">Grandparent</option>
                <option value="friend">Friend</option>
                <option value="colleague">Colleague</option>
                <option value="other_family">Other Family</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                className="form-input"
                value={contactForm.contactMethods[0].value}
                onChange={(e) =>
                  setContactForm({
                    ...contactForm,
                    contactMethods: [{ ...contactForm.contactMethods[0], value: e.target.value }],
                  })
                }
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setContactDialog(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleAddContact} className="btn btn-primary">
                Add
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* QR Code Dialog */}
      {qrDialog && qrCode && (
        <Dialog onClose={() => setQrDialog(false)} title="Emergency Access QR Code">
          <div className="text-center py-4">
            <img
              src={qrCode.qrCode}
              alt="Emergency QR Code"
              className="w-full max-w-sm mx-auto"
            />
            <p className="text-sm text-gray-600 mt-4">
              Print this QR code or save it to your phone. Emergency responders can scan it to
              access your critical medical information.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Expires: {qrCode?.expiresAt ? new Date(qrCode.expiresAt).toLocaleString() : 'N/A'}
            </p>
            <div className="flex gap-2 justify-center mt-4">
              <button onClick={() => setQrDialog(false)} className="btn btn-secondary">
                Close
              </button>
              <button onClick={downloadQrCode} className="btn btn-primary">
                <Download size={16} className="mr-1" />
                Download
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </PageContainer>
  );
};

// Simple Dialog Component
const Dialog = ({ children, onClose, title }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">{title}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X size={20} />
        </button>
      </div>
      <div className="p-4">{children}</div>
    </div>
  </div>
);

export default PatientEmergencyProfilePage;

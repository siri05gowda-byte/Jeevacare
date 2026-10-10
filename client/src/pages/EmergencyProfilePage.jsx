/**
 * Emergency Profile Page
 * Patient-side page for managing emergency profile and contacts
 * Does NOT allow converting patient-reported to provider-verified
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Check } from 'lucide-react';
import '../styles/EmergencyProfile.css';

const EmergencyProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('allergies');
  const [contacts, setContacts] = useState([]);

  // Form states
  const [showAddAllergy, setShowAddAllergy] = useState(false);
  const [showAddCondition, setShowAddCondition] = useState(false);
  const [showAddMedication, setShowAddMedication] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);

  const [allergyForm, setAllergyForm] = useState({
    allergen: '',
    severity: 'moderate',
    reaction: '',
  });

  const [conditionForm, setConditionForm] = useState({
    condition: '',
    severity: 'moderate',
    status: 'active',
  });

  const [medicationForm, setMedicationForm] = useState({
    medicationName: '',
    dosage: '',
    frequency: '',
    indication: '',
  });

  const [contactForm, setContactForm] = useState({
    contactName: '',
    relationship: 'spouse',
    contactMethods: [{ type: 'phone', value: '' }],
    priority: 3,
  });

  // Get patient ID from auth context or URL
  const patientId = localStorage.getItem('patientId');

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');

      const [profileRes, contactsRes] = await Promise.all([
        axios.get(`/api/v1/emergency/profile/${patientId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`/api/v1/emergency/contacts/${patientId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setProfile(profileRes.data.data);
      setContacts(contactsRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch emergency profile:', err);
      setError(err.response?.data?.message || 'Failed to load emergency profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAllergy = async () => {
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(
        `/api/v1/emergency/profile/${patientId}/allergies`,
        allergyForm,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setAllergyForm({ allergen: '', severity: 'moderate', reaction: '' });
      setShowAddAllergy(false);
      await fetchProfileData();
    } catch (err) {
      console.error('Failed to add allergy:', err);
      alert(err.response?.data?.message || 'Failed to add allergy');
    }
  };

  const handleAddCondition = async () => {
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(
        `/api/v1/emergency/profile/${patientId}/conditions`,
        conditionForm,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setConditionForm({ condition: '', severity: 'moderate', status: 'active' });
      setShowAddCondition(false);
      await fetchProfileData();
    } catch (err) {
      console.error('Failed to add condition:', err);
      alert(err.response?.data?.message || 'Failed to add condition');
    }
  };

  const handleAddMedication = async () => {
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(
        `/api/v1/emergency/profile/${patientId}/medications`,
        medicationForm,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setMedicationForm({
        medicationName: '',
        dosage: '',
        frequency: '',
        indication: '',
      });
      setShowAddMedication(false);
      await fetchProfileData();
    } catch (err) {
      console.error('Failed to add medication:', err);
      alert(err.response?.data?.message || 'Failed to add medication');
    }
  };

  const handleAddContact = async () => {
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(`/api/v1/emergency/contacts/${patientId}`, contactForm, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setContactForm({
        contactName: '',
        relationship: 'spouse',
        contactMethods: [{ type: 'phone', value: '' }],
        priority: 3,
      });
      setShowAddContact(false);
      await fetchProfileData();
    } catch (err) {
      console.error('Failed to add contact:', err);
      alert(err.response?.data?.message || 'Failed to add contact');
    }
  };

  if (loading) {
    return (
      <div className="emergency-profile-container loading">
        <div className="loading-message">Loading emergency profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="emergency-profile-container error">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="emergency-profile-container">
      <div className="profile-header">
        <h1>My Emergency Profile</h1>
        <p className="subtitle">Manage critical health information for emergency access</p>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'allergies' ? 'active' : ''}`}
          onClick={() => setActiveTab('allergies')}
        >
          Allergies
        </button>
        <button
          className={`tab ${activeTab === 'conditions' ? 'active' : ''}`}
          onClick={() => setActiveTab('conditions')}
        >
          Conditions
        </button>
        <button
          className={`tab ${activeTab === 'medications' ? 'active' : ''}`}
          onClick={() => setActiveTab('medications')}
        >
          Medications
        </button>
        <button
          className={`tab ${activeTab === 'contacts' ? 'active' : ''}`}
          onClick={() => setActiveTab('contacts')}
        >
          Emergency Contacts
        </button>
      </div>

      <div className="tab-content">
        {/* ALLERGIES TAB */}
        {activeTab === 'allergies' && (
          <div className="tab-pane">
            <div className="section-header">
              <h2>Allergies</h2>
              <button
                className="btn-add"
                onClick={() => setShowAddAllergy(!showAddAllergy)}
              >
                + Add Allergy
              </button>
            </div>

            {showAddAllergy && (
              <div className="form-card">
                <div className="form-group">
                  <label>Allergen *</label>
                  <input
                    type="text"
                    placeholder="e.g., Penicillin, Peanuts"
                    value={allergyForm.allergen}
                    onChange={(e) =>
                      setAllergyForm({ ...allergyForm, allergen: e.target.value })
                    }
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Severity *</label>
                    <select
                      value={allergyForm.severity}
                      onChange={(e) =>
                        setAllergyForm({ ...allergyForm, severity: e.target.value })
                      }
                    >
                      <option value="mild">Mild</option>
                      <option value="moderate">Moderate</option>
                      <option value="severe">Severe</option>
                      <option value="life-threatening">Life-threatening</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Reaction</label>
                  <input
                    type="text"
                    placeholder="Describe the reaction (optional)"
                    value={allergyForm.reaction}
                    onChange={(e) =>
                      setAllergyForm({ ...allergyForm, reaction: e.target.value })
                    }
                  />
                </div>

                <div className="form-actions">
                  <button className="btn-primary" onClick={handleAddAllergy}>
                    Save Allergy
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => setShowAddAllergy(false)}
                  >
                    Cancel
                  </button>
                </div>

                <div className="info-banner">
                  <strong>Note:</strong> Information you add here will be marked as "Patient
                  Reported" until verified by a healthcare provider.
                </div>
              </div>
            )}

            <div className="items-list">
              {profile.allergies && profile.allergies.length > 0 ? (
                profile.allergies.map((allergy, idx) => (
                  <div key={idx} className="item-card">
                    <div className="item-header">
                      <h3>{allergy.allergen}</h3>
                      <span className={`severity-badge severity-${allergy.severity}`}>
                        {allergy.severity}
                      </span>
                    </div>
                    {allergy.reaction && (
                      <p className="item-reaction">Reaction: {allergy.reaction}</p>
                    )}
                    <div className="item-footer">
                      <span
                        className={`source-badge ${allergy.verificationStatus}`}
                      >
                        {allergy.source.replace(/_/g, ' ')}
                      </span>
                      {allergy.verificationStatus === 'verified' && (
                        <span className="verified-icon">✓ Verified by provider</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-items">No allergies added yet</p>
              )}
            </div>
          </div>
        )}

        {/* CONDITIONS TAB */}
        {activeTab === 'conditions' && (
          <div className="tab-pane">
            <div className="section-header">
              <h2>Critical Conditions</h2>
              <button
                className="btn-add"
                onClick={() => setShowAddCondition(!showAddCondition)}
              >
                + Add Condition
              </button>
            </div>

            {showAddCondition && (
              <div className="form-card">
                <div className="form-group">
                  <label>Condition *</label>
                  <input
                    type="text"
                    placeholder="e.g., Diabetes, Heart Disease"
                    value={conditionForm.condition}
                    onChange={(e) =>
                      setConditionForm({ ...conditionForm, condition: e.target.value })
                    }
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={conditionForm.status}
                      onChange={(e) =>
                        setConditionForm({ ...conditionForm, status: e.target.value })
                      }
                    >
                      <option value="active">Active</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Severity</label>
                    <select
                      value={conditionForm.severity}
                      onChange={(e) =>
                        setConditionForm({ ...conditionForm, severity: e.target.value })
                      }
                    >
                      <option value="mild">Mild</option>
                      <option value="moderate">Moderate</option>
                      <option value="severe">Severe</option>
                      <option value="life-threatening">Life-threatening</option>
                    </select>
                  </div>
                </div>

                <div className="form-actions">
                  <button className="btn-primary" onClick={handleAddCondition}>
                    Save Condition
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => setShowAddCondition(false)}
                  >
                    Cancel
                  </button>
                </div>

                <div className="info-banner">
                  <strong>Note:</strong> Only healthcare providers can verify conditions.
                </div>
              </div>
            )}

            <div className="items-list">
              {profile.criticalConditions && profile.criticalConditions.length > 0 ? (
                profile.criticalConditions.map((condition, idx) => (
                  <div key={idx} className="item-card">
                    <div className="item-header">
                      <h3>{condition.condition}</h3>
                      <span className="status-badge">{condition.status}</span>
                    </div>
                    <p className="item-severity">Severity: {condition.severity}</p>
                    <div className="item-footer">
                      <span
                        className={`source-badge ${condition.verificationStatus}`}
                      >
                        {condition.source.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-items">No conditions added yet</p>
              )}
            </div>
          </div>
        )}

        {/* MEDICATIONS TAB */}
        {activeTab === 'medications' && (
          <div className="tab-pane">
            <div className="section-header">
              <h2>Current Medications</h2>
              <button
                className="btn-add"
                onClick={() => setShowAddMedication(!showAddMedication)}
              >
                + Add Medication
              </button>
            </div>

            {showAddMedication && (
              <div className="form-card">
                <div className="form-group">
                  <label>Medication Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Aspirin, Metformin"
                    value={medicationForm.medicationName}
                    onChange={(e) =>
                      setMedicationForm({
                        ...medicationForm,
                        medicationName: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Dosage</label>
                    <input
                      type="text"
                      placeholder="e.g., 500mg"
                      value={medicationForm.dosage}
                      onChange={(e) =>
                        setMedicationForm({ ...medicationForm, dosage: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Frequency</label>
                    <input
                      type="text"
                      placeholder="e.g., Twice daily"
                      value={medicationForm.frequency}
                      onChange={(e) =>
                        setMedicationForm({
                          ...medicationForm,
                          frequency: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Indication</label>
                  <input
                    type="text"
                    placeholder="What is this for?"
                    value={medicationForm.indication}
                    onChange={(e) =>
                      setMedicationForm({
                        ...medicationForm,
                        indication: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-actions">
                  <button className="btn-primary" onClick={handleAddMedication}>
                    Save Medication
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => setShowAddMedication(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="items-list">
              {profile.currentMedications && profile.currentMedications.length > 0 ? (
                profile.currentMedications.map((med, idx) => (
                  <div key={idx} className="item-card">
                    <div className="item-header">
                      <h3>{med.medicationName}</h3>
                    </div>
                    <p className="item-detail">
                      <strong>Dosage:</strong> {med.dosage || 'Not specified'}
                    </p>
                    <p className="item-detail">
                      <strong>Frequency:</strong> {med.frequency || 'Not specified'}
                    </p>
                    {med.indication && (
                      <p className="item-detail">
                        <strong>For:</strong> {med.indication}
                      </p>
                    )}
                    <div className="item-footer">
                      <span
                        className={`source-badge ${med.verificationStatus}`}
                      >
                        {med.source.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-items">No medications added yet</p>
              )}
            </div>
          </div>
        )}

        {/* EMERGENCY CONTACTS TAB */}
        {activeTab === 'contacts' && (
          <div className="tab-pane">
            <div className="section-header">
              <h2>Emergency Contacts</h2>
              <button
                className="btn-add"
                onClick={() => setShowAddContact(!showAddContact)}
              >
                + Add Contact
              </button>
            </div>

            <div className="info-banner warning">
              <strong>Important:</strong> Emergency contacts can be notified in emergencies but do
              NOT have automatic access to your medical records.
            </div>

            {showAddContact && (
              <div className="form-card">
                <div className="form-group">
                  <label>Contact Name *</label>
                  <input
                    type="text"
                    placeholder="Full name"
                    value={contactForm.contactName}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, contactName: e.target.value })
                    }
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Relationship *</label>
                    <select
                      value={contactForm.relationship}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, relationship: e.target.value })
                      }
                    >
                      <option value="spouse">Spouse</option>
                      <option value="parent">Parent</option>
                      <option value="sibling">Sibling</option>
                      <option value="child">Child</option>
                      <option value="friend">Friend</option>
                      <option value="colleague">Colleague</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Priority</label>
                    <select
                      value={contactForm.priority}
                      onChange={(e) =>
                        setContactForm({
                          ...contactForm,
                          priority: parseInt(e.target.value),
                        })
                      }
                    >
                      <option value="1">1 - Primary</option>
                      <option value="2">2</option>
                      <option value="3">3 - Secondary</option>
                      <option value="4">4</option>
                      <option value="5">5 - Low</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    placeholder="10-digit phone number"
                    value={
                      contactForm.contactMethods[0]?.value || ''
                    }
                    onChange={(e) => {
                      const methods = [...contactForm.contactMethods];
                      methods[0].value = e.target.value;
                      setContactForm({ ...contactForm, contactMethods: methods });
                    }}
                  />
                </div>

                <div className="form-actions">
                  <button className="btn-primary" onClick={handleAddContact}>
                    Save Contact
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => setShowAddContact(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="items-list">
              {contacts && contacts.length > 0 ? (
                contacts.map((contact, idx) => (
                  <div key={idx} className="item-card">
                    <div className="item-header">
                      <h3>{contact.contactName}</h3>
                      <span className="priority-badge">
                        Priority {contact.priority}
                      </span>
                    </div>
                    <p className="item-detail">
                      <strong>Relationship:</strong> {contact.relationship}
                    </p>
                    {contact.contactMethods?.[0]?.value && (
                      <p className="item-detail">
                        <strong>Phone:</strong> {contact.contactMethods[0].value}
                      </p>
                    )}
                    <div className="item-footer">
                      <span className={`status-badge ${contact.authorizationStatus}`}>
                        {contact.authorizationStatus}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-items">No emergency contacts added yet</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmergencyProfilePage;

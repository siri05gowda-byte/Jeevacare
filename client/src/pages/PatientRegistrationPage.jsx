/**
 * Patient Registration Flow
 * Handles adult, minor, and newborn registration workflows
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Info } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import '../styles/PatientRegistration.css';

export default function PatientRegistrationPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [step, setStep] = useState('type'); // 'type' | 'patient-type' | 'info' | 'confirmation'
  const [patientType, setPatientType] = useState(null); // 'adult' | 'minor' | 'newborn'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    sex: '',
    phone: '',
    email: '',
    // Minor/Newborn fields
    parentName: '',
    guardianName: '',
    guardianRelationship: '',
    // Newborn specific
    birthTime: '',
    birthPlace: '',
    birthWeight: '',
    bloodGroup: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePatientTypeSelect = (type) => {
    setPatientType(type);
    setStep('info');
  };

  const validateStep = () => {
    const required = ['firstName', 'lastName', 'dateOfBirth', 'sex'];
    
    for (const field of required) {
      if (!formData[field]) {
        setError(`${field.replace(/([A-Z])/g, ' $1')} is required`);
        return false;
      }
    }

    // Validate DOB is not in future
    if (new Date(formData.dateOfBirth) > new Date()) {
      setError('Date of birth cannot be in the future');
      return false;
    }

    setError(null);
    return true;
  };

  const handleContinue = () => {
    if (validateStep()) {
      setStep('confirmation');
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      if (patientType === 'newborn') {
        // Register newborn
        const response = await api.post('/api/v1/newborn/register', {
          babyName: {
            firstName: formData.firstName,
            lastName: formData.lastName,
          },
          dateOfBirth: formData.dateOfBirth,
          timeOfBirth: formData.birthTime,
          sex: formData.sex,
          placeOfBirth: formData.birthPlace,
          birthWeight: formData.birthWeight ? { value: parseFloat(formData.birthWeight) } : undefined,
          bloodGroup: formData.bloodGroup,
          parentInformation: formData.parentName ? {
            mother: { name: formData.parentName },
          } : undefined,
          hospitalId: user?.profile?.hospitalId,
        });

        if (response.data.success) {
          navigate(`/patient/${response.data.data.patientId}`, {
            state: { message: 'Newborn registered successfully!' },
          });
        }
      } else {
        // Register adult or minor patient
        const response = await api.post('/api/v1/patients/register-patient', {
          userId: user?._id,
          personalIdentity: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            dateOfBirth: formData.dateOfBirth,
            sex: formData.sex,
            phone: formData.phone,
            email: formData.email,
          },
        });

        if (response.data.success) {
          navigate(`/patient/${response.data.data.patientId}`, {
            state: { message: 'Patient registered successfully!' },
          });
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'confirmation') {
      setStep('info');
    } else if (step === 'info') {
      setStep('type');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="registration-container">
      <div className="registration-card">
        {/* Header */}
        <div className="registration-header">
          <h1>Register Patient</h1>
          <p>Create a new JeevaCare patient profile</p>
        </div>

        {/* Step Indicator */}
        <div className="step-indicator">
          <div className={`step ${step === 'type' ? 'active' : step !== 'type' ? 'completed' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-label">Type</div>
          </div>
          <div className="step-line"></div>
          <div className={`step ${step === 'info' ? 'active' : step === 'confirmation' ? 'completed' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-label">Information</div>
          </div>
          <div className="step-line"></div>
          <div className={`step ${step === 'confirmation' ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <div className="step-label">Confirm</div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert alert-error">
            <span className="alert-icon"><AlertCircle size={18} className="inline" /></span>
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Patient Type */}
        {step === 'type' && (
          <div className="step-content">
            <h2>What type of patient?</h2>
            <div className="patient-type-options">
              <button
                className="type-option"
                onClick={() => handlePatientTypeSelect('adult')}
              >
                <div className="type-icon">👨</div>
                <div className="type-title">Adult Patient</div>
                <div className="type-description">18 years or older, independent access</div>
              </button>

              <button
                className="type-option"
                onClick={() => handlePatientTypeSelect('minor')}
              >
                <div className="type-icon">👦</div>
                <div className="type-title">Minor Patient</div>
                <div className="type-description">Under 18, requires guardian</div>
              </button>

              <button
                className="type-option"
                onClick={() => handlePatientTypeSelect('newborn')}
              >
                <div className="type-icon">👶</div>
                <div className="type-title">Newborn</div>
                <div className="type-description">Birth registration with parent linking</div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Patient Information */}
        {step === 'info' && (
          <div className="step-content">
            <h2>
              {patientType === 'adult' && 'Patient Information'}
              {patientType === 'minor' && 'Minor Patient Information'}
              {patientType === 'newborn' && 'Newborn Information'}
            </h2>

            <div className="form-group">
              <label>First Name *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder={patientType === 'newborn' ? "Baby's first name" : 'First name'}
              />
            </div>

            <div className="form-group">
              <label>Last Name *</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                placeholder={patientType === 'newborn' ? "Baby's last name" : 'Last name'}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Date of Birth *</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>Sex *</label>
                <select
                  name="sex"
                  value={formData.sex}
                  onChange={handleInputChange}
                >
                  <option value="">Select sex</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>
            </div>

            {patientType === 'newborn' && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label>Time of Birth</label>
                    <input
                      type="time"
                      name="birthTime"
                      value={formData.birthTime}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Birth Weight (kg)</label>
                    <input
                      type="number"
                      name="birthWeight"
                      value={formData.birthWeight}
                      onChange={handleInputChange}
                      step="0.1"
                      placeholder="e.g., 3.2"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Place of Birth</label>
                  <input
                    type="text"
                    name="birthPlace"
                    value={formData.birthPlace}
                    onChange={handleInputChange}
                    placeholder="Hospital or facility name"
                  />
                </div>

                <div className="form-group">
                  <label>Mother's Name</label>
                  <input
                    type="text"
                    name="parentName"
                    value={formData.parentName}
                    onChange={handleInputChange}
                    placeholder="Mother's full name"
                  />
                </div>

                <div className="form-group">
                  <label>Blood Group (if known)</label>
                  <select
                    name="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={handleInputChange}
                  >
                    <option value="">Select or leave blank</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </>
            )}

            {(patientType === 'adult' || patientType === 'minor') && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Phone number"
                    />
                  </div>

                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Email address"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 'confirmation' && (
          <div className="step-content">
            <h2>Confirm Information</h2>
            <div className="confirmation-summary">
              <div className="summary-section">
                <h3>Patient Information</h3>
                <div className="summary-item">
                  <span className="label">Name:</span>
                  <span className="value">{formData.firstName} {formData.lastName}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Date of Birth:</span>
                  <span className="value">{new Date(formData.dateOfBirth).toLocaleDateString()}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Sex:</span>
                  <span className="value capitalize">{formData.sex}</span>
                </div>
                {patientType === 'newborn' && formData.birthPlace && (
                  <div className="summary-item">
                    <span className="label">Birth Place:</span>
                    <span className="value">{formData.birthPlace}</span>
                  </div>
                )}
              </div>

              <div className="info-box">
                <p>
                  <strong><Info size={16} className="inline mr-2" /> Important:</strong> Once registered, the patient will receive a unique JeevaCare ID that will be their lifelong healthcare identifier.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="registration-actions">
          <button
            className="btn btn-secondary"
            onClick={handleBack}
            disabled={loading}
          >
            ← Back
          </button>

          {step !== 'confirmation' && (
            <button
              className="btn btn-primary"
              onClick={handleContinue}
              disabled={loading}
            >
              Continue →
            </button>
          )}

          {step === 'confirmation' && (
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Complete Registration'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

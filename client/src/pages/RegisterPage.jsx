import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Logo from '../components/Logo';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'PATIENT',
    dateOfBirth: '',
    sex: '',
    termsAccepted: false,
  });
  const [localError, setLocalError] = useState('');
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setLocalError('');
    clearError();
  };

  const validateClientSide = () => {
    if (!formData.firstName.trim()) {
      return 'First name is required.';
    }
    if (!formData.lastName.trim()) {
      return 'Last name is required.';
    }
    if (!formData.email.trim()) {
      return 'Email address is required.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      return 'Please provide a valid email address.';
    }
    if (!formData.password || formData.password.length < 8) {
      return 'Password must be at least 8 characters long.';
    }
    if (formData.dateOfBirth) {
      const dob = new Date(formData.dateOfBirth);
      if (isNaN(dob.getTime())) {
        return 'Please enter a valid date of birth.';
      }
      if (dob > new Date()) {
        return 'Date of birth cannot be in the future.';
      }
    }
    if (!formData.termsAccepted) {
      return 'You must accept the Terms and Conditions and Privacy Policy.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return; // Prevent accidental duplicate submission
    setLocalError('');

    const validationMsg = validateClientSide();
    if (validationMsg) {
      setLocalError(validationMsg);
      return;
    }

    try {
      const response = await register({
        email: formData.email.trim(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        role: formData.role || 'PATIENT',
        dateOfBirth: formData.dateOfBirth || undefined,
        sex: formData.sex || undefined,
        termsAccepted: formData.termsAccepted,
        privacyPolicyAccepted: formData.termsAccepted,
      });

      // Role-based post-registration navigation
      const role = response?.user?.role;
      if (role === 'DOCTOR') {
        navigate('/provider');
      } else if (role === 'EMERGENCY') {
        navigate('/emergency');
      } else if (role === 'HOSPITAL_ADMIN' || role === 'ADMIN') {
        navigate('/integrated-dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      // Clear sensitive password on failure while preserving non-sensitive form fields
      setFormData((prev) => ({ ...prev, password: '' }));

      const status = err.response?.status;
      const serverMsg = err.response?.data?.error?.message || err.response?.data?.message;

      let displayMsg = serverMsg;
      if (!displayMsg) {
        if (status === 429) {
          displayMsg = 'Too many registration attempts. Please wait a few moments and try again.';
        } else if (status === 409) {
          displayMsg = 'An account with this email address already exists. Please log in instead.';
        } else if (status === 403) {
          displayMsg = 'Self-registration for this role is prohibited. Privileged accounts must be provisioned by a facility administrator.';
        } else if (status >= 500) {
          displayMsg = 'Registration service is temporarily unavailable. Please try again later.';
        } else if (!err.response) {
          displayMsg = 'Unable to connect to JeevaCare server. Please check your internet connection.';
        } else {
          displayMsg = 'Registration failed. Please check your information and try again.';
        }
      }

      setLocalError(displayMsg);
    }
  };

  const activeErrorMessage = localError || error;

  return (
    <div className="min-h-screen bg-gradient-to-br from-jeevacare-navy to-jeevacare-blue flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 animate-fade-in">
          {/* Header & Logo */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <Logo variant="light" size="md" />
            </div>
            <p className="text-gray-600 text-sm">Join your lifelong health journey</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* User-friendly Error Display */}
            {activeErrorMessage && (
              <div
                role="alert"
                aria-live="polite"
                className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2 animate-fade-in"
              >
                <span className="font-medium">Registration Alert:</span>
                <span className="flex-1">{activeErrorMessage}</span>
              </div>
            )}

            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label" htmlFor="firstName">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="firstName"
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="form-input w-full"
                  placeholder="First name"
                  disabled={isLoading}
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="lastName">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="lastName"
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="form-input w-full"
                  placeholder="Last name"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="form-label" htmlFor="email">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input w-full"
                placeholder="name@example.com"
                autoComplete="email"
                disabled={isLoading}
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="form-label" htmlFor="password">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-input w-full"
                minLength="8"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                disabled={isLoading}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>
            </div>

            {/* Account Type */}
            <div>
              <label className="form-label" htmlFor="role">
                Account Type <span className="text-red-500">*</span>
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="form-input w-full"
                disabled={isLoading}
                required
              >
                <option value="PATIENT">Patient (Personal Health Record)</option>
                <option value="GUARDIAN">Guardian (Family Health Manager)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Clinical and hospital staff accounts are provisioned by facility administrators.
              </p>
            </div>

            {/* Date of Birth & Sex */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label" htmlFor="dateOfBirth">
                  Date of Birth
                </label>
                <input
                  id="dateOfBirth"
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="form-input w-full"
                  max={new Date().toISOString().split('T')[0]}
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="sex">
                  Sex
                </label>
                <select
                  id="sex"
                  name="sex"
                  value={formData.sex}
                  onChange={handleChange}
                  className="form-input w-full"
                  disabled={isLoading}
                >
                  <option value="">Select Sex</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>

            {/* Terms and Privacy Acceptance */}
            <div className="flex items-start gap-2 pt-1">
              <input
                id="termsAccepted"
                type="checkbox"
                name="termsAccepted"
                checked={formData.termsAccepted}
                onChange={handleChange}
                disabled={isLoading}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-jeevacare-blue focus:ring-jeevacare-blue cursor-pointer"
              />
              <label htmlFor="termsAccepted" className="text-xs text-gray-600 leading-relaxed">
                I accept the{' '}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-jeevacare-blue hover:underline font-medium focus:outline-none"
                >
                  Terms and Conditions
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(true)}
                  className="text-jeevacare-blue hover:underline font-medium focus:outline-none"
                >
                  Privacy Policy
                </button>
                <span className="text-red-500"> *</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed mt-4 py-2.5 flex items-center justify-center gap-2"
            >
              {isLoading && (
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
              {isLoading ? 'Creating Account...' : 'Register'}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-center text-gray-600 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-jeevacare-blue hover:underline font-medium">
              Login here
            </Link>
          </p>
        </div>
      </div>

      {/* Terms and Conditions Modal */}
      {showTermsModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="terms-modal-title"
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col p-6 animate-fade-in">
            <h2 id="terms-modal-title" className="text-xl font-bold text-jeevacare-navy mb-4">
              JeevaCare Terms and Conditions
            </h2>
            <div className="overflow-y-auto text-sm text-gray-600 space-y-3 pr-2 flex-1">
              <p>
                <strong>1. Acceptance of Terms:</strong> By creating an account on JeevaCare, you
                agree to abide by all platform rules and security policies governing electronic
                health records (EHR).
              </p>
              <p>
                <strong>2. Health Data Privacy:</strong> JeevaCare maintains strict patient
                isolation standards. Your medical timeline, diagnostic reports, and personal
                health metrics are accessible exclusively to you and healthcare providers whom you
                explicitly authorize.
              </p>
              <p>
                <strong>3. Accurate Information:</strong> You agree to provide accurate and truthful
                personal and contact details to assist clinical continuity across healthcare facilities.
              </p>
              <p>
                <strong>4. Account Security:</strong> You are responsible for maintaining the
                confidentiality of your login credentials and immediately notifying JeevaCare of any
                unauthorized access.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="btn-secondary px-5 py-2 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="privacy-modal-title"
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col p-6 animate-fade-in">
            <h2 id="privacy-modal-title" className="text-xl font-bold text-jeevacare-navy mb-4">
              JeevaCare Privacy Policy
            </h2>
            <div className="overflow-y-auto text-sm text-gray-600 space-y-3 pr-2 flex-1">
              <p>
                <strong>1. Information Collection:</strong> We collect necessary identification
                and contact data to ensure clinical continuity and secure identity resolution
                across medical consultations.
              </p>
              <p>
                <strong>2. Medical Data Encryption:</strong> All patient records, clinical notes,
                and diagnostic attachments are encrypted in transit via TLS and at rest.
              </p>
              <p>
                <strong>3. Audit Logging:</strong> In compliance with healthcare standards, all
                access events to your medical journey are logged in an immutable audit ledger.
              </p>
              <p>
                <strong>4. No Unauthorized Disclosure:</strong> Your health data is never sold,
                leased, or shared with third parties without your explicit consent.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="btn-secondary px-5 py-2 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

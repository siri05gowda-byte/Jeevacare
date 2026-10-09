import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Logo from '../components/Logo';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [localError, setLocalError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setLocalError('');
    clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!formData.email || !formData.password) {
      setLocalError('Please fill in all fields');
      return;
    }

    try {
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err) {
      setLocalError(err.response?.data?.error?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-jeevacare-navy to-jeevacare-blue flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md">
        {/* Main Login Card */}
        <div className="bg-white rounded-xl shadow-2xl p-8 animate-fade-in">
          {/* Logo & Branding */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Logo
                variant="light"
                size="lg"
                showText={true}
                className="flex-col gap-2"
              />
            </div>
            <p className="text-gray-600 text-sm mt-2 font-medium">
              One Life. One Health Journey.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Alert */}
            {(error || localError) && (
              <div className="alert-error">
                <p className="text-sm">{error || localError}</p>
              </div>
            )}

            {/* Email Input */}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                placeholder="your.email@example.com"
                disabled={isLoading}
              />
            </div>

            {/* Password Input */}
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin-slow inline-block">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.2"></circle>
                      <path d="M12 2a10 10 0 0 1 0 20" stroke="currentColor" strokeWidth="2" fill="none"></path>
                    </svg>
                  </span>
                  Logging in...
                </span>
              ) : (
                'Login'
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <p className="text-center text-gray-600 text-sm mt-6">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="link font-medium"
            >
              Register here
            </Link>
          </p>
        </div>

        {/* Demo Account Info Card */}
        <div className="mt-8 bg-white/10 backdrop-blur p-6 rounded-lg text-white border border-white/20 animate-slide-in-up">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <span className="text-lg">👤</span> Demo Accounts
          </h3>
          <div className="text-sm space-y-2">
            <div className="flex items-center justify-between">
              <span><strong>Patient:</strong></span>
              <code className="bg-white/20 px-2 py-1 rounded text-xs font-mono">patient@demo.com</code>
            </div>
            <div className="flex items-center justify-between">
              <span><strong>Doctor:</strong></span>
              <code className="bg-white/20 px-2 py-1 rounded text-xs font-mono">doctor@demo.com</code>
            </div>
            <div className="flex items-center justify-between">
              <span><strong>Admin:</strong></span>
              <code className="bg-white/20 px-2 py-1 rounded text-xs font-mono">admin@demo.com</code>
            </div>
            <div className="mt-3 pt-3 border-t border-white/20">
              <span className="text-xs"><strong>Password:</strong></span>
              <code className="bg-white/20 px-2 py-1 rounded text-xs font-mono block mt-1">DemoPassword123</code>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <p className="text-center text-white/70 text-xs mt-6">
          JeevaCare — Comprehensive Lifelong Health Management Platform
        </p>
      </div>
    </div>
  );
}

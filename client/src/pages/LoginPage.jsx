import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

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
    <div className="min-h-screen bg-gradient-to-br from-jeevacare-navy to-jeevacare-blue flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-jeevacare-blue">JeevaCare</h1>
            <p className="text-gray-600 text-sm mt-1">One Life. One Health Journey.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {(error || localError) && (
              <div className="alert-error">
                <p className="text-sm">{error || localError}</p>
              </div>
            )}

            <div>
              <label className="form-label">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <p className="text-center text-gray-600 text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-jeevacare-blue hover:underline font-medium">
              Register here
            </Link>
          </p>
        </div>

        <div className="mt-8 bg-white/10 backdrop-blur p-6 rounded-lg text-white">
          <h3 className="font-semibold mb-3">Demo Accounts</h3>
          <div className="text-sm space-y-2">
            <p>
              <strong>Patient:</strong> patient@demo.com
            </p>
            <p>
              <strong>Doctor:</strong> doctor@demo.com
            </p>
            <p>
              <strong>Admin:</strong> admin@demo.com
            </p>
            <p className="mt-3 text-xs">Password: DemoPassword123</p>
          </div>
        </div>
      </div>
    </div>
  );
}

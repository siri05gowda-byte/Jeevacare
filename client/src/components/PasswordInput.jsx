import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * PasswordInput Component
 * 
 * A reusable password input field with show/hide toggle functionality.
 * Maintains all existing input styling, dimensions, borders, focus states, and responsive layout.
 * 
 * @param {string} id - Input field ID
 * @param {string} name - Input field name
 * @param {string} value - Current password value
 * @param {function} onChange - Change handler
 * @param {string} placeholder - Placeholder text
 * @param {string} className - Additional CSS classes for the input
 * @param {boolean} disabled - Whether the input is disabled
 * @param {boolean} required - Whether the input is required
 * @param {string} autoComplete - Autocomplete attribute
 * @param {number} minLength - Minimum password length
 * @param {object} ...rest - Any other input props
 */
export default function PasswordInput({
  id,
  name,
  value,
  onChange,
  placeholder = '••••••••',
  className = 'form-input w-full',
  disabled = false,
  required = false,
  autoComplete = 'current-password',
  minLength,
  ...rest
}) {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${className} pr-10`}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        minLength={minLength}
        {...rest}
      />
      <button
        type="button"
        onClick={togglePasswordVisibility}
        disabled={disabled}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-jeevacare-blue focus:ring-offset-1 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        tabIndex={0}
      >
        {showPassword ? (
          <EyeOff size={18} aria-hidden="true" />
        ) : (
          <Eye size={18} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

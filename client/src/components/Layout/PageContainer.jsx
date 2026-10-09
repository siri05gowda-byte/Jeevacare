import React from 'react';

/**
 * PageContainer Component
 * 
 * Provides consistent padding and max-width for page content.
 * Standardizes spacing across the application.
 * 
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Page content
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.fullWidth=false] - Remove max-width constraint
 * @returns {React.ReactElement}
 */
export default function PageContainer({
  children,
  className = '',
  fullWidth = false,
}) {
  return (
    <div
      className={`
        px-4 sm:px-6 md:px-8 py-6 sm:py-8
        ${fullWidth ? 'w-full' : 'max-w-7xl mx-auto'}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

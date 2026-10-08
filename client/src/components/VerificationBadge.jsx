import React from 'react';

export default function VerificationBadge({ status = 'pending_review' }) {
  const getBadgeConfig = (status) => {
    switch (status) {
      case 'provider_verified':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          label: '✓ Verified',
          icon: '✓'
        };
      case 'patient_uploaded':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-800',
          label: 'Patient Upload',
          icon: '📤'
        };
      case 'pending_review':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          label: 'Pending Review',
          icon: '⏳'
        };
      case 'amended':
        return {
          bg: 'bg-purple-100',
          text: 'text-purple-800',
          label: 'Amended',
          icon: '✎'
        };
      case 'restricted':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          label: 'Restricted',
          icon: '🔒'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          label: 'Unknown',
          icon: '?'
        };
    }
  };

  const config = getBadgeConfig(status);

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </span>
  );
}

import React from 'react';
import { CheckCircle2, Upload, Clock, Edit2, Lock, HelpCircle } from 'lucide-react';

export default function VerificationBadge({ status = 'pending_review' }) {
  const getBadgeConfig = (status) => {
    switch (status) {
      case 'provider_verified':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          label: 'Verified',
          Icon: CheckCircle2
        };
      case 'patient_uploaded':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-800',
          label: 'Patient Upload',
          Icon: Upload
        };
      case 'pending_review':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          label: 'Pending Review',
          Icon: Clock
        };
      case 'amended':
        return {
          bg: 'bg-purple-100',
          text: 'text-purple-800',
          label: 'Amended',
          Icon: Edit2
        };
      case 'restricted':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          label: 'Restricted',
          Icon: Lock
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          label: 'Unknown',
          Icon: HelpCircle
        };
    }
  };

  const config = getBadgeConfig(status);
  const Icon = config.Icon;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <Icon size={14} className="mr-1" />
      {config.label}
    </span>
  );
}

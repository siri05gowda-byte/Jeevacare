import React from 'react';
import { FileText, Calendar, AlertCircle, Inbox, Search } from 'lucide-react';

/**
 * EmptyState Component
 * 
 * Displays friendly message when no data is available.
 * Encourages user action with optional CTA button.
 * 
 * @component
 * @param {Object} props
 * @param {string} [props.type='default'] - Empty state type: 'default', 'no-records', 'no-appointments', 'no-search', 'no-access'
 * @param {string} [props.title] - Custom title text
 * @param {string} [props.description] - Custom description text
 * @param {string} [props.icon] - Icon type or custom React component
 * @param {Object} [props.action] - Optional action button: { label, onClick, variant }
 * @returns {React.ReactElement}
 */
export default function EmptyState({
  type = 'default',
  title = null,
  description = null,
  icon = null,
  action = null,
}) {
  const presets = {
    'default': {
      icon: Inbox,
      title: 'Nothing here yet',
      description: 'There is no data to display at the moment.',
    },
    'no-records': {
      icon: FileText,
      title: 'No health records',
      description: 'You do not have any health records yet. Records will appear here as they are added.',
    },
    'no-appointments': {
      icon: Calendar,
      title: 'No appointments',
      description: 'You do not have any upcoming appointments. Schedule one with your healthcare provider.',
    },
    'no-search': {
      icon: Search,
      title: 'No results found',
      description: 'Try adjusting your search criteria and try again.',
    },
    'no-access': {
      icon: AlertCircle,
      title: 'Access denied',
      description: 'You do not have permission to view this content.',
    },
  };

  const config = presets[type] || presets['default'];
  const finalTitle = title || config.title;
  const finalDescription = description || config.description;

  const renderIcon = () => {
    if (React.isValidElement(icon)) {
      return icon;
    }
    const IconComponent = icon || config.icon;
    if (IconComponent) {
      return <IconComponent size={48} className="text-gray-400" />;
    }
    return null;
  };

  const renderAction = () => {
    if (!action) return null;
    if (React.isValidElement(action)) {
      return <div className="mt-6 flex justify-center">{action}</div>;
    }
    if (action.label) {
      return (
        <div className="mt-6">
          <button
            onClick={action.onClick}
            className={`btn ${action.variant ? `btn-${action.variant}` : 'btn-primary'}`}
          >
            {action.label}
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="empty-state py-12 sm:py-16 text-center">
      <div className="flex justify-center mb-4">
        <div className="empty-state-icon">
          {renderIcon()}
        </div>
      </div>

      <h3 className="empty-state-title text-lg font-semibold text-gray-900 mb-1">{finalTitle}</h3>
      <p className="empty-state-description text-sm text-gray-500 max-w-sm mx-auto">{finalDescription}</p>

      {renderAction()}
    </div>
  );
}

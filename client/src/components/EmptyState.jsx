import React from 'react';
import { Clipboard } from 'lucide-react';

export default function EmptyState({ 
  title = 'No records found',
  description = 'There are no records to display.',
  IconComponent = Clipboard,
  action = null
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <IconComponent size={64} className="mb-4 text-gray-400" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-center max-w-md mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="btn btn-primary"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

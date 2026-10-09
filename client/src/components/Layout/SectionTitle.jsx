import React from 'react';

/**
 * SectionTitle Component
 * 
 * Displays a consistent page or section heading with optional icon and description.
 * 
 * @component
 * @param {Object} props
 * @param {string} props.title - Main title text
 * @param {string} [props.description] - Optional description/subtitle
 * @param {React.ReactNode} [props.icon] - Optional icon element
 * @param {React.ReactNode} [props.action] - Optional action button/element (right-aligned)
 * @returns {React.ReactElement}
 */
export default function SectionTitle({
  title,
  description = null,
  icon = null,
  action = null,
}) {
  return (
    <div className="mb-6 sm:mb-8 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="flex-shrink-0 text-jeevacare-blue">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            {title}
          </h1>
          {description && (
            <p className="text-gray-600 text-sm sm:text-base mt-1">
              {description}
            </p>
          )}
        </div>
      </div>

      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}

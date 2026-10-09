import React from 'react';

/**
 * LoadingSkeleton Component
 * 
 * Displays animated skeleton loaders for various content types.
 * Improves perceived performance during data loading.
 * 
 * @component
 * @param {Object} props
 * @param {string} [props.type='card'] - Skeleton type: 'card', 'text', 'avatar', 'list', 'table', 'timeline'
 * @param {number} [props.count=1] - Number of skeleton items to display
 * @param {string} [props.className] - Additional CSS classes
 * @returns {React.ReactElement}
 */
export default function LoadingSkeleton({ type = 'card', count = 1, className = '' }) {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className="space-y-4 p-4">
            <div className="skeleton h-6 w-3/4" />
            <div className="space-y-2">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-5/6" />
            </div>
            <div className="flex gap-2 pt-2">
              <div className="skeleton h-10 w-20" />
              <div className="skeleton h-10 w-20" />
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-3">
            <div className="skeleton h-6 w-2/3" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-4/5" />
          </div>
        );

      case 'avatar':
        return (
          <div className="flex items-center gap-3">
            <div className="skeleton w-12 h-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          </div>
        );

      case 'list':
        return (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="skeleton w-10 h-10 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        );

      case 'table':
        return (
          <div className="space-y-3">
            {/* Header */}
            <div className="flex gap-3 pb-3 border-b">
              <div className="skeleton h-5 w-1/4" />
              <div className="skeleton h-5 w-1/4" />
              <div className="skeleton h-5 w-1/4" />
              <div className="skeleton h-5 w-1/4" />
            </div>
            {/* Rows */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="skeleton h-4 w-1/4" />
                <div className="skeleton h-4 w-1/4" />
                <div className="skeleton h-4 w-1/4" />
                <div className="skeleton h-4 w-1/4" />
              </div>
            ))}
          </div>
        );

      case 'timeline':
        return (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="skeleton w-3 h-3 rounded-full mt-2 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-1/2" />
                  <div className="skeleton h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        );

      default:
        return <div className="skeleton h-12 w-full" />;
    }
  };

  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={index > 0 ? 'mt-6' : ''}>
          {renderSkeleton()}
        </div>
      ))}
    </div>
  );
}

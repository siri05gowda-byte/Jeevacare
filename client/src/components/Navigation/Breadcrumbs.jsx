import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

/**
 * Breadcrumbs Component
 * 
 * Displays navigation breadcrumbs based on current route.
 * Provides visual hierarchy and improves navigation UX.
 * 
 * @component
 * @param {Object} props
 * @param {Array<{label: string, path?: string}>} [props.items] - Custom breadcrumb items (overrides auto-generation)
 * @returns {React.ReactElement}
 */
export default function Breadcrumbs({ items = null }) {
  const location = useLocation();

  // Auto-generate breadcrumbs from route if not provided
  const generateBreadcrumbs = () => {
    if (items) return items;

    const pathnames = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'Home', path: '/dashboard' }];

    pathnames.forEach((value, index) => {
      const path = `/${pathnames.slice(0, index + 1).join('/')}`;
      const label = value
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

      breadcrumbs.push({ label, path });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs.length <= 1) {
    return null; // Don't show breadcrumbs on home
  }

  return (
    <nav
      className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-gray-200 bg-white text-sm"
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center gap-2">
        {breadcrumbs.map((breadcrumb, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <li key={breadcrumb.path || index} className="flex items-center gap-2">
              {isLast ? (
                // Current page - no link
                <span
                  className="text-gray-600 font-medium"
                  aria-current="page"
                >
                  {breadcrumb.label}
                </span>
              ) : (
                // Breadcrumb link
                <>
                  <Link
                    to={breadcrumb.path}
                    className="link text-gray-600 hover:text-jeevacare-blue transition-colors"
                  >
                    {breadcrumb.label}
                  </Link>
                  <ChevronRight
                    size={16}
                    className="text-gray-400"
                    aria-hidden="true"
                  />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

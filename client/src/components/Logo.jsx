import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Logo Component
 * 
 * Renders the JeevaCare logo with optional link and customizable styling.
 * Automatically selects light/dark variant based on appearance preference or props.
 * 
 * @component
 * @param {Object} props
 * @param {string} [props.variant='light'] - Logo variant: 'light', 'dark', 'monochrome', 'icon'
 * @param {string} [props.size='md'] - Logo size: 'sm', 'md', 'lg', 'xl'
 * @param {string} [props.href] - Optional link path (if provided, wraps in Link)
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.showText=true] - Show "JeevaCare" text next to logo (full logo only)
 * @param {string} [props.text] - Custom text to display with logo
 * @param {boolean} [props.autoDetectTheme=false] - Auto-detect dark mode from system preference
 * @returns {React.ReactElement}
 */
export default function Logo({
  variant = 'light',
  size = 'md',
  href = null,
  className = '',
  showText = true,
  text = 'JeevaCare',
  autoDetectTheme = false,
}) {
  // Auto-detect theme if enabled
  const finalVariant = autoDetectTheme
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    : variant;

  // Size configurations (in rem/pixels)
  const sizes = {
    sm: { icon: 24, container: 'w-6 h-6', text: 'text-sm' },
    md: { icon: 32, container: 'w-8 h-8', text: 'text-base' },
    lg: { icon: 48, container: 'w-12 h-12', text: 'text-lg' },
    xl: { icon: 64, container: 'w-16 h-16', text: 'text-xl' },
  };

  const sizeConfig = sizes[size] || sizes.md;

  // Map variant to icon asset
  const getLogoPath = () => {
    switch (finalVariant) {
      case 'dark':
        return '/assets/logos/jeevacare-icon-dark.svg';
      case 'monochrome':
        return '/assets/logos/jeevacare-icon-monochrome.svg';
      case 'icon':
        return '/assets/logos/jeevacare-icon.svg';
      case 'light':
      default:
        return '/assets/logos/jeevacare-icon.svg';
    }
  };

  const logoContent = (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Icon */}
      <img
        src={getLogoPath()}
        alt={text}
        className={`${sizeConfig.container} flex-shrink-0`}
        loading="lazy"
      />
      
      {/* Text (only for non-icon variants) */}
      {showText && variant !== 'icon' && (
        <div className="flex flex-col">
          <span className={`${sizeConfig.text} font-bold text-jeevacare-blue`}>
            {text}
          </span>
          <span className="text-xs text-gray-600 leading-none">
            One Life. One Health Journey.
          </span>
        </div>
      )}
    </div>
  );

  // Return wrapped in Link if href is provided, otherwise return div
  if (href) {
    return (
      <Link
        to={href}
        className="hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-jeevacare-blue focus:ring-offset-2 rounded"
        aria-label={text}
      >
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}

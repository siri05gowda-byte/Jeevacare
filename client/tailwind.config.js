export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // JeevaCare Brand Colors - Primary
        'jeevacare': {
          // Primary blue palette
          'navy': '#0f172a',      // Deep navy for headers, text
          'blue': '#1e3a8a',      // Primary medical blue
          'light-blue': '#3b82f6', // Secondary blue for accents
          'sky': '#0ea5e9',       // Sky blue for interactive elements
          
          // Status/Semantic colors
          'green': '#10b981',     // Success, positive actions
          'amber': '#f59e0b',     // Warnings, cautions
          'red': '#ef4444',       // Errors, critical alerts
          'orange': '#f97316',    // Info, secondary actions
          
          // Neutral grays (accessible contrast)
          'gray-50': '#f9fafb',
          'gray-100': '#f3f4f6',
          'gray-200': '#e5e7eb',
          'gray-300': '#d1d5db',
          'gray-400': '#9ca3af',
          'gray-500': '#6b7280',
          'gray-600': '#4b5563',
          'gray-700': '#374151',
          'gray-800': '#1f2937',
          'gray-900': '#111827',
          
          // Status-specific backgrounds
          'success-bg': '#d1fae5',  // Light green
          'warning-bg': '#fef3c7',  // Light amber
          'error-bg': '#fee2e2',    // Light red
          'info-bg': '#dbeafe',     // Light blue
        },
        // Deprecated (for backward compatibility)
        'jeevacare-blue': '#1e3a8a',
        'jeevacare-light-blue': '#3b82f6',
        'jeevacare-navy': '#0f172a',
        'jeevacare-green': '#10b981',
        'jeevacare-amber': '#f59e0b',
        'jeevacare-red': '#ef4444',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        'mono': ['Fira Code', 'Menlo', 'monospace'],
      },
      fontSize: {
        // Extended typography scale
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      fontWeight: {
        thin: '100',
        extralight: '200',
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900',
      },
      spacing: {
        // Consistent spacing scale (4px base grid)
        '0': '0',
        '1': '0.25rem',    // 4px
        '2': '0.5rem',     // 8px
        '3': '0.75rem',    // 12px
        '4': '1rem',       // 16px
        '5': '1.25rem',    // 20px
        '6': '1.5rem',     // 24px
        '7': '1.75rem',    // 28px
        '8': '2rem',       // 32px
        '9': '2.25rem',    // 36px
        '10': '2.5rem',    // 40px
        '12': '3rem',      // 48px
        '14': '3.5rem',    // 56px
        '16': '4rem',      // 64px
        '20': '5rem',      // 80px
        '24': '6rem',      // 96px
      },
      borderRadius: {
        'none': '0',
        'sm': '0.25rem',   // 4px - minimal rounding
        'base': '0.5rem',  // 8px - default
        'md': '0.75rem',   // 12px - medium
        'lg': '1rem',      // 16px - large
        'xl': '1.25rem',   // 20px - extra large
        '2xl': '1.5rem',   // 24px - double xl
        'full': '9999px',  // circular
      },
      shadow: {
        // Accessible shadow scale
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'base': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
        'none': 'none',
      },
      opacity: {
        '0': '0',
        '5': '0.05',
        '10': '0.1',
        '20': '0.2',
        '25': '0.25',
        '30': '0.3',
        '40': '0.4',
        '50': '0.5',
        '60': '0.6',
        '70': '0.7',
        '75': '0.75',
        '80': '0.8',
        '90': '0.9',
        '95': '0.95',
        '100': '1',
      },
      transitionDuration: {
        '75': '75ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
        '500': '500ms',
        '700': '700ms',
        '1000': '1000ms',
      },
      transitionTimingFunction: {
        'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-left': {
          from: { transform: 'translateX(-100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-down': {
          from: { transform: 'translateY(-100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-up': {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' },
        },
      },
      animation: {
        'spin-slow': 'spin-slow 3s linear infinite',
        'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fade-in 300ms ease-out',
        'slide-in-right': 'slide-in-right 300ms ease-out',
        'slide-in-left': 'slide-in-left 300ms ease-out',
        'slide-in-down': 'slide-in-down 300ms ease-out',
        'slide-in-up': 'slide-in-up 300ms ease-out',
        'scale-in': 'scale-in 200ms ease-out',
        'bounce-subtle': 'bounce-subtle 1s ease-in-out infinite',
      },
      screens: {
        // Responsive breakpoints (Tailwind defaults + custom)
        'xs': '320px',   // Extra small phones
        'sm': '640px',   // Small devices (portrait tablet, landscape phone)
        'md': '768px',   // Medium (tablet)
        'lg': '1024px',  // Large (small laptop)
        'xl': '1280px',  // Extra large (desktop)
        '2xl': '1536px', // 2x extra large (large desktop)
        // Touch device detection (not standard Tailwind)
        'touch': { raw: '(hover: none)' },
        'no-touch': { raw: '(hover: hover)' },
      },
      minHeight: {
        'screen': '100vh',
        'screen-safe': 'min(100vh, 100dvh)',  // Accounts for mobile address bar
      },
      maxWidth: {
        'screen-xl': '80rem',
        'prose': '65ch',
      },
      zIndex: {
        '-1': '-1',
        '0': '0',
        '10': '10',
        '20': '20',
        '30': '30',
        '40': '40',
        '50': '50',
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
        'dropdown': '1000',
        'sticky': '1020',
        'fixed': '1030',
        'modal-backdrop': '1040',
        'modal': '1050',
        'popover': '1060',
        'tooltip': '1070',
      },
    },
  },
  plugins: [],
};

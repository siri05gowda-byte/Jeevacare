import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

/**
 * Toast Component
 * 
 * Displays temporary notifications for user feedback.
 * Auto-dismisses after specified duration.
 * 
 * @component
 * @param {Object} props
 * @param {string} props.message - Toast message text
 * @param {string} [props.type='info'] - Toast type: 'success', 'error', 'warning', 'info'
 * @param {number} [props.duration=3000] - Auto-dismiss duration in milliseconds
 * @param {Function} [props.onClose] - Callback when toast closes
 * @param {string} [props.id] - Unique identifier for this toast
 * @returns {React.ReactElement}
 */
export default function Toast({
  message,
  type = 'info',
  duration = 3000,
  onClose = null,
  id = null,
}) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration <= 0) return;

    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const config = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
      iconColor: 'text-green-600',
    },
    error: {
      icon: AlertCircle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
      iconColor: 'text-red-600',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-800',
      iconColor: 'text-amber-600',
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
      iconColor: 'text-blue-600',
    },
  };

  const toastConfig = config[type] || config.info;
  const Icon = toastConfig.icon;

  return (
    <div
      className={`
        flex items-start gap-3 px-4 py-3 rounded-lg border
        ${toastConfig.bgColor} ${toastConfig.borderColor} ${toastConfig.textColor}
        animate-slide-in-up shadow-lg
      `}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <Icon size={20} className={`flex-shrink-0 ${toastConfig.iconColor} mt-0.5`} />
      <p className="text-sm font-medium flex-1">{message}</p>
      <button
        onClick={() => {
          setIsVisible(false);
          onClose?.();
        }}
        className={`flex-shrink-0 p-1 hover:opacity-70 transition-opacity focus-visible:outline-offset-2 rounded`}
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
    </div>
  );
}

/**
 * Toast Container Component
 * 
 * Manages multiple toast notifications.
 * Position them in a stack with proper spacing.
 * 
 * @component
 * @param {Object} props
 * @param {Array<{id: string, message: string, type: string, duration: number}>} props.toasts - Array of toast configurations
 * @param {Function} props.onRemove - Callback when toast is removed: (id) => void
 * @param {string} [props.position='bottom-right'] - Toast position: 'top-left', 'top-right', 'bottom-left', 'bottom-right'
 * @returns {React.ReactElement}
 */
export function ToastContainer({ toasts = [], onRemove, position = 'bottom-right' }) {
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <div
      className={`fixed ${positionClasses[position] || positionClasses['bottom-right']} z-tooltip max-w-sm space-y-3`}
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => onRemove?.(toast.id)}
        />
      ))}
    </div>
  );
}

/**
 * useToast Hook
 * 
 * Provides toast notification functionality within a component.
 * 
 * @returns {Object} Toast utilities: { show, success, error, warning, info }
 * 
 * @example
 * const { success, error } = useToast();
 * success('Operation completed successfully!');
 * error('An error occurred');
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const show = (message, type = 'info', duration = 3000) => {
    const id = Date.now().toString();
    const newToast = { id, message, type, duration };
    setToasts((prev) => [...prev, newToast]);
    return id;
  };

  const success = (message, duration = 3000) => show(message, 'success', duration);
  const error = (message, duration = 5000) => show(message, 'error', duration);
  const warning = (message, duration = 4000) => show(message, 'warning', duration);
  const info = (message, duration = 3000) => show(message, 'info', duration);

  const remove = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const clear = () => {
    setToasts([]);
  };

  return {
    toasts,
    show,
    success,
    error,
    warning,
    info,
    remove,
    clear,
  };
}

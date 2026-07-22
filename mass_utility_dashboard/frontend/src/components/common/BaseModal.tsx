import React, { useEffect } from 'react';

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: string;
  children: React.ReactNode;
  footerActions?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footerActions,
  maxWidth = 'lg'
}) => {
  // Listen for ESC key press to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
  }[maxWidth];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidthClasses} bg-pm-card-bg border border-pm-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-pm-border/60 bg-pm-bg/40">
          <div className="flex items-center gap-3">
            {icon && <span className="text-xl">{icon}</span>}
            <div>
              <h3 className="text-base font-bold text-pm-text-primary">{title}</h3>
              {subtitle && <p className="text-xs text-pm-text-secondary mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-pm-text-secondary hover:text-pm-text-primary hover:bg-pm-border/30 rounded-md transition-colors text-lg leading-none"
            title="Close (ESC)"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 text-sm text-pm-text-primary">
          {children}
        </div>

        {/* Optional Footer Actions */}
        {footerActions && (
          <div className="flex items-center justify-end gap-2 p-3 border-t border-pm-border/60 bg-pm-bg/40">
            {footerActions}
          </div>
        )}
      </div>
    </div>
  );
};

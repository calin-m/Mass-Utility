// @Arch[BaseModal]
import React, { useEffect } from 'react';
import { LucideIcon } from 'lucide-react';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: LucideIcon;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  variant?: 'primary' | 'danger';
  children: React.ReactNode;
}

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  icon: Icon,
  maxWidth = 'md',
  variant = 'primary',
  children,
}) => {
  // ESC key lifecycle handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
  }[maxWidth];

  const borderClass = variant === 'danger' ? 'border-rose-500/30' : 'border-pm-border';
  const iconColorClass = variant === 'danger' ? 'text-rose-500' : 'text-purple-600 dark:text-purple-400';
  const titleColorClass = variant === 'danger' ? 'text-rose-500' : 'text-pm-text';

  return (
    <div className="fixed inset-0 top-0 left-0 w-full h-full bg-slate-950/75 dark:bg-slate-950/85 backdrop-blur-md z-[9999999] flex items-start justify-center pt-12 pb-8 px-4 overflow-y-auto">
      <div
        className={`bg-pm-card border ${borderClass} rounded-2xl ${maxWidthClasses} w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col justify-between overflow-hidden`}
      >
        {/* Modal Header */}
        <div className="p-4 bg-pm-input/20 border-b border-pm-border flex justify-between items-center shrink-0">
          <h3 className={`text-sm font-bold ${titleColorClass} flex items-center gap-2`}>
            {Icon && <Icon className={`w-4.5 h-4.5 ${iconColorClass}`} />}
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-pm-secondary hover:text-pm-text p-1 rounded-lg hover:bg-pm-input transition text-xs cursor-pointer"
            title="Close (ESC)"
          >
            ✕
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">{children}</div>
      </div>
    </div>
  );
};

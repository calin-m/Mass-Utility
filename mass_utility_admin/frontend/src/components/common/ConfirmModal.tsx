import React from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle, X } from 'lucide-react';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm Action',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}) => {
  if (!isOpen) return null;

  const getVariantConfig = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />,
          btnVariant: 'danger' as const,
          border: 'border-l-4 border-l-rose-500',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />,
          btnVariant: 'primary' as const,
          border: 'border-l-4 border-l-amber-500',
        };
      case 'info':
      default:
        return {
          icon: <CheckCircle className="w-6 h-6 text-purple-400 shrink-0" />,
          btnVariant: 'primary' as const,
          border: 'border-l-4 border-l-purple-500',
        };
    }
  };

  const config = getVariantConfig();

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999999] flex items-center justify-center p-4">
      <div className={`bg-pm-card border border-pm-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 ${config.border}`}>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-pm-input rounded-xl border border-pm-border">
              {config.icon}
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-base text-pm-text">{title}</h3>
              <p className="text-xs text-pm-secondary mt-1 leading-relaxed">{message}</p>
            </div>
            <button
              onClick={onClose}
              className="text-pm-secondary hover:text-pm-text transition p-1 rounded-lg hover:bg-pm-input"
              title="Close Modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-pm-border">
            <Button
              variant="neutral"
              size="md"
              onClick={onClose}
              disabled={loading}
            >
              {cancelText}
            </Button>
            <Button
              variant={config.btnVariant}
              size="md"
              onClick={onConfirm}
              loading={loading}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

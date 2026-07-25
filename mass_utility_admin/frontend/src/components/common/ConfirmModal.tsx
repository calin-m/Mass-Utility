import React from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle, X } from 'lucide-react';

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

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />,
          btn: 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/50',
          border: 'border-l-4 border-l-rose-500',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />,
          btn: 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-950/50',
          border: 'border-l-4 border-l-amber-500',
        };
      case 'info':
      default:
        return {
          icon: <CheckCircle className="w-6 h-6 text-purple-400 shrink-0" />,
          btn: 'pm-btn-primary',
          border: 'border-l-4 border-l-purple-500',
        };
    }
  };

  const style = getVariantStyles();

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999999] flex items-center justify-center p-4">
      <div className={`bg-pm-card-bg border border-pm-border-color rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 ${style.border}`}>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-pm-input-bg rounded-xl border border-pm-border-color/50">
              {style.icon}
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-base text-pm-text">{title}</h3>
              <p className="text-xs text-pm-secondary mt-1 leading-relaxed">{message}</p>
            </div>
            <button
              onClick={onClose}
              className="text-pm-secondary hover:text-pm-text transition p-1 rounded-lg hover:bg-pm-input-bg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-pm-border-color/50">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="pm-btn-neutral px-4 py-2 rounded-xl text-xs font-bold transition"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${style.btn} ${loading ? 'opacity-70 cursor-wait' : ''}`}
            >
              {loading ? 'Processing...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

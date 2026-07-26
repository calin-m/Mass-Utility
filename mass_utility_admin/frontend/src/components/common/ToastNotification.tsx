import React from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

export interface ToastMessage {
  msg: string;
  type: 'success' | 'error';
}

interface ToastNotificationProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onClose }) => {
  if (!toast) return null;

  const isError = toast.type === 'error';

  return (
    <div className="fixed bottom-5 right-5 z-[9999999] animate-in slide-in-from-bottom duration-200">
      <div
        className={`px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border text-xs font-bold flex items-center justify-between gap-3 min-w-[280px] max-w-md ${
          isError
            ? 'bg-pm-card border-rose-500/40 text-rose-500 border-l-4 border-l-rose-500 shadow-rose-950/20'
            : 'bg-pm-card border-emerald-500/40 text-emerald-500 border-l-4 border-l-emerald-500 shadow-emerald-950/20'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isError ? (
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          )}
          <span className="leading-snug">{toast.msg}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-pm-secondary hover:text-pm-text transition ml-2 shrink-0"
          title="Dismiss Notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

import React from 'react';

export type BadgeVariant = 'local' | 'cloud' | 'pinned' | 'success' | 'danger' | 'warning' | 'info';

interface StatusBadgeProps {
  variant: BadgeVariant;
  label?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ variant, label, className = '' }) => {
  const getBadgeStyle = () => {
    switch (variant) {
      case 'local':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/10';
      case 'cloud':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/10';
      case 'pinned':
        return 'bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-500/10';
      case 'success':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/10';
      case 'danger':
        return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/10';
      case 'warning':
        return 'bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-500/10';
      case 'info':
      default:
        return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/10';
    }
  };

  const getDefaultLabel = () => {
    switch (variant) {
      case 'local':
        return 'Local DB';
      case 'cloud':
        return 'Cloud Sync';
      case 'pinned':
        return 'Pinned';
      case 'success':
        return 'Active';
      case 'danger':
        return 'Error';
      case 'warning':
        return 'Warning';
      case 'info':
      default:
        return 'Info';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border backdrop-blur-sm transition-all ${getBadgeStyle()} ${className}`}
    >
      {variant === 'pinned' && (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      )}
      {variant === 'cloud' && (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
      )}
      {variant === 'local' && (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
        </svg>
      )}
      <span>{label || getDefaultLabel()}</span>
    </span>
  );
};

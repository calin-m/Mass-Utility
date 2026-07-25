import React from 'react';
import { LucideIcon, RefreshCw } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'neutral' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  loading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'neutral',
  size = 'md',
  icon: Icon,
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'pm-btn-primary shadow-md shadow-purple-950/30 text-white hover:opacity-95';
      case 'danger':
        return 'pm-btn-danger-outline hover:bg-rose-500 hover:text-white text-rose-500 border-rose-500/30';
      case 'ghost':
        return 'bg-transparent hover:bg-pm-input text-pm-secondary hover:text-pm-text border-transparent';
      case 'neutral':
      default:
        return 'pm-btn-neutral text-pm-text hover:border-pm-primary';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'text-[11px] py-1 px-2.5 rounded-xl gap-1.5 font-semibold';
      case 'lg':
        return 'text-sm py-2.5 px-5 rounded-2xl gap-2 font-extrabold';
      case 'md':
      default:
        return 'text-xs py-2 px-4 rounded-xl gap-2 font-bold';
    }
  };

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center transition-all duration-150 active:scale-[0.98] ${getVariantStyles()} ${getSizeStyles()} ${
        disabled || loading ? 'opacity-60 cursor-not-allowed' : ''
      } ${className}`}
      {...props}
    >
      {loading ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0 text-purple-400" />
      ) : Icon ? (
        <Icon className="w-3.5 h-3.5 shrink-0" />
      ) : null}
      <span>{children}</span>
    </button>
  );
};

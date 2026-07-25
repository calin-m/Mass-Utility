import React from 'react';
import { LucideIcon, X } from 'lucide-react';

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
  onClear?: () => void;
  error?: string;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  icon: Icon,
  onClear,
  error,
  value,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full space-y-1">
      {label && (
        <label className="block text-[11px] font-bold uppercase tracking-wider text-pm-secondary">
          {label}
        </label>
      )}
      <div className="relative flex items-center w-full">
        {Icon && (
          <Icon className="w-4 h-4 absolute left-3 text-pm-secondary pointer-events-none shrink-0" />
        )}
        <input
          value={value}
          className={`w-full h-10 bg-pm-input border border-pm-border rounded-xl text-xs text-pm-text placeholder:text-pm-secondary/60 focus:outline-none focus:border-pm-primary focus:ring-1 focus:ring-pm-primary/30 transition-colors duration-150 ${
            Icon ? 'pl-9' : 'pl-3'
          } ${value && onClear ? 'pr-8' : 'pr-3'} ${
            error ? 'border-rose-500/80 focus:border-rose-500' : ''
          } ${className}`}
          {...props}
        />
        {value && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2.5 p-1 text-pm-secondary hover:text-pm-text rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition"
            title="Clear Input"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {error && <p className="text-[10px] text-rose-500 font-semibold">{error}</p>}
    </div>
  );
};

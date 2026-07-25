import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface FormSelectOption {
  value: string;
  label: string;
}

export interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  icon?: LucideIcon;
  options: FormSelectOption[];
  error?: string;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  label,
  icon: Icon,
  options,
  error,
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
        <select
          className={`w-full h-10 bg-pm-input border border-pm-border rounded-xl text-xs text-pm-text focus:outline-none focus:border-pm-primary focus:ring-1 focus:ring-pm-primary/30 transition-colors duration-150 cursor-pointer ${
            Icon ? 'pl-9' : 'pl-3'
          } pr-8 ${error ? 'border-rose-500/80 focus:border-rose-500' : ''} ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-pm-card text-pm-text py-1">
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-[10px] text-rose-500 font-semibold">{error}</p>}
    </div>
  );
};

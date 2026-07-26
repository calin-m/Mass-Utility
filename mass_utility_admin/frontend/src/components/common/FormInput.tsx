import React, { useState } from 'react';
import { LucideIcon, X, AlertCircle } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
  onClear?: () => void;
  error?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const FormInput: React.FC<FormInputProps> = ({
  label,
  icon: Icon,
  onClear,
  error,
  value,
  className = '',
  onChange,
  onBlur,
  type,
  ...props
}) => {
  const { t } = useTranslation();
  const [touched, setTouched] = useState(false);

  const stringVal = value !== undefined && value !== null ? String(value) : '';
  const isEmailType = type === 'email';
  const isInvalidEmail = isEmailType && touched && stringVal.length > 0 && !EMAIL_REGEX.test(stringVal.trim());

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setTouched(true);
    if (isEmailType && onChange && stringVal) {
      const sanitized = stringVal.trim().toLowerCase();
      if (sanitized !== stringVal) {
        const synthEvent = {
          ...e,
          target: { ...e.target, value: sanitized }
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(synthEvent);
      }
    }
    if (onBlur) onBlur(e);
  };

  const displayError = error || (isInvalidEmail ? t('err_invalid_email') : undefined);

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
          type={type}
          value={value}
          onChange={onChange}
          onBlur={handleBlur}
          className={`w-full h-10 bg-pm-input border border-pm-border rounded-xl text-xs text-pm-text placeholder:text-pm-secondary/60 focus:outline-none focus:border-pm-primary focus:ring-1 focus:ring-pm-primary/30 transition-colors duration-150 ${
            Icon ? 'pl-9' : 'pl-3'
          } ${value && onClear ? 'pr-8' : 'pr-3'} ${
            displayError ? 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/20' : ''
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
      {displayError && (
        <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{displayError}</span>
        </p>
      )}
    </div>
  );
};

// @Arch[ToggleSwitch]
import React from 'react';

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  title,
  description,
  size = 'md',
  disabled = false,
  className = '',
}) => {
  const isSmall = size === 'sm';

  return (
    <label
      className={`flex items-start gap-3 rounded-xl border border-pm-border cursor-pointer hover:border-purple-500/40 transition-all select-none ${
        isSmall ? 'p-2.5' : 'p-3.5'
      } ${
        checked
          ? 'bg-purple-500/5 border-purple-500/30'
          : 'bg-pm-card/60'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {/* SaaS Animated Sliding Track Switch */}
      <div className="relative inline-flex items-center shrink-0 mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`w-9 h-5 rounded-full transition-colors duration-200 ease-in-out border ${
            checked
              ? 'bg-purple-500 border-purple-400 shadow-md shadow-purple-500/30'
              : 'bg-slate-700/60 dark:bg-slate-700/50 border-pm-border dark:border-slate-600/50'
          }`}
        >
          <div
            className={`w-3.5 h-3.5 mt-[2px] bg-white rounded-full shadow-md transition-transform duration-200 ease-in-out ${
              checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
            }`}
          />
        </div>
      </div>

      <div className="space-y-0.5">
        <span className="text-xs font-bold text-pm-text block leading-snug">
          {title}
        </span>
        {description && (
          <span className="text-[11px] text-pm-secondary leading-normal block">
            {description}
          </span>
        )}
      </div>
    </label>
  );
};

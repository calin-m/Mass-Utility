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
      className={`flex items-start gap-3 rounded-lg border border-pm-border cursor-pointer hover:border-pm-primary/40 transition-all select-none ${
        isSmall ? 'p-3' : 'p-3.5'
      } ${
        checked
          ? 'bg-pm-primary/5 border-pm-primary/40'
          : 'bg-pm-bg'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded text-pm-primary focus:ring-pm-primary border-pm-border cursor-pointer"
      />
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

// @Arch[UI_Components]
// @Description: Unified panel header banner component rendering icon badge, title, subtitle, and action slot.

import React from 'react';

interface SectionHeaderProps {
  icon?: string;
  dotColor?: string;
  title: string;
  subtitle?: string;
  actionSlot?: React.ReactNode;
  extraActions?: React.ReactNode;
  borderBottom?: boolean;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  dotColor = 'bg-amber-500',
  title,
  subtitle,
  actionSlot,
  extraActions,
  borderBottom = false,
}) => {
  const actions = actionSlot || extraActions;

  return (
    <div className={`flex justify-between items-center flex-wrap gap-4 ${borderBottom ? 'border-b border-[var(--pm-border-color)] pb-3' : ''}`}>
      <div className="flex items-center gap-3">
        {icon ? (
          <span className="text-base flex items-center justify-center">{icon}</span>
        ) : (
          <span className={`w-2.5 h-2.5 ${dotColor} rounded-full animate-pulse`}></span>
        )}
        <div>
          <h3 className="text-sm font-bold tracking-wide uppercase text-[var(--pm-text-primary)]">{title}</h3>
          {subtitle && <p className="text-xs text-[var(--pm-text-secondary)] mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
};

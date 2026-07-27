// @Arch[SectionHeader]
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, icon: Icon, action }) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div>
        <h3 className="text-base font-bold text-pm-text border-l-4 border-pm-primary pl-3 flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-pm-primary" />}
          {title}
        </h3>
        {subtitle && <p className="text-xs text-pm-secondary mt-1 pl-4">{subtitle}</p>}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

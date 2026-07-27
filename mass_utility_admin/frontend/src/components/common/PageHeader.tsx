// @Arch[PageHeader]
import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface PageHeaderProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  icon: Icon,
  title,
  description,
  children,
  className = '',
}) => {
  return (
    <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-pm-card p-4 rounded-xl border border-pm-border shadow-sm ${className}`}>
      <div>
        <h2 className="text-base font-bold text-pm-text flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-pm-primary shrink-0" />}
          <span>{title}</span>
        </h2>
        {description && (
          <p className="text-xs text-pm-secondary mt-0.5 leading-normal">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 shrink-0">
          {children}
        </div>
      )}
    </div>
  );
};

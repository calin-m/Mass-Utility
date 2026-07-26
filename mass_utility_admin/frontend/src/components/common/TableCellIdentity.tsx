import React from 'react';
import { LucideIcon } from 'lucide-react';

interface TableCellIdentityProps {
  icon: LucideIcon;
  title: string;
  subtitle?: React.ReactNode;
  onTitleClick?: () => void;
  rightContent?: React.ReactNode;
}

export const TableCellIdentity: React.FC<TableCellIdentityProps> = ({
  icon: Icon,
  title,
  subtitle,
  onTitleClick,
  rightContent,
}) => {
  return (
    <div className="flex items-center gap-3 py-0.5">
      <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0 shadow-sm">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {onTitleClick ? (
            <button
              type="button"
              onClick={onTitleClick}
              className="font-extrabold text-sm text-pm-text hover:text-purple-400 transition-colors text-left truncate block"
            >
              {title}
            </button>
          ) : (
            <span className="font-extrabold text-sm text-pm-text truncate block">
              {title}
            </span>
          )}
          {rightContent}
        </div>
        {subtitle && (
          <div className="text-xs font-normal font-mono text-pm-secondary/80 mt-0.5 truncate">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

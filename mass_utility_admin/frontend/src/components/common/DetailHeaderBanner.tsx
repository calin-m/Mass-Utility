// @Arch[DetailHeaderBanner]
import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface DetailHeaderBannerProps {
  icon: LucideIcon;
  title: string;
  titleCode?: string;
  subtitle?: string;
  status?: string;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  onBack?: () => void;
  children?: React.ReactNode;
}

export const DetailHeaderBanner: React.FC<DetailHeaderBannerProps> = ({
  icon: Icon,
  title,
  titleCode,
  subtitle,
  status,
  badges,
  actions,
  children,
}) => {
  return (
    <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
      <div className="space-y-2 flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
            <Icon className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-pm-text tracking-tight truncate">{title}</h2>
              {titleCode && (
                <code className="font-mono text-xs font-bold text-pm-text bg-pm-input px-2.5 py-1 rounded-lg border border-pm-border tracking-wider">
                  {titleCode}
                </code>
              )}
            </div>
            {subtitle && <p className="text-xs text-pm-secondary mt-1">{subtitle}</p>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 flex-wrap">
        {badges}
        {actions}
      </div>
      {children && <div className="w-full mt-4 border-t border-pm-border pt-4">{children}</div>}
    </div>
  );
};

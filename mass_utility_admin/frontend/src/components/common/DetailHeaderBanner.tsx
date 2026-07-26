import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from './Button';
import { StatusBadge } from './StatusBadge';

export interface DetailHeaderBannerProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  status?: string;
  onBack: () => void;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export const DetailHeaderBanner: React.FC<DetailHeaderBannerProps> = ({
  title,
  subtitle,
  icon: Icon,
  status,
  onBack,
  actions,
  children,
}) => {
  return (
    <div className="bg-pm-card/60 border border-pm-border rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Left: Back Button & Title */}
        <div className="flex items-center gap-3">
          <Button
            variant="neutral"
            size="sm"
            icon={ArrowLeft}
            onClick={onBack}
            className="hover:bg-pm-input"
          />

          {Icon && (
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Icon className="w-5 h-5" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-pm-text tracking-tight">{title}</h2>
              {status && <StatusBadge status={status} />}
            </div>
            {subtitle && <p className="text-xs text-pm-secondary font-mono mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {/* Right: Actions */}
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>

      {children && <div className="pt-2 border-t border-pm-border/50">{children}</div>}
    </div>
  );
};

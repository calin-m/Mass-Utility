import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'purple' | 'emerald' | 'rose' | 'amber' | 'blue';
  subtext?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  color = 'purple',
  subtext,
}) => {
  const colorStyles = {
    purple: {
      text: 'text-pm-text',
      badgeBg: 'bg-purple-500/10',
      iconColor: 'text-purple-400',
    },
    emerald: {
      text: 'text-emerald-500',
      badgeBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500',
    },
    rose: {
      text: 'text-rose-500',
      badgeBg: 'bg-rose-500/10',
      iconColor: 'text-rose-500',
    },
    amber: {
      text: 'text-amber-500',
      badgeBg: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
    },
    blue: {
      text: 'text-blue-500',
      badgeBg: 'bg-blue-500/10',
      iconColor: 'text-blue-400',
    },
  }[color];

  return (
    <div className="p-4 bg-pm-card border border-pm-border rounded-xl shadow-sm pm-card-elevation flex items-center justify-between">
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-pm-secondary">{label}</div>
        <div className={`text-2xl font-black ${colorStyles.text} mt-1`}>{value}</div>
        {subtext && <div className="text-[0.65rem] text-pm-secondary mt-0.5">{subtext}</div>}
      </div>
      <div className={`p-3 ${colorStyles.badgeBg} ${colorStyles.iconColor} rounded-xl shrink-0`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
};

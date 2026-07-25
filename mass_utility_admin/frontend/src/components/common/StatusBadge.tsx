import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const normalized = (status || '').toLowerCase().trim();

  let colorClasses = 'bg-pm-input text-pm-secondary border-pm-border';
  let label = status ? status.toUpperCase() : 'UNKNOWN';

  if (normalized === 'active' || normalized === 'enabled') {
    colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    label = 'ACTIVE';
  } else if (normalized === 'suspended' || normalized === 'disabled' || normalized === 'inactive') {
    colorClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    label = 'SUSPENDED';
  } else if (normalized === 'pending') {
    colorClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    label = 'PENDING';
  }

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colorClasses} ${className}`}>
      {label}
    </span>
  );
};

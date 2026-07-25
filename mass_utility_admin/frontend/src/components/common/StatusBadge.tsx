import React from 'react';
import { Building2, Key, User, Shield, CheckCircle, ShieldAlert, Clock } from 'lucide-react';

interface StatusBadgeProps {
  status?: string;
  label?: string;
  type?: 'company' | 'license' | 'user' | 'security' | 'status';
  variant?: 'active' | 'suspended' | 'expired' | 'pending' | 'custom';
  customColor?: 'sky' | 'amber' | 'emerald' | 'purple' | 'rose';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  type = 'status',
  variant = 'active',
  customColor,
}) => {
  const badgeLabel = label || status || 'Active';
  const effectiveVariant = status ? (status.toLowerCase() === 'suspended' ? 'suspended' : 'active') : variant;

  const getBadgeStyle = () => {
    if (customColor) {
      switch (customColor) {
        case 'sky':
          return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30';
        case 'amber':
          return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
        case 'emerald':
          return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
        case 'rose':
          return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
        case 'purple':
        default:
          return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
      }
    }

    switch (effectiveVariant) {
      case 'active':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'suspended':
      case 'expired':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
      case 'pending':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      default:
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'company':
        return <Building2 className="w-3 h-3 shrink-0" />;
      case 'license':
        return <Key className="w-3 h-3 shrink-0" />;
      case 'user':
        return <User className="w-3 h-3 shrink-0" />;
      case 'security':
        return <Shield className="w-3 h-3 shrink-0" />;
      case 'status':
      default:
        if (effectiveVariant === 'active') return <CheckCircle className="w-3 h-3 shrink-0" />;
        if (effectiveVariant === 'suspended' || effectiveVariant === 'expired') return <ShieldAlert className="w-3 h-3 shrink-0" />;
        if (effectiveVariant === 'pending') return <Clock className="w-3 h-3 shrink-0" />;
        return <CheckCircle className="w-3 h-3 shrink-0" />;
    }
  };

  return (
    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border flex items-center gap-1 w-fit ${getBadgeStyle()}`}>
      {getIcon()}
      <span>{badgeLabel}</span>
    </span>
  );
};

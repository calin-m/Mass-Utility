import React from 'react';

interface TierLockBadgeProps {
  requiredTier?: string;
  featureName?: string;
  inline?: boolean;
}

const LockIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

export const TierLockBadge: React.FC<TierLockBadgeProps> = ({
  requiredTier = 'Pro',
  featureName,
  inline = false
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    alert(`🔒 ${featureName || 'This feature'} is locked under your current license tier.\n\nPlease upgrade your license key to the ${requiredTier} Tier in mass_utility_admin to unlock access.`);
  };

  if (inline) {
    return (
      <span
        onClick={handleClick}
        className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-semibold uppercase px-2 py-0.5 rounded cursor-pointer hover:bg-amber-500/20 transition-colors"
        title={`Requires ${requiredTier} License Tier`}
      >
        <LockIcon className="w-3 h-3" /> {requiredTier} Locked
      </span>
    );
  }

  return (
    <div
      onClick={handleClick}
      className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center justify-between gap-3 text-amber-400 text-xs font-medium cursor-pointer hover:bg-amber-500/20 transition-colors"
    >
      <div className="flex items-center gap-2">
        <LockIcon className="w-4 h-4 text-amber-400 shrink-0" />
        <span><strong>{featureName || 'Feature'}</strong> is locked on your active tier. Upgrade to <strong>{requiredTier} Tier</strong> in Admin Panel to unlock.</span>
      </div>
      <span className="bg-amber-500 text-black text-[10px] font-bold uppercase px-2 py-1 rounded shrink-0">
        Upgrade Tier
      </span>
    </div>
  );
};

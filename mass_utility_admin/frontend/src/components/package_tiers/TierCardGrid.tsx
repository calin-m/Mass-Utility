import React from 'react';
import { Sparkles, ShieldCheck, Zap, Crown, Copy, Edit3, Trash2 } from 'lucide-react';
import { Button } from '../common/Button';
import { PackageTier } from '../PackageTiersTab';

export interface TierCardGridProps {
  displayTiers: PackageTier[];
  selectedTier: string;
  onSelectTier: (name: string) => void;
  onCloneClick: (tier: PackageTier) => void;
  onRenameClick: (tier: PackageTier) => void;
  onDeleteClick: (tier: PackageTier) => void;
}

export const TierCardGrid: React.FC<TierCardGridProps> = ({
  displayTiers,
  selectedTier,
  onSelectTier,
  onCloneClick,
  onRenameClick,
  onDeleteClick,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {displayTiers.map((tier) => {
        const lowerName = tier.name.toLowerCase();
        const isSelected = selectedTier.toLowerCase() === lowerName;

        let Icon = Sparkles;
        let badgeText = 'Tier';
        let badgeColor = 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
        let iconColor = 'text-blue-500';

        if (lowerName === 'basic') {
          Icon = ShieldCheck;
          badgeText = 'Essential';
          badgeColor = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
          iconColor = 'text-emerald-500';
        } else if (lowerName === 'pro') {
          Icon = Zap;
          badgeText = 'Growth';
          badgeColor = 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
          iconColor = 'text-amber-500';
        } else if (lowerName === 'enterprise') {
          Icon = Crown;
          badgeText = 'Autopilot';
          badgeColor = 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
          iconColor = 'text-indigo-500';
        }

        const activeCount = tier.active_licenses || 0;

        return (
          <div
            key={tier.id || tier.name}
            onClick={() => onSelectTier(tier.name)}
            className={`p-4 rounded-xl border cursor-pointer transition-all duration-150 relative group flex flex-col justify-between ${
              isSelected
                ? 'bg-pm-primary/10 border-pm-primary shadow-sm'
                : 'bg-pm-card border-pm-border hover:border-pm-primary/50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${iconColor}`} />
                  <h3 className="text-xs font-bold text-pm-text uppercase truncate max-w-[110px]">
                    {tier.name}
                  </h3>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${badgeColor}`}>
                  {badgeText}
                </span>
              </div>

              <div className="text-[11px] text-pm-secondary space-y-1.5 my-3">
                <div className="flex items-center justify-between">
                  <span>Active Keys:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px]">
                    {activeCount} {activeCount === 1 ? 'Key' : 'Keys'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Rollbacks:</span>
                  <span className="font-bold text-pm-text">{tier.capabilities?.rollback_history_limit ?? 5}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Max Domains:</span>
                  <span className="font-bold text-pm-text">{tier.capabilities?.max_bound_domains ?? 1}</span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2.5 border-t border-pm-border flex items-center justify-between gap-1 mt-2">
              <span className="text-[10px] font-bold text-pm-primary uppercase tracking-wider">
                {isSelected ? '● Active' : 'Select'}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloneClick(tier);
                  }}
                  className="px-2 py-1 rounded-md text-[10px] font-bold bg-pm-input/80 hover:bg-purple-500/15 text-pm-secondary hover:text-purple-400 border border-pm-border flex items-center gap-1 transition"
                  title="Clone Tier Settings"
                >
                  <Copy className="w-3 h-3" />
                  <span>Clone</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRenameClick(tier);
                  }}
                  className="px-2 py-1 rounded-md text-[10px] font-bold bg-pm-input/80 hover:bg-indigo-500/15 text-pm-secondary hover:text-indigo-400 border border-pm-border flex items-center gap-1 transition"
                  title="Rename Tier"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Rename</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteClick(tier);
                  }}
                  className="px-2 py-1 rounded-md text-[10px] font-bold bg-pm-input/80 hover:bg-rose-500/15 text-pm-secondary hover:text-rose-400 border border-pm-border flex items-center gap-1 transition"
                  title="Delete Tier"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
};

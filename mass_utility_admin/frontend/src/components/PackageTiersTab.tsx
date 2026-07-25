import React, { useState } from 'react';
import { PackageCheck, Save, RefreshCw, CheckCircle2, ShieldCheck, Zap, Crown, HardDrive, Cloud } from 'lucide-react';
import { SectionHeader } from './common/SectionHeader';
import { Button } from './common/Button';
import { FormInput } from './common/FormInput';
import { useTranslation } from '../i18n/LanguageContext';

export interface PackageTier {
  id: number;
  name: string;
  capabilities: {
    // Usability
    PM_ENABLE_DB_TOOLS: boolean;
    PM_ENABLE_FILE_TOOLS: boolean;
    PM_ENABLE_GHOST_PURGER: boolean;
    PM_ENABLE_GDPR_SWEEPER: boolean;
    PM_ENABLE_HISTORY: boolean;
    // Convenience
    query_visual_execute: boolean;
    backup_automation: boolean;
    governor_autopilot: boolean;
    sweeper_execution: boolean;
    rollback_history_limit: number;
    backup_destinations: string[];
  };
}

interface PackageTiersTabProps {
  tiers: PackageTier[];
  onRefresh: () => void;
  showAlert: (msg: string, type?: 'success' | 'error') => void;
}

const getDefaultCapsForTier = (tierName: string) => {
  const name = tierName.toLowerCase();
  
  const base = {
    PM_ENABLE_GHOST_PURGER: true,
    PM_ENABLE_GDPR_SWEEPER: true,
    PM_ENABLE_HISTORY: true,
  };

  if (name === 'basic') {
    return {
      ...base,
      PM_ENABLE_DB_TOOLS: false,
      PM_ENABLE_FILE_TOOLS: false,
      query_visual_execute: false,
      backup_automation: false,
      governor_autopilot: false,
      sweeper_execution: false,
      rollback_history_limit: 5,
      backup_destinations: ['local'],
    };
  }

  if (name === 'pro') {
    return {
      ...base,
      PM_ENABLE_DB_TOOLS: true,
      PM_ENABLE_FILE_TOOLS: true,
      query_visual_execute: true,
      backup_automation: true,
      governor_autopilot: false,
      sweeper_execution: true,
      rollback_history_limit: 25,
      backup_destinations: ['local', 'gdrive'],
    };
  }

  // Enterprise Tier
  return {
    ...base,
    PM_ENABLE_DB_TOOLS: true,
    PM_ENABLE_FILE_TOOLS: true,
    query_visual_execute: true,
    backup_automation: true,
    governor_autopilot: true,
    sweeper_execution: true,
    rollback_history_limit: 100,
    backup_destinations: ['local', 'gdrive'],
  };
};

export const PackageTiersTab: React.FC<PackageTiersTabProps> = ({ tiers, onRefresh, showAlert }) => {
  const { t } = useTranslation();
  const [selectedTier, setSelectedTier] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      showAlert('🔄 Package tier matrix reloaded!', 'success');
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const activeTierObj = tiers.find(t => t.name.toLowerCase() === selectedTier.toLowerCase());

  const currentCaps = activeTierObj && activeTierObj.capabilities && Object.keys(activeTierObj.capabilities).length > 0
    ? activeTierObj.capabilities
    : getDefaultCapsForTier(selectedTier);

  const [capabilities, setCapabilities] = useState(currentCaps);

  const handleTierChange = (tierName: string) => {
    setSelectedTier(tierName);
    const tierObj = tiers.find(t => t.name.toLowerCase() === tierName.toLowerCase());
    const caps = tierObj && tierObj.capabilities && Object.keys(tierObj.capabilities).length > 0
      ? tierObj.capabilities
      : getDefaultCapsForTier(tierName);
    setCapabilities(caps);
  };

  const handleToggle = (key: string) => {
    setCapabilities(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  const handleDestinationToggle = (dest: string) => {
    setCapabilities(prev => {
      const currentDests = prev.backup_destinations || ['local'];
      const exists = currentDests.includes(dest);
      let updated: string[];
      if (exists) {
        // Must keep at least 'local'
        if (dest === 'local' && currentDests.length === 1) return prev;
        updated = currentDests.filter(d => d !== dest);
      } else {
        updated = [...currentDests, dest];
      }
      return { ...prev, backup_destinations: updated };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', selectedTier);
      formData.append('capabilities', JSON.stringify(capabilities));

      const res = await fetch('index.php?action=api_save_tier', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        showAlert(`Package tier '${selectedTier.toUpperCase()}' matrix saved successfully!`, 'success');
        onRefresh();
      } else {
        showAlert(data.error || 'Failed to save package tier matrix', 'error');
      }
    } catch (err: any) {
      showAlert('Failed to save package tier: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Marketing & Feature Strategy Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* BASIC Card */}
        <div className={`p-5 rounded-xl border transition ${selectedTier === 'basic' ? 'bg-pm-primary/5 border-pm-primary shadow-md' : 'bg-pm-card border-pm-border'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <h3 className="text-sm font-bold text-pm-text uppercase">Basic Tier</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase">Essential</span>
          </div>
          <p className="text-[11px] text-pm-secondary mb-4 leading-relaxed">
            Essential PrestaShop store operations. Provides manual DB/File backups, Ghost Purger, and GDPR Sweeper with local server storage.
          </p>
          <ul className="text-[11px] space-y-1.5 text-pm-secondary mb-4">
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Manual DB & File Backups</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Ghost Purger & GDPR Sweeper</li>
            <li className="flex items-center gap-1.5 text-pm-secondary/60">🔒 Scheduled Cron Automation (Pro)</li>
          </ul>
          <Button variant={selectedTier === 'basic' ? 'primary' : 'neutral'} size="sm" className="w-full" onClick={() => handleTierChange('basic')}>
            Configure Basic Matrix
          </Button>
        </div>

        {/* PRO Card */}
        <div className={`p-5 rounded-xl border transition ${selectedTier === 'pro' ? 'bg-pm-primary/5 border-pm-primary shadow-md' : 'bg-pm-card border-pm-border'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-pm-text uppercase">Pro Tier</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 uppercase">Recommended</span>
          </div>
          <p className="text-[11px] text-pm-secondary mb-4 leading-relaxed">
            Automation & Growth. Unlocks scheduled background backups, Visual SQL Query Builder, Automated Sweeper, and Google Drive cloud sync.
          </p>
          <ul className="text-[11px] space-y-1.5 text-pm-secondary mb-4">
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-500" /> Scheduled Backups (Cron CLI)</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-500" /> Visual SQL Query Builder</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-500" /> Google Drive Cloud Storage</li>
          </ul>
          <Button variant={selectedTier === 'pro' ? 'primary' : 'neutral'} size="sm" className="w-full" onClick={() => handleTierChange('pro')}>
            Configure Pro Matrix
          </Button>
        </div>

        {/* ENTERPRISE Card */}
        <div className={`p-5 rounded-xl border transition ${selectedTier === 'enterprise' ? 'bg-pm-primary/5 border-pm-primary shadow-md' : 'bg-pm-card border-pm-border'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-indigo-500" />
              <h3 className="text-sm font-bold text-pm-text uppercase">Enterprise Tier</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 uppercase">Autopilot</span>
          </div>
          <p className="text-[11px] text-pm-secondary mb-4 leading-relaxed">
            Full Governance & Scale. Unlocks Governor Auto-Pilot dynamic CPU/RAM resource tuning and maximum rollback history limits.
          </p>
          <ul className="text-[11px] space-y-1.5 text-pm-secondary mb-4">
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" /> Governor Auto-Pilot Tuning</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" /> 100 Rollback History Limit</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" /> Multi-Domain Module Licensing</li>
          </ul>
          <Button variant={selectedTier === 'enterprise' ? 'primary' : 'neutral'} size="sm" className="w-full" onClick={() => handleTierChange('enterprise')}>
            Configure Enterprise Matrix
          </Button>
        </div>
      </div>

      {/* Main Tier Matrix Configuration Container */}
      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm pm-card-elevation w-full">
        <SectionHeader
          title={`${t('tiers_title')} (${selectedTier.toUpperCase()})`}
          subtitle={t('tiers_subtitle')}
          icon={PackageCheck}
          action={
            <Button
              variant="neutral"
              size="sm"
              icon={RefreshCw}
              loading={isRefreshing}
              onClick={handleRefresh}
            >
              {t('btn_refresh')}
            </Button>
          }
        />

        <div className="flex gap-3 my-6">
          {['basic', 'pro', 'enterprise'].map(tierName => (
            <button
              key={tierName}
              type="button"
              onClick={() => handleTierChange(tierName)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition ${
                selectedTier === tierName
                  ? 'pm-btn-primary shadow-md'
                  : 'pm-btn-neutral'
              }`}
            >
              {tierName} TIER
            </button>
          ))}
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Category 1: Essential Operations (Module Enablement) */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-pm-secondary mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              1. Essential Operations & Module Enablement
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex items-center justify-between p-3 bg-pm-input/50 rounded-lg border border-pm-border cursor-pointer hover:bg-pm-input transition">
                <div>
                  <span className="text-xs font-semibold text-pm-text block">{t('tier_db_tools_name')}</span>
                  <span className="text-[11px] text-pm-secondary">{t('tier_db_tools_desc')}</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(capabilities.PM_ENABLE_DB_TOOLS)}
                  onChange={() => handleToggle('PM_ENABLE_DB_TOOLS')}
                  className="rounded border-pm-border text-pm-primary focus:ring-pm-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-pm-input/50 rounded-lg border border-pm-border cursor-pointer hover:bg-pm-input transition">
                <div>
                  <span className="text-xs font-semibold text-pm-text block">{t('tier_file_tools_name')}</span>
                  <span className="text-[11px] text-pm-secondary">{t('tier_file_tools_desc')}</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(capabilities.PM_ENABLE_FILE_TOOLS)}
                  onChange={() => handleToggle('PM_ENABLE_FILE_TOOLS')}
                  className="rounded border-pm-border text-pm-primary focus:ring-pm-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-pm-input/50 rounded-lg border border-pm-border cursor-pointer hover:bg-pm-input transition">
                <div>
                  <span className="text-xs font-semibold text-pm-text block">{t('tier_ghost_purger_name')}</span>
                  <span className="text-[11px] text-pm-secondary">{t('tier_ghost_purger_desc')}</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(capabilities.PM_ENABLE_GHOST_PURGER)}
                  onChange={() => handleToggle('PM_ENABLE_GHOST_PURGER')}
                  className="rounded border-pm-border text-pm-primary focus:ring-pm-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-pm-input/50 rounded-lg border border-pm-border cursor-pointer hover:bg-pm-input transition">
                <div>
                  <span className="text-xs font-semibold text-pm-text block">{t('tier_gdpr_sweeper_name')}</span>
                  <span className="text-[11px] text-pm-secondary">{t('tier_gdpr_sweeper_desc')}</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(capabilities.PM_ENABLE_GDPR_SWEEPER)}
                  onChange={() => handleToggle('PM_ENABLE_GDPR_SWEEPER')}
                  className="rounded border-pm-border text-pm-primary focus:ring-pm-primary"
                />
              </label>
            </div>
          </div>

          {/* Category 2: Automation & Convenience (Dashboard Feature Locks) */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-pm-secondary mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              2. Automation & Convenience (Dashboard Feature Locks)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex items-center justify-between p-3 bg-pm-input/50 rounded-lg border border-pm-border cursor-pointer hover:bg-pm-input transition">
                <div>
                  <span className="text-xs font-semibold text-pm-text block">{t('tier_visual_query_name')}</span>
                  <span className="text-[11px] text-pm-secondary">{t('tier_visual_query_desc')}</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(capabilities.query_visual_execute)}
                  onChange={() => handleToggle('query_visual_execute')}
                  className="rounded border-pm-border text-pm-primary focus:ring-pm-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-pm-input/50 rounded-lg border border-pm-border cursor-pointer hover:bg-pm-input transition">
                <div>
                  <span className="text-xs font-semibold text-pm-text block">{t('tier_backup_auto_name')}</span>
                  <span className="text-[11px] text-pm-secondary">{t('tier_backup_auto_desc')}</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(capabilities.backup_automation)}
                  onChange={() => handleToggle('backup_automation')}
                  className="rounded border-pm-border text-pm-primary focus:ring-pm-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-pm-input/50 rounded-lg border border-pm-border cursor-pointer hover:bg-pm-input transition">
                <div>
                  <span className="text-xs font-semibold text-pm-text block">{t('tier_autopilot_name')}</span>
                  <span className="text-[11px] text-pm-secondary">{t('tier_autopilot_desc')}</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(capabilities.governor_autopilot)}
                  onChange={() => handleToggle('governor_autopilot')}
                  className="rounded border-pm-border text-pm-primary focus:ring-pm-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-pm-input/50 rounded-lg border border-pm-border cursor-pointer hover:bg-pm-input transition">
                <div>
                  <span className="text-xs font-semibold text-pm-text block">Automated Sweeper Jobs</span>
                  <span className="text-[11px] text-pm-secondary">Enable background scheduled GDPR and Ghost Purging runs</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(capabilities.sweeper_execution)}
                  onChange={() => handleToggle('sweeper_execution')}
                  className="rounded border-pm-border text-pm-primary focus:ring-pm-primary"
                />
              </label>
            </div>
          </div>

          {/* Category 3: Quotas & Storage Limits (Implemented Engines) */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-pm-secondary mb-3 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-indigo-500" />
              3. Quotas & Storage Destinations (Implemented Engines Only)
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-pm-input/30 p-4 rounded-xl border border-pm-border">
              {/* Rollback Limit Input */}
              <div>
                <label className="block text-xs font-semibold text-pm-text mb-1">
                  Rollback History Limit (Backups)
                </label>
                <FormInput
                  type="number"
                  min="0"
                  max="1000"
                  value={capabilities.rollback_history_limit ?? 5}
                  onChange={e => {
                    const val = parseInt(e.target.value, 10) || 0;
                    setCapabilities(prev => ({ ...prev, rollback_history_limit: val }));
                  }}
                />
                <span className="text-[10px] text-pm-secondary mt-1 block">
                  Maximum number of database snapshots stored in client history.
                </span>
              </div>

              {/* Cloud Destinations */}
              <div>
                <label className="block text-xs font-semibold text-pm-text mb-2">
                  Allowed Backup Storage Destinations
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-pm-text">
                    <input
                      type="checkbox"
                      checked={Boolean(capabilities.backup_destinations?.includes('local'))}
                      onChange={() => handleDestinationToggle('local')}
                      className="rounded border-pm-border text-pm-primary focus:ring-pm-primary"
                    />
                    <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                    <span>Local Server Storage (Always Enabled)</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-pm-text">
                    <input
                      type="checkbox"
                      checked={Boolean(capabilities.backup_destinations?.includes('gdrive'))}
                      onChange={() => handleDestinationToggle('gdrive')}
                      className="rounded border-pm-border text-pm-primary focus:ring-pm-primary"
                    />
                    <Cloud className="w-3.5 h-3.5 text-sky-500" />
                    <span>Google Drive Cloud Storage (PRO / ENTERPRISE)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-pm-border">
            <Button
              type="submit"
              variant="primary"
              size="md"
              icon={Save}
              loading={loading}
            >
              {t('btn_save')} Matrix
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

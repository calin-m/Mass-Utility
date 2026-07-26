import React, { useState } from 'react';
import { PackageCheck, Save, RefreshCw, CheckCircle2, ShieldCheck, Zap, Crown, HardDrive, Cloud, Sliders, Database, Layers } from 'lucide-react';
import { SectionHeader } from './common/SectionHeader';
import { Button } from './common/Button';
import { FormInput } from './common/FormInput';
import { useTranslation } from '../i18n/LanguageContext';

export interface PackageTierCapabilities {
  // Essential Operations
  PM_ENABLE_DB_TOOLS: boolean;
  PM_ENABLE_FILE_TOOLS: boolean;
  PM_ENABLE_GHOST_PURGER: boolean;
  PM_ENABLE_GDPR_SWEEPER: boolean;
  PM_ENABLE_HISTORY: boolean;
  // AST Engine Granular Split
  query_visual_filter: boolean;
  query_visual_mutate: boolean;
  // Automation & Safety Governor
  backup_automation: boolean;
  sweeper_execution: boolean;
  governor_autopilot: boolean;
  // Quotas & Storage
  rollback_history_limit: number;
  backup_destinations: string[];
}

export interface PackageTier {
  id: number;
  name: string;
  capabilities: PackageTierCapabilities;
}

interface PackageTiersTabProps {
  tiers: PackageTier[];
  onRefresh: () => void;
  showAlert: (msg: string, type?: 'success' | 'error') => void;
}

const getDefaultCapsForTier = (tierName: string): PackageTierCapabilities => {
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
      query_visual_filter: false,
      query_visual_mutate: false,
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
      query_visual_filter: true,
      query_visual_mutate: false,
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
    query_visual_filter: true,
    query_visual_mutate: true,
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

  const [capabilities, setCapabilities] = useState<PackageTierCapabilities>(currentCaps);

  const handleTierChange = (tierName: string) => {
    setSelectedTier(tierName);
    const tierObj = tiers.find(t => t.name.toLowerCase() === tierName.toLowerCase());
    const caps = tierObj && tierObj.capabilities && Object.keys(tierObj.capabilities).length > 0
      ? tierObj.capabilities
      : getDefaultCapsForTier(tierName);
    setCapabilities(caps);
  };

  const handleToggle = (key: keyof PackageTierCapabilities) => {
    setCapabilities(prev => ({
      ...prev,
      [key]: !prev[key],
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
      {/* Top Interactive Preset Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* BASIC Card */}
        <div
          onClick={() => handleTierChange('basic')}
          className={`p-5 rounded-xl border cursor-pointer transition-all ${
            selectedTier === 'basic'
              ? 'bg-pm-primary/10 border-pm-primary ring-2 ring-pm-primary/30 shadow-lg'
              : 'bg-pm-card border-pm-border hover:border-pm-primary/50'
          }`}
        >
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
            <li className="flex items-center gap-1.5 text-pm-secondary/60">🔒 Step 1 Visual AST Filter (Pro)</li>
          </ul>
          <div className="pt-2 border-t border-pm-border/50 text-[10px] font-bold text-pm-primary uppercase flex items-center justify-between">
            <span>{selectedTier === 'basic' ? '● Active Preset Selected' : 'Click to Edit Matrix'}</span>
            <Sliders className="w-3 h-3" />
          </div>
        </div>

        {/* PRO Card */}
        <div
          onClick={() => handleTierChange('pro')}
          className={`p-5 rounded-xl border cursor-pointer transition-all ${
            selectedTier === 'pro'
              ? 'bg-pm-primary/10 border-pm-primary ring-2 ring-pm-primary/30 shadow-lg'
              : 'bg-pm-card border-pm-border hover:border-pm-primary/50'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-pm-text uppercase">Pro Tier</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 uppercase">Recommended</span>
          </div>
          <p className="text-[11px] text-pm-secondary mb-4 leading-relaxed">
            Automation & Growth. Unlocks Step 1 Visual AST Filter, scheduled background backups, Automated Sweeper, and Google Drive cloud sync.
          </p>
          <ul className="text-[11px] space-y-1.5 text-pm-secondary mb-4">
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-500" /> Step 1: Visual AST Filter</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-500" /> Scheduled Backups (Cron CLI)</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-500" /> Google Drive Cloud Storage</li>
          </ul>
          <div className="pt-2 border-t border-pm-border/50 text-[10px] font-bold text-pm-primary uppercase flex items-center justify-between">
            <span>{selectedTier === 'pro' ? '● Active Preset Selected' : 'Click to Edit Matrix'}</span>
            <Sliders className="w-3 h-3" />
          </div>
        </div>

        {/* ENTERPRISE Card */}
        <div
          onClick={() => handleTierChange('enterprise')}
          className={`p-5 rounded-xl border cursor-pointer transition-all ${
            selectedTier === 'enterprise'
              ? 'bg-pm-primary/10 border-pm-primary ring-2 ring-pm-primary/30 shadow-lg'
              : 'bg-pm-card border-pm-border hover:border-pm-primary/50'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-indigo-500" />
              <h3 className="text-sm font-bold text-pm-text uppercase">Enterprise Tier</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 uppercase">Autopilot</span>
          </div>
          <p className="text-[11px] text-pm-secondary mb-4 leading-relaxed">
            Full Governance & Scale. Unlocks Step 2 Batch Action Configurator & Mutations, Governor Auto-Pilot CPU/RAM tuning, and 100 rollback limit.
          </p>
          <ul className="text-[11px] space-y-1.5 text-pm-secondary mb-4">
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" /> Step 2: Batch Action Configurator</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" /> Governor Auto-Pilot Tuning</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" /> 100 Rollback History Limit</li>
          </ul>
          <div className="pt-2 border-t border-pm-border/50 text-[10px] font-bold text-pm-primary uppercase flex items-center justify-between">
            <span>{selectedTier === 'enterprise' ? '● Active Preset Selected' : 'Click to Edit Matrix'}</span>
            <Sliders className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Main Tier Matrix Configuration Container */}
      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm pm-card-elevation w-full">
        <SectionHeader
          title={`${t('tiers_title')} (${selectedTier.toUpperCase()} PRESET)`}
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

        <form onSubmit={handleSave} className="space-y-6 mt-6">
          
          {/* Sub-Category 1: Essential Operations & Module Enablement */}
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

          {/* Sub-Category 2: AST Query & Batch Mutation Engine */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-pm-secondary mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-500" />
              2. AST Query & Batch Mutation Engine (Granular Differentiation)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex items-center justify-between p-3 bg-pm-input/50 rounded-lg border border-pm-border cursor-pointer hover:bg-pm-input transition">
                <div>
                  <span className="text-xs font-semibold text-pm-text block">Step 1: Visual AST Product & Data Filter (PRO)</span>
                  <span className="text-[11px] text-pm-secondary">Drag-and-drop query filter compiler & SQL dry-run preview</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(capabilities.query_visual_filter)}
                  onChange={() => handleToggle('query_visual_filter')}
                  className="rounded border-pm-border text-pm-primary focus:ring-pm-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-pm-input/50 rounded-lg border border-pm-border cursor-pointer hover:bg-pm-input transition">
                <div>
                  <span className="text-xs font-semibold text-pm-text block">Step 2: Batch Action Configurator & Mutations (ENTERPRISE)</span>
                  <span className="text-[11px] text-pm-secondary">Bulk price/stock updates, category assignments, and execution</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(capabilities.query_visual_mutate)}
                  onChange={() => handleToggle('query_visual_mutate')}
                  className="rounded border-pm-border text-pm-primary focus:ring-pm-primary"
                />
              </label>
            </div>
          </div>

          {/* Sub-Category 3: Automation & Safety Governor */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-pm-secondary mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-sky-500" />
              3. Automation & Safety Governor
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                  <span className="text-xs font-semibold text-pm-text block">Automated Sweeper Jobs</span>
                  <span className="text-[11px] text-pm-secondary">Background scheduled GDPR and cart purging</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(capabilities.sweeper_execution)}
                  onChange={() => handleToggle('sweeper_execution')}
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
            </div>
          </div>

          {/* Sub-Category 4: Quotas & Storage Destinations */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-pm-secondary mb-3 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-indigo-500" />
              4. Quotas & Storage Destinations (Implemented Engines Only)
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

              {/* Cloud Destinations Container (Div instead of Label to fix nested label bug) */}
              <div>
                <div className="block text-xs font-semibold text-pm-text mb-2">
                  Allowed Backup Storage Destinations
                </div>
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
              {t('btn_save')} {selectedTier.toUpperCase()} Matrix
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { PackageCheck, Save, RefreshCw } from 'lucide-react';
import { SectionHeader } from './common/SectionHeader';
import { Button } from './common/Button';
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
  
  // Base configuration that applies to ALL tiers
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
      backup_destinations: ['local', 'google_drive'],
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
    backup_destinations: ['local', 'google_drive', 's3'],
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
      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm pm-card-elevation w-full">
        <SectionHeader
          title={t('tiers_title')}
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
          
          {/* Usability Section */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-pm-secondary mb-3">{t('tier_cat_usability')}</h4>
            <div className="space-y-2">
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

          {/* Convenience Section */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-pm-secondary mb-3">{t('tier_cat_convenience')}</h4>
            <div className="space-y-2">
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

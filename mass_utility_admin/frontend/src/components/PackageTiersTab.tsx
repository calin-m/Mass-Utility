import React, { useState } from 'react';
import { PackageCheck, RefreshCw, Plus, Edit, ChevronLeft, ChevronRight, ChevronDown, Check, X, ShieldCheck, Sliders } from 'lucide-react';
import { PageHeader } from './common/PageHeader';
import { Button } from './common/Button';
import { ConfirmModal } from './common/ConfirmModal';
import { SubTabNav, SubTabItem } from './common/SubTabNav';
import { TierCardGrid } from './package_tiers/TierCardGrid';
import { TierCapabilitiesForm } from './package_tiers/TierCapabilitiesForm';
import { CreateTierModal } from './package_tiers/CreateTierModal';
import { useTranslation } from '../i18n/LanguageContext';

export interface PackageTierCapabilities {
  // Essential Operations & History
  PM_ENABLE_DB_TOOLS: boolean;
  PM_ENABLE_FILE_TOOLS: boolean;
  PM_ENABLE_GHOST_PURGER: boolean;
  PM_ENABLE_GDPR_SWEEPER: boolean;
  PM_ENABLE_HISTORY: boolean;

  // AST Engine Multi-Step Pipeline
  query_visual_filter: boolean;   // Step 1: Visual AST Data Filter
  query_visual_compile: boolean;  // Step 2: SQL Compilation & Dry-Run Preview
  query_visual_mutate: boolean;   // Step 3: Batch Action Configurator & Mutations

  // Database Suite Pipeline
  db_tools_export: boolean;       // Single Table Data Export (CSV/SQL)
  db_tools_backup: boolean;       // Full Database Backup & Compression
  db_diff_inspector: boolean;     // Database Schema Diff Inspector
  db_tools_restore: boolean;      // 1-Click Snapshot Restoration

  // File Suite Pipeline
  file_tools_browse: boolean;     // File & Asset Directory Browser
  file_tools_backup: boolean;     // Full File & Directory Backup
  file_diff_inspector: boolean;   // Visual File Code Diff Inspector

  // Automations & Safety Governor
  backup_automation: boolean;     // Scheduled Cron Backups
  sweeper_execution: boolean;     // Automated Background Sweeper Jobs
  governor_telemetry: boolean;    // Live CPU/RAM Load Visualizer
  governor_autopilot: boolean;    // Governor Auto-Pilot CPU Throttling

  // Usage Quotas & Limits
  rollback_history_limit: number; // Max stored rollback snapshots
  max_bound_domains: number;      // Max bound store domains per key
  max_cloud_backups: number;      // Max cloud backups retained
  max_daily_sweeper_runs: number; // Max background sweeper runs / day
  backup_destinations: string[];  // ['local', 'gdrive']
}

export interface PackageTier {
  id?: number;
  name: string;
  capabilities: PackageTierCapabilities | Record<string, any>;
  active_licenses?: number;
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
    governor_telemetry: true,
  };

  if (name === 'basic') {
    return {
      ...base,
      PM_ENABLE_DB_TOOLS: false,
      PM_ENABLE_FILE_TOOLS: false,
      query_visual_filter: false,
      query_visual_compile: false,
      query_visual_mutate: false,
      db_tools_export: true,
      db_tools_backup: false,
      db_diff_inspector: false,
      db_tools_restore: false,
      file_tools_browse: true,
      file_tools_backup: false,
      file_diff_inspector: false,
      backup_automation: false,
      governor_autopilot: false,
      sweeper_execution: false,
      rollback_history_limit: 5,
      max_bound_domains: 1,
      max_cloud_backups: 3,
      max_daily_sweeper_runs: 1,
      backup_destinations: ['local'],
    };
  }

  if (name === 'pro') {
    return {
      ...base,
      PM_ENABLE_DB_TOOLS: true,
      PM_ENABLE_FILE_TOOLS: true,
      query_visual_filter: true,
      query_visual_compile: true,
      query_visual_mutate: false,
      db_tools_export: true,
      db_tools_backup: true,
      db_diff_inspector: false,
      db_tools_restore: true,
      file_tools_browse: true,
      file_tools_backup: true,
      file_diff_inspector: false,
      backup_automation: true,
      governor_autopilot: false,
      sweeper_execution: true,
      rollback_history_limit: 15,
      max_bound_domains: 2,
      max_cloud_backups: 5,
      max_daily_sweeper_runs: 2,
      backup_destinations: ['local', 'gdrive'],
    };
  }

  if (name === 'developer' || name === 'agency') {
    return {
      ...base,
      PM_ENABLE_DB_TOOLS: true,
      PM_ENABLE_FILE_TOOLS: true,
      query_visual_filter: true,
      query_visual_compile: true,
      query_visual_mutate: true,
      db_tools_export: true,
      db_tools_backup: true,
      db_diff_inspector: true,
      db_tools_restore: true,
      file_tools_browse: true,
      file_tools_backup: true,
      file_diff_inspector: true,
      backup_automation: true,
      governor_autopilot: true,
      sweeper_execution: true,
      rollback_history_limit: 250,
      max_bound_domains: 50,
      max_cloud_backups: 100,
      max_daily_sweeper_runs: 48,
      backup_destinations: ['local', 'gdrive'],
    };
  }

  // Enterprise Tier
  return {
    ...base,
    PM_ENABLE_DB_TOOLS: true,
    PM_ENABLE_FILE_TOOLS: true,
    query_visual_filter: true,
    query_visual_compile: true,
    query_visual_mutate: true,
    db_tools_export: true,
    db_tools_backup: true,
    db_diff_inspector: true,
    db_tools_restore: true,
    file_tools_browse: true,
    file_tools_backup: true,
    file_diff_inspector: true,
    backup_automation: true,
    governor_autopilot: true,
    sweeper_execution: true,
    rollback_history_limit: 100,
    max_bound_domains: 10,
    max_cloud_backups: 50,
    max_daily_sweeper_runs: 24,
    backup_destinations: ['local', 'gdrive'],
  };
};

const TIER_RANK: Record<string, number> = {
  basic: 10,
  essential: 10,
  pro: 20,
  growth: 20,
  enterprise: 30,
  autopilot: 30,
  developer: 40,
  agency: 50,
  vip: 60,
};

export const PackageTiersTab: React.FC<PackageTiersTabProps> = ({ tiers, onRefresh, showAlert }) => {
  const { t } = useTranslation();
  const [subTab, setSubTab] = useState<'overview' | 'editor'>('overview');
  const [selectedTier, setSelectedTier] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal & Edit States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTierName, setNewTierName] = useState('');
  const [cloneFromTier, setCloneFromTier] = useState('basic');
  const [tierToDelete, setTierToDelete] = useState<PackageTier | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [editingName, setEditingName] = useState('');

  // Default tiers list
  const defaultTierNames = ['basic', 'pro', 'enterprise'];

  // Combined list of display tiers (DB tiers + defaults if DB is empty)
  const displayTiers: PackageTier[] = [...tiers];
  defaultTierNames.forEach(defName => {
    if (!displayTiers.some(t => t.name.toLowerCase() === defName)) {
      displayTiers.push({
        name: defName,
        capabilities: getDefaultCapsForTier(defName),
        active_licenses: 0
      });
    }
  });

  // Sort deterministically from lowest to highest capability rank
  displayTiers.sort((a, b) => {
    const rankA = TIER_RANK[a.name.toLowerCase()] ?? 99;
    const rankB = TIER_RANK[b.name.toLowerCase()] ?? 99;
    return rankA - rankB;
  });

  const activeTierObj = displayTiers.find(t => t.name.toLowerCase() === selectedTier.toLowerCase());

  const currentCaps = (activeTierObj && activeTierObj.capabilities && Object.keys(activeTierObj.capabilities).length > 0
    ? activeTierObj.capabilities
    : getDefaultCapsForTier(selectedTier)) as PackageTierCapabilities;

  const [capabilities, setCapabilities] = useState<PackageTierCapabilities>(currentCaps);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      showAlert('🔄 Package tier matrix reloaded!', 'success');
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleTierChange = (tierName: string) => {
    setSelectedTier(tierName);
    setIsRenaming(false);
    const tierObj = displayTiers.find(t => t.name.toLowerCase() === tierName.toLowerCase());
    const caps = (tierObj && tierObj.capabilities && Object.keys(tierObj.capabilities).length > 0
      ? tierObj.capabilities
      : getDefaultCapsForTier(tierName)) as PackageTierCapabilities;
    setCapabilities(caps);
  };


  const handleToggle = (key: keyof PackageTierCapabilities) => {
    setCapabilities(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleChangeQuota = (key: keyof PackageTierCapabilities, val: number) => {
    setCapabilities(prev => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleDestinationToggle = (dest: string) => {
    setCapabilities(prev => {
      const currentDests = prev.backup_destinations || ['local'];
      const exists = currentDests.includes(dest);
      let updated: string[];
      if (exists) {
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
      const saveName = isRenaming && editingName.trim() ? editingName.trim() : selectedTier;
      const formData = new FormData();
      if (activeTierObj?.id) {
        formData.append('id', String(activeTierObj.id));
      }
      formData.append('name', saveName);
      formData.append('capabilities', JSON.stringify(capabilities));

      const res = await fetch('index.php?action=api_save_tier', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        showAlert(`Package tier '${saveName.toUpperCase()}' matrix saved successfully!`, 'success');
        setSelectedTier(saveName);
        setIsRenaming(false);
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

  const handleCreateTier = async () => {
    const name = newTierName.trim();
    if (!name) {
      showAlert('Please enter a tier name.', 'error');
      return;
    }

    setLoading(true);
    try {
      const clonedCaps = getDefaultCapsForTier(cloneFromTier);
      const formData = new FormData();
      formData.append('name', name);
      formData.append('capabilities', JSON.stringify(clonedCaps));

      const res = await fetch('index.php?action=api_save_tier', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        showAlert(`🎉 Package tier '${name}' created successfully!`, 'success');
        setIsCreateModalOpen(false);
        setNewTierName('');
        setSelectedTier(name);
        setCapabilities(clonedCaps);
        onRefresh();
      } else {
        showAlert(data.error || 'Failed to create package tier', 'error');
      }
    } catch (err: any) {
      showAlert('Failed to create tier: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTier = async () => {
    if (!tierToDelete) return;

    setLoading(true);
    try {
      const formData = new FormData();
      if (tierToDelete.id) {
        formData.append('id', String(tierToDelete.id));
      }

      const res = await fetch('index.php?action=api_delete_tier', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        showAlert(`🗑️ Package tier '${tierToDelete.name}' deleted! Active licenses migrated to Basic.`, 'success');
        setTierToDelete(null);
        setSelectedTier('basic');
        onRefresh();
      } else {
        showAlert(data.error || 'Failed to delete package tier', 'error');
      }
    } catch (err: any) {
      showAlert('Failed to delete package tier: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const subTabs: SubTabItem<'overview' | 'editor'>[] = [
    { id: 'overview', label: 'Package Overview', icon: PackageCheck, badge: displayTiers.length },
    { id: 'editor', label: 'Package Editor', icon: Edit },
  ];

  const currentTierIdx = displayTiers.findIndex(t => t.name.toLowerCase() === selectedTier.toLowerCase());
  const prevTier = currentTierIdx > 0 ? displayTiers[currentTierIdx - 1] : null;
  const nextTier = currentTierIdx < displayTiers.length - 1 ? displayTiers[currentTierIdx + 1] : null;

  const editorSwitcherContent = (
    <div className="flex items-center gap-2 bg-pm-card/90 border border-pm-border rounded-xl p-1 shadow-sm backdrop-blur-md">
      {/* Prev Tier Stepper Button (Fixed 28px Icon-Only) */}
      <button
        type="button"
        disabled={!prevTier}
        onClick={() => prevTier && handleTierChange(prevTier.name)}
        title={prevTier ? `Step to ${prevTier.name.toUpperCase()}` : 'First Tier'}
        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center border ${
          prevTier
            ? 'bg-pm-input border-pm-border text-pm-text hover:bg-purple-500/10 hover:border-purple-500/30 hover:text-purple-400 cursor-pointer'
            : 'bg-pm-input/20 border-pm-border/30 text-pm-secondary/40 cursor-not-allowed'
        }`}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Active Tier Dropdown Pill (Fixed 140px Width - Zero Layout Shift) */}
      <div className="relative flex items-center w-[140px] shrink-0">
        <select
          value={selectedTier.toLowerCase()}
          onChange={(e) => handleTierChange(e.target.value)}
          className="appearance-none w-full h-7 pl-2.5 pr-7 bg-purple-500/15 text-purple-300 dark:text-purple-200 border border-pm-border hover:border-purple-500/40 rounded-lg text-xs font-extrabold font-mono truncate text-center focus:outline-none focus:ring-1 focus:ring-purple-500/30 cursor-pointer shadow-sm transition-colors"
        >
          {displayTiers.map((t) => (
            <option key={t.name} value={t.name.toLowerCase()} className="bg-pm-card text-pm-text font-mono font-bold">
              {t.name.toUpperCase()} TIER
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-purple-400 absolute right-2 pointer-events-none" />
      </div>

      {/* Next Tier Stepper Button (Fixed 28px Icon-Only) */}
      <button
        type="button"
        disabled={!nextTier}
        onClick={() => nextTier && handleTierChange(nextTier.name)}
        title={nextTier ? `Step to ${nextTier.name.toUpperCase()}` : 'Last Tier'}
        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center border ${
          nextTier
            ? 'bg-pm-input border-pm-border text-pm-text hover:bg-purple-500/10 hover:border-purple-500/30 hover:text-purple-400 cursor-pointer'
            : 'bg-pm-input/20 border-pm-border/30 text-pm-secondary/40 cursor-not-allowed'
        }`}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Shared Page Header */}
      <PageHeader
        icon={PackageCheck}
        title="Package Tier Presets & Capabilities Matrix"
        description="Configure feature access flags, AST multi-step tools, and daily usage limits for software license keys."
      >
        <Button
          variant="neutral"
          size="sm"
          icon={RefreshCw}
          loading={isRefreshing}
          onClick={handleRefresh}
        >
          Reload Matrix
        </Button>
        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={() => {
            setNewTierName('');
            setCloneFromTier('basic');
            setIsCreateModalOpen(true);
          }}
        >
          Add Custom Tier
        </Button>
      </PageHeader>

      {/* Sub-Tab Navigation Bar */}
      <SubTabNav
        tabs={subTabs}
        activeTab={subTab}
        onTabChange={setSubTab}
      />

      {/* Sub-Tab 1: Package Catalog & Compact Feature Matrix */}
      {subTab === 'overview' && (
        <div className="animate-in fade-in duration-200 space-y-6">
          <TierCardGrid
            displayTiers={displayTiers}
            selectedTier={selectedTier}
            onSelectTier={(tierName) => {
              handleTierChange(tierName);
            }}
            onCloneClick={(tier) => {
              setNewTierName(`${tier.name}_Copy`);
              setCloneFromTier(tier.name.toLowerCase());
              setIsCreateModalOpen(true);
            }}
            onRenameClick={(tier) => {
              setEditingName(tier.name);
              setSelectedTier(tier.name);
              setIsRenaming(true);
              setSubTab('editor');
            }}
            onDeleteClick={(tier) => setTierToDelete(tier)}
          />

          {/* Compact Selected Package Active/Inactive Feature & Quota Matrix */}
          <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-pm-border">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-extrabold text-pm-text tracking-tight uppercase font-mono">
                    Selected Package Matrix: <span className="text-purple-400 font-extrabold">{selectedTier.toUpperCase()} TIER</span>
                  </h3>
                </div>
                <p className="text-xs text-pm-secondary">
                  Live breakdown of active feature flags, AST query tools, and daily operational capacity limits for the <strong className="text-pm-text">{selectedTier.toUpperCase()}</strong> tier.
                </p>
              </div>

              <Button
                variant="neutral"
                size="sm"
                icon={Edit}
                onClick={() => setSubTab('editor')}
                className="shrink-0"
              >
                Package Editor
              </Button>
            </div>

            {/* Quota & Capacity Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-pm-input/40 border border-pm-border rounded-lg space-y-0.5">
                <span className="text-[10px] font-bold text-pm-secondary uppercase tracking-wider block">{t('stat_max_store_domains') || 'Max Store Domains'}</span>
                <span className="text-sm font-extrabold font-mono text-pm-text">{capabilities.max_bound_domains ?? 1} Domain(s)</span>
              </div>
              <div className="p-3 bg-pm-input/40 border border-pm-border rounded-lg space-y-0.5">
                <span className="text-[10px] font-bold text-pm-secondary uppercase tracking-wider block">{t('stat_daily_sweeper_runs') || 'Daily Sweeper Runs'}</span>
                <span className="text-sm font-extrabold font-mono text-pm-text">{capabilities.max_daily_sweeper_runs ?? 1} / Day</span>
              </div>
              <div className="p-3 bg-pm-input/40 border border-pm-border rounded-lg space-y-0.5">
                <span className="text-[10px] font-bold text-pm-secondary uppercase tracking-wider block">{t('stat_cloud_backups') || 'Cloud Backups Retained'}</span>
                <span className="text-sm font-extrabold font-mono text-pm-text">{capabilities.max_cloud_backups ?? 3} Backup(s)</span>
              </div>
              <div className="p-3 bg-pm-input/40 border border-pm-border rounded-lg space-y-0.5">
                <span className="text-[10px] font-bold text-pm-secondary uppercase tracking-wider block">{t('stat_rollback_snapshots') || 'Rollback Snapshots'}</span>
                <span className="text-sm font-extrabold font-mono text-pm-text">{capabilities.rollback_history_limit ?? 5} Snapshots</span>
              </div>
            </div>

            {/* Active vs Inactive Feature Table */}
            <div className="border border-pm-border rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-pm-input/60 text-pm-secondary uppercase font-bold border-b border-pm-border text-[10px]">
                    <th className="p-3">{t('th_feature_capability') || 'Feature Capability'}</th>
                    <th className="p-3 text-center">{t('th_status') || 'Status'}</th>
                    <th className="p-3">{t('th_access_level_desc') || 'Access Level & Description'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pm-border">
                  {[
                    { label: 'AST Visual Data Filter (Step 1)', key: 'query_visual_filter', desc: 'Allows filtering MariaDB database rows via AST rules' },
                    { label: 'SQL Compilation & Preview (Step 2)', key: 'query_visual_compile', desc: 'Generates MariaDB SQL queries with dry-run safety previews' },
                    { label: 'Batch Action Mutations (Step 3)', key: 'query_visual_mutate', desc: 'Executes transactional batch update & delete mutations' },
                    { label: 'Single Table Data Export (CSV/SQL)', key: 'db_tools_export', desc: 'Exports individual table structures and data' },
                    { label: 'Full Database Backup & Compression', key: 'db_tools_backup', desc: 'Executes chunked gzipped MariaDB database backups' },
                    { label: 'Database Schema Diff Inspector', key: 'db_diff_inspector', desc: 'Inspects schema differences against snapshot benchmarks' },
                    { label: '1-Click Database Snapshot Restore', key: 'db_tools_restore', desc: 'Restores databases from local binary backup sidecars' },
                    { label: 'File System Directory Browser', key: 'file_tools_browse', desc: 'Browses PrestaShop store files and directories' },
                    { label: 'Full Directory Zip Backup', key: 'file_tools_backup', desc: 'Creates compressed zip backups of store directories' },
                    { label: 'Visual File Code Diff Inspector', key: 'file_diff_inspector', desc: 'Visually compares file changes line-by-line' },
                    { label: 'Scheduled Cron Automation Jobs', key: 'backup_automation', desc: 'Automates background database & file backup schedules' },
                    { label: 'Background Sweeper Execution', key: 'sweeper_execution', desc: 'Executes ghost file and image purger jobs' },
                    { label: 'Live CPU & RAM Telemetry', key: 'governor_telemetry', desc: 'Monitors real-time CloudLinux LVE hosting load' },
                    { label: 'Governor Auto-Pilot Throttling', key: 'governor_autopilot', desc: 'Automatically throttles background jobs under high server load' },
                  ].map((feat) => {
                    const isEnabled = Boolean((capabilities as any)[feat.key]);
                    return (
                      <tr key={feat.key} className="hover:bg-pm-input/30 transition">
                        <td className="p-3 font-semibold text-pm-text">{feat.label}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                              isEnabled
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-pm-input text-pm-secondary border-pm-border'
                            }`}
                          >
                            {isEnabled ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-pm-secondary/50" />}
                            <span>{isEnabled ? 'Enabled' : 'Disabled'}</span>
                          </span>
                        </td>
                        <td className="p-3 text-pm-secondary text-[11px]">{feat.desc}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Granular Capabilities Configuration Form */}
      {subTab === 'editor' && (
        <div className="animate-in fade-in duration-200 space-y-6">
          <TierCapabilitiesForm
            selectedTier={selectedTier}
            capabilities={capabilities}
            isRenaming={isRenaming}
            editingName={editingName}
            loading={loading}
            switcherControl={editorSwitcherContent}
            onSetEditingName={setEditingName}
            onSetIsRenaming={setIsRenaming}
            onToggle={handleToggle}
            onDestinationToggle={handleDestinationToggle}
            onChangeQuota={handleChangeQuota}
            onSave={handleSave}
          />
        </div>
      )}

      {/* Create Custom Tier Modal */}
      <CreateTierModal
        isOpen={isCreateModalOpen}
        newTierName={newTierName}
        cloneFromTier={cloneFromTier}
        loading={loading}
        onClose={() => setIsCreateModalOpen(false)}
        onChangeNewTierName={setNewTierName}
        onChangeCloneFromTier={setCloneFromTier}
        onCreateTier={handleCreateTier}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!tierToDelete}
        onClose={() => setTierToDelete(null)}
        onConfirm={handleDeleteTier}
        title="Delete Package Tier"
        message={`Are you sure you want to delete the package tier '${tierToDelete?.name}'? Active client licenses currently assigned to this tier will automatically migrate to Basic.`}
        confirmText="Delete Tier"
        variant="danger"
      />
    </div>
  );
};

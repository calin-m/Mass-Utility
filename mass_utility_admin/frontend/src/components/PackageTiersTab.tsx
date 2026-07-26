import React, { useState } from 'react';
import { PackageCheck, Save, RefreshCw, CheckCircle2, ShieldCheck, Zap, Crown, HardDrive, Cloud, Sliders, Database, Layers, FileCode, Clock, ShieldAlert, Key, Plus, Trash2, Edit3, Sparkles, Copy, Tag } from 'lucide-react';
import { SectionHeader } from './common/SectionHeader';
import { Button } from './common/Button';
import { FormInput } from './common/FormInput';
import { BaseModal } from './common/BaseModal';
import { ConfirmModal } from './common/ConfirmModal';
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
  capabilities: PackageTierCapabilities;
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

export const PackageTiersTab: React.FC<PackageTiersTabProps> = ({ tiers, onRefresh, showAlert }) => {
  const { t } = useTranslation();
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

  const activeTierObj = displayTiers.find(t => t.name.toLowerCase() === selectedTier.toLowerCase());

  const currentCaps = activeTierObj && activeTierObj.capabilities && Object.keys(activeTierObj.capabilities).length > 0
    ? activeTierObj.capabilities
    : getDefaultCapsForTier(selectedTier);

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

  const handleCloneClick = (tier: PackageTier) => {
    setNewTierName(`${tier.name}_Copy`);
    setCloneFromTier(tier.name.toLowerCase());
    setIsCreateModalOpen(true);
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

  const checkCardStyle = "flex items-start gap-3 p-3.5 bg-pm-bg rounded-lg border border-pm-border cursor-pointer hover:border-pm-primary/40 transition-all has-[:checked]:bg-pm-primary/5 has-[:checked]:border-pm-primary/40";
  const checkCardSmallStyle = "flex items-start gap-3 p-3 bg-pm-bg rounded-lg border border-pm-border cursor-pointer hover:border-pm-primary/40 transition-all has-[:checked]:bg-pm-primary/5 has-[:checked]:border-pm-primary/40";

  return (
    <div className="space-y-6">
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-pm-card p-4 rounded-xl border border-pm-border">
        <div>
          <h2 className="text-base font-bold text-pm-text flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-pm-primary" />
            Package Tier Presets & Capabilities Matrix
          </h2>
          <p className="text-xs text-pm-secondary mt-0.5">
            Configure feature access flags, AST multi-step tools, and daily usage limits for software license keys.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Top Dynamic Preset Selector Cards Grid */}
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
              onClick={() => handleTierChange(tier.name)}
              className={`p-4 rounded-xl border cursor-pointer transition-all relative group flex flex-col justify-between ${
                isSelected
                  ? 'bg-pm-primary/10 border-pm-primary ring-2 ring-pm-primary/30 shadow-md'
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

              {/* Action Bar with Standardized Buttons */}
              <div className="pt-2 border-t border-pm-border/50 flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold text-pm-primary uppercase">
                  {isSelected ? '● Active' : 'Select'}
                </span>
                
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={Copy}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloneClick(tier);
                    }}
                    className="p-1 h-7 w-7"
                    title="Clone Tier Settings"
                  >
                    {''}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={Edit3}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingName(tier.name);
                      setSelectedTier(tier.name);
                      setIsRenaming(true);
                    }}
                    className="p-1 h-7 w-7"
                    title="Rename Tier"
                  >
                    {''}
                  </Button>

                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    onClick={(e) => {
                      e.stopPropagation();
                      setTierToDelete(tier);
                    }}
                    className="p-1 h-7 w-7"
                    title="Delete Tier"
                  >
                    {''}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Tier Configuration Form */}
      <form onSubmit={handleSave} className="bg-pm-card border border-pm-border rounded-xl p-6 space-y-8 shadow-sm">
        {/* Tier Header & Renaming Control */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-pm-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pm-primary/10 rounded-lg text-pm-primary">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              {isRenaming ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="px-2 py-1 text-sm font-bold bg-pm-bg border border-pm-primary rounded text-pm-text focus:outline-none"
                    placeholder="Enter new tier name"
                  />
                  <Button type="button" size="sm" variant="neutral" onClick={() => setIsRenaming(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-pm-text uppercase">
                    Configuring Tier: <span className="text-pm-primary">{selectedTier}</span>
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={Edit3}
                    onClick={() => {
                      setEditingName(selectedTier);
                      setIsRenaming(true);
                    }}
                    className="p-1 h-7 w-7"
                    title="Rename Tier"
                  >
                    {''}
                  </Button>
                </div>
              )}
              <p className="text-xs text-pm-secondary mt-0.5">
                Toggle capabilities and operational thresholds assigned to keys in this package tier.
              </p>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={Save}
            loading={loading}
          >
            Save {selectedTier.toUpperCase()} Capabilities
          </Button>
        </div>

        {/* Section 1: AST Query Engine */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-pm-border/50">
            <Database className="w-4 h-4 text-pm-primary" />
            <h4 className="text-xs font-bold text-pm-text uppercase tracking-wider">1. ⚡ AST Query Engine & Visual Tools</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className={checkCardStyle}>
              <input
                type="checkbox"
                checked={!!capabilities.query_visual_filter}
                onChange={() => handleToggle('query_visual_filter')}
                className="mt-0.5 w-4 h-4 rounded text-pm-primary focus:ring-pm-primary border-pm-border"
              />
              <div>
                <span className="text-xs font-bold text-pm-text block">Step 1: Visual AST Product & Data Filter</span>
                <span className="text-[11px] text-pm-secondary leading-normal block mt-0.5">
                  Visual column selection, condition builder, and dry-run query previews.
                </span>
              </div>
            </label>

            <label className={checkCardStyle}>
              <input
                type="checkbox"
                checked={!!capabilities.query_visual_compile}
                onChange={() => handleToggle('query_visual_compile')}
                className="mt-0.5 w-4 h-4 rounded text-pm-primary focus:ring-pm-primary border-pm-border"
              />
              <div>
                <span className="text-xs font-bold text-pm-text block">Step 2: SQL Compilation & Dry-Run Preview</span>
                <span className="text-[11px] text-pm-secondary leading-normal block mt-0.5">
                  Strict AST SQL compilation, safety syntax checks, and dry-run execution log terminal.
                </span>
              </div>
            </label>

            <label className={checkCardStyle}>
              <input
                type="checkbox"
                checked={!!capabilities.query_visual_mutate}
                onChange={() => handleToggle('query_visual_mutate')}
                className="mt-0.5 w-4 h-4 rounded text-pm-primary focus:ring-pm-primary border-pm-border"
              />
              <div>
                <span className="text-xs font-bold text-pm-text block">Step 3: Batch Action Configurator & Mutations</span>
                <span className="text-[11px] text-pm-secondary leading-normal block mt-0.5">
                  High-risk batch updates, mass field replacements, and instant database record mutations.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Section 2: Database & File Suite */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-pm-border/50">
            <Layers className="w-4 h-4 text-emerald-500" />
            <h4 className="text-xs font-bold text-pm-text uppercase tracking-wider">2. 🗄️ Database & File Operations Suite</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className={checkCardSmallStyle}>
              <input
                type="checkbox"
                checked={!!capabilities.db_tools_export}
                onChange={() => handleToggle('db_tools_export')}
                className="mt-0.5 w-4 h-4 rounded text-pm-primary focus:ring-pm-primary border-pm-border"
              />
              <div>
                <span className="text-xs font-bold text-pm-text block">Single Table Data Export</span>
                <span className="text-[11px] text-pm-secondary block">CSV/SQL table exports.</span>
              </div>
            </label>

            <label className={checkCardSmallStyle}>
              <input
                type="checkbox"
                checked={!!capabilities.db_tools_backup}
                onChange={() => handleToggle('db_tools_backup')}
                className="mt-0.5 w-4 h-4 rounded text-pm-primary focus:ring-pm-primary border-pm-border"
              />
              <div>
                <span className="text-xs font-bold text-pm-text block">Full DB Backup & Compression</span>
                <span className="text-[11px] text-pm-secondary block">1-Click full database dumps.</span>
              </div>
            </label>

            <label className={checkCardSmallStyle}>
              <input
                type="checkbox"
                checked={!!capabilities.db_diff_inspector}
                onChange={() => handleToggle('db_diff_inspector')}
                className="mt-0.5 w-4 h-4 rounded text-pm-primary focus:ring-pm-primary border-pm-border"
              />
              <div>
                <span className="text-xs font-bold text-pm-text block">Database Schema Diff Inspector</span>
                <span className="text-[11px] text-pm-secondary block">Schema diff visualizer.</span>
              </div>
            </label>

            <label className={checkCardSmallStyle}>
              <input
                type="checkbox"
                checked={!!capabilities.db_tools_restore}
                onChange={() => handleToggle('db_tools_restore')}
                className="mt-0.5 w-4 h-4 rounded text-pm-primary focus:ring-pm-primary border-pm-border"
              />
              <div>
                <span className="text-xs font-bold text-pm-text block">1-Click Snapshot Restoration</span>
                <span className="text-[11px] text-pm-secondary block">Instant database rollback.</span>
              </div>
            </label>

            <label className={checkCardSmallStyle}>
              <input
                type="checkbox"
                checked={!!capabilities.file_tools_browse}
                onChange={() => handleToggle('file_tools_browse')}
                className="mt-0.5 w-4 h-4 rounded text-pm-primary focus:ring-pm-primary border-pm-border"
              />
              <div>
                <span className="text-xs font-bold text-pm-text block">File Directory Browser</span>
                <span className="text-[11px] text-pm-secondary block">Asset & file browser.</span>
              </div>
            </label>

            <label className={checkCardSmallStyle}>
              <input
                type="checkbox"
                checked={!!capabilities.file_tools_backup}
                onChange={() => handleToggle('file_tools_backup')}
                className="mt-0.5 w-4 h-4 rounded text-pm-primary focus:ring-pm-primary border-pm-border"
              />
              <div>
                <span className="text-xs font-bold text-pm-text block">Full File & Directory Backup</span>
                <span className="text-[11px] text-pm-secondary block">ZIP directory archiving.</span>
              </div>
            </label>

            <label className={checkCardSmallStyle}>
              <input
                type="checkbox"
                checked={!!capabilities.file_diff_inspector}
                onChange={() => handleToggle('file_diff_inspector')}
                className="mt-0.5 w-4 h-4 rounded text-pm-primary focus:ring-pm-primary border-pm-border"
              />
              <div>
                <span className="text-xs font-bold text-pm-text block">Visual File Code Diff Inspector</span>
                <span className="text-[11px] text-pm-secondary block">Side-by-side code diff.</span>
              </div>
            </label>

            <label className={checkCardSmallStyle}>
              <input
                type="checkbox"
                checked={!!capabilities.PM_ENABLE_HISTORY}
                onChange={() => handleToggle('PM_ENABLE_HISTORY')}
                className="mt-0.5 w-4 h-4 rounded text-pm-primary focus:ring-pm-primary border-pm-border"
              />
              <div>
                <span className="text-xs font-bold text-pm-text block">Audit History Ledger Tab</span>
                <span className="text-[11px] text-pm-secondary block">Historical event logs.</span>
              </div>
            </label>
          </div>
        </div>

        {/* Section 3: Purging, GDPR & Governor Automations */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-pm-border/50">
            <Clock className="w-4 h-4 text-amber-500" />
            <h4 className="text-xs font-bold text-pm-text uppercase tracking-wider">3. 🧹 Purging, GDPR & Governor Automations</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className={checkCardStyle}>
              <input
                type="checkbox"
                checked={!!capabilities.PM_ENABLE_GHOST_PURGER}
                onChange={() => handleToggle('PM_ENABLE_GHOST_PURGER')}
                className="mt-0.5 w-4 h-4 rounded text-pm-primary focus:ring-pm-primary border-pm-border"
              />
              <div>
                <span className="text-xs font-bold text-pm-text block">Ghost Data Purger</span>
                <span className="text-[11px] text-pm-secondary block mt-0.5">Orphaned database records & ghost cart purger.</span>
              </div>
            </label>

            <label className={checkCardStyle}>
              <input
                type="checkbox"
                checked={!!capabilities.PM_ENABLE_GDPR_SWEEPER}
                onChange={() => handleToggle('PM_ENABLE_GDPR_SWEEPER')}
                className="mt-0.5 w-4 h-4 rounded text-pm-primary focus:ring-pm-primary border-pm-border"
              />
              <div>
                <span className="text-xs font-bold text-pm-text block">GDPR Customer Anonymizer</span>
                <span className="text-[11px] text-pm-secondary block mt-0.5">Right-to-be-forgotten customer data anonymizer.</span>
              </div>
            </label>

            <label className={checkCardStyle}>
              <input
                type="checkbox"
                checked={!!capabilities.backup_automation}
                onChange={() => handleToggle('backup_automation')}
                className="mt-0.5 w-4 h-4 rounded text-pm-primary focus:ring-pm-primary border-pm-border"
              />
              <div>
                <span className="text-xs font-bold text-pm-text block">Scheduled Cron Backups</span>
                <span className="text-[11px] text-pm-secondary block mt-0.5">Automated background backup scheduler.</span>
              </div>
            </label>

            <label className={checkCardStyle}>
              <input
                type="checkbox"
                checked={!!capabilities.sweeper_execution}
                onChange={() => handleToggle('sweeper_execution')}
                className="mt-0.5 w-4 h-4 rounded text-pm-primary focus:ring-pm-primary border-pm-border"
              />
              <div>
                <span className="text-xs font-bold text-pm-text block">Automated Background Sweeper</span>
                <span className="text-[11px] text-pm-secondary block mt-0.5">Unattended background cleaning tasks.</span>
              </div>
            </label>

            <label className={checkCardStyle}>
              <input
                type="checkbox"
                checked={!!capabilities.governor_telemetry}
                onChange={() => handleToggle('governor_telemetry')}
                className="mt-0.5 w-4 h-4 rounded text-pm-primary focus:ring-pm-primary border-pm-border"
              />
              <div>
                <span className="text-xs font-bold text-pm-text block">Governor Live Telemetry</span>
                <span className="text-[11px] text-pm-secondary block mt-0.5">Real-time CPU/RAM load visualizer.</span>
              </div>
            </label>

            <label className={checkCardStyle}>
              <input
                type="checkbox"
                checked={!!capabilities.governor_autopilot}
                onChange={() => handleToggle('governor_autopilot')}
                className="mt-0.5 w-4 h-4 rounded text-pm-primary focus:ring-pm-primary border-pm-border"
              />
              <div>
                <span className="text-xs font-bold text-pm-text block">Governor Auto-Pilot Throttling</span>
                <span className="text-[11px] text-pm-secondary block mt-0.5">Automated CPU load throttling guardrail.</span>
              </div>
            </label>
          </div>
        </div>

        {/* Section 4: Usage Quotas & Limits */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-pm-border/50">
            <ShieldAlert className="w-4 h-4 text-indigo-500" />
            <h4 className="text-xs font-bold text-pm-text uppercase tracking-wider">4. 📊 Usage Quotas & Operational Limits</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormInput
              label="Rollback History Limit"
              type="number"
              value={capabilities.rollback_history_limit ?? 5}
              onChange={(e) => setCapabilities(prev => ({ ...prev, rollback_history_limit: parseInt(e.target.value) || 0 }))}
              placeholder="e.g. 15"
            />
            <FormInput
              label="Store Domain Binding Limit"
              type="number"
              value={capabilities.max_bound_domains ?? 1}
              onChange={(e) => setCapabilities(prev => ({ ...prev, max_bound_domains: parseInt(e.target.value) || 0 }))}
              placeholder="e.g. 2"
            />
            <FormInput
              label="Google Drive Retention Quota"
              type="number"
              value={capabilities.max_cloud_backups ?? 3}
              onChange={(e) => setCapabilities(prev => ({ ...prev, max_cloud_backups: parseInt(e.target.value) || 0 }))}
              placeholder="e.g. 5"
            />
            <FormInput
              label="Max Daily Sweeper Executions"
              type="number"
              value={capabilities.max_daily_sweeper_runs ?? 1}
              onChange={(e) => setCapabilities(prev => ({ ...prev, max_daily_sweeper_runs: parseInt(e.target.value) || 0 }))}
              placeholder="e.g. 2"
            />
          </div>
        </div>

        {/* Section 5: Storage Destinations */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-pm-border/50">
            <Cloud className="w-4 h-4 text-blue-500" />
            <h4 className="text-xs font-bold text-pm-text uppercase tracking-wider">5. ☁️ Allowed Backup Storage Destinations</h4>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-xs font-medium text-pm-text cursor-pointer">
              <input
                type="checkbox"
                checked={(capabilities.backup_destinations || ['local']).includes('local')}
                onChange={() => handleDestinationToggle('local')}
                className="w-4 h-4 rounded text-pm-primary focus:ring-pm-primary border-pm-border"
              />
              <HardDrive className="w-4 h-4 text-pm-secondary" /> Local Disk Directory (`/backups/`)
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-pm-text cursor-pointer">
              <input
                type="checkbox"
                checked={(capabilities.backup_destinations || ['local']).includes('gdrive')}
                onChange={() => handleDestinationToggle('gdrive')}
                className="w-4 h-4 rounded text-pm-primary focus:ring-pm-primary border-pm-border"
              />
              <Cloud className="w-4 h-4 text-blue-500" /> Google Drive Cloud Destination
            </label>
          </div>
        </div>

        {/* Form Footer */}
        <div className="pt-4 border-t border-pm-border flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={Save}
            loading={loading}
          >
            Save {selectedTier.toUpperCase()} Capabilities
          </Button>
        </div>
      </form>

      {/* Modal: Create Custom Package Tier */}
      <BaseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Package Tier"
      >
        <div className="space-y-4">
          <p className="text-xs text-pm-secondary">
            Create or clone a package tier preset with custom capabilities and quotas.
          </p>

          <FormInput
            label="Tier Name"
            value={newTierName}
            onChange={(e) => setNewTierName(e.target.value)}
            placeholder="e.g. Agency, Starter, Lifetime, Developer"
          />

          <div className="space-y-1">
            <label className="text-xs font-semibold text-pm-text block">
              Clone Capabilities & Quotas From Template
            </label>
            <select
              value={cloneFromTier}
              onChange={(e) => setCloneFromTier(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-pm-bg border border-pm-border rounded-lg text-pm-text focus:ring-1 focus:ring-pm-primary focus:outline-none"
            >
              <option value="basic">Basic Preset (Essential)</option>
              <option value="pro">Pro Preset (Growth & Automation)</option>
              <option value="enterprise">Enterprise Preset (Full Autopilot)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-pm-border">
            <Button
              variant="neutral"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={handleCreateTier}
              loading={loading}
            >
              Create Tier
            </Button>
          </div>
        </div>
      </BaseModal>

      {/* Modal: Delete Package Tier Confirmation */}
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

import React, { useState } from 'react';
import { PackageCheck, Save, RefreshCw, CheckCircle2, ShieldCheck, Zap, Crown, HardDrive, Cloud, Sliders, Database, Layers, FileCode, Clock, ShieldAlert, Key } from 'lucide-react';
import { SectionHeader } from './common/SectionHeader';
import { Button } from './common/Button';
import { FormInput } from './common/FormInput';
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
      db_diff_inspector: true,
      db_tools_restore: true,
      file_tools_browse: true,
      file_tools_backup: true,
      file_diff_inspector: true,
      backup_automation: true,
      governor_autopilot: false,
      sweeper_execution: true,
      rollback_history_limit: 25,
      max_bound_domains: 3,
      max_cloud_backups: 10,
      max_daily_sweeper_runs: 6,
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
        {/* BASIC Preset Card */}
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
              <h3 className="text-sm font-bold text-pm-text uppercase">Basic Preset</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase">Essential</span>
          </div>
          <p className="text-[11px] text-pm-secondary mb-4 leading-relaxed">
            Essential store maintenance. Manual exports, Ghost Purger, GDPR Sweeper, and 1 bound store domain.
          </p>
          <ul className="text-[11px] space-y-1.5 text-pm-secondary mb-4">
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Single Table Data Export</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Ghost Purger & GDPR Sweeper</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 1 Bound Store Domain</li>
          </ul>
          <div className="pt-2 border-t border-pm-border/50 text-[10px] font-bold text-pm-primary uppercase flex items-center justify-between">
            <span>{selectedTier === 'basic' ? '● Active Preset Selected' : 'Click to Load Template'}</span>
            <Sliders className="w-3 h-3" />
          </div>
        </div>

        {/* PRO Preset Card */}
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
              <h3 className="text-sm font-bold text-pm-text uppercase">Pro Preset</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 uppercase">Growth</span>
          </div>
          <p className="text-[11px] text-pm-secondary mb-4 leading-relaxed">
            Automation & Analytics. Step 1 Visual Filter, Step 2 SQL Compilation, scheduled Cron backups, and Google Drive cloud sync.
          </p>
          <ul className="text-[11px] space-y-1.5 text-pm-secondary mb-4">
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-500" /> Step 1 & 2 AST Filter & SQL Compile</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-500" /> Scheduled Cron Backups & Diffing</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-500" /> 3 Bound Domains / 10 Cloud Backups</li>
          </ul>
          <div className="pt-2 border-t border-pm-border/50 text-[10px] font-bold text-pm-primary uppercase flex items-center justify-between">
            <span>{selectedTier === 'pro' ? '● Active Preset Selected' : 'Click to Load Template'}</span>
            <Sliders className="w-3 h-3" />
          </div>
        </div>

        {/* ENTERPRISE Preset Card */}
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
              <h3 className="text-sm font-bold text-pm-text uppercase">Enterprise Preset</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 uppercase">Full Autopilot</span>
          </div>
          <p className="text-[11px] text-pm-secondary mb-4 leading-relaxed">
            Full Governance & Scale. Step 3 Batch Action Configurator & Mutations, Governor Auto-Pilot CPU tuning, and 100 rollback limit.
          </p>
          <ul className="text-[11px] space-y-1.5 text-pm-secondary mb-4">
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" /> Step 3: Batch Action Mutations</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" /> Governor Auto-Pilot Throttling</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" /> 10 Bound Domains / 100 Rollbacks</li>
          </ul>
          <div className="pt-2 border-t border-pm-border/50 text-[10px] font-bold text-pm-primary uppercase flex items-center justify-between">
            <span>{selectedTier === 'enterprise' ? '● Active Preset Selected' : 'Click to Load Template'}</span>
            <Sliders className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Main Tier Matrix Configuration Container */}
      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm pm-card-elevation w-full">
        <SectionHeader
          title={`${t('tiers_title')} (${selectedTier.toUpperCase()} MATRIX)`}
          subtitle="Configure granular multi-step tools, safety governors, and usage quotas for this license tier."
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
          
          {/* Section 1: AST Query & Bulk Mutation Engine (3-Step Pipeline) */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-pm-secondary mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-500" />
              1. AST Query & Bulk Mutation Engine (Multi-Step Pipeline)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex items-center justify-between p-3 bg-pm-input/50 rounded-lg border border-pm-border cursor-pointer hover:bg-pm-input transition">
                <div>
                  <span className="text-xs font-semibold text-pm-text block">Step 1: Visual AST Product & Data Filter</span>
                  <span className="text-[11px] text-pm-secondary">Drag-and-drop query condition builder & visual filter</span>
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
                  <span className="text-xs font-semibold text-pm-text block">Step 2: SQL Compilation & Dry-Run Preview</span>
                  <span className="text-[11px] text-pm-secondary">Generates raw MariaDB SQL & architectural impact analysis report</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(capabilities.query_visual_compile)}
                  onChange={() => handleToggle('query_visual_compile')}
                  className="rounded border-pm-border text-pm-primary focus:ring-pm-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-pm-input/50 rounded-lg border border-pm-border cursor-pointer hover:bg-pm-input transition">
                <div>
                  <span className="text-xs font-semibold text-pm-text block">Step 3: Batch Action Configurator & Mutations</span>
                  <span className="text-[11px] text-pm-secondary">Executes bulk price/stock updates with transaction rollback ledger</span>
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

          {/* Section 2: Database & File Management Suite (Multi-Step Pipeline) */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-pm-secondary mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              2. Database & File Management Suite (Multi-Step Pipeline)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* DB Tools Suite */}
              <label className="flex items-center justify-between p-3 bg-pm-input/50 rounded-lg border border-pm-border cursor-pointer hover:bg-pm-input transition">
                <div>
                  <span className="text-xs font-semibold text-pm-text block">Single Table Data Export</span>
                  <span className="text-[11px] text-pm-secondary">Export single table CSV / SQL dumps</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(capabilities.db_tools_export)}
                  onChange={() => handleToggle('db_tools_export')}
                  className="rounded border-pm-border text-pm-primary focus:ring-pm-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-pm-input/50 rounded-lg border border-pm-border cursor-pointer hover:bg-pm-input transition">
                <div>
                  <span className="text-xs font-semibold text-pm-text block">Full DB Backup & Compression</span>
                  <span className="text-[11px] text-pm-secondary">Complete MariaDB database snapshot</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(capabilities.db_tools_backup)}
                  onChange={() => handleToggle('db_tools_backup')}
                  className="rounded border-pm-border text-pm-primary focus:ring-pm-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-pm-input/50 rounded-lg border border-pm-border cursor-pointer hover:bg-pm-input transition">
                <div>
                  <span className="text-xs font-semibold text-pm-text block">Database Schema Diff Inspector</span>
                  <span className="text-[11px] text-pm-secondary">Inspect table structure diffs before restore</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(capabilities.db_diff_inspector)}
                  onChange={() => handleToggle('db_diff_inspector')}
                  className="rounded border-pm-border text-pm-primary focus:ring-pm-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-pm-input/50 rounded-lg border border-pm-border cursor-pointer hover:bg-pm-input transition">
                <div>
                  <span className="text-xs font-semibold text-pm-text block">1-Click DB Snapshot Restore</span>
                  <span className="text-[11px] text-pm-secondary">Restore MariaDB database from backup</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(capabilities.db_tools_restore)}
                  onChange={() => handleToggle('db_tools_restore')}
                  className="rounded border-pm-border text-pm-primary focus:ring-pm-primary"
                />
              </label>

              {/* File Tools Suite */}
              <label className="flex items-center justify-between p-3 bg-pm-input/50 rounded-lg border border-pm-border cursor-pointer hover:bg-pm-input transition">
                <div>
                  <span className="text-xs font-semibold text-pm-text block">File & Asset Directory Browser</span>
                  <span className="text-[11px] text-pm-secondary">Browse module & theme file directory</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(capabilities.file_tools_browse)}
                  onChange={() => handleToggle('file_tools_browse')}
                  className="rounded border-pm-border text-pm-primary focus:ring-pm-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-pm-input/50 rounded-lg border border-pm-border cursor-pointer hover:bg-pm-input transition">
                <div>
                  <span className="text-xs font-semibold text-pm-text block">Full File & Directory Backup</span>
                  <span className="text-[11px] text-pm-secondary">Compress theme & module assets into zip</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(capabilities.file_tools_backup)}
                  onChange={() => handleToggle('file_tools_backup')}
                  className="rounded border-pm-border text-pm-primary focus:ring-pm-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-pm-input/50 rounded-lg border border-pm-border cursor-pointer hover:bg-pm-input transition">
                <div>
                  <span className="text-xs font-semibold text-pm-text block">Visual File Code Diff Inspector</span>
                  <span className="text-[11px] text-pm-secondary">Inspect side-by-side file code changes</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(capabilities.file_diff_inspector)}
                  onChange={() => handleToggle('file_diff_inspector')}
                  className="rounded border-pm-border text-pm-primary focus:ring-pm-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-pm-input/50 rounded-lg border border-pm-border cursor-pointer hover:bg-pm-input transition">
                <div>
                  <span className="text-xs font-semibold text-pm-text block">Rollback History Ledger Tab</span>
                  <span className="text-[11px] text-pm-secondary">Access complete rollback transaction log</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(capabilities.PM_ENABLE_HISTORY)}
                  onChange={() => handleToggle('PM_ENABLE_HISTORY')}
                  className="rounded border-pm-border text-pm-primary focus:ring-pm-primary"
                />
              </label>
            </div>
          </div>

          {/* Section 3: Purging, GDPR & Safety Governor */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-pm-secondary mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-sky-500" />
              3. Purging, GDPR & Safety Governor
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <label className="flex items-center justify-between p-3 bg-pm-input/50 rounded-lg border border-pm-border cursor-pointer hover:bg-pm-input transition">
                <div>
                  <span className="text-xs font-semibold text-pm-text block">Manual Ghost Purger</span>
                  <span className="text-[11px] text-pm-secondary">Clean expired guest carts & sessions</span>
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
                  <span className="text-xs font-semibold text-pm-text block">Manual GDPR Customer Anonymizer</span>
                  <span className="text-[11px] text-pm-secondary">Anonymize customer PII data</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(capabilities.PM_ENABLE_GDPR_SWEEPER)}
                  onChange={() => handleToggle('PM_ENABLE_GDPR_SWEEPER')}
                  className="rounded border-pm-border text-pm-primary focus:ring-pm-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-pm-input/50 rounded-lg border border-pm-border cursor-pointer hover:bg-pm-input transition">
                <div>
                  <span className="text-xs font-semibold text-pm-text block">Automated Background Sweeper Jobs</span>
                  <span className="text-[11px] text-pm-secondary">Scheduled background GDPR & cart purging</span>
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
                  <span className="text-xs font-semibold text-pm-text block">Scheduled Cron Backups</span>
                  <span className="text-[11px] text-pm-secondary">Background automated CLI backups</span>
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
                  <span className="text-xs font-semibold text-pm-text block">Live CPU/RAM Governor Telemetry</span>
                  <span className="text-[11px] text-pm-secondary">Real-time CloudLinux CPU/Memory load gauges</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(capabilities.governor_telemetry)}
                  onChange={() => handleToggle('governor_telemetry')}
                  className="rounded border-pm-border text-pm-primary focus:ring-pm-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-pm-input/50 rounded-lg border border-pm-border cursor-pointer hover:bg-pm-input transition">
                <div>
                  <span className="text-xs font-semibold text-pm-text block">Governor Auto-Pilot CPU Throttling</span>
                  <span className="text-[11px] text-pm-secondary">Auto-throttle query chunk size on high CPU load</span>
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

          {/* Section 4: Usage Quotas & Limits */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-pm-secondary mb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-500" />
              4. Usage Quotas & Operational Limits
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-pm-input/30 p-4 rounded-xl border border-pm-border">
              {/* Rollback Snapshot Limit */}
              <div>
                <label className="block text-xs font-semibold text-pm-text mb-1">
                  Rollback Snapshot Limit
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
                  Max snapshots stored in rollback history.
                </span>
              </div>

              {/* Bound Domains Limit */}
              <div>
                <label className="block text-xs font-semibold text-pm-text mb-1">
                  Store Domain Binding Limit
                </label>
                <FormInput
                  type="number"
                  min="1"
                  max="100"
                  value={capabilities.max_bound_domains ?? 1}
                  onChange={e => {
                    const val = parseInt(e.target.value, 10) || 1;
                    setCapabilities(prev => ({ ...prev, max_bound_domains: val }));
                  }}
                />
                <span className="text-[10px] text-pm-secondary mt-1 block">
                  Max store URLs bound to a single key.
                </span>
              </div>

              {/* Max Cloud Backups */}
              <div>
                <label className="block text-xs font-semibold text-pm-text mb-1">
                  Google Drive Cloud Retention Quota
                </label>
                <FormInput
                  type="number"
                  min="1"
                  max="500"
                  value={capabilities.max_cloud_backups ?? 3}
                  onChange={e => {
                    const val = parseInt(e.target.value, 10) || 1;
                    setCapabilities(prev => ({ ...prev, max_cloud_backups: val }));
                  }}
                />
                <span className="text-[10px] text-pm-secondary mt-1 block">
                  Max cloud backups retained on Google Drive.
                </span>
              </div>

              {/* Max Daily Sweeper Runs */}
              <div>
                <label className="block text-xs font-semibold text-pm-text mb-1">
                  Max Daily Background Sweeper Executions
                </label>
                <FormInput
                  type="number"
                  min="1"
                  max="100"
                  value={capabilities.max_daily_sweeper_runs ?? 1}
                  onChange={e => {
                    const val = parseInt(e.target.value, 10) || 1;
                    setCapabilities(prev => ({ ...prev, max_daily_sweeper_runs: val }));
                  }}
                />
                <span className="text-[10px] text-pm-secondary mt-1 block">
                  Max background purge jobs per day.
                </span>
              </div>
            </div>
          </div>

          {/* Section 5: Allowed Backup Storage Destinations */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-pm-secondary mb-3 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-indigo-500" />
              5. Allowed Backup Storage Destinations (Implemented Engines Only)
            </h4>
            
            <div className="bg-pm-input/30 p-4 rounded-xl border border-pm-border">
              <div className="block text-xs font-semibold text-pm-text mb-2">
                Allowed Backup Storage Destinations
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-pm-text p-2.5 bg-pm-input/40 rounded-lg border border-pm-border hover:bg-pm-input transition">
                  <input
                    type="checkbox"
                    checked={Boolean(capabilities.backup_destinations?.includes('local'))}
                    onChange={() => handleDestinationToggle('local')}
                    className="rounded border-pm-border text-pm-primary focus:ring-pm-primary"
                  />
                  <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                  <span>Local Server Storage (Always Enabled)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-pm-text p-2.5 bg-pm-input/40 rounded-lg border border-pm-border hover:bg-pm-input transition">
                  <input
                    type="checkbox"
                    checked={Boolean(capabilities.backup_destinations?.includes('gdrive'))}
                    onChange={() => handleDestinationToggle('gdrive')}
                    className="rounded border-pm-border text-pm-primary focus:ring-pm-primary"
                  />
                  <Cloud className="w-3.5 h-3.5 text-sky-500" />
                  <span>Google Drive Cloud Storage</span>
                </label>
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

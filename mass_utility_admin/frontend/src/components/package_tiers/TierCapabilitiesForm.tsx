import React from 'react';
import { Sliders, Save, Database, Layers, Clock, ShieldAlert, Cloud, HardDrive, Edit3 } from 'lucide-react';
import { Button } from '../common/Button';
import { FormInput } from '../common/FormInput';
import { ToggleSwitch } from '../common/ToggleSwitch';
import { PackageTierCapabilities } from '../PackageTiersTab';

export interface TierCapabilitiesFormProps {
  selectedTier: string;
  capabilities: PackageTierCapabilities;
  isRenaming: boolean;
  editingName: string;
  loading: boolean;
  switcherControl?: React.ReactNode;
  onSetEditingName: (name: string) => void;
  onSetIsRenaming: (val: boolean) => void;
  onToggle: (key: keyof PackageTierCapabilities) => void;
  onDestinationToggle: (dest: string) => void;
  onChangeQuota: (key: keyof PackageTierCapabilities, val: number) => void;
  onSave: (e: React.FormEvent) => void;
}

export const TierCapabilitiesForm: React.FC<TierCapabilitiesFormProps> = ({
  selectedTier,
  capabilities,
  isRenaming,
  editingName,
  loading,
  switcherControl,
  onSetEditingName,
  onSetIsRenaming,
  onToggle,
  onDestinationToggle,
  onChangeQuota,
  onSave,
}) => {
  return (
    <form onSubmit={onSave} className="bg-pm-card border border-pm-border rounded-xl p-6 space-y-8 shadow-sm">
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
                  onChange={(e) => onSetEditingName(e.target.value)}
                  className="px-2 py-1 text-sm font-bold bg-pm-input border border-pm-primary rounded text-pm-text focus:outline-none"
                  placeholder="Enter new tier name"
                />
                <Button type="button" size="sm" variant="neutral" onClick={() => onSetIsRenaming(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-pm-text uppercase flex items-center gap-1.5">
                  <span>Configuring Tier:</span>
                  <span className="text-pm-primary font-extrabold inline-block">{selectedTier}</span>
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  icon={Edit3}
                  onClick={() => {
                    onSetEditingName(selectedTier);
                    onSetIsRenaming(true);
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

        <div className="flex items-center gap-3 flex-wrap">
          {switcherControl}
          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={Save}
            loading={loading}
          >
            Save Capabilities
          </Button>
        </div>
      </div>

      {/* Section 1: AST Query Engine */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-pm-border">
          <Database className="w-4 h-4 text-pm-primary" />
          <h4 className="text-xs font-bold text-pm-text uppercase tracking-wider">1. ⚡ AST Query Engine & Visual Tools</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ToggleSwitch
            checked={!!capabilities.query_visual_filter}
            onChange={() => onToggle('query_visual_filter')}
            title="Step 1: Visual AST Product & Data Filter"
            description="Visual column selection, condition builder, and dry-run query previews."
          />
          <ToggleSwitch
            checked={!!capabilities.query_visual_compile}
            onChange={() => onToggle('query_visual_compile')}
            title="Step 2: SQL Compilation & Dry-Run Preview"
            description="Strict AST SQL compilation, safety syntax checks, and dry-run execution log terminal."
          />
          <ToggleSwitch
            checked={!!capabilities.query_visual_mutate}
            onChange={() => onToggle('query_visual_mutate')}
            title="Step 3: Batch Action Configurator & Mutations"
            description="High-risk batch updates, mass field replacements, and instant database record mutations."
          />
        </div>
      </div>

      {/* Section 2: Database & File Suite */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-pm-border">
          <Layers className="w-4 h-4 text-pm-primary" />
          <h4 className="text-xs font-bold text-pm-text uppercase tracking-wider">2. 🗄️ Database & File Operations Suite</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ToggleSwitch
            size="sm"
            checked={!!capabilities.db_tools_export}
            onChange={() => onToggle('db_tools_export')}
            title="Single Table Data Export"
            description="CSV/SQL table exports."
          />
          <ToggleSwitch
            size="sm"
            checked={!!capabilities.db_tools_backup}
            onChange={() => onToggle('db_tools_backup')}
            title="Full DB Backup & Compression"
            description="1-Click full database dumps."
          />
          <ToggleSwitch
            size="sm"
            checked={!!capabilities.db_diff_inspector}
            onChange={() => onToggle('db_diff_inspector')}
            title="Database Schema Diff Inspector"
            description="Schema diff visualizer."
          />
          <ToggleSwitch
            size="sm"
            checked={!!capabilities.db_tools_restore}
            onChange={() => onToggle('db_tools_restore')}
            title="1-Click Snapshot Restoration"
            description="Instant database rollback."
          />
          <ToggleSwitch
            size="sm"
            checked={!!capabilities.file_tools_browse}
            onChange={() => onToggle('file_tools_browse')}
            title="File Directory Browser"
            description="Asset & file browser."
          />
          <ToggleSwitch
            size="sm"
            checked={!!capabilities.file_tools_backup}
            onChange={() => onToggle('file_tools_backup')}
            title="Full File & Directory Backup"
            description="ZIP directory archiving."
          />
          <ToggleSwitch
            size="sm"
            checked={!!capabilities.file_diff_inspector}
            onChange={() => onToggle('file_diff_inspector')}
            title="Visual File Code Diff Inspector"
            description="Side-by-side code diff."
          />
          <ToggleSwitch
            size="sm"
            checked={!!capabilities.PM_ENABLE_HISTORY}
            onChange={() => onToggle('PM_ENABLE_HISTORY')}
            title="Audit History Ledger Tab"
            description="Historical event logs."
          />
        </div>
      </div>

      {/* Section 3: Purging, GDPR & Governor Automations */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-pm-border">
          <Clock className="w-4 h-4 text-pm-primary" />
          <h4 className="text-xs font-bold text-pm-text uppercase tracking-wider">3. 🧹 Purging, GDPR & Governor Automations</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ToggleSwitch
            checked={!!capabilities.PM_ENABLE_GHOST_PURGER}
            onChange={() => onToggle('PM_ENABLE_GHOST_PURGER')}
            title="Ghost Data Purger"
            description="Orphaned database records & ghost cart purger."
          />
          <ToggleSwitch
            checked={!!capabilities.PM_ENABLE_GDPR_SWEEPER}
            onChange={() => onToggle('PM_ENABLE_GDPR_SWEEPER')}
            title="GDPR Customer Anonymizer"
            description="Right-to-be-forgotten customer data anonymizer."
          />
          <ToggleSwitch
            checked={!!capabilities.backup_automation}
            onChange={() => onToggle('backup_automation')}
            title="Scheduled Cron Backups"
            description="Automated background backup scheduler."
          />
          <ToggleSwitch
            checked={!!capabilities.sweeper_execution}
            onChange={() => onToggle('sweeper_execution')}
            title="Automated Background Sweeper"
            description="Unattended background cleaning tasks."
          />
          <ToggleSwitch
            checked={!!capabilities.governor_telemetry}
            onChange={() => onToggle('governor_telemetry')}
            title="Governor Live Telemetry"
            description="Real-time CPU/RAM load visualizer."
          />
          <ToggleSwitch
            checked={!!capabilities.governor_autopilot}
            onChange={() => onToggle('governor_autopilot')}
            title="Governor Auto-Pilot Throttling"
            description="Automated CPU load throttling guardrail."
          />
        </div>
      </div>

      {/* Section 4: Usage Quotas & Limits */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-pm-border">
          <ShieldAlert className="w-4 h-4 text-pm-primary" />
          <h4 className="text-xs font-bold text-pm-text uppercase tracking-wider">4. 📊 Usage Quotas & Operational Limits</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormInput
            label="Rollback History Limit"
            type="number"
            value={capabilities.rollback_history_limit ?? 5}
            onChange={(e) => onChangeQuota('rollback_history_limit', parseInt(e.target.value) || 0)}
            placeholder="e.g. 15"
          />
          <FormInput
            label="Store Domain Binding Limit"
            type="number"
            value={capabilities.max_bound_domains ?? 1}
            onChange={(e) => onChangeQuota('max_bound_domains', parseInt(e.target.value) || 0)}
            placeholder="e.g. 2"
          />
          <FormInput
            label="Google Drive Retention Quota"
            type="number"
            value={capabilities.max_cloud_backups ?? 3}
            onChange={(e) => onChangeQuota('max_cloud_backups', parseInt(e.target.value) || 0)}
            placeholder="e.g. 5"
          />
          <FormInput
            label="Max Daily Sweeper Executions"
            type="number"
            value={capabilities.max_daily_sweeper_runs ?? 1}
            onChange={(e) => onChangeQuota('max_daily_sweeper_runs', parseInt(e.target.value) || 0)}
            placeholder="e.g. 2"
          />
        </div>
      </div>

      {/* Section 5: Storage Destinations */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-pm-border">
          <Cloud className="w-4 h-4 text-pm-primary" />
          <h4 className="text-xs font-bold text-pm-text uppercase tracking-wider">5. ☁️ Allowed Backup Storage Destinations</h4>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-xs font-medium text-pm-text cursor-pointer">
            <input
              type="checkbox"
              checked={(capabilities.backup_destinations || ['local']).includes('local')}
              onChange={() => onDestinationToggle('local')}
              className="w-4 h-4 rounded text-pm-primary focus:ring-pm-primary border-pm-border"
            />
            <HardDrive className="w-4 h-4 text-pm-secondary" /> Local Disk Directory (`/backups/`)
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-pm-text cursor-pointer">
            <input
              type="checkbox"
              checked={(capabilities.backup_destinations || ['local']).includes('gdrive')}
              onChange={() => onDestinationToggle('gdrive')}
              className="w-4 h-4 rounded text-pm-primary focus:ring-pm-primary border-pm-border"
            />
            <Cloud className="w-4 h-4 text-pm-primary" /> Google Drive Cloud Destination
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
          Save
        </Button>
      </div>
    </form>
  );
};

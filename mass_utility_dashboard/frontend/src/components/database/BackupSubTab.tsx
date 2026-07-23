// @Arch[UI_Components]
// @Description: Sub-tab component managing MySQL table dump creation, presets, domain table filtering, and historical backups grid.

import React from 'react';
import { ProgressHUD } from '../common/ProgressHUD';
import { SectionHeader } from '../common/SectionHeader';
import { PresetLoadoutBar } from '../common/PresetLoadoutBar';
import { StatusBadge } from '../common/StatusBadge';

export interface BackupRecord {
  basename: string;
  sql_size: any;
  log_size: any;
  date: any;
  is_local?: boolean;
  is_cloud?: boolean;
  is_pinned?: boolean;
  is_uploaded?: boolean;
  duration?: string;
  sql_download_url?: string;
  log_filename?: string;
  log_download_url?: string;
}

interface BackupSubTabProps {
  categorizedTables: Record<string, string[]>;
  selectedTables: string[];
  expandedDomains: Record<string, boolean>;
  backupPresets: string[];
  selectedPreset: string;
  isBackupRunning: boolean;
  backupProgressPercent: number;
  backupProgressText: string;
  backups: BackupRecord[];
  onStartBackup: () => void;
  onCancelBackup: () => void;
  onLoadPreset: (presetName: string) => void;
  onSavePreset: () => void;
  onDeletePreset: () => void;
  onSelectAll: (checked: boolean) => void;
  onDomainSelect: (domain: string, checked: boolean) => void;
  onTableToggle: (tableName: string) => void;
  onToggleDomainExpanded: (domain: string) => void;
  onClearBackupHistory: () => void;
  onCheckCompareDrift: (basename: string) => void;
  onDeleteBackup: (basename: string) => void;
  onTogglePinBackup: (basename: string) => void;
  resolveDownloadUrl: (url: string) => string;
  formatSqlSize: (size: any) => string;
  formatLogSize: (size: any) => string;
  formatDate: (dateVal: any) => string;
  showAlert: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
}

export const BackupSubTab: React.FC<BackupSubTabProps> = ({
  categorizedTables,
  selectedTables,
  expandedDomains,
  backupPresets,
  selectedPreset,
  isBackupRunning,
  backupProgressPercent,
  backupProgressText,
  backups,
  onStartBackup,
  onCancelBackup,
  onLoadPreset,
  onSavePreset,
  onDeletePreset,
  onSelectAll,
  onDomainSelect,
  onTableToggle,
  onToggleDomainExpanded,
  onClearBackupHistory,
  onCheckCompareDrift,
  onDeleteBackup,
  onTogglePinBackup,
  resolveDownloadUrl,
  formatSqlSize,
  formatLogSize,
  formatDate,
  showAlert,
}) => {
  return (
    <div className="space-y-6">
      {/* Card 1: Pre-Flight Database Catalog Exporter */}
      <div className="pm-panel-v2 space-y-4">
        <SectionHeader
          dotColor="bg-amber-500"
          title="Pre-Flight Database Catalog Exporter"
          actionSlot={
            <button
              type="button"
              onClick={onStartBackup}
              disabled={isBackupRunning}
              className="pm-btn bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg transition uppercase tracking-wider hover:-translate-y-[1px] active:translate-y-0 cursor-pointer"
            >
              📥 Generate Backup &amp; Log Archive
            </button>
          }
        />

        {isBackupRunning && (
          <ProgressHUD
            progressPercent={backupProgressPercent}
            progressText={backupProgressText}
            onCancel={onCancelBackup}
            cancelText="🛑 Stop Backup"
          />
        )}

        {/* Table Selection Customizer */}
        <div className="bg-[var(--pm-body-bg)] border border-[var(--pm-border-color)] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3 border-b border-[var(--pm-border-color)] pb-3 flex-wrap justify-between">
            <PresetLoadoutBar
              presets={backupPresets}
              selectedPreset={selectedPreset}
              onSelectPreset={onLoadPreset}
              onSavePreset={onSavePreset}
              onDeletePreset={onDeletePreset}
            />

            <label className="flex items-center gap-2 text-xs font-bold text-[#8b5cf6] cursor-pointer">
              <input
                type="checkbox"
                onChange={(e) => onSelectAll(e.target.checked)}
                className="rounded bg-[var(--pm-card-bg)] border border-[var(--pm-border-color)] text-[#8b5cf6] focus:ring-0 focus:outline-none cursor-pointer"
              />
              Select All Tables (Full Backup)
            </label>
          </div>

          {/* Grid domain categories */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.keys(categorizedTables).map((domain) => {
              const tables = categorizedTables[domain] || [];
              const selectedInDomain = tables.filter((t) => selectedTables.includes(t));
              const isAllSelected = selectedInDomain.length === tables.length && tables.length > 0;
              const isSomeSelected = selectedInDomain.length > 0 && !isAllSelected;
              const isExpanded = expandedDomains[domain] || false;

              return (
                <div key={domain} className="bg-[var(--pm-card-bg)] border border-[var(--pm-border-color)] rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <label className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer text-[var(--pm-text-primary)]">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isSomeSelected;
                        }}
                        onChange={(e) => onDomainSelect(domain, e.target.checked)}
                        className="rounded bg-[var(--pm-body-bg)] border border-[var(--pm-border-color)] text-[#8b5cf6] focus:ring-0 focus:outline-none cursor-pointer"
                      />
                      {domain.replace('_', ' ')}
                    </label>
                    <p className="text-[0.65rem] text-[var(--pm-text-secondary)] mt-1">{tables.length} tables mapped</p>
                  </div>

                  <div className="border-t border-[var(--pm-border-color)] pt-3">
                    <button
                      type="button"
                      onClick={() => onToggleDomainExpanded(domain)}
                      className="text-[0.65rem] text-[#8b5cf6] font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span>{isExpanded ? '▼ Hide Tables' : '▶ Expand Tables'}</span>
                      <span className="text-[var(--pm-text-secondary)] font-normal">
                        ({selectedInDomain.length}/{tables.length})
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="mt-2.5 space-y-1.5 max-h-40 overflow-y-auto pm-scrollbar pr-1">
                        {tables.map((tbl) => (
                          <label key={tbl} className="flex items-center gap-2 text-[0.65rem] text-[var(--pm-text-secondary)] hover:text-[var(--pm-text-primary)] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedTables.includes(tbl)}
                              onChange={() => onTableToggle(tbl)}
                              className="rounded bg-[var(--pm-body-bg)] border border-[var(--pm-border-color)] text-[#8b5cf6] focus:ring-0 focus:outline-none cursor-pointer"
                            />
                            <span className="truncate">{tbl}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Card 2: Historical Backups Repository (Positioned after Pre-Flight Catalog Exporter) */}
      <div className="pm-panel-v2 space-y-4">
        <SectionHeader
          icon="📁"
          title="Historical Backups Repository"
          actionSlot={
            <button
              type="button"
              onClick={onClearBackupHistory}
              className="pm-btn pm-btn-danger text-xs px-3 py-1.5 rounded-lg transition uppercase tracking-wider cursor-pointer"
            >
              🗑️ Clear Backups
            </button>
          }
        />

        <div className="pm-table-container-v2 border border-pm-border bg-pm-card rounded-xl shadow-xl overflow-hidden">
          <table className="pm-table-v2 w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-pm-border bg-pm-input/20 text-[0.7rem] text-pm-text-secondary uppercase tracking-wider font-bold">
                <th className="px-6 py-3.5">Backup File Name</th>
                <th className="px-6 py-3.5">SQL Size</th>
                <th className="px-6 py-3.5">Log Size</th>
                <th className="px-6 py-3.5">Date Compiled</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pm-border text-xs text-pm-text-secondary">
              {backups.map((b) => {
                const isLocal = b.is_local !== false;
                const isCloud = b.is_cloud === true;
                const isPinned = b.is_pinned === true;

                return (
                  <tr key={b.basename} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-3.5 font-mono text-[11px]">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-pm-text select-all">{b.basename}</span>
                          <span
                            className="cursor-pointer opacity-60 hover:opacity-100 transition"
                            onClick={() => {
                              navigator.clipboard.writeText(b.basename);
                              showAlert('Copied', 'Filename copied!', 'success');
                            }}
                            title="Copy filename"
                          >
                            📋
                          </span>
                        </div>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {isCloud ? (
                            <StatusBadge variant="cloud" label="☁️ Cloud Only" />
                          ) : b.is_uploaded ? (
                            <StatusBadge variant="cloud" label="📁 Uploaded" />
                          ) : (
                            <StatusBadge variant="local" label="💾 Local" />
                          )}
                          {b.duration && (
                            <span className="text-[0.65rem] text-pm-text-secondary">
                              Completed in: {b.duration}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-[11px]">{formatSqlSize(b.sql_size)}</td>
                    <td className="px-6 py-3.5 font-mono text-[11px]">{formatLogSize(b.log_size)}</td>
                    <td className="px-6 py-3.5 font-mono text-[11px]">{formatDate(b.date)}</td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="inline-flex gap-1.5 items-center justify-end flex-wrap">
                        {b.sql_download_url && (
                          <a
                            href={resolveDownloadUrl(b.sql_download_url)}
                            className="pm-btn pm-btn-sm pm-btn-neutral text-[0.7rem] px-2.5 py-1 font-semibold"
                            title="Download SQL Dump"
                          >
                            <span>⬇️</span> SQL
                          </a>
                        )}
                        {b.log_filename && b.log_download_url && (
                          <a
                            href={resolveDownloadUrl(b.log_download_url)}
                            className="pm-btn pm-btn-sm pm-btn-neutral text-[0.7rem] px-2.5 py-1 font-semibold"
                            title="Download Telemetry Log"
                          >
                            <span>📄</span> Log
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => onCheckCompareDrift(b.basename)}
                          className="pm-btn pm-btn-sm pm-btn-neutral text-[0.7rem] px-2.5 py-1 font-semibold"
                        >
                          <span>🔍</span> Diff
                        </button>
                        {isLocal && (
                          <>
                            <button
                              type="button"
                              onClick={() => onDeleteBackup(b.basename)}
                              className="pm-btn pm-btn-sm pm-btn-danger-outline text-[0.7rem] px-2.5 py-1 font-semibold"
                            >
                              <span>🗑️</span> Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => onTogglePinBackup(b.basename)}
                              className="pm-btn pm-btn-sm pm-btn-neutral text-[0.7rem] px-2.5 py-1 font-semibold"
                            >
                              {isPinned ? '📌 Unpin' : '📌 Pin'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {backups.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-pm-text-secondary">
                    <div className="text-2xl mb-2">🗄️</div>
                    <div className="font-bold text-pm-text text-sm">No Database Backups Found</div>
                    <span className="text-xs">Historical database dumps repository is currently empty.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

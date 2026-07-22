// @Arch[UI_Components]
// @Description: Sub-tab component managing MySQL table dump creation, presets, and domain table filtering.

import React from 'react';

interface BackupSubTabProps {
  categorizedTables: Record<string, string[]>;
  selectedTables: string[];
  expandedDomains: Record<string, boolean>;
  backupPresets: string[];
  selectedPreset: string;
  isBackupRunning: boolean;
  backupProgressPercent: number;
  backupProgressText: string;
  onStartBackup: () => void;
  onCancelBackup: () => void;
  onLoadPreset: (presetName: string) => void;
  onSavePreset: () => void;
  onDeletePreset: () => void;
  onSelectAll: (checked: boolean) => void;
  onDomainSelect: (domain: string, checked: boolean) => void;
  onTableToggle: (tableName: string) => void;
  onToggleDomainExpanded: (domain: string) => void;
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
  onStartBackup,
  onCancelBackup,
  onLoadPreset,
  onSavePreset,
  onDeletePreset,
  onSelectAll,
  onDomainSelect,
  onTableToggle,
  onToggleDomainExpanded,
}) => {
  return (
    <div className="space-y-6">
      <div className="pm-panel-v2 space-y-4">
        <div className="pm-panel-header-v2 border-b-0 pb-0">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
            <h3 className="text-sm font-bold tracking-wide uppercase">Pre-Flight Database Catalog Exporter</h3>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onStartBackup}
              disabled={isBackupRunning}
              className="pm-btn bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg transition uppercase tracking-wider hover:-translate-y-[1px] active:translate-y-0 cursor-pointer"
            >
              📥 Generate Backup &amp; Log Archive
            </button>
          </div>
        </div>

        {isBackupRunning && (
          <div className="bg-[var(--pm-body-bg)] border border-[var(--pm-border-color)] rounded-xl p-4 space-y-3">
            <div className="flex justify-between text-xs text-[var(--pm-text-secondary)]">
              <span>{backupProgressText}</span>
              <span>{backupProgressPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-black/35 rounded-full overflow-hidden border border-[var(--pm-border-color)]">
              <div
                className="h-full bg-[#8b5cf6] transition-all duration-300"
                style={{ width: `${backupProgressPercent}%` }}
              ></div>
            </div>
            <button
              type="button"
              onClick={onCancelBackup}
              className="pm-btn pm-btn-danger text-[0.65rem] px-3 py-1 rounded-md transition uppercase font-bold cursor-pointer"
            >
              🛑 Stop Backup
            </button>
          </div>
        )}

        {/* Table Selection Customizer */}
        <div className="bg-[var(--pm-body-bg)] border border-[var(--pm-border-color)] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3 border-b border-[var(--pm-border-color)] pb-3 flex-wrap justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[var(--pm-text-secondary)] uppercase tracking-wider">Preset Loadout:</span>
              <select
                value={selectedPreset}
                onChange={(e) => onLoadPreset(e.target.value)}
                className="bg-[var(--pm-card-bg)] border border-[var(--pm-border-color)] text-xs text-[var(--pm-text-primary)] rounded-md px-2.5 py-1.5 focus:outline-none cursor-pointer shadow-sm hover:bg-[var(--pm-body-bg)] transition-all duration-200"
              >
                <option value="">-- None / Load Template --</option>
                {backupPresets.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onSavePreset}
                className="pm-btn pm-btn-success text-[0.65rem] font-bold px-3 py-1 rounded-md transition uppercase cursor-pointer"
              >
                Save Preset
              </button>
              {selectedPreset && (
                <button
                  type="button"
                  onClick={onDeletePreset}
                  className="pm-btn pm-btn-danger text-[0.65rem] font-bold px-3 py-1 rounded-md transition uppercase cursor-pointer"
                >
                  Delete
                </button>
              )}
            </div>

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
    </div>
  );
};

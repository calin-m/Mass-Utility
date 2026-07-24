// @Arch[UI_Components]
// @Description: Sub-tab component managing MySQL database point-in-time restore, file upload staging, and restoration HUD logs.

import React, { useState, useMemo } from 'react';
import { LogTerminal } from '../common/LogTerminal';
import { SearchFilterBar } from '../common/SearchFilterBar';
import { SectionHeader } from '../common/SectionHeader';
import { StatusBadge } from '../common/StatusBadge';

export interface BackupFile {
  basename: string;
  sql_filename: string;
  log_filename?: string;
  sql_size: number;
  log_size: number;
  date: number;
  duration?: string;
  is_uploaded?: boolean;
  is_local?: boolean;
  is_cloud?: boolean;
  is_pinned?: boolean;
  sql_download_url?: string;
  log_download_url?: string;
}

interface RestoreSubTabProps {
  backups: BackupFile[];
  showShopLiveAlert: boolean;
  selectedUploadFile: File | null;
  isUploading: boolean;
  uploadPercent: number;
  isRestoreRunning: boolean;
  restoreProgressPercent: number;
  restoreProgressText: string;
  restoreStatsExecuted: string;
  restoreStatsAction: string;
  restoreStatsShop: string;
  restoreLogTerminal: string;
  fileInputRef: React.RefObject<HTMLInputElement | null> | any;
  onTakeStoreLive: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onFileDrop: (e: React.DragEvent) => void;
  onBrowseFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCancelUpload: () => void;
  onUploadStageFile: () => void;
  onStartRestore: (filename: string) => void;
  onDeleteBackup: (filename: string) => void;
  formatSqlSize: (bytes: number) => string;
  formatDate: (ts: number) => string;
  showAlert?: (title: string, message: string, type?: 'success' | 'danger' | 'warning' | 'info') => void;
}

export const RestoreSubTab: React.FC<RestoreSubTabProps> = ({
  backups,
  showShopLiveAlert,
  selectedUploadFile,
  isUploading,
  uploadPercent,
  isRestoreRunning,
  restoreProgressPercent,
  restoreProgressText,
  restoreStatsExecuted,
  restoreStatsAction,
  restoreStatsShop,
  restoreLogTerminal,
  fileInputRef,
  onTakeStoreLive,
  onDragOver,
  onFileDrop,
  onBrowseFile,
  onCancelUpload,
  onUploadStageFile,
  onStartRestore,
  onDeleteBackup,
  formatSqlSize,
  formatDate,
  showAlert,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<'basename' | 'sql_size' | 'date'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: 'basename' | 'sql_size' | 'date') => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filteredAndSortedBackups = useMemo(() => {
    return backups
      .filter(b => b.basename.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        let res = 0;
        if (sortKey === 'basename') {
          res = a.basename.localeCompare(b.basename);
        } else if (sortKey === 'sql_size') {
          res = (a.sql_size || 0) - (b.sql_size || 0);
        } else {
          res = (a.date || 0) - (b.date || 0);
        }
        return sortDir === 'asc' ? res : -res;
      });
  }, [backups, searchTerm, sortKey, sortDir]);

  return (
    <div className="space-y-6">
      <div className="bg-[var(--pm-card-bg)] border border-[var(--pm-border-color)] rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3 border-b border-[var(--pm-border-color)] pb-3">
          <span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span>
          <h3 className="text-sm font-bold tracking-wide text-[var(--pm-text-primary)] uppercase">Database Restore &amp; Import Manager</h3>
        </div>
        <p className="text-xs text-[var(--pm-text-secondary)] leading-relaxed">
          Restore tables in chunked loops to completely bypass php execution limits. The store will automatically be switched to Maintenance Mode during restore execution.
        </p>
      </div>

      {showShopLiveAlert && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-5 flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <h4 className="text-xs font-bold text-[var(--pm-text-primary)] uppercase">Store kept in Maintenance Mode</h4>
              <p className="text-xs text-[var(--pm-text-secondary)] mt-1">Review the restored catalog details first before setting the shop live.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onTakeStoreLive}
            className="pm-btn pm-btn-success text-xs font-bold px-4 py-2 rounded-lg transition uppercase hover:-translate-y-[1px] active:translate-y-0"
          >
            ⚡ Take Store Live Now
          </button>
        </div>
      )}

      {/* Drag Drop File Zone */}
      <div className="bg-[var(--pm-card-bg)] border border-[var(--pm-border-color)] rounded-xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold tracking-wide text-[var(--pm-text-primary)] uppercase">📤 Upload External SQL File</h3>

        <div
          onDragOver={onDragOver}
          onDrop={onFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[var(--pm-border-color)] hover:border-pm-primary/40 rounded-xl p-8 text-center cursor-pointer transition bg-[var(--pm-body-bg)]/30 space-y-3"
        >
          <div className="text-3xl">📁</div>
          <p className="text-xs text-[var(--pm-text-secondary)]">
            {selectedUploadFile ? `Selected: ${selectedUploadFile.name}` : 'Click or drag external SQL/GZ file here...'}
          </p>
          <input
            type="file"
            ref={fileInputRef as any}
            accept=".sql,.gz"
            onChange={onBrowseFile}
            className="hidden"
          />
        </div>

        {selectedUploadFile && (
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancelUpload}
              className="pm-btn pm-btn-neutral px-4 py-2 rounded-lg text-xs font-bold transition uppercase hover:-translate-y-[1px] active:translate-y-0"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onUploadStageFile}
              disabled={isUploading}
              className="pm-btn bg-pm-primary hover:bg-pm-primary-dark text-white px-4 py-2 rounded-lg text-xs font-bold transition uppercase hover:-translate-y-[1px] active:translate-y-0 cursor-pointer"
            >
              {isUploading ? `Uploading (${uploadPercent}%)` : 'Stage Upload'}
            </button>
          </div>
        )}

        {isUploading && (
          <div className="w-full h-1.5 bg-black/35 rounded-full overflow-hidden border border-[var(--pm-border-color)]">
            <div
              className="h-full bg-pm-primary transition-all duration-300"
              style={{ width: `${uploadPercent}%` }}
            ></div>
          </div>
        )}
      </div>

      {/* Select Local Backups list */}
      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-xl space-y-4">
        <SectionHeader
          icon="📤"
          title="Select Backup to Restore"
        />

        {backups.length > 0 && (
          <SearchFilterBar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            placeholder="Search restore backups by file name..."
          />
        )}

        <div className="border border-pm-border rounded-xl overflow-hidden bg-pm-input/30 max-h-[500px] overflow-y-auto relative">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-[var(--pm-card-bg)]/95 backdrop-blur z-10 shadow-sm">
              <tr className="border-b border-pm-border text-pm-text-secondary font-bold uppercase tracking-wider text-[0.7rem]">
                <th
                  onClick={() => handleSort('basename')}
                  className="px-6 py-3.5 cursor-pointer select-none hover:text-pm-primary transition-colors"
                >
                  Backup File {sortKey === 'basename' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th
                  onClick={() => handleSort('sql_size')}
                  className="px-6 py-3.5 cursor-pointer select-none hover:text-pm-primary transition-colors"
                >
                  SQL Size {sortKey === 'sql_size' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th className="px-6 py-3.5">
                  Log Size
                </th>
                <th
                  onClick={() => handleSort('date')}
                  className="px-6 py-3.5 cursor-pointer select-none hover:text-pm-primary transition-colors"
                >
                  Timestamp {sortKey === 'date' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            {filteredAndSortedBackups.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-pm-text-secondary">
                    <div className="text-2xl animate-pulse mb-2">⏳</div>
                    <strong className="text-sm text-pm-text-secondary block mb-1">No Matching Backups Found</strong>
                    <span>Try adjusting your search filter or upload a new SQL archive.</span>
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody className="divide-y divide-pm-border text-xs text-pm-text-secondary">
                {filteredAndSortedBackups.map((b) => {
                  const isLocal = b.is_local !== false;
                  const isCloud = b.is_cloud === true;

                  return (
                    <tr
                      key={b.basename}
                      className="even:bg-[var(--pm-body-bg)]/40 hover:bg-[var(--pm-input-bg)]/40 transition-colors"
                    >
                      <td className="px-6 py-3.5 font-mono text-[11px]">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-pm-text select-all">{b.basename}</span>
                            <span
                              className="cursor-pointer opacity-60 hover:opacity-100 transition"
                              onClick={() => {
                                navigator.clipboard.writeText(b.basename);
                                if (showAlert) {
                                  showAlert('Copied', 'Filename copied!', 'success');
                                }
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
                      <td className="px-6 py-3.5 font-mono text-[11px]">
                        {b.log_size ? formatSqlSize(b.log_size) : '-'}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-[11px]">{formatDate(b.date)}</td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="inline-flex gap-1.5 items-center justify-end flex-wrap">
                          <button
                            type="button"
                            onClick={() => onStartRestore(b.basename)}
                            className="pm-btn pm-btn-sm pm-btn-neutral text-[0.7rem] px-2.5 py-1 font-semibold"
                          >
                            <span>{isLocal ? '⚡' : '☁️'}</span> Restore
                          </button>
                          {isLocal && (
                            <button
                              type="button"
                              onClick={() => onDeleteBackup(b.basename)}
                              className="pm-btn pm-btn-sm pm-btn-danger-outline text-[0.7rem] px-2.5 py-1 font-semibold"
                            >
                              <span>🗑️</span> Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            )}
          </table>
        </div>
      </div>

      {/* Restoration HUD */}
      {isRestoreRunning && (
        <div className="bg-[var(--pm-card-bg)] border border-rose-500/20 rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-[var(--pm-border-color)] pb-3">
            <h3 className="text-sm font-bold tracking-wide text-rose-500 uppercase">Database Restore Active</h3>
            <span className="bg-rose-500/10 text-rose-500 text-[0.65rem] font-bold px-2 py-0.5 rounded uppercase">
              Running
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-[var(--pm-text-secondary)]">
              <span>{restoreProgressText}</span>
              <span>{restoreProgressPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-[var(--pm-body-bg)]/80 rounded-full overflow-hidden border border-[var(--pm-border-color)]">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-300"
                style={{ width: `${restoreProgressPercent}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold">
            <div className="p-3 bg-[var(--pm-body-bg)]/50 border border-[var(--pm-border-color)] rounded-lg">
              <span className="text-[var(--pm-text-secondary)] block mb-1">Statements Executed</span>
              <span className="text-[var(--pm-text-primary)] font-mono">{restoreStatsExecuted}</span>
            </div>
            <div className="p-3 bg-[var(--pm-body-bg)]/50 border border-[var(--pm-border-color)] rounded-lg">
              <span className="text-[var(--pm-text-secondary)] block mb-1">Current Action</span>
              <span className="text-rose-500 uppercase">{restoreStatsAction}</span>
            </div>
            <div className="p-3 bg-[var(--pm-body-bg)]/50 border border-[var(--pm-border-color)] rounded-lg">
              <span className="text-[var(--pm-text-secondary)] block mb-1">Shop State</span>
              <span className="text-amber-500 uppercase">{restoreStatsShop}</span>
            </div>
          </div>

          <LogTerminal
            logs={restoreLogTerminal}
            title="Execution Logs"
            maxHeight="150px"
          />
        </div>
      )}
    </div>
  );
};

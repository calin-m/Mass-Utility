// @Arch[UI_Components]
// @Description: Sub-tab component managing MySQL database point-in-time restore, file upload staging, and restoration HUD logs.

import React from 'react';
import { LogTerminal } from '../common/LogTerminal';

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
}) => {
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
          className="border-2 border-dashed border-[var(--pm-border-color)] hover:border-[#8b5cf6]/40 rounded-xl p-8 text-center cursor-pointer transition bg-[var(--pm-body-bg)]/30 space-y-3"
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
              className="pm-btn bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-4 py-2 rounded-lg text-xs font-bold transition uppercase hover:-translate-y-[1px] active:translate-y-0 cursor-pointer"
            >
              {isUploading ? `Uploading (${uploadPercent}%)` : 'Stage Upload'}
            </button>
          </div>
        )}

        {isUploading && (
          <div className="w-full h-1.5 bg-black/35 rounded-full overflow-hidden border border-[var(--pm-border-color)]">
            <div
              className="h-full bg-[#8b5cf6] transition-all duration-300"
              style={{ width: `${uploadPercent}%` }}
            ></div>
          </div>
        )}
      </div>

      {/* Select Local Backups list */}
      <div className="pm-panel-v2 space-y-4">
        <div className="pm-panel-header-v2 border-b-0 pb-0">
          <h3 className="text-sm font-bold tracking-wide uppercase">Select Backup to Restore</h3>
        </div>
        <div className="pm-table-container-v2">
          <table className="pm-table-v2">
            <thead>
              <tr>
                <th className="p-4">Backup File</th>
                <th className="p-4">Size</th>
                <th className="p-4">Timestamp</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => {
                const isLocal = b.is_local !== false;

                return (
                  <tr key={b.basename}>
                    <td className="p-4 font-mono font-semibold">{b.basename}</td>
                    <td className="p-4 font-mono">{formatSqlSize(b.sql_size)}</td>
                    <td className="p-4">{formatDate(b.date)}</td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => onStartRestore(b.basename)}
                        className={`pm-btn pm-btn-sm ${isLocal ? 'pm-btn-danger' : 'bg-[#8b5cf6] text-white hover:bg-[#7c3aed]'} text-[0.7rem] px-2.5 py-1 rounded-md`}
                      >
                        <span>{isLocal ? '⚡' : '☁️'}</span> Restore
                      </button>
                      {isLocal && (
                        <button
                          type="button"
                          onClick={() => onDeleteBackup(b.basename)}
                          className="pm-btn pm-btn-sm pm-btn-danger text-[0.7rem] px-2.5 py-1 rounded-md"
                        >
                          <span>🗑️</span> Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
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

// @Arch[BackupsGrid]
// @Description: Renders the table grid list of historical file backups, facilitating archive downloads, cryptographic verification, pin/unpin toggles, and purges.

import React, { useState, useMemo } from 'react';
import { FetchService } from '../../utils/FetchService';
import { useModal } from '../../utils/overlay';
import { StatusBadge } from '../common/StatusBadge';
import { SearchFilterBar } from '../common/SearchFilterBar';

export interface BackupEntry {
  basename: string;
  size: string;
  timestamp: number;
  is_local: boolean;
  is_cloud: boolean;
  is_uploaded: boolean;
  is_pinned?: boolean;
  duration?: string;
  hash?: string;
  archive_download_url?: string;
  log_download_url?: string;
  has_log?: boolean;
}

interface BackupsGridProps {
  backups: BackupEntry[];
  onRefresh: (backups: BackupEntry[]) => void;
  onClearAll: () => void;
}

const resolveDownloadUrl = (url?: string): string => {
  if (!url || url.startsWith('#')) return '#';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  
  const isV2Path = window.location.pathname.includes('/v2/') || window.location.pathname.endsWith('/v2');
  const prefix = isV2Path ? '../' : './';
  
  if (url.startsWith('api/v1/') || url.startsWith('index.php') || url.startsWith('api.php')) {
    return prefix + url;
  }
  return isV2Path && !url.startsWith('/') && !url.startsWith('../') ? prefix + url : url;
};

export const BackupsGrid: React.FC<BackupsGridProps> = ({
  backups,
  onRefresh,
  onClearAll,
}) => {
  const { showAlert, showConfirm, showToast } = useModal();
  const [verifyingFile, setVerifyingFile] = useState<string | null>(null);
  const [pinningFile, setPinningFile] = useState<string | null>(null);
  const [restoringFile, setRestoringFile] = useState<string | null>(null);
  const [pushingCloudFile, setPushingCloudFile] = useState<string | null>(null);

  // Data Grid Controls: Search & Column Sort State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<'basename' | 'size' | 'timestamp'>('timestamp');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: 'basename' | 'size' | 'timestamp') => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const parseSizeToBytes = (sizeStr?: string): number => {
    if (!sizeStr) return 0;
    const match = sizeStr.trim().match(/^([0-9.]+)\s*([a-zA-Z]+)?$/);
    if (!match) return 0;
    const num = parseFloat(match[1]);
    const unit = (match[2] || '').toUpperCase();
    if (unit.startsWith('G')) return num * 1024 * 1024 * 1024;
    if (unit.startsWith('M')) return num * 1024 * 1024;
    if (unit.startsWith('K')) return num * 1024;
    return num;
  };

  const filteredAndSortedBackups = useMemo(() => {
    return backups
      .filter(b => b.basename.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        // Pinned backups always sort to top
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;

        let res = 0;
        if (sortKey === 'basename') {
          res = a.basename.localeCompare(b.basename);
        } else if (sortKey === 'size') {
          res = parseSizeToBytes(a.size) - parseSizeToBytes(b.size);
        } else {
          res = a.timestamp - b.timestamp;
        }
        return sortDir === 'asc' ? res : -res;
      });
  }, [backups, searchTerm, sortKey, sortDir]);

  const handleCloudPush = async (name: string) => {
    showConfirm('Push to Google Drive', `Upload local backup <strong>${name}</strong> to Google Drive offsite storage?`, null, async () => {
      setPushingCloudFile(name);
      try {
        const data = await FetchService.post('upload_gdrive', { file: name });
        if (data.success) {
          showToast('Backup archive pushed to Google Drive offsite storage.', 'success');
          onRefresh(data.backups || []);
        } else {
          showAlert('Upload Failed', data.error || 'Failed to upload backup to cloud.', 'error');
        }
      } catch (err: any) {
        showAlert('Cloud Upload Error', err.message || 'Could not upload backup archive.', 'error');
      } finally {
        setPushingCloudFile(null);
      }
    }, 'primary');
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard: ' + text, 'success');
  };

  const handleVerify = async (name: string) => {
    setVerifyingFile(name);
    try {
      const data = await FetchService.post('verify_backup_integrity', { file: name });
      showAlert('Integrity Check Passed', data.message || 'Cryptographic Integrity Verified Successfully!', 'success');
    } catch (err: any) {
      showAlert('Integrity Check Failed', err.message || 'Verification failed.', 'error');
    } finally {
      setVerifyingFile(null);
    }
  };

  const handleDelete = async (name: string) => {
    showConfirm('Delete Backup', `Are you sure you want to permanently delete the backup archive <strong>${name}</strong>?`, null, async () => {
      try {
        const data = await FetchService.post('delete_file_backup', { file: name });
        onRefresh(data.backups || []);
        showToast('Backup archive deleted successfully!', 'success');
      } catch (err: any) {
        showAlert('Delete Failed', err.message || 'Could not delete backup.', 'error');
      }
    }, 'warning');
  };

  const handleTogglePin = async (name: string) => {
    setPinningFile(name);
    try {
      const data = await FetchService.post('toggle_pin_file_backup', { file: name });
      if (data.success) {
        onRefresh(data.backups || []);
      } else {
        showAlert('Failed to Pin', data.error || 'Failed to toggle pin state.', 'error');
      }
    } catch (err: any) {
      showAlert('Pin Failed', err.message || 'Error toggling pin.', 'error');
    } finally {
      setPinningFile(null);
    }
  };

  const handleCloudRestore = async (name: string) => {
    showConfirm('Restore Cloud Backup', `Restore local copy of <strong>${name}</strong> from Google Drive storage?`, null, async () => {
      setRestoringFile(name);
      try {
        const data = await FetchService.post('cloud_restore', { file: name, type: 'file' });
        if (data.success) {
          showAlert('Restore Complete', 'Cloud backup successfully restored back to host filesystem.', 'success');
          onRefresh(data.backups || []);
        }
      } catch (err: any) {
        showAlert('Cloud Restore Failed', err.message || 'Could not restore cloud backup.', 'error');
      } finally {
        setRestoringFile(null);
      }
    }, 'warning');
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp * 1000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}:${s}`;
  };

  return (
    <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-xl space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 bg-pm-primary rounded-full shadow-lg shadow-pm-primary/50"></span>
          <h3 className="text-md font-bold tracking-wide text-pm-text uppercase">Historical Backups Repository</h3>
        </div>
        {backups.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="pm-btn pm-btn-sm pm-btn-danger-outline uppercase"
          >
            🗑️ Clear Backups
          </button>
        )}
      </div>

      {/* Option 1 Data Grid: Search Filter Bar */}
      {backups.length > 0 && (
        <SearchFilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          placeholder="Search backups by archive filename..."
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
                Archive Name {sortKey === 'basename' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
              </th>
              <th
                onClick={() => handleSort('size')}
                className="px-6 py-3.5 cursor-pointer select-none hover:text-pm-primary transition-colors"
              >
                Archive Size {sortKey === 'size' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
              </th>
              <th
                onClick={() => handleSort('timestamp')}
                className="px-6 py-3.5 cursor-pointer select-none hover:text-pm-primary transition-colors"
              >
                Timestamp Created {sortKey === 'timestamp' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
              </th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          {filteredAndSortedBackups.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-pm-text-secondary">
                  <div className="text-2xl animate-pulse mb-2">⏳</div>
                  <strong className="text-sm text-pm-text-secondary block mb-1">No Matching Backups Found</strong>
                  <span>Try adjusting your search criteria or create a new backup archive.</span>
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody className="divide-y divide-pm-border text-xs text-pm-text-secondary">
              {filteredAndSortedBackups.map((b, idx) => {
                const isCloudOnly = !b.is_local && b.is_cloud;
                const isUploaded = b.is_uploaded;

                let rowBorderClass = '';
                let badge = <StatusBadge variant="local" label="Local" />;

                if (isCloudOnly) {
                  rowBorderClass = 'border-l-4 border-l-pm-primary bg-pm-primary/[0.02]';
                  badge = <StatusBadge variant="cloud" label="Cloud Only" />;
                } else if (isUploaded) {
                  rowBorderClass = 'border-l-4 border-l-pm-primary bg-pm-primary/[0.02]';
                  badge = <StatusBadge variant="cloud" label="Uploaded" />;
                }

                return (
                  <tr key={idx} className={`even:bg-[var(--pm-body-bg)]/40 hover:bg-[var(--pm-input-bg)]/40 transition-colors ${rowBorderClass}`}>
                    <td className="px-6 py-3.5 space-y-1 font-mono text-[11px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-pm-text select-all">{b.basename}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(b.basename)}
                          className="opacity-50 hover:opacity-100 transition text-[0.95rem] focus:outline-none"
                          title="Copy to clipboard"
                        >
                          📋
                        </button>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {badge}
                        {b.duration && (
                          <span className="text-[0.65rem] text-pm-text-secondary">
                            Completed In: <strong className="text-pm-text-secondary">{b.duration}</strong>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-[11px]">
                      <span className="text-xs font-semibold text-purple-700 dark:text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded">
                        {b.size}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-pm-text-secondary font-mono text-[11px]">{formatDate(b.timestamp)}</td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="inline-flex gap-1.5 flex-wrap justify-end">
                        {b.hash && (
                          <button
                            type="button"
                            disabled={verifyingFile === b.basename}
                            onClick={() => handleVerify(b.basename)}
                            className="pm-btn pm-btn-sm pm-btn-neutral text-[0.7rem] px-2.5 py-1"
                          >
                            {verifyingFile === b.basename ? 'Verifying...' : '🛡️ Verify'}
                          </button>
                        )}
                        
                        {b.archive_download_url && (
                          <a
                            href={resolveDownloadUrl(b.archive_download_url)}
                            className="pm-btn pm-btn-sm pm-btn-neutral text-[0.7rem] px-2.5 py-1 inline-flex items-center"
                          >
                            ⬇️ Download
                          </a>
                        )}

                        {b.has_log && b.log_download_url && (
                          <a
                            href={resolveDownloadUrl(b.log_download_url)}
                            className="pm-btn pm-btn-sm pm-btn-neutral text-[0.7rem] px-2.5 py-1 inline-flex items-center"
                          >
                            📄 Log
                          </a>
                        )}

                        {b.is_local ? (
                          <>
                            {!b.is_uploaded && (
                              <button
                                type="button"
                                disabled={pushingCloudFile === b.basename}
                                onClick={() => handleCloudPush(b.basename)}
                                className="pm-btn pm-btn-sm pm-btn-primary text-[0.7rem] px-2.5 py-1"
                              >
                                {pushingCloudFile === b.basename ? 'Uploading...' : '☁️ Push to Cloud'}
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={pinningFile === b.basename}
                              onClick={() => handleTogglePin(b.basename)}
                              className="pm-btn pm-btn-sm pm-btn-neutral text-[0.7rem] px-2.5 py-1"
                            >
                              {pinningFile === b.basename ? '⏳' : b.is_pinned ? '📌 Unpin' : '📌 Pin'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(b.basename)}
                              className="pm-btn pm-btn-sm pm-btn-danger-outline text-[0.7rem] px-2.5 py-1"
                            >
                              🗑️ Delete
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={restoringFile === b.basename}
                            onClick={() => handleCloudRestore(b.basename)}
                            className="pm-btn pm-btn-sm pm-btn-primary text-[0.7rem] px-2.5 py-1"
                          >
                            {restoringFile === b.basename ? 'Downloading...' : '☁️ Pull & Restore'}
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
  );
};

// @Arch[BackupsGrid]
// @Description: Renders the table grid list of historical file backups, facilitating archive downloads, cryptographic verification, pin/unpin toggles, and purges.

import React, { useState } from 'react';
import { FetchService } from '../utils/FetchService';
import { useModal } from '../utils/overlay';

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

export const BackupsGrid: React.FC<BackupsGridProps> = ({
  backups,
  onRefresh,
  onClearAll,
}) => {
  const { showAlert, showConfirm } = useModal();
  const [verifyingFile, setVerifyingFile] = useState<string | null>(null);
  const [pinningFile, setPinningFile] = useState<string | null>(null);
  const [restoringFile, setRestoringFile] = useState<string | null>(null);
  const [pushingCloudFile, setPushingCloudFile] = useState<string | null>(null);

  const handleCloudPush = async (name: string) => {
    showConfirm('Push to Google Drive', `Upload local backup <strong>${name}</strong> to Google Drive offsite storage?`, 'UPLOAD', async () => {
      setPushingCloudFile(name);
      try {
        const data = await FetchService.post('upload_gdrive', { file: name });
        if (data.success) {
          showAlert('Cloud Upload Success', 'Backup archive successfully pushed to Google Drive offsite storage.', 'success');
          onRefresh(data.backups || []);
        } else {
          showAlert('Upload Failed', data.error || 'Failed to upload backup to cloud.', 'error');
        }
      } catch (err: any) {
        showAlert('Cloud Upload Error', err.message || 'Could not upload backup archive.', 'error');
      } finally {
        setPushingCloudFile(null);
      }
    });
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    showAlert('Copied', 'Copied to clipboard: ' + text, 'success');
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
    showConfirm('Delete Backup', `Are you sure you want to permanently delete the backup archive <strong>${name}</strong>?`, 'DELETE', async () => {
      try {
        const data = await FetchService.post('delete_file_backup', { file: name });
        onRefresh(data.backups || []);
        showAlert('Backup Deleted', 'The backup file has been deleted from host filesystem.', 'info');
      } catch (err: any) {
        showAlert('Delete Failed', err.message || 'Could not delete backup.', 'error');
      }
    });
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
    showConfirm('Restore Cloud Backup', `Restore local copy of <strong>${name}</strong> from Google Drive storage?`, 'RESTORE', async () => {
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
    });
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
          <span className="w-3 h-3 bg-[#8b5cf6] rounded-full shadow-lg shadow-[#8b5cf6]/50"></span>
          <h3 className="text-md font-bold tracking-wide text-pm-text uppercase">Historical Backups Repository</h3>
        </div>
        {backups.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="bg-[#ef4444]/10 hover:bg-[#ef4444]/20 border border-[#ef4444]/20 text-[#ef4444] text-xs font-bold px-4 py-2 rounded-lg transition-all uppercase"
          >
            🗑️ Clear Backups
          </button>
        )}
      </div>

      <div className="border border-pm-border rounded-xl overflow-hidden bg-black/10 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-pm-border bg-white/[0.02] text-pm-text-secondary font-bold uppercase tracking-wider text-[0.7rem]">
              <th className="px-5 py-4">Archive Name</th>
              <th className="px-5 py-4">Archive Size</th>
              <th className="px-5 py-4">Timestamp Created</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          {backups.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-gray-500">
                  <div className="text-2xl animate-pulse mb-2">⏳</div>
                  <strong className="text-sm text-pm-text-secondary block mb-1">No File Backups Found</strong>
                  <span>Historical file system backups repository is currently empty.</span>
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody className="divide-y divide-pm-border">
              {backups.map((b, idx) => {
                const isCloudOnly = !b.is_local && b.is_cloud;
                const isUploaded = b.is_uploaded;

                let rowBorderClass = '';
                let badge = (
                  <span className="text-[0.65rem] font-bold text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 rounded border border-[#10b981]/20">
                    💾 Local
                  </span>
                );

                if (isCloudOnly) {
                  rowBorderClass = 'border-l-4 border-l-[#a855f7] bg-[#a855f7]/[0.01]';
                  badge = (
                    <span className="text-[0.65rem] font-bold text-[#c084fc] bg-[#a855f7]/10 px-2 py-0.5 rounded border border-[#a855f7]/20">
                      ☁️ Cloud Only
                    </span>
                  );
                } else if (isUploaded) {
                  rowBorderClass = 'border-l-4 border-l-[#a855f7] bg-[#a855f7]/[0.01]';
                  badge = (
                    <span className="text-[0.65rem] font-bold text-[#c084fc] bg-[#a855f7]/10 px-2 py-0.5 rounded border border-[#a855f7]/20">
                      📁 Uploaded
                    </span>
                  );
                }

                return (
                  <tr key={idx} className={`hover:bg-white/[0.01] transition ${rowBorderClass}`}>
                    <td className="px-5 py-4 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-gray-200 select-all">{b.basename}</span>
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
                          <span className="text-[0.65rem] text-gray-500">
                            Completed In: <strong className="text-pm-text-secondary">{b.duration}</strong>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-semibold text-[#8b5cf6] bg-[#8b5cf6]/10 px-2.5 py-1 rounded">
                        {b.size}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-pm-text-secondary font-mono">{formatDate(b.timestamp)}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex gap-2 flex-wrap justify-end">
                        {b.hash && (
                          <button
                            type="button"
                            disabled={verifyingFile === b.basename}
                            onClick={() => handleVerify(b.basename)}
                            className="bg-[#10b981]/15 hover:bg-[#10b981]/25 text-[#10b981] border border-[#10b981]/25 px-2.5 py-1.5 rounded-lg transition"
                          >
                            {verifyingFile === b.basename ? 'Verifying...' : '🛡️ Verify'}
                          </button>
                        )}
                        
                        {b.archive_download_url && (
                          <a
                            href={b.archive_download_url}
                            className="bg-pm-input hover:bg-[#202030] text-pm-text-secondary border border-pm-border px-2.5 py-1.5 rounded-lg transition inline-flex items-center"
                          >
                            ⬇️ Download
                          </a>
                        )}

                        {b.has_log && b.log_download_url && (
                          <a
                            href={b.log_download_url}
                            className="bg-pm-input hover:bg-[#202030] text-pm-text-secondary border border-pm-border px-2.5 py-1.5 rounded-lg transition inline-flex items-center"
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
                                className="bg-[#8b5cf6]/15 hover:bg-[#8b5cf6]/25 text-[#c084fc] border border-[#8b5cf6]/25 px-2.5 py-1.5 rounded-lg transition"
                              >
                                {pushingCloudFile === b.basename ? 'Uploading...' : '☁️ Push to Cloud'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDelete(b.basename)}
                              className="bg-[#ef4444]/15 hover:bg-[#ef4444]/25 text-[#ef4444] border border-[#ef4444]/25 px-2.5 py-1.5 rounded-lg transition"
                            >
                              🗑️ Delete
                            </button>
                            <button
                              type="button"
                              disabled={pinningFile === b.basename}
                              onClick={() => handleTogglePin(b.basename)}
                              className={`px-2.5 py-1.5 rounded-lg border transition ${
                                b.is_pinned
                                  ? 'bg-[#10b981]/15 hover:bg-[#10b981]/25 text-[#10b981] border-[#10b981]/25'
                                  : 'bg-pm-input hover:bg-[#202030] text-pm-text-secondary border-pm-border'
                              }`}
                            >
                              {pinningFile === b.basename ? '⏳' : b.is_pinned ? '📌 Unpin' : '📌 Pin'}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={restoringFile === b.basename}
                            onClick={() => handleCloudRestore(b.basename)}
                            className="bg-[#8b5cf6]/15 hover:bg-[#8b5cf6]/25 text-[#c084fc] border border-[#8b5cf6]/25 px-2.5 py-1.5 rounded-lg transition"
                          >
                            {restoringFile === b.basename ? 'Restoring...' : '☁️ Restore'}
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

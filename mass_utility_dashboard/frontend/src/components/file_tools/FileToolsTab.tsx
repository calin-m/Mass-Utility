// @Arch[FileToolsTab]
// @Description: Main controller component for File Backups tab that manages folder structures, initializes SSE/AJAX polling threads, and handles backup archives.
// @Calls: start_file_backup, cancel_job, poll_job_progress, clear_file_backups, get_directory_tree, save_exclusions

import React, { useState, useEffect, useRef } from 'react';
import { SectionHeader } from '../common/SectionHeader';
import { FolderSelector, FolderEntry } from './FolderSelector';
import { BackupProgress } from '../governor/BackupProgress';
import { BackupsGrid, BackupEntry } from './BackupsGrid';
import { FetchService } from '../../utils/FetchService';
import { useModal } from '../../utils/overlay';

export const FileToolsTab: React.FC = () => {
  const { showAlert, showConfirm, showToast } = useModal();
  const [profile, setProfile] = useState<string>('custom');
  const [folders, setFolders] = useState<FolderEntry[]>([]);
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Progress tracker states
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [isCancelling, setIsCancelling] = useState(false);

  const sseRef = useRef<EventSource | null>(null);
  const pollTimerRef = useRef<any>(null);

  // Initialize backups from window config injection and fetch latest via API
  useEffect(() => {
    const configBackups = (window as any).PM_CONFIG?.fileBackups || [];
    if (configBackups.length > 0) {
      setBackups(configBackups);
    }
    loadBackups();
    loadDirectoryTree();

    return () => {
      cleanupJobMonitoring();
    };
  }, []);

  const loadBackups = async () => {
    try {
      const data = await FetchService.post('get_file_backups');
      if (data && data.backups) {
        setBackups(data.backups);
      }
    } catch (err: any) {
      console.error('Failed to load file backups:', err);
    }
  };

  const loadDirectoryTree = async () => {
    setIsLoadingTree(true);
    try {
      const data = await FetchService.post('get_directory_tree');
      if (data.success && data.directories) {
        setFolders(data.directories);
      }
    } catch (err: any) {
      console.error('Failed to load directory tree:', err);
    } finally {
      setIsLoadingTree(false);
    }
  };

  const handleToggleFolder = async (path: string, checked: boolean) => {
    // Optimistic state update
    const updatedFolders = folders.map(f => {
      if (f.path === path) {
        return { ...f, is_excluded: !checked };
      }
      return f;
    });
    setFolders(updatedFolders);

    // Save selection
    const uncheckedPaths = updatedFolders
      .filter(f => f.is_excluded)
      .map(f => f.path);

    try {
      const data = await FetchService.post('save_exclusions', {
        exclusions: JSON.stringify(uncheckedPaths),
      });
      if (!data.success) {
        showAlert('Exclusion Error', data.error || 'Failed to save directory exclusions.', 'error');
      }
    } catch (err: any) {
      showAlert('Exclusion Network Error', 'Network error saving exclusions: ' + err.message, 'error');
    }
  };

  const handleStartBackup = async () => {
    const confirmMsg = `You are about to initiate a file system archive sequence targeting the selected files and directories.<br><br>If the chosen profile contains many files, this can temporarily spike CPU utilization and IOPS on your server.`;
    
    showConfirm('Initiate Files Backup', confirmMsg, null, async () => {
      setIsGenerating(true);
      setIsCancelling(false);
      setProgressPercent(0);
      setProgressText('Initializing Engine...');
      
      try {
        const data = await FetchService.post('start_file_backup', { profile });
        if (data.success && data.job_id) {
          setActiveJobId(data.job_id);
          setProgressText('Compiling archive in memory-safe chunks...');
          startJobMonitoring(data.job_id);
        } else {
          showAlert('Backup Setup Failed', data.error || 'Backup initialization failed.', 'error');
          setIsGenerating(false);
        }
      } catch (err: any) {
        showAlert('Backup Setup Failed', 'Error initializing backup job: ' + err.message, 'error');
        setIsGenerating(false);
      }
    }, 'primary');
  };

  const handleCancelBackup = async () => {
    if (!activeJobId) return;
    setIsCancelling(true);
    setProgressText('Cancelling backup job...');
    try {
      await FetchService.post('cancel_job', { job_id: activeJobId });
    } catch (err: any) {
      showAlert('Cancellation Failed', 'Cancellation request failed: ' + err.message, 'error');
      setIsCancelling(false);
    }
  };

  const handleClearAllBackups = async () => {
    showConfirm('Clear All Backups', 'Are you sure you want to permanently delete all generated ZIP/TAR archives? This cannot be undone.', null, async () => {
      try {
        const data = await FetchService.post('clear_file_backups');
        setBackups(data.backups || []);
        showToast('All backup archives cleared successfully.', 'success');
      } catch (err: any) {
        showAlert('Clear Failed', 'Failed to clear backups repository: ' + err.message, 'error');
      }
    }, 'warning');
  };

  // SSE and Polling worker routines
  const cleanupJobMonitoring = () => {
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const handleStateUpdate = (d: any) => {
    setProgressPercent(d.progress || 0);
    setProgressText(d.status_text || `Archived ${d.processed_items} of ${d.total_items} files`);

    if (d.status === 'completed') {
      cleanupJobMonitoring();
      setProgressPercent(100);
      setProgressText('✅ Backup Completed Successfully!');
      setTimeout(() => {
        setIsGenerating(false);
        setActiveJobId(null);
        if (d.backups) setBackups(d.backups);
      }, 3000);
      return true;
    } else if (d.status === 'cancelled') {
      cleanupJobMonitoring();
      setProgressText('🛑 Backup Cancelled.');
      setTimeout(() => {
        setIsGenerating(false);
        setActiveJobId(null);
        if (d.backups) setBackups(d.backups);
      }, 2000);
      return true;
    } else if (d.status === 'failed') {
      cleanupJobMonitoring();
      setProgressText('❌ Backup Failed.');
      showAlert('Backup Failed', 'Backup failure detected: ' + (d.error || 'Server worker error.'), 'error');
      setTimeout(() => {
        setIsGenerating(false);
        setActiveJobId(null);
      }, 3000);
      return true;
    }
    return false;
  };

  const startJobMonitoring = (jobId: string) => {
    cleanupJobMonitoring();

    const runAjaxPollingFallback = () => {
      const poll = async () => {
        try {
          const d = await FetchService.post('poll_job_progress', { job_id: jobId });
          const isFinished = handleStateUpdate(d);
          if (!isFinished) {
            pollTimerRef.current = setTimeout(poll, 1500);
          }
        } catch (err: any) {
          cleanupJobMonitoring();
          setProgressText('❌ Polling Connection Lost.');
          setIsGenerating(false);
          setActiveJobId(null);
        }
      };
      pollTimerRef.current = setTimeout(poll, 1500);
    };

    if ((window as any).EventSource) {
      try {
        const config = (window as any).PM_CONFIG || {};
        const basePath = config.basePath || '';
        const cleanBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
        
        const sseUrl = new URL(`${window.location.origin}${cleanBase}/api/v1/stream_job_progress`);
        sseUrl.searchParams.set('ajax', '1');
        sseUrl.searchParams.set('job_id', jobId);
        if (config.securityToken) {
          sseUrl.searchParams.set('token', config.securityToken);
        }

        const source = new EventSource(sseUrl.toString());
        sseRef.current = source;

        source.onmessage = (event) => {
          try {
            const d = JSON.parse(event.data);
            if (d.success === false) {
              throw new Error(d.error || 'SSE failed.');
            }
            handleStateUpdate(d);
          } catch (err) {
            source.close();
            runAjaxPollingFallback();
          }
        };

        source.onerror = () => {
          source.close();
          runAjaxPollingFallback();
        };
      } catch (e) {
        runAjaxPollingFallback();
      }
    } else {
      runAjaxPollingFallback();
    }
  };

  return (
    <div className="space-y-6">
      {/* File Backup Control Panel */}
      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-xl space-y-4">
        <SectionHeader
          dotColor="bg-pm-warning"
          title="File Backup System"
          actionSlot={
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleStartBackup}
              className="bg-pm-primary hover:opacity-90 disabled:bg-pm-input disabled:text-pm-text-secondary text-white text-xs font-bold px-5 py-2.5 rounded-lg transition-all uppercase cursor-pointer"
            >
              {isGenerating ? '⚙️ Processing...' : '📥 Generate Site Backup'}
            </button>
          }
        />

        {/* Profile Select */}
        <div className="flex items-center gap-4 border-t border-pm-border pt-4 flex-wrap">
          <span className="text-xs font-bold text-pm-text-secondary uppercase tracking-wider">Backup Profile Matrix:</span>
          <select
            value={profile}
            disabled={isGenerating}
            onChange={e => setProfile(e.target.value)}
            className="bg-pm-input border border-pm-border rounded-lg px-3 py-1.5 text-xs text-pm-text focus:outline-none focus:border-pm-primary/50 min-w-[200px]"
          >
            <option value="custom">Custom / Load Profile</option>
            <option value="full">Full Backup (All Files)</option>
            <option value="core">Core Files Only</option>
            <option value="core_media">Core Files & Media</option>
            <option value="themes_modules">Themes & Modules</option>
            <option value="media">Media Files Only</option>
          </select>
        </div>

        {isGenerating && (
          <div className="border-t border-pm-border pt-4">
            <BackupProgress
              progressText={progressText}
              progressPercent={progressPercent}
              onCancel={handleCancelBackup}
              isCancelling={isCancelling}
            />
          </div>
        )}

        <p className="text-xs text-pm-text-secondary leading-relaxed border-t border-pm-border pt-4">
          Generates a streaming TAR archive of the PrestaShop filesystem based on the selected segment profile. The engine uses an asynchronous chunking algorithm to respect hosting limits and prevent Gateway Timeouts.
        </p>
      </div>

      {/* Directory Exclusion Grid */}
      {isLoadingTree ? (
        <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-xl flex items-center justify-center">
          <span className="text-xs text-pm-text-secondary">⏳ Scanning filesystem directories...</span>
        </div>
      ) : (
        <FolderSelector
          folders={folders}
          profile={profile}
          onToggleFolder={handleToggleFolder}
        />
      )}

      {/* Historical backups grid */}
      <BackupsGrid
        backups={backups}
        onRefresh={setBackups}
        onClearAll={handleClearAllBackups}
      />
    </div>
  );
};

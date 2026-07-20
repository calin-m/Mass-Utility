// @Arch[FileToolsTab]
// @Description: Main controller component for File Backups tab that manages folder structures, initializes SSE/AJAX polling threads, and handles backup archives.
// @Calls: start_file_backup, cancel_job, poll_job_progress, clear_file_backups, get_directory_tree, save_exclusions

import React, { useState, useEffect, useRef } from 'react';
import { FolderSelector, FolderEntry } from './FolderSelector';
import { BackupProgress } from './BackupProgress';
import { BackupsGrid, BackupEntry } from './BackupsGrid';
import { FetchService } from '../utils/FetchService';

export const FileToolsTab: React.FC = () => {
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

  // Initialize backups from window config injection
  useEffect(() => {
    const configBackups = (window as any).PM_CONFIG?.fileBackups || [];
    setBackups(configBackups);
    loadDirectoryTree();

    return () => {
      cleanupJobMonitoring();
    };
  }, []);

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
        alert(data.error || 'Failed to save directory exclusions.');
      }
    } catch (err: any) {
      alert('Network error saving exclusions: ' + err.message);
    }
  };

  const handleStartBackup = async () => {
    const confirmMsg = `You are about to initiate a file system archive sequence targeting the selected files and directories.\n\nIf the chosen profile contains many files, this can temporarily spike CPU utilization and IOPS on your server.\n\nAre you sure you want to proceed?\n\nPlease click OK to confirm.`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

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
        alert(data.error || 'Backup initialization failed.');
        setIsGenerating(false);
      }
    } catch (err: any) {
      alert('Error initializing backup job: ' + err.message);
      setIsGenerating(false);
    }
  };

  const handleCancelBackup = async () => {
    if (!activeJobId) return;
    setIsCancelling(true);
    setProgressText('Cancelling backup job...');
    try {
      await FetchService.post('cancel_job', { job_id: activeJobId });
    } catch (err: any) {
      alert('Cancellation request failed: ' + err.message);
      setIsCancelling(false);
    }
  };

  const handleClearAllBackups = async () => {
    const doubleConfirm = window.confirm(
      'Are you sure you want to permanently delete all generated ZIP/TAR archives? This cannot be undone.'
    );
    if (!doubleConfirm) return;

    try {
      const data = await FetchService.post('clear_file_backups');
      setBackups(data.backups || []);
    } catch (err: any) {
      alert('Failed to clear backups repository: ' + err.message);
    }
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
      alert('Backup failure detected: ' + (d.error || 'Server worker error.'));
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
      <div className="bg-[#12121a] border border-white/[0.08] rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-[#f59e0b] rounded-full shadow-lg shadow-[#f59e0b]/50"></span>
            <h3 className="text-md font-bold tracking-wide text-white uppercase">File Backup System</h3>
          </div>
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleStartBackup}
            className="bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:bg-gray-800 text-white text-xs font-bold px-5 py-2.5 rounded-lg transition-all uppercase"
          >
            {isGenerating ? '⚙️ Processing...' : '📥 Generate Site Backup'}
          </button>
        </div>

        {/* Profile Select */}
        <div className="flex items-center gap-4 border-t border-white/[0.06] pt-4 flex-wrap">
          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Backup Profile Matrix:</span>
          <select
            value={profile}
            disabled={isGenerating}
            onChange={e => setProfile(e.target.value)}
            className="bg-[#171725] border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#8b5cf6]/50 min-w-[200px]"
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
          <div className="border-t border-white/[0.06] pt-4">
            <BackupProgress
              progressText={progressText}
              progressPercent={progressPercent}
              onCancel={handleCancelBackup}
              isCancelling={isCancelling}
            />
          </div>
        )}

        <p className="text-xs text-gray-400 leading-relaxed border-t border-white/[0.06] pt-4">
          Generates a streaming TAR archive of the PrestaShop filesystem based on the selected segment profile. The engine uses an asynchronous chunking algorithm to respect hosting limits and prevent Gateway Timeouts.
        </p>
      </div>

      {/* Directory Exclusion Grid */}
      {isLoadingTree ? (
        <div className="bg-[#12121a] border border-white/[0.08] rounded-xl p-6 shadow-xl flex items-center justify-center">
          <span className="text-xs text-gray-400">⏳ Scanning filesystem directories...</span>
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

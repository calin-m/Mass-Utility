// @Arch[UI_Components]
// @Description: Consolidated Database Administration panel, managing MySQL table dumps, drift audits, InnoDB optimizer, and visitor logs sweeper.

import React, { useState, useEffect, useRef } from 'react';
import { FetchService } from '../utils/FetchService';

type SubTabType = 'backup' | 'restore' | 'profiler' | 'sweeper';

interface BackupFile {
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

interface TableMetric {
  name: string;
  engine: string;
  rows: number;
  size_pretty: string;
  overhead_pretty: string;
  overhead_bytes: number;
  fragmentation_ratio: string;
}

interface ProfilerReport {
  grade: string;
  grade_label: string;
  total_free_pretty: string;
  fragmentation_ratio_avg: string;
  tables_count: number;
  tables: TableMetric[];
}

interface SweeperStats {
  success: boolean;
  stats: {
    connections: number;
    connections_page: number;
    connections_source: number;
    guests: number;
    total: number;
  };
  carts: {
    carts: number;
    cart_products: number;
    cart_rules: number;
    total: number;
  };
}

export const DatabaseToolsTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('backup');

  // 1. Generate Backup state
  const [categorizedTables, setCategorizedTables] = useState<Record<string, string[]>>({});
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [expandedDomains, setExpandedDomains] = useState<Record<string, boolean>>({});
  const [backupPresets, setBackupPresets] = useState<string[]>([]);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [isBackupRunning, setIsBackupRunning] = useState(false);
  const [backupProgressPercent, setBackupProgressPercent] = useState(0);
  const [backupProgressText, setBackupProgressText] = useState('');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  // 2. Restore state
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [isRestoreRunning, setIsRestoreRunning] = useState(false);
  const [restoreProgressPercent, setRestoreProgressPercent] = useState(0);
  const [restoreProgressText, setRestoreProgressText] = useState('');
  const [restoreStatsExecuted, setRestoreStatsExecuted] = useState('0 / 0');
  const [restoreStatsAction, setRestoreStatsAction] = useState('');
  const [restoreStatsShop, setRestoreStatsShop] = useState('');
  const [restoreLogTerminal, setRestoreLogTerminal] = useState('');
  const [showShopLiveAlert, setShowShopLiveAlert] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadXhrRef = useRef<XMLHttpRequest | null>(null);

  // 3. Profiler state
  const [profilerReport, setProfilerReport] = useState<ProfilerReport | null>(null);
  const [isProfiling, setIsProfiling] = useState(false);

  // 4. Sweeper state
  const [retentionDays, setRetentionDays] = useState('30');
  const [sweeperStats, setSweeperStats] = useState<SweeperStats | null>(null);
  const [orphanedImages, setOrphanedImages] = useState<any[]>([]);
  const [orphanedImagesTotalCount, setOrphanedImagesTotalCount] = useState(0);
  const [orphanedImagesSizePretty, setOrphanedImagesSizePretty] = useState('0.00 MB');
  const [isScanningSweeper, setIsScanningSweeper] = useState(false);
  const [purgeStats, setPurgeStats] = useState(true);
  const [purgeCarts, setPurgeCarts] = useState(true);
  const [purgeImages, setPurgeImages] = useState(true);
  const [isSweeperRunning, setIsSweeperRunning] = useState(false);
  const [sweeperProgressPercent, setSweeperProgressPercent] = useState(0);
  const [sweeperProgressText, setSweeperProgressText] = useState('');
  const [sweeperConsole, setSweeperConsole] = useState('');
  const sweeperAbortedRef = useRef(false);

  // 5. Drift Diff Modal state
  const [driftModalData, setDriftModalData] = useState<any | null>(null);
  const [tableRowDiff, setTableRowDiff] = useState<any | null>(null);
  const [isLoadingRowDiff, setIsLoadingRowDiff] = useState(false);

  // Load basic configurations on mount
  useEffect(() => {
    fetchCategorizedTables();
    fetchBackups();
    fetchBackupPresets();
  }, []);

  const fetchCategorizedTables = async () => {
    try {
      const res = await FetchService.post('get_categorized_tables');
      if (res && res.success) {
        setCategorizedTables(res.categorized_tables || {});
        // Select Catalog domain by default
        const catalogTables = res.categorized_tables?.catalog || [];
        setSelectedTables(catalogTables);
      }
    } catch (e) {
      console.error('Error fetching categorized tables:', e);
    }
  };

  const fetchBackups = async () => {
    try {
      const res = await FetchService.post('get_db_backups');
      if (res && res.success) {
        setBackups(res.backups || []);
      }
    } catch (e) {
      console.error('Error fetching backups:', e);
    }
  };

  const fetchBackupPresets = async () => {
    try {
      const res = await FetchService.post('get_presets', { type: 'database' });
      if (res && res.success) {
        setBackupPresets(res.presets || []);
      }
    } catch (e) {}
  };

  // Preset Selection Handlers
  const handleLoadPreset = async (presetName: string) => {
    setSelectedPreset(presetName);
    if (!presetName) {
      setSelectedTables([]);
      return;
    }
    try {
      const res = await FetchService.post('load_preset', { name: presetName, type: 'database' });
      if (res && res.success && res.tables) {
        setSelectedTables(res.tables);
      }
    } catch (e) {}
  };

  const handleSavePreset = async () => {
    const name = window.prompt('Enter new preset name:');
    if (!name) return;
    try {
      const res = await FetchService.post('save_preset', { name, type: 'database', tables: JSON.stringify(selectedTables) });
      if (res && res.success) {
        alert('Preset saved successfully.');
        fetchBackupPresets();
        setSelectedPreset(name);
      }
    } catch (e) {}
  };

  const handleDeletePreset = async () => {
    if (!selectedPreset) return;
    const confirm = window.confirm(`Delete preset ${selectedPreset}?`);
    if (!confirm) return;
    try {
      const res = await FetchService.post('delete_preset', { name: selectedPreset, type: 'database' });
      if (res && res.success) {
        alert('Preset deleted.');
        fetchBackupPresets();
        setSelectedPreset('');
        setSelectedTables([]);
      }
    } catch (e) {}
  };

  // Table selection logic helpers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const all = Object.values(categorizedTables).flat();
      setSelectedTables(all);
    } else {
      setSelectedTables([]);
    }
  };

  const handleDomainSelect = (domain: string, checked: boolean) => {
    const domainTables = categorizedTables[domain] || [];
    if (checked) {
      setSelectedTables(prev => Array.from(new Set([...prev, ...domainTables])));
    } else {
      setSelectedTables(prev => prev.filter(t => !domainTables.includes(t)));
    }
  };

  const handleTableToggle = (table: string) => {
    setSelectedTables(prev =>
      prev.includes(table) ? prev.filter(t => t !== table) : [...prev, table]
    );
  };

  const toggleDomainCollapse = (domain: string) => {
    setExpandedDomains(prev => ({ ...prev, [domain]: !prev[domain] }));
  };

  // AJAX Backup execution trigger
  const handleStartBackup = async () => {
    if (selectedTables.length === 0) {
      alert('You must select at least one database table to archive.');
      return;
    }
    const confirm = window.confirm(`You are about to backup ${selectedTables.length} tables. Proceed?`);
    if (!confirm) return;

    setIsBackupRunning(true);
    setBackupProgressPercent(0);
    setBackupProgressText('Initializing database backup job...');

    try {
      const res = await FetchService.post('create_backup', { tables: JSON.stringify(selectedTables) });
      if (res && res.success && res.job_id) {
        setCurrentJobId(res.job_id);
        pollBackupProgress(res.job_id);
      } else {
        throw new Error(res.error || 'Backup initialization failed.');
      }
    } catch (e: any) {
      alert(e.message);
      setIsBackupRunning(false);
    }
  };

  const pollBackupProgress = (jobId: string) => {
    const poll = async () => {
      try {
        const res = await FetchService.post('poll_job_progress', { job_id: jobId });
        if (res.error) throw new Error(res.error);

        setBackupProgressPercent(res.progress || 0);
        setBackupProgressText(res.status_text || `Dumping tables...`);

        if (res.status === 'completed') {
          setIsBackupRunning(false);
          alert('Database backup completed successfully.');
          fetchBackups();
        } else if (res.status === 'cancelled') {
          setIsBackupRunning(false);
          alert('Backup cancelled.');
          fetchBackups();
        } else if (res.status === 'failed') {
          throw new Error(res.error || 'Backup job failed.');
        } else {
          setTimeout(poll, 1500);
        }
      } catch (e: any) {
        alert(e.message);
        setIsBackupRunning(false);
      }
    };
    setTimeout(poll, 1000);
  };

  const handleCancelBackup = async () => {
    if (!currentJobId) return;
    setBackupProgressText('Sending cancellation request...');
    try {
      await FetchService.post('cancel_job', { job_id: currentJobId });
    } catch (e) {}
  };

  // Restore logic execution chunked loops
  const handleStartRestore = async (backupName: string) => {
    const confirm = window.confirm(`WARNING: This will overwrite active catalog tables using the backup "${backupName}". Is it 100% safe to proceed?`);
    if (!confirm) return;

    setIsRestoreRunning(true);
    setRestoreProgressPercent(0);
    setRestoreProgressText('Preparing SQL staging area...');
    setRestoreStatsExecuted('0 / 0');
    setRestoreStatsAction('Pre-flight check...');
    setRestoreStatsShop('Enforcing limits...');
    setRestoreLogTerminal('STAGE 1: Enforcing safety bounds. Putting shop to Maintenance...\n');

    try {
      const prep = await FetchService.post('prepare_restore', { backup_name: backupName });
      if (!prep || !prep.statement_count) {
        throw new Error(prep.error || 'Failed to stage restore script.');
      }

      const totalStatements = prep.statement_count;
      const wasShopEnabled = prep.was_shop_enabled;

      setRestoreLogTerminal(prev => prev + `Success: Staged ${totalStatements} SQL statements.\nSTAGE 2: Commencing chunked execution loop...\n`);

      let offset = 0;
      const limit = 100;

      const runChunk = async () => {
        if (offset >= totalStatements) {
          // Finalize restore
          setRestoreStatsAction('Finalizing settings...');
          setRestoreLogTerminal(prev => prev + `STAGE 3: Finalizing transaction records...\n`);
          try {
            const finalRes = await FetchService.post('complete_restore', { backup_name: backupName, was_shop_enabled: wasShopEnabled ? 1 : 0 });
            setRestoreProgressPercent(100);
            setRestoreLogTerminal(prev => prev + `\nSUCCESS: Database restoration sequence completed smoothly!\n`);
            setIsRestoreRunning(false);

            if (finalRes.shop_status === 'MAINTENANCE') {
              setShowShopLiveAlert(true);
            } else {
              alert('Success! Database restored and store set LIVE.');
            }
          } catch (err: any) {
            setRestoreLogTerminal(prev => prev + `\nFINALIZATION ERROR: ${err.message}\n`);
            setIsRestoreRunning(false);
          }
          return;
        }

        setRestoreStatsAction(`Executing statements ${offset} to ${Math.min(totalStatements, offset + limit)}`);
        try {
          const chunkRes = await FetchService.post('execute_restore_chunk', { backup_name: backupName, offset, limit });
          const executed = chunkRes.executed_count;
          offset = chunkRes.new_offset;

          const pct = Math.min(100, Math.round((offset / totalStatements) * 100));
          setRestoreProgressPercent(pct);
          setRestoreStatsExecuted(`${offset} / ${totalStatements}`);
          setRestoreLogTerminal(prev => prev + `Executed statement chunk: queries ${offset - executed} to ${offset} completed.\n`);

          // Recurse
          setTimeout(runChunk, 100);
        } catch (err: any) {
          setRestoreLogTerminal(prev => prev + `\nCRITICAL FAILURE: ${err.message}\n`);
          setIsRestoreRunning(false);
          alert('Restore failed: ' + err.message);
        }
      };

      runChunk();

    } catch (e: any) {
      setRestoreLogTerminal(prev => prev + `\nPRE-FLIGHT ERROR: ${e.message}\n`);
      setIsRestoreRunning(false);
      alert('Restore pre-flight failed: ' + e.message);
    }
  };

  const handleTakeStoreLive = async () => {
    try {
      const res = await FetchService.post('set_shop_live');
      if (res && res.success) {
        alert(res.message);
        setShowShopLiveAlert(false);
      }
    } catch (e) {}
  };

  // Upload stager logic XHR
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleBrowseFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedUploadFile(e.target.files[0]);
    }
  };

  const handleUploadStageFile = () => {
    if (!selectedUploadFile) return;
    setIsUploading(true);
    setUploadPercent(0);

    const formData = new FormData();
    formData.append('file', selectedUploadFile);

    const xhr = new XMLHttpRequest();
    uploadXhrRef.current = xhr;

    const config = (window as any).PM_CONFIG || {};
    const basePath = config.basePath || '';
    const cleanBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;

    xhr.open('POST', `${cleanBase}/index.php?configure=mass_utility&ajax=1&action=upload_restore_file`);
    
    // Add CSRF header if present
    const token = config.csrfToken || '';
    if (token) {
      xhr.setRequestHeader('X-CSRF-Token', token);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadPercent(percent);
      }
    };

    xhr.onload = function() {
      setIsUploading(false);
      setSelectedUploadFile(null);
      if (this.status >= 200 && this.status < 300) {
        try {
          const res = JSON.parse(this.responseText);
          if (res.success) {
            alert('File uploaded and staged successfully.');
            fetchBackups();
          } else {
            alert(res.error || 'Upload staging failed.');
          }
        } catch (e) {
          alert('Upload completed, but response was invalid.');
        }
      } else {
        alert('Upload failed with status: ' + this.status);
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      alert('Upload staging network error.');
    };

    xhr.send(formData);
  };

  const handleCancelUpload = () => {
    if (uploadXhrRef.current) {
      uploadXhrRef.current.abort();
      setIsUploading(false);
      setSelectedUploadFile(null);
    }
  };

  // DB Profiler & Table Optimization
  const handleFetchProfilerReport = async () => {
    setIsProfiling(true);
    try {
      const res = await FetchService.post('profile_database');
      if (res && res.success) {
        setProfilerReport(res.profile as ProfilerReport);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProfiling(false);
    }
  };

  const handleOptimizeTable = async (tableName: string) => {
    const confirm = window.confirm(`Are you sure you want to optimize table ${tableName}? MySQL will recreate the table to reclaim unused disk space and rebuild indexes.`);
    if (!confirm) return;

    try {
      const res = await FetchService.post('optimize_table', { table: tableName });
      if (res && res.success) {
        alert(`Successfully optimized table: ${tableName}`);
        handleFetchProfilerReport();
      }
    } catch (e) {}
  };

  // 4. Data Sweeper logic chunked purge loops
  const handleSweeperScan = async () => {
    setIsScanningSweeper(true);
    try {
      const scanPromise = FetchService.post('sweeper_analyze', { days_old: retentionDays });
      const imagePromise = FetchService.post('sweeper_scan_images');
      const [scanRes, imgRes] = await Promise.all([scanPromise, imagePromise]);

      if (scanRes && scanRes.success) {
        setSweeperStats(scanRes as SweeperStats);
      }
      if (imgRes && imgRes.success) {
        setOrphanedImages(imgRes.orphaned_files || []);
        setOrphanedImagesTotalCount(imgRes.scanned_files || 0);
        setOrphanedImagesSizePretty((imgRes.total_orphaned_size / 1024 / 1024).toFixed(2) + ' MB');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsScanningSweeper(false);
    }
  };

  const handleExecuteSweeper = () => {
    if (!purgeStats && !purgeCarts && !purgeImages) {
      alert('Please check at least one of the data domains to purge.');
      return;
    }

    const statsCount = sweeperStats?.stats.total || 0;
    const cartsCount = sweeperStats?.carts.total || 0;
    const imagesCount = orphanedImages.length;
    const totalExpected = (purgeStats ? statsCount : 0) + (purgeCarts ? cartsCount : 0) + (purgeImages ? imagesCount : 0);

    if (totalExpected === 0) {
      alert('No expired items matching selection.');
      return;
    }

    const confirm = window.confirm(`You are about to permanently sweep ${totalExpected.toLocaleString()} items. This operation cannot be undone. Proceed?`);
    if (!confirm) return;

    setIsSweeperRunning(true);
    sweeperAbortedRef.current = false;
    setSweeperProgressPercent(0);
    setSweeperProgressText('Initializing sweep routines...');
    setSweeperConsole('[SYSTEM] Launching clean sweep sequence...');

    let totalDeleted = 0;
    const chunkSize = 5000;
    const imagesListCopy = [...orphanedImages];

    let purgeStatsStep = purgeStats;
    let purgeCartsStep = purgeCarts;
    let purgeImagesStep = purgeImages;

    const runNextSweepChunk = async () => {
      if (sweeperAbortedRef.current) {
        setSweeperConsole(prev => prev + `\n[${new Date().toLocaleTimeString()}] [WARNING] Aborted by user.`);
        setIsSweeperRunning(false);
        return;
      }

      // 1. Stats Purge
      if (purgeStatsStep) {
        setSweeperProgressText('Sweeping visitor log statistics...');
        try {
          const res = await FetchService.post('sweeper_sweep_connections', { days_old: retentionDays, chunk_size: chunkSize });
          if (res && res.success) {
            totalDeleted += res.deleted;
            const pct = Math.min(99, Math.round((totalDeleted / totalExpected) * 100));
            setSweeperProgressPercent(pct);
            setSweeperConsole(prev => prev + `\n[${new Date().toLocaleTimeString()}] [STATS] Purged ${res.deleted.toLocaleString()} connection logs.`);
            
            if (!res.done) {
              setTimeout(runNextSweepChunk, 200);
            } else {
              purgeStatsStep = false;
              runNextSweepChunk();
            }
          }
        } catch (err: any) {
          setSweeperConsole(prev => prev + `\n[ERROR] Stats purge failed: ${err.message}`);
          setIsSweeperRunning(false);
        }
        return;
      }

      // 1b. Guest Purge
      if (statsCount > 0 && !purgeStatsStep && purgeStats) {
        setSweeperProgressText('Sweeping orphaned visitor accounts...');
        try {
          const res = await FetchService.post('sweeper_sweep_guests', { chunk_size: chunkSize });
          if (res && res.success) {
            totalDeleted += res.deleted;
            const pct = Math.min(99, Math.round((totalDeleted / totalExpected) * 100));
            setSweeperProgressPercent(pct);
            setSweeperConsole(prev => prev + `\n[${new Date().toLocaleTimeString()}] [STATS] Purged ${res.deleted.toLocaleString()} guest records.`);
            
            if (!res.done) {
              setTimeout(runNextSweepChunk, 200);
            } else {
              // Mark complete
              setOrphanedImages([]);
              runNextSweepChunk();
            }
          }
        } catch (err: any) {
          setSweeperConsole(prev => prev + `\n[ERROR] Guest sweep failed: ${err.message}`);
          setIsSweeperRunning(false);
        }
        return;
      }

      // 2. Carts Purge
      if (purgeCartsStep) {
        setSweeperProgressText('Sweeping abandoned shopping carts...');
        try {
          const res = await FetchService.post('sweeper_sweep_carts', { days_old: retentionDays, chunk_size: chunkSize });
          if (res && res.success) {
            totalDeleted += res.deleted;
            const pct = Math.min(99, Math.round((totalDeleted / totalExpected) * 100));
            setSweeperProgressPercent(pct);
            setSweeperConsole(prev => prev + `\n[${new Date().toLocaleTimeString()}] [CARTS] Purged ${res.deleted.toLocaleString()} expired carts.`);
            
            if (!res.done) {
              setTimeout(runNextSweepChunk, 200);
            } else {
              purgeCartsStep = false;
              runNextSweepChunk();
            }
          }
        } catch (err: any) {
          setSweeperConsole(prev => prev + `\n[ERROR] Carts purge failed: ${err.message}`);
          setIsSweeperRunning(false);
        }
        return;
      }

      // 3. Images Purge
      if (purgeImagesStep) {
        setSweeperProgressText('Sweeping orphaned images...');
        const filesChunk = imagesListCopy.splice(0, 50).map(f => f.relative_path);
        if (filesChunk.length > 0) {
          try {
            const res = await FetchService.post('sweeper_purge_images', { files: filesChunk });
            if (res && res.success) {
              totalDeleted += res.deleted_count;
              const pct = Math.min(99, Math.round((totalDeleted / totalExpected) * 100));
              setSweeperProgressPercent(pct);
              setSweeperConsole(prev => prev + `\n[${new Date().toLocaleTimeString()}] [IMAGES] Deleted ${res.deleted_count.toLocaleString()} image files.`);
              
              if (imagesListCopy.length > 0) {
                setTimeout(runNextSweepChunk, 200);
              } else {
                purgeImagesStep = false;
                runNextSweepChunk();
              }
            }
          } catch (err: any) {
            setSweeperConsole(prev => prev + `\n[ERROR] Images clean failed: ${err.message}`);
            setIsSweeperRunning(false);
          }
        } else {
          purgeImagesStep = false;
          runNextSweepChunk();
        }
        return;
      }

      // Complete
      setSweeperProgressPercent(100);
      setSweeperProgressText('Purge sweep complete!');
      setSweeperConsole(prev => prev + `\n[SYSTEM] Purge operation completed successfully. Total cleaned: ${totalDeleted.toLocaleString()} items.`);
      setIsSweeperRunning(false);
      alert(`Purge complete. Cleaned ${totalDeleted.toLocaleString()} total items.`);
      handleSweeperScan();
    };

    setTimeout(runNextSweepChunk, 500);
  };

  // Compare Drift Modals Detail View
  const handleCheckCompareDrift = async (backupName: string) => {
    setTableRowDiff(null);
    try {
      const res = await FetchService.post('compare_backup', { file: backupName });
      if (res) {
        setDriftModalData({ name: backupName, ...res });
      }
    } catch (e) {
      alert('Failed to run comparison.');
    }
  };

  const handleInspectRowDiff = async (tableName: string) => {
    if (!driftModalData) return;
    setIsLoadingRowDiff(true);
    try {
      const res = await FetchService.post('diff_table_rows', { file: driftModalData.name, table: tableName });
      if (res && res.diffs) {
        setTableRowDiff({ table: tableName, ...res.diffs });
      }
    } catch (e) {
      alert('Failed to load table row differences.');
    } finally {
      setIsLoadingRowDiff(false);
    }
  };

  const handleTogglePinBackup = async (backupName: string) => {
    try {
      const res = await FetchService.post('toggle_pin_backup', { file: backupName });
      if (res && res.success) {
        fetchBackups();
      }
    } catch (e) {}
  };

  const handleDeleteBackup = async (backupName: string) => {
    const confirm = window.confirm(`Delete local backup archive ${backupName}?`);
    if (!confirm) return;
    try {
      const res = await FetchService.post('delete_backup', { backup: backupName });
      if (res && res.success) {
        alert('Backup deleted.');
        fetchBackups();
      }
    } catch (e) {}
  };

  const handleClearBackupHistory = async () => {
    const confirm = window.confirm('Clear all backup history? This will delete all local archives permanently.');
    if (!confirm) return;
    try {
      const res = await FetchService.post('clear_backup_history');
      if (res && res.success) {
        alert('All local database archives deleted.');
        fetchBackups();
      }
    } catch (e) {}
  };

  return (
    <div className="w-full space-y-6">
      {/* Dynamic Sub-tab Pills */}
      <div className="flex gap-2 border-b dark:border-white/[0.06] border-slate-200 pb-4 mb-6 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveSubTab('backup')}
          className={`pm-sub-tab-btn px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 transform hover:-translate-y-[1px] active:translate-y-0 uppercase tracking-wider ${
            activeSubTab === 'backup'
              ? 'dark:bg-[#8b5cf6]/10 dark:text-[#a78bfa] dark:border-[#8b5cf6]/20 bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm'
              : 'dark:text-gray-400 dark:hover:text-gray-200 text-slate-500 hover:text-slate-700 border border-transparent'
          }`}
        >
          📥 Generate Backup
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('restore')}
          className={`pm-sub-tab-btn px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 transform hover:-translate-y-[1px] active:translate-y-0 uppercase tracking-wider ${
            activeSubTab === 'restore'
              ? 'dark:bg-[#8b5cf6]/10 dark:text-[#a78bfa] dark:border-[#8b5cf6]/20 bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm'
              : 'dark:text-gray-400 dark:hover:text-gray-200 text-slate-500 hover:text-slate-700 border border-transparent'
          }`}
        >
          📤 Restore / Import
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('profiler')}
          className={`pm-sub-tab-btn px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 transform hover:-translate-y-[1px] active:translate-y-0 uppercase tracking-wider ${
            activeSubTab === 'profiler'
              ? 'dark:bg-[#8b5cf6]/10 dark:text-[#a78bfa] dark:border-[#8b5cf6]/20 bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm'
              : 'dark:text-gray-400 dark:hover:text-gray-200 text-slate-500 hover:text-slate-700 border border-transparent'
          }`}
        >
          📈 DB Profiler &amp; Optimize
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('sweeper')}
          className={`pm-sub-tab-btn px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 transform hover:-translate-y-[1px] active:translate-y-0 uppercase tracking-wider ${
            activeSubTab === 'sweeper'
              ? 'dark:bg-[#8b5cf6]/10 dark:text-[#a78bfa] dark:border-[#8b5cf6]/20 bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm'
              : 'dark:text-gray-400 dark:hover:text-gray-200 text-slate-500 hover:text-slate-700 border border-transparent'
          }`}
        >
          🧹 Data Sweeper
        </button>
      </div>

      {/* Pane Content */}
      <div className="transition-all duration-300">
        {/* SUBTAB 1: GENERATE BACKUP */}
        {activeSubTab === 'backup' && (
          <div className="space-y-6">
            <div className="bg-[#12121a] border border-white/[0.08] rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b border-white/[0.06] pb-3 flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
                  <h3 className="text-sm font-bold tracking-wide text-white uppercase">Pre-Flight Database Catalog Exporter</h3>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleStartBackup}
                    disabled={isBackupRunning}
                    className="bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg transition uppercase tracking-wider hover:-translate-y-[1px] active:translate-y-0"
                  >
                    📥 Generate Backup
                  </button>
                </div>
              </div>

              {isBackupRunning && (
                <div className="bg-black/10 border border-white/[0.06] rounded-xl p-4 space-y-3">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{backupProgressText}</span>
                    <span>{backupProgressPercent}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-black/35 rounded-full overflow-hidden border border-white/[0.04]">
                    <div
                      className="h-full bg-[#8b5cf6] transition-all duration-300"
                      style={{ width: `${backupProgressPercent}%` }}
                    ></div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelBackup}
                    className="text-[0.65rem] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1 rounded-md transition uppercase font-bold"
                  >
                    🛑 Stop Backup
                  </button>
                </div>
              )}

              {/* Table Selection Customizer */}
              <div className="bg-black/10 border border-white/[0.06] rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3 flex-wrap justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Presets:</span>
                    <select
                      value={selectedPreset}
                      onChange={(e) => handleLoadPreset(e.target.value)}
                      className="bg-[#171725] border border-white/[0.1] text-xs text-white rounded-lg px-2.5 py-1 focus:outline-none"
                    >
                      <option value="">-- Load Preset --</option>
                      {backupPresets.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={handleSavePreset}
                      className="bg-[#10b981]/15 hover:bg-[#10b981]/25 border border-[#10b981]/30 text-emerald-400 text-[0.65rem] font-bold px-3 py-1 rounded-md transition uppercase"
                    >
                      Save Preset
                    </button>
                    {selectedPreset && (
                      <button
                        type="button"
                        onClick={handleDeletePreset}
                        className="bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-[0.65rem] font-bold px-3 py-1 rounded-md transition uppercase"
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  <label className="flex items-center gap-2 text-xs font-bold text-[#8b5cf6] cursor-pointer">
                    <input
                      type="checkbox"
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded bg-black/10 border-white/[0.1] text-[#8b5cf6]"
                    />
                    Select All Tables (Full Backup)
                  </label>
                </div>

                {/* Grid domain categories */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.keys(categorizedTables).map(domain => {
                    const tables = categorizedTables[domain] || [];
                    const selectedInDomain = tables.filter(t => selectedTables.includes(t));
                    const isAllSelected = selectedInDomain.length === tables.length && tables.length > 0;
                    const isSomeSelected = selectedInDomain.length > 0 && !isAllSelected;
                    const isExpanded = expandedDomains[domain] || false;

                    return (
                      <div key={domain} className="bg-black/10 border border-white/[0.06] rounded-xl p-4 flex flex-col justify-between space-y-3">
                        <div>
                          <label className="flex items-center gap-2.5 text-xs font-bold text-white uppercase tracking-wider cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isAllSelected}
                              ref={el => {
                                if (el) el.indeterminate = isSomeSelected;
                              }}
                              onChange={(e) => handleDomainSelect(domain, e.target.checked)}
                              className="rounded bg-black/10 border-white/[0.1] text-[#8b5cf6]"
                            />
                            {domain.replace('_', ' ')}
                          </label>
                          <p className="text-[0.65rem] text-gray-400 mt-1">{tables.length} tables mapped</p>
                        </div>

                        <div>
                          {isExpanded && (
                            <div className="border-l-2 border-white/[0.06] pl-3 py-2 space-y-1.5 max-h-[150px] overflow-y-auto mb-2 text-xs">
                              {tables.map(tbl => (
                                <label key={tbl} className="flex items-center gap-2 cursor-pointer text-gray-300 font-mono text-[0.7rem] overflow-wrap-anywhere">
                                  <input
                                    type="checkbox"
                                    checked={selectedTables.includes(tbl)}
                                    onChange={() => handleTableToggle(tbl)}
                                    className="rounded bg-black/10 border-white/[0.1] text-[#8b5cf6]"
                                  />
                                  {tbl}
                                </label>
                              ))}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleDomainCollapse(domain)}
                            className="text-[0.65rem] text-[#8b5cf6] font-bold uppercase transition"
                          >
                            {isExpanded ? 'Hide Tables ▲' : 'Show Tables ▼'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Backups List Grid */}
            <div className="bg-[#12121a] border border-white/[0.08] rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b border-white/[0.06] pb-3 flex-wrap gap-4">
                <h3 className="text-sm font-bold tracking-wide text-white uppercase flex items-center gap-2">
                  <span>📁</span> Historical Backups Repository
                </h3>
                <button
                  type="button"
                  onClick={handleClearBackupHistory}
                  className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-bold px-3 py-1.5 rounded-lg transition uppercase tracking-wider"
                >
                  Clear History
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-black/15 text-gray-400 uppercase font-bold border-b border-white/[0.06]">
                    <tr>
                      <th className="p-4">Backup File Name</th>
                      <th className="p-4">SQL Size</th>
                      <th className="p-4">Log Size</th>
                      <th className="p-4">Date Compiled</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {backups.map(b => {
                      const isLocal = b.is_local !== false;
                      const isCloud = b.is_cloud === true;
                      const isPinned = b.is_pinned === true;

                      return (
                        <tr key={b.basename} className="hover:bg-white/[0.01] transition">
                          <td className="p-4 font-mono font-semibold text-white">
                            <div>
                              <div className="flex items-center gap-2">
                                <span>{b.basename}</span>
                                <span
                                  className="cursor-pointer opacity-60 hover:opacity-100"
                                  onClick={() => {
                                    navigator.clipboard.writeText(b.basename);
                                    alert('Filename copied!');
                                  }}
                                  title="Copy filename"
                                >
                                  📋
                                </span>
                              </div>
                              <div className="flex gap-2 mt-1.5 flex-wrap">
                                {isCloud ? (
                                  <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded text-[0.6rem] font-bold uppercase">
                                    ☁️ Cloud Only
                                  </span>
                                ) : b.is_uploaded ? (
                                  <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded text-[0.6rem] font-bold uppercase">
                                    📁 Uploaded
                                  </span>
                                ) : (
                                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[0.6rem] font-bold uppercase">
                                    💾 Local
                                  </span>
                                )}
                                {b.duration && (
                                  <span className="text-[0.65rem] text-gray-500">
                                    Completed in: {b.duration}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-gray-400">{(b.sql_size / 1024 / 1024).toFixed(2)} MB</td>
                          <td className="p-4 text-gray-400">{(b.log_size / 1024).toFixed(1)} KB</td>
                          <td className="p-4 text-gray-400">{new Date(b.date * 1000).toLocaleString()}</td>
                          <td className="p-4 text-right space-x-2">
                            {/* SQL download link */}
                            {b.sql_download_url && (
                              <a
                                href={b.sql_download_url}
                                className="bg-slate-700 hover:bg-slate-600 border border-white/[0.08] text-white px-2.5 py-1.5 rounded-lg transition uppercase font-bold text-[0.7rem] inline-block"
                              >
                                ⬇️ SQL
                              </a>
                            )}
                            {/* Log download link */}
                            {b.log_filename && b.log_download_url && (
                              <a
                                href={b.log_download_url}
                                className="bg-slate-800 hover:bg-slate-700 border border-white/[0.04] text-gray-400 px-2.5 py-1.5 rounded-lg transition uppercase font-bold text-[0.7rem] inline-block"
                              >
                                📄 Log
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleCheckCompareDrift(b.basename)}
                              className="bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-[#c084fc] px-2.5 py-1.5 rounded-lg transition uppercase font-bold text-[0.7rem]"
                            >
                              🔍 Diff
                            </button>
                            {isLocal && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBackup(b.basename)}
                                  className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 px-2.5 py-1.5 rounded-lg transition uppercase font-bold text-[0.7rem]"
                                >
                                  🗑️ Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTogglePinBackup(b.basename)}
                                  className={`border px-2.5 py-1.5 rounded-lg transition uppercase font-bold text-[0.7rem] ${
                                    isPinned
                                      ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400'
                                      : 'bg-slate-800 hover:bg-slate-700 border-white/[0.04] text-gray-400'
                                  }`}
                                >
                                  {isPinned ? '📌 Unpin' : '📌 Pin'}
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {backups.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500">No database archives compiled.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 2: RESTORE / IMPORT */}
        {activeSubTab === 'restore' && (
          <div className="space-y-6">
            <div className="bg-[#12121a] border border-white/[0.08] rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span>
                <h3 className="text-sm font-bold tracking-wide text-white uppercase">Database Restore &amp; Import Manager</h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Restore tables in chunked loops to completely bypass php execution limits. The store will automatically be switched to Maintenance Mode during restore execution.
              </p>
            </div>

            {showShopLiveAlert && (
              <div className="bg-yellow-500/10 border border-yellow-500/25 rounded-xl p-5 flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase">Store kept in Maintenance Mode</h4>
                    <p className="text-xs text-gray-400 mt-1">Review the restored catalog details first before setting the shop live.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleTakeStoreLive}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition uppercase hover:-translate-y-[1px] active:translate-y-0"
                >
                  ⚡ Take Store Live Now
                </button>
              </div>
            )}

            {/* Drag Drop File Zone */}
            <div className="bg-[#12121a] border border-white/[0.08] rounded-xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold tracking-wide text-white uppercase">📤 Upload External SQL File</h3>

              <div
                onDragOver={handleDragOver}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/[0.06] hover:border-indigo-500/40 rounded-xl p-8 text-center cursor-pointer transition bg-black/10 space-y-3"
              >
                <div className="text-3xl">📁</div>
                <p className="text-xs text-gray-300">
                  {selectedUploadFile ? `Selected: ${selectedUploadFile.name}` : 'Click or drag external SQL/GZ file here...'}
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".sql,.gz"
                  onChange={handleBrowseFile}
                  className="hidden"
                />
              </div>

              {selectedUploadFile && (
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={handleCancelUpload}
                    className="bg-black/20 hover:bg-black/30 border border-white/[0.1] text-gray-300 px-4 py-2 rounded-lg text-xs font-bold transition uppercase hover:-translate-y-[1px] active:translate-y-0"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleUploadStageFile}
                    disabled={isUploading}
                    className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-4 py-2 rounded-lg text-xs font-bold transition uppercase hover:-translate-y-[1px] active:translate-y-0"
                  >
                    {isUploading ? `Uploading (${uploadPercent}%)` : 'Stage Upload'}
                  </button>
                </div>
              )}

              {isUploading && (
                <div className="w-full h-1.5 bg-black/35 rounded-full overflow-hidden border border-white/[0.04]">
                  <div
                    className="h-full bg-[#8b5cf6] transition-all duration-300"
                    style={{ width: `${uploadPercent}%` }}
                  ></div>
                </div>
              )}
            </div>

            {/* Select Local Backups list */}
            <div className="bg-[#12121a] border border-white/[0.08] rounded-xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold tracking-wide text-white uppercase">Select Backup to Restore</h3>
              <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-black/15 text-gray-400 uppercase font-bold border-b border-white/[0.06]">
                    <tr>
                      <th className="p-4">Backup File</th>
                      <th className="p-4">Size</th>
                      <th className="p-4">Timestamp</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {backups.map(b => {
                      const isLocal = b.is_local !== false;

                      return (
                        <tr key={b.basename} className="hover:bg-white/[0.01] transition">
                          <td className="p-4 font-mono font-semibold text-white">{b.basename}</td>
                          <td className="p-4 text-gray-400">{(b.sql_size / 1024 / 1024).toFixed(2)} MB</td>
                          <td className="p-4 text-gray-400">{new Date(b.date * 1000).toLocaleString()}</td>
                          <td className="p-4 text-right space-x-2">
                            {isLocal ? (
                              <button
                                type="button"
                                onClick={() => handleStartRestore(b.basename)}
                                className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 px-3.5 py-1.5 rounded-lg transition uppercase font-bold hover:-translate-y-[1px] active:translate-y-0"
                              >
                                ⚡ Restore
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleStartRestore(b.basename)}
                                className="bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400 px-3.5 py-1.5 rounded-lg transition uppercase font-bold hover:-translate-y-[1px] active:translate-y-0"
                              >
                                ☁️ Restore
                              </button>
                            )}
                            {isLocal && (
                              <button
                                type="button"
                                onClick={() => handleDeleteBackup(b.basename)}
                                className="bg-slate-800 hover:bg-slate-700 border border-white/[0.04] text-gray-400 px-3.5 py-1.5 rounded-lg transition uppercase font-bold hover:-translate-y-[1px] active:translate-y-0"
                              >
                                🗑️ Delete
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
              <div className="bg-[#12121a] border border-red-500/20 rounded-xl p-6 shadow-xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/[0.06] pb-3">
                  <h3 className="text-sm font-bold tracking-wide text-red-400 uppercase">Database Restore Active</h3>
                  <span className="bg-red-500/10 text-red-400 text-[0.65rem] font-bold px-2 py-0.5 rounded uppercase">
                    Running
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-gray-400">
                    <span>{restoreProgressText}</span>
                    <span>{restoreProgressPercent}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-black/35 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 to-yellow-500 transition-all duration-300"
                      style={{ width: `${restoreProgressPercent}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold">
                  <div className="p-3 bg-black/10 border border-white/[0.06] rounded-lg">
                    <span className="text-gray-400 block mb-1">Statements Executed</span>
                    <span className="text-white font-mono">{restoreStatsExecuted}</span>
                  </div>
                  <div className="p-3 bg-black/10 border border-white/[0.06] rounded-lg">
                    <span className="text-gray-400 block mb-1">Current Action</span>
                    <span className="text-red-400 uppercase">{restoreStatsAction}</span>
                  </div>
                  <div className="p-3 bg-black/10 border border-white/[0.06] rounded-lg">
                    <span className="text-gray-400 block mb-1">Shop State</span>
                    <span className="text-yellow-400 uppercase">{restoreStatsShop}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[0.65rem] text-gray-400 uppercase tracking-wider font-bold">Execution Logs</p>
                  <pre className="bg-black text-[0.7rem] text-red-400 p-4 rounded-lg font-mono max-h-[150px] overflow-y-auto border border-white/[0.06] whitespace-pre-wrap">
                    {restoreLogTerminal}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUBTAB 3: DB PROFILER & OPTIMIZE */}
        {activeSubTab === 'profiler' && (
          <div className="space-y-6">
            <div className="bg-[#12121a] border border-white/[0.08] rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b border-white/[0.06] pb-3 flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  <h3 className="text-sm font-bold tracking-wide text-white uppercase">Automated Database Profiler &amp; Space Optimizer</h3>
                </div>
                <button
                  type="button"
                  onClick={handleFetchProfilerReport}
                  disabled={isProfiling}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition uppercase tracking-wider hover:-translate-y-[1px] active:translate-y-0"
                >
                  {isProfiling ? 'Analyzing...' : 'Refresh Profile'}
                </button>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Scans all tables in real-time to compute index fragmentation and disk overhead which slows down transactions.
              </p>
            </div>

            {profilerReport && (
              <>
                {/* Health Cards scores */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-[#12121a] border border-white/[0.08] rounded-xl p-5 shadow-lg text-center flex flex-col justify-center items-center">
                    <span className="text-[0.65rem] font-bold text-gray-400 uppercase tracking-widest block mb-2">Health Grade</span>
                    <div className="text-4xl font-black text-emerald-400 font-sans leading-none">{profilerReport.grade}</div>
                    <span className="text-[0.65rem] text-gray-500 mt-2">{profilerReport.grade_label}</span>
                  </div>

                  <div className="bg-[#12121a] border border-white/[0.08] rounded-xl p-5 shadow-lg flex flex-col justify-between">
                    <div>
                      <span className="text-[0.65rem] font-bold text-gray-400 uppercase tracking-widest block mb-2">Overallocated Space</span>
                      <div className="text-2xl font-bold text-white font-mono">{profilerReport.total_free_pretty}</div>
                    </div>
                    <span className="text-[0.65rem] text-gray-500 mt-2">Can be reclaimed immediately</span>
                  </div>

                  <div className="bg-[#12121a] border border-white/[0.08] rounded-xl p-5 shadow-lg flex flex-col justify-between">
                    <div>
                      <span className="text-[0.65rem] font-bold text-gray-400 uppercase tracking-widest block mb-2">Average Fragmentation</span>
                      <div className="text-2xl font-bold text-white font-mono">{profilerReport.fragmentation_ratio_avg}</div>
                    </div>
                    <span className="text-[0.65rem] text-gray-500 mt-2">{profilerReport.tables_count} monitored tables</span>
                  </div>
                </div>

                {/* Table fragmentation grid */}
                <div className="bg-[#12121a] border border-white/[0.08] rounded-xl p-6 shadow-xl space-y-4">
                  <h3 className="text-sm font-bold tracking-wide text-white uppercase">Table Fragmentation details</h3>
                  <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-black/15 text-gray-400 uppercase font-bold border-b border-white/[0.06]">
                        <tr>
                          <th className="p-4">Table Name</th>
                          <th className="p-4">Engine</th>
                          <th className="p-4">Rows</th>
                          <th className="p-4">Size</th>
                          <th className="p-4">Overhead</th>
                          <th className="p-4">Frag %</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {profilerReport.tables.map(t => (
                          <tr key={t.name} className="hover:bg-white/[0.01] transition">
                            <td className="p-4 font-mono font-semibold text-white">{t.name}</td>
                            <td className="p-4 text-gray-400">{t.engine}</td>
                            <td className="p-4 text-gray-400">{t.rows.toLocaleString()}</td>
                            <td className="p-4 text-gray-400">{t.size_pretty}</td>
                            <td className="p-4 text-gray-400">{t.overhead_pretty}</td>
                            <td className="p-4 font-semibold text-white">{t.fragmentation_ratio}</td>
                            <td className="p-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleOptimizeTable(t.name)}
                                className="bg-emerald-600/10 hover:bg-emerald-600/25 border border-emerald-500/20 text-emerald-400 px-3.5 py-1.5 rounded-lg transition uppercase font-bold hover:-translate-y-[1px] active:translate-y-0"
                              >
                                ⚡ Optimize
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* SUBTAB 4: DATA SWEEPER */}
        {activeSubTab === 'sweeper' && (
          <div className="space-y-6">
            <div className="bg-[#12121a] border border-white/[0.08] rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b border-white/[0.06] pb-3 flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse"></span>
                  <h3 className="text-sm font-bold tracking-wide text-white uppercase">Database Cleanup Sweeper</h3>
                </div>
              </div>

              <div className="bg-black/10 border border-white/[0.06] rounded-xl p-4 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-gray-400 uppercase font-bold">Retention Bounds:</span>
                  <select
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(e.target.value)}
                    className="bg-[#171725] border border-white/[0.1] text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none"
                  >
                    <option value="30">Older than 30 Days (Recommended)</option>
                    <option value="90">Older than 90 Days</option>
                    <option value="180">Older than 180 Days</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleSweeperScan}
                  disabled={isScanningSweeper}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition uppercase tracking-wider hover:-translate-y-[1px] active:translate-y-0"
                >
                  {isScanningSweeper ? 'Scanning...' : '🔍 Pre-Flight Scan'}
                </button>
              </div>
            </div>

            {sweeperStats && (
              <div className="bg-[#12121a] border border-white/[0.08] rounded-xl p-6 shadow-xl space-y-5">
                <h3 className="text-sm font-bold tracking-wide text-white uppercase">Reclaimable Bloat Summary</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                  {/* Visitor Log Bloat */}
                  <div className="bg-black/10 border border-white/[0.06] p-4 rounded-xl space-y-2">
                    <h4 className="font-bold text-white text-xs uppercase flex items-center gap-2">
                      <span>📉</span> visitor logs
                    </h4>
                    <div className="space-y-1">
                      <div className="flex justify-between"><span>Connections:</span><span className="font-semibold text-white">{sweeperStats.stats.connections.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Page views:</span><span className="font-semibold text-white">{sweeperStats.stats.connections_page.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Guest records:</span><span className="font-semibold text-white">{sweeperStats.stats.guests.toLocaleString()}</span></div>
                      <hr className="border-white/[0.06] my-1" />
                      <div className="flex justify-between font-bold"><span>Total stats:</span><span className="text-indigo-400">{sweeperStats.stats.total.toLocaleString()}</span></div>
                    </div>
                  </div>

                  {/* Cart Bloat */}
                  <div className="bg-black/10 border border-white/[0.06] p-4 rounded-xl space-y-2">
                    <h4 className="font-bold text-white text-xs uppercase flex items-center gap-2">
                      <span>🛒</span> Abandoned Carts
                    </h4>
                    <div className="space-y-1">
                      <div className="flex justify-between"><span>Carts log:</span><span className="font-semibold text-white">{sweeperStats.carts.carts.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Carts products:</span><span className="font-semibold text-white">{sweeperStats.carts.cart_products.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Applied rules:</span><span className="font-semibold text-white">{sweeperStats.carts.cart_rules.toLocaleString()}</span></div>
                      <hr className="border-white/[0.06] my-1" />
                      <div className="flex justify-between font-bold"><span>Total Carts:</span><span className="text-indigo-400">{sweeperStats.carts.total.toLocaleString()}</span></div>
                    </div>
                  </div>

                  {/* Image Bloat */}
                  <div className="bg-black/10 border border-white/[0.06] p-4 rounded-xl space-y-2">
                    <h4 className="font-bold text-white text-xs uppercase flex items-center gap-2">
                      <span>🖼️</span> Orphaned Images
                    </h4>
                    <div className="space-y-1">
                      <div className="flex justify-between"><span>Scanned files:</span><span className="font-semibold text-white">{orphanedImagesTotalCount.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Orphans found:</span><span className="font-semibold text-white">{orphanedImages.length.toLocaleString()}</span></div>
                      <hr className="border-white/[0.06] my-1" />
                      <div className="flex justify-between font-bold"><span>Reclaimable:</span><span className="text-indigo-400">{orphanedImagesSizePretty}</span></div>
                    </div>
                  </div>
                </div>

                {/* Sweep Purge Actions */}
                <div className="bg-red-500/5 border border-red-500/20 p-5 rounded-xl space-y-4">
                  <div className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase">Execute Clean Sweep Operations</h4>
                      <p className="text-[0.65rem] text-gray-400 mt-1">Chunked deletes of 5,000 rows prevent server timeout limits.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExecuteSweeper}
                      disabled={isSweeperRunning}
                      className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition uppercase tracking-wider hover:-translate-y-[1px] active:translate-y-0"
                    >
                      💥 Execute Sweeper
                    </button>
                  </div>

                  <div className="flex gap-4 text-xs flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={purgeStats}
                        onChange={(e) => setPurgeStats(e.target.checked)}
                        className="rounded bg-black/10 border-white/[0.1] text-red-500"
                      />
                      visitor statistics ({sweeperStats.stats.total.toLocaleString()} rows)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={purgeCarts}
                        onChange={(e) => setPurgeCarts(e.target.checked)}
                        className="rounded bg-black/10 border-white/[0.1] text-red-500"
                      />
                      Abandoned Carts ({sweeperStats.carts.total.toLocaleString()} rows)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={purgeImages}
                        onChange={(e) => setPurgeImages(e.target.checked)}
                        className="rounded bg-black/10 border-white/[0.1] text-red-500"
                      />
                      Orphaned Images ({orphanedImages.length.toLocaleString()} files)
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Sweeper Active Progress card */}
            {isSweeperRunning && (
              <div className="bg-[#12121a] border border-white/[0.08] rounded-xl p-6 shadow-xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/[0.06] pb-3">
                  <h3 className="text-sm font-bold tracking-wide text-white uppercase flex items-center gap-2">
                    <span>🧹</span> database clean sweep in progress
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      sweeperAbortedRef.current = true;
                    }}
                    className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-bold px-3.5 py-1.5 rounded-lg transition uppercase tracking-wider hover:-translate-y-[1px] active:translate-y-0"
                  >
                    🛑 Abort Operation
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-gray-400">
                    <span>{sweeperProgressText}</span>
                    <span>{sweeperProgressPercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-black/35 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 transition-all duration-300"
                      style={{ width: `${sweeperProgressPercent}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[0.65rem] text-gray-400 font-bold uppercase tracking-wider">Console Output Log</p>
                  <pre className="bg-black text-[0.7rem] text-gray-300 p-4 rounded-lg font-mono max-h-[150px] overflow-y-auto border border-white/[0.06] whitespace-pre-wrap">
                    {sweeperConsole}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* COMPARISON DRIFT OVERLAY MODAL */}
      {driftModalData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12121a] border border-white/[0.08] rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-white/[0.06] flex justify-between items-center bg-black/10">
              <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                <span>🔍</span> Drift comparison details: {driftModalData.name}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setDriftModalData(null);
                  setTableRowDiff(null);
                }}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-grow grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Tables list */}
              <div className="space-y-4 border-r border-white/[0.06] pr-6">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Tables Checksum statuses</h4>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto divide-y divide-white/[0.04]">
                  {driftModalData.checksum_status &&
                    Object.keys(driftModalData.checksum_status).map(tbl => {
                      const c = driftModalData.checksum_status[tbl];
                      const isMatch = c.match === true;
                      const isVolatile = c.volatile === true;

                      return (
                        <div key={tbl} className="pt-2 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-mono text-white block">{tbl}</span>
                            <span className="text-[0.65rem] text-gray-500">
                              Rows: {c.backup_rows} ➔ {c.active_rows}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-md ${
                              isMatch ? 'bg-emerald-500/10 text-emerald-400' :
                              isVolatile ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {isMatch ? 'IDENTICAL' : isVolatile ? 'VOLATILE' : 'MODIFIED'}
                            </span>
                            {!isMatch && !isVolatile && (
                              <button
                                type="button"
                                onClick={() => handleInspectRowDiff(tbl)}
                                className="text-[0.65rem] text-indigo-400 hover:underline font-bold"
                              >
                                View Diff
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Right Column: Row Diff inspection */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Row Diff details</h4>
                
                {isLoadingRowDiff && (
                  <div className="text-center py-10 text-xs text-gray-500">Querying row diffs...</div>
                )}

                {tableRowDiff && (
                  <div className="space-y-4">
                    <div className="bg-black/10 border border-white/[0.06] p-3 rounded-lg flex justify-between text-xs font-bold text-white">
                      <span>Table: {tableRowDiff.table}</span>
                      <div className="flex gap-3">
                        <span className="text-emerald-400">+{tableRowDiff.summary.added}</span>
                        <span className="text-red-400">-{tableRowDiff.summary.deleted}</span>
                        <span className="text-amber-400">~{tableRowDiff.summary.modified}</span>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-2 text-xs">
                      {/* Render Modified */}
                      {tableRowDiff.modified_rows?.map((r: any, idx: number) => (
                        <div key={idx} className="p-3 bg-black/20 border border-amber-500/25 border-l-4 rounded-r-lg space-y-2">
                          <span className="font-mono text-white font-bold block">PrimaryKey: {r.pk}</span>
                          {Object.keys(r.changes).map(col => (
                            <div key={col} className="bg-black/20 p-2 rounded text-[0.7rem] leading-relaxed">
                              <span className="text-gray-400 font-mono">{col}: </span>
                              <span className="text-red-400 line-through mr-2">{String(r.changes[col].backup || 'NULL')}</span>
                              <span className="text-emerald-400">{String(r.changes[col].live || 'NULL')}</span>
                            </div>
                          ))}
                        </div>
                      ))}

                      {/* Render Added */}
                      {tableRowDiff.added_rows?.map((r: any, idx: number) => (
                        <div key={idx} className="p-3 bg-black/20 border-emerald-500/25 border-l-4 rounded-r-lg">
                          <span className="font-mono text-emerald-400 font-bold block mb-2">Staged Entry (Added)</span>
                          {Object.keys(r).map(col => (
                            <div key={col} className="text-[0.7rem]">
                              <span className="text-gray-500">{col}: </span>
                              <span className="text-white">{String(r[col] || 'NULL')}</span>
                            </div>
                          ))}
                        </div>
                      ))}

                      {/* Render Deleted */}
                      {tableRowDiff.deleted_rows?.map((r: any, idx: number) => (
                        <div key={idx} className="p-3 bg-black/20 border-red-500/25 border-l-4 rounded-r-lg">
                          <span className="font-mono text-red-400 font-bold block mb-2">Deleted Entry</span>
                          {Object.keys(r).map(col => (
                            <div key={col} className="text-[0.7rem] line-through text-gray-500">
                              <span>{col}: </span>
                              <span>{String(r[col] || 'NULL')}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!tableRowDiff && !isLoadingRowDiff && (
                  <div className="text-center py-20 text-xs text-gray-500">Select any modified table from the left column to audit row-level transaction differences.</div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-white/[0.06] bg-black/10 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setDriftModalData(null);
                  setTableRowDiff(null);
                }}
                className="bg-black/25 hover:bg-black/35 border border-white/[0.1] text-white text-xs font-bold px-5 py-2.5 rounded-lg transition uppercase"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

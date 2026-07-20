// @Arch[UI_Components]
// @Description: Consolidated Database Administration panel, managing MySQL table dumps, drift audits, InnoDB optimizer, and visitor logs sweeper.

import React, { useState, useEffect, useRef } from 'react';
import { FetchService } from '../utils/FetchService';

type SubTabType = 'backup' | 'restore' | 'profiler' | 'sweeper';
type DrawerType = 'added' | 'deleted' | 'modified' | 'volatile' | null;

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
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>(null);
  const [tableRowDiff, setTableRowDiff] = useState<any | null>(null);
  const [isLoadingRowDiff, setIsLoadingRowDiff] = useState(false);
  const [inspectAllModal, setInspectAllModal] = useState<{ open: boolean; title: string; items: any[]; color: string } | null>(null);

  // Load basic configurations on mount
  useEffect(() => {
    fetchCategorizedTables();
    fetchBackups();
    fetchBackupPresets();
  }, []);

  // Resilient formatters supporting both raw numbers and pre-formatted strings
  const formatSqlSize = (size: any) => {
    if (typeof size === 'number') {
      return (size / 1024 / 1024).toFixed(2) + ' MB';
    }
    return size || 'Unknown Size';
  };

  const formatLogSize = (size: any) => {
    if (typeof size === 'number') {
      return (size / 1024).toFixed(2) + ' KB';
    }
    return size || '0 KB';
  };

  const formatDate = (dateVal: any) => {
    if (typeof dateVal === 'number') {
      const d = new Date(dateVal * 1000);
      return d.getFullYear() + '-' + 
             String(d.getMonth() + 1).padStart(2, '0') + '-' + 
             String(d.getDate()).padStart(2, '0') + ' ' + 
             String(d.getHours()).padStart(2, '0') + ':' + 
             String(d.getMinutes()).padStart(2, '0') + ':' + 
             String(d.getSeconds()).padStart(2, '0');
    }
    return dateVal || 'Unknown Date';
  };

  // Environment-aware confirmation and alert wrappers
  const getGlobalWin = () => {
    const win = window as any;
    if (win.showPremiumConfirmModal) return win;
    if (win.parent && win.parent.showPremiumConfirmModal) return win.parent;
    return win;
  };

  const showConfirm = (title: string, message: string, expectedPhrase: string | null, callback: () => void) => {
    const targetWin = getGlobalWin();
    if (targetWin.showPremiumConfirmModal) {
      targetWin.showPremiumConfirmModal(title, message, expectedPhrase, callback);
    } else {
      // Local dev fallback
      if (expectedPhrase) {
        const input = window.prompt(`Type "${expectedPhrase}" to confirm:\n${message}`);
        if (input?.toLowerCase() === expectedPhrase.toLowerCase()) {
          callback();
        }
      } else {
        if (window.confirm(message)) {
          callback();
        }
      }
    }
  };

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const targetWin = getGlobalWin();
    if (targetWin.showPremiumAlert) {
      targetWin.showPremiumAlert(title, message, type);
    } else {
      window.alert(`${title}\n\n${message}`);
    }
  };

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

  const handleSavePreset = () => {
    const targetWin = getGlobalWin();
    const promptCallback = async (name: string) => {
      if (!name) return;
      try {
        const res = await FetchService.post('save_preset', { name, type: 'database', tables: JSON.stringify(selectedTables) });
        if (res && res.success) {
          showAlert('Preset Saved', 'Preset saved successfully.', 'success');
          fetchBackupPresets();
          setSelectedPreset(name);
        }
      } catch (e) {}
    };

    if (targetWin.showPremiumPromptModal) {
      targetWin.showPremiumPromptModal('Save Preset', 'Enter new preset name:', 'Preset Name', promptCallback);
    } else {
      const name = window.prompt('Enter new preset name:');
      if (name) promptCallback(name);
    }
  };

  const handleDeletePreset = () => {
    if (!selectedPreset) return;
    showConfirm('Delete Preset', `Delete preset ${selectedPreset}?`, null, async () => {
      try {
        const res = await FetchService.post('delete_preset', { name: selectedPreset, type: 'database' });
        if (res && res.success) {
          showAlert('Preset Deleted', 'Preset deleted successfully.', 'success');
          fetchBackupPresets();
          setSelectedPreset('');
          setSelectedTables([]);
        }
      } catch (e) {}
    });
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
  const handleStartBackup = () => {
    if (selectedTables.length === 0) {
      showAlert('No Tables Selected', 'You must select at least one database table to archive.', 'error');
      return;
    }
    showConfirm('Database Backup', `You are about to backup ${selectedTables.length} tables. Proceed?`, null, async () => {
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
        showAlert('Backup Error', e.message, 'error');
        setIsBackupRunning(false);
      }
    });
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
          showAlert('Backup Completed', 'Database backup completed successfully.', 'success');
          fetchBackups();
        } else if (res.status === 'cancelled') {
          setIsBackupRunning(false);
          showAlert('Backup Cancelled', 'Backup cancelled.', 'info');
          fetchBackups();
        } else if (res.status === 'failed') {
          throw new Error(res.error || 'Backup job failed.');
        } else {
          setTimeout(poll, 1500);
        }
      } catch (e: any) {
        showAlert('Backup Failed', e.message, 'error');
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
  const handleStartRestore = (backupName: string) => {
    showConfirm('Restore Catalog', `WARNING: This will overwrite active catalog tables using the backup "${backupName}". Is it 100% safe to proceed?`, 'RESTORE', async () => {
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
                showAlert('Restore Successful', 'Database restored and store set LIVE.', 'success');
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
            showAlert('Restore Chunk Error', err.message, 'error');
          }
        };

        runChunk();

      } catch (e: any) {
        setRestoreLogTerminal(prev => prev + `\nPRE-FLIGHT ERROR: ${e.message}\n`);
        setIsRestoreRunning(false);
        showAlert('Restore Pre-flight Error', e.message, 'error');
      }
    });
  };

  const handleTakeStoreLive = async () => {
    try {
      const res = await FetchService.post('set_shop_live');
      if (res && res.success) {
        showAlert('Status Updated', res.message, 'success');
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

  const handleOptimizeTable = (tableName: string) => {
    showConfirm('Optimize Table', `Are you sure you want to optimize table ${tableName}? MySQL will recreate the table to reclaim unused disk space and rebuild indexes.`, null, async () => {
      try {
        const res = await FetchService.post('optimize_table', { table: tableName });
        if (res && res.success) {
          showAlert('Optimized', `Successfully optimized table: ${tableName}`, 'success');
          handleFetchProfilerReport();
        }
      } catch (e) {}
    });
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
      showAlert('Selection Required', 'Please check at least one of the data domains to purge.', 'error');
      return;
    }

    const statsCount = sweeperStats?.stats.total || 0;
    const cartsCount = sweeperStats?.carts.total || 0;
    const imagesCount = orphanedImages.length;
    const totalExpected = (purgeStats ? statsCount : 0) + (purgeCarts ? cartsCount : 0) + (purgeImages ? imagesCount : 0);

    if (totalExpected === 0) {
      showAlert('Empty Scan', 'No expired items matching selection.', 'info');
      return;
    }

    showConfirm('Data Sweeper Purge', `You are about to permanently sweep ${totalExpected.toLocaleString()} items. This operation cannot be undone. Proceed?`, 'SWEEP', () => {
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
      showAlert('Purge Complete', `Purge complete. Cleaned ${totalDeleted.toLocaleString()} total items.`, 'success');
      handleSweeperScan();
    };

    setTimeout(runNextSweepChunk, 500);
  });
};

  // Compare Drift Modals Detail View
  const handleCheckCompareDrift = async (backupName: string) => {
    setTableRowDiff(null);
    setActiveDrawer(null);
    try {
      const res = await FetchService.post('compare_backup', { file: backupName });
      if (res) {
        setDriftModalData({ name: backupName, ...res });
      }
    } catch (e) {
      showAlert('Audit Failed', 'Failed to run comparison.', 'error');
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
      showAlert('Drift Error', 'Failed to load table row differences.', 'error');
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

  const handleDeleteBackup = (backupName: string) => {
    showConfirm('Delete Backup', `Delete local backup archive ${backupName}?`, null, async () => {
      try {
        const res = await FetchService.post('delete_backup', { file: backupName });
        if (res && res.success) {
          showAlert('Deleted', 'Backup deleted.', 'success');
          fetchBackups();
        }
      } catch (e) {}
    });
  };

  const handleClearBackupHistory = () => {
    showConfirm('Clear History', 'Clear all backup history? This will delete all local archives permanently.', 'CLEAR ALL', async () => {
      try {
        const res = await FetchService.post('clear_backup_history');
        if (res && res.success) {
          showAlert('Cleared', 'All local database archives deleted.', 'success');
          fetchBackups();
        }
      } catch (e) {}
    });
  };

  // Compute stats inside comparison modal
  const getModifiedCount = (checksumStatus: any) => {
    if (!checksumStatus) return 0;
    return Object.values(checksumStatus).filter((c: any) => c.match === false && !c.volatile).length;
  };

  const getVolatileCount = (checksumStatus: any) => {
    if (!checksumStatus) return 0;
    return Object.values(checksumStatus).filter((c: any) => c.match === false && c.volatile).length;
  };

  const getModifiedTables = (checksumStatus: any) => {
    if (!checksumStatus) return [];
    return Object.keys(checksumStatus).filter((k: string) => checksumStatus[k].match === false && !checksumStatus[k].volatile);
  };

  const getVolatileTables = (checksumStatus: any) => {
    if (!checksumStatus) return [];
    return Object.keys(checksumStatus).filter((k: string) => checksumStatus[k].match === false && checksumStatus[k].volatile);
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
              ? 'dark:bg-[#8b5cf6]/10 dark:text-[#a78bfa] dark:border-[#8b5cf6]/20 bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20 shadow-sm'
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
              ? 'dark:bg-[#8b5cf6]/10 dark:text-[#a78bfa] dark:border-[#8b5cf6]/20 bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20 shadow-sm'
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
              ? 'dark:bg-[#8b5cf6]/10 dark:text-[#a78bfa] dark:border-[#8b5cf6]/20 bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20 shadow-sm'
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
              ? 'dark:bg-[#8b5cf6]/10 dark:text-[#a78bfa] dark:border-[#8b5cf6]/20 bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20 shadow-sm'
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
                    className="pm-btn bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg transition uppercase tracking-wider hover:-translate-y-[1px] active:translate-y-0"
                  >
                    📥 Generate Backup &amp; Log Archive
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
                    className="pm-btn pm-btn-danger text-[0.65rem] px-3 py-1 rounded-md transition uppercase font-bold"
                  >
                    🛑 Stop Backup
                  </button>
                </div>
              )}

              {/* Table Selection Customizer */}
              <div className="bg-black/10 border border-white/[0.06] rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3 flex-wrap justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Preset Loadout:</span>
                    <select
                      value={selectedPreset}
                      onChange={(e) => handleLoadPreset(e.target.value)}
                      className="bg-[#171725] border border-white/[0.1] text-xs text-white rounded-lg px-2.5 py-1 focus:outline-none"
                    >
                      <option value="">-- None / Load Template --</option>
                      {backupPresets.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={handleSavePreset}
                      className="pm-btn pm-btn-success text-[0.65rem] font-bold px-3 py-1 rounded-md transition uppercase"
                    >
                      Save Preset
                    </button>
                    {selectedPreset && (
                      <button
                        type="button"
                        onClick={handleDeletePreset}
                        className="pm-btn pm-btn-danger text-[0.65rem] font-bold px-3 py-1 rounded-md transition uppercase"
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
                  className="pm-btn pm-btn-danger text-xs px-3 py-1.5 rounded-lg transition uppercase tracking-wider"
                >
                  🗑️ Clear Backups
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
                                  <span className="pm-status-pill bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded text-[0.65rem] font-bold uppercase">
                                    ☁️ Cloud Only
                                  </span>
                                ) : b.is_uploaded ? (
                                  <span className="pm-status-pill bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded text-[0.65rem] font-bold uppercase">
                                    📁 Uploaded
                                  </span>
                                ) : (
                                  <span className="pm-status-pill success px-2 py-0.5 rounded text-[0.65rem] font-bold uppercase">
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
                          <td className="p-4 text-gray-400 font-mono">{formatSqlSize(b.sql_size)}</td>
                          <td className="p-4 text-gray-400 font-mono">{formatLogSize(b.log_size)}</td>
                          <td className="p-4 text-gray-400">{formatDate(b.date)}</td>
                          <td className="p-4 text-right space-x-2">
                            {/* SQL download link */}
                            {b.sql_download_url && (
                              <a
                                href={b.sql_download_url}
                                className="pm-btn pm-btn-sm text-[0.7rem] inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] hover:opacity-90"
                                title="Download SQL Dump"
                              >
                                <span>⬇️</span> SQL
                              </a>
                            )}
                            {/* Log download link */}
                            {b.log_filename && b.log_download_url && (
                              <a
                                href={b.log_download_url}
                                className="pm-btn pm-btn-sm pm-btn-neutral text-[0.7rem] inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] hover:opacity-90"
                                title="Download Telemetry Log"
                              >
                                <span>📄</span> Log
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleCheckCompareDrift(b.basename)}
                              className="pm-btn pm-btn-sm pm-btn-purple text-[0.7rem] inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] hover:opacity-90"
                            >
                              <span>🔍</span> Diff
                            </button>
                            {isLocal && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBackup(b.basename)}
                                  className="pm-btn pm-btn-sm pm-btn-danger text-[0.7rem] inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] hover:opacity-90"
                                >
                                  <span>🗑️</span> Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTogglePinBackup(b.basename)}
                                  className={`pm-btn pm-btn-sm text-[0.7rem] inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] hover:opacity-90 ${
                                    isPinned ? 'pm-btn-success' : 'pm-btn-neutral'
                                  }`}
                                >
                                  <span>📌</span> {isPinned ? 'Unpin' : 'Pin'}
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
                  className="pm-btn pm-btn-success text-xs font-bold px-4 py-2 rounded-lg transition uppercase hover:-translate-y-[1px] active:translate-y-0"
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
                    className="pm-btn pm-btn-neutral px-4 py-2 rounded-lg text-xs font-bold transition uppercase hover:-translate-y-[1px] active:translate-y-0"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleUploadStageFile}
                    disabled={isUploading}
                    className="pm-btn px-4 py-2 rounded-lg text-xs font-bold transition uppercase hover:-translate-y-[1px] active:translate-y-0"
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
                          <td className="p-4 text-gray-400 font-mono">{formatSqlSize(b.sql_size)}</td>
                          <td className="p-4 text-gray-400">{formatDate(b.date)}</td>
                          <td className="p-4 text-right space-x-2">
                            {isLocal ? (
                              <button
                                type="button"
                                onClick={() => handleStartRestore(b.basename)}
                                className="pm-btn pm-btn-danger text-[0.7rem] inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] hover:opacity-90"
                              >
                                <span>⚡</span> Restore
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleStartRestore(b.basename)}
                                className="pm-btn pm-btn-purple text-[0.7rem] inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] hover:opacity-90"
                              >
                                <span>☁️</span> Restore
                              </button>
                            )}
                            {isLocal && (
                              <button
                                type="button"
                                onClick={() => handleDeleteBackup(b.basename)}
                                className="pm-btn pm-btn-neutral text-[0.7rem] inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] hover:opacity-90"
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
                  className="pm-btn pm-btn-success text-xs font-bold px-4 py-2 rounded-lg transition uppercase tracking-wider hover:-translate-y-[1px] active:translate-y-0"
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
                                className="pm-btn pm-btn-success text-[0.7rem] hover:-translate-y-[1px] active:translate-y-0"
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
                  className="pm-btn px-4 py-2 rounded-lg text-xs font-bold transition uppercase tracking-wider hover:-translate-y-[1px] active:translate-y-0"
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
                      className="pm-btn pm-btn-danger text-xs font-bold px-4 py-2 rounded-lg transition uppercase tracking-wider hover:-translate-y-[1px] active:translate-y-0"
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
                    className="pm-btn pm-btn-danger text-xs font-bold px-3.5 py-1.5 rounded-lg transition uppercase tracking-wider hover:-translate-y-[1px] active:translate-y-0"
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

      {/* COMPARISON DRIFT OVERLAY MODAL (Key Sync Audit Modal matching legacy layout) */}
      {driftModalData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--pm-card-bg)] border border-[var(--pm-border-color)] rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[var(--pm-text-primary)]">
            {/* Header */}
            <div className="p-4 border-b border-white/[0.06] flex justify-between items-center bg-black/10">
              <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                <span>🛡️</span> Key Sync Audit: {driftModalData.name}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setDriftModalData(null);
                  setTableRowDiff(null);
                  setActiveDrawer(null);
                }}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-grow space-y-6 text-xs">
              
              {/* Staging Database Integrity Metric Row */}
              <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-white/[0.06]">
                <span className="font-bold text-gray-400 uppercase tracking-wider">Staging Database Integrity</span>
                <span
                  className="font-bold uppercase font-sans text-sm"
                  style={{
                    color:
                      driftModalData.added_count === 0 &&
                      driftModalData.deleted_count === 0 &&
                      driftModalData.backup_rows === driftModalData.active_rows
                        ? driftModalData.checksum_drift
                          ? '#f59e0b'
                          : '#10b981'
                        : '#ef4444',
                  }}
                >
                  {driftModalData.added_count === 0 &&
                  driftModalData.deleted_count === 0 &&
                  driftModalData.backup_rows === driftModalData.active_rows
                    ? driftModalData.checksum_drift
                      ? 'CONTENT DRIFT DETECTED (Row counts match, but content checksums differ)'
                      : 'STABLE (100% Identical)'
                    : 'STRUCTURAL DRIFT DETECTED (Row count discrepancy)'}
                </span>
              </div>

              {/* Grid Layout Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-black/10 border border-white/[0.06] p-4 rounded-xl">
                  <span className="text-gray-400 block mb-1 uppercase font-bold text-[0.65rem] tracking-wider">Backup Tables Rows</span>
                  <div className="text-2xl font-bold font-sans text-white">{driftModalData.backup_rows.toLocaleString()}</div>
                </div>

                <div className="bg-black/10 border border-white/[0.06] p-4 rounded-xl">
                  <span className="text-gray-400 block mb-1 uppercase font-bold text-[0.65rem] tracking-wider">Active Tables Rows</span>
                  <div className="text-2xl font-bold font-sans text-white">{driftModalData.active_rows.toLocaleString()}</div>
                </div>

                <div
                  onClick={() => {
                    if (driftModalData.added_count > 0) setActiveDrawer(activeDrawer === 'added' ? null : 'added');
                  }}
                  className={`border p-4 rounded-xl transition ${
                    driftModalData.added_count > 0
                      ? 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10 cursor-pointer'
                      : 'bg-black/10 border-white/[0.06] opacity-60'
                  }`}
                >
                  <span className="text-gray-400 block mb-1 uppercase font-bold text-[0.65rem] tracking-wider">Added Products (Deltas)</span>
                  <div className="text-2xl font-bold font-sans text-emerald-400">+{driftModalData.added_count}</div>
                  {driftModalData.added_count > 0 && <span className="text-[0.65rem] text-emerald-500 mt-1 block">Click to view list</span>}
                </div>

                <div
                  onClick={() => {
                    if (driftModalData.deleted_count > 0) setActiveDrawer(activeDrawer === 'deleted' ? null : 'deleted');
                  }}
                  className={`border p-4 rounded-xl transition ${
                    driftModalData.deleted_count > 0
                      ? 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10 cursor-pointer'
                      : 'bg-black/10 border-white/[0.06] opacity-60'
                  }`}
                >
                  <span className="text-gray-400 block mb-1 uppercase font-bold text-[0.65rem] tracking-wider">Deleted Products (Deltas)</span>
                  <div className="text-2xl font-bold font-sans text-red-400">-{driftModalData.deleted_count}</div>
                  {driftModalData.deleted_count > 0 && <span className="text-[0.65rem] text-red-500 mt-1 block">Click to view list</span>}
                </div>

                <div
                  onClick={() => {
                    const mCount = getModifiedCount(driftModalData.checksum_status);
                    if (mCount > 0) setActiveDrawer(activeDrawer === 'modified' ? null : 'modified');
                  }}
                  className={`border p-4 rounded-xl transition ${
                    getModifiedCount(driftModalData.checksum_status) > 0
                      ? 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10 cursor-pointer'
                      : 'bg-black/10 border-white/[0.06] opacity-60'
                  }`}
                >
                  <span className="text-gray-400 block mb-1 uppercase font-bold text-[0.65rem] tracking-wider">Modified Tables</span>
                  <div className="text-2xl font-bold font-sans text-red-400">
                    {getModifiedCount(driftModalData.checksum_status)}
                  </div>
                  {getModifiedCount(driftModalData.checksum_status) > 0 && <span className="text-[0.65rem] text-red-500 mt-1 block">Click to view list</span>}
                </div>

                <div
                  onClick={() => {
                    const vCount = getVolatileCount(driftModalData.checksum_status);
                    if (vCount > 0) setActiveDrawer(activeDrawer === 'volatile' ? null : 'volatile');
                  }}
                  className={`border p-4 rounded-xl transition ${
                    getVolatileCount(driftModalData.checksum_status) > 0
                      ? 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10 cursor-pointer'
                      : 'bg-black/10 border-white/[0.06] opacity-60'
                  }`}
                >
                  <span className="text-gray-400 block mb-1 uppercase font-bold text-[0.65rem] tracking-wider">Volatile Tables</span>
                  <div className="text-2xl font-bold font-sans text-amber-400">
                    {getVolatileCount(driftModalData.checksum_status)}
                  </div>
                  {getVolatileCount(driftModalData.checksum_status) > 0 && <span className="text-[0.65rem] text-amber-500 mt-1 block">Click to view list</span>}
                </div>
              </div>

              {/* Collapsible Drawer (Details Drawer) */}
              {activeDrawer && (
                <div className="bg-[var(--pm-body-bg)] border border-[var(--pm-border-color)] p-4 rounded-xl space-y-4">
                  <div className="flex justify-between items-center border-b border-[var(--pm-border-color)] pb-2">
                    <h4 className="font-bold text-[var(--pm-text-primary)] uppercase tracking-wider text-[0.7rem]">
                      {activeDrawer === 'added' && 'Added Products List'}
                      {activeDrawer === 'deleted' && 'Deleted Products List'}
                      {activeDrawer === 'modified' && 'Modified Tables List'}
                      {activeDrawer === 'volatile' && 'Volatile Tables List'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setActiveDrawer(null)}
                      className="text-[var(--pm-text-secondary)] hover:text-[var(--pm-text-primary)] uppercase font-bold text-[0.65rem]"
                    >
                      ✕ Close
                    </button>
                  </div>

                  <div className="max-h-[160px] overflow-y-auto space-y-2 pr-2">
                    {/* Added Products Drawer List */}
                    {activeDrawer === 'added' && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setInspectAllModal({
                                open: true,
                                title: 'Added Products Deltas',
                                items: driftModalData.added || [],
                                color: '#10b981',
                              });
                            }}
                            className="pm-btn pm-btn-sm text-[0.65rem] cursor-pointer transition hover:-translate-y-[1px]"
                          >
                            Inspect All
                          </button>
                          <a
                            href={`${window.location.href}&ajax=1&action=export_diff&file=${encodeURIComponent(driftModalData.name)}&table=product_deltas&format=csv`}
                            className="pm-btn pm-btn-sm pm-btn-neutral text-[0.65rem] inline-flex items-center justify-center cursor-pointer transition hover:-translate-y-[1px]"
                          >
                            Export CSV
                          </a>
                        </div>
                        <div className="divide-y divide-[var(--pm-border-color)]">
                          {(driftModalData.added || []).map((p: any) => (
                            <div key={p.id_product} className="py-1.5 flex justify-between font-mono text-[0.7rem] text-[var(--pm-text-secondary)]">
                              <span>ID: {p.id_product} ({p.name})</span>
                              <span className="text-emerald-400 font-bold">${parseFloat(p.price).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Deleted Products Drawer List */}
                    {activeDrawer === 'deleted' && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setInspectAllModal({
                                open: true,
                                title: 'Deleted Products Deltas',
                                items: driftModalData.deleted || [],
                                color: '#ef4444',
                              });
                            }}
                            className="pm-btn pm-btn-sm text-[0.65rem] cursor-pointer transition hover:-translate-y-[1px]"
                          >
                            Inspect All
                          </button>
                          <a
                            href={`${window.location.href}&ajax=1&action=export_diff&file=${encodeURIComponent(driftModalData.name)}&table=product_deltas&format=csv`}
                            className="pm-btn pm-btn-sm pm-btn-neutral text-[0.65rem] inline-flex items-center justify-center cursor-pointer transition hover:-translate-y-[1px]"
                          >
                            Export CSV
                          </a>
                        </div>
                        <div className="divide-y divide-[var(--pm-border-color)]">
                          {(driftModalData.deleted || []).map((p: any) => (
                            <div key={p.id_product} className="py-1.5 flex justify-between font-mono text-[0.7rem] text-[var(--pm-text-secondary)]">
                              <span>ID: {p.id_product} ({p.name})</span>
                              <span className="text-red-400 line-through font-bold">${parseFloat(p.price).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Modified Tables List */}
                    {activeDrawer === 'modified' && (
                      <div className="divide-y divide-[var(--pm-border-color)]">
                        {getModifiedTables(driftModalData.checksum_status).map((t: string) => (
                          <div key={t} className="py-2 flex justify-between items-center text-xs">
                            <span className="font-mono text-[var(--pm-text-primary)] font-semibold">{t}</span>
                            <button
                              type="button"
                              onClick={() => handleInspectRowDiff(t)}
                              className="text-[0.65rem] text-indigo-400 hover:text-indigo-300 hover:underline font-bold cursor-pointer"
                            >
                              View Diff
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Volatile Tables List */}
                    {activeDrawer === 'volatile' && (
                      <div className="divide-y divide-[var(--pm-border-color)]">
                        {getVolatileTables(driftModalData.checksum_status).map((t: string) => (
                          <div key={t} className="py-2 flex justify-between items-center text-xs">
                            <span className="font-mono text-[var(--pm-text-primary)] font-semibold">{t}</span>
                            <span className="text-[0.65rem] text-amber-400 font-bold uppercase">Volatile Logs</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {isLoadingRowDiff ? (
                <div className="bg-[var(--pm-body-bg)] border border-[var(--pm-border-color)] p-4 rounded-xl text-center text-[var(--pm-text-secondary)] font-mono">
                  ⌛ Loading row difference telemetry...
                </div>
              ) : tableRowDiff && (
                <div className="bg-[var(--pm-body-bg)] border border-[var(--pm-border-color)] p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center font-bold text-[var(--pm-text-primary)] border-b border-[var(--pm-border-color)] pb-2">
                    <span>Table Row Modifications: {tableRowDiff.table}</span>
                    <div className="flex gap-3 text-[0.7rem]">
                      <span className="text-emerald-400">+{tableRowDiff.summary.added} Added</span>
                      <span className="text-red-400">-{tableRowDiff.summary.deleted} Deleted</span>
                      <span className="text-amber-400">~{tableRowDiff.summary.modified} Modified</span>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2">
                    {/* Modified Rows */}
                    {tableRowDiff.modified_rows?.map((r: any, idx: number) => (
                      <div key={idx} className="p-3 bg-[var(--pm-card-bg)] border-amber-500/30 border border-l-4 rounded-r-lg space-y-2">
                        <span className="font-mono text-[var(--pm-text-primary)] font-bold block">PK Index: {r.pk}</span>
                        {Object.keys(r.changes).map(col => (
                          <div key={col} className="bg-[var(--pm-body-bg)] p-2 rounded text-[0.7rem] leading-relaxed border border-[var(--pm-border-color)]">
                            <span className="text-[var(--pm-text-secondary)] font-mono">{col}: </span>
                            <span className="text-red-400 line-through mr-2 font-mono">{String(r.changes[col].backup || 'NULL')}</span>
                            <span className="text-emerald-400 font-mono">{String(r.changes[col].live || 'NULL')}</span>
                          </div>
                        ))}
                      </div>
                    ))}

                    {/* Added Rows */}
                    {tableRowDiff.added_rows?.map((r: any, idx: number) => (
                      <div key={idx} className="p-3 bg-[var(--pm-card-bg)] border-emerald-500/30 border border-l-4 rounded-r-lg">
                        <span className="font-mono text-emerald-400 font-bold block mb-2">Added Row Data</span>
                        {Object.keys(r).map(col => (
                          <div key={col} className="text-[0.7rem] text-[var(--pm-text-secondary)]">
                            <span className="text-[var(--pm-text-secondary)]/60">{col}: </span>
                            <span className="font-mono text-[var(--pm-text-primary)]">{String(r[col] || 'NULL')}</span>
                          </div>
                        ))}
                      </div>
                    ))}

                    {/* Deleted Rows */}
                    {tableRowDiff.deleted_rows?.map((r: any, idx: number) => (
                      <div key={idx} className="p-3 bg-[var(--pm-card-bg)] border-red-500/30 border border-l-4 rounded-r-lg">
                        <span className="font-mono text-red-400 font-bold block mb-2">Deleted Row Data</span>
                        {Object.keys(r).map(col => (
                          <div key={col} className="text-[0.7rem] line-through text-[var(--pm-text-secondary)]/50">
                            <span>{col}: </span>
                            <span className="font-mono">{String(r[col] || 'NULL')}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Database Tables Content Integrity Table */}
              <div className="space-y-2">
                <span className="font-bold text-[var(--pm-text-secondary)] uppercase tracking-wider block">Database Tables Content Integrity</span>
                <div className="max-h-[220px] overflow-y-auto bg-[var(--pm-body-bg)] border border-[var(--pm-border-color)] rounded-lg p-3 space-y-2">
                  {driftModalData.checksum_status &&
                    Object.keys(driftModalData.checksum_status).map(tbl => {
                      const c = driftModalData.checksum_status[tbl];
                      const isMatch = c.match === true;
                      const isVolatile = c.volatile === true;

                      return (
                        <div key={tbl} className="flex justify-between items-center py-2 border-b border-[var(--pm-border-color)] last:border-b-0">
                          <div>
                            <span className="font-mono font-semibold text-[var(--pm-text-primary)] block">{tbl}</span>
                            <span className="text-[0.65rem] text-[var(--pm-text-secondary)]">
                              Rows: {c.backup_rows} ➔ {c.active_rows}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[0.7rem] text-[var(--pm-text-secondary)]">
                              {c.backup ? c.backup : 'N/A'} ➔ {c.active}
                            </span>
                            <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-md ${
                              isMatch ? 'bg-emerald-500/10 text-emerald-400' :
                              isVolatile ? 'bg-amber-500/15 text-amber-400 border border-amber-500/35' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {isMatch ? 'IDENTICAL' : isVolatile ? 'VOLATILE' : 'MODIFIED'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Staging Telemetry Log Checksum */}
              <div className="space-y-2">
                <span className="font-bold text-[var(--pm-text-secondary)] uppercase tracking-wider block">Staging Telemetry Log Checksum</span>
                <pre className="bg-black text-[0.7rem] text-emerald-400 p-4 rounded-lg font-mono max-h-[140px] overflow-y-auto border border-[var(--pm-border-color)] whitespace-pre-wrap">
                  {driftModalData.log_metadata}
                </pre>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--pm-border-color)] bg-black/10 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setDriftModalData(null);
                  setTableRowDiff(null);
                  setActiveDrawer(null);
                }}
                className="pm-btn pm-btn-neutral text-xs font-bold px-5 py-2.5 rounded-lg transition uppercase cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSPECT ALL DELTAS SUB-MODAL */}
      {inspectAllModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--pm-card-bg)] border border-[var(--pm-border-color)] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] text-[var(--pm-text-primary)]">
            <div className="p-4 border-b border-[var(--pm-border-color)] flex justify-between items-center bg-black/10">
              <h3 className="text-sm font-bold text-[var(--pm-text-primary)] uppercase">
                {inspectAllModal.title} ({inspectAllModal.items.length})
              </h3>
              <button
                type="button"
                onClick={() => setInspectAllModal(null)}
                className="text-[var(--pm-text-secondary)] hover:text-[var(--pm-text-primary)] text-lg font-bold"
              >
                &times;
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-grow space-y-3">
              {inspectAllModal.items.map((i: any) => (
                <div
                  key={i.id_product}
                  className="p-4 rounded-lg flex justify-between items-center bg-[var(--pm-body-bg)] border border-[var(--pm-border-color)]"
                  style={{ borderLeft: `4px solid ${inspectAllModal.color}` }}
                >
                  <div className="flex flex-col gap-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-[var(--pm-text-primary)]">ID: {i.id_product}</span>
                      <span className="text-[var(--pm-text-secondary)] font-mono">Ref: {i.reference || 'N/A'}</span>
                    </div>
                    <span className="text-[var(--pm-text-secondary)]">{i.name}</span>
                  </div>
                  <span className="text-[var(--pm-text-primary)] font-mono font-bold text-xs">
                    ${parseFloat(i.price).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-[var(--pm-border-color)] bg-black/10 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectAllModal(null)}
                className="pm-btn pm-btn-neutral text-xs font-bold px-4 py-2 rounded-lg transition uppercase cursor-pointer"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

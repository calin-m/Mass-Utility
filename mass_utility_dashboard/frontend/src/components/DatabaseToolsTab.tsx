// @Arch[UI_Components]
// @Description: Consolidated Database Administration panel, managing MySQL table dumps, drift audits, InnoDB optimizer, and visitor logs sweeper.

import React, { useState, useEffect, useRef } from 'react';
import { FetchService } from '../utils/FetchService';
import { BackupSubTab } from './database/BackupSubTab';
import { RestoreSubTab } from './database/RestoreSubTab';
import { ProfilerSubTab } from './database/ProfilerSubTab';
import { SweeperSubTab } from './database/SweeperSubTab';

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
  const [profilerSearch, setProfilerSearch] = useState('');
  const [isBulkOptimizing, setIsBulkOptimizing] = useState(false);
  const [bulkOptimizeProgress, setBulkOptimizeProgress] = useState('');

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (driftModalData || inspectAllModal) {
          setDriftModalData(null);
          setTableRowDiff(null);
          setActiveDrawer(null);
          setInspectAllModal(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [driftModalData, inspectAllModal]);

  // Load basic configurations on mount
  useEffect(() => {
    fetchCategorizedTables();
    fetchBackups();
    fetchBackupPresets();
  }, []);

  // Auto-fetch profiler or sweeper stats on sub-tab activation if not loaded yet
  useEffect(() => {
    if (activeSubTab === 'profiler' && !profilerReport && !isProfiling) {
      handleFetchProfilerReport();
    }
    if (activeSubTab === 'sweeper' && !sweeperStats && !isScanningSweeper) {
      handleSweeperScan();
    }
  }, [activeSubTab]);

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
      console.warn(`[ALERT ${type.toUpperCase()}] ${title}: ${message}`);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const targetWin = getGlobalWin();
    if (targetWin.showToast) {
      targetWin.showToast(message, type);
    } else {
      console.log(`[TOAST ${type.toUpperCase()}] ${message}`);
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
            showAlert('Upload Staged', 'File uploaded and staged successfully.', 'success');
            fetchBackups();
          } else {
            showAlert('Upload Failed', res.error || 'Upload staging failed.', 'error');
          }
        } catch (e) {
          showAlert('Upload Response Error', 'Upload completed, but response was invalid.', 'error');
        }
      } else {
        showAlert('Upload Network Error', 'Upload failed with status: ' + this.status, 'error');
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      showAlert('Upload Connection Failed', 'Upload staging network error.', 'error');
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
        const summary = res.summary || {};
        const tables = res.fragmented_tables || [];

        const gradeLabels: Record<string, string> = {
          A: 'Excellent Health',
          B: 'Good Health',
          C: 'Minor Fragmentation',
          D: 'High Overhead',
          F: 'Action Required'
        };

        setProfilerReport({
          grade: summary.grade || 'A',
          grade_label: gradeLabels[summary.grade] || 'Optimal Health',
          total_free_pretty: formatSqlSize(summary.total_free || 0),
          fragmentation_ratio_avg: (summary.ratio || 0).toFixed(2) + '%',
          tables_count: summary.total_tables || 0,
          tables: tables.map((t: any) => ({
            name: t.name,
            engine: t.engine || 'InnoDB',
            rows: t.rows || 0,
            size_pretty: formatSqlSize(t.size || 0),
            overhead_pretty: formatSqlSize(t.free || 0),
            fragmentation_ratio: (t.ratio || 0).toFixed(2) + '%'
          }))
        });
      } else {
        showAlert('Profiler Error', res?.error || 'Failed to fetch database profile.', 'error');
      }
    } catch (e: any) {
      showAlert('Profiler Exception', e.message || 'Error executing database profiler.', 'error');
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
        } else {
          showAlert('Optimization Failed', res?.error || `Failed to optimize table ${tableName}`, 'error');
        }
      } catch (e: any) {
        showAlert('Optimization Error', e.message || `Error optimizing ${tableName}`, 'error');
      }
    });
  };

  const handleOptimizeAllTables = async () => {
    if (!profilerReport || profilerReport.tables.length === 0) return;
    const count = profilerReport.tables.length;
    showConfirm('Optimize All Fragmented Tables', `Optimize all <strong>${count} fragmented tables</strong> sequentially to reclaim disk space and rebuild indexes?`, 'OPTIMIZE ALL', async () => {
      setIsBulkOptimizing(true);
      let successCount = 0;
      for (let i = 0; i < profilerReport.tables.length; i++) {
        const t = profilerReport.tables[i];
        setBulkOptimizeProgress(`Optimizing ${i + 1}/${count}: ${t.name}...`);
        try {
          const res = await FetchService.post('optimize_table', { table: t.name });
          if (res && res.success) successCount++;
        } catch (err) {}
      }
      setIsBulkOptimizing(false);
      setBulkOptimizeProgress('');
      showAlert('Bulk Optimization Complete', `Optimized ${successCount} of ${count} fragmented tables.`, 'success');
      handleFetchProfilerReport();
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
    let purgeGuestStep = purgeStats;
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
            
            if (!res.done && res.deleted > 0) {
              setTimeout(runNextSweepChunk, 200);
            } else {
              purgeStatsStep = false;
              runNextSweepChunk();
            }
          } else {
            purgeStatsStep = false;
            runNextSweepChunk();
          }
        } catch (err: any) {
          setSweeperConsole(prev => prev + `\n[ERROR] Stats purge failed: ${err.message}`);
          purgeStatsStep = false;
          runNextSweepChunk();
        }
        return;
      }

      // 1b. Guest Purge
      if (purgeGuestStep) {
        setSweeperProgressText('Sweeping orphaned visitor accounts...');
        try {
          const res = await FetchService.post('sweeper_sweep_guests', { chunk_size: chunkSize });
          if (res && res.success) {
            totalDeleted += res.deleted;
            const pct = Math.min(99, Math.round((totalDeleted / totalExpected) * 100));
            setSweeperProgressPercent(pct);
            setSweeperConsole(prev => prev + `\n[${new Date().toLocaleTimeString()}] [STATS] Purged ${res.deleted.toLocaleString()} guest records.`);
            
            if (!res.done && res.deleted > 0) {
              setTimeout(runNextSweepChunk, 200);
            } else {
              purgeGuestStep = false;
              runNextSweepChunk();
            }
          } else {
            purgeGuestStep = false;
            runNextSweepChunk();
          }
        } catch (err: any) {
          setSweeperConsole(prev => prev + `\n[ERROR] Guest sweep failed: ${err.message}`);
          purgeGuestStep = false;
          runNextSweepChunk();
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
            
            if (!res.done && res.deleted > 0) {
              setTimeout(runNextSweepChunk, 200);
            } else {
              purgeCartsStep = false;
              runNextSweepChunk();
            }
          } else {
            purgeCartsStep = false;
            runNextSweepChunk();
          }
        } catch (err: any) {
          setSweeperConsole(prev => prev + `\n[ERROR] Carts purge failed: ${err.message}`);
          purgeCartsStep = false;
          runNextSweepChunk();
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
          showToast('Backup archive deleted successfully!', 'success');
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
      <div className="flex gap-2 border-b border-pm-border pb-4 mb-6 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveSubTab('backup')}
          className={`pm-sub-tab-btn px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 uppercase tracking-wider border focus:outline-none ${
            activeSubTab === 'backup'
              ? 'bg-pm-card text-pm-primary border-pm-border shadow-sm'
              : 'text-pm-text-secondary hover:text-pm-text border-transparent'
          }`}
        >
          📥 Generate Backup
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('restore')}
          className={`pm-sub-tab-btn px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 uppercase tracking-wider border focus:outline-none ${
            activeSubTab === 'restore'
              ? 'bg-pm-card text-pm-primary border-pm-border shadow-sm'
              : 'text-pm-text-secondary hover:text-pm-text border-transparent'
          }`}
        >
          📤 Restore / Import
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('profiler')}
          className={`pm-sub-tab-btn px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 uppercase tracking-wider border focus:outline-none ${
            activeSubTab === 'profiler'
              ? 'bg-pm-card text-pm-primary border-pm-border shadow-sm'
              : 'text-pm-text-secondary hover:text-pm-text border-transparent'
          }`}
        >
          📈 DB Profiler &amp; Optimize
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('sweeper')}
          className={`pm-sub-tab-btn px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 uppercase tracking-wider border focus:outline-none ${
            activeSubTab === 'sweeper'
              ? 'bg-pm-card text-pm-primary border-pm-border shadow-sm'
              : 'text-pm-text-secondary hover:text-pm-text border-transparent'
          }`}
        >
          🧹 Data Sweeper
        </button>
      </div>

      {/* Pane Content */}
      <div className="transition-all duration-300">
        {/* SUBTAB 1: GENERATE BACKUP */}
        {activeSubTab === 'backup' && (
          <BackupSubTab
            categorizedTables={categorizedTables}
            selectedTables={selectedTables}
            expandedDomains={expandedDomains}
            backupPresets={backupPresets}
            selectedPreset={selectedPreset}
            isBackupRunning={isBackupRunning}
            backupProgressPercent={backupProgressPercent}
            backupProgressText={backupProgressText}
            backups={backups}
            onStartBackup={handleStartBackup}
            onCancelBackup={handleCancelBackup}
            onLoadPreset={handleLoadPreset}
            onSavePreset={handleSavePreset}
            onDeletePreset={handleDeletePreset}
            onSelectAll={handleSelectAll}
            onDomainSelect={handleDomainSelect}
            onTableToggle={handleTableToggle}
            onToggleDomainExpanded={(domain) =>
              setExpandedDomains((prev) => ({ ...prev, [domain]: !prev[domain] }))
            }
            onClearBackupHistory={handleClearBackupHistory}
            onCheckCompareDrift={handleCheckCompareDrift}
            onDeleteBackup={handleDeleteBackup}
            onTogglePinBackup={handleTogglePinBackup}
            resolveDownloadUrl={resolveDownloadUrl}
            formatSqlSize={formatSqlSize}
            formatLogSize={formatLogSize}
            formatDate={formatDate}
            showAlert={showAlert}
          />
        )}

        {activeSubTab === 'restore' && (
          <RestoreSubTab
            backups={backups}
            showShopLiveAlert={showShopLiveAlert}
            selectedUploadFile={selectedUploadFile}
            isUploading={isUploading}
            uploadPercent={uploadPercent}
            isRestoreRunning={isRestoreRunning}
            restoreProgressPercent={restoreProgressPercent}
            restoreProgressText={restoreProgressText}
            restoreStatsExecuted={restoreStatsExecuted}
            restoreStatsAction={restoreStatsAction}
            restoreStatsShop={restoreStatsShop}
            restoreLogTerminal={restoreLogTerminal}
            fileInputRef={fileInputRef}
            onTakeStoreLive={handleTakeStoreLive}
            onDragOver={handleDragOver}
            onFileDrop={handleFileDrop}
            onBrowseFile={handleBrowseFile}
            onCancelUpload={handleCancelUpload}
            onUploadStageFile={handleUploadStageFile}
            onStartRestore={handleStartRestore}
            onDeleteBackup={handleDeleteBackup}
            formatSqlSize={formatSqlSize}
            formatDate={formatDate}
          />
        )}

        {activeSubTab === 'profiler' && (
          <ProfilerSubTab
            profilerReport={profilerReport}
            isProfiling={isProfiling}
            profilerSearch={profilerSearch}
            isBulkOptimizing={isBulkOptimizing}
            bulkOptimizeProgress={bulkOptimizeProgress}
            onFetchProfilerReport={handleFetchProfilerReport}
            onProfilerSearchChange={setProfilerSearch}
            onOptimizeAllTables={handleOptimizeAllTables}
            onOptimizeTable={handleOptimizeTable}
          />
        )}

        {activeSubTab === 'sweeper' && (
          <SweeperSubTab
            retentionDays={retentionDays}
            sweeperStats={sweeperStats}
            orphanedImages={orphanedImages}
            orphanedImagesTotalCount={orphanedImagesTotalCount}
            orphanedImagesSizePretty={orphanedImagesSizePretty}
            isScanningSweeper={isScanningSweeper}
            purgeStats={purgeStats}
            purgeCarts={purgeCarts}
            purgeImages={purgeImages}
            isSweeperRunning={isSweeperRunning}
            sweeperProgressPercent={sweeperProgressPercent}
            sweeperProgressText={sweeperProgressText}
            sweeperConsole={sweeperConsole}
            sweeperAbortedRef={sweeperAbortedRef}
            onRetentionDaysChange={setRetentionDays}
            onSweeperScan={handleSweeperScan}
            onExecuteSweeper={handleExecuteSweeper}
            onPurgeStatsChange={setPurgeStats}
            onPurgeCartsChange={setPurgeCarts}
            onPurgeImagesChange={setPurgeImages}
          />
        )}
      </div>

      {/* COMPARISON DRIFT OVERLAY MODAL (Key Sync Audit Modal matching legacy layout) */}
      {driftModalData && (
        <div className="pm-modal-overlay">
          <div className="pm-modal-card w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="pm-modal-header">
              <span className="pm-modal-title">🛡️ Key Sync Audit: {driftModalData.name}</span>
              <button
                type="button"
                onClick={() => {
                  setDriftModalData(null);
                  setTableRowDiff(null);
                  setActiveDrawer(null);
                }}
                className="pm-modal-close-icon"
              >
                &times;
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-grow space-y-6 text-xs">
              
              {/* Staging Database Integrity Metric Row */}
              <div className="flex justify-between items-center bg-[var(--pm-body-bg)] p-3 rounded-lg border border-[var(--pm-border-color)]">
                <span className="font-bold text-[var(--pm-text-secondary)] uppercase tracking-wider">Staging Database Integrity</span>
                <span
                  className="font-bold uppercase font-sans text-sm"
                  style={{
                    color:
                      driftModalData.added_count === 0 &&
                      driftModalData.deleted_count === 0 &&
                      driftModalData.backup_rows === driftModalData.active_rows
                        ? driftModalData.checksum_drift
                          ? 'var(--pm-warning, #f59e0b)'
                          : 'var(--pm-success, #10b981)'
                        : 'var(--pm-danger, #ef4444)',
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
                <div className="bg-[var(--pm-body-bg)] border border-[var(--pm-border-color)] p-4 rounded-xl">
                  <span className="text-[var(--pm-text-secondary)] block mb-1 uppercase font-bold text-[0.65rem] tracking-wider">Backup Tables Rows</span>
                  <div className="text-2xl font-bold font-sans text-[var(--pm-text-primary)]">{driftModalData.backup_rows.toLocaleString()}</div>
                </div>

                <div className="bg-[var(--pm-body-bg)] border border-[var(--pm-border-color)] p-4 rounded-xl">
                  <span className="text-[var(--pm-text-secondary)] block mb-1 uppercase font-bold text-[0.65rem] tracking-wider">Active Tables Rows</span>
                  <div className="text-2xl font-bold font-sans text-[var(--pm-text-primary)]">{driftModalData.active_rows.toLocaleString()}</div>
                </div>

                <div
                  onClick={() => {
                    if (driftModalData.added_count > 0) setActiveDrawer(activeDrawer === 'added' ? null : 'added');
                  }}
                  className={`border p-4 rounded-xl transition ${
                    driftModalData.added_count > 0
                      ? 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10 cursor-pointer shadow-sm'
                      : 'bg-[var(--pm-body-bg)] border-[var(--pm-border-color)] opacity-50'
                  }`}
                >
                  <span className="text-[var(--pm-text-secondary)] block mb-1 uppercase font-bold text-[0.65rem] tracking-wider">Added Products (Deltas)</span>
                  <div className="text-2xl font-bold font-sans text-emerald-600 dark:text-emerald-400">+{driftModalData.added_count}</div>
                  {driftModalData.added_count > 0 && <span className="text-[0.65rem] text-emerald-600 dark:text-emerald-500 mt-1 block font-semibold">Click to view list</span>}
                </div>

                <div
                  onClick={() => {
                    if (driftModalData.deleted_count > 0) setActiveDrawer(activeDrawer === 'deleted' ? null : 'deleted');
                  }}
                  className={`border p-4 rounded-xl transition ${
                    driftModalData.deleted_count > 0
                      ? 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10 cursor-pointer shadow-sm'
                      : 'bg-[var(--pm-body-bg)] border-[var(--pm-border-color)] opacity-50'
                  }`}
                >
                  <span className="text-[var(--pm-text-secondary)] block mb-1 uppercase font-bold text-[0.65rem] tracking-wider">Deleted Products (Deltas)</span>
                  <div className="text-2xl font-bold font-sans text-red-600 dark:text-red-400">-{driftModalData.deleted_count}</div>
                  {driftModalData.deleted_count > 0 && <span className="text-[0.65rem] text-red-600 dark:text-red-500 mt-1 block font-semibold">Click to view list</span>}
                </div>

                <div
                  onClick={() => {
                    const mCount = getModifiedCount(driftModalData.checksum_status);
                    if (mCount > 0) setActiveDrawer(activeDrawer === 'modified' ? null : 'modified');
                  }}
                  className={`border p-4 rounded-xl transition ${
                    getModifiedCount(driftModalData.checksum_status) > 0
                      ? 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10 cursor-pointer shadow-sm'
                      : 'bg-[var(--pm-body-bg)] border-[var(--pm-border-color)] opacity-50'
                  }`}
                >
                  <span className="text-[var(--pm-text-secondary)] block mb-1 uppercase font-bold text-[0.65rem] tracking-wider">Modified Tables</span>
                  <div className="text-2xl font-bold font-sans text-red-600 dark:text-red-400">
                    {getModifiedCount(driftModalData.checksum_status)}
                  </div>
                  {getModifiedCount(driftModalData.checksum_status) > 0 && <span className="text-[0.65rem] text-red-600 dark:text-red-500 mt-1 block font-semibold">Click to view list</span>}
                </div>

                <div
                  onClick={() => {
                    const vCount = getVolatileCount(driftModalData.checksum_status);
                    if (vCount > 0) setActiveDrawer(activeDrawer === 'volatile' ? null : 'volatile');
                  }}
                  className={`border p-4 rounded-xl transition ${
                    getVolatileCount(driftModalData.checksum_status) > 0
                      ? 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10 cursor-pointer shadow-sm'
                      : 'bg-[var(--pm-body-bg)] border-[var(--pm-border-color)] opacity-50'
                  }`}
                >
                  <span className="text-[var(--pm-text-secondary)] block mb-1 uppercase font-bold text-[0.65rem] tracking-wider">Volatile Tables</span>
                  <div className="text-2xl font-bold font-sans text-amber-600 dark:text-amber-400">
                    {getVolatileCount(driftModalData.checksum_status)}
                  </div>
                  {getVolatileCount(driftModalData.checksum_status) > 0 && <span className="text-[0.65rem] text-amber-600 dark:text-amber-500 mt-1 block font-semibold">Click to view list</span>}
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
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">${parseFloat(p.price).toFixed(2)}</span>
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
                                color: 'var(--pm-danger, #ef4444)',
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
                              <span className="text-red-600 dark:text-red-400 line-through font-bold">${parseFloat(p.price).toFixed(2)}</span>
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
                              className="text-[0.65rem] text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 hover:underline font-bold cursor-pointer"
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
                            <span className="text-[0.65rem] text-amber-600 dark:text-amber-400 font-bold uppercase">Volatile Logs</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {isLoadingRowDiff ? (
                <div className="bg-pm-input/30 border border-pm-border p-4 rounded-xl text-center text-pm-text-secondary font-mono">
                  ⌛ Loading row difference telemetry...
                </div>
              ) : tableRowDiff && (
                <div className="bg-pm-input/30 border border-pm-border p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center font-bold text-pm-text border-b border-pm-border pb-2">
                    <span>Table Row Modifications: {tableRowDiff.table}</span>
                    <div className="flex gap-3 text-[0.7rem]">
                      <span className="text-emerald-500">+{tableRowDiff.summary.added} Added</span>
                      <span className="text-red-500">-{tableRowDiff.summary.deleted} Deleted</span>
                      <span className="text-amber-500">~{tableRowDiff.summary.modified} Modified</span>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2">
                    {/* Modified Rows */}
                    {tableRowDiff.modified_rows?.map((r: any, idx: number) => (
                      <div key={idx} className="p-3 bg-pm-card border-amber-500/30 border border-l-4 rounded-r-lg space-y-2">
                        <span className="font-mono text-pm-text font-bold block">PK Index: {r.pk}</span>
                        {Object.keys(r.changes).map(col => (
                          <div key={col} className="bg-pm-input/50 p-2 rounded text-[0.7rem] leading-relaxed border border-pm-border">
                            <span className="text-pm-text-secondary font-mono">{col}: </span>
                            <span className="text-red-500 line-through mr-2 font-mono">{String(r.changes[col].backup || 'NULL')}</span>
                            <span className="text-emerald-500 font-mono">{String(r.changes[col].live || 'NULL')}</span>
                          </div>
                        ))}
                      </div>
                    ))}

                    {/* Added Rows */}
                    {tableRowDiff.added_rows?.map((r: any, idx: number) => (
                      <div key={idx} className="p-3 bg-pm-card border-emerald-500/30 border border-l-4 rounded-r-lg">
                        <span className="font-mono text-emerald-500 font-bold block mb-2">Added Row Data</span>
                        {Object.keys(r).map(col => (
                          <div key={col} className="text-[0.7rem] text-pm-text-secondary">
                            <span className="text-pm-text-secondary/60">{col}: </span>
                            <span className="font-mono text-pm-text">{String(r[col] || 'NULL')}</span>
                          </div>
                        ))}
                      </div>
                    ))}

                    {/* Deleted Rows */}
                    {tableRowDiff.deleted_rows?.map((r: any, idx: number) => (
                      <div key={idx} className="p-3 bg-pm-card border-red-500/30 border border-l-4 rounded-r-lg">
                        <span className="font-mono text-red-500 font-bold block mb-2">Deleted Row Data</span>
                        {Object.keys(r).map(col => (
                          <div key={col} className="text-[0.7rem] line-through text-pm-text-secondary/50">
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
                <span className="font-bold text-pm-text-secondary uppercase tracking-wider block text-xs">Database Tables Content Integrity</span>
                <div className="max-h-[220px] overflow-y-auto bg-pm-input/30 border border-pm-border rounded-lg p-3 space-y-2">
                  {driftModalData.checksum_status &&
                    Object.keys(driftModalData.checksum_status).map(tbl => {
                      const c = driftModalData.checksum_status[tbl];
                      const isMatch = c.match === true;
                      const isVolatile = c.volatile === true;

                      return (
                        <div key={tbl} className="flex justify-between items-center py-2 border-b border-pm-border last:border-b-0">
                          <div>
                            <span className="font-mono font-semibold text-pm-text block">{tbl}</span>
                            <span className="text-[0.65rem] text-pm-text-secondary">
                              Rows: {c.backup_rows} ➔ {c.active_rows}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[0.7rem] text-pm-text-secondary">
                              {c.backup ? c.backup : 'N/A'} ➔ {c.active}
                            </span>
                            <span className={`pm-status-pill ${
                              isMatch ? 'success' :
                              isVolatile ? 'warning' : 'danger'
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
                <pre className="pm-log-terminal">
                  {driftModalData.log_metadata}
                </pre>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--pm-border-color)] bg-[var(--pm-body-bg)]/20 flex justify-end">
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
        <div className="pm-modal-overlay">
          <div className="pm-modal-card w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="pm-modal-header">
              <span className="pm-modal-title">
                {inspectAllModal.title} ({inspectAllModal.items.length})
              </span>
              <button
                type="button"
                onClick={() => setInspectAllModal(null)}
                className="pm-modal-close-icon"
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
            <div className="p-4 border-t border-[var(--pm-border-color)] bg-[var(--pm-body-bg)]/20 flex justify-end">
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

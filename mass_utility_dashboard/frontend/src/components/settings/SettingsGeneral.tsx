// @Arch[SettingsGeneral]
// @Description: Renders the general configuration options, backup retention limits, Google Drive connection panel, safety dry run inputs, and CPU governor toggles.
// @Calls: save_settings, get_auth_status, disconnect_google_drive

import React, { useState, useEffect } from 'react';
import { FetchService } from '../../utils/FetchService';
import { useModal } from '../../utils/overlay';

interface SettingsGeneralProps {
  settings: Record<string, any>;
  onSave: (updated: Record<string, any>) => Promise<void>;
  isSaving: boolean;
}

interface Capabilities {
  backup_destinations: string[];
  backup_automation: boolean;
  rollback_history_limit: number;
  query_visual_execute: boolean;
  governor_autopilot: boolean;
  sweeper_execution: boolean;
}

export const SettingsGeneral: React.FC<SettingsGeneralProps> = ({ settings, onSave, isSaving }) => {
  // Form State variables
  const [governorMode, setGovernorMode] = useState<'auto' | 'manual'>('auto');
  const [fileChunk, setFileChunk] = useState('60');
  const [dbChunk, setDbChunk] = useState('5000');
  const [defaultDryRun, setDefaultDryRun] = useState(true);
  const [gdriveDefaultDownload, setGdriveDefaultDownload] = useState('cloud');
  const [cleanupBackups, setCleanupBackups] = useState('1');
  const [uiFont, setUiFont] = useState('system-ui, -apple-system, sans-serif');
  const [uiTheme, setUiTheme] = useState('classic');
  const [customQuota, setCustomQuota] = useState('0');
  const [backupMaxCount, setBackupMaxCount] = useState('0');
  const [backupMaxDays, setBackupMaxDays] = useState('0');
  const [backupCloudMaxCount, setBackupCloudMaxCount] = useState('0');
  const [backupCloudMaxDays, setBackupCloudMaxDays] = useState('0');
  const [backupFrequency, setBackupFrequency] = useState('0');
  const [backupCronAuto, setBackupCronAuto] = useState(true);

  // Google Drive Connection State
  const [gdriveState, setGdriveState] = useState<{
    authenticated: boolean;
    configured: boolean;
    authUrl: string;
    syncedCount: number;
  }>({
    authenticated: false,
    configured: false,
    authUrl: '',
    syncedCount: 0,
  });

  const [isGdriveChecking, setIsGdriveChecking] = useState(true);
  const [isGdriveDisconnecting, setIsGdriveDisconnecting] = useState(false);

  // Safety warning states
  const [dbWarning, setDbWarning] = useState('');
  const [fileWarning, setFileWarning] = useState('');

  // Capabilities
  const [capabilities, setCapabilities] = useState<Capabilities>({
    backup_destinations: ['local'],
    backup_automation: false,
    rollback_history_limit: 0,
    query_visual_execute: false,
    governor_autopilot: false,
    sweeper_execution: false,
  });
  const [tierName, setTierName] = useState('unlicensed');

  // Hydrate settings
  useEffect(() => {
    if (!settings) return;

    // Decode capabilities from token
    let cap: Capabilities = {
      backup_destinations: ['local'],
      backup_automation: false,
      rollback_history_limit: 0,
      query_visual_execute: false,
      governor_autopilot: false,
      sweeper_execution: false,
    };
    let tier = 'unlicensed';

    if ((window as any).isDemoMode) {
      tier = 'enterprise';
      cap = {
        backup_destinations: ['local', 'gdrive'],
        backup_automation: true,
        rollback_history_limit: 100,
        query_visual_execute: true,
        governor_autopilot: true,
        sweeper_execution: true,
      };
    } else if (settings.PM_LICENSE_TOKEN) {
      try {
        const payloadStr = window.atob(settings.PM_LICENSE_TOKEN);
        const payload = JSON.parse(payloadStr);
        tier = payload.tier || 'basic';
        if (payload.features && payload.features.capabilities) {
          cap = payload.features.capabilities;
        } else {
          const isPro = tier === 'pro' || tier === 'developer';
          const isDev = tier === 'developer';
          cap = {
            backup_destinations: isPro ? ['local', 'gdrive'] : ['local'],
            backup_automation: isPro,
            rollback_history_limit: isDev ? 999 : (isPro ? 10 : 0),
            query_visual_execute: isPro,
            governor_autopilot: isPro,
            sweeper_execution: isPro,
          };
        }
      } catch (e) {
        console.error('Failed to decode license token:', e);
      }
    }

    setCapabilities(cap);
    setTierName(tier);

    // Hydrate form states
    setGovernorMode(!cap.governor_autopilot ? 'manual' : (settings.PM_GOVERNOR_MODE || 'auto'));
    setFileChunk(settings.PM_FILE_CHUNK_MB || '60');
    setDbChunk(settings.PM_DB_CHUNK_ROWS || '5000');
    setDefaultDryRun(parseInt(settings.PM_DEFAULT_DRY_RUN ?? '1') === 1);
    setGdriveDefaultDownload(settings.PM_GDRIVE_DEFAULT_DOWNLOAD || 'cloud');
    setCleanupBackups(settings.PM_CLEANUP_BACKUPS !== undefined ? String(settings.PM_CLEANUP_BACKUPS) : '1');
    setUiFont(settings.PM_UI_FONT || 'system-ui, -apple-system, sans-serif');
    setUiTheme(settings.PM_UI_THEME || 'classic');
    setCustomQuota(settings.PM_CUSTOM_DISK_QUOTA_GB || '0');
    
    const hasHistoryLimit = cap.rollback_history_limit > 0;
    setBackupMaxCount(hasHistoryLimit ? (settings.PM_BACKUP_MAX_COUNT || '0') : '0');
    setBackupMaxDays(hasHistoryLimit ? (settings.PM_BACKUP_MAX_DAYS || '0') : '0');
    setBackupCloudMaxCount(hasHistoryLimit ? (settings.PM_BACKUP_CLOUD_MAX_COUNT || '0') : '0');
    setBackupCloudMaxDays(hasHistoryLimit ? (settings.PM_BACKUP_CLOUD_MAX_DAYS || '0') : '0');

    setBackupFrequency(settings.PM_BACKUP_FREQUENCY || '0');
    setBackupCronAuto(cap.backup_automation ? (parseInt(settings.PM_BACKUP_CRON_AUTO ?? '1') === 1) : false);

    checkGdriveStatus();
  }, [settings]);

  // Listen for OAuth success message from callback popup window
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'google_drive_auth_success') {
        if (typeof (window as any).showPremiumToast === 'function') {
          (window as any).showPremiumToast('Google Drive connected successfully!', 'success');
        }
        checkGdriveStatus();
      }
    };
    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, []);

  // Evaluate warnings on change
  useEffect(() => {
    const cores = (window as any).PM_CONFIG?.cores ?? 2;

    const rows = parseInt(dbChunk);
    if (cores <= 2 && rows > 5000) {
      setDbWarning('⚠️ Warning: Fetching >5,000 rows on a 2-core environment risks Out-of-Memory crashes.');
    } else if (cores <= 4 && rows > 10000) {
      setDbWarning('⚠️ Warning: Fetching >10,000 rows requires significant DB limits. Use caution.');
    } else {
      setDbWarning('');
    }

    const mb = parseInt(fileChunk);
    if (cores <= 2 && mb > 30) {
      setFileWarning('⚠️ Warning: Archiving >30MB chunks on shared hosting typically hits process timeouts.');
    } else {
      setFileWarning('');
    }
  }, [fileChunk, dbChunk]);

  const checkGdriveStatus = async () => {
    setIsGdriveChecking(true);
    try {
      const data = await FetchService.post('get_auth_status');
      setGdriveState({
        authenticated: data.authenticated,
        configured: data.configured,
        authUrl: data.auth_url || '',
        syncedCount: (data.synced_files || []).length,
      });
    } catch (err: any) {
      console.error('Gdrive check failed:', err);
      setGdriveState({
        authenticated: false,
        configured: false,
        authUrl: '',
        syncedCount: 0,
      });
    } finally {
      setIsGdriveChecking(false);
    }
  };

  const handleConnectGdrive = () => {
    if (gdriveState.authUrl) {
      const popup = window.open(gdriveState.authUrl, 'GoogleDriveOAuth', 'width=600,height=650,left=150,top=100');
      
      const checkPopupClosed = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkPopupClosed);
          checkGdriveStatus();
        }
      }, 1000);
    }
  };

  const { showAlert, showConfirm } = useModal();
  const handleDisconnectGdrive = async () => {
    showConfirm('Disconnect Cloud Storage', 'Are you sure you want to disconnect Google Drive? This will reset cloud cache configurations.', 'DISCONNECT', async () => {
      setIsGdriveDisconnecting(true);
      try {
        await FetchService.post('disconnect_google_drive');
        checkGdriveStatus();
        showAlert('Cloud Storage Disconnected', 'Google Drive account disconnected successfully.', 'info');
      } catch (err: any) {
        showAlert('Disconnect Failed', 'Error disconnecting: ' + err.message, 'error');
      } finally {
        setIsGdriveDisconnecting(false);
      }
    });
  };

  const handleSave = () => {
    const payload = {
      PM_GOVERNOR_MODE: governorMode,
      PM_FILE_CHUNK_MB: fileChunk,
      PM_FILE_EXCLUSIONS: settings.PM_FILE_EXCLUSIONS || '',
      PM_DB_CHUNK_ROWS: dbChunk,
      PM_ENABLE_FILE_TOOLS: 1,
      PM_ENABLE_DB_TOOLS: 1,
      PM_ENABLE_QUERY_WIZARD: 1,
      PM_ENABLE_HISTORY: 1,
      PM_ENABLE_GHOST_PURGER: 1,
      PM_ENABLE_GDPR_SWEEPER: 1,
      PM_DEFAULT_DRY_RUN: defaultDryRun ? 1 : 0,
      PM_GDRIVE_DEFAULT_DOWNLOAD: gdriveDefaultDownload,
      PM_CLEANUP_BACKUPS: parseInt(cleanupBackups),
      PM_UI_FONT: uiFont,
      PM_UI_THEME: uiTheme,
      PM_CUSTOM_DISK_QUOTA_GB: customQuota,
      PM_BACKUP_MAX_COUNT: backupMaxCount,
      PM_BACKUP_MAX_DAYS: backupMaxDays,
      PM_BACKUP_CLOUD_MAX_COUNT: backupCloudMaxCount,
      PM_BACKUP_CLOUD_MAX_DAYS: backupCloudMaxDays,
      PM_BACKUP_FREQUENCY: backupFrequency,
      PM_BACKUP_CRON_AUTO: backupCronAuto ? 1 : 0,
    };
    onSave(payload);
  };

  const isCloudEnabled = capabilities.backup_destinations?.includes('gdrive');
  const isHistoryEnabled = capabilities.rollback_history_limit > 0;

  return (
    <div className="space-y-6">
      {(() => {
        const licStatus = String(settings.PM_LICENSE_STATUS || '').toLowerCase();
        const isDemo = (window as any).isDemoMode === true;
        const isUnlicensed = !isDemo && (!settings.PM_LICENSE_KEY || tierName === 'unlicensed' || tierName === 'free' || ['revoked', 'suspended', 'expired'].includes(licStatus));
        return (
          <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full shadow-lg animate-pulse ${isUnlicensed ? 'bg-pm-danger shadow-pm-danger/50' : 'bg-pm-success shadow-pm-success/50'}`}></div>
                <h3 className="text-md font-bold tracking-wide text-pm-text uppercase">⭐️ License Subscription Details</h3>
              </div>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border uppercase ${isUnlicensed ? 'bg-pm-danger/10 text-pm-danger border-pm-danger/20' : 'bg-pm-success/10 text-pm-success border-pm-success/20'}`}>
                {isUnlicensed ? 'No Active License' : 'Active Enterprise Demo License'}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-pm-border">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-pm-text-secondary uppercase tracking-wider block mb-1">License Subscription Key</label>
                  <div className="font-mono text-lg font-bold text-pm-warning tracking-wider py-1">
                    {isDemo ? 'PM-DEMO-ENTERPRISE-KEY' : (!isUnlicensed && settings.PM_LICENSE_KEY ? `${settings.PM_LICENSE_KEY.substring(0, 9)}-••••-••••-••••` : 'NO ACTIVE LICENSE')}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-pm-text-secondary uppercase tracking-wider block mb-1">Subscription Package Tier</label>
                  <div className="text-md font-extrabold text-pm-primary uppercase tracking-wider py-1">
                    {isDemo ? 'ENTERPRISE TIER' : (!isUnlicensed ? `${tierName.toUpperCase()} TIER` : 'NO ACTIVE LICENSE')}
                  </div>
                </div>
              </div>

              <div className="md:border-l border-pm-border md:pl-6">
                <label className="text-xs font-semibold text-pm-text-secondary uppercase tracking-wider block mb-3">Active Feature Capabilities</label>
                <ul className="grid grid-cols-1 gap-2.5 text-xs text-pm-text-secondary">
                  <li className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 bg-pm-success rounded-full"></span> Raw SQL Execution (Terminal)
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 bg-pm-success rounded-full"></span> Local Backups (Manual)
                  </li>
                  <li className={`flex items-center gap-2.5 ${!capabilities.query_visual_execute ? 'text-pm-text-secondary/75' : ''}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${capabilities.query_visual_execute ? 'bg-pm-success' : 'bg-pm-text-secondary/60'}`}></span>
                    Visual Query Builder (AST Editor) {!capabilities.query_visual_execute && <span className="text-[0.65rem] bg-pm-input text-pm-text-secondary font-bold px-1.5 py-0.5 rounded ml-2 uppercase">PRO LOCK</span>}
                  </li>
                  <li className={`flex items-center gap-2.5 ${!isCloudEnabled ? 'text-pm-text-secondary/75' : ''}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isCloudEnabled ? 'bg-pm-success' : 'bg-pm-text-secondary/60'}`}></span>
                    Offsite Cloud Backup (Google Drive) {!isCloudEnabled && <span className="text-[0.65rem] bg-pm-input text-pm-text-secondary font-bold px-1.5 py-0.5 rounded ml-2 uppercase">PRO LOCK</span>}
                  </li>
                  <li className={`flex items-center gap-2.5 ${!capabilities.backup_automation ? 'text-pm-text-secondary/75' : ''}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${capabilities.backup_automation ? 'bg-pm-success' : 'bg-pm-text-secondary/60'}`}></span>
                    Scheduled Backups (Cron CLI) {!capabilities.backup_automation && <span className="text-[0.65rem] bg-pm-input text-pm-text-secondary font-bold px-1.5 py-0.5 rounded ml-2 uppercase">PRO LOCK</span>}
                  </li>
                  <li className={`flex items-center gap-2.5 ${!capabilities.governor_autopilot ? 'text-pm-text-secondary/75' : ''}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${capabilities.governor_autopilot ? 'bg-pm-success' : 'bg-pm-text-secondary/60'}`}></span>
                    Safety Auto-Pilot Tuning {!capabilities.governor_autopilot && <span className="text-[0.65rem] bg-pm-input text-pm-text-secondary font-bold px-1.5 py-0.5 rounded ml-2 uppercase">PRO LOCK</span>}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Cloud Sync & Retention Control Card */}
      <div className={`bg-pm-card border border-pm-border rounded-xl p-6 shadow-xl transition-opacity duration-300 ${!isCloudEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-pm-purple rounded-full shadow-lg shadow-pm-purple/50"></span>
            <h3 className="text-md font-bold tracking-wide text-pm-text uppercase">☁️ Cloud Backup & Retention Policies</h3>
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border uppercase ${
            isGdriveChecking ? 'bg-pm-input text-pm-text-secondary border-pm-border' :
            gdriveState.authenticated ? 'bg-pm-success/10 text-pm-success border-pm-success/20' : 'bg-pm-danger/10 text-pm-danger border-pm-danger/20'
          }`}>
            {isGdriveChecking ? 'Checking...' : gdriveState.authenticated ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <p className="text-sm text-pm-text-secondary mb-6 leading-relaxed">
          Configure Google Drive offsite storage integration, manage local and cloud retention policies, and schedule background backup crons.
        </p>

        {/* OAuth Connection Panel */}
        <div className="bg-pm-purple/5 border border-pm-purple/20 rounded-lg p-5 mb-6 flex justify-between items-center flex-wrap gap-4">
          <div>
            <strong className="text-sm text-pm-text block mb-1">
              {isGdriveChecking ? 'Verifying cloud credentials...' : gdriveState.authenticated ? 'Authorized with Google Cloud' : 'Access Authorization Needed'}
            </strong>
            <span className="text-xs text-pm-text-secondary block">
              {isGdriveChecking ? 'Querying integration status...' : gdriveState.authenticated ? `Active Session | Synced Backups: ${gdriveState.syncedCount}` : 'Provide tenant access to transfer archive streams.'}
            </span>
          </div>

          <div className="flex gap-3">
            {!gdriveState.authenticated && gdriveState.configured && (
              <button
                type="button"
                onClick={handleConnectGdrive}
                className="bg-pm-primary hover:bg-opacity-90 text-white text-xs font-bold px-5 py-2.5 rounded-lg shadow-lg hover:shadow-pm-primary/20 transition-all uppercase"
              >
                ⚡ Authenticate & Connect
              </button>
            )}
            {gdriveState.authenticated && (
              <button
                type="button"
                disabled={isGdriveDisconnecting}
                onClick={handleDisconnectGdrive}
                className="bg-pm-danger/15 hover:bg-pm-danger/25 text-pm-danger border border-pm-danger/25 text-xs font-bold px-5 py-2.5 rounded-lg transition-all uppercase"
              >
                {isGdriveDisconnecting ? 'Disconnecting...' : '🔌 Disconnect Account'}
              </button>
            )}
          </div>
        </div>

        {/* Dual Tier Retention Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-pm-border mb-6">
          <div className="p-5 border border-pm-border rounded-xl bg-pm-input/50">
            <h4 className="text-sm font-bold text-pm-text mb-4 flex items-center gap-2">💾 Local Retention (Host Server)</h4>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-pm-text-secondary block mb-1.5">Max Local Backups to Keep</label>
                <input
                  type="number"
                  disabled={!isHistoryEnabled}
                  value={backupMaxCount}
                  onChange={e => setBackupMaxCount(e.target.value)}
                  className="bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text w-full focus:outline-none focus:border-pm-primary/50 disabled:opacity-50"
                  min="0"
                />
                <p className="text-[0.7rem] text-pm-text-secondary mt-1">Set to 0 for infinite backups (never delete).</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-pm-text-secondary block mb-1.5">Max Local Age (Days)</label>
                <input
                  type="number"
                  disabled={!isHistoryEnabled}
                  value={backupMaxDays}
                  onChange={e => setBackupMaxDays(e.target.value)}
                  className="bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text w-full focus:outline-none focus:border-pm-primary/50 disabled:opacity-50"
                  min="0"
                />
                <p className="text-[0.7rem] text-pm-text-secondary mt-1">Set to 0 to keep backups regardless of age.</p>
              </div>
            </div>
          </div>

          <div className="p-5 border border-amber-500/20 rounded-xl bg-amber-500/5 dark:bg-amber-500/10">
            <h4 className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-4 flex items-center gap-2">☁️ Cloud Retention (Google Drive)</h4>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-pm-text-secondary block mb-1.5">Max Cloud Backups to Keep</label>
                <input
                  type="number"
                  disabled={!isHistoryEnabled || !gdriveState.authenticated}
                  value={backupCloudMaxCount}
                  onChange={e => setBackupCloudMaxCount(e.target.value)}
                  className="bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text w-full focus:outline-none focus:border-pm-primary/50 disabled:opacity-50"
                  min="0"
                />
                <p className="text-[0.7rem] text-pm-text-secondary mt-1">Set to 0 for infinite cloud backups.</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-pm-text-secondary block mb-1.5">Max Cloud Age (Days)</label>
                <input
                  type="number"
                  disabled={!isHistoryEnabled || !gdriveState.authenticated}
                  value={backupCloudMaxDays}
                  onChange={e => setBackupCloudMaxDays(e.target.value)}
                  className="bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text w-full focus:outline-none focus:border-pm-primary/50 disabled:opacity-50"
                  min="0"
                />
                <p className="text-[0.7rem] text-pm-text-secondary mt-1">Set to 0 to ignore cloud backup age limits.</p>
              </div>
            </div>
          </div>
        </div>

        {/* General Backup Configs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-pm-border mb-6">
          <div>
            <label className={`text-xs font-semibold block mb-1.5 ${!gdriveState.authenticated ? 'text-pm-text-secondary' : 'text-pm-text'}`}>Default Download Source</label>
            <select
              disabled={!isHistoryEnabled || !gdriveState.authenticated}
              value={!gdriveState.authenticated ? 'local' : gdriveDefaultDownload}
              onChange={e => setGdriveDefaultDownload(e.target.value)}
              className="bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text w-full focus:outline-none focus:border-pm-primary/50 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <option value="cloud">Cloud (Google Drive)</option>
              <option value="local">Local Filesystem</option>
            </select>
            {!gdriveState.authenticated && (
              <p className="text-[0.7rem] text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1 font-medium">
                🔒 Requires an active Google Cloud connection.
              </p>
            )}
          </div>
          <div>
            <label className={`text-xs font-semibold block mb-1.5 ${!gdriveState.authenticated ? 'text-pm-text-secondary' : 'text-pm-text'}`}>Delete local copy after successful Cloud Sync</label>
            <select
              disabled={!isHistoryEnabled || !gdriveState.authenticated}
              value={!gdriveState.authenticated ? '0' : cleanupBackups}
              onChange={e => setCleanupBackups(e.target.value)}
              className="bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text w-full focus:outline-none focus:border-pm-primary/50 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <option value="1">Yes (Delete local file immediately on successful upload)</option>
              <option value="0">No (Retain local copies, manage via Local Retention)</option>
            </select>
            {!gdriveState.authenticated && (
              <p className="text-[0.7rem] text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1 font-medium">
                🔒 Requires an active Google Cloud connection.
              </p>
            )}
          </div>
        </div>

        {/* Cron options */}
        <div className="pt-6 border-t border-pm-border space-y-4">
          <div>
            <label className="text-xs font-semibold text-pm-text block mb-1.5">Backup Frequency Throttle</label>
            <select
              disabled={!backupCronAuto}
              value={backupFrequency}
              onChange={e => setBackupFrequency(e.target.value)}
              className="bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text w-full focus:outline-none focus:border-pm-primary/50 disabled:opacity-50"
            >
              <option value="0">No Throttling (Always execute backup when triggered)</option>
              <option value="3600">Hourly (Minimum 1 hour between backups)</option>
              <option value="86400">Daily (Minimum 24 hours between backups)</option>
              <option value="604800">Weekly (Minimum 7 days between backups)</option>
              <option value="2592000">Monthly (Minimum 30 days between backups)</option>
            </select>
          </div>

          <label className={`flex items-start gap-3 cursor-pointer ${!capabilities.backup_automation ? 'opacity-50 pointer-events-none' : ''}`}>
            <input
              type="checkbox"
              checked={backupCronAuto}
              onChange={e => setBackupCronAuto(e.target.checked)}
              className="w-4 h-4 bg-pm-input border border-pm-border rounded text-pm-primary focus:ring-0 focus:ring-offset-0 mt-0.5"
            />
            <div>
              <span className="text-sm font-semibold text-pm-text block">Enable Scheduled Background Backups (via Cron CLI)</span>
              <span className="text-xs text-pm-text-secondary block mt-0.5">
                If disabled, automated crontab execution calls of cli_backup.php will exit early. Manual backups remain functional.
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* CPU Governor card */}
      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <div>
            <h3 className="text-md font-bold tracking-wide text-pm-text uppercase flex items-center gap-3">
              <span className="w-3 h-3 bg-pm-primary rounded-full shadow-lg shadow-pm-primary/50"></span>
              ⚡ Engine Performance Mode
            </h3>
            <p className="text-sm text-pm-text-secondary mt-1 max-w-xl leading-relaxed">
              Controls the CPU governor. Automatically throttles SQL queries and TAR compression based on real-time server load.
            </p>
          </div>

          {/* Governor Pill slider */}
          <div className="flex bg-pm-input border border-pm-border p-1 rounded-xl text-xs font-bold relative w-[320px] shadow-inner">
            <div
              className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-pm-primary text-white shadow-md shadow-pm-primary/40 border border-pm-primary/80 rounded-lg transition-transform duration-300 ease-out pointer-events-none ${
                governorMode === 'manual' ? 'translate-x-full' : 'translate-x-0'
              }`}
            ></div>
            
            <button
              type="button"
              disabled={!capabilities.governor_autopilot}
              onClick={() => setGovernorMode('auto')}
              className={`flex-1 py-2 text-center rounded-lg z-10 transition-all uppercase tracking-wider font-semibold ${
                governorMode === 'auto' ? 'text-white shadow-sm' : 'text-pm-text-secondary hover:text-pm-text'
              }`}
            >
              🤖 Auto-Pilot
            </button>
            <button
              type="button"
              onClick={() => setGovernorMode('manual')}
              className={`flex-1 py-2 text-center rounded-lg z-10 transition-all uppercase tracking-wider font-semibold ${
                governorMode === 'manual' ? 'text-white shadow-sm' : 'text-pm-text-secondary hover:text-pm-text'
              }`}
            >
              ⚙️ Manual Settings
            </button>
          </div>
        </div>

        {/* Governor Settings Container */}
        <div className="relative mt-6">
          {governorMode === 'auto' && (
            <div className="absolute inset-0 bg-pm-body/40 backdrop-blur-[2px] z-10 flex justify-center items-center rounded-xl border border-pm-border">
              <div className="bg-pm-input text-xs font-semibold px-4 py-2.5 rounded-full border border-pm-border shadow-2xl flex items-center gap-2 text-pm-text">
                <span>🔒</span> Currently managed by 🤖 Auto-Pilot. Toggle to Manual mode to override values.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 border border-pm-border rounded-xl bg-pm-input/30">
              <label className="text-xs font-semibold text-pm-text block mb-2">TAR Streaming Append Threshold (MB)</label>
              <select
                value={fileChunk}
                onChange={e => setFileChunk(e.target.value)}
                className="bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text w-full focus:outline-none focus:border-pm-primary/50 mb-2"
              >
                <option value="10">10 MB (Ultra Safe - Shared Hosting)</option>
                <option value="20">20 MB (Safe - Shared Hosting)</option>
                <option value="30">30 MB (Standard - cPanel)</option>
                <option value="40">40 MB (Standard - cPanel)</option>
                <option value="60">60 MB (Fast - VPS)</option>
                <option value="120">120 MB (Extreme - Dedicated Server)</option>
              </select>
              {fileWarning && <div className="text-xs text-pm-danger font-medium px-1 mt-1">{fileWarning}</div>}
            </div>

            <div className="p-5 border border-pm-border rounded-xl bg-pm-input/30">
              <label className="text-xs font-semibold text-pm-text block mb-2">Database Backup Row Chunk</label>
              <select
                value={dbChunk}
                onChange={e => setDbChunk(e.target.value)}
                className="bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text w-full focus:outline-none focus:border-pm-primary/50 mb-2"
              >
                <option value="250">250 Rows (Ultra Safe)</option>
                <option value="500">500 Rows (Ultra Safe)</option>
                <option value="1000">1,000 Rows (Safe)</option>
                <option value="2500">2,500 Rows</option>
                <option value="5000">5,000 Rows (Standard)</option>
                <option value="10000">10,000 Rows (Fast)</option>
                <option value="20000">20,000 Rows (Extreme)</option>
              </select>
              {dbWarning && <div className="text-xs text-pm-danger font-medium px-1 mt-1">{dbWarning}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Safety Guards & Disk Overrides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-xl space-y-4">
          <h3 className="text-md font-bold tracking-wide text-pm-text uppercase flex items-center gap-3">
            <span className="w-3 h-3 bg-pm-success rounded-full shadow-lg shadow-pm-success/50"></span>
            🛡️ Safety Guards
          </h3>
          <p className="text-sm text-pm-text-secondary leading-relaxed">
            Protect your database against accidental mass updates by forcing queries to simulate execution before going live.
          </p>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={defaultDryRun}
              onChange={e => setDefaultDryRun(e.target.checked)}
              className="w-4 h-4 bg-pm-input border border-pm-border rounded text-pm-primary focus:ring-0 focus:ring-offset-0"
            />
            <span className="text-sm font-semibold text-pm-text">Enforce "Dry Run (Simulate)" By Default</span>
          </label>

          <div className="bg-pm-success/5 border-l-2 border-pm-success rounded p-4 text-xs text-pm-text-secondary leading-relaxed">
            <strong className="text-pm-success block mb-1">What does Simulation Mode do?</strong>
            It compiles your visual blocks into SQL and performs a strict read-only validation. It returns the exact rows that would be affected before executing.
          </div>
        </div>

        <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-xl space-y-4">
          <h3 className="text-md font-bold tracking-wide text-pm-text uppercase flex items-center gap-3">
            <span className="w-3 h-3 bg-pm-danger rounded-full shadow-lg shadow-pm-danger/50"></span>
            ⚙️ Server Environment Fallbacks
          </h3>
          <p className="text-sm text-pm-text-secondary leading-relaxed">
            Only use these if the dashboard fails to auto-detect your hosting limits.
          </p>

          <div>
            <label className="text-xs font-semibold text-pm-text block mb-1.5">Override cPanel Disk Quota (GB)</label>
            <input
              type="number"
              value={customQuota}
              onChange={e => setCustomQuota(e.target.value)}
              className="bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text w-full focus:outline-none focus:border-pm-primary/50"
              placeholder="0 for Auto"
              min="0"
              step="0.5"
            />
            <p className="text-[0.7rem] text-pm-text-secondary mt-1.5">If your host disables UAPI access, enter your SSD limit (e.g. 20) to calibrate metrics.</p>
          </div>
        </div>
      </div>

      {/* UI Customizations */}
      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-xl">
        <h3 className="text-md font-bold tracking-wide text-pm-text uppercase flex items-center gap-3 mb-6">
          <span className="w-3 h-3 bg-pm-primary rounded-full shadow-lg shadow-pm-primary/50"></span>
          🎨 UI & Appearance
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-semibold text-pm-text block mb-1.5">Base Typography</label>
            <select
              value={uiFont}
              onChange={e => {
                setUiFont(e.target.value);
                document.documentElement.style.setProperty('--pm-font-family', e.target.value);
              }}
              className="bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text w-full focus:outline-none focus:border-pm-primary/50"
            >
              <option value="system-ui, -apple-system, sans-serif">System Native (Fastest, Default)</option>
              <option value="Inter, sans-serif">Inter (Apple-like)</option>
              <option value="Outfit, sans-serif">Outfit (Modern, Geometric)</option>
              <option value="Roboto, sans-serif">Roboto (Android-like)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-pm-text block mb-1.5">Dashboard UI Theme</label>
            <select
              value={uiTheme}
              onChange={e => setUiTheme(e.target.value)}
              className="bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text w-full focus:outline-none focus:border-pm-primary/50"
            >
              <option value="classic">Classic Obsidian (Default)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <button
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className="bg-pm-success hover:bg-opacity-95 disabled:bg-pm-input disabled:text-pm-text-secondary text-white text-md font-bold px-8 py-3 rounded-lg shadow-lg hover:shadow-pm-success/25 transition-all uppercase flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Saving Settings...
            </>
          ) : (
            '💾 Save Global Settings'
          )}
        </button>
      </div>
    </div>
  );
};

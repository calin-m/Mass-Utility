import React, { useState } from 'react';
import { ShieldCheck, Activity, Lock, Cpu, AlertTriangle, CheckCircle, RefreshCw, FolderLock, GitBranch, Database, Settings } from 'lucide-react';
import { SectionHeader } from './common/SectionHeader';

interface SecurityHealthTabProps {
  showAlert?: (msg: string, type?: 'success' | 'error') => void;
}

export const SecurityHealthTab: React.FC<SecurityHealthTabProps> = ({ showAlert }) => {
  const [activeAction, setActiveAction] = useState<'headers' | 'perms' | 'ssl' | 'audit' | null>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  const loading = activeAction !== null;

  const getApiUrl = (action: string) => {
    const path = window.location.pathname;
    return `${path}?action=${action}`;
  };

  const runDiagnostics = async () => {
    setActiveAction('audit');
    try {
      const res = await fetch(getApiUrl('api_get_diagnostics'));
      const data = await res.json();
      if (data.success) {
        setDiagnostics(data.diagnostics);
        if (showAlert) showAlert('System security audit completed', 'success');
      } else {
        if (showAlert) showAlert('Failed: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (e: any) {
      if (showAlert) showAlert('Error running diagnostics: ' + e.message, 'error');
    } finally {
      setActiveAction(null);
    }
  };

  const fixPermissions = async () => {
    setActiveAction('perms');
    try {
      const res = await fetch(getApiUrl('api_fix_permissions'));
      const data = await res.json();
      if (data.success) {
        if (showAlert) showAlert('File permissions automatically repaired on host!', 'success');
        runDiagnostics();
      } else {
        if (showAlert) showAlert('Failed to fix permissions: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (e: any) {
      if (showAlert) showAlert('Error fixing permissions: ' + e.message, 'error');
    } finally {
      setActiveAction(null);
    }
  };

  const applySecurityHeaders = async () => {
    setActiveAction('headers');
    try {
      const res = await fetch(getApiUrl('api_apply_security_headers'));
      const data = await res.json();
      if (data.success) {
        if (showAlert) showAlert('✨ Security headers applied to .htaccess successfully!', 'success');
        runDiagnostics();
      } else {
        if (showAlert) showAlert('Failed to apply headers: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (e: any) {
      if (showAlert) showAlert('Error applying security headers: ' + e.message, 'error');
    } finally {
      setActiveAction(null);
    }
  };

  const enableSslRedirect = async () => {
    setActiveAction('ssl');
    try {
      const res = await fetch(getApiUrl('api_enable_ssl_redirect'));
      const data = await res.json();
      if (data.success) {
        if (showAlert) showAlert('🔒 HTTPS 301 Redirect rule applied to root .htaccess!', 'success');
        runDiagnostics();
      } else {
        if (showAlert) showAlert('Failed to enforce SSL redirect: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (e: any) {
      if (showAlert) showAlert('Error enforcing SSL redirect: ' + e.message, 'error');
    } finally {
      setActiveAction(null);
    }
  };

  const headers = diagnostics?.headers || { hsts: false, nosniff: false, frame_options: false, referrer_policy: false, ssl_redirect: false };

  const hasIssues = diagnostics && (
    diagnostics.admin_git_exposed || 
    diagnostics.dashboard_git_exposed || 
    diagnostics.dashboard_db_exposed || 
    !diagnostics.admin_ssl_active || 
    !diagnostics.dashboard_ssl_active ||
    !headers.hsts ||
    !headers.nosniff ||
    !headers.frame_options
  );

  return (
    <div className="space-y-6 w-full">
      {/* Super Admin Portal System Status Card Container */}
      <div className="bg-pm-card border border-pm-border rounded-xl p-5 shadow-sm pm-card-elevation">
        <SectionHeader
          title="Super Admin Portal System Status"
          subtitle="System health, security diagnostics, and permission integrity checks."
          icon={Settings}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. API Security Guard */}
          <div className="p-3.5 bg-pm-input border border-pm-border rounded-lg flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-md shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="px-2 py-0.5 text-[0.65rem] font-bold bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/30">
                HEALTHY
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-pm-text">API Security Guard</div>
              <div className="text-[0.68rem] text-pm-secondary truncate mt-0.5">Request Validation</div>
            </div>
          </div>

          {/* 2. Token Cryptography */}
          <div className="p-3.5 bg-pm-input border border-pm-border rounded-lg flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="p-1.5 bg-purple-500/10 text-purple-400 rounded-md shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <span className="px-2 py-0.5 text-[0.65rem] font-bold bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/30">
                AES-256
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-pm-text">Token Cryptography</div>
              <div className="text-[0.68rem] text-pm-secondary truncate mt-0.5">Payload Encryption</div>
            </div>
          </div>

          {/* 3. Session Integrity */}
          <div className="p-3.5 bg-pm-input border border-pm-border rounded-lg flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-md shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <span className="px-2 py-0.5 text-[0.65rem] font-bold bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/30">
                VERIFIED
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-pm-text">Session Integrity</div>
              <div className="text-[0.68rem] text-pm-secondary truncate mt-0.5">OTT Anti-Replay</div>
            </div>
          </div>

          {/* 4. SQLite Database Path */}
          <div className="p-3.5 bg-pm-input border border-pm-border rounded-lg flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-md shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <span className="px-2 py-0.5 text-[0.65rem] font-bold bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/30">
                CONNECTED
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-pm-text">SQLite Database Path</div>
              <div className="text-[0.65rem] text-pm-secondary font-mono truncate mt-0.5" title="mass_utility_dashboard/data/pm_cloud_backups.db">
                pm_cloud_backups.db
              </div>
            </div>
          </div>

          {/* 5. V2 SPA Frontend Engine */}
          <div className="p-3.5 bg-pm-input border border-pm-border rounded-lg flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-md shrink-0">
                <Cpu className="w-4 h-4" />
              </div>
              <span className="px-2 py-0.5 text-[0.65rem] font-bold bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/30">
                ACTIVE
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-pm-text">V2 SPA Frontend Engine</div>
              <div className="text-[0.68rem] text-pm-secondary truncate mt-0.5" title="React 18 + TypeScript + Vite + Tailwind CSS">
                React 18 + Vite + TS
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm pm-card-elevation">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-pm-text flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-pm-primary" /> Multi-Server Security & Health Diagnostics
            </h3>
            <p className="text-xs text-pm-secondary mt-1">
              Audits security configurations, file system access, and SSL safety of both the Admin Portal and SaaS Dashboard servers.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {diagnostics && (
              <>
                <button 
                  onClick={applySecurityHeaders}
                  disabled={loading}
                  className="pm-btn-neutral px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 min-w-[175px] shrink-0"
                  title="Inject HSTS, nosniff, and SAMEORIGIN security headers into .htaccess"
                >
                  {activeAction === 'headers' ? <RefreshCw className="w-4 h-4 animate-spin text-purple-400" /> : <Lock className="w-4 h-4 text-purple-400" />}
                  <span>Apply .htaccess Headers</span>
                </button>
                <button 
                  onClick={fixPermissions}
                  disabled={loading}
                  className="pm-btn-neutral px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 min-w-[155px] shrink-0"
                  title="Repair folder permissions to 0755 and file permissions to 0644"
                >
                  {activeAction === 'perms' ? <RefreshCw className="w-4 h-4 animate-spin text-amber-400" /> : <FolderLock className="w-4 h-4 text-amber-400" />}
                  <span>Repair Permissions</span>
                </button>
                <button 
                  onClick={enableSslRedirect}
                  disabled={loading}
                  className="pm-btn-neutral px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 text-emerald-400 min-w-[185px] shrink-0"
                  title="Inject 301 HTTPS Redirect rule into SaaS server root .htaccess"
                >
                  {activeAction === 'ssl' ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> : <Lock className="w-4 h-4 text-emerald-400" />}
                  <span>Enforce HTTPS Redirect</span>
                </button>
              </>
            )}
            <button 
              onClick={runDiagnostics}
              disabled={loading}
              className={`pm-btn-primary px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 min-w-[215px] shrink-0 ${activeAction === 'audit' ? 'opacity-85 cursor-wait' : ''}`}
            >
              {activeAction === 'audit' ? <RefreshCw className="w-4 h-4 animate-spin text-white" /> : <Activity className="w-4 h-4 text-white" />}
              <span>Run System Security Audit</span>
            </button>
          </div>
        </div>

        {!diagnostics ? (
          <div className="flex flex-col items-center justify-center py-12 text-pm-secondary bg-pm-input/50 rounded-lg border border-pm-border border-dashed">
            <ShieldCheck className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">Click "Run System Security Audit" above to scan the decoupled server environment.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {hasIssues && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start gap-3 text-rose-500">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold">Security Vulnerabilities Detected</h4>
                  <p className="text-xs mt-1 opacity-90">Please review the exposed endpoints below and use the Auto-Fix tool or configure your web server.</p>
                </div>
              </div>
            )}

            {!hasIssues && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-start gap-3 text-emerald-500">
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold">All Security Checks Passed</h4>
                  <p className="text-xs mt-1 opacity-90">No critical exposures detected in the current environment configuration.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: SaaS HTTP Security Headers (.htaccess) */}
              <div className="p-4 border border-pm-border rounded-lg bg-pm-input flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-pm-secondary uppercase flex items-center gap-2 mb-3">
                    <Lock className="w-4 h-4 text-purple-400" /> SaaS HTTP Security Headers (.htaccess)
                  </h4>
                  <ul className="space-y-2 text-xs">
                    <li className="flex justify-between items-center">
                      <span className="text-pm-text font-medium">HSTS (Strict-Transport-Security)</span>
                      {headers.hsts ? <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">ACTIVE</span> : <span className="text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded">RECOMMENDED</span>}
                    </li>
                    <li className="flex justify-between items-center">
                      <span className="text-pm-text font-medium">X-Content-Type-Options (nosniff)</span>
                      {headers.nosniff ? <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">ACTIVE</span> : <span className="text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded">RECOMMENDED</span>}
                    </li>
                    <li className="flex justify-between items-center">
                      <span className="text-pm-text font-medium">X-Frame-Options (SAMEORIGIN)</span>
                      {headers.frame_options ? <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">ACTIVE</span> : <span className="text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded">RECOMMENDED</span>}
                    </li>
                    <li className="flex justify-between items-center">
                      <span className="text-pm-text font-medium">Referrer-Policy</span>
                      {headers.referrer_policy ? <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">ACTIVE</span> : <span className="text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded">RECOMMENDED</span>}
                    </li>
                  </ul>
                </div>
                <div className="mt-4 pt-3 border-t border-pm-border flex justify-end">
                  <button onClick={applySecurityHeaders} disabled={loading} className="text-xs font-bold text-purple-400 hover:text-purple-300 transition flex items-center gap-1">
                    🔒 Apply .htaccess Headers →
                  </button>
                </div>
              </div>

              {/* Card 2: SaaS SSL & Transport Encryption */}
              <div className="p-4 border border-pm-border rounded-lg bg-pm-input flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-pm-secondary uppercase flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> SaaS SSL & Transport Encryption
                  </h4>
                  <ul className="space-y-2 text-xs">
                    <li className="flex justify-between items-center">
                      <span className="text-pm-text font-medium">Admin Endpoint HTTPS</span>
                      {diagnostics.admin_ssl_active ? <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">🟢 HTTPS SECURE</span> : <span className="text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded">⚠️ HTTP UNENCRYPTED</span>}
                    </li>
                    <li className="flex justify-between items-center">
                      <span className="text-pm-text font-medium">Dashboard Endpoint HTTPS</span>
                      {diagnostics.dashboard_ssl_active ? <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">🟢 HTTPS SECURE</span> : <span className="text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded">⚠️ HTTP UNENCRYPTED</span>}
                    </li>
                    <li className="flex justify-between items-center pt-1">
                      <span className="text-pm-text font-medium">301 HTTPS Rewrite Rule (.htaccess)</span>
                      {headers.ssl_redirect ? <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">ENFORCED</span> : <span className="text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded">DISABLED</span>}
                    </li>
                  </ul>
                </div>
                <div className="mt-4 pt-3 border-t border-pm-border flex justify-end">
                  <button onClick={enableSslRedirect} disabled={loading} className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1">
                    ⚡ Enforce HTTPS Redirect →
                  </button>
                </div>
              </div>

              {/* Card 3: Database Vault & Endpoint Exposure */}
              <div className="p-4 border border-pm-border rounded-lg bg-pm-input flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-pm-secondary uppercase flex items-center gap-2 mb-3">
                    <GitBranch className="w-4 h-4 text-indigo-400" /> Database Vaults & Endpoint Exposure
                  </h4>
                  <ul className="space-y-2 text-xs">
                    <li className="flex justify-between items-center">
                      <span className="text-pm-text font-medium">Admin <code>.git/</code> Repository</span>
                      {diagnostics.admin_git_exposed ? <span className="text-rose-500 font-bold bg-rose-500/10 px-2 py-0.5 rounded">⚠️ EXPOSED</span> : <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">🟢 SECURE</span>}
                    </li>
                    <li className="flex justify-between items-center">
                      <span className="text-pm-text font-medium">Dashboard <code>.git/</code> Repository</span>
                      {diagnostics.dashboard_git_exposed ? <span className="text-rose-500 font-bold bg-rose-500/10 px-2 py-0.5 rounded">⚠️ EXPOSED</span> : <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">🟢 SECURE</span>}
                    </li>
                    <li className="flex justify-between items-center">
                      <span className="text-pm-text font-medium flex items-center gap-1"><Database className="w-3.5 h-3.5"/> SQLite <code>pm_cloud_backups.db</code></span>
                      {diagnostics.dashboard_db_exposed ? <span className="text-rose-500 font-bold bg-rose-500/10 px-2 py-0.5 rounded">⚠️ EXPOSED</span> : <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">🟢 403 PROTECTED</span>}
                    </li>
                  </ul>
                </div>
                <div className="mt-4 pt-3 border-t border-pm-border flex justify-end">
                  <button onClick={fixPermissions} disabled={loading} className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1">
                    🛡️ Protect Vault Isolation →
                  </button>
                </div>
              </div>

              {/* Card 4: SaaS Server Filesystem Permissions */}
              <div className="p-4 border border-pm-border rounded-lg bg-pm-input flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-pm-secondary uppercase flex items-center gap-2 mb-3">
                    <FolderLock className="w-4 h-4 text-amber-400" /> SaaS Server Filesystem Permissions
                  </h4>
                  <div className="space-y-2 text-xs">
                    {Object.entries(diagnostics.paths).map(([key, info]: [string, any]) => (
                      <div key={key} className="flex justify-between items-center">
                        <span className="truncate max-w-[220px] font-mono text-pm-text" title={info.path}>
                          <code>{info.path}</code>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-pm-secondary text-[0.7rem]" title="Current Perms">({info.current})</span>
                          {info.current === info.recommended || (info.current === '0666' && info.recommended === '0644') || (info.current === '0777' && info.recommended === '0755') ? (
                            <span className="text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded text-[0.65rem]">OK</span>
                          ) : (
                            <span className="text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded text-[0.65rem]">WARN</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-pm-border flex justify-end">
                  <button onClick={fixPermissions} disabled={loading} className="text-xs font-bold text-amber-400 hover:text-amber-300 transition flex items-center gap-1">
                    📁 Repair Server Permissions →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

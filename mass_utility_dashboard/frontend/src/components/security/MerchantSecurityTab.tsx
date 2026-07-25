// @Arch[MerchantSecurityTab]
// @Description: Top-level diagnostic component auditing PrestaShop store security headers, permissions, SSL enforcement, and directory isolation via Bridge API.
// @Calls: get_diagnostics, apply_security_headers, fix_diagnostics_permissions

import React, { useState, useEffect } from 'react';
import { FetchService } from '../../utils/FetchService';
import { useModal } from '../../utils/overlay';

interface DiagnosticPath {
  path: string;
  current: string;
  recommended: string;
  is_dir?: boolean;
}

interface DiagnosticDetails {
  headers?: {
    hsts: boolean;
    nosniff: boolean;
    frame_options: boolean;
    referrer_policy: boolean;
  };
  vaults?: {
    git_exposed: boolean;
    env_exposed: boolean;
  };
  prestashop?: {
    dev_mode_disabled: boolean;
    ssl_active: boolean;
  };
  paths?: Record<string, DiagnosticPath>;
  admin_git_exposed?: boolean;
  dashboard_git_exposed?: boolean;
  dashboard_db_exposed?: boolean;
  admin_ssl_active?: boolean;
  dashboard_ssl_active?: boolean;
}

export const MerchantSecurityTab: React.FC = () => {
  const { showAlert, showToast } = useModal();
  const [activeAction, setActiveAction] = useState<'headers' | 'perms' | 'ssl' | 'audit' | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticDetails | null>(null);

  const loading = activeAction !== null;

  const runAudit = async () => {
    setActiveAction('audit');
    try {
      const response = await FetchService.post('get_diagnostics', {});
      if (response && response.success && response.diagnostics) {
        setDiagnostics(response.diagnostics);
        showToast('Store security audit completed', 'success');
      } else {
        const msg = response?.error || 'Security diagnostics audit failed to run.';
        showAlert('Audit Failed', msg, 'error');
      }
    } catch (err: any) {
      showAlert('Audit Failed', err.message || 'Network error during diagnostics request.', 'error');
    } finally {
      setActiveAction(null);
    }
  };

  const applySecurityHeaders = async () => {
    setActiveAction('headers');
    try {
      const response = await FetchService.post('apply_security_headers', {});
      if (response && response.success) {
        showToast('✨ Security headers applied to .htaccess successfully!', 'success');
        runAudit();
      } else {
        const msg = response?.error || 'Failed to apply security headers.';
        showAlert('Headers Error', msg, 'error');
      }
    } catch (err: any) {
      showAlert('Headers Error', 'Network error during headers application: ' + err.message, 'error');
    } finally {
      setActiveAction(null);
    }
  };

  const fixPermissions = async () => {
    setActiveAction('perms');
    try {
      const response = await FetchService.post('fix_diagnostics_permissions', {});
      if (response && response.success) {
        showToast('File permissions successfully repaired!', 'success');
        runAudit();
      } else {
        const msg = response?.error || 'Failed to write permissions changes.';
        showAlert('Permissions Error', msg, 'error');
      }
    } catch (err: any) {
      showAlert('Permissions Error', 'Network error during permissions correction: ' + err.message, 'error');
    } finally {
      setActiveAction(null);
    }
  };

  const enableSsl = async () => {
    setActiveAction('ssl');
    try {
      const response = await FetchService.post('enable_ssl', {});
      if (response && response.success) {
        showToast('🔒 SSL / HTTPS successfully enforced on PrestaShop store!', 'success');
        runAudit();
      } else {
        const msg = response?.error || 'Failed to enforce SSL.';
        showAlert('SSL Error', msg, 'error');
      }
    } catch (err: any) {
      showAlert('SSL Error', 'Network error during SSL enforcement: ' + err.message, 'error');
    } finally {
      setActiveAction(null);
    }
  };

  // Run initial audit on mount
  useEffect(() => {
    runAudit();
  }, []);

  const headers = diagnostics?.headers || { hsts: false, nosniff: false, frame_options: false, referrer_policy: false };
  const vaults = diagnostics?.vaults || { git_exposed: !!diagnostics?.dashboard_git_exposed, env_exposed: false };
  const prestashop = diagnostics?.prestashop || { dev_mode_disabled: true, ssl_active: !!diagnostics?.dashboard_ssl_active };

  const hasIssues = (
    !headers.hsts || 
    !headers.nosniff || 
    !headers.frame_options || 
    vaults.git_exposed || 
    vaults.env_exposed || 
    !prestashop.dev_mode_disabled || 
    !prestashop.ssl_active
  );

  return (
    <div className="space-y-6 w-full">
      {/* Top Banner Header */}
      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm pm-card-elevation">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-pm-text flex items-center gap-2">
              <span>🛡️ Store Host Security &amp; Health Inspector</span>
            </h2>
            <p className="text-xs text-pm-secondary mt-1">
              Audits PrestaShop file permissions, HTTP security headers, SSL enforcement, and directory isolation on the host where the module is installed.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {diagnostics && (
              <>
                <button
                  type="button"
                  onClick={applySecurityHeaders}
                  disabled={loading}
                  className="pm-btn-neutral px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 min-w-[175px] shrink-0"
                  title="Inject HSTS, nosniff, and SAMEORIGIN security headers into .htaccess"
                >
                  {activeAction === 'headers' ? <span className="animate-spin">🔄</span> : <span>🔒</span>}
                  <span>Apply .htaccess Headers</span>
                </button>
                <button
                  type="button"
                  onClick={fixPermissions}
                  disabled={loading}
                  className="pm-btn-neutral px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 min-w-[155px] shrink-0"
                  title="Repair folder permissions to 0755 and file permissions to 0644"
                >
                  {activeAction === 'perms' ? <span className="animate-spin">🔄</span> : <span>📁</span>}
                  <span>Repair Permissions</span>
                </button>
                <button
                  type="button"
                  onClick={enableSsl}
                  disabled={loading}
                  className="pm-btn-neutral px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 text-emerald-400 min-w-[165px] shrink-0"
                  title="Enforce SSL/HTTPS across all store pages in PrestaShop Configuration"
                >
                  {activeAction === 'ssl' ? <span className="animate-spin">🔄</span> : <span>⚡</span>}
                  <span>Enforce Store SSL</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={runAudit}
              disabled={loading}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 min-w-[175px] shrink-0 ${activeAction === 'audit' ? 'bg-pm-border text-pm-secondary' : 'pm-btn-primary'}`}
            >
              {activeAction === 'audit' ? <span className="animate-spin">🔄</span> : <span>🔄</span>}
              <span>Run Security Audit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Diagnostics Status Alerts */}
      {diagnostics && (
        <div className="space-y-4">
          {hasIssues ? (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-amber-400">
              <span className="text-lg">⚠️</span>
              <div>
                <h4 className="text-sm font-bold">Security Action Items Recommended</h4>
                <p className="text-xs mt-1 opacity-90">
                  Some recommended HTTP security headers or file permissions can be hardened. Use the 1-click action buttons above to apply recommendations.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-3 text-emerald-400">
              <span className="text-lg">✅</span>
              <div>
                <h4 className="text-sm font-bold">All Store Security Audits Healthy</h4>
                <p className="text-xs mt-1 opacity-90">No security exposures detected on your PrestaShop store host environment.</p>
              </div>
            </div>
          )}

          {/* 4 Diagnostic Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: HTTP Security Headers */}
            <div className="p-5 border border-pm-border rounded-xl bg-pm-card shadow-sm pm-card-elevation space-y-3">
              <h3 className="text-xs font-bold text-pm-secondary uppercase tracking-wider flex items-center gap-2">
                🔒 HTTP Security Headers (.htaccess)
              </h3>
              <ul className="space-y-2.5">
                <li className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-pm-text">HSTS (Strict-Transport-Security)</span>
                  {headers.hsts ? (
                    <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">ACTIVE</span>
                  ) : (
                    <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">RECOMMENDED</span>
                  )}
                </li>
                <li className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-pm-text">X-Content-Type-Options (nosniff)</span>
                  {headers.nosniff ? (
                    <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">ACTIVE</span>
                  ) : (
                    <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">RECOMMENDED</span>
                  )}
                </li>
                <li className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-pm-text">X-Frame-Options (SAMEORIGIN)</span>
                  {headers.frame_options ? (
                    <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">ACTIVE</span>
                  ) : (
                    <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">RECOMMENDED</span>
                  )}
                </li>
                <li className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-pm-text">Referrer-Policy</span>
                  {headers.referrer_policy ? (
                    <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">ACTIVE</span>
                  ) : (
                    <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">RECOMMENDED</span>
                  )}
                </li>
              </ul>
            </div>

            {/* Card 2: PrestaShop Environment Hardening */}
            <div className="p-5 border border-pm-border rounded-xl bg-pm-card shadow-sm pm-card-elevation space-y-3">
              <h3 className="text-xs font-bold text-pm-secondary uppercase tracking-wider flex items-center gap-2">
                🛡️ PrestaShop Core Environment
              </h3>
              <ul className="space-y-2.5">
                <li className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-pm-text">PrestaShop Debug Mode (`PS_DEV_MODE`)</span>
                  {prestashop.dev_mode_disabled ? (
                    <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">DISABLED (SAFE)</span>
                  ) : (
                    <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">ENABLED (WARN)</span>
                  )}
                </li>
                <li className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-pm-text">SSL / HTTPS Enforcement (`PS_SSL_ENABLED`)</span>
                  {prestashop.ssl_active ? (
                    <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">ENFORCED</span>
                  ) : (
                    <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">DISABLED</span>
                  )}
                </li>
                <li className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-pm-text">Git Repository Isolation (`.git/`)</span>
                  {!vaults.git_exposed ? (
                    <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">PROTECTED</span>
                  ) : (
                    <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">EXPOSED</span>
                  )}
                </li>
                <li className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-pm-text">Environment Config Isolation (`.env`)</span>
                  {!vaults.env_exposed ? (
                    <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">PROTECTED</span>
                  ) : (
                    <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">EXPOSED</span>
                  )}
                </li>
              </ul>
            </div>

            {/* Card 3: Filesystem Permissions Audit */}
            <div className="p-5 border border-pm-border rounded-xl bg-pm-card shadow-sm pm-card-elevation space-y-3 md:col-span-2">
              <h3 className="text-xs font-bold text-pm-secondary uppercase tracking-wider flex items-center gap-2">
                📁 Filesystem Directory &amp; Script Permissions
              </h3>
              {diagnostics.paths ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(diagnostics.paths).map(([key, info]: [string, any]) => (
                    <div key={key} className="p-3 bg-pm-input border border-pm-border rounded-lg flex items-center justify-between">
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <div className="text-xs font-bold text-pm-text truncate font-mono" title={info.path}>
                          {info.path}
                        </div>
                        <div className="text-[0.68rem] text-pm-secondary">Recommended: {info.recommended}</div>
                      </div>
                      <div className="shrink-0">
                        {info.current === info.recommended || (info.current === '0666' && info.recommended === '0644') ? (
                          <span className="text-emerald-400 font-bold text-xs bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                            {info.current} OK
                          </span>
                        ) : (
                          <span className="text-amber-400 font-bold text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                            {info.current} WARN
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-pm-secondary font-mono">No filesystem paths detected.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

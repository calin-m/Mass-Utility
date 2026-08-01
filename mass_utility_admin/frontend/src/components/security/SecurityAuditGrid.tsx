// @Arch[SecurityAuditGrid]
import React from 'react';
import { Lock, ShieldCheck, GitBranch, FolderLock, Database, AlertTriangle, CheckCircle } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';
import { StatusBadge } from '../common/StatusBadge';

interface SecurityAuditGridProps {
  diagnostics: any;
  headers: any;
  loading: boolean;
  applySecurityHeaders: () => void;
  fixPermissions: () => void;
  enableSslRedirect: () => void;
}

export const SecurityAuditGrid: React.FC<SecurityAuditGridProps> = ({
  diagnostics,
  headers,
  loading,
  applySecurityHeaders,
  fixPermissions,
  enableSslRedirect,
}) => {
  const { t } = useTranslation();

  const hasIssues =
    !headers.hsts ||
    !headers.nosniff ||
    !headers.frame_options ||
    !diagnostics.admin_ssl_active ||
    !diagnostics.dashboard_ssl_active ||
    diagnostics.admin_git_exposed ||
    diagnostics.dashboard_git_exposed ||
    diagnostics.dashboard_db_exposed;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {hasIssues ? (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start gap-3 text-rose-500">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold">{t('diag_vuln_detected_title')}</h4>
            <p className="text-xs mt-1 opacity-90">{t('diag_vuln_detected_desc')}</p>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-start gap-3 text-emerald-500">
          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold">{t('diag_all_passed_title')}</h4>
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
                {headers.hsts ? <StatusBadge label="ACTIVE" customColor="emerald" /> : <StatusBadge label="RECOMMENDED" customColor="amber" />}
              </li>
              <li className="flex justify-between items-center">
                <span className="text-pm-text font-medium">X-Content-Type-Options (nosniff)</span>
                {headers.nosniff ? <StatusBadge label="ACTIVE" customColor="emerald" /> : <StatusBadge label="RECOMMENDED" customColor="amber" />}
              </li>
              <li className="flex justify-between items-center">
                <span className="text-pm-text font-medium">X-Frame-Options (SAMEORIGIN)</span>
                {headers.frame_options ? <StatusBadge label="ACTIVE" customColor="emerald" /> : <StatusBadge label="RECOMMENDED" customColor="amber" />}
              </li>
              <li className="flex justify-between items-center">
                <span className="text-pm-text font-medium">Referrer-Policy</span>
                {headers.referrer_policy ? <StatusBadge label="ACTIVE" customColor="emerald" /> : <StatusBadge label="RECOMMENDED" customColor="amber" />}
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
                {diagnostics.admin_ssl_active ? <StatusBadge label="🟢 HTTPS SECURE" customColor="emerald" /> : <StatusBadge label="⚠️ HTTP UNENCRYPTED" customColor="amber" />}
              </li>
              <li className="flex justify-between items-center">
                <span className="text-pm-text font-medium">Dashboard Endpoint HTTPS</span>
                {diagnostics.dashboard_ssl_active ? <StatusBadge label="🟢 HTTPS SECURE" customColor="emerald" /> : <StatusBadge label="⚠️ HTTP UNENCRYPTED" customColor="amber" />}
              </li>
              <li className="flex justify-between items-center pt-1">
                <span className="text-pm-text font-medium">301 HTTPS Rewrite Rule (.htaccess)</span>
                {headers.ssl_redirect ? <StatusBadge label="ENFORCED" customColor="emerald" /> : <StatusBadge label="DISABLED" customColor="amber" />}
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
                {diagnostics.admin_git_exposed ? <StatusBadge label="⚠️ EXPOSED" customColor="rose" /> : <StatusBadge label="🟢 SECURE" customColor="emerald" />}
              </li>
              <li className="flex justify-between items-center">
                <span className="text-pm-text font-medium">Dashboard <code>.git/</code> Repository</span>
                {diagnostics.dashboard_git_exposed ? <StatusBadge label="⚠️ EXPOSED" customColor="rose" /> : <StatusBadge label="🟢 SECURE" customColor="emerald" />}
              </li>
              <li className="flex justify-between items-center">
                <span className="text-pm-text font-medium flex items-center gap-1"><Database className="w-3.5 h-3.5"/> SQLite <code>pm_cloud_backups.db</code></span>
                {diagnostics.dashboard_db_exposed ? <StatusBadge label="⚠️ EXPOSED" customColor="rose" /> : <StatusBadge label="🟢 403 PROTECTED" customColor="emerald" />}
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
              {Object.entries(diagnostics.paths || {}).map(([key, info]: [string, any]) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="truncate max-w-[220px] font-mono text-pm-text" title={info.path}>
                    <code>{info.path}</code>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-pm-secondary text-[0.7rem]" title="Current Perms">({info.current})</span>
                    {info.current === info.recommended ? (
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
  );
};

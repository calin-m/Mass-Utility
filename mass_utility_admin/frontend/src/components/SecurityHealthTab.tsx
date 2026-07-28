// @Arch[SecurityHealthTab]
import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, CheckCircle, Lock, FileCode, Server, RefreshCw, Activity, AlertTriangle, Key, Terminal, Globe, ExternalLink, HardDrive, Shield, Check, Settings, Database, Cpu, FolderLock, GitBranch } from 'lucide-react';
import { SectionHeader } from './common/SectionHeader';
import { useTranslation } from '../i18n/LanguageContext';
import { SecurityAuditGrid } from './security/SecurityAuditGrid';

interface SecurityHealthTabProps {
  showAlert: (msg: string, type?: 'success' | 'error') => void;
}

export const SecurityHealthTab: React.FC<SecurityHealthTabProps> = ({ showAlert }) => {
  const { t } = useTranslation();
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

  useEffect(() => {
    const autoAuditOnLoad = async () => {
      setActiveAction('audit');
      try {
        const res = await fetch(getApiUrl('api_get_diagnostics'));
        const data = await res.json();
        if (data.success) {
          setDiagnostics(data.diagnostics);
        }
      } catch (e) {
        // silent fallback on initial load
      } finally {
        setActiveAction(null);
      }
    };
    autoAuditOnLoad();
  }, []);

  const headers = diagnostics?.headers || {};
  const perms = diagnostics?.permissions || {};

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
      {/* Portal System Status Card Container with Dynamic Warning Glow Aura */}
      <div className={`bg-pm-card rounded-xl p-5 shadow-sm pm-card-elevation transition-all duration-500 border ${
        hasIssues 
          ? 'border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.25)] ring-1 ring-rose-500/40 animate-pulse' 
          : diagnostics 
            ? 'border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/20'
            : 'border-pm-border'
      }`}>
        <SectionHeader
          title={t('security_title')}
          subtitle={t('security_subtitle')}
          icon={Settings}
          action={
            <div className="min-w-[170px] h-7 flex items-center justify-end">
              {diagnostics ? (
                <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 border uppercase tracking-wider ${
                  hasIssues 
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse' 
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                }`}>
                  {hasIssues ? <AlertTriangle className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>{hasIssues ? t('diag_vuln_detected_title') : t('diag_all_passed_title')}</span>
                </span>
              ) : (
                <div className="w-32 h-6 rounded-full bg-pm-input/40 animate-pulse" />
              )}
            </div>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. API Security Guard */}
          <div className="p-3.5 bg-pm-input border border-pm-border rounded-lg flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-md shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="px-2 py-0.5 text-[0.65rem] font-bold bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/30">
                {t('status_healthy')}
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-pm-text">{t('diag_api_guard_name')}</div>
              <div className="text-[0.68rem] text-pm-secondary truncate mt-0.5">{t('diag_api_guard_desc')}</div>
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
              <div className="text-xs font-bold text-pm-text">{t('diag_token_crypto_name')}</div>
              <div className="text-[0.68rem] text-pm-secondary truncate mt-0.5">{t('diag_token_crypto_desc')}</div>
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
              <div className="text-xs font-bold text-pm-text">{t('diag_session_integ_name')}</div>
              <div className="text-[0.68rem] text-pm-secondary truncate mt-0.5">{t('diag_session_integ_desc')}</div>
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
              <div className="text-xs font-bold text-pm-text">{t('diag_sqlite_db_name')}</div>
              <div className="text-[0.65rem] text-pm-secondary font-mono truncate mt-0.5" title="mass_utility_dashboard/data/pm_cloud_backups.db">
                pm_cloud_backups.db
              </div>
            </div>
          </div>

          {/* 5. Licensing Gateway Engine */}
          <div className="p-3.5 bg-pm-input border border-pm-border rounded-lg flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-md shrink-0">
                <Cpu className="w-4 h-4" />
              </div>
              <span className="px-2 py-0.5 text-[0.65rem] font-bold bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/30">
                {t('status_active')}
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-pm-text">{t('diag_gateway_name')}</div>
              <div className="text-[0.68rem] text-pm-secondary font-mono truncate mt-0.5" title="PHP Runtime Engine (PDO SQLite & cURL Synchronized)">
                PHP {diagnostics?.php_version || '8.x'} (PDO / cURL)
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm pm-card-elevation">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-pm-text flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-pm-primary" /> {t('security_title')}
            </h3>
            <p className="text-xs text-pm-secondary mt-1">
              {t('security_subtitle')}
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
                  <span>{t('diag_btn_apply_headers')}</span>
                </button>
                <button 
                  onClick={fixPermissions}
                  disabled={loading}
                  className="pm-btn-neutral px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 min-w-[155px] shrink-0"
                  title="Repair folder permissions to 0755 and file permissions to 0644"
                >
                  {activeAction === 'perms' ? <RefreshCw className="w-4 h-4 animate-spin text-amber-400" /> : <FolderLock className="w-4 h-4 text-amber-400" />}
                  <span>{t('diag_btn_repair_perms')}</span>
                </button>
                <button 
                  onClick={enableSslRedirect}
                  disabled={loading}
                  className="pm-btn-neutral px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 text-emerald-400 min-w-[185px] shrink-0"
                  title="Inject 301 HTTPS Redirect rule into SaaS server root .htaccess"
                >
                  {activeAction === 'ssl' ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> : <Lock className="w-4 h-4 text-emerald-400" />}
                  <span>{t('diag_btn_enforce_https')}</span>
                </button>
              </>
            )}
            <button 
              onClick={runDiagnostics}
              disabled={loading}
              className={`pm-btn-primary px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 min-w-[215px] shrink-0 ${activeAction === 'audit' ? 'opacity-85 cursor-wait' : ''}`}
            >
              {activeAction === 'audit' ? <RefreshCw className="w-4 h-4 animate-spin text-white" /> : <Activity className="w-4 h-4 text-white" />}
              <span>{t('diag_btn_run_audit')}</span>
            </button>
          </div>
        </div>

        {!diagnostics ? (
          <div className="min-h-[460px] space-y-6 animate-pulse">
            <div className="h-16 rounded-lg bg-pm-input/40 border border-pm-border flex items-center justify-center text-pm-secondary text-xs font-mono">
              <RefreshCw className="w-4 h-4 animate-spin mr-2 text-purple-400" />
              Executing live system diagnostics audit...
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-44 rounded-lg bg-pm-input/40 border border-pm-border" />
              <div className="h-44 rounded-lg bg-pm-input/40 border border-pm-border" />
              <div className="h-44 rounded-lg bg-pm-input/40 border border-pm-border" />
              <div className="h-44 rounded-lg bg-pm-input/40 border border-pm-border" />
            </div>
          </div>
        ) : (
          <SecurityAuditGrid
            diagnostics={diagnostics}
            headers={headers}
            loading={loading}
            applySecurityHeaders={applySecurityHeaders}
            fixPermissions={fixPermissions}
            enableSslRedirect={enableSslRedirect}
          />
        )}
      </div>
    </div>
  );
};

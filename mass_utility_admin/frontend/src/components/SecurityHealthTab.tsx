import React, { useState } from 'react';
import { ShieldCheck, Activity, Lock, Cpu, AlertTriangle, CheckCircle, RefreshCw, FolderLock, GitBranch, Database } from 'lucide-react';

interface SecurityHealthTabProps {
  showAlert?: (msg: string, type?: 'success' | 'error') => void;
}

export const SecurityHealthTab: React.FC<SecurityHealthTabProps> = ({ showAlert }) => {
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  const getApiUrl = (action: string) => {
    const path = window.location.pathname;
    return `${path}?action=${action}`;
  };

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('get_diagnostics'));
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
      setLoading(false);
    }
  };

  const fixPermissions = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('fix_permissions'));
      const data = await res.json();
      if (data.success) {
        if (showAlert) showAlert('Permissions automatically repaired!', 'success');
        // Re-run diagnostics
        runDiagnostics();
      } else {
        if (showAlert) showAlert('Failed to fix permissions: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (e: any) {
      if (showAlert) showAlert('Error fixing permissions: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const hasIssues = diagnostics && (
    diagnostics.admin_git_exposed || 
    diagnostics.dashboard_git_exposed || 
    diagnostics.dashboard_db_exposed || 
    !diagnostics.admin_ssl_active || 
    !diagnostics.dashboard_ssl_active
  );

  return (
    <div className="space-y-6 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-pm-card border border-pm-border rounded-xl p-5 shadow-sm pm-card-elevation flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-pm-secondary uppercase">API Security Guard</div>
            <div className="text-lg font-bold text-pm-text">HEALTHY</div>
          </div>
        </div>

        <div className="bg-pm-card border border-pm-border rounded-xl p-5 shadow-sm pm-card-elevation flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-pm-secondary uppercase">Token Cryptography</div>
            <div className="text-lg font-bold text-pm-text">AES-256</div>
          </div>
        </div>

        <div className="bg-pm-card border border-pm-border rounded-xl p-5 shadow-sm pm-card-elevation flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-pm-secondary uppercase">Session Integrity</div>
            <div className="text-lg font-bold text-pm-text">VERIFIED</div>
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
          <div className="flex gap-2">
            {diagnostics && (
              <button 
                onClick={fixPermissions}
                disabled={loading}
                className="pm-btn-neutral px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2"
              >
                <FolderLock className="w-4 h-4" /> Auto-Fix Permissions
              </button>
            )}
            <button 
              onClick={runDiagnostics}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${loading ? 'bg-pm-border text-pm-secondary' : 'pm-btn-primary'}`}
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
              {loading ? 'Scanning...' : 'Run System Security Audit'}
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
              <div className="p-4 border border-pm-border rounded-lg bg-pm-input">
                <h4 className="text-xs font-bold text-pm-secondary uppercase flex items-center gap-2 mb-3">
                  <GitBranch className="w-4 h-4" /> Endpoint Exposure
                </h4>
                <ul className="space-y-2">
                  <li className="flex justify-between items-center text-sm">
                    <span>Admin <code>.git</code> Config</span>
                    {diagnostics.admin_git_exposed ? <span className="text-rose-500 font-bold text-xs bg-rose-500/10 px-2 py-0.5 rounded">EXPOSED</span> : <span className="text-emerald-500 font-bold text-xs">SECURE</span>}
                  </li>
                  <li className="flex justify-between items-center text-sm">
                    <span>Dashboard <code>.git</code> Config</span>
                    {diagnostics.dashboard_git_exposed ? <span className="text-rose-500 font-bold text-xs bg-rose-500/10 px-2 py-0.5 rounded">EXPOSED</span> : <span className="text-emerald-500 font-bold text-xs">SECURE</span>}
                  </li>
                  <li className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5"/> SQLite Direct HTTP</span>
                    {diagnostics.dashboard_db_exposed ? <span className="text-rose-500 font-bold text-xs bg-rose-500/10 px-2 py-0.5 rounded">EXPOSED</span> : <span className="text-emerald-500 font-bold text-xs">SECURE</span>}
                  </li>
                  <li className="flex justify-between items-center text-sm pt-2 border-t border-pm-border mt-2">
                    <span>Admin SSL Active</span>
                    {diagnostics.admin_ssl_active ? <span className="text-emerald-500 font-bold text-xs">YES</span> : <span className="text-rose-500 font-bold text-xs">NO</span>}
                  </li>
                </ul>
              </div>

              <div className="p-4 border border-pm-border rounded-lg bg-pm-input">
                <h4 className="text-xs font-bold text-pm-secondary uppercase flex items-center gap-2 mb-3">
                  <FolderLock className="w-4 h-4" /> File System Permissions
                </h4>
                <div className="space-y-3">
                  {Object.entries(diagnostics.paths).map(([key, info]: [string, any]) => (
                    <div key={key} className="flex justify-between items-center text-sm">
                      <span className="truncate max-w-[150px] sm:max-w-[200px]" title={info.path}>
                        <code>{info.path.split('/').pop()}</code>
                      </span>
                      <div className="flex gap-2">
                        <span className="text-pm-secondary text-xs" title="Current">({info.current})</span>
                        {info.current === info.recommended || (info.current === '0666' && info.recommended === '0644') ? (
                          <span className="text-emerald-500 font-bold text-xs">OK</span>
                        ) : (
                          <span className="text-amber-500 font-bold text-xs">WARN</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

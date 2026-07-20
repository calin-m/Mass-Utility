// @Arch[SettingsSecurity]
// @Description: UI diagnostics panel that interfaces with the SaaS server APIs to verify SSL parameters, directory exposures, and file permission configurations.
// @Calls: get_diagnostics, fix_diagnostics_permissions

import React, { useState } from 'react';
import { FetchService } from '../utils/FetchService';
import { useModal } from '../utils/overlay';

interface DiagnosticPath {
  path: string;
  current: string;
  recommended: string;
}

interface DiagnosticDetails {
  git_exposed: boolean;
  db_exposed: boolean;
  bridge_encrypted: boolean;
  ssl_enforced: boolean;
  paths?: Record<string, DiagnosticPath>;
}

export const SettingsSecurity: React.FC = () => {
  const { showAlert } = useModal();
  const [isLoading, setIsLoading] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticDetails | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const runAudit = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const response = await FetchService.post('get_diagnostics', {});
      if (response && response.success && response.diagnostics) {
        setDiagnostics(response.diagnostics);
      } else {
        setErrorMsg('Security diagnostics audit failed to run.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error during diagnostics request.');
    } finally {
      setIsLoading(false);
    }
  };

  const fixPermissions = async () => {
    setIsFixing(true);
    try {
      const response = await FetchService.post('fix_diagnostics_permissions', {});
      if (response && response.success) {
        showAlert('Permissions Secured', 'Permissions successfully secured to standard 0755/0644 values.', 'success');
        runAudit();
      } else {
        showAlert('Permissions Error', 'Failed to write permissions changes.', 'error');
      }
    } catch (err: any) {
      showAlert('Permissions Error', 'Network error during permissions correction: ' + err.message, 'error');
    } finally {
      setIsFixing(false);
    }
  };

  let hasMismatchedPaths = false;
  if (diagnostics?.paths) {
    hasMismatchedPaths = Object.values(diagnostics.paths).some(p => p.current !== p.recommended);
  }

  return (
    <div className="space-y-6">
      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-pm-primary rounded-full shadow-lg shadow-pm-primary/50"></span>
            <h3 className="text-md font-bold tracking-wide text-pm-text uppercase">System Diagnostics Scan</h3>
          </div>
          <button
            type="button"
            disabled={isLoading}
            onClick={runAudit}
            className="bg-pm-primary hover:bg-opacity-90 disabled:bg-pm-input disabled:text-pm-text-secondary text-white text-xs font-bold px-5 py-2.5 rounded-lg transition-all uppercase flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Auditing...
              </>
            ) : (
              '⚡ Run Security Audit'
            )}
          </button>
        </div>

        {errorMsg && (
          <div className="bg-pm-danger/10 border border-pm-danger/20 text-pm-danger rounded-lg p-4 text-xs font-semibold">
            ⚠️ {errorMsg}
          </div>
        )}

        {!diagnostics && !errorMsg && (
          <p className="text-sm text-pm-text-secondary">
            Click the button above to run security checks on the SaaS server and the PrestaShop Bridge connection.
          </p>
        )}

        {diagnostics && (
          <div className="space-y-4">
            {/* Git exposed */}
            <div className="flex items-center justify-between p-4 bg-pm-input/30 border border-pm-border rounded-xl gap-4">
              <div>
                <strong className="text-sm text-pm-text block">SaaS Git Repository Security (.git Exposure)</strong>
                <span className="text-xs text-pm-text-secondary block mt-0.5">Checks if the underlying .git directory is accessible from public HTTP traffic.</span>
              </div>
              <span className={`text-[0.7rem] font-bold px-3 py-1.5 rounded border uppercase ${
                diagnostics.git_exposed ? 'bg-pm-danger/10 text-pm-danger border-pm-danger/20' : 'bg-pm-success/10 text-pm-success border-pm-success/20'
              }`}>
                {diagnostics.git_exposed ? '⚠️ EXPOSED' : '🟢 SECURE'}
              </span>
            </div>

            {/* DB exposed */}
            <div className="flex items-center justify-between p-4 bg-pm-input/30 border border-pm-border rounded-xl gap-4">
              <div>
                <strong className="text-sm text-pm-text block">SaaS Vault DB Security (.db Download Exposure)</strong>
                <span className="text-xs text-pm-text-secondary block mt-0.5">Checks if your SQLite database file can be downloaded directly from the web.</span>
              </div>
              <span className={`text-[0.7rem] font-bold px-3 py-1.5 rounded border uppercase ${
                diagnostics.db_exposed ? 'bg-pm-danger/10 text-pm-danger border-pm-danger/20' : 'bg-pm-success/10 text-pm-success border-pm-success/20'
              }`}>
                {diagnostics.db_exposed ? '⚠️ EXPOSED' : '🟢 SECURE'}
              </span>
            </div>

            {/* Bridge transport encryption */}
            <div className="flex items-center justify-between p-4 bg-pm-input/30 border border-pm-border rounded-xl gap-4">
              <div>
                <strong className="text-sm text-pm-text block">Decoupled Bridge Encryption (SSL/TLS Transport)</strong>
                <span className="text-xs text-pm-text-secondary block mt-0.5">Checks if communications between SaaS Dashboard and client Bridge are encrypted (HTTPS).</span>
              </div>
              <span className={`text-[0.7rem] font-bold px-3 py-1.5 rounded border uppercase ${
                diagnostics.bridge_encrypted ? 'bg-pm-success/10 text-pm-success border-pm-success/20' : 'bg-pm-warning/10 text-pm-warning border-pm-warning/20'
              }`}>
                {diagnostics.bridge_encrypted ? '🟢 HTTPS ENCRYPTED' : '⚠️ HTTP UNENCRYPTED'}
              </span>
            </div>

            {/* Session encryption */}
            <div className="flex items-center justify-between p-4 bg-pm-input/30 border border-pm-border rounded-xl gap-4">
              <div>
                <strong className="text-sm text-pm-text block">SaaS Browser Transport Encryption (SSL/TLS Connection)</strong>
                <span className="text-xs text-pm-text-secondary block mt-0.5">Checks if your active dashboard administration session is running over HTTPS.</span>
              </div>
              <span className={`text-[0.7rem] font-bold px-3 py-1.5 rounded border uppercase ${
                diagnostics.ssl_enforced ? 'bg-pm-success/10 text-pm-success border-pm-success/20' : 'bg-pm-warning/10 text-pm-warning border-pm-warning/20'
              }`}>
                {diagnostics.ssl_enforced ? '🟢 SSL ON' : '⚠️ SSL OFF'}
              </span>
            </div>

            {/* Permissions Details */}
            {diagnostics.paths && (
              <div className="border border-pm-border rounded-xl overflow-hidden bg-pm-input/20">
                <div className="px-5 py-4 border-b border-pm-border bg-pm-input/10 flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <strong className="text-sm text-pm-text block">SaaS Files & Folders Hardening Status</strong>
                    <span className="text-xs text-pm-text-secondary block mt-0.5">Checks permissions safety for configuration logs and storage folders.</span>
                  </div>
                  <span className={`text-[0.7rem] font-bold px-3 py-1.5 rounded border uppercase ${
                    hasMismatchedPaths ? 'bg-pm-warning/10 text-pm-warning border-pm-warning/20' : 'bg-pm-success/10 text-pm-success border-pm-success/20'
                  }`}>
                    {hasMismatchedPaths ? '⚠️ HARMONIZE' : '🟢 SECURE'}
                  </span>
                </div>

                <div className="p-5 space-y-3">
                  {Object.entries(diagnostics.paths).map(([key, p]) => {
                    const isMismatched = p.current !== p.recommended;
                    return (
                      <div key={key} className="flex justify-between items-center text-xs py-1 border-b border-pm-border/30 last:border-b-0">
                        <span className="font-mono text-pm-text-secondary">{p.path}</span>
                        <span className="text-pm-text-secondary">
                          Current: <strong className={isMismatched ? 'text-pm-warning' : 'text-pm-success'}>{p.current}</strong>{' '}
                          (Recommended: <strong className="text-pm-text">{p.recommended}</strong>)
                        </span>
                      </div>
                    );
                  })}

                  {hasMismatchedPaths && (
                    <div className="flex justify-end pt-3">
                      <button
                        type="button"
                        disabled={isFixing}
                        onClick={fixPermissions}
                        className="bg-pm-primary hover:bg-opacity-90 disabled:bg-pm-input disabled:text-pm-text-secondary text-white text-[0.7rem] font-bold px-4 py-2 rounded-lg transition-all uppercase flex items-center gap-1.5"
                      >
                        {isFixing ? 'Fixing...' : '⚡ Auto-Fix & Harden Permissions'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

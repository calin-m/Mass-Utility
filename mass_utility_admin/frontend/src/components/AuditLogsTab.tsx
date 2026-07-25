import React, { useState, useEffect } from 'react';
import { Shield, Search, RefreshCw, Download, Terminal, Calendar, User, Globe, AlertCircle, FileText } from 'lucide-react';
import { SectionHeader } from './common/SectionHeader';

interface AuditLog {
  id: number;
  admin_username: string;
  action_type: string;
  target_entity: string;
  target_id: string | null;
  details: string;
  details_parsed: Record<string, any>;
  ip_address: string;
  created_at: string;
}

interface AuditLogsTabProps {
  onNotify: (msg: string, type: 'success' | 'error') => void;
}

export const AuditLogsTab: React.FC<AuditLogsTabProps> = ({ onNotify }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    setIsRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (actionFilter && actionFilter !== 'ALL') params.append('action_type', actionFilter);

      const res = await fetch(`?action=api_get_admin_logs&${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      } else {
        onNotify(data.error || 'Failed to fetch admin audit logs.', 'error');
      }
    } catch (err: any) {
      onNotify('Network error while loading audit logs.', 'error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const getActionBadge = (actionType: string) => {
    switch (actionType) {
      case 'CREATE_COMPANY':
      case 'UPDATE_COMPANY':
      case 'DELETE_COMPANY':
        return <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-sky-950/80 text-sky-400 border border-sky-500/30 flex items-center gap-1 w-fit"><Building2Icon className="w-3 h-3" /> {actionType}</span>;
      case 'GENERATE_LICENSE':
      case 'ASSIGN_LICENSE':
      case 'EXTEND_LICENSE':
      case 'UPDATE_LICENSE_DOMAINS':
        return <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-amber-950/80 text-amber-400 border border-amber-500/30 flex items-center gap-1 w-fit"><KeyIcon className="w-3 h-3" /> {actionType}</span>;
      case 'CREATE_USER':
      case 'UPDATE_USER':
      case 'RESET_PASSWORD':
      case 'DELETE_USER':
        return <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit"><UserIcon className="w-3 h-3" /> {actionType}</span>;
      default:
        return <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-purple-950/80 text-purple-400 border border-purple-500/30 flex items-center gap-1 w-fit"><Shield className="w-3 h-3" /> {actionType}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Super Admin Operations Audit Trail"
        subtitle="Security event ledger tracking administrative operations, license updates, and authentication events."
        action={
          <div className="flex items-center gap-3">
            <a
              href="?action=api_export_admin_logs_csv"
              download
              className="pm-btn-neutral text-xs py-2 px-3 flex items-center gap-2"
            >
              <Download className="w-3.5 h-3.5 text-purple-400" />
              <span>Export CSV</span>
            </a>
            <button
              onClick={() => {
                fetchLogs();
                onNotify('🔄 Audit logs reloaded!', 'success');
              }}
              disabled={isRefreshing}
              className="pm-btn-neutral text-xs py-2 px-3 flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-purple-400' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        }
      />

      {/* Filter Toolbar */}
      <div className="bg-pm-card-bg border border-pm-border-color rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-pm-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs by admin username, target ID, or payload details..."
            className="w-full bg-pm-input-bg border border-pm-border-color rounded-xl pl-9 pr-4 py-2 text-xs text-pm-text focus:outline-none focus:border-purple-500 transition"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-pm-input-bg border border-pm-border-color rounded-xl px-3 py-2 text-xs text-pm-text focus:outline-none focus:border-purple-500 transition cursor-pointer"
          >
            <option value="ALL">All Action Types</option>
            <option value="GENERATE_LICENSE">GENERATE_LICENSE</option>
            <option value="ASSIGN_LICENSE">ASSIGN_LICENSE</option>
            <option value="EXTEND_LICENSE">EXTEND_LICENSE</option>
            <option value="UPDATE_LICENSE_DOMAINS">UPDATE_LICENSE_DOMAINS</option>
            <option value="CREATE_COMPANY">CREATE_COMPANY</option>
            <option value="UPDATE_COMPANY">UPDATE_COMPANY</option>
            <option value="CREATE_USER">CREATE_USER</option>
            <option value="UPDATE_USER">UPDATE_USER</option>
            <option value="RESET_PASSWORD">RESET_PASSWORD</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-pm-card-bg border border-pm-border-color rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-pm-input-bg/50 border-b border-pm-border-color text-pm-secondary uppercase font-semibold text-[10px]">
                <th className="p-3">Log ID</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Admin</th>
                <th className="p-3">Action Type</th>
                <th className="p-3">Target</th>
                <th className="p-3">IP Address</th>
                <th className="p-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pm-border-color/40">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-pm-secondary">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-400 mb-2" />
                    Loading audit trail logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-pm-secondary">
                    <Shield className="w-8 h-8 mx-auto text-pm-secondary/40 mb-2" />
                    No audit log records match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-pm-input-bg/30 transition">
                    <td className="p-3 font-mono font-bold text-pm-secondary">#{log.id}</td>
                    <td className="p-3 text-pm-secondary font-mono text-[11px]">{log.created_at}</td>
                    <td className="p-3 font-semibold text-pm-text flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>{log.admin_username}</span>
                    </td>
                    <td className="p-3">{getActionBadge(log.action_type)}</td>
                    <td className="p-3 text-pm-secondary font-mono">
                      <span className="capitalize">{log.target_entity}</span> {log.target_id ? `(#${log.target_id})` : ''}
                    </td>
                    <td className="p-3 text-pm-secondary font-mono flex items-center gap-1">
                      <Globe className="w-3 h-3 text-pm-secondary/60 shrink-0" />
                      <span>{log.ip_address}</span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="pm-btn-neutral text-[11px] py-1 px-2.5 flex items-center gap-1 ml-auto"
                      >
                        <FileText className="w-3 h-3 text-purple-400" />
                        <span>Inspect Payload</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Payload Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999999] flex items-center justify-center p-4">
          <div className="bg-pm-card-bg border border-pm-border-color rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-pm-border-color flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-sm text-pm-text">Audit Log Entry Payload #{selectedLog.id}</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-pm-secondary hover:text-pm-text transition text-lg"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-pm-input-bg/50 p-3 rounded-xl border border-pm-border-color/50">
                <div>
                  <span className="text-pm-secondary block text-[10px] uppercase font-bold">Admin Operator</span>
                  <span className="font-semibold text-pm-text">{selectedLog.admin_username}</span>
                </div>
                <div>
                  <span className="text-pm-secondary block text-[10px] uppercase font-bold">IP Address</span>
                  <span className="font-mono text-pm-text">{selectedLog.ip_address}</span>
                </div>
                <div>
                  <span className="text-pm-secondary block text-[10px] uppercase font-bold">Action Type</span>
                  <span className="font-mono text-purple-400 font-bold">{selectedLog.action_type}</span>
                </div>
                <div>
                  <span className="text-pm-secondary block text-[10px] uppercase font-bold">Timestamp</span>
                  <span className="font-mono text-pm-text">{selectedLog.created_at}</span>
                </div>
              </div>

              <div>
                <span className="text-pm-secondary block text-[10px] uppercase font-bold mb-1">Payload Details (JSON)</span>
                <pre className="bg-pm-input-bg p-4 rounded-xl font-mono text-[11px] text-emerald-400 overflow-x-auto border border-pm-border-color">
                  {JSON.stringify(selectedLog.details_parsed || {}, null, 2)}
                </pre>
              </div>
            </div>
            <div className="px-6 py-3 bg-pm-input-bg/30 border-t border-pm-border-color text-right">
              <button
                onClick={() => setSelectedLog(null)}
                className="pm-btn-primary text-xs py-1.5 px-4"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Building2Icon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="16" height="20" x="4" y="2" rx="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M8 10h.01" /><path d="M16 10h.01" /><path d="M8 14h.01" /><path d="M16 14h.01" /></svg>
);

const KeyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6" /><path d="m15.5 7.5 3 3" /></svg>
);

const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
);

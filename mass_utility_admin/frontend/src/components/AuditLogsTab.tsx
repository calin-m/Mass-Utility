import React, { useState, useEffect } from 'react';
import { Shield, Search, RefreshCw, Download, Terminal, Calendar, User, Globe, FileText, ChevronDown, ChevronUp, CheckCircle, Building2, Key } from 'lucide-react';
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
  const [showRawJson, setShowRawJson] = useState<boolean>(false);

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
        return <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center gap-1 w-fit"><Building2 className="w-3 h-3" /> {actionType}</span>;
      case 'GENERATE_LICENSE':
      case 'ASSIGN_LICENSE':
      case 'EXTEND_LICENSE':
      case 'UPDATE_LICENSE_DOMAINS':
        return <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1 w-fit"><Key className="w-3 h-3" /> {actionType}</span>;
      case 'CREATE_USER':
      case 'UPDATE_USER':
      case 'RESET_PASSWORD':
      case 'DELETE_USER':
        return <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit"><User className="w-3 h-3" /> {actionType}</span>;
      default:
        return <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center gap-1 w-fit"><Shield className="w-3 h-3" /> {actionType}</span>;
    }
  };

  const formatKeyName = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatValue = (key: string, value: any): React.ReactNode => {
    if (value === null || value === undefined || value === '') {
      return <span className="italic text-pm-secondary/60">Not Specified / Unset</span>;
    }
    if (typeof value === 'boolean') {
      return value ? (
        <span className="text-emerald-400 font-bold uppercase">Enabled</span>
      ) : (
        <span className="text-rose-400 font-bold uppercase">Disabled</span>
      );
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="italic text-pm-secondary/60">None</span>;
      return (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {value.map((v, idx) => (
            <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30">
              {String(v)}
            </span>
          ))}
        </div>
      );
    }
    if (typeof value === 'object') {
      return <pre className="font-mono text-[10px] text-emerald-400">{JSON.stringify(value, null, 2)}</pre>;
    }
    if (key === 'months_added') {
      return <span className="font-bold text-emerald-400">+{value} Months</span>;
    }
    if (key === 'status') {
      return <span className="font-bold uppercase text-purple-400">{String(value)}</span>;
    }
    return <span className="font-semibold text-pm-text">{String(value)}</span>;
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
      <div className="bg-pm-card border border-pm-border rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-pm-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs by admin username, target ID, or payload details..."
            className="w-full bg-pm-input border border-pm-border rounded-xl pl-9 pr-4 py-2 text-xs text-pm-text focus:outline-none focus:border-purple-500 transition"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-pm-input border border-pm-border rounded-xl px-3 py-2 text-xs text-pm-text focus:outline-none focus:border-purple-500 transition cursor-pointer"
          >
            <option value="ALL">All Action Types</option>
            <option value="GENERATE_LICENSE">GENERATE_LICENSE</option>
            <option value="ASSIGN_LICENSE">ASSIGN_LICENSE</option>
            <option value="EXTEND_LICENSE">EXTEND_LICENSE</option>
            <option value="UPDATE_LICENSE">UPDATE_LICENSE</option>
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
      <div className="bg-pm-card border border-pm-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-pm-input text-pm-secondary uppercase font-bold border-b border-pm-border text-[10px]">
                <th className="p-3">Log ID</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Admin</th>
                <th className="p-3">Action Type</th>
                <th className="p-3">Target</th>
                <th className="p-3">IP Address</th>
                <th className="p-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pm-border">
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
                  <tr key={log.id} className="hover:bg-pm-input/50 transition">
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
                        onClick={() => {
                          setSelectedLog(log);
                          setShowRawJson(false);
                        }}
                        className="pm-btn-neutral text-[11px] py-1 px-3 flex items-center gap-1.5 ml-auto font-semibold"
                      >
                        <FileText className="w-3.5 h-3.5 text-purple-400" />
                        <span>Inspect Log</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded Opaque Inspect Log Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999999] flex items-center justify-center p-4">
          <div className="bg-pm-card border border-pm-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-pm-border flex items-center justify-between bg-pm-input/50">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="font-extrabold text-sm text-pm-text">Audit Log Entry #${selectedLog.id}</h3>
                  <p className="text-[11px] text-pm-secondary">{selectedLog.action_type} on {selectedLog.target_entity} target #{selectedLog.target_id || 'N/A'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-pm-secondary hover:text-pm-text transition p-1.5 rounded-lg hover:bg-pm-input text-lg font-bold"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
              {/* Operator Telemetry Hero Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-pm-input p-4 rounded-xl border border-pm-border">
                <div>
                  <span className="text-pm-secondary block text-[10px] uppercase font-bold">Admin Operator</span>
                  <span className="font-semibold text-pm-text flex items-center gap-1 mt-0.5">
                    <User className="w-3.5 h-3.5 text-purple-400" />
                    {selectedLog.admin_username}
                  </span>
                </div>
                <div>
                  <span className="text-pm-secondary block text-[10px] uppercase font-bold">IP Address</span>
                  <span className="font-mono text-pm-text block mt-0.5">{selectedLog.ip_address}</span>
                </div>
                <div>
                  <span className="text-pm-secondary block text-[10px] uppercase font-bold">Action Type</span>
                  <div className="mt-0.5">{getActionBadge(selectedLog.action_type)}</div>
                </div>
                <div>
                  <span className="text-pm-secondary block text-[10px] uppercase font-bold">Timestamp</span>
                  <span className="font-mono text-pm-text block mt-0.5">{selectedLog.created_at}</span>
                </div>
              </div>

              {/* Human-Readable Change Payload Breakdown */}
              <div>
                <h4 className="font-extrabold text-xs text-pm-text uppercase mb-2 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-purple-400" />
                  <span>Recorded Operation Payload</span>
                </h4>

                {Object.keys(selectedLog.details_parsed || {}).length === 0 ? (
                  <div className="p-4 bg-pm-input/50 border border-pm-border rounded-xl text-center text-pm-secondary italic">
                    No additional metadata parameters recorded for this operation.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(selectedLog.details_parsed).map(([key, val]) => (
                      <div key={key} className="bg-pm-input/40 p-3 rounded-xl border border-pm-border/60">
                        <span className="text-pm-secondary block text-[10px] uppercase font-bold mb-1">
                          {formatKeyName(key)}
                        </span>
                        <div className="text-xs">{formatValue(key, val)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Collapsible Raw JSON Accordion */}
              <div className="border-t border-pm-border pt-4">
                <button
                  type="button"
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="flex items-center justify-between w-full p-2.5 bg-pm-input/30 hover:bg-pm-input/60 rounded-xl border border-pm-border/50 text-xs font-bold text-pm-secondary transition"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-purple-400" />
                    <span>Raw JSON Payload Data</span>
                  </span>
                  {showRawJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showRawJson && (
                  <pre className="mt-2 bg-pm-input p-4 rounded-xl font-mono text-[11px] text-emerald-400 overflow-x-auto border border-pm-border animate-in fade-in duration-150">
                    {JSON.stringify(selectedLog.details_parsed || {}, null, 2)}
                  </pre>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-pm-input/40 border-t border-pm-border text-right">
              <button
                onClick={() => setSelectedLog(null)}
                className="pm-btn-primary text-xs py-2 px-5 rounded-xl font-bold"
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

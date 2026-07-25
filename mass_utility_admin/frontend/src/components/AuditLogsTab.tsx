import React, { useState, useEffect } from 'react';
import { Shield, Search, RefreshCw, Download, Terminal, User, Globe, FileText, ChevronDown, ChevronUp, CheckCircle, Activity, Layers, UserCheck, ShieldAlert, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { SectionHeader } from './common/SectionHeader';
import { StatCard } from './common/StatCard';
import { BaseModal } from './common/BaseModal';
import { StatusBadge } from './common/StatusBadge';
import { Button } from './common/Button';
import { FormInput } from './common/FormInput';
import { FormSelect } from './common/FormSelect';

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
  const [unmaskedIps, setUnmaskedIps] = useState<Record<number, boolean>>({});

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

  const toggleIpVisibility = (id: number) => {
    setUnmaskedIps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const maskIp = (ip: string): string => {
    if (!ip) return '***.***.***.***';
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.***.***.${parts[3]}`;
    }
    return `${ip.substring(0, 3)}***`;
  };

  // Calculated Telemetry Metrics
  const totalOperations = logs.length;
  const licenseMutations = logs.filter((l) => l.action_type.includes('LICENSE')).length;
  const accountCompanyActions = logs.filter(
    (l) => l.action_type.includes('COMPANY') || l.action_type.includes('USER') || l.action_type.includes('PASSWORD')
  ).length;
  const securityEvents = logs.filter((l) => l.action_type.includes('DELETE') || l.action_type.includes('RESET')).length;

  const renderBadge = (actionType: string) => {
    if (actionType.includes('COMPANY')) {
      return <StatusBadge label={actionType} type="company" customColor="sky" />;
    }
    if (actionType.includes('LICENSE')) {
      return <StatusBadge label={actionType} type="license" customColor="amber" />;
    }
    if (actionType.includes('USER') || actionType.includes('PASSWORD')) {
      return <StatusBadge label={actionType} type="user" customColor="emerald" />;
    }
    return <StatusBadge label={actionType} type="security" customColor="purple" />;
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
        <span className="text-emerald-500 dark:text-emerald-400 font-bold uppercase">Enabled</span>
      ) : (
        <span className="text-rose-500 dark:text-rose-400 font-bold uppercase">Disabled</span>
      );
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="italic text-pm-secondary/60">None</span>;
      return (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {value.map((v, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30"
            >
              {String(v)}
            </span>
          ))}
        </div>
      );
    }
    if (typeof value === 'object') {
      return (
        <pre className="bg-slate-900 dark:bg-slate-950 p-3 rounded-lg font-mono text-[10px] text-emerald-400 border border-pm-border overflow-x-auto">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }
    if (key === 'months_added') {
      return <span className="font-bold text-emerald-600 dark:text-emerald-400">+{value} Months</span>;
    }
    if (key === 'status') {
      return <span className="font-bold uppercase text-purple-600 dark:text-purple-400">{String(value)}</span>;
    }
    return <span className="font-semibold text-pm-text">{String(value)}</span>;
  };

  const filterOptions = [
    { value: 'ALL', label: 'All Action Types' },
    { value: 'GENERATE_LICENSE', label: 'GENERATE_LICENSE' },
    { value: 'ASSIGN_LICENSE', label: 'ASSIGN_LICENSE' },
    { value: 'EXTEND_LICENSE', label: 'EXTEND_LICENSE' },
    { value: 'UPDATE_LICENSE', label: 'UPDATE_LICENSE' },
    { value: 'UPDATE_LICENSE_DOMAINS', label: 'UPDATE_LICENSE_DOMAINS' },
    { value: 'CREATE_COMPANY', label: 'CREATE_COMPANY' },
    { value: 'UPDATE_COMPANY', label: 'UPDATE_COMPANY' },
    { value: 'CREATE_USER', label: 'CREATE_USER' },
    { value: 'UPDATE_USER', label: 'UPDATE_USER' },
    { value: 'RESET_PASSWORD', label: 'RESET_PASSWORD' },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Super Admin Operations Audit Trail"
        subtitle="Security event ledger tracking administrative operations, license updates, and authentication events."
        action={
          <div className="flex items-center gap-3">
            <a href="?action=api_export_admin_logs_csv" download className="no-underline">
              <Button variant="primary" size="md" icon={Download}>
                Export CSV
              </Button>
            </a>
            <Button
              variant="neutral"
              size="md"
              icon={RefreshCw}
              loading={isRefreshing}
              onClick={() => {
                fetchLogs();
                onNotify('🔄 Audit logs reloaded!', 'success');
              }}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Standardized 4-Card Overview Telemetry Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Operations" value={totalOperations} icon={Activity} color="purple" />
        <StatCard label="License Key Mutations" value={licenseMutations} icon={Layers} color="blue" />
        <StatCard label="Corporate Account Actions" value={accountCompanyActions} icon={UserCheck} color="emerald" />
        <StatCard label="Security Events" value={securityEvents} icon={ShieldAlert} color="amber" />
      </div>

      {/* Filter Toolbar using Master Form Primitives */}
      <div className="bg-pm-card border border-pm-border rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full">
          <FormInput
            type="text"
            icon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => {
              setSearch('');
              fetchLogs();
            }}
            placeholder="Search logs by admin username, target ID, or payload details..."
          />
        </form>

        <div className="w-full md:w-64 shrink-0">
          <FormSelect
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            options={filterOptions}
          />
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
                <th className="p-3">Status</th>
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
                  <td colSpan={8} className="p-8 text-center text-pm-secondary">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-400 mb-2" />
                    Loading audit trail logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-pm-secondary">
                    <Shield className="w-8 h-8 mx-auto text-pm-secondary/40 mb-2" />
                    No audit log records match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-pm-input/50 transition">
                    <td className="p-3 font-mono font-bold text-pm-secondary">#{log.id}</td>
                    <td className="p-3 text-pm-secondary font-mono text-[11px]">{log.created_at}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        SUCCESS
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-pm-text flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>{log.admin_username}</span>
                    </td>
                    <td className="p-3">{renderBadge(log.action_type)}</td>
                    <td className="p-3 text-pm-secondary font-mono">
                      <span className="capitalize">{log.target_entity}</span> {log.target_id ? `(#${log.target_id})` : ''}
                    </td>
                    <td className="p-3 text-pm-secondary font-mono">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3 h-3 text-pm-secondary/60 shrink-0" />
                        <span>{unmaskedIps[log.id] ? log.ip_address : maskIp(log.ip_address)}</span>
                        <button
                          type="button"
                          onClick={() => toggleIpVisibility(log.id)}
                          className="p-1 rounded hover:bg-pm-input text-pm-secondary hover:text-pm-text transition ml-1"
                          title={unmaskedIps[log.id] ? 'Hide IP Address' : 'Show Full IP Address'}
                        >
                          {unmaskedIps[log.id] ? <EyeOff className="w-3 h-3 text-purple-400" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="neutral"
                        size="sm"
                        icon={FileText}
                        onClick={() => {
                          setSelectedLog(log);
                          setShowRawJson(false);
                        }}
                      >
                        Inspect Log
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Componentized BaseModal Inspector Dialog */}
      <BaseModal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={`Audit Log Entry #${selectedLog?.id || ''}`}
        icon={Terminal}
        maxWidth="xl"
      >
        {selectedLog && (
          <div className="space-y-5 text-xs">
            {/* Operator Telemetry Hero Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-pm-input/50 p-4 rounded-xl border border-pm-border">
              <div>
                <span className="text-pm-secondary block text-[10px] uppercase font-bold">Admin Operator</span>
                <span className="font-semibold text-pm-text flex items-center gap-1 mt-1">
                  <User className="w-3.5 h-3.5 text-purple-400" />
                  {selectedLog.admin_username}
                </span>
              </div>
              <div>
                <span className="text-pm-secondary block text-[10px] uppercase font-bold">IP Address</span>
                <span className="font-mono text-pm-text block mt-1">{selectedLog.ip_address}</span>
              </div>
              <div>
                <span className="text-pm-secondary block text-[10px] uppercase font-bold">Action Type</span>
                <div className="mt-1">{renderBadge(selectedLog.action_type)}</div>
              </div>
              <div>
                <span className="text-pm-secondary block text-[10px] uppercase font-bold">Timestamp</span>
                <span className="font-mono text-pm-text block mt-1">{selectedLog.created_at}</span>
              </div>
            </div>

            {/* Human-Readable Change Payload Breakdown */}
            <div>
              <h4 className="font-extrabold text-xs text-pm-text uppercase mb-2 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-purple-400" />
                <span>Recorded Operation Payload</span>
              </h4>

              {Object.keys(selectedLog.details_parsed || {}).length === 0 ? (
                <div className="p-4 bg-pm-input/30 border border-pm-border rounded-xl text-center text-pm-secondary italic">
                  No additional metadata parameters recorded for this operation.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(selectedLog.details_parsed).map(([key, val]) => (
                    <div key={key} className="bg-pm-input/40 p-3 rounded-xl border border-pm-border">
                      <span className="text-pm-secondary block text-[10px] uppercase font-bold mb-1">
                        {formatKeyName(key)}
                      </span>
                      <div className="text-xs">{formatValue(key, val)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Collapsible Raw JSON Accordion with Theme-Adaptive Code Terminal */}
            <div className="border-t border-pm-border pt-4">
              <button
                type="button"
                onClick={() => setShowRawJson(!showRawJson)}
                className="flex items-center justify-between w-full p-2.5 bg-pm-input/30 hover:bg-pm-input/60 rounded-xl border border-pm-border text-xs font-bold text-pm-secondary transition"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  <span>Raw JSON Payload Data</span>
                </span>
                {showRawJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showRawJson && (
                <pre className="mt-2 bg-slate-900 dark:bg-slate-950 p-4 rounded-xl font-mono text-[11px] text-emerald-400 overflow-x-auto border border-pm-border shadow-inner">
                  {JSON.stringify(selectedLog.details_parsed || {}, null, 2)}
                </pre>
              )}
            </div>

            {/* Modal Footer Action */}
            <div className="flex justify-end pt-3 border-t border-pm-border">
              <Button variant="primary" size="md" onClick={() => setSelectedLog(null)}>
                Close Inspector
              </Button>
            </div>
          </div>
        )}
      </BaseModal>
    </div>
  );
};

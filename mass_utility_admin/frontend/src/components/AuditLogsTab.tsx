import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Search, RefreshCw, Download, Terminal, User, Globe, FileText, ChevronDown, ChevronUp, CheckCircle, Activity, Layers, UserCheck, ShieldAlert, Eye, EyeOff, CheckCircle2, Code2, X, Trash2 } from 'lucide-react';
import { SectionHeader } from './common/SectionHeader';
import { StatCard } from './common/StatCard';
import { BaseModal } from './common/BaseModal';
import { ConfirmModal } from './common/ConfirmModal';
import { StatusBadge } from './common/StatusBadge';
import { Button } from './common/Button';
import { FormInput } from './common/FormInput';
import { FormSelect } from './common/FormSelect';
import { PaginationBar } from './common/PaginationBar';
import { useTranslation } from '../i18n/LanguageContext';

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
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);
  const [unmaskedIps, setUnmaskedIps] = useState<Record<number, boolean>>({});

  // Clear Confirmation Modal State
  const [isClearModalOpen, setIsClearModalOpen] = useState<boolean>(false);
  const [clearing, setClearing] = useState<boolean>(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

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
        setCurrentPage(1);
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

  const handleClearLogs = async () => {
    setClearing(true);
    try {
      const res = await fetch('?action=api_clear_admin_logs', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        onNotify('🗑️ All audit log entries purged successfully!', 'success');
        setIsClearModalOpen(false);
        fetchLogs();
      } else {
        onNotify(data.error || 'Failed to clear audit logs.', 'error');
      }
    } catch (err: any) {
      onNotify('Network error while clearing audit logs: ' + err.message, 'error');
    } finally {
      setClearing(false);
    }
  };

  const toggleIpMask = (id: number) => {
    setUnmaskedIps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatIp = (ip: string, id: number) => {
    if (!ip) return '127.0.0.1';
    if (unmaskedIps[id]) return ip;
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.***`;
    }
    return ip.substring(0, 6) + '***';
  };

  // Telemetry Aggregations
  const totalOperations = logs.length;
  const licenseMutations = useMemo(
    () => logs.filter((l) => l.action_type.includes('LICENSE')).length,
    [logs]
  );
  const accountCompanyActions = useMemo(
    () => logs.filter((l) => l.action_type.includes('USER') || l.action_type.includes('COMPANY')).length,
    [logs]
  );
  const securityEvents = useMemo(
    () => logs.filter((l) => l.action_type.includes('PASSWORD') || l.action_type.includes('LOGIN')).length,
    [logs]
  );

  // Pagination calculation
  const totalItems = logs.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return logs.slice(start, start + pageSize);
  }, [logs, currentPage, pageSize]);

  const renderBadge = (actionType: string) => {
    if (actionType.includes('LICENSE')) {
      return <StatusBadge label={actionType} type="license" customColor="sky" />;
    }
    if (actionType.includes('COMPANY')) {
      return <StatusBadge label={actionType} type="company" customColor="emerald" />;
    }
    if (actionType.includes('USER') || actionType.includes('PASSWORD')) {
      return <StatusBadge label={actionType} type="user" customColor="amber" />;
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
      return <span className="italic text-pm-secondary/60">{t('val_unset')}</span>;
    }
    if (typeof value === 'boolean') {
      return value ? (
        <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase">{t('val_enabled')}</span>
      ) : (
        <span className="text-rose-600 dark:text-rose-400 font-bold uppercase">{t('val_disabled')}</span>
      );
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="italic text-pm-secondary/60">{t('lbl_none')}</span>;
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
        <pre className="bg-slate-100 dark:bg-slate-950 p-3 rounded-lg font-mono text-[10px] text-slate-800 dark:text-emerald-400 border border-pm-border overflow-x-auto">
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
    { value: 'ALL', label: t('audit_all_types') },
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
        title={t('audit_title')}
        subtitle={t('audit_subtitle')}
        action={
          <div className="flex items-center gap-3">
            <Button
              variant="danger"
              size="md"
              icon={Trash2}
              onClick={() => setIsClearModalOpen(true)}
              title="Purge operations audit trail log history"
            >
              {t('btn_clear')}
            </Button>
            <a href="?action=api_export_admin_logs_csv" download className="no-underline">
              <Button variant="primary" size="md" icon={Download}>
                {t('btn_export_csv')}
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
              {t('btn_refresh')}
            </Button>
          </div>
        }
      />

      {/* Standardized 4-Card Overview Telemetry Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('stat_total_ops')} value={totalOperations} icon={Activity} color="purple" />
        <StatCard label={t('stat_license_mutations')} value={licenseMutations} icon={Layers} color="blue" />
        <StatCard label={t('stat_account_actions')} value={accountCompanyActions} icon={UserCheck} color="emerald" />
        <StatCard label={t('stat_security_events')} value={securityEvents} icon={ShieldAlert} color="amber" />
      </div>

      {/* Filter Toolbar with Clear Button */}
      <div className="bg-pm-card border border-pm-border rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="flex-1">
            <FormInput
              type="text"
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => {
                setSearch('');
                fetchLogs();
              }}
              placeholder={t('ph_search_audit')}
            />
          </div>
          {(search || actionFilter !== 'ALL') && (
            <Button
              type="button"
              variant="ghost"
              size="md"
              icon={X}
              onClick={() => {
                setSearch('');
                setActionFilter('ALL');
                fetchLogs();
              }}
              title="Clear active log filters"
            >
              {t('btn_clear')}
            </Button>
          )}
        </form>

        <div className="w-full md:w-64">
          <FormSelect
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            options={filterOptions}
          />
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-pm-card border border-pm-border rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-pm-input text-pm-secondary uppercase font-bold border-b border-pm-border text-[10px]">
                <th className="p-3">{t('th_log_id')}</th>
                <th className="p-3">{t('th_admin_op')}</th>
                <th className="p-3">{t('th_action_type')}</th>
                <th className="p-3">{t('th_target')}</th>
                <th className="p-3">{t('th_ip')}</th>
                <th className="p-3 text-right">{t('th_details')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pm-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-pm-secondary italic">
                    {t('audit_loading')}
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-pm-secondary italic">
                    {t('audit_no_logs')}
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-pm-input/50 transition">
                    <td className="p-3 font-mono">
                      <div className="font-bold text-pm-text">#{log.id}</div>
                      <div className="text-[10px] text-pm-secondary">{log.created_at}</div>
                    </td>

                    <td className="p-3 font-semibold text-pm-text">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-purple-400" />
                        <span>{log.admin_username || 'system'}</span>
                      </div>
                    </td>

                    <td className="p-3">{renderBadge(log.action_type)}</td>

                    <td className="p-3 font-mono text-[11px]">
                      <span className="text-pm-text uppercase font-bold">{log.target_entity}</span>
                      {log.target_id && (
                        <span className="text-purple-600 dark:text-purple-400 font-bold ml-1">#{log.target_id}</span>
                      )}
                    </td>

                    <td className="p-3 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-pm-secondary" />
                        <span>{formatIp(log.ip_address, log.id)}</span>
                        <button
                          onClick={() => toggleIpMask(log.id)}
                          className="text-pm-secondary hover:text-pm-text transition p-0.5"
                          title={unmaskedIps[log.id] ? 'Mask IP' : 'Unmask IP'}
                        >
                          {unmaskedIps[log.id] ? (
                            <EyeOff className="w-3 h-3 text-amber-400" />
                          ) : (
                            <Eye className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="p-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Terminal}
                        onClick={() => {
                          setSelectedLog(log);
                          setShowRawJson(false);
                        }}
                      >
                        {t('btn_inspect')}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Master PaginationBar Primitive */}
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Inspect Log Details Modal */}
      <BaseModal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={`Audit Event Telemetry #${selectedLog?.id || ''}`}
        icon={Terminal}
        maxWidth="lg"
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            {/* Log Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-pm-input/50 rounded-xl border border-pm-border font-mono text-[11px]">
              <div>
                <div className="text-[10px] text-pm-secondary uppercase font-bold">{t('th_admin_op')}</div>
                <div className="text-pm-text font-bold pt-0.5">{selectedLog.admin_username || 'system'}</div>
              </div>
              <div>
                <div className="text-[10px] text-pm-secondary uppercase font-bold">{t('th_action_type')}</div>
                <div className="text-purple-600 dark:text-purple-400 font-bold pt-0.5">{selectedLog.action_type}</div>
              </div>
              <div>
                <div className="text-[10px] text-pm-secondary uppercase font-bold">{t('th_target')}</div>
                <div className="text-pm-text font-bold pt-0.5">
                  {selectedLog.target_entity} {selectedLog.target_id ? `#${selectedLog.target_id}` : ''}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-pm-secondary uppercase font-bold">{t('th_ip')}</div>
                <div className="text-pm-text font-bold pt-0.5">{selectedLog.ip_address}</div>
              </div>
            </div>

            {/* Structured Payload Parameters */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-pm-text flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-purple-400" />
                <span>{t('audit_struct_params')}</span>
              </h4>

              {Object.keys(selectedLog.details_parsed || {}).length === 0 ? (
                <div className="p-4 bg-pm-input/30 rounded-xl border border-pm-border text-pm-secondary italic text-center">
                  {t('audit_no_params')}
                </div>
              ) : (
                <div className="bg-pm-input/40 rounded-xl border border-pm-border divide-y divide-pm-border">
                  {Object.entries(selectedLog.details_parsed).map(([key, val]) => (
                    <div key={key} className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-pm-secondary font-bold shrink-0">
                        {formatKeyName(key)}:
                      </span>
                      <div className="text-right text-xs font-mono">{formatValue(key, val)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Light & Dark Mode Adaptive Terminal Box */}
            <div className="pt-2 border-t border-pm-border">
              <button
                onClick={() => setShowRawJson(!showRawJson)}
                className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1.5"
              >
                <Code2 className="w-4 h-4" />
                <span>{showRawJson ? 'Hide Raw JSON Payload Data' : 'Inspect Raw JSON Payload Data'}</span>
              </button>

              {showRawJson && (
                <div className="mt-2 rounded-xl overflow-hidden border border-pm-border shadow-inner">
                  <div className="bg-slate-200 dark:bg-slate-900 px-3 py-1.5 flex items-center justify-between text-[10px] font-mono text-slate-700 dark:text-slate-300 border-b border-pm-border">
                    <span className="font-bold flex items-center gap-1">
                      <Terminal className="w-3 h-3 text-purple-500" /> payload.json
                    </span>
                    <span>{selectedLog.created_at}</span>
                  </div>
                  <pre className="p-3 bg-slate-100 dark:bg-slate-950 font-mono text-[11px] text-slate-800 dark:text-emerald-400 overflow-x-auto">
                    {JSON.stringify(selectedLog, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="neutral" size="md" onClick={() => setSelectedLog(null)}>
                {t('btn_close')}
              </Button>
            </div>
          </div>
        )}
      </BaseModal>

      {/* Clear Audit Logs Safety Confirmation Modal */}
      <ConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleClearLogs}
        title="Clear All Audit Logs?"
        message="Are you sure you want to clear/purge all admin operation audit logs? This action is permanent and cannot be undone."
        confirmText="Yes, Clear Audit Logs"
        cancelText="Cancel"
        variant="danger"
        loading={clearing}
      />
    </div>
  );
};

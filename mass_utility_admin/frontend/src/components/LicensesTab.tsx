import React, { useState, useMemo } from 'react';
import { Eye, EyeOff, Copy, Edit, ShieldAlert, CheckCircle, PlusCircle, Key, Trash2, KeyRound, Unlock, RefreshCw, Clock, User, Package, Calendar, Globe } from 'lucide-react';
import { BaseModal } from './common/BaseModal';
import { ConfirmModal } from './common/ConfirmModal';
import { SectionHeader } from './common/SectionHeader';
import { StatCard } from './common/StatCard';
import { Button } from './common/Button';
import { FormInput } from './common/FormInput';
import { FormSelect } from './common/FormSelect';
import { PaginationBar } from './common/PaginationBar';
import { useTranslation } from '../i18n/LanguageContext';
import { getSortedTierOptions } from '../utils/tierUtils';

export interface License {
  id: number;
  company_id?: number | null;
  company_name?: string | null;
  user_id?: number | null;
  user_email?: string | null;
  user_name?: string | null;
  license_key: string;
  store_url: string | null;
  package_tier: string;
  status: 'active' | 'suspended' | 'expired';
  expires_at: string | null;
  created_at: string;
}

export interface UserAccount {
  id: number;
  name?: string | null;
  email: string;
  company_name: string | null;
  company_id?: number | null;
  role?: string | null;
  status: string;
  created_at: string;
}

interface LicensesTabProps {
  licenses: License[];
  users?: UserAccount[];
  companies?: any[];
  tiers?: any[];
  onRefresh: () => void;
  showAlert: (msg: string, type?: 'success' | 'error') => void;
  onInspectClient?: (client: UserAccount) => void;
  onInspectCompany?: (company: any, licenseKey?: string) => void;
}

export const LicensesTab: React.FC<LicensesTabProps> = ({ licenses, users = [], companies = [], tiers = [], onRefresh, showAlert, onInspectClient, onInspectCompany }) => {
  const { t } = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const tierOptions = useMemo(() => getSortedTierOptions(tiers), [tiers]);




  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      showAlert('🔄 License registry reloaded!', 'success');
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // State
  const [genUserId, setGenUserId] = useState<number>(0);
  const [genTier, setGenTier] = useState<string>('basic');
  const [genExpires, setGenExpires] = useState<string>('');
  const [genStoreUrl, setGenStoreUrl] = useState<string>('');
  const [genSubmitting, setGenSubmitting] = useState(false);

  const [visibleKeys, setVisibleKeys] = useState<Record<number, boolean>>({});

  // Filter State
  const [filterMode, setFilterMode] = useState<'ALL' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED'>('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Extend Modal State
  const [extendingLic, setExtendingLic] = useState<License | null>(null);
  const [extendMonths, setExtendMonths] = useState<number>(12);
  const [extendCustomDate, setExtendCustomDate] = useState<string>('');
  const [extendSubmitting, setExtendSubmitting] = useState(false);

  // Edit Domains Modal State
  const [domainLic, setDomainLic] = useState<License | null>(null);
  const [domainInput, setDomainInput] = useState<string>('');
  const [domainSubmitting, setDomainSubmitting] = useState(false);

  // Reassign Client Modal State
  const [reassignLic, setReassignLic] = useState<License | null>(null);
  const [reassignUserId, setReassignUserId] = useState<number>(0);
  const [reassignSubmitting, setReassignSubmitting] = useState(false);

  // Suspend / Activate Safety Confirm Modal State
  const [confirmLic, setConfirmLic] = useState<License | null>(null);
  const [confirmActionType, setConfirmActionType] = useState<'suspend' | 'activate'>('suspend');
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);

  // Delete Confirm Modal State
  const [deletingLic, setDeletingLic] = useState<License | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Unified Edit License Modal State
  const [editingLic, setEditingLic] = useState<License | null>(null);
  const [editTier, setEditTier] = useState<string>('basic');
  const [editExpiresAt, setEditExpiresAt] = useState<string>('');
  const [editStoreUrl, setEditStoreUrl] = useState<string>('');
  const [editUserId, setEditUserId] = useState<number | ''>('');
  const [editStatus, setEditStatus] = useState<'active' | 'suspended' | 'expired'>('active');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const openEditLicenseModal = (lic: License) => {
    setEditingLic(lic);
    setEditTier(lic.package_tier || 'basic');
    setEditExpiresAt(lic.expires_at ? lic.expires_at.split(' ')[0] : '');
    setEditStoreUrl(lic.store_url || '');
    setEditUserId(lic.user_id || '');
    setEditStatus(lic.status || 'active');
  };

  const handleSaveEditLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLic) return;
    setEditSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('id', String(editingLic.id));
      formData.append('package_tier', editTier);
      formData.append('expires_at', editExpiresAt);
      formData.append('store_url', editStoreUrl.trim());
      formData.append('status', editStatus);
      if (editUserId !== '') {
        formData.append('user_id', String(editUserId));
      }

      const res = await fetch('index.php?action=api_update', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert('✨ License key details updated successfully!', 'success');
        setEditingLic(null);
        onRefresh();
      } else {
        showAlert(data.error || 'Failed to update license key', 'error');
      }
    } catch (err: any) {
      showAlert('Error updating license key: ' + err.message, 'error');
    } finally {
      setEditSubmitting(false);
    }
  };

  const toggleKeyMask = (id: number) => {

    setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showAlert('📋 License key copied to clipboard!', 'success');
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenSubmitting(true);
    try {
      const formData = new FormData();
      if (genUserId > 0) formData.append('user_id', String(genUserId));
      formData.append('package_tier', genTier);
      formData.append('expires_at', genExpires);
      formData.append('store_url', genStoreUrl.trim());

      const res = await fetch('?action=api_generate', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`🔑 License key generated successfully: ${data.license_key}`, 'success');
        setGenUserId(0);
        setGenExpires('');
        setGenStoreUrl('');
        onRefresh();
      } else {
        showAlert(data.error || 'Failed to generate license key', 'error');
      }
    } catch (err: any) {
      showAlert('Error generating key: ' + err.message, 'error');
    } finally {
      setGenSubmitting(false);
    }
  };

  const promptConfirmStatus = (lic: License, targetAction: 'suspend' | 'activate') => {
    setConfirmLic(lic);
    setConfirmActionType(targetAction);
  };

  const handleExecuteStatusToggle = async () => {
    if (!confirmLic) return;
    setConfirmSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('id', String(confirmLic.id));
      formData.append('status', confirmActionType === 'suspend' ? 'suspended' : 'active');

      const res = await fetch('?action=api_update_license', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`License status marked as ${confirmActionType.toUpperCase()}`, 'success');
        setConfirmLic(null);
        onRefresh();
      } else {
        showAlert(data.error || 'Failed to update license status', 'error');
      }
    } catch (err: any) {
      showAlert('Error updating status: ' + err.message, 'error');
    } finally {
      setConfirmSubmitting(false);
    }
  };

  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendingLic) return;
    setExtendSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('id', String(extendingLic.id));
      if (extendCustomDate) {
        formData.append('custom_date', extendCustomDate);
      } else {
        formData.append('months', String(extendMonths));
      }

      const res = await fetch('?action=api_extend_license', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`License expiration extended successfully!`, 'success');
        setExtendingLic(null);
        setExtendCustomDate('');
        onRefresh();
      } else {
        showAlert(data.error || 'Failed to extend license', 'error');
      }
    } catch (err: any) {
      showAlert('Error extending license: ' + err.message, 'error');
    } finally {
      setExtendSubmitting(false);
    }
  };

  const handleDomainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainLic) return;
    setDomainSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('id', String(domainLic.id));
      const domains = domainInput.split('\n').map(d => d.trim()).filter(Boolean);
      formData.append('domains', JSON.stringify(domains));

      const res = await fetch('?action=api_update_license_domains', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`Bound store domain updated successfully!`, 'success');
        setDomainLic(null);
        onRefresh();
      } else {
        showAlert(data.error || 'Failed to update store domains', 'error');
      }
    } catch (err: any) {
      showAlert('Error updating domains: ' + err.message, 'error');
    } finally {
      setDomainSubmitting(false);
    }
  };

  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignLic) return;
    setReassignSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('id', String(reassignLic.id));
      formData.append('user_id', String(reassignUserId));

      const res = await fetch('?action=api_assign_license', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`License reassigned successfully!`, 'success');
        setReassignLic(null);
        onRefresh();
      } else {
        showAlert(data.error || 'Failed to reassign license', 'error');
      }
    } catch (err: any) {
      showAlert('Error reassigning license: ' + err.message, 'error');
    } finally {
      setReassignSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deletingLic) return;
    setDeleteSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('id', String(deletingLic.id));

      const res = await fetch('?action=api_delete_license', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`License key deleted successfully!`, 'success');
        setDeletingLic(null);
        onRefresh();
      } else {
        showAlert(data.error || 'Failed to delete license', 'error');
      }
    } catch (err: any) {
      showAlert('Error deleting license: ' + err.message, 'error');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const renderExpirationRadar = (expiresAt: string | null) => {
    if (!expiresAt) {
      return <span className="px-2 py-0.5 text-[0.65rem] font-bold uppercase rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 font-mono">♾️ Lifetime Key</span>;
    }
    const now = new Date();
    const exp = new Date(expiresAt);
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 3600 * 24));

    if (diffDays <= 0) {
      return <span className="px-2 py-0.5 text-[0.65rem] font-bold uppercase rounded-full bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/30 font-mono">🔴 Expired ({Math.abs(diffDays)}d ago)</span>;
    } else if (diffDays <= 30) {
      return <span className="px-2 py-0.5 text-[0.65rem] font-bold uppercase rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-mono">🟠 Expiring in {diffDays}d</span>;
    } else {
      const months = Math.round(diffDays / 30);
      return <span className="px-2 py-0.5 text-[0.65rem] font-bold uppercase rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-mono">🟢 Active ({months}m left)</span>;
    }
  };

  const expiringSoonCount = licenses.filter(l => {
    if (!l.expires_at) return false;
    const diffDays = Math.ceil((new Date(l.expires_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    return diffDays > 0 && diffDays <= 30;
  }).length;

  const filteredLicenses = useMemo(() => {
    return licenses.filter(lic => {
      if (filterMode === 'ALL') return true;
      if (filterMode === 'ACTIVE') return lic.status === 'active';
      if (filterMode === 'EXPIRING') {
        if (!lic.expires_at) return false;
        const diffDays = Math.ceil((new Date(lic.expires_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        return diffDays > 0 && diffDays <= 30;
      }
      if (filterMode === 'EXPIRED') {
        if (!lic.expires_at) return false;
        return new Date(lic.expires_at).getTime() < new Date().getTime();
      }
      return true;
    });
  }, [licenses, filterMode]);

  // Pagination calculation
  const totalItems = filteredLicenses.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedLicenses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLicenses.slice(start, start + pageSize);
  }, [filteredLicenses, currentPage, pageSize]);

  const clientOptions = [
    { value: '0', label: '-- Unassigned License (Standalone Key) --' },
    ...users.map(u => ({
      value: String(u.id),
      label: `👤 ${u.email} ${u.company_name ? `(${u.company_name})` : ''}`,
    })),
  ];


  return (
    <div className="space-y-6">
      {/* 2-Column Overview & Issue Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Normalized 4-Card Overview Inventory */}
        <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <SectionHeader
            title={t('inventory_title')}
            subtitle={t('inventory_subtitle')}
            icon={CheckCircle}
          />

          <div className="grid grid-cols-2 gap-3 my-2">
            <StatCard label={t('stat_total_keys')} value={licenses.length} icon={Key} color="purple" />
            <StatCard label={t('stat_active_keys')} value={licenses.filter(l => l.status === 'active').length} icon={CheckCircle} color="emerald" />
            <StatCard label={t('stat_expiring_soon')} value={expiringSoonCount} icon={Clock} color="amber" />
            <StatCard label={t('stat_unassigned_keys')} value={licenses.filter(l => !l.user_id).length} icon={Unlock} color="blue" />
          </div>

          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-[0.72rem] text-purple-700 dark:text-purple-300 flex items-center gap-2">
            <span className="shrink-0">💡</span>
            <span>{t('lic_inventory_tip')}</span>
          </div>
        </div>

        {/* Issue & Assign License Key Form */}
        <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm">
          <SectionHeader
            title={t('btn_issue_key')}
            subtitle="Issue license keys and assign to client accounts."
            icon={Key}
          />
          <form onSubmit={handleGenerateKey} className="mt-4 space-y-4">
            <FormSelect
              label="Target Client Account"
              icon={User}
              value={genUserId}
              onChange={e => setGenUserId(Number(e.target.value))}
              options={clientOptions}
            />

            <FormSelect
              label="Package Tier"
              icon={Package}
              value={genTier}
              onChange={e => setGenTier(e.target.value)}
              options={tierOptions}
            />

            <FormInput
              label="Optional Expiry Date"
              icon={Calendar}
              type="date"
              value={genExpires}
              onChange={e => setGenExpires(e.target.value)}
            />

            <FormInput
              label={t('field_bound_url')}
              icon={Globe}
              type="text"
              placeholder={t('ph_store_url')}
              value={genStoreUrl}
              onChange={e => setGenStoreUrl(e.target.value)}
            />

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                icon={PlusCircle}
                loading={genSubmitting}
              >
                {t('btn_generate')}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Main License Registry Table Container */}
      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-pm-border pb-4">
          <SectionHeader
            title={t('licenses_title')}
            subtitle={t('licenses_subtitle')}
            icon={Key}
          />

          <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
            {/* Cleaned Status Filter Tab Pills */}
            <div className="flex items-center gap-1 bg-pm-input p-1 rounded-xl">
              {(['ALL', 'ACTIVE', 'EXPIRING', 'EXPIRED'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setFilterMode(mode);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
                    filterMode === mode
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-pm-secondary hover:text-pm-text hover:bg-pm-card/60'
                  }`}
                >
                  {mode === 'ALL' && 'All Keys'}
                  {mode === 'ACTIVE' && '🟢 Active'}
                  {mode === 'EXPIRING' && '🟠 Expiring Soon'}
                  {mode === 'EXPIRED' && '🔴 Expired'}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <Button
              variant="neutral"
              size="sm"
              icon={RefreshCw}
              loading={isRefreshing}
              onClick={handleRefresh}
            >
              {t('btn_refresh')}
            </Button>
          </div>

        </div>

        <div className="overflow-x-auto rounded-xl border border-pm-border">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-pm-input text-pm-secondary uppercase font-bold border-b border-pm-border text-[10px]">
                <th className="p-3">{t('th_license_key')}</th>
                <th className="p-3">{t('th_assigned_user')}</th>
                <th className="p-3">{t('th_tier')}</th>
                <th className="p-3">{t('th_status')}</th>
                <th className="p-3">{t('th_domains')}</th>
                <th className="p-3">{t('th_expires')}</th>
                <th className="p-3 text-right">{t('th_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pm-border">
              {paginatedLicenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-pm-secondary italic">
                    No license keys found matching the active filter view.
                  </td>
                </tr>
              ) : (
                paginatedLicenses.map(lic => {
                  const isVisible = visibleKeys[lic.id];
                  const isSuspended = lic.status === 'suspended';

                  return (
                    <tr key={lic.id} className="hover:bg-pm-input/50 transition">
                      <td className="p-3 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-pm-text text-xs">
                            {isVisible ? lic.license_key : '••••-••••-••••-••••'}
                          </span>
                          <button
                            onClick={() => toggleKeyMask(lic.id)}
                            className="p-1 rounded hover:bg-pm-input text-pm-secondary hover:text-pm-text transition"
                          >
                            {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(lic.license_key)}
                            className="p-1 rounded hover:bg-pm-input text-pm-secondary hover:text-pm-text transition"
                            title="Copy Key"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      <td className="p-3 font-semibold text-pm-text">
                        {lic.user_email ? (
                          <div className="space-y-0.5">
                            {onInspectClient ? (
                              <button
                                onClick={() => {
                                  const foundUser = users.find(u => u.id === lic.user_id);
                                  if (foundUser) onInspectClient(foundUser);
                                }}
                                className="font-bold text-pm-text hover:text-purple-500 transition text-left block"
                              >
                                {lic.user_email}
                              </button>
                            ) : (
                              <span>{lic.user_email}</span>
                            )}
                            {lic.company_name && (
                              <div className="text-[10px] text-pm-secondary font-mono flex items-center gap-1">
                                <span>🏢</span>
                                {onInspectCompany ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const foundComp = companies.find(c => (c.company_name || '').toLowerCase() === (lic.company_name || '').toLowerCase());
                                      if (foundComp) onInspectCompany(foundComp, lic.license_key);
                                    }}
                                    className="hover:underline hover:text-purple-400 font-bold"
                                  >
                                    {lic.company_name}
                                  </button>
                                ) : (
                                  <span>{lic.company_name}</span>
                                )}
                              </div>
                            )}

                          </div>
                        ) : (
                          <span className="italic text-pm-secondary">{t('lic_standalone')}</span>
                        )}
                      </td>

                      <td className="p-3 uppercase font-bold text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                          {lic.package_tier}
                        </span>
                      </td>

                      <td className="p-3 uppercase font-bold">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          lic.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                        }`}>
                          {lic.status}
                        </span>
                      </td>

                      <td className="p-3 font-mono text-[0.72rem]">
                        {lic.store_url ? (
                          <span className="text-pm-text font-bold">{lic.store_url}</span>
                        ) : (
                          <span className="italic text-pm-secondary">{t('lic_unbound')}</span>
                        )}
                      </td>

                      <td className="p-3">{renderExpirationRadar(lic.expires_at)}</td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="neutral"
                            size="sm"
                            icon={Eye}
                            onClick={() => {
                              if (lic.company_id && onInspectCompany) {
                                const foundCompany = companies.find(c => c.id === lic.company_id);
                                if (foundCompany) {
                                  onInspectCompany(foundCompany, lic.license_key);
                                  return;
                                }
                              }
                              if (lic.user_id && onInspectClient) {
                                const foundUser = users.find(u => u.id === lic.user_id);
                                if (foundUser) {
                                  onInspectClient(foundUser);
                                  return;
                                }
                              }
                              showAlert('No linked company or client available for inspection.', 'error');
                            }}
                          >
                            Inspect
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Edit}
                            onClick={() => openEditLicenseModal(lic)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant={isSuspended ? 'success' : 'danger'}
                            size="sm"
                            icon={isSuspended ? CheckCircle : ShieldAlert}
                            onClick={() => promptConfirmStatus(lic, isSuspended ? 'activate' : 'suspend')}
                          >
                            {isSuspended ? t('btn_activate') : t('btn_suspend')}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            icon={Trash2}
                            onClick={() => setDeletingLic(lic)}
                          >
                            {t('btn_delete')}
                          </Button>
                        </div>
                      </td>

                    </tr>
                  );
                })
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

      {/* Suspend / Activate Safety Shield Confirm Modal */}
      <ConfirmModal
        isOpen={!!confirmLic}
        onClose={() => setConfirmLic(null)}
        onConfirm={handleExecuteStatusToggle}
        title={confirmActionType === 'suspend' ? 'Suspend License Key Access?' : 'Activate License Key Access?'}
        message={confirmActionType === 'suspend' 
          ? `Are you sure you want to suspend license key ${confirmLic?.license_key}? Module functionality for store '${confirmLic?.store_url || 'Unbound'}' will be immediately revoked.`
          : `Are you sure you want to activate license key ${confirmLic?.license_key}? Store access will be immediately restored.`
        }
        confirmText={confirmActionType === 'suspend' ? 'Yes, Suspend Key' : 'Yes, Activate Key'}
        cancelText="Cancel"
        variant={confirmActionType === 'suspend' ? 'danger' : 'info'}
        loading={confirmSubmitting}
      />

      {/* Extend Expiration Modal */}
      <BaseModal
        isOpen={!!extendingLic}
        onClose={() => setExtendingLic(null)}
        title={`Extend License #${extendingLic?.id || ''}`}
        icon={Clock}
        maxWidth="md"
      >
        {extendingLic && (
          <form onSubmit={handleExtendSubmit} className="space-y-4">
            <FormSelect
              label="Add Duration Months"
              value={extendMonths}
              onChange={e => setExtendMonths(Number(e.target.value))}
              options={[
                { value: '1', label: '+1 Month' },
                { value: '3', label: '+3 Months' },
                { value: '6', label: '+6 Months' },
                { value: '12', label: '+12 Months (1 Year)' },
                { value: '24', label: '+24 Months (2 Years)' },
              ]}
            />

            <FormInput
              label="Or Set Exact Custom Expiration Date"
              type="date"
              value={extendCustomDate}
              onChange={e => setExtendCustomDate(e.target.value)}
            />

            <div className="flex justify-end gap-3 pt-3 border-t border-pm-border">
              <Button variant="neutral" size="md" onClick={() => setExtendingLic(null)}>
                {t('btn_cancel')}
              </Button>
              <Button variant="primary" size="md" type="submit" loading={extendSubmitting}>
                Save Expiration
              </Button>
            </div>
          </form>
        )}
      </BaseModal>

      {/* Delete License Confirmation Modal */}
      <BaseModal
        isOpen={!!deletingLic}
        onClose={() => setDeletingLic(null)}
        title="Delete License Key?"
        icon={Trash2}
        variant="danger"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-pm-secondary leading-relaxed">
            Are you sure you want to delete license key <strong>{deletingLic?.license_key}</strong>?
            This action is permanent and cannot be reversed.
          </p>
          <div className="flex justify-end gap-3 pt-3 border-t border-pm-border">
            <Button variant="neutral" size="md" onClick={() => setDeletingLic(null)}>
              {t('btn_cancel')}
            </Button>
            <Button variant="danger" size="md" onClick={handleDeleteSubmit} loading={deleteSubmitting}>
              {t('btn_delete')} Key
            </Button>
          </div>
        </div>
      </BaseModal>

      {/* Edit License Modal */}
      <BaseModal
        isOpen={!!editingLic}
        onClose={() => setEditingLic(null)}
        title={`Edit License Key #${editingLic?.id || ''}`}
        icon={Edit}
        maxWidth="lg"
      >
        {editingLic && (
          <form onSubmit={handleSaveEditLicense} className="space-y-4">
            <div className="p-3 bg-pm-input/50 rounded-xl border border-pm-border space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-pm-secondary">License Key</label>
              <div className="font-mono text-sm font-bold text-purple-400 select-all">{editingLic.license_key}</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormSelect
                label="Package Tier"
                value={editTier}
                onChange={e => setEditTier(e.target.value)}
                options={tierOptions}
              />


              <FormSelect
                label="License Status"
                value={editStatus}
                onChange={e => setEditStatus(e.target.value as any)}
                options={[
                  { value: 'active', label: 'ACTIVE' },
                  { value: 'suspended', label: 'SUSPENDED' },
                  { value: 'expired', label: 'EXPIRED' },
                ]}
              />
            </div>

            <FormInput
              label="Bound Store Domain"
              type="text"
              placeholder="e.g. store.myshop.com"
              value={editStoreUrl}
              onChange={e => setEditStoreUrl(e.target.value)}
            />

            <FormInput
              label="Expiration Date (Leave blank for Lifetime)"
              type="date"
              value={editExpiresAt}
              onChange={e => setEditExpiresAt(e.target.value)}
            />

            <FormSelect
              label="Assigned Client Account"
              value={editUserId}
              onChange={e => setEditUserId(e.target.value ? Number(e.target.value) : '')}
              options={[
                { value: '', label: '-- Unassigned (Pool Key) --' },
                ...users.map(u => ({
                  value: String(u.id),
                  label: `👤 ${u.name ? `${u.name} (${u.email})` : u.email} ${u.company_name ? `• 🏢 ${u.company_name}` : ''}`
                }))
              ]}
            />

            <div className="flex justify-end gap-3 pt-3 border-t border-pm-border">
              <Button variant="neutral" size="md" type="button" onClick={() => setEditingLic(null)}>
                {t('btn_cancel')}
              </Button>
              <Button variant="primary" size="md" type="submit" loading={editSubmitting}>
                Save License Changes
              </Button>
            </div>
          </form>
        )}
      </BaseModal>
    </div>
  );
};


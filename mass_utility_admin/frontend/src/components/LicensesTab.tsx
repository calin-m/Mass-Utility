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
  onRefresh: () => void;
  showAlert: (msg: string, type?: 'success' | 'error') => void;
}

export const LicensesTab: React.FC<LicensesTabProps> = ({ licenses, users = [], onRefresh, showAlert }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      showAlert('🔄 License registry reloaded!', 'success');
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // License Key Generation State
  const [genUserId, setGenUserId] = useState<number>(0);
  const [genTier, setGenTier] = useState('basic');
  const [genExpires, setGenExpires] = useState('');
  const [genDomain, setGenDomain] = useState('');
  const [generatingKey, setGeneratingKey] = useState(false);

  // Edit Modal State
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [editUserId, setEditUserId] = useState<number>(0);
  const [editTier, setEditTier] = useState<string>('basic');
  const [editStatus, setEditStatus] = useState<string>('active');
  const [editDomain, setEditDomain] = useState<string>('');
  const [editExpires, setEditExpires] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // Status Toggle Confirmation State
  const [toggleConfirmLicense, setToggleConfirmLicense] = useState<License | null>(null);
  const [togglingLicense, setTogglingLicense] = useState<boolean>(false);

  // Key Masking State
  const [revealedKeys, setRevealedKeys] = useState<{ [id: number]: boolean }>({});

  // Filter & Expiration Radar State
  const [filterMode, setFilterMode] = useState<'ALL' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED'>('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Extension Modal State
  const [extendingLicense, setExtendingLicense] = useState<License | null>(null);
  const [extMonths, setExtMonths] = useState<number>(6);
  const [extCustomDate, setExtCustomDate] = useState<string>('');
  const [savingExtension, setSavingExtension] = useState<boolean>(false);

  // Multi-Domain Modal State
  const [domainLicense, setDomainLicense] = useState<License | null>(null);
  const [domainList, setDomainList] = useState<string[]>([]);
  const [newDomainInput, setNewDomainInput] = useState<string>('');
  const [savingDomains, setSavingDomains] = useState<boolean>(false);

  const toggleKeyMask = (id: number) => {
    setRevealedKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    showAlert('📋 License key copied to clipboard!', 'success');
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingKey(true);
    try {
      const formData = new FormData();
      formData.append('user_id', String(genUserId));
      formData.append('package_tier', genTier);
      formData.append('expires_at', genExpires);
      formData.append('store_url', genDomain);

      const res = await fetch('index.php?action=api_generate', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert('🔑 New License Key generated successfully!', 'success');
        setGenUserId(0);
        setGenExpires('');
        setGenDomain('');
        onRefresh();
      } else {
        showAlert('❌ Error: ' + (data.error || 'Failed to generate key'), 'error');
      }
    } catch (err: any) {
      showAlert('❌ Request failed: ' + err.message, 'error');
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleExecuteToggleStatus = async () => {
    if (!toggleConfirmLicense) return;
    setTogglingLicense(true);
    const nextStatus = toggleConfirmLicense.status === 'active' ? 'suspended' : 'active';
    try {
      const formData = new FormData();
      formData.append('id', String(toggleConfirmLicense.id));
      formData.append('status', nextStatus);
      formData.append('package_tier', toggleConfirmLicense.package_tier);
      formData.append('expires_at', toggleConfirmLicense.expires_at || '');
      formData.append('store_url', toggleConfirmLicense.store_url || '');

      const res = await fetch('index.php?action=api_update', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`License #${toggleConfirmLicense.id} status updated to ${nextStatus.toUpperCase()}`, 'success');
        setToggleConfirmLicense(null);
        onRefresh();
      } else {
        showAlert('❌ Error: ' + (data.error || 'Failed to update license'), 'error');
      }
    } catch (err: any) {
      showAlert('❌ Request failed: ' + err.message, 'error');
    } finally {
      setTogglingLicense(false);
    }
  };

  const openEditModal = (lic: License) => {
    setEditingLicense(lic);
    setEditUserId(lic.user_id || 0);
    setEditTier(lic.package_tier || 'basic');
    setEditStatus(lic.status || 'active');
    setEditDomain(lic.store_url || '');
    setEditExpires(lic.expires_at || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLicense) return;
    setSavingEdit(true);
    try {
      const formData = new FormData();
      formData.append('id', String(editingLicense.id));
      formData.append('user_id', String(editUserId));
      formData.append('package_tier', editTier);
      formData.append('status', editStatus);
      formData.append('store_url', editDomain);
      formData.append('expires_at', editExpires);

      const res = await fetch('index.php?action=api_update', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`License #${editingLicense.id} updated successfully!`, 'success');
        setEditingLicense(null);
        onRefresh();
      } else {
        showAlert('❌ Error: ' + (data.error || 'Failed to update license'), 'error');
      }
    } catch (err: any) {
      showAlert('❌ Request failed: ' + err.message, 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete Confirmation Modal State
  const [deleteConfirmLicense, setDeleteConfirmLicense] = useState<License | null>(null);
  const [deletingLicense, setDeletingLicense] = useState<boolean>(false);

  const handleExecuteDeleteLicense = async () => {
    if (!deleteConfirmLicense) return;
    setDeletingLicense(true);
    try {
      const formData = new FormData();
      formData.append('id', String(deleteConfirmLicense.id));

      const res = await fetch('index.php?action=api_delete_license', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`🗑️ License Key #${deleteConfirmLicense.id} deleted successfully.`, 'success');
        setDeleteConfirmLicense(null);
        onRefresh();
      } else {
        showAlert('❌ Error: ' + (data.error || 'Failed to delete license'), 'error');
      }
    } catch (err: any) {
      showAlert('❌ Request failed: ' + err.message, 'error');
    } finally {
      setDeletingLicense(false);
    }
  };

  const openDomainModal = (lic: License) => {
    setDomainLicense(lic);
    if (lic.store_url) {
      const parsed = lic.store_url.split(',').map(s => s.trim()).filter(Boolean);
      setDomainList(parsed);
    } else {
      setDomainList([]);
    }
    setNewDomainInput('');
  };

  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainInput.trim()) return;
    const clean = newDomainInput.trim().toLowerCase().replace(/^https?:\/\//, '');
    if (domainList.includes(clean)) {
      showAlert('⚠️ Domain already added to authorization list.', 'error');
      return;
    }
    setDomainList([...domainList, clean]);
    setNewDomainInput('');
  };

  const handleRemoveDomain = (domainToRemove: string) => {
    setDomainList(domainList.filter(d => d !== domainToRemove));
  };

  const handleSaveDomains = async () => {
    if (!domainLicense) return;
    setSavingDomains(true);
    try {
      const joinedDomains = domainList.join(',');
      const formData = new FormData();
      formData.append('id', String(domainLicense.id));
      formData.append('user_id', String(domainLicense.user_id || 0));
      formData.append('package_tier', domainLicense.package_tier);
      formData.append('status', domainLicense.status);
      formData.append('store_url', joinedDomains);
      formData.append('expires_at', domainLicense.expires_at || '');

      const res = await fetch('index.php?action=api_update', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`🌐 Authorized domains updated for License #${domainLicense.id}!`, 'success');
        setDomainLicense(null);
        onRefresh();
      } else {
        showAlert('❌ Error: ' + (data.error || 'Failed to update domains'), 'error');
      }
    } catch (err: any) {
      showAlert('❌ Request failed: ' + err.message, 'error');
    } finally {
      setSavingDomains(false);
    }
  };

  const handleSaveExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendingLicense) return;
    setSavingExtension(true);
    try {
      const formData = new FormData();
      formData.append('id', String(extendingLicense.id));
      if (extCustomDate) {
        formData.append('custom_date', extCustomDate);
      } else {
        formData.append('months', String(extMonths));
      }

      const res = await fetch('index.php?action=api_extend_license', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`⚡ License #${extendingLicense.id} expiration extended!`, 'success');
        setExtendingLicense(null);
        onRefresh();
      } else {
        showAlert('❌ Error: ' + (data.error || 'Failed to extend license'), 'error');
      }
    } catch (err: any) {
      showAlert('❌ Request failed: ' + err.message, 'error');
    } finally {
      setSavingExtension(false);
    }
  };

  const getExpirationBadge = (expiresAt: string | null) => {
    if (!expiresAt) {
      return <span className="px-2 py-0.5 text-[0.65rem] font-bold uppercase rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/30">Never (Lifetime)</span>;
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

  const tierOptions = [
    { value: 'basic', label: 'BASIC TIER' },
    { value: 'pro', label: 'PRO TIER' },
    { value: 'enterprise', label: 'ENTERPRISE TIER' },
  ];

  return (
    <div className="space-y-6">
      {/* 2-Column Overview & Issue Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Normalized 4-Card Overview Inventory */}
        <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <SectionHeader
            title="Active Subscriptions Inventory"
            subtitle="Real-time breakdown of store license keys, package tier allocations, and unassigned standalone keys."
            icon={CheckCircle}
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-2">
            <StatCard label="Total Keys" value={licenses.length} icon={Key} color="purple" />
            <StatCard label="Active Keys" value={licenses.filter(l => l.status === 'active').length} icon={CheckCircle} color="emerald" />
            <StatCard label="Expiring Soon" value={expiringSoonCount} icon={Clock} color="amber" />
            <StatCard label="Unassigned" value={licenses.filter(l => !l.user_id).length} icon={Unlock} color="blue" />
          </div>

          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-[0.72rem] text-purple-700 dark:text-purple-300 flex items-center gap-2">
            <span className="shrink-0">💡</span>
            <span>Need a new client profile? Manage client credentials under <strong>👥 Clients Directory</strong>.</span>
          </div>
        </div>

        {/* Issue & Assign License Key Form */}
        <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm">
          <SectionHeader
            title="Issue & Assign License Key"
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
              label="Pre-Bound Store URL (Optional)"
              icon={Globe}
              type="text"
              placeholder="e.g. store.myshop.com"
              value={genDomain}
              onChange={e => setGenDomain(e.target.value)}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full uppercase"
              loading={generatingKey}
            >
              Issue License Key
            </Button>
          </form>
        </div>
      </div>

      {/* License Registry Table with PaginationBar */}
      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm flex flex-col justify-between">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <SectionHeader
            title={`License Registry & Subscriptions (${filteredLicenses.length})`}
            subtitle="Complete audit ledger of active, suspended, and standalone license keys."
            icon={KeyRound}
            action={
              <Button
                variant="neutral"
                size="sm"
                icon={RefreshCw}
                loading={isRefreshing}
                onClick={handleRefresh}
              >
                Refresh
              </Button>
            }
          />

          {/* Cleaned Status Filter Tab Pills */}
          <div className="flex items-center gap-1 bg-pm-input p-1 rounded-xl shrink-0 self-start md:self-auto">
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
        </div>

        <div className="overflow-x-auto rounded-xl border border-pm-border">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-pm-input text-pm-secondary uppercase font-bold border-b border-pm-border text-[10px]">
                <th className="p-3">License Key</th>
                <th className="p-3">Assigned Client / Company</th>
                <th className="p-3">Tier</th>
                <th className="p-3">Status</th>
                <th className="p-3">Authorized Domain</th>
                <th className="p-3">Expiration Radar</th>
                <th className="p-3 text-right">Actions</th>
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
                  const isRevealed = revealedKeys[lic.id];
                  const maskedKey = lic.license_key ? `${lic.license_key.substring(0, 8)}-****-****-****` : '';
                  const boundDomains = lic.store_url ? lic.store_url.split(',').map(s => s.trim()).filter(Boolean) : [];

                  return (
                    <tr key={lic.id} className="hover:bg-pm-input/50 transition">
                      <td className="p-3 font-mono font-bold">
                        <div className="flex items-center gap-1.5">
                          <span className="text-purple-600 dark:text-purple-400">
                            {isRevealed ? lic.license_key : maskedKey}
                          </span>
                          <button
                            onClick={() => toggleKeyMask(lic.id)}
                            className="p-1 text-pm-secondary hover:text-pm-text rounded transition"
                            title={isRevealed ? 'Mask Key' : 'Reveal Key'}
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => copyKey(lic.license_key)}
                            className="p-1 text-pm-secondary hover:text-pm-text rounded transition ml-0.5"
                            title="Copy License Key"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      <td className="p-3">
                        {lic.user_id ? (
                          <div>
                            <div className="font-semibold text-pm-text">{lic.user_email}</div>
                            {lic.company_name && (
                              <div className="text-[0.68rem] text-pm-secondary">🏢 {lic.company_name}</div>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[0.65rem] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            Standalone / Unassigned
                          </span>
                        )}
                      </td>

                      <td className="p-3 uppercase font-extrabold text-[0.68rem]">
                        <span className="px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                          {lic.package_tier}
                        </span>
                      </td>

                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[0.65rem] font-extrabold uppercase border ${
                            lic.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {lic.status}
                        </span>
                      </td>

                      <td className="p-3 font-mono text-[0.72rem]">
                        {boundDomains.length === 0 ? (
                          <span className="italic text-pm-secondary">Unbound (Any Domain)</span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-pm-text font-bold">{boundDomains[0]}</span>
                            {boundDomains.length > 1 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold">
                                +{boundDomains.length - 1} more
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="p-3">{getExpirationBadge(lic.expires_at)}</td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={KeyRound}
                            onClick={() => openDomainModal(lic)}
                            title="Manage Authorized Domains"
                          >
                            Domains
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={RefreshCw}
                            onClick={() => setExtendingLicense(lic)}
                            title="Quick Extend Expiration"
                          >
                            Extend
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Edit}
                            onClick={() => openEditModal(lic)}
                            title="Edit License Settings"
                          >
                            Edit
                          </Button>

                          {lic.status === 'active' ? (
                            <Button
                              variant="danger"
                              size="sm"
                              icon={ShieldAlert}
                              onClick={() => setToggleConfirmLicense(lic)}
                              title="Suspend License Key"
                            >
                              Suspend
                            </Button>
                          ) : (
                            <Button
                              variant="success"
                              size="sm"
                              icon={CheckCircle}
                              onClick={() => setToggleConfirmLicense(lic)}
                              title="Activate License Key"
                            >
                              Activate
                            </Button>
                          )}

                          <Button
                            variant="danger"
                            size="sm"
                            icon={Trash2}
                            onClick={() => setDeleteConfirmLicense(lic)}
                            title="Permanently Delete License Key"
                          >
                            Delete
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

        {/* Master PaginationBar Component Primitive */}
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Edit License Modal Dialog */}
      <BaseModal
        isOpen={!!editingLicense}
        onClose={() => setEditingLicense(null)}
        title={`Edit License Key #${editingLicense?.id || ''}`}
        icon={Edit}
        maxWidth="lg"
      >
        {editingLicense && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <FormSelect
              label="Assigned Client Account"
              icon={User}
              value={editUserId}
              onChange={e => setEditUserId(Number(e.target.value))}
              options={clientOptions}
            />

            <FormSelect
              label="Package Tier"
              icon={Package}
              value={editTier}
              onChange={e => setEditTier(e.target.value)}
              options={tierOptions}
            />

            <FormSelect
              label="License Status"
              value={editStatus}
              onChange={e => setEditStatus(e.target.value)}
              options={[
                { value: 'active', label: 'ACTIVE' },
                { value: 'suspended', label: 'SUSPENDED' },
                { value: 'expired', label: 'EXPIRED' },
              ]}
            />

            <FormInput
              label="Authorized Store Domain URL"
              icon={Globe}
              type="text"
              placeholder="e.g. store.myshop.com"
              value={editDomain}
              onChange={e => setEditDomain(e.target.value)}
            />

            <FormInput
              label="Expiry Date (Leave empty for Lifetime)"
              icon={Calendar}
              type="date"
              value={editExpires}
              onChange={e => setEditExpires(e.target.value)}
            />

            <div className="flex justify-end gap-3 pt-3 border-t border-pm-border">
              <Button variant="neutral" size="md" onClick={() => setEditingLicense(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="md" type="submit" loading={savingEdit}>
                Save License Changes
              </Button>
            </div>
          </form>
        )}
      </BaseModal>

      {/* Quick Expiration Extension Modal Dialog */}
      <BaseModal
        isOpen={!!extendingLicense}
        onClose={() => setExtendingLicense(null)}
        title={`⚡ Quick Extend License #${extendingLicense?.id || ''}`}
        icon={RefreshCw}
        maxWidth="md"
      >
        {extendingLicense && (
          <form onSubmit={handleSaveExtension} className="space-y-4">
            <div className="bg-pm-input p-3 rounded-xl border border-pm-border text-xs">
              <span className="text-pm-secondary block text-[10px] uppercase font-bold">Target License Key</span>
              <span className="font-mono font-bold text-amber-500 dark:text-amber-400">{extendingLicense.license_key}</span>
              <div className="mt-1 text-pm-secondary text-[11px]">
                Current Expiration: <span className="text-pm-text font-semibold">{extendingLicense.expires_at || 'Never (Lifetime)'}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Quick Extend Duration</label>
              <div className="grid grid-cols-3 gap-2">
                {[3, 6, 12].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setExtMonths(m);
                      setExtCustomDate('');
                    }}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition ${
                      extMonths === m && !extCustomDate
                        ? 'bg-purple-600 border-purple-500 text-white shadow-md'
                        : 'bg-pm-input border-pm-border text-pm-secondary hover:text-pm-text'
                    }`}
                  >
                    +{m} Months
                  </button>
                ))}
              </div>
            </div>

            <FormInput
              label="Or Set Exact Expiration Date"
              icon={Calendar}
              type="date"
              value={extCustomDate}
              onChange={e => setExtCustomDate(e.target.value)}
            />

            <div className="flex justify-end gap-3 pt-3 border-t border-pm-border">
              <Button variant="neutral" size="md" onClick={() => setExtendingLicense(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="md" type="submit" loading={savingExtension}>
                Apply Extension
              </Button>
            </div>
          </form>
        )}
      </BaseModal>

      {/* Multi-Domain Store Binding Modal Dialog */}
      <BaseModal
        isOpen={!!domainLicense}
        onClose={() => setDomainLicense(null)}
        title={`🌐 Authorized Store Domains #${domainLicense?.id || ''}`}
        icon={KeyRound}
        maxWidth="lg"
      >
        {domainLicense && (
          <div className="space-y-4">
            <div className="bg-pm-input p-3 rounded-xl border border-pm-border text-xs">
              <span className="text-pm-secondary block text-[10px] uppercase font-bold">Package Tier Domain Limit</span>
              <span className="font-bold text-pm-text uppercase">{domainLicense.package_tier} Tier</span>
              <span className="text-pm-secondary text-[11px] block mt-0.5">
                Authorized domains: <strong className="text-purple-600 dark:text-purple-400 font-mono">{domainList.length} bound</strong>
              </span>
            </div>

            {/* Existing Domain Tags */}
            <div>
              <label className="block text-xs font-semibold uppercase text-pm-secondary mb-2">Bound Store Domains</label>
              {domainList.length === 0 ? (
                <p className="text-xs text-pm-secondary italic bg-pm-input p-3 rounded-lg border border-pm-border">
                  No domains bound yet. Add your first authorized domain below.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                  {domainList.map(d => (
                    <span
                      key={d}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/40 flex items-center gap-2"
                    >
                      <span>{d}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDomain(d)}
                        className="text-purple-500 hover:text-rose-500 transition font-bold"
                        title="Remove Domain"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Add Domain Input Form */}
            <form onSubmit={handleAddDomain} className="flex items-end gap-2">
              <div className="flex-1">
                <FormInput
                  icon={Globe}
                  placeholder="e.g. staging.myshop.com"
                  value={newDomainInput}
                  onChange={e => setNewDomainInput(e.target.value)}
                />
              </div>
              <Button type="submit" variant="neutral" size="md">
                + Add Domain
              </Button>
            </form>

            <div className="flex justify-end gap-3 pt-3 border-t border-pm-border">
              <Button variant="neutral" size="md" onClick={() => setDomainLicense(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="md" onClick={handleSaveDomains} loading={savingDomains}>
                Save Domain Binding
              </Button>
            </div>
          </div>
        )}
      </BaseModal>

      {/* Suspend / Activate Safety Confirmation Modal */}
      <ConfirmModal
        isOpen={!!toggleConfirmLicense}
        onClose={() => setToggleConfirmLicense(null)}
        onConfirm={handleExecuteToggleStatus}
        title={toggleConfirmLicense?.status === 'active' ? 'Suspend License Key?' : 'Activate License Key?'}
        message={
          toggleConfirmLicense?.status === 'active'
            ? `Are you sure you want to suspend License Key "${toggleConfirmLicense?.license_key}" (ID #${toggleConfirmLicense?.id})? Active store integration requests will be rejected immediately.`
            : `Are you sure you want to activate License Key "${toggleConfirmLicense?.license_key}" (ID #${toggleConfirmLicense?.id})? Active store integration requests will be restored.`
        }
        confirmText={toggleConfirmLicense?.status === 'active' ? 'Suspend License' : 'Activate License'}
        cancelText="Cancel"
        variant={toggleConfirmLicense?.status === 'active' ? 'danger' : 'info'}
        loading={togglingLicense}
      />

      {/* Delete License Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirmLicense}
        onClose={() => setDeleteConfirmLicense(null)}
        onConfirm={handleExecuteDeleteLicense}
        title="Permanently Delete License Key?"
        message={`Are you sure you want to delete license key "${deleteConfirmLicense?.license_key}" (ID #${deleteConfirmLicense?.id})? This action is permanent and cannot be undone.`}
        confirmText="Delete License Key"
        cancelText="Cancel"
        variant="danger"
        loading={deletingLicense}
      />
    </div>
  );
};

import React, { useState } from 'react';
import { Eye, EyeOff, Copy, Edit, ShieldAlert, CheckCircle, PlusCircle, Key, Trash2, KeyRound, Unlock, RefreshCw } from 'lucide-react';
import { BaseModal } from './common/BaseModal';
import { ConfirmModal } from './common/ConfirmModal';
import { SectionHeader } from './common/SectionHeader';
import { StatCard } from './common/StatCard';

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

  // Key Masking State
  const [revealedKeys, setRevealedKeys] = useState<{ [id: number]: boolean }>({});

  // Filter & Expiration Radar State
  const [filterMode, setFilterMode] = useState<'ALL' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED'>('ALL');

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

  const handleToggleStatus = async (id: number, currentStatus: string, tier: string, expiry: string, domain: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const formData = new FormData();
      formData.append('id', String(id));
      formData.append('status', nextStatus);
      formData.append('package_tier', tier);
      formData.append('expires_at', expiry);
      formData.append('store_url', domain);

      const res = await fetch('index.php?action=api_update', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`License status updated to ${nextStatus.toUpperCase()}`, 'success');
        onRefresh();
      } else {
        showAlert('❌ Error: ' + (data.error || 'Failed to update license'), 'error');
      }
    } catch (err: any) {
      showAlert('❌ Request failed: ' + err.message, 'error');
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

  const maskKey = (key: string) => {
    if (!key || key.length < 8) return '****';
    return key.substring(0, 4) + ' - **** - **** - ' + key.substring(key.length - 4);
  };

  const parseDomains = (raw: string | null): string[] => {
    if (!raw) return [];
    try {
      if (raw.trim().startsWith('[')) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(d => String(d).trim()).filter(Boolean);
      }
    } catch (e) {}
    return raw.split(',').map(d => d.trim()).filter(Boolean);
  };

  const openDomainModal = (lic: License) => {
    setDomainLicense(lic);
    setDomainList(parseDomains(lic.store_url));
    setNewDomainInput('');
  };

  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainInput.trim()) return;
    const clean = newDomainInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!domainList.includes(clean)) {
      setDomainList([...domainList, clean]);
    }
    setNewDomainInput('');
  };

  const handleRemoveDomain = (domain: string) => {
    setDomainList(domainList.filter(d => d !== domain));
  };

  const handleSaveDomains = async () => {
    if (!domainLicense) return;
    setSavingDomains(true);
    try {
      const formData = new FormData();
      formData.append('id', String(domainLicense.id));
      domainList.forEach(d => formData.append('domains[]', d));

      const res = await fetch('index.php?action=api_update_license_domains', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert('🌐 Authorized store domains updated successfully!', 'success');
        setDomainLicense(null);
        onRefresh();
      } else {
        showAlert('❌ Error: ' + (data.error || 'Failed to update store domains'), 'error');
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
      return <span className="px-2 py-0.5 text-[0.65rem] font-bold uppercase rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/30">Never (Lifetime)</span>;
    }

    const now = new Date();
    const exp = new Date(expiresAt);
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 3600 * 24));

    if (diffDays <= 0) {
      return <span className="px-2 py-0.5 text-[0.65rem] font-bold uppercase rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-mono">🔴 Expired ({Math.abs(diffDays)}d ago)</span>;
    } else if (diffDays <= 30) {
      return <span className="px-2 py-0.5 text-[0.65rem] font-bold uppercase rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">🟠 Expiring in {diffDays}d</span>;
    } else {
      const months = Math.round(diffDays / 30);
      return <span className="px-2 py-0.5 text-[0.65rem] font-bold uppercase rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">🟢 Active ({months}m left)</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 2-Column Form Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subscription Inventory Overview */}
        <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm pm-card-elevation flex flex-col justify-between">
          <SectionHeader
            title="Active Subscriptions Inventory"
            subtitle="Real-time breakdown of store license keys, package tier allocations, and unassigned standalone keys."
            icon={CheckCircle}
          />

          <div className="grid grid-cols-3 gap-3 my-4">
            <StatCard label="Total Keys" value={licenses.length} icon={Key} color="purple" />
            <StatCard label="Active Keys" value={licenses.filter(l => l.status === 'active').length} icon={CheckCircle} color="emerald" />
            <StatCard label="Unassigned" value={licenses.filter(l => !l.user_id).length} icon={Unlock} color="amber" />
          </div>

          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-[0.72rem] text-purple-300">
            💡 <strong>Need a new client profile?</strong> Create and manage standalone client credentials under the <strong>👥 Clients Directory</strong> tab.
          </div>
        </div>

        {/* Generate License Key Card */}
        <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm pm-card-elevation">
          <SectionHeader
            title="Issue & Assign License Key"
            subtitle="Issue license keys and assign to client accounts."
            icon={Key}
          />
          <form onSubmit={handleGenerateKey} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Target Client Account</label>
              <select
                className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
                value={genUserId}
                onChange={e => setGenUserId(Number(e.target.value))}
              >
                <option value={0}>-- Unassigned License (Standalone Key) --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    👤 {u.email} {u.company_name ? `(${u.company_name})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Package Tier</label>
              <select
                className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
                value={genTier}
                onChange={e => setGenTier(e.target.value)}
              >
                <option value="basic">BASIC TIER</option>
                <option value="pro">PRO TIER</option>
                <option value="enterprise">ENTERPRISE TIER</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Optional Expiry Date</label>
              <input
                type="date"
                className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
                value={genExpires}
                onChange={e => setGenExpires(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Pre-Bound Store URL (Optional)</label>
              <input
                type="text"
                className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
                placeholder="e.g. store.myshop.com"
                value={genDomain}
                onChange={e => setGenDomain(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={generatingKey}
              className={`w-full pm-btn-primary py-2.5 rounded-lg text-xs font-bold uppercase transition flex items-center justify-center gap-2 ${generatingKey ? 'opacity-85 cursor-wait' : ''}`}
            >
              {generatingKey && <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />}
              <span>Issue License Key</span>
            </button>
          </form>
        </div>
      </div>

      {/* Active License Registry Table */}
      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm pm-card-elevation">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <SectionHeader
            title={`Active License Registry & Subscriptions (${licenses.length})`}
            subtitle="Complete audit ledger of active, suspended, and standalone license keys."
            icon={KeyRound}
            action={
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="pm-btn-neutral px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                title="Refresh License Registry"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-purple-400' : ''}`} /> Refresh
              </button>
            }
          />

          {/* Expiration Radar Filter Pills */}
          <div className="flex items-center gap-1.5 bg-pm-input/60 p-1 rounded-xl border border-pm-border/60 self-start md:self-auto">
            {(['ALL', 'ACTIVE', 'EXPIRING', 'EXPIRED'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filterMode === mode
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-pm-secondary hover:text-pm-text hover:bg-pm-input/80'
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

        <div className="overflow-x-auto rounded-lg border border-pm-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-pm-input text-pm-secondary uppercase font-bold border-b border-pm-border">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Company Owner</th>
                <th className="p-3">Assigned Employee</th>
                <th className="p-3">License Key</th>
                <th className="p-3">Bound Store Domains</th>
                <th className="p-3">Tier</th>
                <th className="p-3">Status</th>
                <th className="p-3">Expires At</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pm-border">
              {licenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-pm-secondary">
                    No active licenses registered yet.
                  </td>
                </tr>
              ) : (
                licenses
                  .filter(lic => {
                    if (filterMode === 'ACTIVE') return lic.status === 'active';
                    if (filterMode === 'EXPIRED') {
                      if (lic.status === 'expired') return true;
                      if (lic.expires_at) {
                        return new Date(lic.expires_at).getTime() <= new Date().getTime();
                      }
                      return false;
                    }
                    if (filterMode === 'EXPIRING') {
                      if (!lic.expires_at) return false;
                      const diffDays = Math.ceil((new Date(lic.expires_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                      return diffDays > 0 && diffDays <= 30;
                    }
                    return true;
                  })
                  .map(lic => {
                    const isRevealed = revealedKeys[lic.id];
                    const displayedKey = isRevealed ? lic.license_key : maskKey(lic.license_key);
                    const domains = parseDomains(lic.store_url);
                    return (
                      <tr key={lic.id} className="hover:bg-pm-input/50 transition">
                        <td className="p-3 font-mono font-semibold text-pm-secondary">#{lic.id}</td>
                        <td className="p-3 font-bold text-pm-text">
                          {lic.company_name ? (
                            <span className="text-purple-400 font-bold flex items-center gap-1">
                              🏢 {lic.company_name}
                            </span>
                          ) : (
                            <span className="italic text-pm-secondary/60">Standalone / Direct</span>
                          )}
                        </td>
                        <td className="p-3">
                          {lic.user_email ? (
                            <div className="flex flex-col">
                              {lic.user_name ? <span className="font-semibold text-pm-text">{lic.user_name}</span> : null}
                              <span className="text-[11px] font-mono text-pm-secondary">{lic.user_email}</span>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Available in Pool
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-amber-400 font-bold">{displayedKey}</span>
                            <button
                              type="button"
                              onClick={() => toggleKeyMask(lic.id)}
                              className="text-pm-secondary hover:text-pm-primary p-1 rounded"
                              title={isRevealed ? 'Hide Key' : 'Reveal Key'}
                            >
                              {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => copyKey(lic.license_key)}
                              className="text-pm-secondary hover:text-pm-primary p-1 rounded"
                              title="Copy License Key"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => openDomainModal(lic)}
                            className="flex flex-wrap gap-1 items-center hover:opacity-80 transition text-left"
                            title="Manage Authorized Store Domains"
                          >
                            {domains.length === 0 ? (
                              <span className="text-pm-secondary italic text-xs">🌐 Not bound yet</span>
                            ) : (
                              domains.map(d => (
                                <span key={d} className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                                  {d}
                                </span>
                              ))
                            )}
                          </button>
                        </td>
                        <td className="p-3 font-bold uppercase text-pm-primary">{lic.package_tier}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 text-[0.65rem] font-bold uppercase rounded-full border ${
                              lic.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                : lic.status === 'suspended'
                                ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                                : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                            }`}
                          >
                            {lic.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1 items-start">
                            {getExpirationBadge(lic.expires_at)}
                            <button
                              onClick={() => {
                                setExtendingLicense(lic);
                                setExtMonths(6);
                                setExtCustomDate('');
                              }}
                              className="text-[10px] text-purple-400 hover:text-purple-300 font-bold hover:underline"
                            >
                              ⚡ Extend / Renew
                            </button>
                          </div>
                        </td>
                        <td className="p-3 flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(lic)}
                            className="pm-btn-neutral px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition"
                            title="Edit License & Subscription"
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => handleToggleStatus(lic.id, lic.status, lic.package_tier, lic.expires_at || '', lic.store_url || '')}
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                              lic.status === 'active'
                                ? 'pm-btn-danger-outline'
                                : 'pm-btn-neutral'
                            }`}
                          >
                            {lic.status === 'active' ? '🛑 Suspend' : '✅ Activate'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmLicense(lic)}
                            className="pm-btn-danger-outline px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition"
                            title="Delete License Key"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit License Modal Dialog */}
      <BaseModal
        isOpen={!!editingLicense}
        onClose={() => setEditingLicense(null)}
        title={`Edit License & Subscription #${editingLicense?.id || ''}`}
        icon={Edit}
        maxWidth="lg"
      >
        {editingLicense && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">License Key (Read-Only)</label>
              <input
                type="text"
                readOnly
                className="w-full bg-pm-input/50 border border-pm-border rounded-lg px-3 py-2 text-xs font-mono text-amber-500 cursor-not-allowed"
                value={editingLicense.license_key}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Assigned Client Email / Account</label>
              <select
                className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
                value={editUserId}
                onChange={e => setEditUserId(Number(e.target.value))}
              >
                <option value={0}>-- Unassigned License (Standalone Key) --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    👤 {u.email} {u.company_name ? `(${u.company_name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Package Tier</label>
                <select
                  className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
                  value={editTier}
                  onChange={e => setEditTier(e.target.value)}
                >
                  <option value="basic">BASIC TIER</option>
                  <option value="pro">PRO TIER</option>
                  <option value="enterprise">ENTERPRISE TIER</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Subscription Status</label>
                <select
                  className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none font-bold"
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                >
                  <option value="active" className="text-emerald-500">ACTIVE</option>
                  <option value="suspended" className="text-rose-500">SUSPENDED</option>
                  <option value="expired" className="text-amber-500">EXPIRED</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Bound Store Domain / URL</label>
              <input
                type="text"
                className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
                placeholder="e.g. store.myshop.com"
                value={editDomain}
                onChange={e => setEditDomain(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Expires At Date</label>
              <input
                type="date"
                className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
                value={editExpires}
                onChange={e => setEditExpires(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-pm-border">
              <button
                type="button"
                onClick={() => setEditingLicense(null)}
                className="pm-btn-neutral px-4 py-2 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="pm-btn-primary px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-2"
              >
                {savingEdit ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </form>
        )}
      </BaseModal>

      {/* Extension & Renewal Modal Dialog */}
      <BaseModal
        isOpen={!!extendingLicense}
        onClose={() => setExtendingLicense(null)}
        title={`⚡ Extend License Expiration #${extendingLicense?.id || ''}`}
        icon={KeyRound}
        maxWidth="md"
      >
        {extendingLicense && (
          <form onSubmit={handleSaveExtension} className="space-y-4">
            <div className="bg-pm-input/50 p-3 rounded-xl border border-pm-border/50 text-xs">
              <span className="text-pm-secondary block text-[10px] uppercase font-bold">Target License Key</span>
              <span className="font-mono font-bold text-amber-400">{extendingLicense.license_key}</span>
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

            <div>
              <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Or Set Exact Expiration Date</label>
              <input
                type="date"
                className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
                value={extCustomDate}
                onChange={e => setExtCustomDate(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-pm-border">
              <button
                type="button"
                onClick={() => setExtendingLicense(null)}
                className="pm-btn-neutral px-4 py-2 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingExtension}
                className="pm-btn-primary px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-2"
              >
                {savingExtension ? 'Extending...' : '⚡ Apply Expiration Extension'}
              </button>
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
            <div className="bg-pm-input/50 p-3 rounded-xl border border-pm-border/50 text-xs">
              <span className="text-pm-secondary block text-[10px] uppercase font-bold">Package Tier Domain Limit</span>
              <span className="font-bold text-pm-text uppercase">{domainLicense.package_tier} Tier</span>
              <span className="text-pm-secondary text-[11px] block mt-0.5">
                Authorized domains: <strong className="text-purple-400 font-mono">{domainList.length} bound</strong>
              </span>
            </div>

            {/* Existing Domain Tags */}
            <div>
              <label className="block text-xs font-semibold uppercase text-pm-secondary mb-2">Bound Store Domains</label>
              {domainList.length === 0 ? (
                <p className="text-xs text-pm-secondary italic bg-pm-input/30 p-3 rounded-lg border border-pm-border/40">
                  No domains bound yet. Add your first authorized domain below.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                  {domainList.map(d => (
                    <span
                      key={d}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-purple-950/80 text-purple-300 border border-purple-500/40 flex items-center gap-2"
                    >
                      <span>{d}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDomain(d)}
                        className="text-purple-400 hover:text-rose-400 transition"
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
            <form onSubmit={handleAddDomain} className="flex gap-2">
              <input
                type="text"
                value={newDomainInput}
                onChange={e => setNewDomainInput(e.target.value)}
                placeholder="e.g. staging.myshop.com"
                className="flex-1 bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-xs text-pm-text focus:border-pm-primary focus:outline-none"
              />
              <button
                type="submit"
                className="pm-btn-neutral px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0"
              >
                + Add Domain
              </button>
            </form>

            <div className="flex justify-end gap-3 pt-3 border-t border-pm-border">
              <button
                type="button"
                onClick={() => setDomainLicense(null)}
                className="pm-btn-neutral px-4 py-2 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDomains}
                disabled={savingDomains}
                className="pm-btn-primary px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-2"
              >
                {savingDomains ? 'Saving...' : '💾 Save Domain Binding'}
              </button>
            </div>
          </div>
        )}
      </BaseModal>

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

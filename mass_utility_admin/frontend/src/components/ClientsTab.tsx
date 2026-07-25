import React, { useState } from 'react';
import { Users, Search, Edit, Trash2, Key, Eye, EyeOff, ShieldAlert, CheckCircle, Building, Mail, ExternalLink, RefreshCw, UserPlus, Check, Sparkles, Copy } from 'lucide-react';
import { License, UserAccount } from './LicensesTab';
import { BaseModal } from './common/BaseModal';
import { SectionHeader } from './common/SectionHeader';
import { StatCard } from './common/StatCard';

interface ClientsTabProps {
  users: UserAccount[];
  licenses: License[];
  onRefresh: () => void;
  showAlert: (msg: string, type?: 'success' | 'error') => void;
}

export const ClientsTab: React.FC<ClientsTabProps> = ({ users, licenses, onRefresh, showAlert }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  // Create Client Modal State (with localStorage draft persistence)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createEmail, setCreateEmailState] = useState(() => localStorage.getItem('pm_draft_client_email') || '');
  const [createPassword, setCreatePassword] = useState('');
  const [createCompany, setCreateCompanyState] = useState(() => localStorage.getItem('pm_draft_client_company') || '');
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  // 1-Click License Key Provisioning State
  const [issueKeyImmediately, setIssueKeyImmediately] = useState(false);
  const [selectedIssueTier, setSelectedIssueTier] = useState('basic');

  // Post-Creation Credentials Banner State
  const [lastCreatedCreds, setLastCreatedCreds] = useState<{ email: string; pass: string; key?: string } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);
  const [showBannerPass, setShowBannerPass] = useState(false);

  // Client 360 Deep-Dive Modal State
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);

  const setCreateEmail = (val: string) => {
    setCreateEmailState(val);
    try { localStorage.setItem('pm_draft_client_email', val); } catch (e) {}
  };

  const setCreateCompany = (val: string) => {
    setCreateCompanyState(val);
    try { localStorage.setItem('pm_draft_client_company', val); } catch (e) {}
  };

  const clearDraftMemory = () => {
    setCreateEmailState('');
    setCreateCompanyState('');
    setCreatePassword('');
    try {
      localStorage.removeItem('pm_draft_client_email');
      localStorage.removeItem('pm_draft_client_company');
    } catch (e) {}
  };

  const generateCreatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+=-';
    let pass = '';
    for (let i = 0; i < 16; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCreatePassword(pass);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEmail || !createPassword) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('email', createEmail);
      formData.append('password', createPassword);
      formData.append('company_name', createCompany);

      const res = await fetch('index.php?action=api_create_user', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        let generatedKey: string | undefined = undefined;

        // If 1-Click License Key Issue is checked, issue key immediately for newly created user
        if (issueKeyImmediately) {
          const newUser = data.users ? data.users.find((u: UserAccount) => u.email.toLowerCase() === createEmail.toLowerCase()) : null;
          const newUserId = newUser ? newUser.id : 0;

          if (newUserId > 0) {
            try {
              const genData = new FormData();
              genData.append('user_id', String(newUserId));
              genData.append('package_tier', selectedIssueTier);
              const genRes = await fetch('index.php?action=api_generate', { method: 'POST', body: genData });
              const genResult = await genRes.json();
              if (genResult.success) {
                generatedKey = genResult.key;
                showAlert(`✨ Client Account & ${selectedIssueTier.toUpperCase()} License Key issued successfully!`, 'success');
              } else {
                showAlert(`⚠️ Client created, but key issue failed: ${genResult.error}`, 'error');
              }
            } catch (genErr: any) {
              showAlert(`⚠️ Client created, but key issue failed: ${genErr.message}`, 'error');
            }
          }
        } else {
          showAlert('✨ Standalone Client Account created successfully!', 'success');
        }

        // Store credentials for quick copy banner
        setLastCreatedCreds({
          email: createEmail,
          pass: createPassword,
          key: generatedKey
        });
        setCopiedCreds(false);

        clearDraftMemory();
        setShowCreateModal(false);
        onRefresh();
      } else {
        showAlert(`❌ Creation failed: ${data.error || 'Unknown error'}`, 'error');
      }
    } catch (err: any) {
      showAlert(`❌ Request failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyCreatedCredentials = () => {
    if (!lastCreatedCreds) return;
    const text = [
      `Client Email: ${lastCreatedCreds.email}`,
      `Password: ${lastCreatedCreds.pass}`,
      ...(lastCreatedCreds.key ? [`License Key: ${lastCreatedCreds.key}`] : []),
      `SaaS Dashboard: ${window.location.origin}/mass_utility_dashboard/`
    ].join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopiedCreds(true);
      setTimeout(() => setCopiedCreds(false), 3000);
    });
  };

  // Modal States
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'suspended'>('active');

  const [resetPassUser, setResetPassUser] = useState<UserAccount | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [deletingUser, setDeletingUser] = useState<UserAccount | null>(null);

  const [loading, setLoading] = useState(false);

  const getApiUrl = (action: string) => `${window.location.pathname}?action=${action}`;

  // Helper aggregations
  const totalClients = users.length;
  const activeClients = users.filter(u => u.status !== 'suspended').length;
  const suspendedClients = users.filter(u => u.status === 'suspended').length;

  const totalBoundDomains = licenses.filter(l => l.store_url).length;

  // Filter clients
  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.company_name && u.company_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && u.status !== 'suspended') ||
      (statusFilter === 'suspended' && u.status === 'suspended');

    return matchesSearch && matchesStatus;
  });

  // Calculate client licenses & bound domains
  const getClientStats = (userId: number) => {
    const userLics = licenses.filter(l => l.user_id === userId);
    const activeLics = userLics.filter(l => l.status === 'active').length;
    const boundDomains = userLics.map(l => l.store_url).filter(Boolean);
    return { userLics, total: userLics.length, active: activeLics, boundDomains };
  };

  // Open Edit Modal
  const openEditModal = (u: UserAccount) => {
    setEditingUser(u);
    setEditEmail(u.email);
    setEditCompany(u.company_name || '');
    setEditStatus(u.status === 'suspended' ? 'suspended' : 'active');
  };

  // Submit Client Details Edit
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('id', String(editingUser.id));
      formData.append('email', editEmail);
      formData.append('company', editCompany);
      formData.append('status', editStatus);

      const res = await fetch(getApiUrl('api_update_user'), { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`✅ Client account #${editingUser.id} updated successfully.`, 'success');
        setEditingUser(null);
        onRefresh();
      } else {
        showAlert(`❌ Update failed: ${data.error || 'Unknown error'}`, 'error');
      }
    } catch (err: any) {
      showAlert(`❌ Request failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Open Password Reset Modal
  const openResetModal = (u: UserAccount) => {
    setResetPassUser(u);
    setNewPassword('');
    setShowNewPassword(false);
  };

  // Auto Generate Random Password
  const generateRandomPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+=-';
    let pass = '';
    for (let i = 0; i < 16; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
  };

  // Submit Password Reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassUser || !newPassword) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('id', String(resetPassUser.id));
      formData.append('password', newPassword);

      const res = await fetch(getApiUrl('api_reset_user_password'), { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`🔑 Password for ${resetPassUser.email} reset successfully!`, 'success');
        setResetPassUser(null);
      } else {
        showAlert(`❌ Password reset failed: ${data.error || 'Unknown error'}`, 'error');
      }
    } catch (err: any) {
      showAlert(`❌ Request failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Submit Delete Client Account
  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('id', String(deletingUser.id));

      const res = await fetch(getApiUrl('api_delete_user'), { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`🗑️ Client account ${deletingUser.email} deleted. Licenses preserved as standalone keys.`, 'success');
        setDeletingUser(null);
        onRefresh();
      } else {
        showAlert(`❌ Deletion failed: ${data.error || 'Unknown error'}`, 'error');
      }
    } catch (err: any) {
      showAlert(`❌ Request failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Clients" value={totalClients} icon={Users} color="purple" />
        <StatCard label="Active Accounts" value={activeClients} icon={CheckCircle} color="emerald" />
        <StatCard label="Suspended Accounts" value={suspendedClients} icon={ShieldAlert} color="rose" />
        <StatCard label="Bound Store Domains" value={totalBoundDomains} icon={Building} color="amber" />
      </div>

      {/* Main Client Directory Section */}
      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm pm-card-elevation">
        <SectionHeader
          title={`Client Accounts Directory (${filteredUsers.length})`}
          subtitle="Manage client credentials, company profiles, account statuses, and associated store licenses."
          icon={Users}
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="group bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white border border-purple-400/30 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/35 active:scale-95 transition-all duration-200"
                title="Create New Standalone Client Account"
              >
                <UserPlus className="w-4 h-4 text-purple-200 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300" />
                <span>Create Client Account</span>
              </button>

              <button
                type="button"
                onClick={onRefresh}
                className="pm-btn-neutral px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                title="Refresh Client Accounts List"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>
          }
        />

        {/* Post-Creation Quick Credentials Banner */}
        {lastCreatedCreds && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="space-y-1">
              <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" /> Merchant Credentials Onboarded Successfully
              </div>
              <div className="text-xs text-pm-text font-mono flex flex-wrap items-center gap-x-4 gap-y-1">
                <span><strong>Email:</strong> {lastCreatedCreds.email}</span>
                <span className="flex items-center gap-1.5 bg-pm-input/60 px-2 py-0.5 rounded border border-pm-border">
                  <strong>Password:</strong> {showBannerPass ? lastCreatedCreds.pass : '••••••••••••'}
                  <button
                    type="button"
                    onClick={() => setShowBannerPass(!showBannerPass)}
                    className="text-pm-secondary hover:text-pm-primary p-0.5 rounded transition"
                    title={showBannerPass ? "Hide Password" : "Reveal Password"}
                  >
                    {showBannerPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </span>
                {lastCreatedCreds.key && (
                  <span className="text-amber-400 font-bold"><strong>Issued Key:</strong> {lastCreatedCreds.key}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={copyCreatedCredentials}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              >
                {copiedCreds ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCreds ? 'Copied to Clipboard!' : '📋 Copy Login Info'}</span>
              </button>
              <button
                type="button"
                onClick={() => setLastCreatedCreds(null)}
                className="text-pm-secondary hover:text-pm-text text-xs p-1"
                title="Dismiss Banner"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-pm-secondary absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by client email or store name..."
              className="w-full bg-pm-input border border-pm-border rounded-lg pl-9 pr-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-2 rounded-lg text-xs font-bold uppercase transition ${
                statusFilter === 'all' ? 'bg-pm-input text-pm-text border border-pm-primary/50 shadow-sm' : 'pm-btn-neutral'
              }`}
            >
              All ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-2 rounded-lg text-xs font-bold uppercase transition ${
                statusFilter === 'active' ? 'bg-pm-input text-pm-text border border-pm-primary/50 shadow-sm' : 'pm-btn-neutral'
              }`}
            >
              Active ({activeClients})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('suspended')}
              className={`px-3 py-2 rounded-lg text-xs font-bold uppercase transition ${
                statusFilter === 'suspended' ? 'bg-pm-input text-pm-text border border-pm-primary/50 shadow-sm' : 'pm-btn-neutral'
              }`}
            >
              Suspended ({suspendedClients})
            </button>
          </div>
        </div>

        {/* Clients Directory Table */}
        <div className="overflow-x-auto rounded-lg border border-pm-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-pm-input text-pm-secondary uppercase font-bold border-b border-pm-border">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Client Email</th>
                <th className="p-3">Company / Store Name</th>
                <th className="p-3">Assigned Licenses & Stores</th>
                <th className="p-3">Account Status</th>
                <th className="p-3">Registered At</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pm-border">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-pm-secondary">
                    No client accounts match your current filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  const stats = getClientStats(u.id);
                  const isSuspended = u.status === 'suspended';
                  return (
                    <tr key={u.id} className="hover:bg-pm-input/50 transition">
                      <td className="p-3 font-semibold">{u.id}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-pm-secondary shrink-0" />
                          <span className="font-semibold text-pm-text">{u.email}</span>
                        </div>
                      </td>
                      <td className="p-3 text-pm-secondary">
                        {u.company_name ? (
                          <span className="flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-pm-primary shrink-0" />
                            {u.company_name}
                          </span>
                        ) : (
                          <span className="italic text-pm-secondary/60">Not specified</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-pm-primary">
                            🔑 {stats.total} {stats.total === 1 ? 'License' : 'Licenses'} ({stats.active} Active)
                          </span>
                          {stats.boundDomains.length > 0 && (
                            <span className="text-[0.65rem] text-pm-secondary font-mono truncate max-w-[200px]" title={stats.boundDomains.join(', ')}>
                              🌐 {stats.boundDomains.join(', ')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 text-[0.65rem] font-bold uppercase rounded-full border ${
                            isSuspended
                              ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                              : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                          }`}
                        >
                          {isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td className="p-3 text-pm-secondary">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="p-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => { setSelectedUser(u); setIsDetailsOpen(true); }}
                          className="pm-btn-neutral px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition"
                          title="Inspect Client 360° Profile"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          className="pm-btn-neutral px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition"
                          title="Edit Client Profile"
                        >
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openResetModal(u)}
                          className="pm-btn-neutral px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition"
                          title="Reset Password"
                        >
                          <Key className="w-3.5 h-3.5" /> Pass
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingUser(u)}
                          className="pm-btn-danger-outline px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition"
                          title="Delete Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Modal 1: Edit Client Account */}
      <BaseModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={`Edit Client Account #${editingUser?.id || ''}`}
        icon={Edit}
      >
        {editingUser && (
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Client Email</label>
              <input
                type="email"
                required
                className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
                value={editEmail}
                onChange={e => setEditEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Company / Store Name</label>
              <input
                type="text"
                placeholder="Optional Store Name"
                className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
                value={editCompany}
                onChange={e => setEditCompany(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Account Governance Status</label>
              <select
                className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none font-bold"
                value={editStatus}
                onChange={e => setEditStatus(e.target.value as 'active' | 'suspended')}
              >
                <option value="active" className="text-emerald-500">ACTIVE</option>
                <option value="suspended" className="text-rose-500">SUSPENDED</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-pm-border">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="pm-btn-neutral px-4 py-2 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="pm-btn-primary px-5 py-2 rounded-lg text-xs font-bold uppercase"
              >
                {loading ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </form>
        )}
      </BaseModal>

      {/* Modal 2: Reset Client Password */}
      <BaseModal
        isOpen={!!resetPassUser}
        onClose={() => setResetPassUser(null)}
        title={`Reset Password for ${resetPassUser?.email || ''}`}
        icon={Key}
      >
        {resetPassUser && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">New Password</label>
              <div className="flex gap-2">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="Minimum 8 characters or ⚡ Auto"
                  className="flex-1 bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none min-w-0"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="pm-btn-neutral px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center transition shrink-0"
                  title={showNewPassword ? "Hide Password" : "Show Password"}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="pm-btn-neutral px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1 shrink-0"
                  title="Generate Random Password"
                >
                  ⚡ Auto
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-pm-border">
              <button
                type="button"
                onClick={() => setResetPassUser(null)}
                className="pm-btn-neutral px-4 py-2 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="pm-btn-primary px-5 py-2 rounded-lg text-xs font-bold uppercase"
              >
                {loading ? 'Updating...' : '🔑 Update Password'}
              </button>
            </div>
          </form>
        )}
      </BaseModal>

      {/* Modal 3: Delete Client Account Confirmation */}
      <BaseModal
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        title={`Delete Client Account #${deletingUser?.id || ''}`}
        icon={ShieldAlert}
        variant="danger"
      >
        {deletingUser && (
          <div className="space-y-4">
            <p className="text-xs text-pm-text font-semibold">
              Are you sure you want to delete <span className="text-rose-400 font-bold">{deletingUser.email}</span>?
            </p>
            
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[0.72rem] text-amber-500">
              🔒 <strong>License Protection Guarantee:</strong> Any active license keys associated with this client will remain completely safe and will automatically revert to <em>Unassigned Standalone Keys</em>.
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-pm-border">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="pm-btn-neutral px-4 py-2 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={loading}
                className="pm-btn-danger px-5 py-2 rounded-lg text-xs font-bold uppercase"
              >
                {loading ? 'Deleting...' : '🗑️ Confirm Delete'}
              </button>
            </div>
          </div>
        )}
      </BaseModal>

      {/* Modal 0: Create Standalone Client Account */}
      <BaseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Standalone Client Account"
        icon={UserPlus}
      >
        <form onSubmit={handleCreateClient} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Client Email</label>
            <input
              type="email"
              required
              className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
              placeholder="merchant@email.com"
              value={createEmail}
              onChange={e => setCreateEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Password</label>
            <div className="flex gap-2">
              <input
                type={showCreatePassword ? 'text' : 'password'}
                required
                minLength={8}
                placeholder="Min 8 chars or click ⚡ Auto"
                className="flex-1 bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none min-w-0"
                value={createPassword}
                onChange={e => setCreatePassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowCreatePassword(!showCreatePassword)}
                className="pm-btn-neutral px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center transition shrink-0"
                title={showCreatePassword ? "Hide Password" : "Show Password"}
              >
                {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={generateCreatePassword}
                className="pm-btn-neutral px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1 shrink-0"
                title="Generate Random Password"
              >
                ⚡ Auto
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Company / Store Name</label>
            <input
              type="text"
              className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
              placeholder="Optional Store Name"
              value={createCompany}
              onChange={e => setCreateCompany(e.target.value)}
            />
          </div>

          {/* 1-Click License Key Issue Checkbox Option */}
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={issueKeyImmediately}
                onChange={e => setIssueKeyImmediately(e.target.checked)}
                className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
              />
              <span className="text-xs font-bold text-pm-text flex items-center gap-1">
                🔑 Immediately Issue & Assign Store License Key
              </span>
            </label>

            {issueKeyImmediately && (
              <div className="pl-6 animate-in fade-in duration-200">
                <label className="block text-[0.7rem] font-bold uppercase text-pm-secondary mb-1">Select Package Tier</label>
                <select
                  className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-1.5 text-xs text-pm-text font-bold focus:border-pm-primary focus:outline-none"
                  value={selectedIssueTier}
                  onChange={e => setSelectedIssueTier(e.target.value)}
                >
                  <option value="basic">BASIC TIER</option>
                  <option value="pro">PRO TIER</option>
                  <option value="enterprise">ENTERPRISE TIER</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-pm-border">
            {(createEmail || createCompany || createPassword) ? (
              <button
                type="button"
                onClick={clearDraftMemory}
                className="text-[0.72rem] text-rose-400 hover:text-rose-300 font-semibold transition"
                title="Clear saved draft inputs"
              >
                🧹 Clear Draft
              </button>
            ) : <div />}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="pm-btn-neutral px-4 py-2 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="pm-btn-primary px-5 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4 text-white" />
                <span>{loading ? 'Creating...' : 'Create Account'}</span>
              </button>
            </div>
          </div>
        </form>
      </BaseModal>

      {/* Client 360° Deep-Dive Inspection Modal */}
      {selectedUser && (
        <BaseModal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} title={`Client 360° Profile: ${selectedUser.email}`}>
          <div className="space-y-6">
            {/* Account Health Header */}
            <div className="p-4 bg-pm-input/60 border border-pm-border rounded-xl flex items-center justify-between text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-sm text-pm-text">{selectedUser.email}</span>
                </div>
                <div className="text-pm-secondary flex items-center gap-3">
                  <span>ID: #{selectedUser.id}</span>
                  <span>•</span>
                  <span>Registered: {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>

              <div className="text-right">
                <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] border ${
                  selectedUser.status === 'suspended' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  {selectedUser.status || 'ACTIVE'}
                </span>
              </div>
            </div>

            {/* Company Context */}
            <div className="p-3 bg-pm-card border border-pm-border rounded-xl text-xs space-y-1">
              <div className="font-bold text-pm-secondary uppercase tracking-wider text-[10px]">Organization Context</div>
              <div className="flex justify-between items-center text-pm-text font-semibold">
                <span className="flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-indigo-400" />
                  {selectedUser.company_name || 'Independent Client'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-400">
                  Client Account
                </span>
              </div>
            </div>

            {/* Assigned License Keys & Store Domains */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" /> Issued Licenses ({licenses.filter(l => l.user_email?.toLowerCase() === selectedUser.email.toLowerCase()).length})
              </h4>
              <div className="border border-pm-border rounded-lg overflow-hidden text-xs">
                {licenses.filter(l => l.user_email?.toLowerCase() === selectedUser.email.toLowerCase()).length === 0 ? (
                  <p className="p-4 text-center text-pm-secondary">No license keys issued to this client email yet.</p>
                ) : (
                  <div className="divide-y divide-pm-border">
                    {licenses.filter(l => l.user_email?.toLowerCase() === selectedUser.email.toLowerCase()).map(l => (
                      <div key={l.id} className="p-3 flex justify-between items-center bg-pm-card">
                        <div className="space-y-0.5">
                          <div className="font-mono text-amber-400 font-bold flex items-center gap-2">
                            <span>{l.license_key}</span>
                          </div>
                          <div className="text-[11px] text-pm-secondary flex items-center gap-2">
                            <span className="uppercase font-bold text-purple-400">{l.package_tier} Tier</span>
                            <span>•</span>
                            <span>Status: {l.status}</span>
                          </div>
                        </div>
                        <div>
                          {l.store_url ? (
                            <a
                              href={`https://${l.store_url.replace(/^https?:\/\//, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-400 hover:underline bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20"
                            >
                              <ExternalLink className="w-3 h-3" /> {l.store_url}
                            </a>
                          ) : (
                            <span className="italic text-pm-secondary/60">Unbound Store</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-pm-border">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setIsDetailsOpen(false); openResetModal(selectedUser); }}
                  className="pm-btn-neutral px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5" /> Reset Pass
                </button>
                <button
                  type="button"
                  onClick={() => { setIsDetailsOpen(false); openEditModal(selectedUser); }}
                  className="pm-btn-neutral px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit Profile
                </button>
              </div>

              <button type="button" onClick={() => setIsDetailsOpen(false)} className="pm-btn-neutral px-4 py-2 rounded-lg text-xs font-bold">
                Close Inspection Window
              </button>
            </div>
          </div>
        </BaseModal>
      )}
    </div>
  );
};

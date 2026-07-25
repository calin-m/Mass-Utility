import React, { useState } from 'react';
import { Users, Search, Edit, Trash2, Key, Eye, EyeOff, ShieldAlert, CheckCircle, Building, Mail, ExternalLink, RefreshCw, UserPlus, Check, Sparkles, Copy } from 'lucide-react';
import { License, UserAccount } from '../LicensesTab';
import { BaseModal } from '../common/BaseModal';
import { SectionHeader } from '../common/SectionHeader';
import { StatCard } from '../common/StatCard';

interface ClientListViewProps {
  users: UserAccount[];
  licenses: License[];
  onRefresh: () => void;
  showAlert: (msg: string, type?: 'success' | 'error') => void;
  onSelectClient: (user: UserAccount) => void;
}

export const ClientListView: React.FC<ClientListViewProps> = ({ users, licenses, onRefresh, showAlert, onSelectClient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  // Create Client Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createEmail, setCreateEmailState] = useState(() => localStorage.getItem('pm_draft_client_email') || '');
  const [createPassword, setCreatePassword] = useState('');
  const [createCompany, setCreateCompanyState] = useState(() => localStorage.getItem('pm_draft_client_company') || '');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // 1-Click License Key Provisioning State
  const [issueKeyImmediately, setIssueKeyImmediately] = useState(false);
  const [selectedIssueTier, setSelectedIssueTier] = useState('basic');

  // Post-Creation Credentials Banner State
  const [lastCreatedCreds, setLastCreatedCreds] = useState<{ email: string; pass: string; key?: string } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);
  const [showBannerPass, setShowBannerPass] = useState(false);

  // Password Reset Modal State
  const [resetUser, setResetUser] = useState<UserAccount | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Delete Confirmation Modal State
  const [deletingUser, setDeletingUser] = useState<UserAccount | null>(null);

  // Edit Client Profile Modal State
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editCompany, setEditCompany] = useState('');

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

  const generateResetPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+=-';
    let pass = '';
    for (let i = 0; i < 16; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setResetPassword(pass);
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
          showAlert('✨ Client Account created successfully!', 'success');
        }

        setLastCreatedCreds({ email: createEmail, pass: createPassword, key: generatedKey });
        clearDraftMemory();
        setShowCreateModal(false);
        onRefresh();
      } else {
        showAlert(data.error || 'Failed to create client account', 'error');
      }
    } catch (err: any) {
      showAlert('Failed to create client account: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser || !resetPassword) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('id', String(resetUser.id));
      formData.append('password', resetPassword);

      const res = await fetch('index.php?action=api_reset_password', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`Password reset for ${resetUser.email} successfully!`, 'success');
        setResetUser(null);
        setResetPassword('');
        onRefresh();
      } else {
        showAlert(data.error || 'Failed to reset password', 'error');
      }
    } catch (err: any) {
      showAlert('Failed to reset password: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('id', String(deletingUser.id));

      const res = await fetch('index.php?action=api_delete_user', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`Client account ${deletingUser.email} deleted`, 'success');
        setDeletingUser(null);
        onRefresh();
      } else {
        showAlert(data.error || 'Failed to delete client account', 'error');
      }
    } catch (err: any) {
      showAlert('Failed to delete client account: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user: UserAccount) => {
    const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('id', String(user.id));
      formData.append('company_name', user.company_name || '');
      formData.append('status', newStatus);

      const res = await fetch('index.php?action=api_update_user', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`Account ${user.email} marked as ${newStatus.toUpperCase()}`, 'success');
        onRefresh();
      } else {
        showAlert(data.error || 'Failed to update account status', 'error');
      }
    } catch (err: any) {
      showAlert('Failed to update account status: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('id', String(editingUser.id));
      formData.append('company_name', editCompany);
      formData.append('status', editingUser.status || 'active');

      const res = await fetch('index.php?action=api_update_user', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`Company profile for ${editingUser.email} updated`, 'success');
        setEditingUser(null);
        onRefresh();
      } else {
        showAlert(data.error || 'Failed to update company profile', 'error');
      }
    } catch (err: any) {
      showAlert('Failed to update company profile: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (user: UserAccount) => {
    setEditingUser(user);
    setEditCompany(user.company_name || '');
  };

  const openResetModal = (user: UserAccount) => {
    setResetUser(user);
    setResetPassword('');
  };

  const copyCreatedCredentials = () => {
    if (!lastCreatedCreds) return;
    const text = `Client Login Credentials:\nEmail: ${lastCreatedCreds.email}\nPassword: ${lastCreatedCreds.pass}${lastCreatedCreds.key ? `\nLicense Key: ${lastCreatedCreds.key}` : ''}`;
    navigator.clipboard.writeText(text);
    setCopiedCreds(true);
    setTimeout(() => setCopiedCreds(false), 2000);
    showAlert('📋 Client Login Credentials copied to clipboard!', 'success');
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (u.company_name && u.company_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' ||
                          (statusFilter === 'suspended' && u.status === 'suspended') ||
                          (statusFilter === 'active' && u.status !== 'suspended');
    return matchesSearch && matchesStatus;
  });

  const getClientStats = (userId: number) => {
    const userLics = licenses.filter(l => l.user_id === userId);
    const activeLics = userLics.filter(l => l.status === 'active');
    const boundDomains = userLics.map(l => l.store_url).filter(Boolean);
    return {
      total: userLics.length,
      active: activeLics.length,
      boundDomains: Array.from(new Set(boundDomains))
    };
  };

  const totalClients = users.length;
  const activeClients = users.filter(u => u.status !== 'suspended').length;
  const suspendedClients = users.filter(u => u.status === 'suspended').length;
  const totalBoundDomains = Array.from(new Set(licenses.map(l => l.store_url).filter(Boolean))).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <SectionHeader
        title="Client Accounts Directory"
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

      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Clients" value={totalClients} icon={Users} color="purple" />
        <StatCard label="Active Accounts" value={activeClients} icon={CheckCircle} color="emerald" />
        <StatCard label="Suspended Accounts" value={suspendedClients} icon={ShieldAlert} color="rose" />
        <StatCard label="Bound Store Domains" value={totalBoundDomains} icon={Building} color="amber" />
      </div>

      {/* Main Client Directory Section */}
      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm pm-card-elevation">
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
                className="text-pm-secondary hover:text-pm-text text-xs p-1 rounded transition"
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
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'all' ? 'bg-pm-input text-pm-text border border-pm-primary/50' : 'pm-btn-neutral'
              }`}
            >
              All ({totalClients})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'active' ? 'bg-pm-input text-pm-text border border-pm-primary/50' : 'pm-btn-neutral'
              }`}
            >
              Active ({activeClients})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('suspended')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'suspended' ? 'bg-pm-input text-pm-text border border-pm-primary/50' : 'pm-btn-neutral'
              }`}
            >
              Suspended ({suspendedClients})
            </button>
          </div>
        </div>

        {/* Client Accounts Table */}
        <div className="overflow-x-auto rounded-lg border border-pm-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-pm-input text-pm-secondary uppercase font-bold border-b border-pm-border">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Client Email</th>
                <th className="p-3">Company / Store Name</th>
                <th className="p-3">Assigned Licenses &amp; Stores</th>
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
                          onClick={() => onSelectClient(u)}
                          className="pm-btn-neutral px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition"
                          title="Inspect Client 360° Details View"
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

      {/* Edit Profile Modal */}
      {editingUser && (
        <BaseModal isOpen={true} onClose={() => setEditingUser(null)} title="Edit Company / Store Profile">
          <form onSubmit={handleEditProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Client Email (Read Only)</label>
              <input type="text" disabled value={editingUser.email} className="w-full bg-pm-input/50 border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-secondary" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Company / Store Name</label>
              <input
                type="text"
                value={editCompany}
                onChange={e => setEditCompany(e.target.value)}
                placeholder="e.g. Acme Fashion Store"
                className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-pm-border">
              <button type="button" onClick={() => setEditingUser(null)} className="pm-btn-neutral px-4 py-2 rounded-lg text-xs font-bold">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="pm-btn-primary px-4 py-2 rounded-lg text-xs font-bold">
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </BaseModal>
      )}

      {/* Password Reset Modal */}
      {resetUser && (
        <BaseModal isOpen={true} onClose={() => setResetUser(null)} title={`Reset Password for ${resetUser.email}`}>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showResetPassword ? "text" : "password"}
                  required
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  placeholder="Set strong password..."
                  className="w-full bg-pm-input border border-pm-border rounded-lg pl-3 pr-10 py-2 text-sm font-mono text-pm-text focus:border-pm-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="absolute right-3 top-2.5 text-pm-secondary hover:text-pm-text transition"
                >
                  {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={generateResetPassword}
                className="mt-1 text-[0.7rem] text-pm-primary hover:underline font-medium"
              >
                ✨ Auto-Generate Strong 16-Char Password
              </button>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-pm-border">
              <button type="button" onClick={() => setResetUser(null)} className="pm-btn-neutral px-4 py-2 rounded-lg text-xs font-bold">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="pm-btn-primary px-4 py-2 rounded-lg text-xs font-bold">
                {loading ? 'Resetting...' : 'Update Password'}
              </button>
            </div>
          </form>
        </BaseModal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <BaseModal isOpen={true} onClose={() => setDeletingUser(null)} title="Confirm Account Deletion">
          <div className="space-y-4">
            <p className="text-xs text-pm-text">
              Are you sure you want to permanently delete client account <strong>{deletingUser.email}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-4 border-t border-pm-border">
              <button type="button" onClick={() => setDeletingUser(null)} className="pm-btn-neutral px-4 py-2 rounded-lg text-xs font-bold">
                Cancel
              </button>
              <button type="button" onClick={handleDeleteUser} disabled={loading} className="pm-btn-danger px-4 py-2 rounded-lg text-xs font-bold">
                {loading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </BaseModal>
      )}

      {/* Create Standalone Client Account Modal */}
      <BaseModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Client Account">
        <form onSubmit={handleCreateClient} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Client Email Address</label>
            <input
              type="email"
              required
              value={createEmail}
              onChange={e => setCreateEmail(e.target.value)}
              placeholder="merchant@store.com"
              className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold uppercase text-pm-secondary">Account Password</label>
              <button
                type="button"
                onClick={generateCreatePassword}
                className="text-[0.7rem] text-pm-primary hover:underline font-semibold"
              >
                ✨ Auto-Generate Password
              </button>
            </div>
            <div className="relative">
              <input
                type={showCreatePassword ? "text" : "password"}
                required
                value={createPassword}
                onChange={e => setCreatePassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full bg-pm-input border border-pm-border rounded-lg pl-3 pr-10 py-2 text-sm font-mono text-pm-text focus:border-pm-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowCreatePassword(!showCreatePassword)}
                className="absolute right-3 top-2.5 text-pm-secondary hover:text-pm-text transition"
              >
                {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Company / Store Name (Optional)</label>
            <input
              type="text"
              value={createCompany}
              onChange={e => setCreateCompany(e.target.value)}
              placeholder="e.g. Acme Commerce Inc."
              className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
            />
          </div>

          {/* 1-Click License Key Provisioning Checkbox */}
          <div className="p-3 bg-pm-input/50 border border-pm-border rounded-xl space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={issueKeyImmediately}
                onChange={e => setIssueKeyImmediately(e.target.checked)}
                className="rounded border-pm-border bg-pm-input text-purple-600 focus:ring-purple-500"
              />
              <span className="text-xs font-bold text-pm-text">⚡ Issue License Key Immediately on Creation</span>
            </label>

            {issueKeyImmediately && (
              <div className="pt-2 flex items-center gap-3 animate-in fade-in duration-200">
                <span className="text-xs font-semibold text-pm-secondary shrink-0">Target Package Tier:</span>
                <select
                  value={selectedIssueTier}
                  onChange={e => setSelectedIssueTier(e.target.value)}
                  className="bg-pm-card border border-pm-border rounded-lg px-3 py-1.5 text-xs text-pm-text font-bold focus:outline-none focus:border-purple-500"
                >
                  <option value="basic">BASIC TIER</option>
                  <option value="pro">PRO TIER</option>
                  <option value="enterprise">ENTERPRISE TIER</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-pm-border">
            <button
              type="button"
              onClick={clearDraftMemory}
              className="text-[0.7rem] text-pm-secondary hover:text-rose-400 transition"
              title="Clear Saved Input Memory"
            >
              Clear Form Memory
            </button>
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
    </div>
  );
};

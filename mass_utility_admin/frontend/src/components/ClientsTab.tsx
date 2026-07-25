import React, { useState } from 'react';
import { Users, Search, Edit, Trash2, Key, Eye, EyeOff, ShieldAlert, CheckCircle, Building, Mail, ExternalLink, RefreshCw } from 'lucide-react';
import { License, UserAccount } from './LicensesTab';

interface ClientsTabProps {
  users: UserAccount[];
  licenses: License[];
  onRefresh: () => void;
  showAlert: (msg: string, type?: 'success' | 'error') => void;
}

export const ClientsTab: React.FC<ClientsTabProps> = ({ users, licenses, onRefresh, showAlert }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

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
        <div className="p-4 bg-pm-card border border-pm-border rounded-xl shadow-sm pm-card-elevation flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-pm-secondary">Total Clients</div>
            <div className="text-2xl font-black text-pm-text mt-1">{totalClients}</div>
          </div>
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-pm-card border border-pm-border rounded-xl shadow-sm pm-card-elevation flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-pm-secondary">Active Accounts</div>
            <div className="text-2xl font-black text-emerald-500 mt-1">{activeClients}</div>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-pm-card border border-pm-border rounded-xl shadow-sm pm-card-elevation flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-pm-secondary">Suspended Accounts</div>
            <div className="text-2xl font-black text-rose-500 mt-1">{suspendedClients}</div>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-pm-card border border-pm-border rounded-xl shadow-sm pm-card-elevation flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-pm-secondary">Bound Store Domains</div>
            <div className="text-2xl font-black text-amber-500 mt-1">{totalBoundDomains}</div>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <Building className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Client Directory Section */}
      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm pm-card-elevation">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-pm-text border-l-4 border-pm-primary pl-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-pm-primary" /> Client Accounts Directory ({filteredUsers.length})
            </h3>
            <p className="text-xs text-pm-secondary mt-1 pl-4">
              Manage client credentials, company profiles, account statuses, and associated store licenses.
            </p>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            className="pm-btn-neutral px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            title="Refresh Client Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

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
                statusFilter === 'all' ? 'pm-btn-primary shadow-sm' : 'pm-btn-neutral'
              }`}
            >
              All ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-2 rounded-lg text-xs font-bold uppercase transition ${
                statusFilter === 'active' ? 'pm-btn-primary shadow-sm' : 'pm-btn-neutral'
              }`}
            >
              Active ({activeClients})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('suspended')}
              className={`px-3 py-2 rounded-lg text-xs font-bold uppercase transition ${
                statusFilter === 'suspended' ? 'pm-btn-primary shadow-sm' : 'pm-btn-neutral'
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
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-pm-card border border-pm-border rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-pm-border">
              <h3 className="text-base font-bold text-pm-text flex items-center gap-2">
                <Edit className="w-5 h-5 text-pm-primary" /> Edit Client Account #{editingUser.id}
              </h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-pm-secondary hover:text-pm-text font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

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
          </div>
        </div>
      )}

      {/* Modal 2: Reset Client Password */}
      {resetPassUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-pm-card border border-pm-border rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-pm-border">
              <h3 className="text-base font-bold text-pm-text flex items-center gap-2">
                <Key className="w-5 h-5 text-pm-primary" /> Reset Password for {resetPassUser.email}
              </h3>
              <button
                type="button"
                onClick={() => setResetPassUser(null)}
                className="text-pm-secondary hover:text-pm-text font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

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
          </div>
        </div>
      )}

      {/* Modal 3: Delete Client Account Confirmation */}
      {deletingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-pm-card border border-rose-500/30 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-pm-border">
              <h3 className="text-base font-bold text-rose-500 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" /> Delete Client Account #{deletingUser.id}
              </h3>
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="text-pm-secondary hover:text-pm-text font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-pm-text font-semibold">
                Are you sure you want to delete <span className="text-rose-400 font-bold">{deletingUser.email}</span>?
              </p>
              
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[0.72rem] text-amber-500">
                🔒 <strong>License Protection Guarantee:</strong> Any active license keys associated with this client will remain completely safe and will automatically revert to <em>Unassigned Standalone Keys</em>.
              </div>
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
        </div>
      )}
    </div>
  );
};

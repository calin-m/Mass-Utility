import React, { useState } from 'react';
import { Eye, EyeOff, Copy, Edit, ShieldAlert, CheckCircle, PlusCircle, Key, Trash2 } from 'lucide-react';

export interface License {
  id: number;
  user_id?: number;
  user_email: string;
  license_key: string;
  store_url: string | null;
  package_tier: string;
  status: 'active' | 'suspended' | 'expired';
  expires_at: string | null;
  created_at: string;
}

export interface UserAccount {
  id: number;
  email: string;
  company_name: string | null;
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
  // Account Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [creatingAccount, setCreatingAccount] = useState(false);

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

  const toggleKeyMask = (id: number) => {
    setRevealedKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    showAlert('📋 License key copied to clipboard!', 'success');
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setCreatingAccount(true);
    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);
      formData.append('company_name', company);

      const res = await fetch('index.php?action=api_create_user', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert('✅ Standalone Client Account created successfully!', 'success');
        setEmail('');
        setPassword('');
        setCompany('');
        onRefresh();
      } else {
        showAlert('❌ Error: ' + (data.error || 'Failed to create user'), 'error');
      }
    } catch (err: any) {
      showAlert('❌ Request failed: ' + err.message, 'error');
    } finally {
      setCreatingAccount(false);
    }
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

  const handleDeleteLicense = async (id: number, key: string) => {
    if (!window.confirm(`Are you sure you want to delete license key "${key}" (ID #${id})?\n\nThis action is permanent and cannot be undone.`)) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append('id', String(id));

      const res = await fetch('index.php?action=api_delete_license', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`🗑️ License Key #${id} deleted successfully.`, 'success');
        onRefresh();
      } else {
        showAlert('❌ Error: ' + (data.error || 'Failed to delete license'), 'error');
      }
    } catch (err: any) {
      showAlert('❌ Request failed: ' + err.message, 'error');
    }
  };

  const generateRandomPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+=-';
    let pass = '';
    for (let i = 0; i < 16; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
  };

  const maskKey = (key: string) => {
    if (!key || key.length < 8) return '****';
    return key.substring(0, 4) + ' - **** - **** - ' + key.substring(key.length - 4);
  };

  return (
    <div className="space-y-6">
      {/* 2-Column Form Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Client Card */}
        <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm pm-card-elevation">
          <h3 className="text-base font-bold text-pm-text border-l-4 border-pm-primary pl-3 flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-pm-primary" /> Create Standalone Client Account
          </h3>
          <form onSubmit={handleCreateAccount} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Client Email</label>
              <input
                type="email"
                required
                className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
                placeholder="merchant@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Password</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  className="flex-1 bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="pm-btn-neutral px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap"
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
                value={company}
                onChange={e => setCompany(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={creatingAccount}
              className="w-full pm-btn-primary py-2.5 rounded-lg text-xs font-bold uppercase transition"
            >
              {creatingAccount ? 'Creating Account...' : '✨ Create Client Account'}
            </button>
          </form>
        </div>

        {/* Generate License Key Card */}
        <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm pm-card-elevation">
          <h3 className="text-base font-bold text-pm-text border-l-4 border-pm-primary pl-3 flex items-center gap-2">
            <Key className="w-4 h-4 text-pm-primary" /> Issue & Assign License Key
          </h3>
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
              className="w-full pm-btn-primary py-2.5 rounded-lg text-xs font-bold uppercase transition"
            >
              {generatingKey ? 'Generating...' : '🔑 Issue License Key'}
            </button>
          </form>
        </div>
      </div>

      {/* Active License Registry Table */}
      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm pm-card-elevation">
        <h3 className="text-base font-bold text-pm-text border-l-4 border-pm-primary pl-3 mb-4">
          📜 Active License Registry & Subscriptions ({licenses.length})
        </h3>
        <div className="overflow-x-auto rounded-lg border border-pm-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-pm-input text-pm-secondary uppercase font-bold border-b border-pm-border">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Client Email</th>
                <th className="p-3">License Key</th>
                <th className="p-3">Bound Store Domain</th>
                <th className="p-3">Tier</th>
                <th className="p-3">Status</th>
                <th className="p-3">Expires At</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pm-border">
              {licenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-pm-secondary">
                    No active licenses registered yet.
                  </td>
                </tr>
              ) : (
                licenses.map(lic => {
                  const isRevealed = revealedKeys[lic.id];
                  const displayedKey = isRevealed ? lic.license_key : maskKey(lic.license_key);
                  return (
                    <tr key={lic.id} className="hover:bg-pm-input/50 transition">
                      <td className="p-3 font-semibold">{lic.id}</td>
                      <td className="p-3">{lic.user_email || 'Unassigned'}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-amber-500 font-bold">{displayedKey}</span>
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
                      <td className="p-3 text-pm-secondary">{lic.store_url || 'Not bound yet'}</td>
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
                      <td className="p-3 text-pm-secondary">{lic.expires_at || 'Never'}</td>
                      <td className="p-3 flex items-center gap-2">
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
                          onClick={() => handleDeleteLicense(lic.id, lic.license_key)}
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
      {editingLicense && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-pm-card border border-pm-border rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-pm-border">
              <h3 className="text-base font-bold text-pm-text flex items-center gap-2">
                <Edit className="w-5 h-5 text-pm-primary" /> Edit License & Subscription #{editingLicense.id}
              </h3>
              <button
                type="button"
                onClick={() => setEditingLicense(null)}
                className="text-pm-secondary hover:text-pm-text font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

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
          </div>
        </div>
      )}
    </div>
  );
};

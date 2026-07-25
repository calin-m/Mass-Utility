import React, { useState } from 'react';
import { ArrowLeft, Mail, Building, Key, ShieldCheck, ShieldAlert, Globe, ExternalLink, PlusCircle, Check, Copy, Trash2, Edit, Clock, Sparkles } from 'lucide-react';
import { License, UserAccount } from '../LicensesTab';
import { BaseModal } from '../common/BaseModal';
import { useTranslation } from '../../i18n/LanguageContext';

interface ClientDetailsViewProps {
  user: UserAccount;
  licenses: License[];
  companies?: any[];
  initialTab?: 'overview' | 'edit';
  onBack: () => void;
  onRefresh: () => void;
  showAlert: (msg: string, type?: 'success' | 'error') => void;
}

export const ClientDetailsView: React.FC<ClientDetailsViewProps> = ({ user, licenses, companies = [], initialTab, onBack, onRefresh, showAlert }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'overview' | 'edit'>(initialTab || 'overview');
  const [submitting, setSubmitting] = useState(false);
  const [selectedTier, setSelectedTier] = useState('pro');

  // Form State
  const [editName, setEditName] = useState(user.name || '');
  const [editCompany, setEditCompany] = useState(user.company_name || '');
  const [editRole, setEditRole] = useState(user.role || 'Owner');

  // Key Copy State
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Password Reset Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const clientLicenses = licenses.filter(l => l.user_email?.toLowerCase() === user.email.toLowerCase() || l.user_id === user.id);
  const isSuspended = user.status === 'suspended';

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    showAlert('📋 License key copied to clipboard!', 'success');
  };

  const handleIssueLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('user_id', String(user.id));
      formData.append('package_tier', selectedTier);

      const res = await fetch('index.php?action=api_generate', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`✨ ${selectedTier.toUpperCase()} License key issued to ${user.email}!`, 'success');
        onRefresh();
      } else {
        showAlert('❌ Key issue failed: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err: any) {
      showAlert('❌ Request failed: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClientProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('id', String(user.id));
      formData.append('name', editName.trim());
      formData.append('email', user.email);
      formData.append('company', editCompany.trim());
      formData.append('company_name', editCompany.trim());
      formData.append('role', editRole);
      formData.append('status', user.status);

      const res = await fetch('index.php?action=api_update_user', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert('👤 Client profile updated successfully!', 'success');
        onRefresh();
      } else {
        showAlert('❌ Update failed: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err: any) {
      showAlert('❌ Request failed: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = isSuspended ? 'active' : 'suspended';
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('id', String(user.id));
      formData.append('email', user.email);
      formData.append('company_name', user.company_name || '');
      formData.append('status', newStatus);

      const res = await fetch('index.php?action=api_update_user', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`Account ${user.email} marked as ${newStatus.toUpperCase()}`, 'success');
        onRefresh();
      } else {
        showAlert('❌ Status update failed: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err: any) {
      showAlert('❌ Request failed: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassword.trim()) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('id', String(user.id));
      formData.append('password', resetPassword.trim());

      const res = await fetch('index.php?action=api_reset_password', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`Password reset for ${user.email} successfully!`, 'success');
        setShowResetModal(false);
        setResetPassword('');
        onRefresh();
      } else {
        showAlert('❌ Reset failed: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err: any) {
      showAlert('❌ Request failed: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('id', String(user.id));

      const res = await fetch('index.php?action=api_delete_user', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`Client account ${user.email} deleted`, 'success');
        setShowDeleteModal(false);
        onBack();
        onRefresh();
      } else {
        showAlert('❌ Delete failed: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err: any) {
      showAlert('❌ Request failed: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-pm-card border border-pm-border rounded-xl p-4 shadow-sm pm-card-elevation">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="pm-btn-neutral p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            title="Return to Client Accounts List"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="text-[10px] font-bold text-pm-secondary uppercase tracking-wider flex items-center gap-1">
              <span>Clients Directory</span>
              <span>›</span>
              <span className="text-purple-400 font-mono">{user.email}</span>
            </div>
            <h2 className="text-lg font-extrabold text-pm-text flex items-center gap-2">
              <span>{user.name ? user.name : user.email}</span>
              {user.name && <span className="text-xs font-mono font-normal text-pm-secondary">({user.email})</span>}
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                isSuspended ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                {isSuspended ? 'SUSPENDED' : 'ACTIVE'}
              </span>
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-pm-input/60 border border-pm-border rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'overview'
                  ? 'bg-pm-primary text-white shadow-sm'
                  : 'text-pm-secondary hover:text-pm-text hover:bg-pm-input/50'
              }`}
            >
              <Mail className="w-3.5 h-3.5" /> {t('subtab_overview')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'edit'
                  ? 'bg-pm-primary text-white shadow-sm'
                  : 'text-pm-secondary hover:text-pm-text hover:bg-pm-input/50'
              }`}
            >
              <Edit className="w-3.5 h-3.5" /> {t('subtab_client_settings')}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="pm-btn-neutral px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" /> {t('btn_reset_password')}
          </button>

          <button
            type="button"
            onClick={handleToggleStatus}
            disabled={submitting}
            className={`pm-btn-neutral px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              isSuspended ? 'hover:bg-emerald-500/20 hover:text-emerald-400' : 'hover:bg-rose-500/20 hover:text-rose-400'
            }`}
            title={isSuspended ? 'Re-Activate Client Account' : 'Suspend Client Account'}
          >
            {isSuspended ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> : <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />}
            <span>{isSuspended ? 'Re-Activate' : 'Suspend'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="pm-btn-danger-outline p-2 rounded-xl text-xs font-semibold flex items-center gap-1"
            title="Delete Account"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dynamic Tab Content */}
      {activeTab === 'edit' ? (
        <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm pm-card-elevation space-y-6 animate-in fade-in duration-200">
          <div className="flex justify-between items-center pb-4 border-b border-pm-border">
            <div>
              <h3 className="text-sm font-extrabold text-pm-text flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-400" /> Comprehensive Client Profile Settings
              </h3>
              <p className="text-xs text-pm-secondary mt-0.5">
                Update client account properties, company affiliation, role permissions, password credentials, and status governance.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className="pm-btn-neutral px-3 py-1.5 rounded-lg text-xs font-semibold"
            >
              ✕ Cancel
            </button>
          </div>

          <form onSubmit={handleEditClientProfile} className="space-y-6">
            {/* Section 1: Client Identity & Affiliation */}
            <div className="p-4 bg-pm-input/40 border border-pm-border rounded-xl space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-purple-400" /> Account Identity &amp; Organization
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-pm-secondary mb-1">Client Full Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-pm-card border border-pm-border rounded-lg px-3 py-2 text-xs font-semibold text-pm-text focus:border-pm-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-pm-secondary mb-1">Client Email (Read Only)</label>
                  <input
                    type="text"
                    disabled
                    value={user.email}
                    className="w-full bg-pm-input/50 border border-pm-border rounded-lg px-3 py-2 text-xs font-mono text-pm-secondary cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-pm-secondary mb-1">Assigned Company Profile</label>
                  <select
                    value={editCompany}
                    onChange={e => setEditCompany(e.target.value)}
                    className="w-full bg-pm-card border border-pm-border rounded-lg px-3 py-2 text-xs font-semibold text-pm-text focus:border-pm-primary focus:outline-none"
                  >
                    <option value="">-- Standalone Client (No Company) --</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.company_name}>
                        🏢 {c.company_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Account Role & Password Governance */}
            <div className="p-4 bg-pm-input/40 border border-pm-border rounded-xl space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" /> Role &amp; Password Governance
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-pm-secondary mb-1">Account Role</label>
                  <select
                    value={editRole}
                    onChange={e => setEditRole(e.target.value)}
                    className="w-full bg-pm-card border border-pm-border rounded-lg px-3 py-2 text-xs text-pm-text focus:border-pm-primary focus:outline-none"
                  >
                    <option value="Owner">Owner / Primary Admin</option>
                    <option value="Manager">Store Manager</option>
                    <option value="Developer">Technical Developer</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(true)}
                    className="pm-btn-neutral w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <Key className="w-4 h-4 text-amber-400" />
                    <span>Reset Client Password</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Section 3: Status & Governance */}
            <div className="p-4 bg-pm-input/40 border border-pm-border rounded-xl space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Account Status &amp; Governance
              </h4>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-pm-card p-3 rounded-lg border border-pm-border">
                <div>
                  <div className="text-xs font-bold text-pm-text">Account Status: <span className={isSuspended ? 'text-rose-400' : 'text-emerald-400'}>{user.status.toUpperCase()}</span></div>
                  <p className="text-[11px] text-pm-secondary">
                    {isSuspended ? 'This client account is currently suspended. Re-activate to restore store access.' : 'This client account is active and verified.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleStatus}
                  disabled={submitting}
                  className={`pm-btn-neutral px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                    isSuspended ? 'hover:bg-emerald-500/20 hover:text-emerald-400' : 'hover:bg-rose-500/20 hover:text-rose-400'
                  }`}
                >
                  {isSuspended ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <ShieldAlert className="w-4 h-4 text-amber-400" />}
                  <span>{isSuspended ? 'Re-Activate Account' : 'Suspend Account'}</span>
                </button>
              </div>
            </div>

            {/* Form Action Controls */}
            <div className="flex justify-end gap-3 pt-4 border-t border-pm-border">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="pm-btn-neutral px-4 py-2 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="pm-btn-primary px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>{submitting ? 'Saving Changes...' : 'Save Client Settings'}</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Main 2-Column Layout (Overview Tab) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Client Identity & Company Context */}
          <div className="space-y-6">
            {/* Identity Card */}
            <div className="bg-pm-card border border-pm-border rounded-xl p-5 shadow-sm pm-card-elevation space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-purple-400" /> Client Account Profile
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-pm-border">
                  <span className="text-pm-secondary">Account ID</span>
                  <span className="font-mono font-bold text-pm-text">#{user.id}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-pm-border">
                  <span className="text-pm-secondary">Email Address</span>
                  <span className="font-semibold text-pm-text font-mono">{user.email}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-pm-border">
                  <span className="text-pm-secondary">Assigned Company</span>
                  <span className="font-semibold text-purple-400">
                    {user.company_name ? user.company_name : <span className="italic text-pm-secondary/60">Standalone Client</span>}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-pm-border">
                  <span className="text-pm-secondary">Account Role</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {user.role || 'Owner'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-pm-secondary">Status</span>
                  <span className="text-emerald-400 font-semibold">Verified Member</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Main Workspace Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 1: Issued License Keys & PrestaShop Store Domains Table */}
            <div className="bg-pm-card border border-pm-border rounded-xl p-5 shadow-sm pm-card-elevation space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-amber-400" /> Issued License Keys &amp; Bound Stores ({clientLicenses.length})
                </h3>
              </div>

              <div className="border border-pm-border rounded-lg overflow-hidden text-xs">
                {clientLicenses.length === 0 ? (
                  <p className="p-8 text-center text-pm-secondary">No license keys issued to this client email yet.</p>
                ) : (
                  <div className="divide-y divide-pm-border">
                    {clientLicenses.map(l => (
                      <div key={l.id} className="p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-pm-card hover:bg-pm-input/40 transition">
                        <div className="space-y-1">
                          <div className="font-mono text-amber-400 font-bold flex items-center gap-2 text-sm">
                            <span>{l.license_key}</span>
                            <button
                              type="button"
                              onClick={() => copyKey(l.license_key)}
                              className="text-pm-secondary hover:text-pm-primary transition p-1"
                              title="Copy License Key"
                            >
                              {copiedKey === l.license_key ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <div className="text-[11px] text-pm-secondary flex flex-wrap items-center gap-2">
                            <span className="uppercase font-bold text-purple-400 px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
                              {l.package_tier} Tier
                            </span>
                            <span>•</span>
                            {user.company_name ? (
                              <span className="text-[10px] text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20" title="Key is owned by company pool and remains with company if employee transfers">
                                🏢 Owned by {user.company_name} Pool
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                Direct Standalone Key
                              </span>
                            )}
                            <span>•</span>
                            <span>Issued: {l.created_at ? new Date(l.created_at).toLocaleDateString() : 'N/A'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {l.store_url ? (
                            <a
                              href={`https://${l.store_url.replace(/^https?:\/\//, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 font-mono text-[11px] text-emerald-400 hover:underline bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20"
                            >
                              <Globe className="w-3.5 h-3.5" /> {l.store_url} <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                            </a>
                          ) : (
                            <span className="italic text-pm-secondary/60 bg-pm-input px-2.5 py-1 rounded text-[11px]">Unbound Store Domain</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Inline 1-Click License Key Generator Widget */}
            <div className="bg-pm-card border border-pm-border rounded-xl p-5 shadow-sm pm-card-elevation space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400" /> 1-Click License Key Provisioning Widget
              </h3>

              <form onSubmit={handleIssueLicense} className="flex flex-col sm:flex-row items-center gap-3 p-4 bg-pm-input/50 border border-pm-border rounded-xl">
                <div className="flex-1 w-full">
                  <label className="block text-[11px] font-semibold text-pm-secondary mb-1">Package Tier</label>
                  <select
                    value={selectedTier}
                    onChange={e => setSelectedTier(e.target.value)}
                    className="w-full bg-pm-card border border-pm-border rounded-lg px-3 py-2 text-xs font-bold text-pm-text focus:outline-none focus:border-purple-500"
                  >
                    <option value="basic">BASIC TIER (Standard Feature Suite)</option>
                    <option value="pro">PRO TIER (Advanced Automation &amp; Backups)</option>
                    <option value="enterprise">ENTERPRISE TIER (Unlimited Multi-Store Pools)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto pm-btn-primary px-5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shrink-0 mt-auto shadow-md"
                >
                  <PlusCircle className="w-4 h-4 text-white" />
                  <span>{submitting ? 'Issuing...' : 'Issue License Key'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      <BaseModal isOpen={showResetModal} onClose={() => setShowResetModal(false)} title={`Reset Password: ${user.email}`}>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">New Password</label>
            <input
              type="text"
              required
              value={resetPassword}
              onChange={e => setResetPassword(e.target.value)}
              placeholder="Enter strong password..."
              className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm font-mono text-pm-text focus:border-pm-primary focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-pm-border">
            <button type="button" onClick={() => setShowResetModal(false)} className="pm-btn-neutral px-4 py-2 rounded-lg text-xs font-bold">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="pm-btn-primary px-4 py-2 rounded-lg text-xs font-bold">
              {submitting ? 'Resetting...' : 'Update Password'}
            </button>
          </div>
        </form>
      </BaseModal>

      {/* Delete Confirmation Modal */}
      <BaseModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Confirm Permanent Deletion">
        <div className="space-y-4">
          <p className="text-xs text-pm-text">
            Are you sure you want to permanently delete account <strong>{user.email}</strong>? All assigned licenses will be unlinked.
          </p>
          <div className="flex justify-end gap-2 pt-4 border-t border-pm-border">
            <button type="button" onClick={() => setShowDeleteModal(false)} className="pm-btn-neutral px-4 py-2 rounded-lg text-xs font-bold">
              Cancel
            </button>
            <button type="button" onClick={handleDeleteUser} disabled={submitting} className="pm-btn-danger px-4 py-2 rounded-lg text-xs font-bold">
              {submitting ? 'Deleting...' : 'Confirm Delete'}
            </button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
};

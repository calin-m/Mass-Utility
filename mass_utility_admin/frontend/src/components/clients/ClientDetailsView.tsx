import React, { useState } from 'react';
import { ArrowLeft, Mail, Building, Key, ShieldCheck, ShieldAlert, Globe, ExternalLink, PlusCircle, Check, Copy, Trash2, Edit, Clock, Sparkles } from 'lucide-react';
import { License, UserAccount } from '../LicensesTab';
import { BaseModal } from '../common/BaseModal';

interface ClientDetailsViewProps {
  user: UserAccount;
  licenses: License[];
  onBack: () => void;
  onRefresh: () => void;
  showAlert: (msg: string, type?: 'success' | 'error') => void;
}

export const ClientDetailsView: React.FC<ClientDetailsViewProps> = ({ user, licenses, onBack, onRefresh, showAlert }) => {
  const [submitting, setSubmitting] = useState(false);
  const [selectedTier, setSelectedTier] = useState('pro');

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
              <span>{user.email}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                isSuspended ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                {isSuspended ? 'SUSPENDED' : 'ACTIVE'}
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="pm-btn-neutral px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" /> Reset Password
          </button>

          <button
            type="button"
            onClick={handleToggleStatus}
            disabled={submitting}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border ${
              isSuspended
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
            }`}
          >
            {isSuspended ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
            <span>{isSuspended ? 'Re-Activate Account' : 'Suspend Account'}</span>
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

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Client Identity & Company Context */}
        <div className="space-y-6">
          {/* Identity Card */}
          <div className="bg-pm-card border border-pm-border rounded-xl p-5 shadow-sm pm-card-elevation space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-purple-400" /> Account Health Overview
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-pm-border">
                <span className="text-pm-secondary">Client ID</span>
                <span className="font-mono font-bold text-pm-text">#{user.id}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-pm-border">
                <span className="text-pm-secondary">Email Address</span>
                <span className="font-semibold text-pm-text">{user.email}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-pm-border">
                <span className="text-pm-secondary">Registration Date</span>
                <span className="text-pm-text">{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-pm-secondary">Total Licenses</span>
                <span className="font-bold text-amber-400">{clientLicenses.length} Keys Issued</span>
              </div>
            </div>
          </div>

          {/* Organization Context Card */}
          <div className="bg-pm-card border border-pm-border rounded-xl p-5 shadow-sm pm-card-elevation space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
              <Building className="w-4 h-4 text-indigo-400" /> Organization Profile
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-pm-border">
                <span className="text-pm-secondary">Company Name</span>
                <span className="font-bold text-pm-text">{user.company_name || 'Independent Client'}</span>
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
                        <div className="text-[11px] text-pm-secondary flex items-center gap-2">
                          <span className="uppercase font-bold text-purple-400 px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
                            {l.package_tier} Tier
                          </span>
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

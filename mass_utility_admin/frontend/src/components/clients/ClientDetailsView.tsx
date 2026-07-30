// @Arch[ClientDetailsView]
import React, { useState, useMemo } from 'react';
import { ArrowLeft, Mail, Building, Building2, Key, ShieldCheck, ShieldAlert, Globe, ExternalLink, PlusCircle, Check, Copy, Trash2, Edit, Clock, Sparkles, User, Eye, EyeOff } from 'lucide-react';
import { License, UserAccount } from '../LicensesTab';
import { BaseModal } from '../common/BaseModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { FormSelect } from '../common/FormSelect';
import { FormInput } from '../common/FormInput';
import { Button } from '../common/Button';
import { LicenseRowCard } from '../common/LicenseRowCard';
import { SubTabItem } from '../common/SubTabNav';
import { StatusBadge } from '../common/StatusBadge';
import { DetailSubViewLayout } from '../common/DetailSubViewLayout';
import { useTranslation } from '../../i18n/LanguageContext';
import { getSortedTierOptions } from '../../utils/tierUtils';
import { AdminFetchAdapter, getApiUrl } from '../../utils/AdminFetchAdapter';


interface ClientDetailsViewProps {
  user: UserAccount;
  licenses: License[];
  companies?: any[];
  tiers?: any[];
  initialTab?: 'profile' | 'licenses' | 'governance';
  onBack: () => void;
  onRefresh: () => void;
  showAlert: (msg: string, type?: 'success' | 'error') => void;
  onInspectCompany?: (company: any) => void;
  onInspectLicense?: (license: License) => void;
}

export const ClientDetailsView: React.FC<ClientDetailsViewProps> = ({ user, licenses, companies = [], tiers = [], initialTab, onBack, onRefresh, showAlert, onInspectCompany, onInspectLicense }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'profile' | 'licenses' | 'governance'>(initialTab || 'profile');

  const [submitting, setSubmitting] = useState(false);
  const [selectedTier, setSelectedTier] = useState('pro');

  const tierOptions = useMemo(() => getSortedTierOptions(tiers), [tiers]);

  const assignedComp = user.company_name
    ? companies.find(c => (c.company_name || '').toLowerCase() === (user.company_name || '').toLowerCase())
    : null;




  // Form State
  const [editName, setEditName] = useState(user.name || '');
  const [editCompany, setEditCompany] = useState(user.company_name || '');
  const [editRole, setEditRole] = useState(user.role || 'Owner');

  // Key Copy State
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Password Reset Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

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

      const res = await AdminFetchAdapter.request(getApiUrl('api_generate'), { method: 'POST', body: formData });
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
      formData.append('status', user.status || 'active');


      const res = await AdminFetchAdapter.request(getApiUrl('api_update_user'), { method: 'POST', body: formData });
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

      const res = await AdminFetchAdapter.request(getApiUrl('api_update_user'), { method: 'POST', body: formData });
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

      const res = await AdminFetchAdapter.request(getApiUrl('api_reset_user_password'), { method: 'POST', body: formData });
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

      const res = await AdminFetchAdapter.request(getApiUrl('api_delete_user'), { method: 'POST', body: formData });
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

  const subTabs: SubTabItem<'profile' | 'licenses' | 'governance'>[] = [
    { id: 'profile', label: 'Profile & Company', icon: User, badge: user.company_name ? 'Affiliated' : 'Standalone' },
    { id: 'licenses', label: 'Issued Licenses & Stores', icon: Key, badge: clientLicenses.length },
    { id: 'governance', label: 'Governance & Security', icon: ShieldCheck },
  ];

  return (
    <DetailSubViewLayout
      backLabel="Back to Client Accounts"
      onBack={onBack}
      headerIcon={User}
      headerTitle={user.name ? `${user.name} (${user.email})` : user.email}
      headerSubtitle={`Client ID: #${user.id} • Role: ${user.role || 'Owner'} • Affiliation: ${user.company_name || 'Standalone'}`}
      headerBadges={
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={user.status || 'active'} />
          
          {user.company_name ? (
            onInspectCompany && assignedComp ? (
              <button
                type="button"
                onClick={() => onInspectCompany(assignedComp)}
                className="inline-flex items-center gap-1.5 text-xs text-purple-400 font-bold bg-purple-500/10 hover:bg-purple-500/20 px-2.5 py-1 rounded-lg border border-purple-500/30 transition truncate max-w-[180px]"
                title={`Inspect Company Profile (${user.company_name})`}
              >
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{user.company_name}</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs text-purple-400 font-bold bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/30 truncate max-w-[180px]">
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{user.company_name}</span>
              </span>
            )
          ) : (
            <span className="text-xs text-pm-secondary bg-pm-input px-2.5 py-1 rounded-lg border border-pm-border italic font-mono font-medium">
              Standalone
            </span>
          )}

          <span className="text-xs text-pm-secondary bg-pm-input px-2.5 py-1 rounded-lg border border-pm-border uppercase font-mono font-bold">
            {clientLicenses.length} Keys
          </span>
        </div>
      }
      headerActions={
        <div className="flex items-center gap-2">
          <Button
            variant="neutral"
            size="sm"
            icon={Key}
            onClick={() => setShowResetModal(true)}
          >
            Reset Password
          </Button>

          <Button
            variant={isSuspended ? 'success' : 'warning'}
            size="sm"
            icon={isSuspended ? ShieldCheck : ShieldAlert}
            onClick={handleToggleStatus}
            disabled={submitting}
          >
            {isSuspended ? 'Re-Activate' : 'Suspend'}
          </Button>

          <Button
            variant="danger"
            size="sm"
            icon={Trash2}
            onClick={() => setShowDeleteModal(true)}
          >
            {t('btn_delete') || 'Delete'}
          </Button>
        </div>
      }
      tabs={subTabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >


      {/* Dynamic Sub-Tab Content */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          {/* Left: Account Identity & Company Affiliation Card */}
          <div className="space-y-6">
            <div className="bg-pm-card border border-pm-border rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-purple-400" /> Account Profile
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
                  <span className="text-pm-secondary">Account Role</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {user.role || 'Owner'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-pm-secondary">Status</span>
                  <span className="text-emerald-400 font-semibold font-mono">{(user.status || 'active').toUpperCase()}</span>
                </div>
              </div>
            </div>

            {/* Symmetrical Company Affiliation Cross-Information Card */}
            <div className="bg-pm-card border border-pm-border rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-purple-400" /> Organization Affiliation
              </h3>

              {assignedComp ? (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-pm-input/30 border border-pm-border rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-pm-text text-sm flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-purple-400" /> {assignedComp.company_name}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {assignedComp.status || 'ACTIVE'}
                      </span>
                    </div>

                    <div className="text-[11px] text-pm-secondary font-mono pt-1 border-t border-pm-border/40 space-y-1">
                      <div>Tax ID: {assignedComp.tax_id || 'Not Specified'}</div>
                      <div>Max License Quota: {assignedComp.max_licenses || 10} Keys</div>
                    </div>
                  </div>

                  {onInspectCompany && (
                    <Button
                      variant="neutral"
                      size="sm"
                      icon={Building2}
                      onClick={() => onInspectCompany(assignedComp)}
                      className="w-full justify-center"
                    >
                      Inspect Company Profile
                    </Button>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-pm-input/30 border border-pm-border rounded-xl text-center space-y-2">
                  <p className="text-xs text-pm-secondary italic">This client is a Standalone Account (Not affiliated with any company profile).</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Edit Profile Form */}
          <div className="lg:col-span-2">
            <div className="bg-pm-card border border-pm-border rounded-2xl p-6 shadow-sm space-y-6">
              <div className="pb-4 border-b border-pm-border">
                <h3 className="text-sm font-extrabold text-pm-text flex items-center gap-2">
                  <Edit className="w-4 h-4 text-purple-400" /> Profile & Organization Details
                </h3>
                <p className="text-xs text-pm-secondary mt-0.5">
                  Update client name, organization affiliation, and role permissions.
                </p>
              </div>

              <form onSubmit={handleEditClientProfile} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-pm-secondary mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder={t('ph_full_name')}
                      className="w-full bg-pm-card border border-pm-border rounded-lg px-3 py-2 text-xs font-semibold text-pm-text focus:border-pm-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-pm-secondary mb-1">Account Role</label>
                    <select
                      value={editRole}
                      onChange={e => setEditRole(e.target.value)}
                      className="w-full bg-pm-card border border-pm-border rounded-lg px-3 py-2 text-xs text-pm-text focus:border-pm-primary focus:outline-none"
                    >
                      <option value="SuperAdmin">Super Admin (Full Platform Access)</option>
                      <option value="CompanyAdmin">Company Admin (Manage Organization Users & Licenses)</option>
                      <option value="CatalogManager">Catalog Manager (Visual Query & Catalog Mutations)</option>
                      <option value="Operator">Operator (Database & File Tools Only)</option>
                      <option value="Observer">Observer (Read-Only Monitoring Access)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-pm-secondary mb-1">Assign to Organization Profile</label>
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

                <div className="flex justify-end pt-4 border-t border-pm-border">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Check}
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : 'Save Profile Changes'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'licenses' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-pm-card border border-pm-border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-400" /> 1-Click License Key Provisioning
            </h3>

            <form onSubmit={handleIssueLicense} className="flex flex-col sm:flex-row items-end gap-3 p-4 bg-pm-input/30 border border-pm-border rounded-xl">
              <div className="w-full sm:flex-1">
                <FormSelect
                  label={`Package Tier for ${user.email}`}
                  value={selectedTier}
                  onChange={e => setSelectedTier(e.target.value)}
                  options={tierOptions}
                />
              </div>

              <Button
                variant="primary"
                size="sm"
                icon={PlusCircle}
                disabled={submitting}
              >
                {submitting ? 'Issuing...' : 'Issue License Key'}
              </Button>
            </form>
          </div>

          <div className="bg-pm-card border border-pm-border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
              <Key className="w-4 h-4 text-amber-400" /> Issued License Keys & Bound Stores ({clientLicenses.length})
            </h3>

            {clientLicenses.length === 0 ? (
              <p className="p-8 text-center text-pm-secondary text-xs italic">No license keys issued to this client email yet.</p>
            ) : (
              <div className="space-y-3">
                {clientLicenses.map(l => (
                  <LicenseRowCard
                    key={l.id}
                    license={l}
                    users={[user]}
                    companies={companies}
                    onInspectLicense={onInspectLicense}
                    onInspectCompany={onInspectCompany}
                    showCompanyButton={true}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'governance' && (
        <div className="bg-pm-card border border-pm-border rounded-2xl p-6 shadow-sm space-y-6 animate-in fade-in duration-200">
          <div className="pb-4 border-b border-pm-border">
            <h3 className="text-sm font-extrabold text-pm-text flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Governance & Security Control Panel
            </h3>
            <p className="text-xs text-pm-secondary mt-0.5">
              Manage account activation status, reset credentials, and purge client records.
            </p>
          </div>

          <div className="p-4 bg-pm-input/30 border border-pm-border rounded-xl space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Account Status Governance
            </h4>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-pm-card p-3 rounded-lg border border-pm-border">
              <div>
                <div className="text-xs font-bold text-pm-text">Account Status: <span className={isSuspended ? 'text-rose-400' : 'text-emerald-400'}>{(user.status || 'active').toUpperCase()}</span></div>
                <p className="text-[11px] text-pm-secondary">
                  {isSuspended ? 'This client account is currently suspended. Re-activate to restore store access.' : 'This client account is active and verified.'}
                </p>
              </div>

              <Button
                variant="neutral"
                size="sm"
                icon={isSuspended ? ShieldCheck : ShieldAlert}
                onClick={handleToggleStatus}
                disabled={submitting}
              >
                {isSuspended ? 'Re-Activate Account' : 'Suspend Account'}
              </Button>
            </div>
          </div>

          <div className="p-4 bg-pm-input/30 border border-pm-border rounded-xl space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" /> Security Credentials
            </h4>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-pm-card p-3 rounded-lg border border-pm-border">
              <div>
                <div className="text-xs font-bold text-pm-text">Change Client Password</div>
                <p className="text-[11px] text-pm-secondary">Generate password, toggle visibility, copy to clipboard, or send email reset link.</p>
              </div>

              <Button
                variant="neutral"
                size="sm"
                icon={Key}
                onClick={() => setShowResetModal(true)}
              >
                Change Password
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-pm-border">
            <Button
              variant="danger"
              size="sm"
              icon={Trash2}
              onClick={() => setShowDeleteModal(true)}
            >
              Delete Client Account
            </Button>
          </div>
        </div>
      )}




      {/* Password Change & Reset Modal */}
      <BaseModal isOpen={showResetModal} onClose={() => setShowResetModal(false)} title={`Change Password: ${user.email}`} icon={Key} maxWidth="md">
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-pm-secondary mb-1">New Password</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <FormInput
                  type={showResetPassword ? 'text' : 'password'}
                  required
                  placeholder={t('ph_new_pass')}
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                />
                <div className="absolute right-2 top-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="p-1 text-pm-secondary hover:text-pm-text"
                    title={showResetPassword ? "Hide password" : "Show password"}
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  {resetPassword && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(resetPassword);
                        showAlert('Password copied to clipboard!', 'success');
                      }}
                      className="p-1 text-pm-accent hover:text-pm-accent/80"
                      title="Copy password to clipboard"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="neutral"
                size="md"
                onClick={() => {
                  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
                  let pass = '';
                  for (let i = 0; i < 16; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
                  setResetPassword(pass);
                  setShowResetPassword(true);
                }}
              >
                ⚡ Generate
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-pm-border flex-wrap gap-2">
            <Button
              type="button"
              variant="neutral"
              size="md"
              onClick={async () => {
                if (!user?.id) return;
                try {
                  const formData = new FormData();
                  formData.append('user_id', String(user.id));
                  const res = await AdminFetchAdapter.request(getApiUrl('api_send_password_reset_link'), { method: 'POST', body: formData });
                  const data = await res.json();
                  if (data.success) {
                    showAlert(data.message || 'Password reset link sent to client email.', 'success');
                    if (data.reset_url) {
                      navigator.clipboard.writeText(data.reset_url);
                    }
                  } else {
                    showAlert(data.error || 'Failed to send reset link', 'error');
                  }
                } catch (err: any) {
                  showAlert('Error sending reset link: ' + err.message, 'error');
                }
              }}
            >
              ✉️ Send Password Reset Link
            </Button>
            <div className="flex gap-2">
              <Button variant="neutral" size="md" onClick={() => setShowResetModal(false)}>
                {t('btn_cancel')}
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                loading={submitting}
                disabled={!resetPassword || resetPassword.length < 6}
              >
                Change Password
              </Button>
            </div>
          </div>
        </form>
      </BaseModal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteUser}
        title="Delete Client Account?"
        message={`Are you sure you want to permanently delete account "${user.email}"? All assigned licenses will be unlinked.`}
        confirmText="Confirm Delete"
        variant="danger"
        loading={submitting}
      />
    </DetailSubViewLayout>
  );
};


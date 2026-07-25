import React, { useState } from 'react';
import { ArrowLeft, Building2, Users, Key, ShieldCheck, ShieldAlert, Globe, ExternalLink, UserPlus, Check, Copy, Trash2, Edit, Mail, Sparkles, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { Company } from './CompanyListView';
import { BaseModal } from '../common/BaseModal';

interface CompanyDetailsViewProps {
  company: Company;
  users: any[];
  licenses: any[];
  onBack: () => void;
  onRefresh: () => void;
  showAlert?: (msg: string, type?: 'success' | 'error') => void;
  onInspectClient?: (user: any) => void;
}

export const CompanyDetailsView: React.FC<CompanyDetailsViewProps> = ({ company, users, licenses, onBack, onRefresh, showAlert, onInspectClient }) => {
  const [submitting, setSubmitting] = useState(false);
  const [copiedVat, setCopiedVat] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState(company.company_name);
  const [editTaxId, setEditTaxId] = useState(company.tax_id || '');
  const [editMaxLicenses, setEditMaxLicenses] = useState(company.max_licenses || 10);
  const [editStatus, setEditStatus] = useState(company.status);

  // Delete Modal State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Inline Add Team Member Form State
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [showMemberPassword, setShowMemberPassword] = useState(false);

  const companyMembers = users.filter(u => u.company_name?.toLowerCase() === company.company_name.toLowerCase());
  const companyLicenses = licenses.filter(l => l.user_email && companyMembers.some(m => m.email.toLowerCase() === l.user_email.toLowerCase()));

  const usedCount = companyLicenses.length;
  const maxCount = company.max_licenses || 10;
  const pct = Math.min(100, Math.round((usedCount / maxCount) * 100));
  const isFull = usedCount >= maxCount;
  const isSuspended = company.status === 'suspended';

  const [onboardMode, setOnboardMode] = useState<'assign' | 'create'>('assign');
  const [selectedUnassignedUser, setSelectedUnassignedUser] = useState<number | ''>('');

  const unassignedUsers = users.filter(u => !u.company_name || u.company_name.trim() === '');

  const getApiUrl = (action: string) => `${window.location.pathname}?action=${action}`;

  const copyVatId = () => {
    if (!company.tax_id) return;
    navigator.clipboard.writeText(company.tax_id);
    setCopiedVat(true);
    setTimeout(() => setCopiedVat(false), 2000);
    if (showAlert) showAlert('📋 Tax / VAT ID copied to clipboard!', 'success');
  };

  const copyLicenseKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    if (showAlert) showAlert('📋 License key copied to clipboard!', 'success');
  };

  const handleAssignExistingUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnassignedUser) return;
    const targetUser = users.find(u => u.id === Number(selectedUnassignedUser));
    if (!targetUser) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('id', String(targetUser.id));
      formData.append('email', targetUser.email);
      formData.append('company_name', company.company_name);
      formData.append('status', targetUser.status || 'active');

      const res = await fetch(getApiUrl('api_update_user'), { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        if (showAlert) showAlert(`🔗 ${targetUser.email} assigned to ${company.company_name}!`, 'success');
        setSelectedUnassignedUser('');
        onRefresh();
      } else {
        if (showAlert) showAlert('❌ Failed: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err: any) {
      if (showAlert) showAlert('❌ Request failed: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const generateMemberPass = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
    let pass = '';
    for (let i = 0; i < 16; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    setNewMemberPassword(pass);
  };

  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim() || !newMemberPassword.trim()) return;
    setSubmitting(true);
    try {
      const userForm = new FormData();
      userForm.append('email', newMemberEmail.trim());
      userForm.append('password', newMemberPassword.trim());
      userForm.append('company_name', company.company_name);

      const res = await fetch(getApiUrl('api_create_user'), { method: 'POST', body: userForm });
      const data = await res.json();
      if (data.success) {
        if (showAlert) showAlert(`✨ Team member account ${newMemberEmail} added to ${company.company_name}!`, 'success');
        setNewMemberEmail('');
        setNewMemberPassword('');
        onRefresh();
      } else {
        if (showAlert) showAlert('❌ Failed: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err: any) {
      if (showAlert) showAlert('❌ Request failed: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('id', String(company.id));
      formData.append('company_name', editName.trim());
      formData.append('tax_id', editTaxId.trim());
      formData.append('max_licenses', String(editMaxLicenses));
      formData.append('status', editStatus);

      const res = await fetch(getApiUrl('api_update_company'), { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        if (showAlert) showAlert('🏢 Company profile updated successfully!', 'success');
        setIsEditOpen(false);
        onRefresh();
      } else {
        if (showAlert) showAlert('❌ Failed: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err: any) {
      if (showAlert) showAlert('❌ Request failed: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = isSuspended ? 'active' : 'suspended';
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('id', String(company.id));
      formData.append('company_name', company.company_name);
      formData.append('tax_id', company.tax_id || '');
      formData.append('max_licenses', String(company.max_licenses));
      formData.append('status', newStatus);

      const res = await fetch(getApiUrl('api_update_company'), { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        if (showAlert) showAlert(`Company marked as ${newStatus.toUpperCase()}`, 'success');
        onRefresh();
      } else {
        if (showAlert) showAlert('❌ Status update failed: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err: any) {
      if (showAlert) showAlert('❌ Request failed: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCompany = async () => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('id', String(company.id));

      const res = await fetch(getApiUrl('api_delete_company'), { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        if (showAlert) showAlert('🗑️ Company profile deleted and unlinked!', 'success');
        setIsDeleteOpen(false);
        onBack();
        onRefresh();
      } else {
        if (showAlert) showAlert('❌ Failed: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err: any) {
      if (showAlert) showAlert('❌ Request failed: ' + err.message, 'error');
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
            title="Return to Companies Directory List"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="text-[10px] font-bold text-pm-secondary uppercase tracking-wider flex items-center gap-1">
              <span>Companies Directory</span>
              <span>›</span>
              <span className="text-purple-400 font-mono">{company.company_name}</span>
            </div>
            <h2 className="text-lg font-extrabold text-pm-text flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-400" />
              <span>{company.company_name}</span>
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
            onClick={() => setIsEditOpen(true)}
            className="pm-btn-neutral px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
          >
            <Edit className="w-3.5 h-3.5 text-purple-400" /> Edit Profile
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
            <span>{isSuspended ? 'Re-Activate Company' : 'Suspend Company'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            className="pm-btn-danger-outline p-2 rounded-xl text-xs font-semibold flex items-center gap-1"
            title="Delete Company Profile"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 2-Column Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Organization Overview & License Capacity Meter */}
        <div className="space-y-6">
          {/* Company Profile Overview Card */}
          <div className="bg-pm-card border border-pm-border rounded-xl p-5 shadow-sm pm-card-elevation space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-purple-400" /> Organization Profile Overview
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-pm-border">
                <span className="text-pm-secondary">Company ID</span>
                <span className="font-mono font-bold text-pm-text">#{company.id}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-pm-border">
                <span className="text-pm-secondary">Company Name</span>
                <span className="font-semibold text-pm-text">{company.company_name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-pm-border">
                <span className="text-pm-secondary">Tax / VAT ID</span>
                {company.tax_id ? (
                  <span className="font-mono text-pm-text flex items-center gap-1 bg-pm-input px-2 py-0.5 rounded border border-pm-border">
                    {company.tax_id}
                    <button type="button" onClick={copyVatId} className="text-pm-secondary hover:text-pm-primary transition p-0.5">
                      {copiedVat ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </span>
                ) : (
                  <span className="italic text-pm-secondary/60">Not specified</span>
                )}
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-pm-border">
                <span className="text-pm-secondary">Registration Date</span>
                <span className="text-pm-text">{company.created_at ? new Date(company.created_at).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-pm-secondary">Team Size</span>
                <span className="font-bold text-indigo-400">{companyMembers.length} Accounts</span>
              </div>
            </div>
          </div>

          {/* License Pool Capacity Utilization Card */}
          <div className="bg-pm-card border border-pm-border rounded-xl p-5 shadow-sm pm-card-elevation space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
              <Key className="w-4 h-4 text-amber-400" /> License Pool Capacity
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center font-bold">
                <span className={isFull ? 'text-rose-400' : 'text-pm-text'}>
                  {usedCount} / {maxCount} Licenses Allocated
                </span>
                <span className="text-purple-400">{pct}% Utilization</span>
              </div>

              <div className="w-full bg-pm-input rounded-full h-2.5 overflow-hidden border border-pm-border">
                <div
                  className={`h-full transition-all duration-300 ${
                    pct >= 100 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-500' : 'bg-gradient-to-r from-purple-500 to-emerald-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <p className="text-[11px] text-pm-secondary">
                {isFull
                  ? '⚠️ Company has reached maximum allowed store license capacity.'
                  : `Remaining capacity for ${maxCount - usedCount} additional store licenses.`}
              </p>
            </div>
          </div>
        </div>

        {/* Right Workspace Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Linked Team Members Directory Table */}
          <div className="bg-pm-card border border-pm-border rounded-xl p-5 shadow-sm pm-card-elevation space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-400" /> Linked Team Members ({companyMembers.length})
              </h3>
            </div>

            <div className="border border-pm-border rounded-lg overflow-hidden text-xs">
              {companyMembers.length === 0 ? (
                <p className="p-8 text-center text-pm-secondary">No user accounts linked to this company profile yet.</p>
              ) : (
                <div className="divide-y divide-pm-border">
                  {companyMembers.map(m => (
                    <div key={m.id} className="p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-pm-card hover:bg-pm-input/40 transition">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-pm-secondary shrink-0" />
                          <span className="font-bold text-pm-text">{m.email}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {m.role || 'Owner'}
                          </span>
                        </div>
                        <div className="text-[11px] text-pm-secondary">
                          Registered: {m.created_at ? new Date(m.created_at).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {onInspectClient && (
                          <button
                            type="button"
                            onClick={() => onInspectClient(m)}
                            className="pm-btn-neutral px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition"
                            title="Open Client Profile"
                          >
                            <Eye className="w-3.5 h-3.5 text-purple-400" /> Inspect Client
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Owned Store Licenses & Bound PrestaShop Domains Table */}
          <div className="bg-pm-card border border-pm-border rounded-xl p-5 shadow-sm pm-card-elevation space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
              <Key className="w-4 h-4 text-amber-400" /> Owned Store Licenses &amp; Bound Domains ({companyLicenses.length})
            </h3>

            <div className="border border-pm-border rounded-lg overflow-hidden text-xs">
              {companyLicenses.length === 0 ? (
                <p className="p-8 text-center text-pm-secondary">No active store licenses owned by this organization.</p>
              ) : (
                <div className="divide-y divide-pm-border">
                  {companyLicenses.map(l => (
                    <div key={l.id} className="p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-pm-card hover:bg-pm-input/40 transition">
                      <div className="space-y-1">
                        <div className="font-mono text-amber-400 font-bold flex items-center gap-2 text-sm">
                          <span>{l.license_key}</span>
                          <button
                            type="button"
                            onClick={() => copyLicenseKey(l.license_key)}
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
                          <span>User: {l.user_email}</span>
                        </div>
                      </div>

                      <div>
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

          {/* Section 3: Dual-Mode Team Member Onboarding Widget */}
          <div className="bg-pm-card border border-pm-border rounded-xl p-5 shadow-sm pm-card-elevation space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-pm-border pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-purple-400" /> Onboard Team Member to {company.company_name}
              </h3>

              {/* Mode Toggle Pills */}
              <div className="flex gap-1.5 bg-pm-input/50 p-1 rounded-lg border border-pm-border">
                <button
                  type="button"
                  onClick={() => setOnboardMode('assign')}
                  className={`px-3 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1.5 ${
                    onboardMode === 'assign'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-pm-secondary hover:text-pm-text'
                  }`}
                >
                  <span>🔗 Assign Unassigned Client</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${
                    onboardMode === 'assign' ? 'bg-white/20 text-white' : 'bg-pm-card text-pm-secondary'
                  }`}>
                    {unassignedUsers.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setOnboardMode('create')}
                  className={`px-3 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1.5 ${
                    onboardMode === 'create'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-pm-secondary hover:text-pm-text'
                  }`}
                >
                  <span>✨ Create New Account</span>
                </button>
              </div>
            </div>

            {onboardMode === 'assign' ? (
              <form onSubmit={handleAssignExistingUser} className="p-4 bg-pm-input/50 border border-pm-border rounded-xl space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-pm-secondary mb-1">
                    Select Client Account from Unassigned Pool ({unassignedUsers.length} available)
                  </label>
                  {unassignedUsers.length > 0 ? (
                    <select
                      value={selectedUnassignedUser}
                      onChange={e => setSelectedUnassignedUser(e.target.value ? Number(e.target.value) : '')}
                      required
                      className="w-full bg-pm-card border border-pm-border rounded-lg px-3 py-2 text-xs text-pm-text focus:outline-none focus:border-purple-500 font-mono"
                    >
                      <option value="">-- Choose registered unassigned client --</option>
                      {unassignedUsers.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.email} (ID: #{u.id})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 bg-pm-card border border-pm-border rounded-lg text-xs text-pm-secondary italic">
                      ℹ️ No standalone unassigned client accounts currently available. Use "Create New Account" to onboard a brand-new user.
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={submitting || !selectedUnassignedUser || unassignedUsers.length === 0}
                    className="pm-btn-primary px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4 text-white" />
                    <span>{submitting ? 'Assigning...' : '🔗 Assign Selected Client to Team'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddTeamMember} className="p-4 bg-pm-input/50 border border-pm-border rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-pm-secondary mb-1">Member Email Address</label>
                    <input
                      type="email"
                      required
                      value={newMemberEmail}
                      onChange={e => setNewMemberEmail(e.target.value)}
                      placeholder="member@company.com"
                      className="w-full bg-pm-card border border-pm-border rounded-lg px-3 py-2 text-xs text-pm-text focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[11px] font-semibold text-pm-secondary">Account Password</label>
                      <button type="button" onClick={generateMemberPass} className="text-[10px] text-pm-primary hover:underline">
                        Generate Strong Pass
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showMemberPassword ? "text" : "password"}
                        required
                        value={newMemberPassword}
                        onChange={e => setNewMemberPassword(e.target.value)}
                        placeholder="Set password..."
                        className="w-full bg-pm-card border border-pm-border rounded-lg pl-3 pr-9 py-2 text-xs font-mono text-pm-text focus:outline-none focus:border-purple-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowMemberPassword(!showMemberPassword)}
                        className="absolute right-2.5 top-2.5 text-pm-secondary hover:text-pm-text transition"
                        title={showMemberPassword ? "Hide Password" : "Show Password"}
                      >
                        {showMemberPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="pm-btn-primary px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md"
                  >
                    <UserPlus className="w-4 h-4 text-white" />
                    <span>{submitting ? 'Creating...' : '✨ Create & Add Team Member'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <BaseModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Company Profile">
        <form onSubmit={handleEditProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Company Name</label>
            <input
              type="text"
              required
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Tax / VAT Registration ID</label>
            <input
              type="text"
              value={editTaxId}
              onChange={e => setEditTaxId(e.target.value)}
              className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Max Allowed Store Licenses</label>
            <input
              type="number"
              min={1}
              max={100}
              value={editMaxLicenses}
              onChange={e => setEditMaxLicenses(parseInt(e.target.value) || 10)}
              className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Status</label>
            <select
              value={editStatus}
              onChange={e => setEditStatus(e.target.value)}
              className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-pm-border">
            <button type="button" onClick={() => setIsEditOpen(false)} className="pm-btn-neutral px-4 py-2 rounded-lg text-xs font-bold">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="pm-btn-primary px-4 py-2 rounded-lg text-xs font-bold min-w-[140px] flex justify-center items-center">
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </BaseModal>

      {/* Delete Confirmation Modal */}
      <BaseModal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Company Profile">
        <div className="space-y-4">
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 text-rose-400">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold">Warning: Permanent Deletion</p>
              <p className="mt-1">
                Deleting company profile <strong>"{company.company_name}"</strong> will unlink all associated team member client accounts and store licenses.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-pm-border">
            <button type="button" onClick={() => setIsDeleteOpen(false)} className="pm-btn-neutral px-4 py-2 rounded-lg text-xs font-bold">
              Cancel
            </button>
            <button type="button" onClick={handleDeleteCompany} disabled={submitting} className="pm-btn-danger px-4 py-2 rounded-lg text-xs font-bold min-w-[140px] flex justify-center items-center">
              {submitting ? 'Deleting...' : 'Confirm Delete'}
            </button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
};

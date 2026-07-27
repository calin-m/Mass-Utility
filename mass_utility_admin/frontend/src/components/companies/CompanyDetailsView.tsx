import React, { useState, useMemo } from 'react';
import { ArrowLeft, Building2, Users, Key, ShieldCheck, ShieldAlert, Globe, ExternalLink, UserPlus, Link as LinkIcon, Check, Copy, Trash2, Edit, Mail, Sparkles, AlertTriangle, Eye, EyeOff, PlusCircle, LayoutDashboard, LayoutGrid, List, Search } from 'lucide-react';
import { Company } from './CompanyListView';
import { BaseModal } from '../common/BaseModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { Button } from '../common/Button';
import { FormSelect } from '../common/FormSelect';
import { FormInput } from '../common/FormInput';
import { LicenseRowCard } from '../common/LicenseRowCard';
import { SubTabNav, SubTabItem } from '../common/SubTabNav';
import { StatusBadge } from '../common/StatusBadge';
import { TableCellIdentity } from '../common/TableCellIdentity';
import { TableCellText } from '../common/TableCellText';
import { DomainPillGroup } from '../common/DomainPillGroup';
import { DetailSubViewLayout } from '../common/DetailSubViewLayout';
import { useTranslation } from '../../i18n/LanguageContext';
import { getSortedTierOptions } from '../../utils/tierUtils';


interface CompanyDetailsViewProps {
  company: Company;
  users: any[];
  licenses: any[];
  initialTab?: 'overview' | 'licenses' | 'members' | 'settings';
  onBack: () => void;
  onRefresh: () => void;
  showAlert?: (msg: string, type?: 'success' | 'error') => void;
  onInspectClient?: (user: any) => void;
  onInspectLicense?: (license: any) => void;
  onEditLicense?: (license: any) => void;
  highlightedLicenseKey?: string;
  tiers?: any[];
}

export const CompanyDetailsView: React.FC<CompanyDetailsViewProps> = ({ company, users, licenses, initialTab, onBack, onRefresh, showAlert, onInspectClient, onInspectLicense, onEditLicense, highlightedLicenseKey, tiers = [] }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'overview' | 'licenses' | 'members' | 'settings'>(initialTab || 'overview');

  const [submitting, setSubmitting] = useState(false);
  const [copiedVat, setCopiedVat] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Record<number, boolean>>({});
  const [poolTier, setPoolTier] = useState('pro');
  const [poolSearchQuery, setPoolSearchQuery] = useState('');
  const [poolViewMode, setPoolViewMode] = useState<'table' | 'grid'>('table');

  const tierOptions = useMemo(() => getSortedTierOptions(tiers), [tiers]);




  const toggleKeyVisibility = (id: number) => {
    setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const maskKey = (key: string) => {
    if (!key || key.length < 10) return '••••-••••-••••-••••';
    const parts = key.split('-');
    if (parts.length >= 4) {
      return `${parts[0]}-••••-••••-${parts[parts.length - 1]}`;
    }
    return key.substring(0, 4) + '••••••••••••' + key.substring(key.length - 4);
  };

  // Edit Form State
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




  const companyMembers = users.filter(u => u.company_name && u.company_name.trim().toLowerCase() === company.company_name.trim().toLowerCase());
  const companyLicenses = licenses.filter(l => (l.company_id && l.company_id === company.id) || (l.company_name && l.company_name.trim().toLowerCase() === company.company_name.trim().toLowerCase()) || (l.user_email && companyMembers.some(m => m.email.toLowerCase() === l.user_email.toLowerCase())));

  const filteredPoolLicenses = useMemo(() => {
    if (!poolSearchQuery.trim()) return companyLicenses;
    const q = poolSearchQuery.toLowerCase().trim();
    return companyLicenses.filter((lic: any) => {
      const key = (lic.license_key || '').toLowerCase();
      const url = (lic.store_url || '').toLowerCase();
      const tier = (lic.package_tier || '').toLowerCase();
      const status = (lic.status || '').toLowerCase();
      const assignedUser = lic.user_id ? users.find((u) => Number(u.id) === Number(lic.user_id)) : null;
      const userName = (assignedUser?.name || assignedUser?.email || '').toLowerCase();
      return key.includes(q) || url.includes(q) || tier.includes(q) || status.includes(q) || userName.includes(q);
    });
  }, [companyLicenses, poolSearchQuery, users]);

  const usedCount = companyLicenses.length;
  const maxCount = company.max_licenses || 10;
  const pct = Math.min(100, Math.round((usedCount / maxCount) * 100));
  const isFull = usedCount >= maxCount;
  const isSuspended = company.status === 'suspended';

  const handleAssignEmployee = async (licenseId: number, userIdStr: string) => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('license_id', String(licenseId));
      formData.append('user_id', userIdStr);

      const res = await fetch('index.php?action=api_assign_license', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        if (showAlert) showAlert('🔑 License key assigned to team member!', 'success');
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

  const handleIssuePoolLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('company_id', String(company.id));
      formData.append('package_tier', poolTier);

      const res = await fetch(getApiUrl('api_generate'), { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        if (showAlert) showAlert(`✨ ${poolTier.toUpperCase()} license key issued to ${company.company_name} pool!`, 'success');
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

  const subTabs: SubTabItem<'overview' | 'licenses' | 'members' | 'settings'>[] = [
    { id: 'overview', label: t('subtab_overview') || 'Overview', icon: LayoutDashboard },
    { id: 'licenses', label: 'License Pool', icon: Key, badge: companyLicenses.length },
    { id: 'members', label: 'Team Members', icon: Users, badge: companyMembers.length },
    { id: 'settings', label: 'Settings & Quotas', icon: Edit },
  ];

  const onboardTabs: SubTabItem<'assign' | 'create'>[] = [
    { id: 'assign', label: 'Assign Registered Client', icon: LinkIcon, badge: unassignedUsers.length },
    { id: 'create', label: 'Create Brand-New Account', icon: UserPlus },
  ];

  return (
    <DetailSubViewLayout
      backLabel="Back to Companies Directory"
      onBack={onBack}
      headerIcon={Building2}
      headerTitle={company.company_name}
      headerSubtitle={`Created on ${company.created_at ? company.created_at.split(' ')[0] : 'N/A'} • Tax ID: ${company.tax_id || 'Not Set'}`}
      headerBadges={
        <div className="flex items-center gap-2">
          <StatusBadge status={company.status || 'active'} />
          <span className="text-xs text-pm-secondary bg-pm-input px-2.5 py-1 rounded-lg border border-pm-border uppercase font-mono font-bold">
            Quota: {usedCount}/{maxCount}
          </span>
        </div>
      }
      headerActions={
        <div className="flex items-center gap-2">
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
            onClick={() => setIsDeleteOpen(true)}
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
      {activeTab === 'settings' && (
        <div className="bg-pm-card border border-pm-border rounded-2xl p-6 shadow-sm space-y-6 animate-in fade-in duration-200">
          <div className="pb-4 border-b border-pm-border">
            <h3 className="text-sm font-extrabold text-pm-text flex items-center gap-2">
              <Edit className="w-4 h-4 text-purple-400" /> Organization Settings & Capacity Quotas
            </h3>
            <p className="text-xs text-pm-secondary mt-0.5">
              Update organization profile details, tax identifiers, store license allocation limits, and account status governance.
            </p>
          </div>

          <form onSubmit={handleEditProfile} className="space-y-6">
            <div className="p-4 bg-pm-input/40 border border-pm-border rounded-xl space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-purple-400" /> General Company Information
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-pm-secondary mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full bg-pm-card border border-pm-border rounded-lg px-3 py-2 text-xs text-pm-text focus:border-pm-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-pm-secondary mb-1">Tax / VAT Registration ID</label>
                  <input
                    type="text"
                    value={editTaxId}
                    onChange={e => setEditTaxId(e.target.value)}
                    placeholder={t('field_vat_id_placeholder')}
                    className="w-full bg-pm-card border border-pm-border rounded-lg px-3 py-2 text-xs font-mono text-pm-text focus:border-pm-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-pm-input/40 border border-pm-border rounded-xl space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" /> License Capacity Settings
              </h4>

              <div>
                <label className="block text-xs font-semibold text-pm-secondary mb-1">Max Allowed Store Licenses</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={editMaxLicenses}
                  onChange={e => setEditMaxLicenses(parseInt(e.target.value) || 10)}
                  className="w-full max-w-xs bg-pm-card border border-pm-border rounded-lg px-3 py-2 text-xs font-mono text-pm-text focus:border-pm-primary focus:outline-none"
                />
                <p className="text-[11px] text-pm-secondary mt-1">
                  Currently <strong>{usedCount}</strong> of <strong>{editMaxLicenses}</strong> licenses allocated.
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-pm-border">
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={() => setIsDeleteOpen(true)}
              >
                Delete Company Profile
              </Button>

              <Button
                variant="primary"
                size="sm"
                icon={Check}
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Save Organization Settings'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          <div className="bg-pm-card border border-pm-border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-purple-400" /> Profile Summary
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-pm-border">
                <span className="text-pm-secondary">Company ID</span>
                <span className="font-mono font-bold text-pm-text">#{company.id}</span>
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
                <span className="font-bold text-indigo-400">{companyMembers.length} Members</span>
              </div>
            </div>
          </div>

          <div className="bg-pm-card border border-pm-border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
              <Key className="w-4 h-4 text-amber-400" /> Capacity Utilization
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center font-bold">
                <span className={isFull ? 'text-rose-400' : 'text-pm-text'}>
                  {usedCount} / {maxCount} Licenses
                </span>
                <span className="text-purple-400">{pct}%</span>
              </div>

              <div className="w-full bg-pm-input rounded-full h-2.5 overflow-hidden border border-pm-border">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-purple-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <p className="text-[11px] text-pm-secondary pt-2">
                {isFull
                  ? '⚠️ License pool quota is full. Expand capacity in Settings to issue more keys.'
                  : `${maxCount - usedCount} remaining key slots available for provisioning.`}
              </p>
            </div>
          </div>

          <div className="bg-pm-card border border-pm-border rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-400" /> Quick Navigation
            </h3>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setActiveTab('licenses')}
                className="w-full p-3 bg-pm-input/40 hover:bg-pm-input/80 border border-pm-border rounded-xl flex items-center justify-between text-xs font-semibold text-pm-text transition group"
              >
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>Manage License Pool</span>
                </div>
                <span className="text-pm-secondary group-hover:text-purple-400 font-mono">→</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('members')}
                className="w-full p-3 bg-pm-input/40 hover:bg-pm-input/80 border border-pm-border rounded-xl flex items-center justify-between text-xs font-semibold text-pm-text transition group"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>Manage Team Members</span>
                </div>
                <span className="text-pm-secondary group-hover:text-purple-400 font-mono">→</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="w-full p-3 bg-pm-input/40 hover:bg-pm-input/80 border border-pm-border rounded-xl flex items-center justify-between text-xs font-semibold text-pm-text transition group"
              >
                <div className="flex items-center gap-2">
                  <Edit className="w-4 h-4 text-purple-400" />
                  <span>Organization Settings</span>
                </div>
                <span className="text-pm-secondary group-hover:text-purple-400 font-mono">→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'licenses' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-pm-card border border-pm-border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-purple-400" /> 1-Click Provision License Key to Pool
            </h3>

            <form onSubmit={handleIssuePoolLicense} className="flex flex-col sm:flex-row items-end gap-3 p-4 bg-pm-input/30 border border-pm-border rounded-xl">
              <div className="w-full sm:flex-1">
                <FormSelect
                  label={`Tier for ${company.company_name} Pool Key`}
                  value={poolTier}
                  onChange={e => setPoolTier(e.target.value)}
                  options={tierOptions}
                />
              </div>

              <Button
                variant="primary"
                size="sm"
                icon={PlusCircle}
                disabled={submitting || isFull}
              >
                {submitting ? 'Generating...' : isFull ? 'Limit Reached' : 'Issue Pool Key'}
              </Button>
            </form>
          </div>

          <div className="bg-pm-card border border-pm-border rounded-2xl p-5 shadow-sm space-y-4">
            {/* Header & Controls Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-pm-border">
              <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5 shrink-0">
                <Key className="w-4 h-4 text-purple-400" /> Company B2B License Keys ({companyLicenses.length})
              </h3>

              <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-pm-secondary" />
                  <input
                    type="text"
                    value={poolSearchQuery}
                    onChange={(e) => setPoolSearchQuery(e.target.value)}
                    placeholder="Search key, domain, or member..."
                    className="w-full bg-pm-input border border-pm-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-pm-text placeholder:text-pm-secondary focus:outline-none focus:border-purple-500/50"
                  />
                </div>

                <div className="flex items-center bg-pm-input border border-pm-border rounded-lg p-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPoolViewMode('table')}
                    className={`p-1.5 rounded text-xs transition ${
                      poolViewMode === 'table'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-pm-secondary hover:text-pm-text'
                    }`}
                    title="Table View (High Density)"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPoolViewMode('grid')}
                    className={`p-1.5 rounded text-xs transition ${
                      poolViewMode === 'grid'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-pm-secondary hover:text-pm-text'
                    }`}
                    title="Grid Card View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {filteredPoolLicenses.length === 0 ? (
              <p className="p-8 text-center text-pm-secondary text-xs italic">
                {companyLicenses.length === 0
                  ? 'No license keys issued to this company pool yet.'
                  : 'No license keys match your search filter.'}
              </p>
            ) : poolViewMode === 'table' ? (
              <div className="overflow-x-auto rounded-xl border border-pm-border">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-pm-input text-pm-secondary uppercase font-bold border-b border-pm-border text-[10px]">
                      <th className="p-3 w-[24%]">License Key</th>
                      <th className="p-3 w-[22%]">Assigned Team Member</th>
                      <th className="p-3 w-[10%]">Tier</th>
                      <th className="p-3 w-[10%]">Status</th>
                      <th className="p-3 w-[18%]">Allowed Store Domains</th>
                      <th className="p-3 w-[8%]">Expires</th>
                      <th className="p-3 text-right w-[8%] min-w-[120px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pm-border">
                    {filteredPoolLicenses.map((lic: any) => {
                      const isVisible = visibleKeys[lic.id];
                      const assignedUser = lic.user_id ? users.find((u: any) => Number(u.id) === Number(lic.user_id)) : null;

                      return (
                        <tr key={lic.id} className="h-[49px] align-middle hover:bg-pm-input/50 transition">
                          <td className="p-3 align-middle">
                            <TableCellIdentity
                              icon={Key}
                              title={isVisible ? lic.license_key : maskKey(lic.license_key)}
                              onTitleClick={() => onInspectLicense && onInspectLicense(lic)}
                              subtitle={`ID #${lic.id}`}
                              rightContent={
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => toggleKeyVisibility(lic.id)}
                                    className="p-1 rounded hover:bg-pm-input text-pm-secondary hover:text-pm-text transition"
                                    title={isVisible ? 'Mask Key' : 'Reveal Key'}
                                  >
                                    {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await navigator.clipboard.writeText(lic.license_key);
                                      setCopiedKey(lic.license_key);
                                      setTimeout(() => setCopiedKey(null), 2000);
                                    }}
                                    className="p-1 rounded hover:bg-pm-input text-pm-secondary hover:text-pm-text transition"
                                    title="Copy Key"
                                  >
                                    {copiedKey === lic.license_key ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              }
                            />
                          </td>

                          <td className="p-3 align-middle">
                            <FormSelect
                              value={lic.user_id ? String(lic.user_id) : ''}
                              onChange={(e) => handleAssignEmployee(lic.id, e.target.value)}
                              disabled={submitting}
                              options={[
                                { label: 'Unassigned (Pool)', value: '' },
                                ...companyMembers.map((m: any) => ({
                                  label: `${m.name || m.email} (${m.email})`,
                                  value: String(m.id)
                                }))
                              ]}
                            />
                          </td>

                          <td className="p-3 align-middle">
                            <StatusBadge type="tier" label={`${lic.package_tier || 'basic'} TIER`} />
                          </td>

                          <td className="p-3 align-middle">
                            <StatusBadge status={lic.status || 'active'} />
                          </td>

                          <td className="p-3 align-middle">
                            <DomainPillGroup storeUrl={lic.store_url} />
                          </td>

                          <td className="p-3 align-middle text-pm-secondary text-[11px] font-mono">
                            {lic.expires_at ? new Date(lic.expires_at).toLocaleDateString() : 'Never'}
                          </td>

                          <td className="p-3 align-middle text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {onInspectLicense && (
                                <Button
                                  type="button"
                                  variant="neutral"
                                  size="sm"
                                  icon={Eye}
                                  onClick={() => onInspectLicense(lic)}
                                  title="Inspect / Edit License"
                                >
                                  Inspect
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPoolLicenses.map((lic: any) => (
                  <LicenseRowCard
                    key={lic.id}
                    license={lic}
                    users={companyMembers}
                    companies={[company]}
                    highlightedKey={highlightedLicenseKey}
                    showAssignSelect={true}
                    onAssignEmployee={handleAssignEmployee}
                    onInspectLicense={onInspectLicense}
                    onInspectClient={onInspectClient}
                    showCompanyButton={false}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-pm-card border border-pm-border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-purple-400" /> Onboard Team Member to Company
            </h3>

            {/* Standardized SubTabNav Primitive for Onboard Mode */}
            <SubTabNav
              tabs={onboardTabs}
              activeTab={onboardMode}
              onTabChange={setOnboardMode}
            />

            {onboardMode === 'assign' ? (
              <form onSubmit={handleAssignExistingUser} className="p-4 bg-pm-input/30 border border-pm-border rounded-xl space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-pm-secondary mb-1">Select Registered Unassigned Client</label>
                  {unassignedUsers.length > 0 ? (
                    <select
                      value={selectedUnassignedUser}
                      onChange={e => setSelectedUnassignedUser(Number(e.target.value))}
                      required
                      className="w-full bg-pm-card border border-pm-border rounded-lg px-3 py-2 text-xs text-pm-text focus:outline-none focus:border-purple-500 font-mono"
                    >
                      <option value="">-- Choose unassigned client account --</option>
                      {unassignedUsers.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.email} (ID: #{u.id})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 bg-pm-card border border-pm-border rounded-lg text-xs text-pm-secondary italic">
                      ℹ️ No standalone unassigned client accounts available. Switch to "Create Brand-New Account" above.
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={UserPlus}
                    disabled={submitting || !selectedUnassignedUser || unassignedUsers.length === 0}
                  >
                    {submitting ? 'Assigning...' : 'Assign Selected Client'}
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddTeamMember} className="p-4 bg-pm-input/30 border border-pm-border rounded-xl space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-pm-secondary mb-1">{t('field_client_email')}</label>
                    <input
                      type="email"
                      required
                      value={newMemberEmail}
                      onChange={e => setNewMemberEmail(e.target.value)}
                      placeholder={t('ph_member_email')}
                      className="w-full bg-pm-card border border-pm-border rounded-lg px-3 py-2 text-xs text-pm-text focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold text-pm-secondary">Temporary Password</label>
                      <button
                        type="button"
                        onClick={generateMemberPass}
                        className="text-[11px] text-purple-400 hover:underline flex items-center gap-1 font-mono"
                      >
                        <Sparkles className="w-3 h-3" /> Auto-Generate
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={newMemberPassword}
                      onChange={e => setNewMemberPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full bg-pm-card border border-pm-border rounded-lg px-3 py-2 text-xs font-mono text-pm-text focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={UserPlus}
                    disabled={submitting}
                  >
                    {submitting ? 'Creating...' : 'Onboard & Create Account'}
                  </Button>
                </div>
              </form>
            )}
          </div>

          <div className="bg-pm-card border border-pm-border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-400" /> Linked Team Members Directory ({companyMembers.length})
            </h3>

            <div className="border border-pm-border rounded-xl overflow-hidden text-xs">
              {companyMembers.length === 0 ? (
                <p className="p-8 text-center text-pm-secondary italic">No team members linked to this company profile yet.</p>
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
                        <div className="text-[11px] text-pm-secondary font-mono">ID: #{m.id} • Registered: {m.created_at ? new Date(m.created_at).toLocaleDateString() : 'N/A'}</div>
                      </div>

                      {onInspectClient && (
                        <Button
                          variant="neutral"
                          size="sm"
                          onClick={() => onInspectClient(m)}
                        >
                          Inspect Client
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}



      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteCompany}
        title="Delete Company Profile?"
        message={`Deleting company profile "${company.company_name}" will unlink all associated team member client accounts and store licenses.`}
        confirmText="Confirm Delete"
        variant="danger"
        loading={submitting}
      />
    </DetailSubViewLayout>
  );
};


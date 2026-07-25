import React, { useState, useMemo } from 'react';
import { Users, Search, Edit, Trash2, Key, Eye, EyeOff, ShieldAlert, CheckCircle, Building, Mail, ExternalLink, RefreshCw, UserPlus, Check, Sparkles, Copy, PlusCircle } from 'lucide-react';
import { License, UserAccount } from '../LicensesTab';
import { BaseModal } from '../common/BaseModal';
import { SectionHeader } from '../common/SectionHeader';
import { StatCard } from '../common/StatCard';
import { DirectoryToolbar } from '../common/DirectoryToolbar';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';
import { FormInput } from '../common/FormInput';
import { FormSelect } from '../common/FormSelect';
import { PaginationBar } from '../common/PaginationBar';
import { useTranslation } from '../../i18n/LanguageContext';

interface ClientListViewProps {
  users: UserAccount[];
  licenses: License[];
  onRefresh: () => void;
  showAlert: (msg: string, type?: 'success' | 'error') => void;
  onSelectClient: (user: UserAccount, tab?: 'overview' | 'edit') => void;
}

export const ClientListView: React.FC<ClientListViewProps> = ({ users, licenses, onRefresh, showAlert, onSelectClient }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      showAlert('🔄 Client accounts reloaded!', 'success');
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

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
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Status Confirmation Modal State (Suspend / Activate)
  const [statusUser, setStatusUser] = useState<UserAccount | null>(null);

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

  const generateRandomPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
    let pass = '';
    for (let i = 0; i < 16; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCreatePassword(pass);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEmail || !createPassword) {
      showAlert('Email and password are required', 'error');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('email', createEmail.trim());
      formData.append('password', createPassword);
      formData.append('company_name', createCompany.trim());
      formData.append('role', 'client');
      formData.append('status', 'active');

      const res = await fetch('index.php?action=api_create_user', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.success) {
        let generatedKey: string | undefined;

        if (issueKeyImmediately && data.user && data.user.id) {
          try {
            const genData = new FormData();
            genData.append('user_id', String(data.user.id));
            genData.append('package_tier', selectedIssueTier);
            genData.append('store_url', '');
            genData.append('expires_at', '');

            const genRes = await fetch('index.php?action=api_generate', { method: 'POST', body: genData });
            const genJson = await genRes.json();
            if (genJson.success && genJson.license_key) {
              generatedKey = genJson.license_key;
            }
          } catch (e) {}
        }

        setLastCreatedCreds({
          email: createEmail.trim(),
          pass: createPassword,
          key: generatedKey
        });

        clearDraftMemory();
        setShowCreateModal(false);

        showAlert(
          `🎉 Client account ${createEmail} created successfully! ${generatedKey ? '🔑 License Key issued!' : ''}`,
          'success'
        );
        onRefresh();
      } else {
        showAlert(data.error || 'Failed to create client account', 'error');
      }
    } catch (err: any) {
      showAlert('Failed to create account: ' + err.message, 'error');
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
      formData.append('user_id', String(resetUser.id));
      formData.append('new_password', resetPassword);

      const res = await fetch('index.php?action=api_reset_user_password', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.success) {
        showAlert(`Password reset successfully for ${resetUser.email}`, 'success');
        setResetUser(null);
        setResetPassword('');
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
        showAlert(`Client account ${deletingUser.email} deleted successfully`, 'success');
        setDeletingUser(null);
        onRefresh();
      } else {
        showAlert(data.error || 'Failed to delete account', 'error');
      }
    } catch (err: any) {
      showAlert('Failed to delete account: ' + err.message, 'error');
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
      formData.append('email', user.email);
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
      formData.append('email', editingUser.email);
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
    setConfirmResetPassword('');
  };

  const copyCreatedCredentials = () => {
    if (!lastCreatedCreds) return;
    const text = `Client Login Credentials:\nEmail: ${lastCreatedCreds.email}\nPassword: ${lastCreatedCreds.pass}${lastCreatedCreds.key ? `\nLicense Key: ${lastCreatedCreds.key}` : ''}`;
    navigator.clipboard.writeText(text);
    setCopiedCreds(true);
    setTimeout(() => setCopiedCreds(false), 2000);
    showAlert('📋 Client Login Credentials copied to clipboard!', 'success');
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (u.company_name && u.company_name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' ||
                            (statusFilter === 'suspended' && u.status === 'suspended') ||
                            (statusFilter === 'active' && u.status !== 'suspended');
      return matchesSearch && matchesStatus;
    });
  }, [users, searchTerm, statusFilter]);

  // Pagination calculation
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  const getUserLicenseMetrics = (userId: number) => {
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
    <div className="space-y-6">
      <SectionHeader
        title={t('clients_title')}
        subtitle={t('clients_subtitle')}
        icon={Users}
        action={
          <Button
            variant="neutral"
            size="sm"
            icon={RefreshCw}
            loading={isRefreshing}
            onClick={handleRefresh}
          >
            {t('btn_refresh')}
          </Button>
        }
      />

      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('stat_total_clients')} value={totalClients} icon={Users} color="purple" />
        <StatCard label={t('stat_active_accounts')} value={activeClients} icon={CheckCircle} color="emerald" />
        <StatCard label={t('stat_suspended_accounts')} value={suspendedClients} icon={ShieldAlert} color="rose" />
        <StatCard label={t('stat_bound_domains')} value={totalBoundDomains} icon={Building} color="amber" />
      </div>

      {/* Shared Directory Toolbar */}
      <DirectoryToolbar
        searchPlaceholder={t('ph_search_clients')}
        searchTerm={searchTerm}
        onSearchChange={(val) => {
          setSearchTerm(val);
          setCurrentPage(1);
        }}
        statusFilters={[
          { key: 'all', label: t('nav_clients'), count: totalClients },
          { key: 'active', label: t('btn_activate'), count: activeClients },
          { key: 'suspended', label: t('btn_suspend'), count: suspendedClients }
        ]}
        activeFilter={statusFilter}
        onFilterChange={(key) => {
          setStatusFilter(key as any);
          setCurrentPage(1);
        }}
        onClearFilters={handleClearFilters}
        primaryAction={{
          label: t('btn_create_client'),
          icon: UserPlus,
          onClick: () => setShowCreateModal(true)
        }}
      />

      {/* Post-Creation Quick Credentials Banner */}
      {lastCreatedCreds && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="space-y-1">
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{t('lbl_creds_title')} <strong>{lastCreatedCreds.email}</strong></span>
            </div>
            <div className="text-[11px] font-mono text-pm-secondary flex flex-wrap items-center gap-4 pt-1">
              <span>{t('lbl_creds_email')} <strong className="text-pm-text">{lastCreatedCreds.email}</strong></span>
              <span>{t('lbl_creds_password')} <strong className="text-pm-text font-bold">{showBannerPass ? lastCreatedCreds.pass : '••••••••••••'}</strong></span>
              <button
                type="button"
                onClick={() => setShowBannerPass(!showBannerPass)}
                className="text-purple-600 dark:text-purple-400 hover:underline font-bold text-[10px]"
              >
                {showBannerPass ? t('lbl_creds_hide') : t('lbl_creds_show')} {t('login_password_label')}
              </button>
              {lastCreatedCreds.key && (
                <span>{t('lbl_creds_key')} <strong className="text-purple-600 dark:text-purple-400">{lastCreatedCreds.key}</strong></span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="success"
              size="sm"
              icon={copiedCreds ? Check : Copy}
              onClick={copyCreatedCredentials}
            >
              {copiedCreds ? t('btn_copied') : t('btn_copy_creds')}
            </Button>
            <button
              type="button"
              onClick={() => setLastCreatedCreds(null)}
              className="text-pm-secondary hover:text-pm-text text-xs p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Clients Directory Table */}
      <div className="bg-pm-card border border-pm-border rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-pm-input text-pm-secondary uppercase font-bold border-b border-pm-border text-[10px]">
                <th className="p-3">{t('th_client')}</th>
                <th className="p-3">{t('th_company_profile')}</th>
                <th className="p-3">{t('th_active_licenses')}</th>
                <th className="p-3">{t('th_domains')}</th>
                <th className="p-3">{t('th_status')}</th>
                <th className="p-3 text-right">{t('th_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pm-border">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-pm-secondary italic">
                    {t('empty_clients')}
                  </td>
                </tr>
              ) : (
                paginatedUsers.map(user => {
                  const metrics = getUserLicenseMetrics(user.id);
                  const isSuspended = user.status === 'suspended';

                  return (
                    <tr key={user.id} className="hover:bg-pm-input/50 transition">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            <Mail className="w-4 h-4" />
                          </div>
                          <div>
                            <button
                              onClick={() => onSelectClient(user, 'overview')}
                              className="font-bold text-pm-text hover:text-purple-500 transition text-left block"
                            >
                              {user.email}
                            </button>
                            <div className="text-[10px] text-pm-secondary font-mono">ID #{user.id} • {t('stat_joined_date')} {user.created_at}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3 font-semibold text-pm-text">
                        {user.company_name ? (
                          <div className="flex items-center gap-1">
                            <Building className="w-3.5 h-3.5 text-purple-400" />
                            <span>{user.company_name}</span>
                          </div>
                        ) : (
                          <span className="italic text-pm-secondary">{t('lbl_individual_client')}</span>
                        )}
                      </td>

                      <td className="p-3 font-mono font-semibold text-pm-text">
                        {metrics.total === 0 ? (
                          <span className="italic text-pm-secondary">{t('lbl_no_licenses')}</span>
                        ) : (
                          <span className="text-purple-600 dark:text-purple-400 font-bold">{metrics.active} {t('status_active')}</span>
                        )}
                      </td>

                      <td className="p-3 font-mono text-[0.72rem]">
                        {metrics.boundDomains.length === 0 ? (
                          <span className="italic text-pm-secondary">{t('lbl_none')}</span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-pm-text font-bold">{metrics.boundDomains[0]}</span>
                            {metrics.boundDomains.length > 1 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold">
                                +{metrics.boundDomains.length - 1} {t('lbl_more')}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="p-3">
                        <StatusBadge status={user.status} />
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="neutral"
                            size="sm"
                            icon={Eye}
                            onClick={() => onSelectClient(user, 'overview')}
                          >
                            {t('btn_inspect_client')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Edit}
                            onClick={() => openEditModal(user)}
                          >
                            {t('btn_edit')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Key}
                            onClick={() => openResetModal(user)}
                          >
                            Reset Pass
                          </Button>
                          <Button
                            variant={isSuspended ? 'success' : 'danger'}
                            size="sm"
                            icon={isSuspended ? CheckCircle : ShieldAlert}
                            onClick={() => setStatusUser(user)}
                          >
                            {isSuspended ? t('btn_activate') : t('btn_suspend')}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            icon={Trash2}
                            onClick={() => setDeletingUser(user)}
                          >
                            {t('btn_delete')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Master PaginationBar Component Primitive */}
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Provision New Client Account Modal */}
      <BaseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('modal_create_client')}
        icon={UserPlus}
        maxWidth="lg"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <FormInput
            label={t('field_client_email')}
            type="email"
            required
            placeholder={t('ph_client_email')}
            value={createEmail}
            onChange={e => setCreateEmail(e.target.value)}
          />

          <div>
            <label className="block text-[11px] font-bold uppercase text-pm-secondary mb-1">{t('field_account_password')}</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <FormInput
                  type={showCreatePassword ? 'text' : 'password'}
                  required
                  placeholder={t('ph_gen_pass')}
                  value={createPassword}
                  onChange={e => setCreatePassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowCreatePassword(!showCreatePassword)}
                  className="absolute right-3 top-2.5 text-pm-secondary hover:text-pm-text"
                >
                  {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button type="button" variant="neutral" size="md" onClick={generateRandomPassword}>
                {t('btn_generate')}
              </Button>
            </div>
          </div>

          <FormInput
            label={t('field_company_name')}
            type="text"
            placeholder={t('ph_company_inc')}
            value={createCompany}
            onChange={e => setCreateCompany(e.target.value)}
          />

          <div className="pt-2 border-t border-pm-border space-y-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-pm-text cursor-pointer">
              <input
                type="checkbox"
                checked={issueKeyImmediately}
                onChange={e => setIssueKeyImmediately(e.target.checked)}
                className="rounded border-pm-border text-purple-600 focus:ring-purple-500"
              />
              <span>1-Click Provision: Issue license key immediately upon account creation</span>
            </label>

            {issueKeyImmediately && (
              <div className="p-3 bg-pm-input/50 rounded-xl border border-pm-border space-y-2">
                <FormSelect
                  label="Package Tier for Issued Key"
                  value={selectedIssueTier}
                  onChange={e => setSelectedIssueTier(e.target.value)}
                  options={[
                    { value: 'basic', label: 'BASIC TIER' },
                    { value: 'pro', label: 'PRO TIER' },
                    { value: 'enterprise', label: 'ENTERPRISE TIER' },
                  ]}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-pm-border">
            <Button variant="neutral" size="md" onClick={() => setShowCreateModal(false)}>
              {t('btn_cancel')}
            </Button>
            <Button variant="primary" size="md" type="submit" loading={loading}>
              Create Client Account
            </Button>
          </div>
        </form>
      </BaseModal>

      {/* Edit Client Profile Modal */}
      <BaseModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={`Edit Profile: ${editingUser?.email || ''}`}
        icon={Edit}
        maxWidth="md"
      >
        {editingUser && (
          <form onSubmit={handleEditProfile} className="space-y-4">
            <FormInput
              label={t('field_company_name')}
              type="text"
              placeholder={t('field_company_name_placeholder')}
              value={editCompany}
              onChange={e => setEditCompany(e.target.value)}
            />

            <div className="flex justify-end gap-3 pt-3 border-t border-pm-border">
              <Button variant="neutral" size="md" onClick={() => setEditingUser(null)}>
                {t('btn_cancel')}
              </Button>
              <Button variant="primary" size="md" type="submit" loading={loading}>
                {t('btn_save')}
              </Button>
            </div>
          </form>
        )}
      </BaseModal>

      {/* Password Reset Modal */}
      <BaseModal
        isOpen={!!resetUser}
        onClose={() => setResetUser(null)}
        title={`${t('modal_reset_password')}: ${resetUser?.email || ''}`}
        icon={Key}
        maxWidth="md"
      >
        {resetUser && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase text-pm-secondary mb-1">{t('settings_new_password')}</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <FormInput
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    placeholder={t('ph_new_pass')}
                    value={resetPassword}
                    onChange={e => setResetPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-2.5 text-pm-secondary hover:text-pm-text"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
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
                    setConfirmResetPassword(pass);
                  }}
                >
                  Generate
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-pm-secondary mb-1">Confirm New Password</label>
              <FormInput
                type={showResetPassword ? 'text' : 'password'}
                required
                placeholder={t('modal_confirm_pass_placeholder')}
                value={confirmResetPassword}
                onChange={e => setConfirmResetPassword(e.target.value)}
                error={confirmResetPassword.length > 0 && confirmResetPassword !== resetPassword ? t('err_password_mismatch') : undefined}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-pm-border">
              <Button variant="neutral" size="md" onClick={() => setResetUser(null)}>
                {t('btn_cancel')}
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                loading={loading}
                disabled={!resetPassword || resetPassword.length < 6 || resetPassword !== confirmResetPassword}
              >
                Reset Password
              </Button>
            </div>
          </form>
        )}
      </BaseModal>

      {/* Suspend / Activate Confirmation Modal */}
      <BaseModal
        isOpen={!!statusUser}
        onClose={() => setStatusUser(null)}
        title={statusUser?.status === 'suspended' ? 'Re-Activate Client Account?' : 'Suspend Client Account Access?'}
        icon={statusUser?.status === 'suspended' ? CheckCircle : ShieldAlert}
        variant={statusUser?.status === 'suspended' ? 'primary' : 'danger'}
        maxWidth="md"
      >
        {statusUser && (
          <div className="space-y-4 text-xs">
            <p className="text-pm-secondary leading-relaxed">
              {statusUser.status === 'suspended' 
                ? `${t('modal_activate_client_confirm')} ${statusUser.email}?` 
                : `${t('modal_suspend_client_confirm')} ${statusUser.email}?`}
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-pm-border">
              <Button variant="neutral" size="md" onClick={() => setStatusUser(null)}>
                {t('btn_cancel')}
              </Button>
              <Button
                variant={statusUser.status === 'suspended' ? 'success' : 'danger'}
                size="md"
                loading={loading}
                onClick={async () => {
                  const target = statusUser;
                  setStatusUser(null);
                  await handleToggleStatus(target);
                }}
              >
                {statusUser.status === 'suspended' ? t('btn_activate') : t('btn_suspend')}
              </Button>
            </div>
          </div>
        )}
      </BaseModal>

      {/* Delete Confirmation Modal */}
      <BaseModal
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        title="Delete Client Account?"
        icon={ShieldAlert}
        variant="danger"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-pm-secondary leading-relaxed">
            Are you sure you want to delete client account <strong>{deletingUser?.email}</strong>?
            Associated license keys will become unassigned.
          </p>
          <div className="flex justify-end gap-3 pt-3 border-t border-pm-border">
            <Button variant="neutral" size="md" onClick={() => setDeletingUser(null)}>
              {t('btn_cancel')}
            </Button>
            <Button variant="danger" size="md" onClick={handleDeleteUser} loading={loading}>
              {t('btn_delete')} Account
            </Button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
};

// @Arch[ClientListView]
import React, { useState, useMemo } from 'react';
import { Users, Search, Edit, Trash2, Key, Eye, EyeOff, ShieldAlert, CheckCircle, Building, Mail, ExternalLink, RefreshCw, UserPlus, Check, Sparkles, Copy, PlusCircle, Shield } from 'lucide-react';
import { License, UserAccount } from '../LicensesTab';
import { BaseModal } from '../common/BaseModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { RolePermissionsModal } from './RolePermissionsModal';
import { TableCellIdentity } from '../common/TableCellIdentity';
import { TableCellActions } from '../common/TableCellActions';
import { TableCellCompany } from '../common/TableCellCompany';
import { TableCellText } from '../common/TableCellText';
import { SectionHeader } from '../common/SectionHeader';
import { StatCard } from '../common/StatCard';
import { StatSummaryGrid } from '../common/StatSummaryGrid';
import { DirectoryToolbar } from '../common/DirectoryToolbar';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';
import { FormInput } from '../common/FormInput';
import { FormSelect } from '../common/FormSelect';
import { PaginationBar } from '../common/PaginationBar';
import { useTableDensity } from '../../hooks/useTableDensity';
import { useTranslation } from '../../i18n/LanguageContext';
import { getSortedTierOptions } from '../../utils/tierUtils';
import { AdminFetchAdapter, getApiUrl } from '../../utils/AdminFetchAdapter';
import { DomainPillGroup } from '../common/DomainPillGroup';
import { ClientCredentialsBanner } from './ClientCredentialsBanner';

interface ClientListViewProps {
  users: UserAccount[];
  licenses: License[];
  companies?: any[];
  tiers?: any[];
  onRefresh: () => void;
  showAlert: (msg: string, type?: 'success' | 'error') => void;
  onSelectClient: (user: UserAccount, tab?: 'profile' | 'licenses' | 'governance') => void;
  onInspectCompany?: (company: any) => void;
  isDemoMode?: boolean;
  onAddUser?: (user: Partial<UserAccount>) => UserAccount | null;
  onUpdateUser?: (id: number, data: Partial<UserAccount>) => void;
  onToggleUserStatus?: (id: number) => void;
  onDeleteUser?: (id: number) => void;
  onAddLicense?: (license: Partial<License>) => License | null;
}

export const ClientListView: React.FC<ClientListViewProps> = ({ users, licenses, companies = [], tiers = [], onRefresh, showAlert, onSelectClient, onInspectCompany, isDemoMode, onAddUser, onUpdateUser, onToggleUserStatus, onDeleteUser, onAddLicense }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const tierOptions = useMemo(() => getSortedTierOptions(tiers), [tiers]);




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

  // RBAC Matrix Modal State
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createEmail, setCreateEmailState] = useState(() => {
    try { return localStorage.getItem('pm_draft_client_email') || ''; } catch (e) { return ''; }
  });
  const [createPassword, setCreatePassword] = useState('');
  const [createCompany, setCreateCompanyState] = useState(() => localStorage.getItem('pm_draft_client_company') || '');
  const [createRole, setCreateRole] = useState('CompanyAdmin');
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

  const [density, setDensity] = useTableDensity('comfortable');

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
      formData.append('role', createRole || 'CompanyAdmin');
      formData.append('status', 'active');
      if (issueKeyImmediately) {
        formData.append('provision_license', '1');
        formData.append('package_tier', selectedIssueTier || 'Professional Tier');
      }

      const res = await AdminFetchAdapter.request('index.php?action=api_create_user', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.success) {
        setLastCreatedCreds({
          email: createEmail.trim(),
          pass: createPassword,
          key: data.license_key || undefined
        });

        clearDraftMemory();
        setShowCreateModal(false);

        showAlert(
          `🎉 Client account ${createEmail} created successfully! ${data.license_key ? '🔑 License Key issued!' : ''}`,
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

      const res = await AdminFetchAdapter.request('index.php?action=api_reset_user_password', { method: 'POST', body: formData });
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

      const res = await AdminFetchAdapter.request('index.php?action=api_delete_user', { method: 'POST', body: formData });
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

      const res = await AdminFetchAdapter.request('index.php?action=api_update_user', { method: 'POST', body: formData });
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
      formData.append('company_name', editCompany.trim());

      const res = await AdminFetchAdapter.request('index.php?action=api_update_user', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`Profile for ${editingUser.email} updated`, 'success');
        setEditingUser(null);
        onRefresh();
      } else {
        showAlert(data.error || 'Failed to update profile', 'error');
      }
    } catch (err: any) {
      showAlert('Failed to update profile: ' + err.message, 'error');
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
          <div className="flex gap-2">
            <Button
              variant="neutral"
              size="sm"
              icon={Shield}
              onClick={() => setShowRolesModal(true)}
            >
              RBAC Permissions Matrix
            </Button>
            <Button
              variant="neutral"
              size="sm"
              icon={RefreshCw}
              loading={isRefreshing}
              onClick={handleRefresh}
            >
              {t('btn_refresh')}
            </Button>
          </div>
        }
      />

      {/* 4 Stat Summary Cards Grid */}
      <StatSummaryGrid
        cards={[
          { label: t('stat_total_clients'), value: totalClients, icon: Users, color: 'purple' },
          { label: t('stat_active_accounts' as any) || 'Active Accounts', value: activeClients, icon: CheckCircle, color: 'emerald' },
          { label: t('stat_suspended_accounts' as any) || 'Suspended Accounts', value: suspendedClients, icon: ShieldAlert, color: 'rose' },
          { label: t('stat_bound_domains' as any) || 'Bound Store Domains', value: totalBoundDomains, icon: Building, color: 'blue' },
        ]}
      />

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
        density={density}
        onDensityChange={setDensity}
      />

      {/* Post-Creation Quick Credentials Banner */}
      <ClientCredentialsBanner
        lastCreatedCreds={lastCreatedCreds}
        showBannerPass={showBannerPass}
        copiedCreds={copiedCreds}
        onToggleShowPass={() => setShowBannerPass(!showBannerPass)}
        onCopyCreds={copyCreatedCredentials}
        onDismiss={() => setLastCreatedCreds(null)}
      />

      {/* Clients Directory Table */}
      <div className="bg-pm-card border border-pm-border rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse table-fixed">
            <colgroup>
              <col className="w-[38%]" />
              <col className="w-[22%]" />
              <col className="w-[22%]" />
              <col className="w-[18%]" />
            </colgroup>
            <thead>
              <tr className="bg-pm-input text-pm-secondary uppercase font-bold border-b border-pm-border text-[10px]">
                <th className="p-3">{t('th_client')}</th>
                <th className="p-3">Plan Tier & Status</th>
                <th className="p-3">Bound Store Domains</th>
                <th className="p-3 text-right">{t('th_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pm-border">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-pm-secondary italic">
                    {t('empty_clients')}
                  </td>
                </tr>
              ) : (
                paginatedUsers.map(user => {
                  const metrics = getUserLicenseMetrics(user.id);
                  const isSuspended = user.status === 'suspended';
                  const userLic = licenses.find(l => l.user_id === user.id);
                  const userTier = (userLic?.package_tier || 'basic').toUpperCase();

                  return (
                    <tr key={user.id} className={`${density === 'compact' ? 'min-h-[40px]' : 'min-h-[52px]'} align-middle hover:bg-pm-input/50 transition`}>
                      <td className={`${density === 'compact' ? 'py-1.5 px-3' : 'py-3 px-3'} align-middle`}>
                        <TableCellIdentity
                          icon={Mail}
                          title={user.name ? `${user.name} (${user.email})` : user.email}
                          onTitleClick={() => onSelectClient(user, 'profile')}
                          subtitle={
                            <span className="flex items-center gap-1.5 inline-flex whitespace-nowrap truncate max-w-full">
                              {user.company_name ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onInspectCompany) {
                                        const assignedComp = user.company_id 
                                          ? companies.find(c => c.id === user.company_id) 
                                          : companies.find(c => c.company_name?.toLowerCase() === user.company_name?.toLowerCase());
                                        onInspectCompany(assignedComp || { id: user.company_id, company_name: user.company_name });
                                      }
                                    }}
                                    className="font-semibold text-pm-secondary hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer flex items-center gap-1"
                                    title={`Inspect Company "${user.company_name}"`}
                                  >
                                    🏢 {user.company_name}
                                  </button>
                                  <span>•</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-pm-secondary/70 italic">👤 Individual Client</span>
                                  <span>•</span>
                                </>
                              )}
                              <span>ID #{user.id}</span>
                              {user.created_at && <span>• Joined {user.created_at.split(' ')[0]}</span>}
                            </span>
                          }
                        />
                      </td>

                      <td className={`${density === 'compact' ? 'py-1.5 px-3' : 'py-3 px-3'} align-middle whitespace-nowrap`}>
                        <div className="flex items-center gap-1.5">
                          <StatusBadge type="tier" label={userTier} />
                          <StatusBadge status={user.status} />
                        </div>
                      </td>

                      <td className={`${density === 'compact' ? 'py-1.5 px-3' : 'py-3 px-3'} align-middle whitespace-nowrap`}>
                        <DomainPillGroup storeUrl={metrics.boundDomains.join(', ')} />
                      </td>

                      <td className={`${density === 'compact' ? 'py-1.5 px-3' : 'py-3 px-3'} text-right align-middle`}>
                        <TableCellActions
                          onInspect={() => onSelectClient(user, 'profile')}
                          inspectLabel="Inspect"
                          isSuspended={isSuspended}
                          onToggleSuspend={() => setStatusUser(user)}
                          onDelete={() => setDeletingUser(user)}
                        />
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

          <FormSelect
            label="Assigned RBAC Role"
            value={createRole}
            onChange={e => setCreateRole(e.target.value)}
            options={[
              { value: 'SuperAdmin', label: 'Super Admin (Full Platform Control)' },
              { value: 'CompanyAdmin', label: 'Company Admin (Manage Company Users & Licenses)' },
              { value: 'CatalogManager', label: 'Catalog Manager (AST & Catalog Mutations)' },
              { value: 'Operator', label: 'Operator (Database & File Tools Only)' },
              { value: 'Observer', label: 'Observer (Read Only Access)' }
            ]}
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
                  options={tierOptions}
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

      {/* Password Change & Reset Modal */}
      <BaseModal
        isOpen={!!resetUser}
        onClose={() => setResetUser(null)}
        title={`Change Password: ${resetUser?.email || ''}`}
        icon={Key}
        maxWidth="md"
      >
        {resetUser && (
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
                    setConfirmResetPassword(pass);
                    setShowResetPassword(true);
                  }}
                >
                  ⚡ Generate
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

            <div className="flex justify-between items-center pt-3 border-t border-pm-border flex-wrap gap-2">
              <Button
                type="button"
                variant="neutral"
                size="md"
                onClick={async () => {
                  if (!resetUser?.id) return;
                  try {
                    const formData = new FormData();
                    formData.append('user_id', String(resetUser.id));
                    const res = await AdminFetchAdapter.request(getApiUrl('api_send_password_reset_link'), { method: 'POST', body: formData });
                    const data = await res.json();
                    if (data.success) {
                      showAlert(data.message || 'Password reset link sent to user.', 'success');
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
                  Change Password
                </Button>
              </div>
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
      <ConfirmModal
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirm={handleDeleteUser}
        title="Delete Client Account?"
        message={`Are you sure you want to delete client account "${deletingUser?.email || ''}"? Associated license keys will become unassigned.`}
        confirmText="Confirm Delete"
        variant="danger"
        loading={loading}
      />

      {/* RBAC Roles & Permissions Matrix Modal */}
      <RolePermissionsModal
        isOpen={showRolesModal}
        onClose={() => setShowRolesModal(false)}
      />
    </div>
  );
};

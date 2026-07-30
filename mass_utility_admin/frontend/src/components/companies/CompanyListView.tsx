// @Arch[CompanyListView]
import React, { useState, useMemo } from 'react';
import { Building2, PlusCircle, Search, Edit, Trash2, Users, Key, ShieldCheck, AlertTriangle, Eye, EyeOff, Copy, Check, RefreshCw, Pause, Play } from 'lucide-react';
import { SectionHeader } from '../common/SectionHeader';
import { StatCard } from '../common/StatCard';
import { StatSummaryGrid } from '../common/StatSummaryGrid';
import { BaseModal } from '../common/BaseModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { TableCellIdentity } from '../common/TableCellIdentity';
import { TableCellText } from '../common/TableCellText';
import { TableCellActions } from '../common/TableCellActions';
import { DirectoryToolbar } from '../common/DirectoryToolbar';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';
import { FormInput } from '../common/FormInput';
import { FormSelect } from '../common/FormSelect';
import { PaginationBar } from '../common/PaginationBar';
import { useTranslation } from '../../i18n/LanguageContext';

import { Company } from '../../types/adminApi';
import { AdminFetchAdapter } from '../../utils/AdminFetchAdapter';
export type { Company };



interface CompanyListViewProps {
  companies: Company[];
  users: any[];
  licenses: any[];
  onRefresh: () => void;
  showAlert?: (msg: string, type?: 'success' | 'error') => void;
  onSelectCompany: (company: Company, tab?: 'overview' | 'licenses' | 'members' | 'settings') => void;
  isDemoMode?: boolean;
  onAddCompany?: (company: Partial<Company>) => Company | null;
  onUpdateCompany?: (id: number, data: Partial<Company>) => void;
  onToggleCompanyStatus?: (id: number) => void;
  onDeleteCompany?: (id: number) => void;
}

export const CompanyListView: React.FC<CompanyListViewProps> = ({
  companies,
  users,
  licenses,
  onRefresh,
  showAlert,
  onSelectCompany,
  isDemoMode,
  onAddCompany,
  onUpdateCompany,
  onToggleCompanyStatus,
  onDeleteCompany,
}) => {
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
      if (showAlert) showAlert('🔄 Companies directory reloaded!', 'success');
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [suspendingCompany, setSuspendingCompany] = useState<Company | null>(null);

  const handleToggleSuspendCompany = async () => {
    if (!suspendingCompany) return;
    setSubmitting(true);
    const newStatus = suspendingCompany.status === 'suspended' ? 'active' : 'suspended';

    if (isDemoMode || onToggleCompanyStatus) {
      if (onToggleCompanyStatus) {
        onToggleCompanyStatus(suspendingCompany.id);
      }
      setSuspendingCompany(null);
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(getApiUrl('api_update_company'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: suspendingCompany.id, company_name: suspendingCompany.company_name, tax_id: suspendingCompany.tax_id, status: newStatus, max_licenses: suspendingCompany.max_licenses }),
      });
      const data = await res.json();
      if (data.success) {
        if (showAlert) showAlert(`Company profile "${suspendingCompany.company_name}" status updated to ${newStatus}!`, 'success');
        await onRefresh();
        setSuspendingCompany(null);
      } else {
        if (showAlert) showAlert(data.error || 'Failed to update company status', 'error');
      }
    } catch {
      if (showAlert) showAlert('Server communication error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Form States
  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [maxLicenses, setMaxLicenses] = useState(10);
  const [editStatus, setEditStatus] = useState('active');

  // 1-Click Owner Creation State
  const [createOwnerAccount, setCreateOwnerAccount] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [copiedVatId, setCopiedVatId] = useState<number | null>(null);

  // Filter Logic
  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const matchesSearch = c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (c.tax_id && c.tax_id.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [companies, searchTerm, statusFilter]);

  // Pagination calculation
  const totalItems = filteredCompanies.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedCompanies = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCompanies.slice(start, start + pageSize);
  }, [filteredCompanies, currentPage, pageSize]);

  const activeCount = companies.filter(c => c.status === 'active').length;
  const totalMembers = companies.reduce((acc, c) => acc + (c.user_count || 0), 0);
  const totalCompanyLicenses = companies.reduce((acc, c) => acc + (c.license_count || 0), 0);

  const getApiUrl = (action: string) => `${window.location.pathname}?action=${action}`;

  const copyVat = (vat: string, id: number) => {
    navigator.clipboard.writeText(vat);
    setCopiedVatId(id);
    setTimeout(() => setCopiedVatId(null), 2000);
    if (showAlert) showAlert('📋 Tax / VAT ID copied to clipboard!', 'success');
  };

  const generateOwnerPass = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
    let pass = '';
    for (let i = 0; i < 16; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    setOwnerPassword(pass);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('company_name', name.trim());
      formData.append('tax_id', taxId.trim());
      formData.append('max_licenses', String(maxLicenses));
      if (createOwnerAccount && ownerEmail.trim()) {
        formData.append('create_owner', '1');
        formData.append('owner_email', ownerEmail.trim());
        formData.append('owner_password', ownerPassword);
      }

      const res = await AdminFetchAdapter.request(getApiUrl('api_create_company'), { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        const ownerMsg = data.owner_created && data.owner_email ? ` 👤 Owner account '${data.owner_email}' provisioned!` : '';
        if (showAlert) showAlert(`🏢 Company '${name}' created successfully!${ownerMsg}`, 'success');
        setIsCreateOpen(false);
        setName('');
        setTaxId('');
        setMaxLicenses(10);
        setOwnerEmail('');
        setOwnerPassword('');
        setCreateOwnerAccount(false);
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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany || !name.trim()) return;
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('id', String(selectedCompany.id));
      formData.append('company_name', name.trim());
      formData.append('tax_id', taxId.trim());
      formData.append('max_licenses', String(maxLicenses));
      formData.append('status', editStatus);

      const res = await AdminFetchAdapter.request(getApiUrl('api_update_company'), { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        if (showAlert) showAlert(`🏢 Company '${name}' updated successfully!`, 'success');
        setIsEditOpen(false);
        setSelectedCompany(null);
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

  const handleDelete = async () => {
    if (!selectedCompany) return;
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('id', String(selectedCompany.id));

      const res = await AdminFetchAdapter.request(getApiUrl('api_delete_company'), { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        if (showAlert) showAlert(`🏢 Company '${selectedCompany.company_name}' deleted successfully!`, 'success');
        setIsDeleteOpen(false);
        setSelectedCompany(null);
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

  const openEditModal = (c: Company) => {
    setSelectedCompany(c);
    setName(c.company_name);
    setTaxId(c.tax_id || '');
    setMaxLicenses(c.max_licenses || 10);
    setEditStatus(c.status);
    setIsEditOpen(true);
  };

  const openDeleteModal = (c: Company) => {
    setSelectedCompany(c);
    setIsDeleteOpen(true);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t('companies_title')}
        subtitle={t('companies_subtitle')}
        icon={Building2}
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

      {/* 4 Stat Summary Cards Grid */}
      <StatSummaryGrid
        cards={[
          { label: t('stat_total_companies'), value: companies.length, icon: Building2, color: 'purple' },
          { label: t('stat_active_orgs'), value: activeCount, icon: ShieldCheck, color: 'emerald' },
          { label: t('stat_team_members'), value: totalMembers, icon: Users, color: 'blue' },
          { label: t('stat_managed_licenses'), value: totalCompanyLicenses, icon: Key, color: 'amber' },
        ]}
      />

      {/* Shared Directory Toolbar */}
      <DirectoryToolbar
        searchPlaceholder={t('ph_search_companies')}
        searchTerm={searchTerm}
        onSearchChange={(val) => {
          setSearchTerm(val);
          setCurrentPage(1);
        }}
        statusFilters={[
          { key: 'all', label: t('nav_companies'), count: companies.length },
          { key: 'active', label: t('btn_activate'), count: activeCount }
        ]}
        activeFilter={statusFilter}
        onFilterChange={(key) => {
          setStatusFilter(key as any);
          setCurrentPage(1);
        }}
        onClearFilters={handleClearFilters}
        primaryAction={{
          label: t('btn_add_company'),
          icon: PlusCircle,
          onClick: () => {
            setName('');
            setTaxId('');
            setMaxLicenses(10);
            setOwnerEmail('');
            setOwnerPassword('');
            setCreateOwnerAccount(false);
            setIsCreateOpen(true);
          }
        }}
      />

      {/* Companies Directory Table */}
      <div className="bg-pm-card border border-pm-border rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-pm-input text-pm-secondary uppercase font-bold border-b border-pm-border text-[10px]">
                <th className="p-3 w-[28%]">{t('th_company')}</th>
                <th className="p-3 w-[18%]">{t('th_vat')}</th>
                <th className="p-3 w-[15%]">{t('th_users')}</th>
                <th className="p-3 w-[17%]">{t('th_pool')}</th>
                <th className="p-3 w-[10%]">{t('th_status')}</th>
                <th className="p-3 text-right w-[12%] min-w-[220px]">{t('th_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pm-border">
              {paginatedCompanies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-pm-secondary italic">
                    {t('empty_companies')}
                  </td>
                </tr>
              ) : (
                paginatedCompanies.map(c => (
                  <tr key={c.id} className="h-[49px] align-middle hover:bg-pm-input/50 transition">
                    <td className="p-3 align-middle">
                      <TableCellIdentity
                        icon={Building2}
                        title={c.company_name}
                        onTitleClick={() => onSelectCompany(c, 'overview')}
                        subtitle={`ID #${c.id}${c.created_at ? ` • Joined ${c.created_at.split(' ')[0]}` : ''}`}
                      />
                    </td>
                    <td className="p-3 align-middle whitespace-nowrap">
                      <TableCellText
                        text={c.tax_id}
                        fallbackText={t('lbl_unspecified')}
                        rightAction={
                          c.tax_id ? (
                            <button
                              onClick={() => copyVat(c.tax_id!, c.id)}
                              className="p-1 rounded hover:bg-pm-input text-pm-secondary hover:text-pm-text transition"
                              title="Copy Tax / VAT ID"
                            >
                              {copiedVatId === c.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          ) : undefined
                        }
                      />
                    </td>
                    <td className="p-3 font-bold text-pm-text text-xs align-middle whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-purple-400" />
                        <span>{c.user_count || 0} {t('lbl_members')}</span>
                      </div>
                    </td>
                    <td className="p-3 font-mono font-semibold text-xs text-pm-text align-middle whitespace-nowrap">
                      <span className="text-purple-600 dark:text-purple-400 font-extrabold">{c.license_count || 0}</span> / {c.max_licenses} {t('lbl_allocated')}
                    </td>
                    <td className="p-3 align-middle whitespace-nowrap">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="p-3 text-right align-middle min-w-[220px]">
                      <TableCellActions
                        onInspect={() => onSelectCompany(c, 'overview')}
                        inspectLabel="Inspect"
                        isSuspended={c.status === 'suspended'}
                        onToggleSuspend={() => setSuspendingCompany(c)}
                        onDelete={() => openDeleteModal(c)}
                      />
                    </td>
                  </tr>
                ))
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

      {/* Create Company Modal */}
      <BaseModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Register New B2B Company"
        icon={Building2}
        maxWidth="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <FormInput
            label={t('field_company_name')}
            type="text"
            required
            placeholder={t('field_company_name_placeholder')}
            value={name}
            onChange={e => setName(e.target.value)}
          />

          <FormInput
            label={t('field_vat_id')}
            type="text"
            placeholder={t('field_vat_id_placeholder')}
            value={taxId}
            onChange={e => setTaxId(e.target.value)}
          />

          <FormInput
            label={t('field_max_licenses')}
            type="number"
            min={1}
            max={500}
            value={maxLicenses}
            onChange={e => setMaxLicenses(Number(e.target.value))}
          />

          <div className="pt-2 border-t border-pm-border">
            <label className="flex items-center gap-2 text-xs font-semibold text-pm-text cursor-pointer">
              <input
                type="checkbox"
                checked={createOwnerAccount}
                onChange={e => {
                  setCreateOwnerAccount(e.target.checked);
                  if (e.target.checked && !ownerPassword) generateOwnerPass();
                }}
                className="rounded border-pm-border text-purple-600 focus:ring-purple-500"
              />
              <span>{t('field_auto_owner')}</span>
            </label>
          </div>

          {createOwnerAccount && (
            <div className="space-y-3 p-3 bg-pm-input/50 rounded-xl border border-pm-border text-xs">
              <FormInput
                label={t('field_owner_email')}
                type="email"
                required={createOwnerAccount}
                placeholder={t('ph_owner_email')}
                value={ownerEmail}
                onChange={e => setOwnerEmail(e.target.value)}
              />

              <div>
                <label className="block text-[11px] font-bold uppercase text-pm-secondary mb-1">Generated Password</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showOwnerPassword ? 'text' : 'password'}
                      value={ownerPassword}
                      onChange={e => setOwnerPassword(e.target.value)}
                      className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-1.5 font-mono text-xs text-pm-text"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOwnerPassword(!showOwnerPassword)}
                      className="absolute right-2 top-2 text-pm-secondary hover:text-pm-text"
                    >
                      {showOwnerPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <Button type="button" variant="neutral" size="sm" onClick={generateOwnerPass}>
                    Regenerate
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-pm-border">
            <Button variant="neutral" size="md" onClick={() => setIsCreateOpen(false)}>
              {t('btn_cancel')}
            </Button>
            <Button variant="primary" size="md" type="submit" loading={submitting}>
              Create Company Profile
            </Button>
          </div>
        </form>
      </BaseModal>

      {/* Edit Company Modal */}
      <BaseModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Company #${selectedCompany?.id || ''}`}
        icon={Edit}
        maxWidth="md"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <FormInput
            label="Company Name"
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
          />

          <FormInput
            label="Tax / VAT ID"
            type="text"
            value={taxId}
            onChange={e => setTaxId(e.target.value)}
          />

          <FormInput
            label="Max License Pool"
            type="number"
            min={1}
            max={500}
            value={maxLicenses}
            onChange={e => setMaxLicenses(Number(e.target.value))}
          />

          <FormSelect
            label="Status"
            value={editStatus}
            onChange={e => setEditStatus(e.target.value)}
            options={[
              { value: 'active', label: 'ACTIVE' },
              { value: 'suspended', label: 'SUSPENDED' },
            ]}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-pm-border">
            <Button variant="neutral" size="md" onClick={() => setIsEditOpen(false)}>
              {t('btn_cancel')}
            </Button>
            <Button variant="primary" size="md" type="submit" loading={submitting}>
              {t('btn_save')}
            </Button>
          </div>
        </form>
      </BaseModal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Company Profile?"
        message={`Are you sure you want to delete company profile "${selectedCompany?.company_name || ''}"? Linked user accounts will be unassigned from this organization.`}
        confirmText="Confirm Delete"
        variant="danger"
        loading={submitting}
      />

      {/* Suspend / Activate Confirmation Modal */}
      <ConfirmModal
        isOpen={!!suspendingCompany}
        onClose={() => setSuspendingCompany(null)}
        onConfirm={handleToggleSuspendCompany}
        title={suspendingCompany?.status === 'suspended' ? 'Activate Company Profile?' : 'Suspend Company Profile?'}
        message={
          suspendingCompany?.status === 'suspended'
            ? `Are you sure you want to activate company profile "${suspendingCompany?.company_name || ''}"? License rights will be restored for company keys.`
            : `Are you sure you want to suspend company profile "${suspendingCompany?.company_name || ''}"? Associated client keys under this organization will inherit suspended status.`
        }
        confirmText={suspendingCompany?.status === 'suspended' ? 'Confirm Activate' : 'Confirm Suspend'}
        variant={suspendingCompany?.status === 'suspended' ? 'info' : 'warning'}
        loading={submitting}
      />
    </div>
  );
};

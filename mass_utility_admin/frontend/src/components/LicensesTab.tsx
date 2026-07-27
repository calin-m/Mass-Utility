import React, { useState, useMemo } from 'react';
import { Eye, EyeOff, Copy, Edit, ShieldAlert, CheckCircle, PlusCircle, Key, Trash2, Unlock, RefreshCw, Clock, User, LayoutGrid, List, Calendar, Building2 } from 'lucide-react';
import { BaseModal } from './common/BaseModal';
import { ConfirmModal } from './common/ConfirmModal';
import { TableCellIdentity } from './common/TableCellIdentity';
import { TableCellActions } from './common/TableCellActions';
import { TableCellCompany } from './common/TableCellCompany';
import { TableCellText } from './common/TableCellText';
import { StatCard } from './common/StatCard';
import { StatSummaryGrid } from './common/StatSummaryGrid';
import { DirectoryCardTable } from './common/DirectoryCardTable';
import { Button } from './common/Button';
import { FormInput } from './common/FormInput';
import { FormSelect } from './common/FormSelect';
import { PaginationBar } from './common/PaginationBar';
import { SectionHeader } from './common/SectionHeader';
import { DirectoryToolbar } from './common/DirectoryToolbar';
import { LicenseRowCard } from './common/LicenseRowCard';
import { IssueLicenseModal } from './common/IssueLicenseModal';
import { LicenseDetailsView } from './licenses/LicenseDetailsView';
import { StatusBadge } from './common/StatusBadge';
import { useTranslation } from '../i18n/LanguageContext';
import { getSortedTierOptions } from '../utils/tierUtils';
import { parseDomains } from '../utils/domainUtils';
import { DomainPillGroup } from './common/DomainPillGroup';

import { License, UserAccount } from '../types/adminApi';
export type { License, UserAccount };

interface LicensesTabProps {
  licenses: License[];
  users?: UserAccount[];
  companies?: any[];
  tiers?: any[];
  onRefresh: () => void;
  showAlert: (msg: string, type?: 'success' | 'error') => void;
  onInspectClient?: (client: UserAccount) => void;
  onInspectCompany?: (company: any, licenseKey?: string | null) => void;
}

export const LicensesTab: React.FC<LicensesTabProps> = ({
  licenses,
  users = [],
  companies = [],
  tiers = [],
  onRefresh,
  showAlert,
  onInspectClient,
  onInspectCompany,
}) => {
  const { t } = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);

  // Sub-View Inspection Navigation State ('list' vs 'details')
  const [activeSubView, setActiveSubView] = useState<'list' | 'details'>('list');
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [initialDetailTab, setInitialDetailTab] = useState<'overview' | 'edit'>('overview');

  const tierOptions = useMemo(() => getSortedTierOptions(tiers), [tiers]);

  const handleSelectLicense = (lic: License, initialTab: 'overview' | 'edit' = 'overview') => {
    setSelectedLicense(lic);
    setInitialDetailTab(initialTab);
    setActiveSubView('details');
  };

  const handleBackToList = () => {
    setActiveSubView('list');
    setSelectedLicense(null);
  };

  // Keep selectedLicense synchronized with refreshed licenses array
  const currentLicense = selectedLicense
    ? licenses.find((l) => l.id === selectedLicense.id) || selectedLicense
    : null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      showAlert('🔄 License registry reloaded!', 'success');
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Visibility & Masking State
  const [visibleKeys, setVisibleKeys] = useState<Record<number, boolean>>({});

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Extend Modal State
  const [extendingLic, setExtendingLic] = useState<License | null>(null);
  const [extendMonths, setExtendMonths] = useState<number>(12);
  const [extendCustomDate, setExtendCustomDate] = useState<string>('');
  const [extendSubmitting, setExtendSubmitting] = useState(false);

  // Reassign Client Modal State
  const [reassignLic, setReassignLic] = useState<License | null>(null);
  const [reassignUserId, setReassignUserId] = useState<number>(0);
  const [reassignSubmitting, setReassignSubmitting] = useState(false);

  // Suspend / Activate Safety Confirm Modal State
  const [confirmLic, setConfirmLic] = useState<License | null>(null);
  const [confirmActionType, setConfirmActionType] = useState<'suspend' | 'activate'>('suspend');
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);

  // Delete Confirm Modal State
  const [deletingLic, setDeletingLic] = useState<License | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);



  const toggleKeyMask = (id: number) => {
    setVisibleKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showAlert('📋 License key copied to clipboard!', 'success');
  };

  const handleGenerateKeyFromModal = async (userId: number, tier: string, expires: string, storeUrl: string) => {
    const formData = new FormData();
    if (userId > 0) formData.append('user_id', String(userId));
    formData.append('package_tier', tier);
    formData.append('expires_at', expires);
    formData.append('store_url', storeUrl.trim());

    const res = await fetch('?action=api_generate', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) {
      showAlert(`🔑 License key generated successfully: ${data.license_key}`, 'success');
      onRefresh();
    } else {
      showAlert(data.error || 'Failed to generate license key', 'error');
      throw new Error(data.error || 'Failed to generate license key');
    }
  };

  const promptConfirmStatus = (lic: License, targetAction: 'suspend' | 'activate') => {
    setConfirmLic(lic);
    setConfirmActionType(targetAction);
  };

  const handleExecuteStatusToggle = async () => {
    if (!confirmLic) return;
    setConfirmSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('id', String(confirmLic.id));
      formData.append('status', confirmActionType === 'suspend' ? 'suspended' : 'active');

      const res = await fetch('index.php?action=api_update', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`License status marked as ${confirmActionType.toUpperCase()}`, 'success');
        setConfirmLic(null);
        onRefresh();
      } else {
        showAlert(data.error || 'Failed to update license status', 'error');
      }
    } catch (err: any) {
      showAlert('Error updating status: ' + err.message, 'error');
    } finally {
      setConfirmSubmitting(false);
    }
  };

  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendingLic) return;
    setExtendSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('id', String(extendingLic.id));
      if (extendCustomDate) {
        formData.append('custom_date', extendCustomDate);
      } else {
        formData.append('months', String(extendMonths));
      }

      const res = await fetch('?action=api_extend_license', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`License expiration extended successfully!`, 'success');
        setExtendingLic(null);
        setExtendCustomDate('');
        onRefresh();
      } else {
        showAlert(data.error || 'Failed to extend license', 'error');
      }
    } catch (err: any) {
      showAlert('Error extending license: ' + err.message, 'error');
    } finally {
      setExtendSubmitting(false);
    }
  };

  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignLic) return;
    setReassignSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('id', String(reassignLic.id));
      formData.append('user_id', String(reassignUserId));

      const res = await fetch('?action=api_assign_license', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`License reassigned successfully!`, 'success');
        setReassignLic(null);
        onRefresh();
      } else {
        showAlert(data.error || 'Failed to reassign license', 'error');
      }
    } catch (err: any) {
      showAlert('Error reassigning license: ' + err.message, 'error');
    } finally {
      setReassignSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deletingLic) return;
    setDeleteSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('id', String(deletingLic.id));

      const res = await fetch('?action=api_delete_license', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`License key deleted successfully!`, 'success');
        setDeletingLic(null);
        onRefresh();
      } else {
        showAlert(data.error || 'Failed to delete license', 'error');
      }
    } catch (err: any) {
      showAlert('Error deleting license: ' + err.message, 'error');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const expiringSoonCount = licenses.filter((l) => {
    if (!l.expires_at) return false;
    const diffDays = Math.ceil((new Date(l.expires_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    return diffDays > 0 && diffDays <= 30;
  }).length;

  const activeCount = licenses.filter((l) => l.status === 'active').length;
  const expiredCount = licenses.filter((l) => {
    if (!l.expires_at) return false;
    return new Date(l.expires_at).getTime() < new Date().getTime();
  }).length;

  const filteredLicenses = useMemo(() => {
    return licenses.filter((lic) => {
      // 1. Status Filter
      if (filterMode === 'ACTIVE' && lic.status !== 'active') return false;
      if (filterMode === 'EXPIRING') {
        if (!lic.expires_at) return false;
        const diffDays = Math.ceil((new Date(lic.expires_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        if (diffDays <= 0 || diffDays > 30) return false;
      }
      if (filterMode === 'EXPIRED') {
        if (!lic.expires_at) return false;
        if (new Date(lic.expires_at).getTime() >= new Date().getTime()) return false;
      }

      // 2. Live Text Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchKey = lic.license_key.toLowerCase().includes(q);
        const matchUser = (lic.user_name || '').toLowerCase().includes(q);
        const matchCompany = (lic.company_name || '').toLowerCase().includes(q);
        const matchStore = (lic.store_url || '').toLowerCase().includes(q);
        if (!matchKey && !matchUser && !matchCompany && !matchStore) return false;
      }

      return true;
    });
  }, [licenses, filterMode, searchQuery]);

  // Pagination calculations
  const totalItems = filteredLicenses.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedLicenses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLicenses.slice(start, start + pageSize);
  }, [filteredLicenses, currentPage, pageSize]);

  const statusFilters = [
    { key: 'ALL', label: 'All Keys', count: licenses.length },
    { key: 'ACTIVE', label: '🟢 Active', count: activeCount },
    { key: 'EXPIRING', label: '🟠 Expiring Soon', count: expiringSoonCount },
    { key: 'EXPIRED', label: '🔴 Expired', count: expiredCount },
  ];

  return (
    <>
      {activeSubView === 'details' && currentLicense ? (
        <LicenseDetailsView
          license={currentLicense}
          users={users}
          companies={companies}
          tiers={tiers}
          onBack={handleBackToList}
          onRefresh={onRefresh}
          showAlert={showAlert}
          onInspectClient={onInspectClient}
          onInspectCompany={onInspectCompany}
          initialTab={initialDetailTab}
        />
      ) : (
        <div className="space-y-6">
      {/* Unified Section Header (Matches Companies & Clients 1:1) */}
      <SectionHeader
        title={t('licenses_title') || 'License Registry Directory'}
        subtitle={t('licenses_subtitle') || 'Issue, inspect, extend, whitelist domain URLs, and govern active software license keys across client accounts.'}
        icon={Key}
        action={
          <Button
            variant="neutral"
            size="sm"
            icon={RefreshCw}
            loading={isRefreshing}
            onClick={handleRefresh}
          >
            {t('btn_refresh') || 'Refresh'}
          </Button>
        }
      />

      {/* 4 Stat Summary Cards Grid */}
      <StatSummaryGrid
        cards={[
          { label: t('stat_total_keys'), value: licenses.length, icon: Key, color: 'purple' },
          { label: t('stat_active_keys'), value: activeCount, icon: CheckCircle, color: 'emerald' },
          { label: t('stat_expiring_soon'), value: expiringSoonCount, icon: Clock, color: 'amber' },
          { label: t('stat_unassigned_keys'), value: licenses.filter((l) => !l.user_id).length, icon: Unlock, color: 'blue' },
        ]}
      />

      {/* Unified Directory Toolbar (Search, Filters, View Mode Switcher, Primary Action) */}
      <DirectoryToolbar
        searchPlaceholder="Search license keys (KEY-XXXX), clients, companies, store URLs..."
        searchTerm={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        statusFilters={statusFilters}
        activeFilter={filterMode}
        onFilterChange={(mode) => {
          setFilterMode(mode);
          setCurrentPage(1);
        }}
        onClearFilters={
          searchQuery || filterMode !== 'ALL'
            ? () => {
                setSearchQuery('');
                setFilterMode('ALL');
                setCurrentPage(1);
              }
            : undefined
        }
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        primaryAction={{
          label: 'Issue New Key',
          icon: PlusCircle,
          onClick: () => setIsIssueModalOpen(true),
        }}
      />

      {/* Content Rendering: Grid View vs Table View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginatedLicenses.map((lic) => (
            <LicenseRowCard
              key={lic.id}
              license={lic}
              users={users}
              companies={companies}
              onInspectLicense={(l) => handleSelectLicense(l, 'overview')}
              onDeleteLicense={() => setDeletingLic(lic)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-pm-card border border-pm-border rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-pm-input text-pm-secondary uppercase font-bold border-b border-pm-border text-[10px]">
                  <th className="p-3 w-[22%]">{t('th_license_key')}</th>
                  <th className="p-3 w-[16%]">{t('th_assigned_user')}</th>
                  <th className="p-3 w-[16%]">Company Profile</th>
                  <th className="p-3 w-[9%]">{t('th_tier')}</th>
                  <th className="p-3 w-[9%]">{t('th_status')}</th>
                  <th className="p-3 w-[12%]">{t('th_store_url') || 'Store URL'}</th>
                  <th className="p-3 w-[8%]">{t('th_expires')}</th>
                  <th className="p-3 text-right w-[8%] min-w-[220px]">{t('th_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pm-border">
                {paginatedLicenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-pm-secondary italic">
                      No license keys found matching the current search & filter query.
                    </td>
                  </tr>
                ) : (
                  paginatedLicenses.map((lic) => {
                    const isVisible = visibleKeys[lic.id];
                    const isSuspended = lic.status === 'suspended';

                    const assignedUser = lic.user_id ? users.find((u) => u.id === lic.user_id) : null;
                    const companyName = lic.company_name || (assignedUser ? assignedUser.company_name : null);
                    const assignedComp = companyName
                      ? companies.find((c) => (c.company_name || '').toLowerCase() === companyName.toLowerCase())
                      : null;

                    return (
                      <tr key={lic.id} className="h-[49px] align-middle hover:bg-pm-input/50 transition">
                        <td className="p-3 align-middle">
                          <TableCellIdentity
                            icon={Key}
                            title={isVisible ? lic.license_key : '••••-••••-••••-••••'}
                            onTitleClick={() => handleSelectLicense(lic)}
                            subtitle={`ID #${lic.id}${lic.created_at ? ` • Created ${lic.created_at.split(' ')[0]}` : ''}`}
                            rightContent={
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => toggleKeyMask(lic.id)}
                                  className="p-1 rounded hover:bg-pm-input text-pm-secondary hover:text-pm-text transition"
                                  title={isVisible ? 'Mask Key' : 'Show Key'}
                                >
                                  {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(lic.license_key)}
                                  className="p-1 rounded hover:bg-pm-input text-pm-secondary hover:text-pm-text transition"
                                  title="Copy Key"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            }
                          />
                        </td>
                        <td className="p-3 align-middle whitespace-nowrap">
                          {lic.user_id ? (
                            <button
                              type="button"
                              onClick={() => {
                                const targetUser = users.find((u) => u.id === lic.user_id);
                                if (targetUser && onInspectClient) onInspectClient(targetUser);
                              }}
                              className="font-bold text-pm-text hover:text-purple-400 transition text-left"
                            >
                              {lic.user_name || lic.user_email || `User #${lic.user_id}`}
                            </button>
                          ) : (
                            <span className="text-pm-secondary italic">{t('lbl_unassigned') || 'Unassigned'}</span>
                          )}
                        </td>
                        <td className="p-3 align-middle whitespace-nowrap">
                          <TableCellCompany
                            companyName={companyName}
                            onClick={onInspectCompany && assignedComp ? () => onInspectCompany(assignedComp) : undefined}
                            fallbackText={t('lbl_standalone') || 'Standalone'}
                          />
                        </td>
                        <td className="p-3 align-middle whitespace-nowrap">
                          <StatusBadge type="tier" label={(lic.package_tier || 'basic').toUpperCase()} />
                        </td>
                        <td className="p-3 align-middle whitespace-nowrap">
                          <StatusBadge status={lic.status} />
                        </td>
                        <td className="p-3 align-middle whitespace-nowrap">
                          <DomainPillGroup storeUrl={lic.store_url} />
                        </td>
                        <td className="p-3 align-middle whitespace-nowrap">
                          <TableCellText
                            text={lic.expires_at ? new Date(lic.expires_at).toLocaleDateString() : 'Lifetime'}
                          />
                        </td>
                        <td className="p-3 text-right align-middle min-w-[220px]">
                          <TableCellActions
                            onInspect={() => handleSelectLicense(lic, 'overview')}
                            onEdit={() => handleSelectLicense(lic, 'edit')}
                            inspectLabel="Inspect"
                            editLabel="Edit"
                            isSuspended={isSuspended}
                            onToggleSuspend={() => promptConfirmStatus(lic, isSuspended ? 'activate' : 'suspend')}
                            onDelete={() => setDeletingLic(lic)}
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
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </div>
      )}
        </div>
      )}

      {/* Issue License Key Modal */}
      <IssueLicenseModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        users={users}
        tierOptions={tierOptions}
        onGenerate={handleGenerateKeyFromModal}
      />



      {/* Extend Expiry Modal */}
      {extendingLic && (
        <BaseModal
          isOpen={!!extendingLic}
          onClose={() => setExtendingLic(null)}
          title="Extend License Expiration"
          icon={Clock}
          maxWidth="md"
        >
          <form onSubmit={handleExtendSubmit} className="space-y-4">
            <FormSelect
              label="Extend Validity Duration"
              icon={Calendar}
              value={extendMonths}
              onChange={(e) => setExtendMonths(Number(e.target.value))}
              options={[
                { value: '1', label: '+ 1 Month' },
                { value: '3', label: '+ 3 Months' },
                { value: '6', label: '+ 6 Months' },
                { value: '12', label: '+ 12 Months (1 Year)' },
                { value: '24', label: '+ 24 Months (2 Years)' },
              ]}
            />
            <div className="text-center text-xs text-pm-secondary font-bold uppercase">-- OR --</div>
            <FormInput
              label="Custom Target Expiration Date"
              icon={Calendar}
              type="date"
              value={extendCustomDate}
              onChange={(e) => setExtendCustomDate(e.target.value)}
            />
            <div className="flex justify-end gap-3 pt-3 border-t border-pm-border">
              <Button type="button" variant="neutral" size="md" onClick={() => setExtendingLic(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" loading={extendSubmitting}>
                Save Extension
              </Button>
            </div>
          </form>
        </BaseModal>
      )}

      {/* Reassign Client Modal */}
      {reassignLic && (
        <BaseModal
          isOpen={!!reassignLic}
          onClose={() => setReassignLic(null)}
          title="Reassign License Key to Client"
          icon={User}
          maxWidth="md"
        >
          <form onSubmit={handleReassignSubmit} className="space-y-4">
            <FormSelect
              label="Select New Client Owner"
              icon={User}
              value={reassignUserId}
              onChange={(e) => setReassignUserId(Number(e.target.value))}
              options={[
                { value: '0', label: '-- Unassign (Standalone Key) --' },
                ...users.map((u) => ({
                  value: String(u.id),
                  label: `${u.name || u.email} (${u.email})`,
                })),
              ]}
            />
            <div className="flex justify-end gap-3 pt-3 border-t border-pm-border">
              <Button type="button" variant="neutral" size="md" onClick={() => setReassignLic(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" loading={reassignSubmitting}>
                Confirm Reassignment
              </Button>
            </div>
          </form>
        </BaseModal>
      )}

      {/* Safety Confirm Modal (Suspend / Activate) */}
      {confirmLic && (
        <ConfirmModal
          isOpen={!!confirmLic}
          onClose={() => setConfirmLic(null)}
          onConfirm={handleExecuteStatusToggle}
          title={confirmActionType === 'suspend' ? 'Suspend License Key' : 'Activate License Key'}
          message={`Are you sure you want to mark license key "${confirmLic.license_key}" as ${confirmActionType.toUpperCase()}?`}
          confirmText={confirmActionType === 'suspend' ? 'Suspend Key' : 'Activate Key'}
          variant={confirmActionType === 'suspend' ? 'danger' : 'info'}
          loading={confirmSubmitting}
        />
      )}

      {/* Delete License Confirm Modal */}
      {deletingLic && (
        <ConfirmModal
          isOpen={!!deletingLic}
          onClose={() => setDeletingLic(null)}
          onConfirm={handleDeleteSubmit}
          title="Delete License Key Permanently"
          message={`WARNING: This will permanently delete license key "${deletingLic.license_key}". This action cannot be undone.`}
          confirmText="Delete Permanently"
          variant="danger"
          loading={deleteSubmitting}
        />
      )}
    </>
  );
};

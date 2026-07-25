import React, { useState } from 'react';
import { Building2, PlusCircle, Search, Edit, Trash2, Users, Key, ShieldCheck, AlertTriangle, Eye, EyeOff, Copy, Check, RefreshCw } from 'lucide-react';
import { SectionHeader } from '../common/SectionHeader';
import { StatCard } from '../common/StatCard';
import { BaseModal } from '../common/BaseModal';
import { DirectoryToolbar } from '../common/DirectoryToolbar';
import { DirectoryCardTable } from '../common/DirectoryCardTable';
import { StatusBadge } from '../common/StatusBadge';

export interface Company {
  id: number;
  company_name: string;
  tax_id?: string;
  max_licenses: number;
  status: string;
  user_count?: number;
  license_count?: number;
  created_at: string;
  updated_at?: string;
}

interface CompanyListViewProps {
  companies: Company[];
  users: any[];
  licenses: any[];
  onRefresh: () => void;
  showAlert?: (msg: string, type?: 'success' | 'error') => void;
  onSelectCompany: (company: Company, tab?: 'overview' | 'edit') => void;
}

export const CompanyListView: React.FC<CompanyListViewProps> = ({ companies, users, licenses, onRefresh, showAlert, onSelectCompany }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

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
  const filteredCompanies = companies.filter(c => {
    const matchesSearch = c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (c.tax_id && c.tax_id.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('company_name', name.trim());
      formData.append('tax_id', taxId.trim());
      formData.append('max_licenses', String(maxLicenses));

      const res = await fetch(getApiUrl('api_create_company'), { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        let ownerMsg = '';
        if (createOwnerAccount && ownerEmail.trim() && ownerPassword.trim()) {
          try {
            const userForm = new FormData();
            userForm.append('email', ownerEmail.trim());
            userForm.append('password', ownerPassword.trim());
            userForm.append('company', name.trim());
            userForm.append('company_name', name.trim());
            await fetch(getApiUrl('api_create_user'), { method: 'POST', body: userForm });
            ownerMsg = ' & Primary Owner Account created!';
          } catch (e) {}
        }

        if (showAlert) showAlert(`🏢 Company profile${ownerMsg} created successfully!`, 'success');
        setName('');
        setTaxId('');
        setMaxLicenses(10);
        setOwnerEmail('');
        setOwnerPassword('');
        setCreateOwnerAccount(false);
        setIsCreateOpen(false);
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

  const handleEdit = async (e: React.FormEvent) => {
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

      const res = await fetch(getApiUrl('api_update_company'), { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        if (showAlert) showAlert('🏢 Company profile updated successfully!', 'success');
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

      const res = await fetch(getApiUrl('api_delete_company'), { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        if (showAlert) showAlert('🗑️ Company profile deleted and unlinked!', 'success');
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
    <div className="space-y-6 animate-in fade-in duration-300">
      <SectionHeader
        title="B2B Company Directory"
        subtitle="Manage B2B organizations, multi-user team access, and shared store license pools across tenant clients."
        icon={Building2}
        action={
          <button
            type="button"
            onClick={onRefresh}
            className="pm-btn-neutral px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            title="Refresh Companies Directory"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        }
      />

      {/* Horizontal Overview Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Companies" value={companies.length} icon={Building2} color="purple" />
        <StatCard label="Active Organizations" value={activeCount} icon={ShieldCheck} color="emerald" />
        <StatCard label="Linked Team Members" value={totalMembers} icon={Users} color="blue" />
        <StatCard label="Managed Licenses" value={totalCompanyLicenses} icon={Key} color="amber" />
      </div>

      {/* Shared Directory Toolbar */}
      <DirectoryToolbar
        searchPlaceholder="Search by company name or VAT ID..."
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilters={[
          { key: 'all', label: 'All Companies', count: companies.length },
          { key: 'active', label: 'Active', count: activeCount }
        ]}
        activeFilter={statusFilter}
        onFilterChange={(key) => setStatusFilter(key as any)}
        primaryAction={{
          label: 'Add Company Profile',
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
      <DirectoryCardTable
        emptyState={{
          isMessageVisible: filteredCompanies.length === 0,
          message: 'No company profiles match your search criteria.'
        }}
      >
        <table className="w-full text-left text-xs">
          <thead className="bg-pm-input text-pm-secondary uppercase font-bold border-b border-pm-border">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Company Name</th>
              <th className="p-3">Tax / VAT ID</th>
              <th className="p-3">Team Members</th>
              <th className="p-3">License Utilization</th>
              <th className="p-3">Status</th>
              <th className="p-3">Created At</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pm-border">
            {filteredCompanies.map(c => {
              const companyMembers = users.filter(u => u.company_name && u.company_name.trim().toLowerCase() === c.company_name.trim().toLowerCase());
              const companyLicenses = licenses.filter(l => l.user_email && companyMembers.some(m => m.email.toLowerCase() === l.user_email.toLowerCase()));
              const usedCount = companyLicenses.length > 0 ? companyLicenses.length : (c.license_count || 0);
              const memberCount = companyMembers.length > 0 ? companyMembers.length : (c.user_count || 0);
              const maxCount = c.max_licenses || 10;
              const pct = Math.min(100, Math.round((usedCount / maxCount) * 100));
              const isFull = usedCount >= maxCount;

              return (
                <tr key={c.id} className="hover:bg-pm-input/50 transition">
                  <td className="p-3 font-mono font-semibold text-pm-secondary">#{c.id}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-purple-400 shrink-0" />
                      <span className="font-bold text-pm-text">{c.company_name}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    {c.tax_id ? (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-pm-input border border-pm-border font-mono text-[11px] text-pm-text">
                        <span>{c.tax_id}</span>
                        <button
                          type="button"
                          onClick={() => copyVat(c.tax_id!, c.id)}
                          className="text-pm-secondary hover:text-pm-primary transition"
                          title="Copy Tax / VAT ID"
                        >
                          {copiedVatId === c.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    ) : (
                      <span className="italic text-pm-secondary/60">Not specified</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20">
                      <Users className="w-3.5 h-3.5" /> {memberCount} Members
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="w-36 space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className={isFull ? 'text-rose-400' : 'text-pm-text'}>
                          {usedCount} / {maxCount} Keys
                        </span>
                        <span className="text-pm-secondary">{pct}%</span>
                      </div>
                      <div className="w-full bg-pm-input rounded-full h-1.5 overflow-hidden border border-pm-border">
                        <div
                          className={`h-full transition-all duration-300 ${
                            pct >= 100 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-500' : 'bg-gradient-to-r from-purple-500 to-emerald-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <StatusBadge status={c.status} />
                  </td>
                      <td className="p-3 text-pm-secondary">{new Date(c.created_at).toLocaleDateString()}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectCompany(c, 'overview')}
                            className="pm-btn-neutral px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition"
                            title="Inspect Company 360° Details View"
                          >
                            <Eye className="w-3.5 h-3.5 text-purple-400" /> View
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectCompany(c, 'edit')}
                            className="pm-btn-neutral px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition"
                            title="Edit Company Profile Details"
                          >
                            <Edit className="w-3.5 h-3.5 text-indigo-400" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(c)}
                            className="pm-btn-danger-outline p-1.5 rounded text-xs font-semibold flex items-center gap-1 transition"
                            title="Delete Company"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
      </DirectoryCardTable>

      {/* Create Modal */}
      <BaseModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add New Company Profile">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Company Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Acme Commerce Inc."
              className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Tax / VAT Registration ID (Optional)</label>
            <input
              type="text"
              value={taxId}
              onChange={e => setTaxId(e.target.value)}
              placeholder="e.g. US987654321 or DE123456789"
              className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Max Allowed Store Licenses</label>
            <input
              type="number"
              min={1}
              max={100}
              value={maxLicenses}
              onChange={e => setMaxLicenses(parseInt(e.target.value) || 10)}
              className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
            />
          </div>

          {/* 1-Click Owner Account Provisioning Toggle */}
          <div className="pt-2 border-t border-pm-border">
            <label className="flex items-center gap-2 text-xs font-bold text-pm-text cursor-pointer select-none">
              <input
                type="checkbox"
                checked={createOwnerAccount}
                onChange={e => setCreateOwnerAccount(e.target.checked)}
                className="rounded border-pm-border bg-pm-input text-pm-primary focus:ring-pm-primary"
              />
              <span>Create Primary Owner Account Simultaneously</span>
            </label>

            {createOwnerAccount && (
              <div className="mt-3 p-3 bg-pm-input/60 border border-pm-border rounded-xl space-y-3 animate-in fade-in duration-200">
                <div>
                  <label className="block text-[11px] font-semibold text-pm-secondary mb-1">Owner Email Address</label>
                  <input
                    type="email"
                    required={createOwnerAccount}
                    value={ownerEmail}
                    onChange={e => setOwnerEmail(e.target.value)}
                    placeholder="owner@acme.com"
                    className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-1.5 text-xs text-pm-text focus:border-pm-primary focus:outline-none"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[11px] font-semibold text-pm-secondary">Owner Password</label>
                    <button type="button" onClick={generateOwnerPass} className="text-[10px] text-pm-primary hover:underline">
                      Generate Strong Pass
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showOwnerPassword ? "text" : "password"}
                      required={createOwnerAccount}
                      value={ownerPassword}
                      onChange={e => setOwnerPassword(e.target.value)}
                      placeholder="Set strong password..."
                      className="w-full bg-pm-input border border-pm-border rounded-lg pl-3 pr-9 py-1.5 text-xs font-mono text-pm-text focus:border-pm-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOwnerPassword(!showOwnerPassword)}
                      className="absolute right-2.5 top-2 text-pm-secondary hover:text-pm-text transition"
                      title={showOwnerPassword ? "Hide Password" : "Show Password"}
                    >
                      {showOwnerPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-pm-border">
            <button type="button" onClick={() => setIsCreateOpen(false)} className="pm-btn-neutral px-4 py-2 rounded-lg text-xs font-bold">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="pm-btn-primary px-4 py-2 rounded-lg text-xs font-bold min-w-[140px] flex justify-center items-center">
              {submitting ? 'Creating...' : 'Create Profile'}
            </button>
          </div>
        </form>
      </BaseModal>

      {/* Edit Modal */}
      <BaseModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Company Profile">
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Company Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Tax / VAT Registration ID</label>
            <input
              type="text"
              value={taxId}
              onChange={e => setTaxId(e.target.value)}
              className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Max Allowed Store Licenses</label>
            <input
              type="number"
              min={1}
              max={100}
              value={maxLicenses}
              onChange={e => setMaxLicenses(parseInt(e.target.value) || 10)}
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
                Deleting company profile <strong>"{selectedCompany?.company_name}"</strong> will unlink all associated team member client accounts and store licenses.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-pm-border">
            <button type="button" onClick={() => setIsDeleteOpen(false)} className="pm-btn-neutral px-4 py-2 rounded-lg text-xs font-bold">
              Cancel
            </button>
            <button type="button" onClick={handleDelete} disabled={submitting} className="pm-btn-danger px-4 py-2 rounded-lg text-xs font-bold min-w-[140px] flex justify-center items-center">
              {submitting ? 'Deleting...' : 'Confirm Delete'}
            </button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
};

// @Arch[RolesTab]
import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Plus, Save, Trash2, Loader2, Building2, Layers, RefreshCw, Copy, Search, ExternalLink, Check, Lock, AlertTriangle, Eye, RotateCcw } from 'lucide-react';
import { SectionHeader } from './common/SectionHeader';
import { StatusBadge } from './common/StatusBadge';
import { Button } from './common/Button';
import { SubTabNav, SubTabItem } from './common/SubTabNav';
import { RbacRole, RbacPermission, Company, UserAccount, License } from '../types/adminApi';

interface RolesTabProps {
  companies: Company[];
  users?: UserAccount[];
  licenses?: License[];
  tiers?: any[];
  showAlert?: (msg: string, type?: 'success' | 'error') => void;
  onFilterUserByRole?: (roleSlug: string) => void;
}

const DEFAULT_PERMISSIONS: RbacPermission[] = [
  { slug: 'ast.query', name: 'AST Query', description: 'Inspect product catalogs & AST schema' },
  { slug: 'ast.mutate', name: 'AST Mutate', description: 'Execute live database & catalog mutations' },
  { slug: 'db.backup', name: 'DB Backup', description: 'Create and download database backups' },
  { slug: 'db.restore', name: 'DB Restore', description: 'Restore database snapshot backups' },
  { slug: 'db.drop', name: 'DB Drop', description: 'Delete database backup files' },
  { slug: 'files.backup', name: 'Files Backup', description: 'Archive file system directories' },
  { slug: 'files.delete', name: 'Files Delete', description: 'Delete file backup archives' },
  { slug: 'settings.update', name: 'Settings', description: 'Modify system governor configuration' },
  { slug: 'users.manage', name: 'Users Manage', description: 'Create and assign client user roles' }
];

export const RolesTab: React.FC<RolesTabProps> = ({ companies, users = [], licenses = [], tiers = [], showAlert, onFilterUserByRole }) => {
  const [activeSubTab, setActiveSubTab] = useState<'global' | 'company' | 'definitions' | 'simulator'>('global');
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [permissions, setPermissions] = useState<RbacPermission[]>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Searchable Company Selection
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(companies[0]?.id || 0);
  const [companyOverrides, setCompanyOverrides] = useState<Record<string, string[]>>({});
  const [companyLoading, setCompanyLoading] = useState(false);

  // Role Creation / Cloning Form State
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleSlug, setNewRoleSlug] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [clonedPermissions, setClonedPermissions] = useState<string[]>(['ast.query']);

  // Deletion Guard Modal State
  const [deletingRole, setDeletingRole] = useState<RbacRole | null>(null);
  const [reassignRole, setReassignRole] = useState<string>('Observer');

  // Capability Simulator State
  const [simUserEmail, setSimUserEmail] = useState<string>(users[0]?.email || '');
  const [simTierSlug, setSimTierSlug] = useState<string>('pro');

  const filteredCompanies = useMemo(() => {
    if (!companySearchQuery.trim()) return companies;
    const q = companySearchQuery.toLowerCase();
    return companies.filter(c => 
      (c.company_name && c.company_name.toLowerCase().includes(q)) ||
      String(c.id).includes(q)
    );
  }, [companies, companySearchQuery]);

  const roleUserCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(u => {
      const r = u.role || 'Observer';
      counts[r] = (counts[r] || 0) + 1;
    });
    return counts;
  }, [users]);

  const fetchGlobalRoles = async () => {
    setLoading(true);
    try {
      const res = await fetch('index.php?action=api_roles');
      const data = await res.json();
      if (data && data.success) {
        if (data.roles && Array.isArray(data.roles)) setRoles(data.roles);
        if (data.permissions && Array.isArray(data.permissions) && data.permissions.length > 0) {
          setPermissions(data.permissions);
        }
      }
    } catch (e) {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyOverrides = async (compId: number) => {
    if (compId <= 0) return;
    setCompanyLoading(true);
    try {
      const res = await fetch(`index.php?action=api_company_roles&company_id=${compId}`);
      const data = await res.json();
      if (data && data.success && data.overrides) {
        setCompanyOverrides(data.overrides);
      } else {
        setCompanyOverrides({});
      }
    } catch (e) {
      setCompanyOverrides({});
    } finally {
      setCompanyLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalRoles();
  }, []);

  useEffect(() => {
    if (selectedCompanyId > 0) {
      fetchCompanyOverrides(selectedCompanyId);
    }
  }, [selectedCompanyId]);

  const toggleGlobalPermission = (roleId: number, permSlug: string) => {
    setRoles(prevRoles =>
      prevRoles.map(r => {
        if (r.id === roleId) {
          const hasPerm = (r.permissions || []).includes(permSlug);
          const updatedPerms = hasPerm
            ? r.permissions.filter(p => p !== permSlug)
            : [...r.permissions, permSlug];
          return { ...r, permissions: updatedPerms };
        }
        return r;
      })
    );
  };

  const handleSaveGlobalRole = async (role: RbacRole) => {
    setSaving(true);
    try {
      const res = await fetch('index.php?action=api_role_update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: role.id, permissions: role.permissions })
      });
      const data = await res.json();
      if (data && data.success) {
        if (showAlert) showAlert(`Global permissions updated for ${role.name}!`, 'success');
      } else {
        if (showAlert) showAlert(data.error || 'Failed to update role permissions.', 'error');
      }
    } catch (e: any) {
      if (showAlert) showAlert(e.message || 'Connection error.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim() || !newRoleSlug.trim()) return;

    setSaving(true);
    try {
      const res = await fetch('index.php?action=api_role_create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoleName.trim(),
          slug: newRoleSlug.trim(),
          description: newRoleDesc.trim(),
          permissions: clonedPermissions
        })
      });
      const data = await res.json();
      if (data && data.success) {
        if (showAlert) showAlert(`Role '${newRoleName}' created successfully!`, 'success');
        setNewRoleName('');
        setNewRoleSlug('');
        setNewRoleDesc('');
        setClonedPermissions(['ast.query']);
        setShowAddRole(false);
        fetchGlobalRoles();
      } else {
        if (showAlert) showAlert(data.error || 'Failed to create role.', 'error');
      }
    } catch (e: any) {
      if (showAlert) showAlert(e.message || 'Connection error.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCloneRole = (sourceRole: RbacRole) => {
    setNewRoleName(`Copy of ${sourceRole.name}`);
    setNewRoleSlug(`${sourceRole.slug}Copy`);
    setNewRoleDesc(`Cloned from ${sourceRole.name}`);
    setClonedPermissions([...(sourceRole.permissions || ['ast.query'])]);
    setShowAddRole(true);
    if (showAlert) showAlert(`Role '${sourceRole.name}' loaded for cloning!`, 'success');
  };

  const initiateDeleteRole = (role: RbacRole) => {
    if (role.is_system === 1) {
      if (showAlert) showAlert('System canonical roles cannot be deleted.', 'error');
      return;
    }
    const count = roleUserCounts[role.slug] || 0;
    if (count > 0) {
      setDeletingRole(role);
    } else {
      executeDeleteRole(role.id, role.name);
    }
  };

  const executeDeleteRole = async (roleId: number, roleName: string) => {
    if (!window.confirm(`Are you sure you want to delete custom role '${roleName}'?`)) return;

    setSaving(true);
    try {
      const res = await fetch(`index.php?action=api_role_delete&role_id=${roleId}`, { method: 'POST' });
      const data = await res.json();
      if (data && data.success) {
        if (showAlert) showAlert(`Custom role '${roleName}' deleted!`, 'success');
        setDeletingRole(null);
        fetchGlobalRoles();
      } else {
        if (showAlert) showAlert(data.error || 'Failed to delete role.', 'error');
      }
    } catch (e: any) {
      if (showAlert) showAlert(e.message || 'Connection error.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReassignAndDeleteRole = async () => {
    if (!deletingRole) return;
    setSaving(true);
    try {
      // 1. Reassign affected users
      const affectedUsers = users.filter(u => (u.role || 'Observer') === deletingRole.slug);
      for (const u of affectedUsers) {
        await fetch('index.php?action=api_user_update_role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: u.id, role: reassignRole })
        });
      }
      // 2. Delete role
      await executeDeleteRole(deletingRole.id, deletingRole.name);
    } catch (e: any) {
      if (showAlert) showAlert(e.message || 'Failed during user reassignment.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleCompanyPermission = (roleSlug: string, permSlug: string) => {
    setCompanyOverrides(prev => {
      const currentRolePerms = prev[roleSlug] !== undefined
        ? prev[roleSlug]
        : (roles.find(r => r.slug === roleSlug)?.permissions || []);
      const hasPerm = currentRolePerms.includes(permSlug);
      const updated = hasPerm
        ? currentRolePerms.filter(p => p !== permSlug)
        : [...currentRolePerms, permSlug];
      return { ...prev, [roleSlug]: updated };
    });
  };

  const handleSaveCompanyRole = async (roleSlug: string) => {
    if (selectedCompanyId <= 0) return;
    setSaving(true);
    try {
      const permsToSave = companyOverrides[roleSlug] || [];
      const res = await fetch('index.php?action=api_company_role_update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompanyId,
          role: roleSlug,
          permissions: permsToSave
        })
      });
      const data = await res.json();
      if (data && data.success) {
        if (showAlert) showAlert(`Company override saved for ${roleSlug}!`, 'success');
        fetchCompanyOverrides(selectedCompanyId);
      } else {
        if (showAlert) showAlert(data.error || 'Failed to save company role override.', 'error');
      }
    } catch (e: any) {
      if (showAlert) showAlert(e.message || 'Connection error.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetCompanyOverride = async (roleSlug: string) => {
    if (selectedCompanyId <= 0) return;
    setSaving(true);
    try {
      const res = await fetch('index.php?action=api_company_role_update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompanyId,
          role: roleSlug,
          permissions: [] // Clears override
        })
      });
      const data = await res.json();
      if (data && data.success) {
        if (showAlert) showAlert(`Reset override for ${roleSlug} to Global Default!`, 'success');
        fetchCompanyOverrides(selectedCompanyId);
      } else {
        if (showAlert) showAlert(data.error || 'Failed to reset company override.', 'error');
      }
    } catch (e: any) {
      if (showAlert) showAlert(e.message || 'Connection error.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const simulatedCapabilities = useMemo(() => {
    if (!simUserEmail) return [];
    const userObj = users.find(u => u.email === simUserEmail);
    const roleSlug = userObj?.role || 'Observer';
    const compId = userObj?.company_id || 0;

    const rolePerms = (compId > 0 && companyOverrides[roleSlug])
      ? companyOverrides[roleSlug]
      : (roles.find(r => r.slug === roleSlug)?.permissions || ['ast.query']);

    return rolePerms;
  }, [simUserEmail, simTierSlug, users, roles, companyOverrides]);

  const subNavItems: SubTabItem<'global' | 'company' | 'definitions' | 'simulator'>[] = [
    { id: 'global', label: 'Global Role Defaults', icon: Layers },
    { id: 'company', label: 'Company Custom Overrides', icon: Building2, badge: Object.keys(companyOverrides).length || undefined },
    { id: 'definitions', label: 'Role Definitions & Lifecycle', icon: Shield, badge: roles.length },
    { id: 'simulator', label: 'Effective Capability Simulator', icon: Eye }
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Roles & Security Governance"
        subtitle="Manage global default RBAC roles, organization-level company overrides, and platform capability policies."
        icon={Shield}
        action={
          <div className="flex gap-2">
            <Button variant="neutral" size="sm" icon={RefreshCw} onClick={fetchGlobalRoles}>
              Refresh Matrix
            </Button>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAddRole(!showAddRole)}>
              {showAddRole ? 'Cancel' : 'Add Custom Role'}
            </Button>
          </div>
        }
      />

      <SubTabNav<'global' | 'company' | 'definitions' | 'simulator'>
        tabs={subNavItems}
        activeTab={activeSubTab}
        onTabChange={setActiveSubTab}
      />

      {showAddRole && (
        <form onSubmit={handleCreateRole} className="p-5 bg-pm-card border border-pm-border rounded-2xl shadow-sm space-y-4">
          <h4 className="text-xs font-bold text-pm-text uppercase tracking-wider">Create / Clone Platform Role</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-pm-secondary mb-1">Role Name</label>
              <input
                type="text"
                required
                placeholder="e.g. DevOps Security Auditor"
                value={newRoleName}
                onChange={e => {
                  setNewRoleName(e.target.value);
                  if (!newRoleSlug) setNewRoleSlug(e.target.value.replace(/[^a-zA-Z0-9]/g, ''));
                }}
                className="w-full bg-pm-input border border-pm-border rounded-xl px-3.5 py-2 text-xs text-pm-text"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-pm-secondary mb-1">Role Slug (Unique Code)</label>
              <input
                type="text"
                required
                placeholder="e.g. DevOpsAuditor"
                value={newRoleSlug}
                onChange={e => setNewRoleSlug(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                className="w-full bg-pm-input border border-pm-border rounded-xl px-3.5 py-2 text-xs text-pm-text font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-pm-secondary mb-1">Description</label>
            <input
              type="text"
              placeholder="Description of security duties and responsibilities..."
              value={newRoleDesc}
              onChange={e => setNewRoleDesc(e.target.value)}
              className="w-full bg-pm-input border border-pm-border rounded-xl px-3.5 py-2 text-xs text-pm-text"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="neutral" size="sm" onClick={() => setShowAddRole(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Role'}
            </Button>
          </div>
        </form>
      )}

      {/* SubTab 1: Global Role Defaults */}
      {activeSubTab === 'global' && (
        <div className="bg-pm-card border border-pm-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary">Global System Role Matrix</h3>
              <p className="text-[11px] text-pm-secondary mt-0.5">
                Default platform roles applied to all clients unless a company-specific override is active.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-pm-secondary">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-pm-primary" />
              <p className="text-xs">Loading Global RBAC Matrix...</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-pm-border rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-pm-input text-pm-secondary font-bold uppercase text-[10px] border-b border-pm-border">
                    <th className="p-3.5 min-w-[200px]">Capability Permission</th>
                    {roles.map(r => (
                      <th key={r.id} className="p-3.5 text-center min-w-[130px]">
                        <div className="flex flex-col items-center gap-1">
                          <StatusBadge label={r.name} customColor={r.slug === 'SuperAdmin' ? 'purple' : r.slug === 'CompanyAdmin' ? 'indigo' : 'emerald'} />
                          <div className="flex items-center gap-1 mt-1.5">
                            <button
                              onClick={() => handleSaveGlobalRole(r)}
                              disabled={saving}
                              className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition text-[10px] font-bold flex items-center gap-1 cursor-pointer border border-indigo-500/20"
                            >
                              <Save className="w-3 h-3" /> Save
                            </button>
                            <button
                              onClick={() => handleCloneRole(r)}
                              title="Clone Role"
                              className="p-1 rounded bg-pm-input hover:bg-pm-border text-pm-text transition cursor-pointer border border-pm-border"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            {r.is_system !== 1 && (
                              <button
                                onClick={() => initiateDeleteRole(r)}
                                disabled={saving}
                                className="p-1 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition cursor-pointer border border-rose-500/20"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-pm-border">
                  {permissions.map(p => (
                    <tr key={p.slug} className="hover:bg-pm-input/30 transition">
                      <td className="p-3.5">
                        <div className="font-bold text-pm-text">{p.name || p.slug}</div>
                        <div className="text-[10px] text-pm-secondary">{p.description}</div>
                      </td>
                      {roles.map(r => {
                        const hasPerm = (r.permissions || []).includes(p.slug);
                        return (
                          <td key={r.id} className="p-3.5 text-center align-middle">
                            <input
                              type="checkbox"
                              checked={hasPerm}
                              onChange={() => toggleGlobalPermission(r.id, p.slug)}
                              className="w-4 h-4 rounded border-pm-border text-indigo-500 focus:ring-indigo-500 cursor-pointer accent-indigo-500"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SubTab 2: Company Custom Overrides */}
      {activeSubTab === 'company' && (
        <div className="bg-pm-card border border-pm-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary">Company-Specific Role Overrides</h3>
              <p className="text-[11px] text-pm-secondary mt-0.5">
                Customize role permissions for a specific organization. Overrides take precedence over global defaults.
              </p>
            </div>

            {/* Searchable Company Selector */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-pm-secondary" />
                <input
                  type="text"
                  placeholder="Filter 500+ Companies..."
                  value={companySearchQuery}
                  onChange={e => setCompanySearchQuery(e.target.value)}
                  className="bg-pm-input border border-pm-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-pm-text"
                />
              </div>

              <select
                value={selectedCompanyId}
                onChange={e => setSelectedCompanyId(Number(e.target.value))}
                className="bg-pm-input border border-pm-border rounded-xl px-3 py-1.5 text-xs text-pm-text font-bold cursor-pointer min-w-[180px]"
              >
                {filteredCompanies.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.company_name || `Company #${c.id}`} (#{c.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {companyLoading ? (
            <div className="p-8 text-center text-pm-secondary">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-pm-primary" />
              <p className="text-xs">Loading Company Role Overrides...</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-pm-border rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-pm-input text-pm-secondary font-bold uppercase text-[10px] border-b border-pm-border">
                    <th className="p-3.5 min-w-[200px]">Capability Permission</th>
                    {roles.map(r => {
                      const isOverridden = Boolean(companyOverrides[r.slug]);
                      return (
                        <th key={r.id} className="p-3.5 text-center min-w-[140px]">
                          <div className="flex flex-col items-center gap-1">
                            <StatusBadge label={r.name} customColor={r.slug === 'SuperAdmin' ? 'purple' : r.slug === 'CompanyAdmin' ? 'indigo' : 'emerald'} />
                            <div className="text-[9px] font-mono text-pm-secondary mt-0.5">
                              {isOverridden ? '🟢 Custom Override' : '⚪ Global Default'}
                            </div>
                            <div className="flex items-center gap-1 mt-1.5">
                              <button
                                onClick={() => handleSaveCompanyRole(r.slug)}
                                disabled={saving}
                                className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition text-[10px] font-bold flex items-center gap-1 cursor-pointer border border-indigo-500/20"
                              >
                                <Save className="w-3 h-3" /> Save
                              </button>
                              {isOverridden && (
                                <button
                                  onClick={() => handleResetCompanyOverride(r.slug)}
                                  disabled={saving}
                                  title="Reset Override to Global Default"
                                  className="p-1 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition cursor-pointer border border-rose-500/20"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-pm-border">
                  {permissions.map(p => (
                    <tr key={p.slug} className="hover:bg-pm-input/30 transition">
                      <td className="p-3.5">
                        <div className="font-bold text-pm-text">{p.name || p.slug}</div>
                        <div className="text-[10px] text-pm-secondary">{p.description}</div>
                      </td>
                      {roles.map(r => {
                        const rolePerms = companyOverrides[r.slug] !== undefined
                          ? companyOverrides[r.slug]
                          : (r.permissions || []);
                        const hasPerm = rolePerms.includes(p.slug);
                        return (
                          <td key={r.id} className="p-3.5 text-center align-middle">
                            <input
                              type="checkbox"
                              checked={hasPerm}
                              onChange={() => toggleCompanyPermission(r.slug, p.slug)}
                              className="w-4 h-4 rounded border-pm-border text-indigo-500 focus:ring-indigo-500 cursor-pointer accent-indigo-500"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SubTab 3: Role Definitions & Lifecycle */}
      {activeSubTab === 'definitions' && (
        <div className="bg-pm-card border border-pm-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary">Platform Role Definitions</h3>
              <p className="text-[11px] text-pm-secondary mt-0.5">
                Inspect active assigned user counts, clone roles, and manage custom security definitions.
              </p>
            </div>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAddRole(true)}>
              Add Custom Role
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map(r => {
              const count = roleUserCounts[r.slug] || 0;
              return (
                <div key={r.id} className="p-4 bg-pm-input/30 border border-pm-border rounded-xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge label={r.name} customColor={r.slug === 'SuperAdmin' ? 'purple' : r.slug === 'CompanyAdmin' ? 'indigo' : 'emerald'} />
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-pm-card border border-pm-border text-pm-secondary">
                          {r.slug}
                        </span>
                      </div>
                      <p className="text-xs text-pm-secondary">{r.description || 'Custom platform role'}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCloneRole(r)}
                        title="Clone Role"
                        className="px-2 py-1 rounded bg-pm-card hover:bg-pm-border text-xs font-bold text-pm-text transition cursor-pointer border border-pm-border flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Clone
                      </button>
                      {r.is_system !== 1 && (
                        <button
                          onClick={() => initiateDeleteRole(r)}
                          className="p-1 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition cursor-pointer border border-rose-500/20"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-pm-border/50 text-xs">
                    <span className="text-pm-secondary font-semibold flex items-center gap-1.5">
                      👥 <strong className="text-pm-text">{count}</strong> Active Assigned User(s)
                    </span>
                    {onFilterUserByRole && (
                      <button
                        onClick={() => onFilterUserByRole(r.slug)}
                        className="text-indigo-400 hover:underline flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                      >
                        View in Client Directory <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SubTab 4: Effective Capability Simulator */}
      {activeSubTab === 'simulator' && (
        <div className="bg-pm-card border border-pm-border rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary">Live Effective Capability Simulator</h3>
            <p className="text-[11px] text-pm-secondary mt-0.5">
              Simulate exact capabilities granted to a client after applying Role Perms ∩ License Tier Ceiling.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-pm-input/30 border border-pm-border rounded-xl">
            <div>
              <label className="block text-xs font-bold text-pm-secondary mb-1">Select Client User:</label>
              <select
                value={simUserEmail}
                onChange={e => setSimUserEmail(e.target.value)}
                className="w-full bg-pm-card border border-pm-border rounded-xl px-3 py-2 text-xs text-pm-text font-bold cursor-pointer"
              >
                {users.map(u => (
                  <option key={u.id} value={u.email}>
                    {u.email} (Role: {u.role || 'Observer'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-pm-secondary mb-1">Select Store License Tier:</label>
              <select
                value={simTierSlug}
                onChange={e => setSimTierSlug(e.target.value)}
                className="w-full bg-pm-card border border-pm-border rounded-xl px-3 py-2 text-xs text-pm-text font-bold cursor-pointer"
              >
                <option value="basic">Basic Tier</option>
                <option value="pro">Pro Tier</option>
                <option value="enterprise">Enterprise Tier</option>
                <option value="developer">Developer Tier</option>
              </select>
            </div>
          </div>

          <div className="border border-pm-border rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-pm-input text-pm-secondary font-bold uppercase text-[10px] border-b border-pm-border">
                  <th className="p-3.5">Capability Permission</th>
                  <th className="p-3.5 text-center">Effective Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pm-border">
                {permissions.map(p => {
                  const isGranted = simulatedCapabilities.includes(p.slug);
                  return (
                    <tr key={p.slug} className="hover:bg-pm-input/30 transition">
                      <td className="p-3.5">
                        <div className="font-bold text-pm-text">{p.name || p.slug}</div>
                        <div className="text-[10px] text-pm-secondary">{p.description}</div>
                      </td>
                      <td className="p-3.5 text-center align-middle">
                        {isGranted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[11px]">
                            <Check className="w-3.5 h-3.5" /> Granted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-pm-input text-pm-secondary/50 font-semibold text-[11px]">
                            <Lock className="w-3 h-3" /> Restricted
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deletion Guard Modal */}
      {deletingRole && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-pm-card border border-pm-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-bold text-pm-text">Role Deletion Safeguard Notice</h3>
            </div>

            <p className="text-xs text-pm-secondary leading-relaxed">
              Role <strong className="text-pm-text">{deletingRole.name}</strong> cannot be deleted directly because it is currently assigned to <strong className="text-indigo-400 font-bold">{roleUserCounts[deletingRole.slug] || 0} active client account(s)</strong>.
            </p>

            <div className="p-3.5 bg-pm-input/40 border border-pm-border rounded-xl space-y-2 text-xs">
              <label className="block font-bold text-pm-text">Reassign Affected Users To:</label>
              <select
                value={reassignRole}
                onChange={e => setReassignRole(e.target.value)}
                className="w-full bg-pm-card border border-pm-border rounded-lg px-3 py-1.5 text-xs text-pm-text font-bold cursor-pointer"
              >
                {roles.filter(r => r.slug !== deletingRole.slug).map(r => (
                  <option key={r.id} value={r.slug}>{r.name} ({r.slug})</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="neutral" size="sm" onClick={() => setDeletingRole(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleReassignAndDeleteRole} disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Reassign Users & Delete Role'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

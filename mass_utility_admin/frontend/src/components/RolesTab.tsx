// @Arch[RolesTab]
import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Plus, Save, Trash2, Loader2, Building2, Layers, RefreshCw, Copy, Search, ExternalLink, Check, Lock, AlertTriangle, Eye, RotateCcw, BookOpen, Key, Users as UsersIcon } from 'lucide-react';
import { SectionHeader } from './common/SectionHeader';
import { StatusBadge } from './common/StatusBadge';
import { Button } from './common/Button';
import { SubTabNav, SubTabItem } from './common/SubTabNav';
import { BaseModal } from './common/BaseModal';
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

const TIER_CAPABILITIES_MAP: Record<string, string[]> = {
  basic: ['ast.query', 'db.backup', 'files.backup'],
  pro: ['ast.query', 'ast.mutate', 'db.backup', 'db.restore', 'files.backup'],
  enterprise: ['ast.query', 'ast.mutate', 'db.backup', 'db.restore', 'db.drop', 'files.backup', 'files.delete', 'settings.update', 'users.manage'],
  developer: ['ast.query', 'ast.mutate', 'db.backup', 'db.restore', 'db.drop', 'files.backup', 'files.delete', 'settings.update', 'users.manage']
};

export const RolesTab: React.FC<RolesTabProps> = ({ companies, users = [], licenses = [], tiers = [], showAlert, onFilterUserByRole }) => {
  const [activeSubTab, setActiveSubTab] = useState<'global' | 'company'>('global');
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

  // Glossary Modal State
  const [showGlossaryModal, setShowGlossaryModal] = useState(false);

  // Deletion Guard Modal State
  const [deletingRole, setDeletingRole] = useState<RbacRole | null>(null);
  const [reassignRole, setReassignRole] = useState<string>('Observer');

  // Capability Simulator State
  const [simUserEmail, setSimUserEmail] = useState<string>(users[0]?.email || '');
  const [simTierSlug, setSimTierSlug] = useState<string>('pro');

  // Auto-detect user's assigned license tier when user selection changes
  useEffect(() => {
    if (simUserEmail) {
      const userObj = users.find(u => u.email === simUserEmail);
      if (userObj) {
        const userLic = licenses.find(l => Number(l.user_id) === Number(userObj.id) || (userObj.company_id && Number(l.company_id) === Number(userObj.company_id)));
        if (userLic && userLic.package_tier) {
          setSimTierSlug(userLic.package_tier.toLowerCase());
        }
      }
    }
  }, [simUserEmail, users, licenses]);

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

  // Correct 3-Tier Capability Simulator Calculation: Role Perms ∩ License Tier Ceiling
  const simulatedCapabilities = useMemo(() => {
    if (!simUserEmail) return [];
    const userObj = users.find(u => u.email === simUserEmail);
    if (!userObj) return [];

    const roleSlug = userObj.role || 'Observer';
    const compId = userObj.company_id || 0;

    // Step 1: Resolve Role Permissions (Company Override if set, else Global Role Default)
    const rolePerms = (compId > 0 && companyOverrides[roleSlug] && companyOverrides[roleSlug].length > 0)
      ? companyOverrides[roleSlug]
      : (roles.find(r => r.slug === roleSlug)?.permissions || ['ast.query']);

    // Step 2: Resolve Package Tier Capability Ceiling
    const tierCaps = TIER_CAPABILITIES_MAP[simTierSlug.toLowerCase()] || TIER_CAPABILITIES_MAP.basic;

    // Step 3: Intersection = Role Perms ∩ Tier Caps
    return rolePerms.filter(p => tierCaps.includes(p));
  }, [simUserEmail, simTierSlug, users, roles, companyOverrides]);

  const selectedSimUserObj = useMemo(() => {
    return users.find(u => u.email === simUserEmail);
  }, [simUserEmail, users]);

  const selectedSimUserLic = useMemo(() => {
    if (!selectedSimUserObj) return null;
    return licenses.find(l => Number(l.user_id) === Number(selectedSimUserObj.id) || (selectedSimUserObj.company_id && Number(l.company_id) === Number(selectedSimUserObj.company_id)));
  }, [selectedSimUserObj, licenses]);

  const subNavItems: SubTabItem<'global' | 'company'>[] = [
    { id: 'global', label: 'Global Platform Roles & Definitions', icon: Layers, badge: roles.length },
    { id: 'company', label: 'Company Overrides & Live Simulator', icon: Building2, badge: Object.keys(companyOverrides).length || undefined }
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Roles & Security Governance"
        subtitle="Manage platform RBAC roles, organization overrides, and simulate live capability enforcement."
        icon={Shield}
        action={
          <div className="flex gap-2">
            <Button variant="neutral" size="sm" icon={BookOpen} onClick={() => setShowGlossaryModal(true)}>
              Capability Glossary
            </Button>
            <Button variant="neutral" size="sm" icon={RefreshCw} onClick={fetchGlobalRoles}>
              Refresh Matrix
            </Button>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAddRole(!showAddRole)}>
              {showAddRole ? 'Cancel' : 'Add Custom Role'}
            </Button>
          </div>
        }
      />

      <SubTabNav<'global' | 'company'>
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

      {/* Unified Tab 1: Global Platform Roles & Definitions */}
      {activeSubTab === 'global' && (
        <div className="space-y-6">
          {/* Role Definition Cards Section */}
          <div className="bg-pm-card border border-pm-border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary">Platform Role Definitions & Lifecycle</h3>
                <p className="text-[11px] text-pm-secondary mt-0.5">
                  Inspect assigned user counts, clone roles, and manage security definitions.
                </p>
              </div>
              <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAddRole(true)}>
                Add Custom Role
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map(r => {
                const count = roleUserCounts[r.slug] || 0;
                return (
                  <div key={r.id} className="p-4 bg-pm-input/30 border border-pm-border rounded-xl space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <StatusBadge label={r.name} customColor={r.slug === 'SuperAdmin' ? 'purple' : r.slug === 'CompanyAdmin' ? 'indigo' : 'emerald'} />
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCloneRole(r)}
                            title="Clone Role"
                            className="px-2 py-1 rounded bg-pm-card hover:bg-pm-border text-[11px] font-bold text-pm-text transition cursor-pointer border border-pm-border flex items-center gap-1"
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
                      <p className="text-xs text-pm-secondary line-clamp-2">{r.description || 'Platform security role definition'}</p>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-pm-border/50 text-xs">
                      <span className="text-pm-secondary font-semibold flex items-center gap-1">
                        👥 <strong className="text-pm-text">{count}</strong> User(s)
                      </span>
                      {onFilterUserByRole && (
                        <button
                          onClick={() => onFilterUserByRole(r.slug)}
                          className="text-indigo-400 hover:underline flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                        >
                          View in Clients <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Global Interactive Permission Matrix Section */}
          <div className="bg-pm-card border border-pm-border rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary">Global System Permission Matrix</h3>
              <p className="text-[11px] text-pm-secondary mt-0.5">
                Toggle default capability permissions for each platform role.
              </p>
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
                            <button
                              onClick={() => handleSaveGlobalRole(r)}
                              disabled={saving}
                              className="mt-1.5 px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition text-[10px] font-bold flex items-center gap-1 cursor-pointer border border-indigo-500/20"
                            >
                              <Save className="w-3 h-3" /> Save
                            </button>
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
        </div>
      )}

      {/* Unified Tab 2: Company Overrides & Live Simulator */}
      {activeSubTab === 'company' && (
        <div className="space-y-6">
          {/* Company Overrides Section */}
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

          {/* Integrated Live Effective Capability Simulator Section */}
          <div className="bg-pm-card border border-pm-border rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-indigo-400" /> Live Effective Capability Simulator
              </h3>
              <p className="text-[11px] text-pm-secondary mt-0.5">
                Simulate exact effective capabilities granted to a client user after applying Role Perms ∩ License Tier Ceiling.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-pm-input/30 border border-pm-border rounded-xl">
              <div>
                <label className="block text-xs font-bold text-pm-secondary mb-1 flex items-center gap-1">
                  <UsersIcon className="w-3.5 h-3.5 text-indigo-400" /> Select Client User:
                </label>
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
                <label className="block text-xs font-bold text-pm-secondary mb-1 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-indigo-400" /> Store License Tier Ceiling:
                </label>
                <select
                  value={simTierSlug}
                  onChange={e => setSimTierSlug(e.target.value)}
                  className="w-full bg-pm-card border border-pm-border rounded-xl px-3 py-2 text-xs text-pm-text font-bold cursor-pointer"
                >
                  <option value="basic">Basic Tier (ast.query, db.backup, files.backup)</option>
                  <option value="pro">Pro Tier (ast.query, ast.mutate, db.backup, db.restore, files.backup)</option>
                  <option value="enterprise">Enterprise Tier (Full Capabilities)</option>
                  <option value="developer">Developer Tier (Full Capabilities)</option>
                </select>
              </div>
            </div>

            {selectedSimUserObj && (
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-pm-text">Selected User:</span>
                  <span className="font-mono text-indigo-400 font-bold">{selectedSimUserObj.email}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300">
                    {selectedSimUserObj.role || 'Observer'}
                  </span>
                </div>
                <div className="text-[11px] text-pm-secondary">
                  Assigned Key: <strong className="font-mono text-pm-text">{selectedSimUserLic ? selectedSimUserLic.license_key : 'No License Assigned'}</strong> ({simTierSlug.toUpperCase()})
                </div>
              </div>
            )}

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
        </div>
      )}

      {/* System Capability Glossary Modal */}
      {showGlossaryModal && (
        <BaseModal isOpen={showGlossaryModal} onClose={() => setShowGlossaryModal(false)} title="System Capability Definition Registry" icon={BookOpen} maxWidth="lg">
          <div className="space-y-4">
            <p className="text-xs text-pm-secondary">
              Reference guide of all security capability permissions across mass_utility_dashboard.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
              {permissions.map(p => (
                <div key={p.slug} className="p-3 bg-pm-input/30 border border-pm-border rounded-xl space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-pm-text">{p.name || p.slug}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {p.slug}
                    </span>
                  </div>
                  <p className="text-[11px] text-pm-secondary">{p.description}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="neutral" size="sm" onClick={() => setShowGlossaryModal(false)}>
                Close Glossary
              </Button>
            </div>
          </div>
        </BaseModal>
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

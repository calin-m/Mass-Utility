// @Arch[RolesTab]
import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Plus, RefreshCw, Layers, Building2, Loader2, BookOpen } from 'lucide-react';
import { SectionHeader } from './common/SectionHeader';
import { Button } from './common/Button';
import { SubTabNav, SubTabItem } from './common/SubTabNav';
import { RbacRole, RbacPermission, Company, UserAccount, License } from '../types/adminApi';

// Extracted Sub-Components
import { RoleCard } from './roles/RoleCard';
import { GlobalMatrixTable } from './roles/GlobalMatrixTable';
import { CompanyOverridesTable } from './roles/CompanyOverridesTable';
import { CapabilitySimulator } from './roles/CapabilitySimulator';
import { CapabilityGlossaryModal } from './roles/CapabilityGlossaryModal';
import { RoleDeletionGuardModal } from './roles/RoleDeletionGuardModal';

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

export const RolesTab: React.FC<RolesTabProps> = ({
  companies,
  users = [],
  licenses = [],
  showAlert,
  onFilterUserByRole
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'global' | 'company'>('global');
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [permissions, setPermissions] = useState<RbacPermission[]>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Searchable Company Overrides State
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(companies[0]?.id || 0);
  const [companyOverrides, setCompanyOverrides] = useState<Record<string, string[]>>({});
  const [companyLoading, setCompanyLoading] = useState(false);

  // Role Creation Form State
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleSlug, setNewRoleSlug] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [clonedPermissions, setClonedPermissions] = useState<string[]>(['ast.query']);

  // Modal States
  const [showGlossaryModal, setShowGlossaryModal] = useState(false);
  const [deletingRole, setDeletingRole] = useState<RbacRole | null>(null);
  const [reassignRole, setReassignRole] = useState<string>('Observer');

  // Capability Simulator State
  const [simUserEmail, setSimUserEmail] = useState<string>(users[0]?.email || '');
  const [simTierSlug, setSimTierSlug] = useState<string>('pro');
  const [simRoleSlug, setSimRoleSlug] = useState<string>('Observer');
  const [simMode, setSimMode] = useState<'user' | 'role'>('user');

  // Sync selectedCompanyId when companies array resolves asynchronously
  useEffect(() => {
    if (companies.length > 0 && (selectedCompanyId <= 0 || !companies.some(c => c.id === selectedCompanyId))) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companies, selectedCompanyId]);

  // Dynamic Package Tiers Fetch from Backend API
  const [packageTiers, setPackageTiers] = useState<any[]>([]);
  useEffect(() => {
    const fetchPackageTiers = async () => {
      try {
        const res = await fetch('index.php?action=api_package_tiers');
        const data = await res.json();
        if (data && data.success && Array.isArray(data.tiers)) {
          setPackageTiers(data.tiers);
        }
      } catch (e) {
        // Graceful fallback
      }
    };
    fetchPackageTiers();
  }, []);

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
      executeDeleteRoleWithConfirm(role.id, role.name);
    }
  };

  const executeDeleteRoleWithConfirm = async (roleId: number, roleName: string) => {
    if (!window.confirm(`Are you sure you want to delete custom role '${roleName}'?`)) return;
    await executeDeleteRoleDirect(roleId, roleName);
  };

  const executeDeleteRoleDirect = async (roleId: number, roleName: string) => {
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
      const affectedUsers = users.filter(u => (u.role || 'Observer') === deletingRole.slug);
      for (const u of affectedUsers) {
        await fetch('index.php?action=api_user_update_role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: u.id, role: reassignRole })
        });
      }
      await executeDeleteRoleDirect(deletingRole.id, deletingRole.name);
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
          permissions: [],
          reset: true
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

  // Live Effective Capability Simulator Calculation: Role Perms ∩ Tier Caps
  const simulatedCapabilities = useMemo(() => {
    let roleSlug = simRoleSlug;
    let compId = 0;

    if (simMode === 'user') {
      if (!simUserEmail) return [];
      const userObj = users.find(u => u.email === simUserEmail);
      if (!userObj) return [];
      roleSlug = userObj.role || 'Observer';
      compId = userObj.company_id || 0;
    }

    const rolePerms = (compId > 0 && companyOverrides[roleSlug] && companyOverrides[roleSlug].length > 0)
      ? companyOverrides[roleSlug]
      : (roles.find(r => r.slug === roleSlug)?.permissions || ['ast.query']);

    const tierCaps = TIER_CAPABILITIES_MAP[simTierSlug.toLowerCase()] || TIER_CAPABILITIES_MAP.basic;

    return rolePerms.filter(p => tierCaps.includes(p));
  }, [simMode, simUserEmail, simRoleSlug, simTierSlug, users, roles, companyOverrides]);

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
            <Button variant="neutral" size="sm" icon={RefreshCw} onClick={fetchGlobalRoles}>
              Refresh
            </Button>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAddRole(!showAddRole)}>
              {showAddRole ? 'Cancel' : 'Add Custom Role'}
            </Button>
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <SubTabNav<'global' | 'company'>
          tabs={subNavItems}
          activeTab={activeSubTab}
          onTabChange={setActiveSubTab}
        />
        <Button variant="neutral" size="sm" icon={BookOpen} onClick={() => setShowGlossaryModal(true)}>
          Capability Glossary
        </Button>
      </div>

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

      {/* Tab 1: Global Platform Roles & Definitions */}
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
              {roles.map(r => (
                <RoleCard
                  key={r.id}
                  role={r}
                  userCount={roleUserCounts[r.slug] || 0}
                  onClone={handleCloneRole}
                  onDelete={initiateDeleteRole}
                  onFilterUserByRole={onFilterUserByRole}
                />
              ))}
            </div>
          </div>

          {/* Global Interactive Permission Matrix Section */}
          <GlobalMatrixTable
            roles={roles}
            permissions={permissions}
            loading={loading}
            saving={saving}
            onTogglePermission={toggleGlobalPermission}
            onSaveRole={handleSaveGlobalRole}
          />
        </div>
      )}

      {/* Tab 2: Company Overrides & Live Simulator */}
      {activeSubTab === 'company' && (
        <div className="space-y-6">
          <CompanyOverridesTable
            companies={companies}
            filteredCompanies={filteredCompanies}
            selectedCompanyId={selectedCompanyId}
            companySearchQuery={companySearchQuery}
            roles={roles}
            permissions={permissions}
            companyOverrides={companyOverrides}
            companyLoading={companyLoading}
            saving={saving}
            onSearchChange={setCompanySearchQuery}
            onCompanySelect={setSelectedCompanyId}
            onTogglePermission={toggleCompanyPermission}
            onSaveCompanyRole={handleSaveCompanyRole}
            onResetCompanyOverride={handleResetCompanyOverride}
          />

          <CapabilitySimulator
            users={users}
            licenses={licenses}
            roles={roles}
            permissions={permissions}
            simUserEmail={simUserEmail}
            simTierSlug={simTierSlug}
            simRoleSlug={simRoleSlug}
            simMode={simMode}
            simulatedCapabilities={simulatedCapabilities}
            selectedSimUserObj={selectedSimUserObj}
            selectedSimUserLic={selectedSimUserLic}
            onUserEmailChange={setSimUserEmail}
            onTierSlugChange={setSimTierSlug}
            onRoleSlugChange={setSimRoleSlug}
            onSimModeChange={setSimMode}
          />
        </div>
      )}

      {/* Glossary Modal */}
      <CapabilityGlossaryModal
        isOpen={showGlossaryModal}
        permissions={permissions}
        onClose={() => setShowGlossaryModal(false)}
      />

      {/* Role Deletion Guard Modal */}
      <RoleDeletionGuardModal
        deletingRole={deletingRole}
        roles={roles}
        userCount={deletingRole ? (roleUserCounts[deletingRole.slug] || 0) : 0}
        reassignRole={reassignRole}
        saving={saving}
        onReassignChange={setReassignRole}
        onConfirm={handleReassignAndDeleteRole}
        onClose={() => setDeletingRole(null)}
      />
    </div>
  );
};

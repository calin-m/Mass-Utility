// @Arch[RolesTab]
import React, { useState, useEffect } from 'react';
import { Shield, Plus, Save, Trash2, Loader2, Building2, Layers, RefreshCw } from 'lucide-react';
import { SectionHeader } from './common/SectionHeader';
import { StatusBadge } from './common/StatusBadge';
import { Button } from './common/Button';
import { SubTabNav, SubTabItem } from './common/SubTabNav';
import { RbacRole, RbacPermission, Company } from '../types/adminApi';

interface RolesTabProps {
  companies: Company[];
  tiers?: any[];
  showAlert?: (msg: string, type?: 'success' | 'error') => void;
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

export const RolesTab: React.FC<RolesTabProps> = ({ companies, showAlert }) => {
  const [activeSubTab, setActiveSubTab] = useState<'global' | 'company' | 'glossary'>('global');
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [permissions, setPermissions] = useState<RbacPermission[]>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Company Overrides State
  const [selectedCompanyId, setSelectedCompanyId] = useState<number>(companies[0]?.id || 0);
  const [companyOverrides, setCompanyOverrides] = useState<Record<string, string[]>>({});
  const [companyLoading, setCompanyLoading] = useState(false);

  // Custom Role Creation State
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleSlug, setNewRoleSlug] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

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
          permissions: ['ast.query']
        })
      });
      const data = await res.json();
      if (data && data.success) {
        if (showAlert) showAlert(`Custom role '${newRoleName}' created successfully!`, 'success');
        setNewRoleName('');
        setNewRoleSlug('');
        setNewRoleDesc('');
        setShowAddRole(false);
        fetchGlobalRoles();
      } else {
        if (showAlert) showAlert(data.error || 'Failed to create custom role.', 'error');
      }
    } catch (e: any) {
      if (showAlert) showAlert(e.message || 'Connection error.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (roleId: number, roleName: string) => {
    if (!window.confirm(`Are you sure you want to delete custom role '${roleName}'?`)) return;

    setSaving(true);
    try {
      const res = await fetch(`index.php?action=api_role_delete&role_id=${roleId}`, { method: 'POST' });
      const data = await res.json();
      if (data && data.success) {
        if (showAlert) showAlert(`Custom role '${roleName}' deleted!`, 'success');
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
        if (showAlert) showAlert(`Company-specific override saved for ${roleSlug}!`, 'success');
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

  const subNavItems: SubTabItem<'global' | 'company' | 'glossary'>[] = [
    { id: 'global', label: 'Global Role Defaults', icon: Layers },
    { id: 'company', label: 'Company Custom Overrides', icon: Building2, badge: Object.keys(companyOverrides).length || undefined },
    { id: 'glossary', label: 'System Capability Registry', icon: Shield }
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

      <SubTabNav<'global' | 'company' | 'glossary'>
        tabs={subNavItems}
        activeTab={activeSubTab}
        onTabChange={setActiveSubTab}
      />

      {showAddRole && (
        <form onSubmit={handleCreateRole} className="p-5 bg-pm-card border border-pm-border rounded-2xl shadow-sm space-y-4">
          <h4 className="text-xs font-bold text-pm-text uppercase tracking-wider">Create Custom Platform Role</h4>
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
                            {r.is_system !== 1 && (
                              <button
                                onClick={() => handleDeleteRole(r.id, r.name)}
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

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-pm-secondary">Select Organization:</label>
              <select
                value={selectedCompanyId}
                onChange={e => setSelectedCompanyId(Number(e.target.value))}
                className="bg-pm-input border border-pm-border rounded-xl px-3 py-1.5 text-xs text-pm-text font-bold cursor-pointer"
              >
                {companies.map(c => (
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
                        <th key={r.id} className="p-3.5 text-center min-w-[130px]">
                          <div className="flex flex-col items-center gap-1">
                            <StatusBadge label={r.name} customColor={r.slug === 'SuperAdmin' ? 'purple' : r.slug === 'CompanyAdmin' ? 'indigo' : 'emerald'} />
                            <div className="text-[9px] font-mono text-pm-secondary mt-0.5">
                              {isOverridden ? '🟢 Custom Override' : '⚪ Global Default'}
                            </div>
                            <button
                              onClick={() => handleSaveCompanyRole(r.slug)}
                              disabled={saving}
                              className="mt-1.5 px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition text-[10px] font-bold flex items-center gap-1 cursor-pointer border border-indigo-500/20"
                            >
                              <Save className="w-3 h-3" /> Save Override
                            </button>
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

      {/* SubTab 3: System Capability Registry */}
      {activeSubTab === 'glossary' && (
        <div className="bg-pm-card border border-pm-border rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary">System Capability Definition Registry</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {permissions.map(p => (
              <div key={p.slug} className="p-4 bg-pm-input/30 border border-pm-border rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs text-pm-text">{p.name || p.slug}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {p.slug}
                  </span>
                </div>
                <p className="text-xs text-pm-secondary">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// @Arch[RolePermissionsModal]
import React, { useState, useEffect } from 'react';
import { Shield, Plus, Save, Trash2, Loader2, AlertCircle, Search } from 'lucide-react';
import { BaseDrawer } from '../common/BaseDrawer';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';
import { RbacRole, RbacPermission } from '../../types/adminApi';
import { AdminFetchAdapter, getApiUrl } from '../../utils/AdminFetchAdapter';

interface RolePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRolesUpdated?: () => void;
}

const DEFAULT_PERMISSIONS = [
  { slug: 'ast.query', name: 'AST Query', desc: 'Inspect product catalogs & AST schema' },
  { slug: 'ast.mutate', name: 'AST Mutate', desc: 'Execute live database & catalog mutations' },
  { slug: 'db.backup', name: 'DB Backup', desc: 'Create and download database backups' },
  { slug: 'db.restore', name: 'DB Restore', desc: 'Restore database snapshot backups' },
  { slug: 'db.drop', name: 'DB Drop', desc: 'Delete database backup files' },
  { slug: 'files.backup', name: 'Files Backup', desc: 'Archive file system directories' },
  { slug: 'files.delete', name: 'Files Delete', desc: 'Delete file backup archives' },
  { slug: 'settings.update', name: 'Settings', desc: 'Modify system governor configuration' },
  { slug: 'users.manage', name: 'Users Manage', desc: 'Create and assign client user roles' }
];

export const RolePermissionsModal: React.FC<RolePermissionsModalProps> = ({ isOpen, onClose, onRolesUpdated }) => {
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [permissions, setPermissions] = useState<RbacPermission[]>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [search, setSearch] = useState('');

  // New Custom Role Form State
  const [showAddRole, setShowAddRole] = useState(false);
  const [shouldRenderAddRole, setShouldRenderAddRole] = useState(false);
  const [isAddRoleClosing, setIsAddRoleClosing] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleSlug, setNewRoleSlug] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  const toggleAddRole = () => {
    if (showAddRole) {
      setIsAddRoleClosing(true);
      setTimeout(() => {
        setShowAddRole(false);
        setShouldRenderAddRole(false);
        setIsAddRoleClosing(false);
      }, 200);
    } else {
      setShouldRenderAddRole(true);
      setShowAddRole(true);
      setIsAddRoleClosing(false);
    }
  };

  const closeAddRoleForm = () => {
    setIsAddRoleClosing(true);
    setTimeout(() => {
      setShowAddRole(false);
      setShouldRenderAddRole(false);
      setIsAddRoleClosing(false);
    }, 200);
  };

  useEffect(() => {
    if (isOpen) {
      fetchRoles();
    }
  }, [isOpen]);

  const fetchRoles = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await AdminFetchAdapter.request(getApiUrl('api_roles'));
      const data = await res.json();
      if (data.success) {
        setRoles(data.roles || []);
        if (data.permissions) {
          setPermissions(data.permissions);
        }
      } else {
        setMessage({ text: data.error || 'Failed to load RBAC roles.', type: 'error' });
      }
    } catch (e: any) {
      setMessage({ text: 'Error connecting to RBAC API: ' + e.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (roleId: number, permSlug: string) => {
    setRoles(prev => prev.map(r => {
      if (r.id === roleId) {
        const currentPerms = r.permissions || [];
        const exists = currentPerms.includes(permSlug);
        const updated = exists
          ? currentPerms.filter(p => p !== permSlug)
          : [...currentPerms, permSlug];
        return { ...r, permissions: updated };
      }
      return r;
    }));
  };

  const handleSaveRole = async (role: RbacRole) => {
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        id: role.id,
        name: role.name,
        slug: role.slug,
        description: role.description,
        permissions: role.permissions || []
      };
      const res = await AdminFetchAdapter.request(getApiUrl('api_update_role'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: `Role "${role.name}" permissions saved successfully.`, type: 'success' });
        if (onRolesUpdated) onRolesUpdated();
      } else {
        setMessage({ text: data.error || 'Failed to save role.', type: 'error' });
      }
    } catch (e: any) {
      setMessage({ text: 'Error saving role: ' + e.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim() || !newRoleSlug.trim()) return;

    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        name: newRoleName,
        slug: newRoleSlug,
        description: newRoleDesc,
        permissions: ['ast.query']
      };
      const res = await AdminFetchAdapter.request(getApiUrl('api_create_role'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: `Custom role "${newRoleName}" created!`, type: 'success' });
        setNewRoleName('');
        setNewRoleSlug('');
        setNewRoleDesc('');
        closeAddRoleForm();
        fetchRoles();
        if (onRolesUpdated) onRolesUpdated();
      } else {
        setMessage({ text: data.error || 'Failed to create role.', type: 'error' });
      }
    } catch (e: any) {
      setMessage({ text: e.message || 'Connection error.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete custom role "${name}"?`)) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await AdminFetchAdapter.request(getApiUrl('api_delete_role'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: `Role "${name}" deleted.`, type: 'success' });
        fetchRoles();
        if (onRolesUpdated) onRolesUpdated();
      } else {
        setMessage({ text: data.error || 'Failed to delete role.', type: 'error' });
      }
    } catch (e: any) {
      setMessage({ text: e.message || 'Connection error.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const filteredPerms = permissions.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      p.slug.toLowerCase().includes(q) ||
      ((p.description || (p as any).desc) && (p.description || (p as any).desc).toLowerCase().includes(q)) ||
      (p.group_name && p.group_name.toLowerCase().includes(q))
    );
  });

  return (
    <BaseDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="RBAC Roles & Permissions Matrix"
      subtitle="Inspect platform security roles, user privileges, and granted capability permissions"
      icon={Shield}
      width="2xl"
    >
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          {/* Search Filter */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-pm-secondary" />
            <input
              type="text"
              placeholder="Search permissions by name, slug, or category..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-pm-input border border-pm-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-pm-text"
            />
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={toggleAddRole}
          >
            {showAddRole ? 'Cancel' : 'Add Custom Role'}
          </Button>
        </div>

        {message && (
          <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{message.text}</span>
          </div>
        )}

        {shouldRenderAddRole && (
          <form
            onSubmit={handleCreateRole}
            className={`p-4 bg-pm-input/30 border border-pm-border rounded-xl space-y-3 origin-top ${
              isAddRoleClosing ? 'animate-form-collapse' : 'animate-form-expand'
            }`}
          >
            <h4 className="text-xs font-bold text-pm-text uppercase tracking-wider">Create Custom Platform Role</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-pm-secondary mb-1">Role Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DevOps Auditor"
                  value={newRoleName}
                  onChange={e => {
                    setNewRoleName(e.target.value);
                    if (!newRoleSlug) setNewRoleSlug(e.target.value.replace(/[^a-zA-Z0-9]/g, ''));
                  }}
                  className="w-full bg-pm-card border border-pm-border rounded-lg px-3 py-1.5 text-xs text-pm-text"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-pm-secondary mb-1">Role Slug (ID)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DevOpsAuditor"
                  value={newRoleSlug}
                  onChange={e => setNewRoleSlug(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                  className="w-full bg-pm-card border border-pm-border rounded-lg px-3 py-1.5 text-xs text-pm-text font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-pm-secondary mb-1">Description</label>
              <input
                type="text"
                placeholder="Description of role responsibilities..."
                value={newRoleDesc}
                onChange={e => setNewRoleDesc(e.target.value)}
                className="w-full bg-pm-card border border-pm-border rounded-lg px-3 py-1.5 text-xs text-pm-text"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="neutral" size="sm" onClick={closeAddRoleForm}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Role'}
              </Button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="p-8 text-center text-pm-secondary">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-pm-primary" />
            <p className="text-xs">Loading RBAC Roles & Permission Matrix...</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-pm-border rounded-xl custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-pm-input text-pm-secondary font-bold uppercase text-[10px] border-b border-pm-border">
                  <th className="p-4 min-w-[240px] sticky left-0 bg-pm-input z-10 border-r border-pm-border/50">Capability Permission</th>
                  {roles.map(r => (
                    <th key={r.id} className="p-4 text-center min-w-[140px]">
                      <div className="flex flex-col items-center gap-1.5">
                        <StatusBadge label={r.name} customColor={r.slug === 'SuperAdmin' ? 'purple' : r.slug === 'CompanyAdmin' ? 'indigo' : 'emerald'} />
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            onClick={() => handleSaveRole(r)}
                            disabled={saving}
                            title="Save permission toggles for this role"
                            className="p-1 px-2.5 rounded bg-pm-primary/10 text-pm-primary hover:bg-pm-primary/20 transition text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Save className="w-3 h-3" /> Save
                          </button>
                          {r.is_system !== 1 && (
                            <button
                              onClick={() => handleDeleteRole(r.id, r.name)}
                              disabled={saving}
                              title="Delete custom role"
                              className="p-1 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
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
                {Object.entries(
                  filteredPerms.reduce((acc: Record<string, RbacPermission[]>, p) => {
                    const group = p.group_name || 'General System';
                    if (!acc[group]) acc[group] = [];
                    acc[group].push(p);
                    return acc;
                  }, {})
                ).map(([groupName, groupList]) => (
                  <React.Fragment key={groupName}>
                    <tr className="bg-purple-500/10 border-y border-purple-500/20">
                      <td colSpan={roles.length + 1} className="py-2.5 px-4 font-mono font-extrabold text-[11px] uppercase tracking-wider text-purple-300">
                        ⚡ {groupName}
                      </td>
                    </tr>
                    {groupList.map(p => (
                      <tr key={p.slug} className="hover:bg-pm-input/30 transition-colors">
                        <td className="p-3.5 sticky left-0 bg-pm-card border-r border-pm-border/50 z-10">
                          <div className="font-bold text-pm-text">{p.name || p.slug}</div>
                          <div className="text-[10px] text-pm-secondary leading-snug">{p.description || (p as any).desc}</div>
                        </td>
                        {roles.map(r => {
                          const hasPerm = (r.permissions || []).includes(p.slug);
                          return (
                            <td key={r.id} className="p-3.5 text-center align-middle">
                              <input
                                type="checkbox"
                                checked={hasPerm}
                                onChange={() => togglePermission(r.id, p.slug)}
                                className="w-4.5 h-4.5 rounded border-pm-border text-purple-500 focus:ring-purple-500 cursor-pointer accent-purple-500 transition-transform active:scale-95"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </BaseDrawer>
  );
};

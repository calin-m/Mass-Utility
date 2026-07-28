// @Arch[RolePermissionsModal]
import React, { useState, useEffect } from 'react';
import { Shield, Plus, Save, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { BaseModal } from '../common/BaseModal';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';
import { RbacRole, RbacPermission } from '../../types/adminApi';

interface RolePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export const RolePermissionsModal: React.FC<RolePermissionsModalProps> = ({ isOpen, onClose }) => {
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [permissions, setPermissions] = useState<RbacPermission[]>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New Custom Role Form State
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleSlug, setNewRoleSlug] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await fetch('index.php?action=api_roles');
      const data = await res.json();
      if (data && data.success) {
        if (data.roles && Array.isArray(data.roles)) {
          setRoles(data.roles);
        }
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

  useEffect(() => {
    if (isOpen) {
      fetchRoles();
    }
  }, [isOpen]);

  const togglePermission = (roleId: number, permSlug: string) => {
    setRoles(prevRoles =>
      prevRoles.map(r => {
        if (r.id === roleId) {
          const hasPerm = r.permissions.includes(permSlug);
          const updatedPerms = hasPerm
            ? r.permissions.filter(p => p !== permSlug)
            : [...r.permissions, permSlug];
          return { ...r, permissions: updatedPerms };
        }
        return r;
      })
    );
  };

  const handleSaveRole = async (role: RbacRole) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('index.php?action=api_role_update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_id: role.id,
          permissions: role.permissions
        })
      });
      const data = await res.json();
      if (data && data.success) {
        setMessage({ text: `Permissions updated for ${role.name}!`, type: 'success' });
      } else {
        setMessage({ text: data.error || 'Failed to update role permissions.', type: 'error' });
      }
    } catch (e: any) {
      setMessage({ text: e.message || 'Connection error.', type: 'error' });
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
        setMessage({ text: `Custom role '${newRoleName}' created successfully!`, type: 'success' });
        setNewRoleName('');
        setNewRoleSlug('');
        setNewRoleDesc('');
        setShowAddRole(false);
        fetchRoles();
      } else {
        setMessage({ text: data.error || 'Failed to create custom role.', type: 'error' });
      }
    } catch (e: any) {
      setMessage({ text: e.message || 'Connection error.', type: 'error' });
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
        setMessage({ text: `Custom role '${roleName}' deleted!`, type: 'success' });
        fetchRoles();
      } else {
        setMessage({ text: data.error || 'Failed to delete role.', type: 'error' });
      }
    } catch (e: any) {
      setMessage({ text: e.message || 'Connection error.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="RBAC Roles & Permissions Matrix" icon={Shield} maxWidth="xl">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <p className="text-xs text-pm-secondary">
            Manage system and custom RBAC roles and toggle granted capability permissions.
          </p>
          <Button
            variant="neutral"
            size="sm"
            onClick={() => setShowAddRole(!showAddRole)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            {showAddRole ? 'Cancel' : 'Add Custom Role'}
          </Button>
        </div>

        {message && (
          <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{message.text}</span>
          </div>
        )}

        {showAddRole && (
          <form onSubmit={handleCreateRole} className="p-4 bg-pm-input/30 border border-pm-border rounded-xl space-y-3">
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
              <Button type="button" variant="neutral" size="sm" onClick={() => setShowAddRole(false)}>
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
          <div className="overflow-x-auto border border-pm-border rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-pm-input text-pm-secondary font-bold uppercase text-[10px] border-b border-pm-border">
                  <th className="p-3 min-w-[180px]">Capability Permission</th>
                  {roles.map(r => (
                    <th key={r.id} className="p-3 text-center min-w-[120px]">
                      <div className="flex flex-col items-center gap-1">
                        <StatusBadge label={r.name} customColor={r.slug === 'SuperAdmin' ? 'purple' : r.slug === 'CompanyAdmin' ? 'indigo' : 'emerald'} />
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            onClick={() => handleSaveRole(r)}
                            disabled={saving}
                            title="Save permission toggles for this role"
                            className="p-1 rounded bg-pm-primary/10 text-pm-primary hover:bg-pm-primary/20 transition text-[10px] flex items-center gap-1 cursor-pointer"
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
                {permissions.map(p => (
                  <tr key={p.slug} className="hover:bg-pm-input/30 transition">
                    <td className="p-3">
                      <div className="font-bold text-pm-text">{p.name || p.slug}</div>
                      <div className="text-[10px] text-pm-secondary">{p.description || (p as any).desc}</div>
                    </td>
                    {roles.map(r => {
                      const hasPerm = (r.permissions || []).includes(p.slug);
                      return (
                        <td key={r.id} className="p-3 text-center align-middle">
                          <input
                            type="checkbox"
                            checked={hasPerm}
                            onChange={() => togglePermission(r.id, p.slug)}
                            className="w-4 h-4 rounded border-pm-border text-pm-primary focus:ring-pm-primary cursor-pointer accent-indigo-500"
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

        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="pm-btn-neutral px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer">
            Close Inspector
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

import React from 'react';
import { Shield, Check, Lock, X } from 'lucide-react';
import { BaseModal } from '../common/BaseModal';
import { StatusBadge } from '../common/StatusBadge';

interface RolePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROLES_MATRIX = [
  {
    role: 'SuperAdmin',
    name: 'Super Admin',
    desc: 'Full administrative access across all store systems & settings',
    color: 'purple',
    perms: ['ast.query', 'ast.mutate', 'db.backup', 'db.restore', 'db.drop', 'files.backup', 'files.delete', 'settings.update', 'users.manage']
  },
  {
    role: 'CompanyAdmin',
    name: 'Company Admin',
    desc: 'Manages company users, store licenses, and catalog operations',
    color: 'indigo',
    perms: ['ast.query', 'ast.mutate', 'db.backup', 'db.restore', 'files.backup', 'settings.update', 'users.manage']
  },
  {
    role: 'CatalogManager',
    name: 'Catalog Manager',
    desc: 'Inspects product structures and executes AST catalog mutations',
    color: 'emerald',
    perms: ['ast.query', 'ast.mutate', 'db.backup', 'files.backup']
  },
  {
    role: 'Operator',
    name: 'Operator',
    desc: 'Runs scheduled database snapshots and file system archives',
    color: 'amber',
    perms: ['ast.query', 'db.backup', 'files.backup']
  },
  {
    role: 'Observer',
    name: 'Observer',
    desc: 'Read-only access to query product AST & view system telemetry',
    color: 'slate',
    perms: ['ast.query']
  }
];

const PERMISSIONS = [
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
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="RBAC Roles & Permissions Matrix" icon={Shield} maxWidth="xl">
      <div className="space-y-6">
        <p className="text-xs text-pm-secondary">
          Review default security capability permissions mapped across each platform RBAC role.
        </p>

        <div className="overflow-x-auto border border-pm-border rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-pm-input text-pm-secondary font-bold uppercase text-[10px] border-b border-pm-border">
                <th className="p-3">Capability Permission</th>
                {ROLES_MATRIX.map(r => (
                  <th key={r.role} className="p-3 text-center min-w-[100px]">
                    <StatusBadge label={r.name} customColor={r.color as any} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-pm-border">
              {PERMISSIONS.map(p => (
                <tr key={p.slug} className="hover:bg-pm-input/30 transition">
                  <td className="p-3">
                    <div className="font-bold text-pm-text">{p.name}</div>
                    <div className="text-[10px] text-pm-secondary">{p.desc}</div>
                  </td>
                  {ROLES_MATRIX.map(r => {
                    const hasPerm = r.perms.includes(p.slug);
                    return (
                      <td key={r.role} className="p-3 text-center align-middle">
                        {hasPerm ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-pm-input/50 text-pm-secondary/40">
                            <Lock className="w-3 h-3" />
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="pm-btn-neutral px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer">
            Close Inspector
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

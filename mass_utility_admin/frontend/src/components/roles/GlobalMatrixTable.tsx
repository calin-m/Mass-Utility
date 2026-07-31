// @Arch[GlobalMatrixTable]
import React from 'react';
import { Save, Loader2 } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';
import { RbacRole, RbacPermission } from '../../types/adminApi';

interface GlobalMatrixTableProps {
  roles: RbacRole[];
  permissions: RbacPermission[];
  loading: boolean;
  saving: boolean;
  onTogglePermission: (roleId: number, permSlug: string) => void;
  onSaveRole: (role: RbacRole) => void;
}

export const GlobalMatrixTable: React.FC<GlobalMatrixTableProps> = ({
  roles,
  permissions,
  loading,
  saving,
  onTogglePermission,
  onSaveRole
}) => {
  if (loading) {
    return (
      <div className="p-8 text-center text-pm-secondary bg-pm-card border border-pm-border rounded-2xl">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-pm-primary" />
        <p className="text-xs">Loading Global RBAC Matrix...</p>
      </div>
    );
  }

  // Group permissions by group_name
  const groupedPerms = permissions.reduce((acc: Record<string, RbacPermission[]>, p) => {
    const group = p.group_name || 'General System';
    if (!acc[group]) acc[group] = [];
    acc[group].push(p);
    return acc;
  }, {});

  return (
    <div className="bg-pm-card border border-pm-border rounded-2xl p-5 shadow-sm space-y-4">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary">Global System Permission Matrix</h3>
        <p className="text-[11px] text-pm-secondary mt-0.5">
          Toggle default capability permissions for each platform role across all tenant stores.
        </p>
      </div>

      <div className="overflow-x-auto border border-pm-border rounded-xl custom-scrollbar">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-pm-input text-pm-secondary font-bold uppercase text-[10px] border-b border-pm-border">
              <th className="p-4 min-w-[260px] sticky left-0 bg-pm-input z-10 border-r border-pm-border/50">Capability Permission</th>
              {roles.map(r => (
                <th key={r.id} className="p-4 text-center min-w-[150px]">
                  <div className="flex flex-col items-center gap-2">
                    <StatusBadge label={r.name} customColor={r.slug === 'SuperAdmin' || r.slug === 'Owner' || r.slug === 'owner' ? 'purple' : r.slug === 'CompanyAdmin' ? 'indigo' : 'emerald'} />
                    <Button
                      variant="neutral"
                      size="sm"
                      icon={Save}
                      disabled={saving}
                      onClick={() => onSaveRole(r)}
                      className="text-[10px] py-1 px-2.5 shadow-sm"
                    >
                      Save Role
                    </Button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-pm-border">
            {Object.entries(groupedPerms).map(([groupName, groupList]) => (
              <React.Fragment key={groupName}>
                {/* Category Header Row */}
                <tr className="bg-purple-500/10 border-y border-purple-500/20">
                  <td colSpan={roles.length + 1} className="py-2.5 px-4 font-mono font-extrabold text-[11px] uppercase tracking-wider text-purple-300">
                    ⚡ {groupName}
                  </td>
                </tr>
                {/* Category Permission Rows */}
                {groupList.map(p => (
                  <tr key={p.slug} className="hover:bg-pm-input/30 transition-colors">
                    <td className="p-3.5 sticky left-0 bg-pm-card border-r border-pm-border/50 z-10">
                      <div className="font-bold text-pm-text">{p.name || p.slug}</div>
                      <div className="text-[10px] text-pm-secondary leading-snug">{p.description}</div>
                    </td>
                    {roles.map(r => {
                      const hasPerm = (r.permissions || []).includes(p.slug);
                      return (
                        <td key={r.id} className="p-3.5 text-center align-middle">
                          <input
                            type="checkbox"
                            checked={hasPerm}
                            onChange={() => onTogglePermission(r.id, p.slug)}
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
    </div>
  );
};

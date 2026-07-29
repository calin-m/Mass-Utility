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

  return (
    <div className="bg-pm-card border border-pm-border rounded-2xl p-5 shadow-sm space-y-4">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary">Global System Permission Matrix</h3>
        <p className="text-[11px] text-pm-secondary mt-0.5">
          Toggle default capability permissions for each platform role.
        </p>
      </div>

      <div className="overflow-x-auto border border-pm-border rounded-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-pm-input text-pm-secondary font-bold uppercase text-[10px] border-b border-pm-border">
              <th className="p-3.5 min-w-[220px]">Capability Permission</th>
              {roles.map(r => (
                <th key={r.id} className="p-3.5 text-center min-w-[130px]">
                  <div className="flex flex-col items-center gap-1.5">
                    <StatusBadge label={r.name} customColor={r.slug === 'SuperAdmin' || r.slug === 'Owner' || r.slug === 'owner' ? 'purple' : r.slug === 'CompanyAdmin' ? 'indigo' : 'emerald'} />
                    <Button
                      variant="neutral"
                      size="sm"
                      icon={Save}
                      disabled={saving}
                      onClick={() => onSaveRole(r)}
                      className="text-[10px] py-0.5 px-2"
                    >
                      Save
                    </Button>
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
                        onChange={() => onTogglePermission(r.id, p.slug)}
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
    </div>
  );
};

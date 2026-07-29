// @Arch[RoleCard]
import React from 'react';
import { Copy, Trash2, ExternalLink, Shield, Users as UsersIcon } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';
import { RbacRole } from '../../types/adminApi';

interface RoleCardProps {
  role: RbacRole;
  userCount: number;
  onClone: (role: RbacRole) => void;
  onDelete: (role: RbacRole) => void;
  onFilterUserByRole?: (roleSlug: string) => void;
}

export const RoleCard: React.FC<RoleCardProps> = ({
  role,
  userCount,
  onClone,
  onDelete,
  onFilterUserByRole
}) => {
  const isSystem = role.is_system === 1;

  return (
    <div className="p-4 bg-pm-card border border-pm-border rounded-xl space-y-3 flex flex-col justify-between hover:border-pm-border/80 transition shadow-sm">
      <div className="space-y-2.5">
        {/* Card Header: Badge & Status */}
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-2" title={`System Role Slug: ${role.slug}`}>
            <StatusBadge
              label={role.name}
              customColor={role.slug === 'SuperAdmin' || role.slug === 'Owner' || role.slug === 'owner' ? 'purple' : role.slug === 'CompanyAdmin' ? 'indigo' : 'emerald'}
            />
          </div>

          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
            isSystem ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}>
            {isSystem ? '🔒 Canonical' : '✨ Custom'}
          </span>
        </div>

        {/* Role Description */}
        <p className="text-xs text-pm-secondary line-clamp-2 leading-relaxed">
          {role.description || 'Platform security role definition'}
        </p>
      </div>

      {/* Card Footer: Users Count & Action Buttons */}
      <div className="pt-3 border-t border-pm-border/50 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-pm-input border border-pm-border text-pm-text font-bold text-[11px]">
            <UsersIcon className="w-3 h-3 text-indigo-400" /> {userCount} Active
          </span>
          {onFilterUserByRole && userCount > 0 && (
            <button
              onClick={() => onFilterUserByRole(role.slug)}
              title="Filter Client Directory by this role"
              className="p-1 text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-0.5 text-[11px] font-bold cursor-pointer"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="neutral"
            size="sm"
            icon={Copy}
            onClick={() => onClone(role)}
            className="text-[10px] py-1 px-2"
          >
            Clone
          </Button>

          {!isSystem && (
            <button
              onClick={() => onDelete(role)}
              title="Delete Role"
              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition cursor-pointer border border-rose-500/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

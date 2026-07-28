// @Arch[RoleDeletionGuardModal]
import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { BaseModal } from '../common/BaseModal';
import { Button } from '../common/Button';
import { RbacRole } from '../../types/adminApi';

interface RoleDeletionGuardModalProps {
  deletingRole: RbacRole | null;
  roles: RbacRole[];
  userCount: number;
  reassignRole: string;
  saving: boolean;
  onReassignChange: (roleSlug: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export const RoleDeletionGuardModal: React.FC<RoleDeletionGuardModalProps> = ({
  deletingRole,
  roles,
  userCount,
  reassignRole,
  saving,
  onReassignChange,
  onConfirm,
  onClose
}) => {
  if (!deletingRole) return null;

  return (
    <BaseModal isOpen={Boolean(deletingRole)} onClose={onClose} title="Role Deletion Safeguard Notice" icon={AlertTriangle} maxWidth="md">
      <div className="space-y-4">
        <p className="text-xs text-pm-secondary leading-relaxed">
          Role <strong className="text-pm-text">{deletingRole.name}</strong> cannot be deleted directly because it is currently assigned to <strong className="text-indigo-400 font-bold">{userCount} active client account(s)</strong>.
        </p>

        <div className="p-3.5 bg-pm-input/40 border border-pm-border rounded-xl space-y-2 text-xs">
          <label className="block font-bold text-pm-text">Reassign Affected Users To:</label>
          <select
            value={reassignRole}
            onChange={e => onReassignChange(e.target.value)}
            className="w-full bg-pm-card border border-pm-border rounded-lg px-3 py-1.5 text-xs text-pm-text font-bold cursor-pointer"
          >
            {roles.filter(r => r.slug !== deletingRole.slug).map(r => (
              <option key={r.id} value={r.slug}>{r.name} ({r.slug})</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="neutral" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm} disabled={saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Reassign Users & Delete Role'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

// @Arch[ReassignLicenseModal]
import React from 'react';
import { User } from 'lucide-react';
import { BaseModal } from '../common/BaseModal';
import { FormSelect } from '../common/FormSelect';
import { Button } from '../common/Button';
import { UserAccount } from '../LicensesTab';

interface ReassignLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  reassignUserId: number;
  onUserIdChange: (id: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
}

export const ReassignLicenseModal: React.FC<ReassignLicenseModalProps> = ({
  isOpen,
  onClose,
  users,
  reassignUserId,
  onUserIdChange,
  onSubmit,
  submitting,
}) => {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Reassign License Key to Client"
      icon={User}
      maxWidth="md"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <FormSelect
          label="Select New Client Owner"
          icon={User}
          value={reassignUserId}
          onChange={(e) => onUserIdChange(Number(e.target.value))}
          options={[
            { value: '0', label: '-- Unassign (Standalone Key) --' },
            ...users.map((u) => ({
              value: String(u.id),
              label: `${u.name || u.email} (${u.email})`,
            })),
          ]}
        />
        <div className="flex justify-end gap-3 pt-3 border-t border-pm-border">
          <Button type="button" variant="neutral" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="md" loading={submitting}>
            Confirm Reassignment
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};

import React from 'react';
import { Plus } from 'lucide-react';
import { BaseModal } from '../common/BaseModal';
import { FormInput } from '../common/FormInput';
import { Button } from '../common/Button';

export interface CreateTierModalProps {
  isOpen: boolean;
  newTierName: string;
  cloneFromTier: string;
  loading: boolean;
  onClose: () => void;
  onChangeNewTierName: (val: string) => void;
  onChangeCloneFromTier: (val: string) => void;
  onCreateTier: () => void;
}

export const CreateTierModal: React.FC<CreateTierModalProps> = ({
  isOpen,
  newTierName,
  cloneFromTier,
  loading,
  onClose,
  onChangeNewTierName,
  onChangeCloneFromTier,
  onCreateTier,
}) => {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Package Tier"
    >
      <div className="space-y-4">
        <p className="text-xs text-pm-secondary">
          Create or clone a package tier preset with custom capabilities and quotas.
        </p>

        <FormInput
          label="Tier Name"
          value={newTierName}
          onChange={(e) => onChangeNewTierName(e.target.value)}
          placeholder="e.g. Agency, Starter, Lifetime, Developer"
        />

        <div className="space-y-1">
          <label className="text-xs font-semibold text-pm-text block">
            Clone Capabilities & Quotas From Template
          </label>
          <select
            value={cloneFromTier}
            onChange={(e) => onChangeCloneFromTier(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-pm-bg border border-pm-border rounded-lg text-pm-text focus:ring-1 focus:ring-pm-primary focus:outline-none"
          >
            <option value="basic">Basic Preset (Essential)</option>
            <option value="pro">Pro Preset (Growth & Automation)</option>
            <option value="enterprise">Enterprise Preset (Full Autopilot)</option>
            <option value="developer">Developer Preset (High-Capacity Multi-Store & Full AST)</option>
          </select>

        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-pm-border">
          <Button
            variant="neutral"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={onCreateTier}
            loading={loading}
          >
            Create Tier
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

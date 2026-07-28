// @Arch[CapabilityGlossaryModal]
import React from 'react';
import { BookOpen } from 'lucide-react';
import { BaseModal } from '../common/BaseModal';
import { Button } from '../common/Button';
import { RbacPermission } from '../../types/adminApi';

interface CapabilityGlossaryModalProps {
  isOpen: boolean;
  permissions: RbacPermission[];
  onClose: () => void;
}

export const CapabilityGlossaryModal: React.FC<CapabilityGlossaryModalProps> = ({
  isOpen,
  permissions,
  onClose
}) => {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="System Capability Definition Registry" icon={BookOpen} maxWidth="lg">
      <div className="space-y-4">
        <p className="text-xs text-pm-secondary">
          Reference guide of all security capability permissions across mass_utility_dashboard.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
          {permissions.map(p => (
            <div key={p.slug} className="p-3 bg-pm-input/30 border border-pm-border rounded-xl space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs text-pm-text">{p.name || p.slug}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {p.slug}
                </span>
              </div>
              <p className="text-[11px] text-pm-secondary">{p.description}</p>
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-2">
          <Button variant="neutral" size="sm" onClick={onClose}>
            Close Glossary
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

// @Arch[IssueLicenseModal]
import React, { useState } from 'react';
import { PlusCircle, User, Package, Calendar, Globe } from 'lucide-react';
import { BaseModal } from './BaseModal';
import { Button } from './Button';
import { FormInput } from './FormInput';
import { FormSelect } from './FormSelect';
import { useTranslation } from '../../i18n/LanguageContext';
import { UserAccount } from '../../types/adminApi';
import { DomainTagSelector } from './DomainTagSelector';

export interface IssueLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  tierOptions: { value: string; label: string }[];
  onGenerate: (userId: number, tier: string, expires: string, storeUrl: string) => Promise<void>;
}

export const IssueLicenseModal: React.FC<IssueLicenseModalProps> = ({
  isOpen,
  onClose,
  users = [],
  tierOptions = [],
  onGenerate,
}) => {
  const { t } = useTranslation();
  const [userId, setUserId] = useState<number>(users[0]?.id || 0);
  const [tier, setTier] = useState<string>('basic');
  const [expires, setExpires] = useState<string>('');
  const [storeUrl, setStoreUrl] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const clientOptions = [
    { value: '0', label: '-- Select Client Account (Standalone Key) --' },
    ...users.map((u) => ({
      value: String(u.id),
      label: `${u.name || u.email} (${u.email})${u.company_name ? ` - ${u.company_name}` : ''}`,
    })),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onGenerate(userId, tier, expires, storeUrl);
      onClose();
      // Reset form
      setExpires('');
      setStoreUrl('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Issue New Software License Key"
      icon={PlusCircle}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormSelect
          label="Target Client Account"
          icon={User}
          value={userId}
          onChange={(e) => setUserId(Number(e.target.value))}
          options={clientOptions}
        />

        <FormSelect
          label="Package Tier"
          icon={Package}
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          options={tierOptions}
        />

        <FormInput
          label="Optional Expiry Date"
          icon={Calendar}
          type="date"
          value={expires}
          onChange={(e) => setExpires(e.target.value)}
        />

        <DomainTagSelector
          value={storeUrl}
          onChange={setStoreUrl}
          label="Allowed Store Domains (Optional)"
          placeholder="Type store domain origin (e.g. store.myshop.com) and press Enter..."
          helperText="Type domain origin host and press Enter/Comma. Leave empty for unbound key."
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-pm-border">
          <Button type="button" variant="neutral" size="md" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="md" icon={PlusCircle} loading={submitting}>
            {t('btn_generate')}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};

// @Arch[ClientModalForm]
import React, { useState } from 'react';
import { BaseModal } from '../common/BaseModal';
import { FormInput } from '../common/FormInput';
import { FormSelect } from '../common/FormSelect';
import { Button } from '../common/Button';
import { useTranslation } from '../../i18n/LanguageContext';

interface ClientModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { email: string; name: string; role: string; company: string }) => Promise<void>;
  initialData?: {
    email?: string;
    name?: string;
    role?: string;
    company?: string;
  };
  companies: Array<{ id: number; company_name: string }>;
  title: string;
}

export const ClientModalForm: React.FC<ClientModalFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  companies,
  title,
}) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState(initialData?.email || '');
  const [name, setName] = useState(initialData?.name || '');
  const [role, setRole] = useState(initialData?.role || 'Observer');
  const [company, setCompany] = useState(initialData?.company || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await onSubmit({ email, name, role, company });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <FormInput
          label="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <FormSelect
          label="Access Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          options={[
            { value: 'Owner', label: 'Owner' },
            { value: 'Manager', label: 'Manager' },
            { value: 'Member', label: 'Member' },
            { value: 'Observer', label: 'Observer' }
          ]}
        />
        <FormSelect
          label="Associated Company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          options={[
            { value: '', label: 'Standalone (No Company)' },
            ...companies.map(c => ({ value: c.company_name, label: c.company_name }))
          ]}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="neutral" onClick={onClose}>
            {t('btn_cancel')}
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {t('btn_save')}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};

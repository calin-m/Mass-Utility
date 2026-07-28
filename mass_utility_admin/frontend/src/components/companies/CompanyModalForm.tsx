// @Arch[CompanyModalForm]
import React, { useState } from 'react';
import { BaseModal } from '../common/BaseModal';
import { FormInput } from '../common/FormInput';
import { FormSelect } from '../common/FormSelect';
import { Button } from '../common/Button';
import { useTranslation } from '../../i18n/LanguageContext';

interface CompanyModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { company_name: string; tax_id: string; max_licenses: number; status: string }) => Promise<void>;
  initialData?: {
    company_name?: string;
    tax_id?: string;
    max_licenses?: number;
    status?: string;
  };
  title: string;
}

export const CompanyModalForm: React.FC<CompanyModalFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState(initialData?.company_name || '');
  const [taxId, setTaxId] = useState(initialData?.tax_id || '');
  const [maxLicenses, setMaxLicenses] = useState(initialData?.max_licenses || 10);
  const [status, setStatus] = useState(initialData?.status || 'active');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onSubmit({ company_name: name, tax_id: taxId, max_licenses: maxLicenses, status });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput
          label="Company Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <FormInput
          label="Tax ID / VAT"
          value={taxId}
          onChange={(e) => setTaxId(e.target.value)}
        />
        <FormInput
          label="Max License Capacity"
          type="number"
          value={maxLicenses}
          onChange={(e) => setMaxLicenses(parseInt(e.target.value) || 1)}
          min={1}
          required
        />
        <FormSelect
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'suspended', label: 'Suspended' }
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

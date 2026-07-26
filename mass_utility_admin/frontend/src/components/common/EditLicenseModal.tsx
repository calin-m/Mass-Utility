import React, { useState, useEffect, useMemo } from 'react';
import { Edit, Key, Building2, User, Globe, Calendar, RefreshCw, Check, Sparkles } from 'lucide-react';
import { BaseModal } from './BaseModal';
import { FormSelect } from './FormSelect';
import { FormInput } from './FormInput';
import { Button } from './Button';
import { License, UserAccount, Company } from '../../types/adminApi';
import { getSortedTierOptions } from '../../utils/tierUtils';
import { useTranslation } from '../../i18n/LanguageContext';

export interface EditLicenseData {
  package_tier: string;
  status: string;
  store_url?: string;
  expires_at?: string;
  user_id?: number | '';
  company_id?: number | '';
}

export interface EditLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  license: License | null;
  companies?: Company[];
  users?: UserAccount[];
  tiers?: any[];
  onSave: (licenseId: number, data: EditLicenseData) => Promise<void>;
}

export const EditLicenseModal: React.FC<EditLicenseModalProps> = ({
  isOpen,
  onClose,
  license,
  companies = [],
  users = [],
  tiers = [],
  onSave,
}) => {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [editTier, setEditTier] = useState('pro');
  const [editStatus, setEditStatus] = useState<'active' | 'suspended' | 'expired'>('active');
  const [editStoreUrl, setEditStoreUrl] = useState('');
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const [editCompanyId, setEditCompanyId] = useState<number | ''>('');
  const [editUserId, setEditUserId] = useState<number | ''>('');

  const tierOptions = useMemo(() => getSortedTierOptions(tiers), [tiers]);

  // Sync state whenever license prop changes or modal opens
  useEffect(() => {
    if (license) {
      setEditTier(license.package_tier || 'pro');
      setEditStatus((license.status as any) || 'active');
      setEditStoreUrl(license.store_url || '');
      setEditExpiresAt(license.expires_at ? license.expires_at.split(' ')[0] : '');

      // Resolve Company ID
      let resolvedCompId: number | '' = '';
      if (license.company_id) {
        resolvedCompId = Number(license.company_id);
      } else if (license.company_name) {
        const found = companies.find(c => (c.company_name || '').toLowerCase() === (license.company_name || '').toLowerCase());
        if (found) resolvedCompId = Number(found.id);
      }
      setEditCompanyId(resolvedCompId);

      // Resolve User ID
      let resolvedUserId: number | '' = '';
      if (license.user_id) {
        resolvedUserId = Number(license.user_id);
      } else if (license.user_email) {
        const foundU = users.find(u => (u.email || '').toLowerCase() === (license.user_email || '').toLowerCase());
        if (foundU) resolvedUserId = Number(foundU.id);
      }
      setEditUserId(resolvedUserId);
    }
  }, [license, companies, users]);

  // Dynamic Filtered Users based on selected Company
  const filteredUsers = useMemo(() => {
    if (!editCompanyId) {
      // If no company selected, return all users
      return users;
    }
    const selectedComp = companies.find(c => Number(c.id) === Number(editCompanyId));
    const compName = selectedComp ? (selectedComp.company_name || '').toLowerCase() : '';

    return users.filter(u => {
      if (u.company_id && Number(u.company_id) === Number(editCompanyId)) return true;
      if (compName && u.company_name && u.company_name.toLowerCase() === compName) return true;
      return false;
    });
  }, [users, companies, editCompanyId]);

  // Handle Company Selection Change (Company -> Client Filter)
  const handleCompanyChange = (newCompId: string) => {
    const parsedId = newCompId ? Number(newCompId) : '';
    setEditCompanyId(parsedId);

    if (parsedId !== '') {
      // Check if current editUserId belongs to the new company
      const selectedComp = companies.find(c => Number(c.id) === parsedId);
      const compName = selectedComp ? (selectedComp.company_name || '').toLowerCase() : '';

      const currentU = users.find(u => Number(u.id) === Number(editUserId));
      if (currentU) {
        const matchesCompId = currentU.company_id && Number(currentU.company_id) === parsedId;
        const matchesCompName = compName && currentU.company_name && currentU.company_name.toLowerCase() === compName;
        if (!matchesCompId && !matchesCompName) {
          setEditUserId(''); // Reset to Unassigned Company Pool Key
        }
      }
    }
  };

  // Handle Client Selection Change (Client -> Auto-Parent Company)
  const handleUserChange = (newUserId: string) => {
    const parsedId = newUserId ? Number(newUserId) : '';
    setEditUserId(parsedId);

    if (parsedId !== '') {
      const selectedU = users.find(u => Number(u.id) === parsedId);
      if (selectedU) {
        // Auto-parent company if client belongs to a company
        let parentCompId: number | '' = '';
        if (selectedU.company_id) {
          parentCompId = Number(selectedU.company_id);
        } else if (selectedU.company_name) {
          const foundC = companies.find(c => (c.company_name || '').toLowerCase() === (selectedU.company_name || '').toLowerCase());
          if (foundC) parentCompId = Number(foundC.id);
        }
        if (parentCompId !== '') {
          setEditCompanyId(parentCompId);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!license) return;

    setSubmitting(true);
    try {
      await onSave(license.id, {
        package_tier: editTier,
        status: editStatus,
        store_url: editStoreUrl,
        expires_at: editExpiresAt,
        company_id: editCompanyId,
        user_id: editUserId,
      });
      onClose();
    } catch (err) {
      // Error handled by parent component
    } finally {
      setSubmitting(false);
    }
  };

  if (!license) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit License Key #${license.id}`}
      icon={Edit}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* License Key Display Header */}
        <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-purple-400">License Key</label>
          <div className="font-mono text-sm font-bold text-purple-300 select-all tracking-wider">
            🔑 {license.license_key}
          </div>
        </div>

        {/* Tier & Status Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormSelect
            label="Package Tier"
            value={editTier}
            onChange={e => setEditTier(e.target.value)}
            options={tierOptions}
          />

          <FormSelect
            label="License Status"
            value={editStatus}
            onChange={e => setEditStatus(e.target.value as any)}
            options={[
              { value: 'active', label: '🟢 ACTIVE' },
              { value: 'suspended', label: '🔴 SUSPENDED' },
              { value: 'expired', label: '🟠 EXPIRED' },
            ]}
          />
        </div>

        {/* Cascading Company & Client Assignment Section */}
        <div className="p-4 bg-pm-input/30 border border-pm-border rounded-xl space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-purple-400" /> B2B / B2C License Assignment & Hierarchy
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Assigned Company Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-pm-secondary mb-1">Assigned Organization / Company</label>
              <select
                value={editCompanyId}
                onChange={e => handleCompanyChange(e.target.value)}
                className="w-full bg-pm-card border border-pm-border rounded-lg px-3 py-2 text-xs font-semibold text-pm-text focus:border-purple-500 focus:outline-none"
              >
                <option value="">-- Standalone B2C / Unassigned Company --</option>
                {companies.map(c => {
                  const used = Number(c.license_count || 0);
                  const max = Number(c.max_licenses || 10);
                  return (
                    <option key={c.id} value={c.id}>
                      🏢 {c.company_name} ({used}/{max} Keys)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Filtered Client Account Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-pm-secondary mb-1">
                Assigned Client Account {editCompanyId ? `(Filtered to Company)` : ''}
              </label>
              <select
                value={editUserId}
                onChange={e => handleUserChange(e.target.value)}
                className="w-full bg-pm-card border border-pm-border rounded-lg px-3 py-2 text-xs font-semibold text-pm-text focus:border-purple-500 focus:outline-none"
              >
                <option value="">-- Unassigned (Company / Global Pool Key) --</option>
                {filteredUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    👤 {u.name ? `${u.name} (${u.email})` : u.email} {u.company_name ? `• 🏢 ${u.company_name}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Bound Store Domain & 1-Click Clear Button */}
        <div className="space-y-1">
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-pm-secondary">Bound Store Domain</label>
            {editStoreUrl && (
              <button
                type="button"
                onClick={() => setEditStoreUrl('')}
                className="text-[11px] text-purple-400 hover:underline flex items-center gap-1 font-mono"
              >
                🧹 Clear Domain Binding
              </button>
            )}
          </div>
          <input
            type="text"
            placeholder="e.g. store.myshop.com (Leave blank for unbound)"
            value={editStoreUrl}
            onChange={e => setEditStoreUrl(e.target.value)}
            className="w-full bg-pm-card border border-pm-border rounded-lg px-3 py-2 text-xs font-mono text-pm-text focus:border-purple-500 focus:outline-none"
          />
        </div>

        {/* Expiration Date Picker */}
        <div>
          <label className="block text-xs font-semibold text-pm-secondary mb-1">Expiration Date (Leave blank for Lifetime)</label>
          <input
            type="date"
            value={editExpiresAt}
            onChange={e => setEditExpiresAt(e.target.value)}
            className="w-full bg-pm-card border border-pm-border rounded-lg px-3 py-2 text-xs font-mono text-pm-text focus:border-purple-500 focus:outline-none"
          />
        </div>

        {/* Action Controls */}
        <div className="flex justify-end gap-3 pt-4 border-t border-pm-border">
          <Button variant="neutral" size="sm" type="button" onClick={onClose}>
            {t('btn_cancel')}
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={submitting} icon={Check}>
            {submitting ? 'Saving...' : 'Save License Changes'}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};

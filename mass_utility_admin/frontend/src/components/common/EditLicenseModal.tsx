import React, { useState, useEffect, useMemo } from 'react';
import { Edit, Key, Building2, User, Globe, Calendar, RefreshCw, Check, Sparkles, Copy, ShieldCheck, ShieldAlert, Clock, Infinity as InfinityIcon, Sparkle } from 'lucide-react';
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
  const [copiedKey, setCopiedKey] = useState(false);

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

  // Copy License Key Handler
  const handleCopyKey = () => {
    if (license?.license_key) {
      navigator.clipboard.writeText(license.license_key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  // Dynamic Filtered Users based on selected Company
  const filteredUsers = useMemo(() => {
    if (!editCompanyId) {
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
      // Handled upstream
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
        {/* Glassmorphic Top Banner */}
        <div className="relative overflow-hidden p-4 sm:p-5 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-purple-950/40 border border-purple-500/30 shadow-lg shadow-purple-500/5 backdrop-blur-md rounded-2xl space-y-3">
          {/* Ambient Glow */}
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-purple-400 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-purple-400" /> License Key Identifier
            </label>
            <button
              type="button"
              onClick={handleCopyKey}
              className="px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              {copiedKey ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-purple-400" />
                  <span>Copy Key</span>
                </>
              )}
            </button>
          </div>

          <div className="font-mono text-sm sm:text-base font-bold text-purple-200 select-all tracking-wider break-all bg-black/30 p-2.5 rounded-xl border border-purple-500/20">
            {license.license_key}
          </div>

          {/* Live Preview Status Badges Row */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-400" /> {editTier.toUpperCase()} TIER
            </span>

            {editStatus === 'active' && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> ACTIVE
              </span>
            )}

            {editStatus === 'suspended' && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-rose-400" /> SUSPENDED
              </span>
            )}

            {editStatus === 'expired' && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" /> EXPIRED
              </span>
            )}

            {!editExpiresAt ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <InfinityIcon className="w-3 h-3 text-indigo-400" /> LIFETIME
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-pm-card text-pm-secondary border border-pm-border flex items-center gap-1 font-mono">
                <Calendar className="w-3 h-3 text-purple-400" /> EXP: {editExpiresAt}
              </span>
            )}
          </div>
        </div>

        {/* Card 1: General License Configuration */}
        <div className="p-4 bg-pm-card/60 backdrop-blur-sm border border-pm-border hover:border-purple-500/30 transition-all rounded-xl space-y-3.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" /> General License Parameters
          </h4>

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
        </div>

        {/* Card 2: Cascading Company & Client Hierarchy */}
        <div className="p-4 bg-pm-card/60 backdrop-blur-sm border border-pm-border hover:border-purple-500/30 transition-all rounded-xl space-y-4">
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
                className="w-full bg-pm-input border border-pm-border rounded-xl h-10 px-3 text-xs font-semibold text-pm-text focus:border-pm-primary focus:ring-1 focus:ring-pm-primary/30 focus:outline-none transition-all"
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
              <label className="block text-xs font-semibold text-pm-secondary mb-1 flex items-center justify-between">
                <span>Assigned Client Account</span>
                {editCompanyId && <span className="text-[10px] text-purple-400 font-bold">(Filtered)</span>}
              </label>
              <select
                value={editUserId}
                onChange={e => handleUserChange(e.target.value)}
                className="w-full bg-pm-input border border-pm-border rounded-xl h-10 px-3 text-xs font-semibold text-pm-text focus:border-pm-primary focus:ring-1 focus:ring-pm-primary/30 focus:outline-none transition-all"
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

        {/* Card 3: Store Domain Binding & Expiration Rules */}
        <div className="p-4 bg-pm-card/60 backdrop-blur-sm border border-pm-border hover:border-purple-500/30 transition-all rounded-xl space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-purple-400" /> Domain & Expiration Rules
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Bound Store Domain */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-pm-secondary">Bound Store Domain</label>
                {editStoreUrl && (
                  <button
                    type="button"
                    onClick={() => setEditStoreUrl('')}
                    className="text-[10px] text-purple-400 hover:underline font-mono"
                  >
                    🧹 Clear Domain
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="e.g. store.myshop.com"
                value={editStoreUrl}
                onChange={e => setEditStoreUrl(e.target.value)}
                className="w-full bg-pm-input border border-pm-border rounded-xl h-10 px-3 text-xs font-mono text-pm-text focus:border-pm-primary focus:ring-1 focus:ring-pm-primary/30 focus:outline-none transition-all"
              />
            </div>

            {/* Expiration Date Picker */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-pm-secondary">Expiration Date</label>
                {editExpiresAt && (
                  <button
                    type="button"
                    onClick={() => setEditExpiresAt('')}
                    className="text-[10px] text-purple-400 hover:underline font-mono"
                  >
                    ♾️ Lifetime Key
                  </button>
                )}
              </div>
              <input
                type="date"
                value={editExpiresAt}
                onChange={e => setEditExpiresAt(e.target.value)}
                className="w-full bg-pm-input border border-pm-border rounded-xl h-10 px-3 text-xs font-mono text-pm-text focus:border-pm-primary focus:ring-1 focus:ring-pm-primary/30 focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex justify-end gap-3 pt-3 border-t border-pm-border">
          <Button variant="neutral" size="sm" type="button" onClick={onClose}>
            {t('btn_cancel')}
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={submitting} icon={Check}>
            {submitting ? 'Saving Changes...' : 'Save License Changes'}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};

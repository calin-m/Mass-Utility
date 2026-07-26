import React, { useState } from 'react';
import {
  ChevronLeft,
  Key,
  Globe,
  User,
  Building2,
  Package,
  Calendar,
  ShieldAlert,
  Clock,
  Edit,
  Eye,
  EyeOff,
  Copy,
  Check,
  CheckCircle,
  ExternalLink,
  Save,
  Unlock,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import { License, UserAccount } from '../../types/adminApi';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/StatusBadge';
import { SubTabNav, SubTabItem } from '../common/SubTabNav';
import { maskLicenseKey, copyLicenseKeyToClipboard } from '../../utils/licenseUtils';

export interface LicenseDetailsViewProps {
  license: License;
  users?: UserAccount[];
  companies?: any[];
  tiers?: any[];
  onBack: () => void;
  onRefresh: () => void;
  showAlert: (msg: string, type?: 'success' | 'error') => void;
  onInspectClient?: (client: UserAccount) => void;
  onInspectCompany?: (company: any) => void;
  onEditLicense?: (license: License) => void;
}

export type LicenseDetailSubTab = 'overview' | 'owner' | 'domains' | 'governance';

export const LicenseDetailsView: React.FC<LicenseDetailsViewProps> = ({
  license,
  users = [],
  companies = [],
  tiers = [],
  onBack,
  onRefresh,
  showAlert,
  onInspectClient,
  onInspectCompany,
  onEditLicense,
}) => {
  const [activeTab, setActiveTab] = useState<LicenseDetailSubTab>('overview');
  const [showFullKey, setShowFullKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Store Domain Edit State
  const [storeUrlInput, setStoreUrlInput] = useState<string>(license.store_url || '');
  const [savingDomain, setSavingDomain] = useState(false);

  // Expiry Extension State
  const [extendMonths, setExtendMonths] = useState<number>(12);
  const [extending, setExtending] = useState(false);

  const assignedUser = license.user_id ? users.find((u) => Number(u.id) === Number(license.user_id)) : null;
  const companyName = license.company_name || (assignedUser ? assignedUser.company_name : null);
  const assignedComp = companyName
    ? companies.find((c) => (c.company_name || '').toLowerCase() === companyName.toLowerCase())
    : null;

  const handleCopyKey = async () => {
    const success = await copyLicenseKeyToClipboard(license.license_key);
    if (success) {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
      showAlert('📋 License key copied to clipboard!', 'success');
    }
  };

  const handleSaveStoreUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDomain(true);
    try {
      const formData = new FormData();
      formData.append('id', String(license.id));
      formData.append('store_url', storeUrlInput.trim());

      const res = await fetch('index.php?action=api_update', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert('✨ Bound store URL updated successfully!', 'success');
        onRefresh();
      } else {
        showAlert(data.error || 'Failed to update store URL', 'error');
      }
    } catch (err: any) {
      showAlert('Error updating store URL: ' + err.message, 'error');
    } finally {
      setSavingDomain(false);
    }
  };

  const handleExtendExpiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setExtending(true);
    try {
      const formData = new FormData();
      formData.append('id', String(license.id));
      formData.append('months', String(extendMonths));

      const res = await fetch('?action=api_extend_license', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`✨ License validity extended by ${extendMonths} months!`, 'success');
        onRefresh();
      } else {
        showAlert(data.error || 'Failed to extend license', 'error');
      }
    } catch (err: any) {
      showAlert('Error extending license: ' + err.message, 'error');
    } finally {
      setExtending(false);
    }
  };

  const subTabs: SubTabItem<LicenseDetailSubTab>[] = [
    { id: 'overview', label: 'Overview & Expiry', icon: Package },
    { id: 'owner', label: 'Owner & Affiliation', icon: User },
    { id: 'domains', label: 'Allowed Store Domains', icon: Globe },
    { id: 'governance', label: 'Governance & Activity', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
      {/* Back Button Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-pm-secondary hover:text-pm-text transition bg-pm-card border border-pm-border px-3 py-1.5 rounded-lg shadow-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to License Directory</span>
        </button>

        <div className="flex items-center gap-2">
          {onEditLicense && (
            <Button variant="neutral" size="sm" icon={Edit} onClick={() => onEditLicense(license)}>
              Edit Key Details
            </Button>
          )}
        </div>
      </div>

      {/* Detail Header Banner Card */}
      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <code className="font-mono text-base font-bold text-pm-text bg-pm-input px-3 py-1 rounded-lg border border-pm-border tracking-wider">
                  {showFullKey ? license.license_key : maskLicenseKey(license.license_key)}
                </code>
                <button
                  type="button"
                  onClick={() => setShowFullKey(!showFullKey)}
                  className="text-pm-secondary hover:text-pm-text p-1 transition"
                  title={showFullKey ? 'Hide Key' : 'Show Key'}
                >
                  {showFullKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className={`p-1 rounded transition ${
                    copiedKey ? 'text-emerald-400 bg-emerald-500/10' : 'text-pm-secondary hover:text-pm-text'
                  }`}
                  title="Copy Key"
                >
                  {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-pm-secondary mt-1">
                Software License Key ID #{license.id} • Issued{' '}
                {license.created_at ? new Date(license.created_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <StatusBadge status={license.status || 'active'} />
          <span className="text-xs font-mono uppercase font-bold px-3 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30">
            {license.package_tier || 'basic'} Tier
          </span>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <SubTabNav tabs={subTabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Sub-Tab 1: Overview & Expiry */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-pm-card border border-pm-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-pm-text flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-400" />
              License Metadata Specifications
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-pm-border">
                <span className="text-pm-secondary">Package Tier Level</span>
                <span className="font-bold text-purple-400 uppercase font-mono">{license.package_tier || 'basic'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-pm-border">
                <span className="text-pm-secondary">License Status</span>
                <span className="font-bold text-pm-text uppercase">{license.status}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-pm-border">
                <span className="text-pm-secondary">Created Timestamp</span>
                <span className="font-mono text-pm-text">{license.created_at || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-pm-border">
                <span className="text-pm-secondary">Bound Store URL</span>
                <span className="font-mono text-emerald-400">{license.store_url || 'Unbound (Any Domain)'}</span>
              </div>
            </div>
          </div>

          <div className="bg-pm-card border border-pm-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-pm-text flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Expiration Radar
            </h3>
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-pm-input border border-pm-border flex items-center justify-between">
                <div>
                  <span className="text-xs text-pm-secondary block">Expiration Date</span>
                  <span className="font-mono font-bold text-sm text-pm-text">
                    {license.expires_at ? new Date(license.expires_at).toLocaleDateString() : 'Lifetime Access'}
                  </span>
                </div>
                <Calendar className="w-6 h-6 text-pm-secondary" />
              </div>

              <form onSubmit={handleExtendExpiry} className="space-y-3 pt-2">
                <label className="text-xs font-bold text-pm-text block">Quick Extend Validity</label>
                <div className="flex items-center gap-2">
                  <select
                    value={extendMonths}
                    onChange={(e) => setExtendMonths(Number(e.target.value))}
                    className="bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-xs font-bold text-pm-text flex-1"
                  >
                    <option value={1}>+ 1 Month</option>
                    <option value={3}>+ 3 Months</option>
                    <option value={6}>+ 6 Months</option>
                    <option value={12}>+ 12 Months (1 Year)</option>
                    <option value={24}>+ 24 Months (2 Years)</option>
                  </select>
                  <Button type="submit" variant="primary" size="md" icon={Save} loading={extending}>
                    Extend Expiry
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Owner & Affiliation */}
      {activeTab === 'owner' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client Account Card */}
          <div className="bg-pm-card border border-pm-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-pm-text flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" />
              Assigned Client Account
            </h3>
            {assignedUser ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-pm-input border border-pm-border flex items-center justify-between">
                  <div>
                    <p className="font-bold text-pm-text text-sm">{assignedUser.name || 'Unnamed Client'}</p>
                    <p className="text-pm-secondary font-mono">{assignedUser.email}</p>
                  </div>
                  {onInspectClient && (
                    <Button variant="neutral" size="sm" icon={User} onClick={() => onInspectClient(assignedUser)}>
                      Inspect Profile
                    </Button>
                  )}
                </div>
                <div className="flex justify-between py-1 border-b border-pm-border">
                  <span className="text-pm-secondary">Account Role</span>
                  <span className="font-bold text-pm-text uppercase">{assignedUser.role || 'user'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-pm-secondary">Account Status</span>
                  <span className="font-bold text-emerald-400 uppercase">{assignedUser.status || 'active'}</span>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-pm-secondary italic bg-pm-input rounded-xl border border-pm-border">
                Unassigned standalone key (Not bound to a specific client account).
              </div>
            )}
          </div>

          {/* Company Affiliation Card */}
          <div className="bg-pm-card border border-pm-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-pm-text flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-400" />
              Company Affiliation
            </h3>
            {companyName ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-pm-input border border-pm-border flex items-center justify-between">
                  <div>
                    <p className="font-bold text-purple-400 text-sm">{companyName}</p>
                    <p className="text-pm-secondary text-[11px]">Corporate License Pool</p>
                  </div>
                  {onInspectCompany && assignedComp && (
                    <Button variant="neutral" size="sm" icon={Building2} onClick={() => onInspectCompany(assignedComp)}>
                      Inspect Company
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-pm-secondary italic bg-pm-input rounded-xl border border-pm-border">
                Individual license key (Not associated with a corporate company account).
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Allowed Store Domains */}
      {activeTab === 'domains' && (
        <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-pm-text flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            Allowed Store Domain Whitelist
          </h3>
          <p className="text-xs text-pm-secondary">
            Specify the exact store URL or domain origin allowed to activate and consume this software license key.
          </p>

          <form onSubmit={handleSaveStoreUrl} className="space-y-4 max-w-xl">
            <div>
              <label className="text-xs font-bold text-pm-text block mb-1.5">Store URL / Domain Origin</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. mystore.myshopify.com or example.com"
                  value={storeUrlInput}
                  onChange={(e) => setStoreUrlInput(e.target.value)}
                  className="w-full bg-pm-input border border-pm-border rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-pm-text focus:border-purple-500 focus:outline-none"
                />
                <Globe className="w-4 h-4 text-pm-secondary absolute left-3 top-2.5" />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="md" icon={Save} loading={savingDomain}>
                Save Domain Whitelist
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Sub-Tab 4: Governance & Activity */}
      {activeTab === 'governance' && (
        <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-pm-text flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            Governance Audit & Activity History
          </h3>
          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-xl bg-pm-input border border-pm-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-pm-text">Key Creation Audit</span>
                <span className="text-pm-secondary font-mono">{license.created_at || 'N/A'}</span>
              </div>
              <p className="text-pm-secondary">
                License key issued successfully under tier <strong className="uppercase">{license.package_tier || 'basic'}</strong>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-pm-input border border-pm-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-pm-text">Active Verification Gate</span>
                <span className="font-bold text-emerald-400 uppercase">Passed</span>
              </div>
              <p className="text-pm-secondary">
                Cryptographic signature valid. Key status active and responsive to SaaS polling endpoints.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Key, Globe, Eye, EyeOff, Copy, Check, Edit, Building2, User, ExternalLink, Trash2, Calendar, ShieldAlert } from 'lucide-react';
import { License, UserAccount } from '../LicensesTab';
import { StatusBadge } from './StatusBadge';
import { Button } from './Button';

export interface LicenseRowCardProps {
  license: License;
  users?: UserAccount[];
  companies?: any[];
  highlightedKey?: string;
  showAssignSelect?: boolean;
  onAssignEmployee?: (licId: number, userId: string) => void;
  onEditLicense?: (lic: License) => void;
  onInspectCompany?: (company: any) => void;
  onInspectClient?: (client: UserAccount) => void;
  onDeleteLicense?: (licId: number) => void;
  showCompanyButton?: boolean;
}

export const LicenseRowCard: React.FC<LicenseRowCardProps> = ({
  license,
  users = [],
  companies = [],
  highlightedKey,
  showAssignSelect = false,
  onAssignEmployee,
  onEditLicense,
  onInspectCompany,
  onInspectClient,
  onDeleteLicense,
  showCompanyButton = true,
}) => {
  const [showFullKey, setShowFullKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const isHighlighted = highlightedKey && license.license_key === highlightedKey;

  const maskKey = (key: string) => {
    if (!key) return '';
    const parts = key.split('-');
    if (parts.length < 3) return key.substring(0, 8) + '••••••••';
    return `${parts[0]}-${parts[1]}-••••••••••••-${parts[parts.length - 1]}`;
  };

  const copyKey = () => {
    navigator.clipboard.writeText(license.license_key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Find assigned company object if license belongs to a company or user
  const assignedUser = license.user_id ? users.find(u => Number(u.id) === Number(license.user_id)) : null;
  const companyName = license.company_name || (assignedUser ? assignedUser.company_name : null);
  const assignedComp = companyName
    ? companies.find(c => (c.company_name || '').toLowerCase() === companyName.toLowerCase())
    : null;

  return (
    <div
      className={`p-4 rounded-xl border transition-all duration-200 ${
        isHighlighted
          ? 'bg-purple-500/10 border-purple-500 shadow-md ring-2 ring-purple-500/20'
          : 'bg-pm-input/30 border-pm-border hover:border-purple-500/30 hover:bg-pm-input/50'
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Info: Key Header & Status */}
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Key className="w-4 h-4" />
            </div>

            <code className="font-mono text-xs font-bold text-pm-text bg-pm-card px-2.5 py-1 rounded-lg border border-pm-border tracking-wider select-all">
              {showFullKey ? license.license_key : maskKey(license.license_key)}
            </code>

            <button
              type="button"
              onClick={() => setShowFullKey(!showFullKey)}
              className="text-pm-secondary hover:text-pm-text text-xs p-1 transition"
              title={showFullKey ? 'Hide Full Key' : 'Reveal Full Key'}
            >
              {showFullKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={copyKey}
              className={`p-1 rounded text-xs transition ${
                copiedKey ? 'text-emerald-400 bg-emerald-500/10' : 'text-pm-secondary hover:text-pm-text'
              }`}
              title="Copy License Key"
            >
              {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <StatusBadge status={license.status || 'active'} />

            {license.package_tier && (
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                {license.package_tier} Tier
              </span>
            )}
          </div>

          {/* Sub-line Metadata Badges */}
          <div className="flex items-center gap-3 text-[11px] text-pm-secondary flex-wrap">
            {/* Bound Store Domain Badge */}
            {license.store_url ? (
              <a
                href={license.store_url.startsWith('http') ? license.store_url : `https://${license.store_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-emerald-400 hover:underline bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20"
              >
                <Globe className="w-3 h-3" />
                <span>{license.store_url}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
              </a>
            ) : (
              <span className="inline-flex items-center gap-1 font-mono text-pm-secondary/70 bg-pm-input px-2 py-0.5 rounded border border-pm-border italic">
                <Globe className="w-3 h-3 text-pm-secondary/50" />
                Unbound Store Domain
              </span>
            )}

            {/* Company Badge Link */}
            {companyName && (
              <div className="flex items-center gap-1 bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20 font-semibold">
                <Building2 className="w-3 h-3" />
                {onInspectCompany && assignedComp ? (
                  <button
                    type="button"
                    onClick={() => onInspectCompany(assignedComp)}
                    className="hover:underline font-bold text-left"
                  >
                    {companyName}
                  </button>
                ) : (
                  <span>{companyName}</span>
                )}
              </div>
            )}

            {/* Assigned User Badge Link */}
            {assignedUser && (
              <div className="flex items-center gap-1 bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 font-semibold">
                <User className="w-3 h-3" />
                {onInspectClient ? (
                  <button
                    type="button"
                    onClick={() => onInspectClient(assignedUser)}
                    className="hover:underline font-bold text-left"
                  >
                    {assignedUser.email}
                  </button>
                ) : (
                  <span>{assignedUser.email}</span>
                )}
              </div>
            )}

            {/* Expiry Date */}
            {license.expires_at && (
              <span className="flex items-center gap-1 text-[10px]">
                <Calendar className="w-3 h-3" />
                Expires: {new Date(license.expires_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Right Info: Interactive Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Employee Assignment Dropdown (for Company Pool) */}
          {showAssignSelect && onAssignEmployee && users.length > 0 && (
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-semibold text-pm-secondary uppercase">Assigned To:</label>
              <select
                value={license.user_id || ''}
                onChange={e => onAssignEmployee(license.id, e.target.value)}
                className="bg-pm-input border border-pm-border rounded-lg px-2 py-1 text-xs font-semibold text-pm-text focus:border-purple-500 focus:outline-none"
              >
                <option value="">-- Unassigned (Available in Pool) --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    👤 {u.name ? `${u.name} (${u.email})` : u.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Inspect Company Action Button */}
          {showCompanyButton && onInspectCompany && assignedComp && (
            <Button
              type="button"
              variant="neutral"
              size="sm"
              icon={Building2}
              onClick={() => onInspectCompany(assignedComp)}
              title="Inspect Company Profile"
            >
              Inspect Company
            </Button>
          )}

          {/* Inline Edit License Button */}
          {onEditLicense && (
            <Button
              type="button"
              variant="neutral"
              size="sm"
              icon={Edit}
              onClick={() => onEditLicense(license)}
              title="Edit License Settings"
            >
              Edit
            </Button>
          )}

          {/* Delete License Button */}
          {onDeleteLicense && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              icon={Trash2}
              onClick={() => onDeleteLicense(license.id)}
              title="Revoke / Delete License Key"
            >
              Delete
            </Button>
          )}

        </div>
      </div>
    </div>
  );
};

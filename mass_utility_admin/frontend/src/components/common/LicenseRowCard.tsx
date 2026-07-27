// @Arch[LicenseRowCard]
import React, { useState } from 'react';
import { Key, Globe, Eye, EyeOff, Copy, Check, Edit, Building2, User, ExternalLink, Trash2, Calendar, ShieldAlert } from 'lucide-react';
import { License, UserAccount } from '../../types/adminApi';
import { StatusBadge } from './StatusBadge';
import { Button } from './Button';
import { maskLicenseKey, copyLicenseKeyToClipboard } from '../../utils/licenseUtils';
import { parseDomains } from '../../utils/domainUtils';
import { DomainPillGroup } from './DomainPillGroup';

export interface LicenseRowCardProps {
  license: License;
  users?: UserAccount[];
  companies?: any[];
  highlightedKey?: string;
  showAssignSelect?: boolean;
  onAssignEmployee?: (licId: number, userId: string) => void;
  onInspectLicense?: (lic: License) => void;
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
  onInspectLicense,
  onEditLicense,
  onInspectCompany,
  onInspectClient,
  onDeleteLicense,
  showCompanyButton = true,
}) => {
  const [showFullKey, setShowFullKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const isHighlighted = highlightedKey && license.license_key === highlightedKey;

  const copyKey = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await copyLicenseKeyToClipboard(license.license_key);
    if (success) {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  // Find assigned company object if license belongs to a company or user
  const assignedUser = license.user_id ? users.find((u) => Number(u.id) === Number(license.user_id)) : null;
  const companyName = license.company_name || (assignedUser ? assignedUser.company_name : null);
  const assignedComp = companyName
    ? companies.find((c) => (c.company_name || '').toLowerCase() === companyName.toLowerCase())
    : null;

  return (
    <div
      className={`p-4 rounded-xl border flex flex-col justify-between gap-4 transition-all duration-200 ${
        isHighlighted
          ? 'bg-purple-500/10 border-purple-500 shadow-md ring-2 ring-purple-500/20'
          : 'bg-pm-card border-pm-border hover:border-purple-500/30 hover:shadow-sm'
      }`}
    >
      {/* Part 1: Top Header Bar (Key Code Badge & Status Pill) */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-pm-border">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 shrink-0">
            <Key className="w-4 h-4" />
          </div>

          <code className="font-mono text-xs font-bold text-pm-text bg-pm-input px-2.5 py-1 rounded-lg border border-pm-border tracking-wider truncate">
            {showFullKey ? license.license_key : maskLicenseKey(license.license_key)}
          </code>

          <button
            type="button"
            onClick={() => setShowFullKey(!showFullKey)}
            className="text-pm-secondary hover:text-pm-text text-xs p-1 transition shrink-0"
            title={showFullKey ? 'Hide Full Key' : 'Reveal Full Key'}
          >
            {showFullKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={copyKey}
            className={`p-1 rounded text-xs transition shrink-0 ${
              copiedKey ? 'text-emerald-400 bg-emerald-500/10' : 'text-pm-secondary hover:text-pm-text'
            }`}
            title="Copy License Key"
          >
            {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge type="tier" label={`${license.package_tier || 'basic'} TIER`} />
          <StatusBadge status={license.status || 'active'} />
        </div>
      </div>

      {/* Part 2: Body Grid Metadata Section */}
      <div className="space-y-2 text-xs">
        {/* Tier & Expiry Metadata Row */}
        <div className="flex items-center justify-between gap-2 text-pm-secondary text-[11px]">
          <span className="font-mono text-[10px] uppercase font-bold text-pm-secondary">
            Tier Level: <strong className="text-pm-text">{license.package_tier || 'basic'}</strong>
          </span>

          <span className="flex items-center gap-1 font-mono">
            <Calendar className="w-3 h-3" />
            {license.expires_at ? new Date(license.expires_at).toLocaleDateString() : 'Never'}
          </span>
        </div>

        {/* Client Owner Row */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-pm-secondary font-medium text-[11px] flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-blue-400" />
            Client Owner:
          </span>
          {assignedUser ? (
            <button
              type="button"
              onClick={() => onInspectClient && onInspectClient(assignedUser)}
              className="font-bold text-pm-text hover:text-blue-400 transition truncate max-w-[180px] text-right"
            >
              {assignedUser.name || assignedUser.email}
            </button>
          ) : (
            <span className="text-pm-secondary italic">Unassigned</span>
          )}
        </div>

        {/* Company Affiliation Row */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-pm-secondary font-medium text-[11px] flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-purple-400" />
            Company:
          </span>
          {companyName ? (
            <span className="font-bold text-purple-400 truncate max-w-[180px] text-right">
              {companyName}
            </span>
          ) : (
            <span className="text-pm-secondary italic">Standalone</span>
          )}
        </div>

        {/* Bound Store Domain Row */}
        <div className="flex flex-col gap-1.5 pt-1">
          <span className="text-pm-secondary font-medium text-[11px] flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            Allowed Store Domains:
          </span>
          <DomainPillGroup storeUrl={license.store_url} />
        </div>
      </div>

      {/* Part 3: Footer Action Bar (With Labeled Buttons) */}
      <div className="pt-3 border-t border-pm-border flex items-center justify-between gap-2">
        {onInspectLicense ? (
          <Button
            type="button"
            variant="neutral"
            size="sm"
            icon={Eye}
            onClick={() => onInspectLicense(license)}
            className="flex-1"
          >
            Inspect Key
          </Button>
        ) : (
          <div className="flex-1" />
        )}

        <div className="flex items-center gap-1.5">
          {onEditLicense && (
            <Button
              type="button"
              variant="neutral"
              size="sm"
              icon={Edit}
              onClick={() => onEditLicense(license)}
              title="Edit License Details"
            >
              Edit
            </Button>
          )}

          {onDeleteLicense && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              icon={Trash2}
              onClick={() => onDeleteLicense(license.id)}
              title="Delete License Key"
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

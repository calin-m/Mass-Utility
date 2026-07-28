// @Arch[LicenseRowCard]
import React, { useState } from 'react';
import { Key, Globe, Eye, EyeOff, Copy, Check, Edit, Building2, User, Trash2, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { License, UserAccount } from '../../types/adminApi';
import { StatusBadge } from './StatusBadge';
import { Button } from './Button';
import { maskLicenseKey, copyLicenseKeyToClipboard } from '../../utils/licenseUtils';
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
  onInspectLicense,
  onEditLicense,
  onInspectClient,
  onDeleteLicense,
}) => {
  const [showFullKey, setShowFullKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isHighlighted = highlightedKey && license.license_key === highlightedKey;

  const copyKey = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await copyLicenseKeyToClipboard(license.license_key);
    if (success) {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const assignedUser = license.user_id ? users.find((u) => Number(u.id) === Number(license.user_id)) : null;
  const companyName = license.company_name || (assignedUser ? assignedUser.company_name : null);

  return (
    <div
      className={`rounded-xl border transition-all duration-200 text-xs ${
        isHighlighted
          ? 'bg-purple-500/10 border-purple-500 shadow-md ring-2 ring-purple-500/20'
          : 'bg-pm-card border-pm-border hover:border-purple-500/30'
      }`}
    >
      {/* Primary Compact 36px Height Data Bar */}
      <div className="p-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <div className="p-1 rounded-md bg-purple-500/10 text-purple-400 shrink-0">
            <Key className="w-3.5 h-3.5" />
          </div>

          <code className="font-mono text-xs font-bold text-pm-text bg-pm-input px-2 py-0.5 rounded border border-pm-border tracking-wider truncate">
            {showFullKey ? license.license_key : maskLicenseKey(license.license_key)}
          </code>

          <button
            type="button"
            onClick={() => setShowFullKey(!showFullKey)}
            className="text-pm-secondary hover:text-pm-text text-xs p-0.5 transition shrink-0"
            title={showFullKey ? 'Hide Full Key' : 'Reveal Full Key'}
          >
            {showFullKey ? <EyeOff className="w-3 h-3 text-indigo-400" /> : <Eye className="w-3 h-3" />}
          </button>

          <button
            type="button"
            onClick={copyKey}
            className={`p-0.5 rounded text-xs transition shrink-0 ${
              copiedKey ? 'text-emerald-400 bg-emerald-500/10' : 'text-pm-secondary hover:text-pm-text'
            }`}
            title="Copy License Key"
          >
            {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>

        {/* Bound Domain & Badges */}
        <div className="flex items-center gap-2 shrink-0">
          <DomainPillGroup storeUrl={license.store_url} />
          <StatusBadge type="tier" label={`${license.package_tier || 'basic'} TIER`} />
          <StatusBadge status={license.status || 'active'} />

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-pm-secondary hover:text-pm-text transition rounded-lg hover:bg-pm-input"
            title={isExpanded ? "Collapse Details" : "Expand Details"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4 text-purple-400" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Extended Metadata Drawer */}
      {isExpanded && (
        <div className="p-3 border-t border-pm-border bg-pm-input/30 space-y-3 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
            <div className="space-y-1">
              <span className="text-pm-secondary font-medium flex items-center gap-1">
                <User className="w-3 h-3 text-blue-400" /> Client Owner:
              </span>
              {assignedUser ? (
                <button
                  type="button"
                  onClick={() => onInspectClient && onInspectClient(assignedUser)}
                  className="font-bold text-pm-text hover:text-blue-400 transition truncate block"
                >
                  {assignedUser.name || assignedUser.email}
                </button>
              ) : (
                <span className="text-pm-secondary italic">Unassigned</span>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-pm-secondary font-medium flex items-center gap-1">
                <Building2 className="w-3 h-3 text-purple-400" /> Company:
              </span>
              {companyName ? (
                <span className="font-bold text-purple-400 truncate block">
                  {companyName}
                </span>
              ) : (
                <span className="text-pm-secondary italic">Standalone</span>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-pm-secondary font-medium flex items-center gap-1 font-mono">
                <Calendar className="w-3 h-3 text-amber-400" /> Expiry:
              </span>
              <span className="font-mono text-pm-text block">
                {license.expires_at ? new Date(license.expires_at).toLocaleDateString() : 'Lifetime'}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-pm-border/60 flex items-center justify-end gap-2">
            {onInspectLicense && (
              <Button
                type="button"
                variant="neutral"
                size="sm"
                icon={Eye}
                onClick={() => onInspectLicense(license)}
              >
                Inspect Details
              </Button>
            )}
            {onEditLicense && (
              <Button
                type="button"
                variant="neutral"
                size="sm"
                icon={Edit}
                onClick={() => onEditLicense(license)}
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
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

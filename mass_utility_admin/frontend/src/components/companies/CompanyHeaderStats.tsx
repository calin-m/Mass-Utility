// @Arch[CompanyHeaderStats]
import React from 'react';
import { Building2, Key, Sparkles, Check, Copy, Users, Edit } from 'lucide-react';
import { Company } from './CompanyListView';

interface CompanyHeaderStatsProps {
  company: Company;
  companyMembers: any[];
  usedCount: number;
  maxCount: number;
  pct: number;
  isFull: boolean;
  copyVatId: () => void;
  copiedVat: boolean;
  setActiveTab: (tab: 'overview' | 'licenses' | 'members' | 'settings') => void;
}

export const CompanyHeaderStats: React.FC<CompanyHeaderStatsProps> = ({
  company,
  companyMembers,
  usedCount,
  maxCount,
  pct,
  isFull,
  copyVatId,
  copiedVat,
  setActiveTab
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
      <div className="bg-pm-card border border-pm-border rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
          <Building2 className="w-4 h-4 text-purple-400" /> Profile Summary
        </h3>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-pm-border">
            <span className="text-pm-secondary">Company ID</span>
            <span className="font-mono font-bold text-pm-text">#{company.id}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-pm-border">
            <span className="text-pm-secondary">Tax / VAT ID</span>
            {company.tax_id ? (
              <span className="font-mono text-pm-text flex items-center gap-1 bg-pm-input px-2 py-0.5 rounded border border-pm-border">
                {company.tax_id}
                <button type="button" onClick={copyVatId} className="text-pm-secondary hover:text-pm-primary transition p-0.5">
                  {copiedVat ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </span>
            ) : (
              <span className="italic text-pm-secondary/60">Not specified</span>
            )}
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-pm-border">
            <span className="text-pm-secondary">Registration Date</span>
            <span className="text-pm-text">{company.created_at ? new Date(company.created_at).toLocaleDateString() : 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-pm-secondary">Team Size</span>
            <span className="font-bold text-indigo-400">{companyMembers.length} Members</span>
          </div>
        </div>
      </div>

      <div className="bg-pm-card border border-pm-border rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
          <Key className="w-4 h-4 text-amber-400" /> Capacity Utilization
        </h3>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center font-bold">
            <span className={isFull ? 'text-rose-400' : 'text-pm-text'}>
              {usedCount} / {maxCount} Licenses
            </span>
            <span className="text-purple-400">{pct}%</span>
          </div>

          <div className="w-full bg-pm-input rounded-full h-2.5 overflow-hidden border border-pm-border">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-purple-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <p className="text-[11px] text-pm-secondary pt-2">
            {isFull
              ? '⚠️ License pool quota is full. Expand capacity in Settings to issue more keys.'
              : `${maxCount - usedCount} remaining key slots available for provisioning.`}
          </p>
        </div>
      </div>

      <div className="bg-pm-card border border-pm-border rounded-2xl p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-purple-400" /> Quick Navigation
        </h3>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setActiveTab('licenses')}
            className="w-full p-3 bg-pm-input/40 hover:bg-pm-input/80 border border-pm-border rounded-xl flex items-center justify-between text-xs font-semibold text-pm-text transition group"
          >
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              <span>Manage License Pool</span>
            </div>
            <span className="text-pm-secondary group-hover:text-purple-400 font-mono">→</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className="w-full p-3 bg-pm-input/40 hover:bg-pm-input/80 border border-pm-border rounded-xl flex items-center justify-between text-xs font-semibold text-pm-text transition group"
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Manage Team Members</span>
            </div>
            <span className="text-pm-secondary group-hover:text-purple-400 font-mono">→</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className="w-full p-3 bg-pm-input/40 hover:bg-pm-input/80 border border-pm-border rounded-xl flex items-center justify-between text-xs font-semibold text-pm-text transition group"
          >
            <div className="flex items-center gap-2">
              <Edit className="w-4 h-4 text-purple-400" />
              <span>Organization Settings</span>
            </div>
            <span className="text-pm-secondary group-hover:text-purple-400 font-mono">→</span>
          </button>
        </div>
      </div>
    </div>
  );
};

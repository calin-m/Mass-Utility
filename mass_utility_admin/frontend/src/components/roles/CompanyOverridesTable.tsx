// @Arch[CompanyOverridesTable]
import React from 'react';
import { Search, Save, RotateCcw, Loader2 } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';
import { RbacRole, RbacPermission, Company } from '../../types/adminApi';

interface CompanyOverridesTableProps {
  companies: Company[];
  filteredCompanies: Company[];
  selectedCompanyId: number;
  companySearchQuery: string;
  roles: RbacRole[];
  permissions: RbacPermission[];
  companyOverrides: Record<string, string[]>;
  companyLoading: boolean;
  saving: boolean;
  onSearchChange: (q: string) => void;
  onCompanySelect: (id: number) => void;
  onTogglePermission: (roleSlug: string, permSlug: string) => void;
  onSaveCompanyRole: (roleSlug: string) => void;
  onResetCompanyOverride: (roleSlug: string) => void;
}

export const CompanyOverridesTable: React.FC<CompanyOverridesTableProps> = ({
  filteredCompanies,
  selectedCompanyId,
  companySearchQuery,
  roles,
  permissions,
  companyOverrides,
  companyLoading,
  saving,
  onSearchChange,
  onCompanySelect,
  onTogglePermission,
  onSaveCompanyRole,
  onResetCompanyOverride
}) => {
  return (
    <div className="bg-pm-card border border-pm-border rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-pm-secondary">Company-Specific Role Overrides</h3>
          <p className="text-[11px] text-pm-secondary mt-0.5">
            Customize role permissions for a specific organization. Overrides take precedence over global defaults.
          </p>
        </div>

        {/* Searchable Company Combobox */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-pm-secondary" />
            <input
              type="text"
              placeholder="Filter 500+ Companies..."
              value={companySearchQuery}
              onChange={e => {
                const q = e.target.value;
                onSearchChange(q);
                if (q.trim()) {
                  const matches = filteredCompanies.filter(c => 
                    (c.company_name && c.company_name.toLowerCase().includes(q.toLowerCase())) ||
                    String(c.id).includes(q)
                  );
                  if (matches.length > 0 && !matches.some(m => m.id === selectedCompanyId)) {
                    onCompanySelect(matches[0].id);
                  }
                }
              }}
              className="bg-pm-input border border-pm-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-pm-text"
            />
          </div>

          <select
            value={selectedCompanyId}
            onChange={e => onCompanySelect(Number(e.target.value))}
            className="bg-pm-input border border-pm-border rounded-xl px-3 py-1.5 text-xs text-pm-text font-bold cursor-pointer min-w-[180px]"
          >
            {filteredCompanies.map(c => (
              <option key={c.id} value={c.id}>
                {c.company_name || `Company #${c.id}`} (#{c.id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {companyLoading ? (
        <div className="p-8 text-center text-pm-secondary">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-pm-primary" />
          <p className="text-xs">Loading Company Role Overrides...</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-pm-border rounded-xl custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-pm-input text-pm-secondary font-bold uppercase text-[10px] border-b border-pm-border">
                <th className="p-4 min-w-[260px] sticky left-0 bg-pm-input z-10 border-r border-pm-border/50">Capability Permission</th>
                {roles.map(r => {
                  const isOverridden = Boolean(companyOverrides[r.slug]);
                  return (
                    <th key={r.id} className="p-4 text-center min-w-[150px]">
                      <div className="flex flex-col items-center gap-1.5">
                        <StatusBadge label={r.name} customColor={r.slug === 'SuperAdmin' || r.slug === 'Owner' || r.slug === 'owner' ? 'purple' : r.slug === 'CompanyAdmin' ? 'indigo' : 'emerald'} />
                        <div className="text-[9px] font-mono text-pm-secondary mt-0.5">
                          {isOverridden ? '🟢 Custom Override' : '⚪ Global Default'}
                        </div>
                        <div className="flex items-center gap-1 mt-1.5">
                          <Button
                            variant="neutral"
                            size="sm"
                            icon={Save}
                            disabled={saving}
                            onClick={() => onSaveCompanyRole(r.slug)}
                            className="text-[10px] py-1 px-2.5 shadow-sm"
                          >
                            Save
                          </Button>
                          {isOverridden && (
                            <button
                              onClick={() => onResetCompanyOverride(r.slug)}
                              disabled={saving}
                              title="Reset Override to Global Default"
                              className="p-1 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition cursor-pointer border border-rose-500/20"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-pm-border">
              {Object.entries(
                permissions.reduce((acc: Record<string, RbacPermission[]>, p) => {
                  const group = p.group_name || 'General System';
                  if (!acc[group]) acc[group] = [];
                  acc[group].push(p);
                  return acc;
                }, {})
              ).map(([groupName, groupList]) => (
                <React.Fragment key={groupName}>
                  <tr className="bg-purple-500/10 border-y border-purple-500/20">
                    <td colSpan={roles.length + 1} className="py-2.5 px-4 font-mono font-extrabold text-[11px] uppercase tracking-wider text-purple-300">
                      ⚡ {groupName}
                    </td>
                  </tr>
                  {groupList.map(p => (
                    <tr key={p.slug} className="hover:bg-pm-input/30 transition-colors">
                      <td className="p-3.5 sticky left-0 bg-pm-card border-r border-pm-border/50 z-10">
                        <div className="font-bold text-pm-text">{p.name || p.slug}</div>
                        <div className="text-[10px] text-pm-secondary leading-snug">{p.description}</div>
                      </td>
                      {roles.map(r => {
                        const rolePerms = companyOverrides[r.slug] !== undefined
                          ? companyOverrides[r.slug]
                          : (r.permissions || []);
                        const hasPerm = rolePerms.includes(p.slug);
                        return (
                          <td key={r.id} className="p-3.5 text-center align-middle">
                            <input
                              type="checkbox"
                              checked={hasPerm}
                              onChange={() => onTogglePermission(r.slug, p.slug)}
                              className="w-4.5 h-4.5 rounded border-pm-border text-purple-500 focus:ring-purple-500 cursor-pointer accent-purple-500 transition-transform active:scale-95"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// @Arch[AccountTab]
import React from 'react';
import { AuthStore, UserPermissions } from '../../store/useAuthStore';
import { SectionHeader } from '../common/SectionHeader';

export const AccountTab: React.FC = () => {
  const user: UserPermissions | null = AuthStore.getState().user;
  const isAutoSso = AuthStore.getState().isAutoSso;

  if (!user) return null;

  const roleColors: Record<string, string> = {
    SuperAdmin: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    CompanyAdmin: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    CatalogManager: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    Operator: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    Observer: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30',
  };

  const activeRoleStyle = roleColors[user.role] || roleColors.Observer;

  const handleSignOut = () => {
    AuthStore.logout();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <SectionHeader
          title="Account & Role Permissions"
          subtitle="Manage active identity, tenant assignments, and Role-Based Access Control (RBAC) capabilities"
        />
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium transition-all cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          <span>Sign Out / Switch Account</span>
        </button>
      </div>

      {/* Primary Identity Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* User Card */}
        <div className="bg-pm-card border border-pm-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-pm-text-muted uppercase tracking-wider">Active User</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 text-pm-accent">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-pm-text-primary">{user.name}</h3>
            <p className="text-xs text-pm-text-muted">{user.email}</p>
          </div>
          {isAutoSso && (
            <span className="inline-block text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
              PrestaShop Auto-SSO Session
            </span>
          )}
        </div>

        {/* Company Tenant Card */}
        <div className="bg-pm-card border border-pm-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-pm-text-muted uppercase tracking-wider">Organization / Tenant</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 text-pm-accent">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3a1.5 1.5 0 011.5-1.5h3a1.5 1.5 0 011.5 1.5v3m-6 0h6" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-pm-text-primary">{user.company_name || 'Standalone Store Tenant'}</h3>
            <p className="text-xs text-pm-text-muted">Company ID: #{user.company_id || 1}</p>
          </div>
        </div>

        {/* Assigned Role Card */}
        <div className="bg-pm-card border border-pm-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-pm-text-muted uppercase tracking-wider">RBAC Role Tier</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 text-pm-accent">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold ${activeRoleStyle}`}>
              <span>{user.role}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="bg-pm-card border border-pm-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-pm-border/60">
          <div>
            <h4 className="text-sm font-semibold text-pm-text-primary flex items-center gap-2">
              <span>Granted Capabilities &amp; Feature Permissions</span>
            </h4>
            <p className="text-xs text-pm-text-muted">Capabilities assigned to your role from Mass Utility Admin</p>
          </div>
          <span className="text-xs font-mono text-pm-accent bg-pm-accent/10 px-2.5 py-1 rounded-md border border-pm-accent/20">
            {user.permissions?.length || 0} Granted Slugs
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(user.permissions || []).map((slug: string) => (
            <div key={slug} className="flex items-center gap-2.5 p-3 rounded-lg bg-pm-input/30 border border-pm-border/50 text-xs">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 text-emerald-400 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-mono text-pm-text-primary">{slug}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

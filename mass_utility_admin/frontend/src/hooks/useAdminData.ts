// @Arch[useAdminData]
import { useState, useEffect, useCallback } from 'react';
import { License, UserAccount, Company, PackageTier } from '../types/adminApi';

import { registerDemoVault, setDemoActiveFlag } from '../utils/AdminFetchAdapter';

export interface ToastAlert {
  msg: string;
  type: 'success' | 'error';
}

const getApiUrl = (action: string) => {
  const path = window.location.pathname;
  return `${path}?action=${action}`;
};

// Seed Mock Data for Client-Side Demo Sandboxing
const MOCK_COMPANIES: Company[] = [
  { id: 1, company_name: 'Acme Enterprise Store', tax_id: 'US-8492019', max_licenses: 10, status: 'active', created_at: '2026-01-15', users_count: 2, licenses_count: 1 },
  { id: 2, company_name: 'PrestaShop Global Direct', tax_id: 'FR-9940129', max_licenses: 5, status: 'active', created_at: '2026-03-10', users_count: 1, licenses_count: 1 },
  { id: 3, company_name: 'Nexus Commerce SRL', tax_id: 'RO-3829104', max_licenses: 2, status: 'active', created_at: '2026-05-22', users_count: 1, licenses_count: 1 }
];

const MOCK_USERS: UserAccount[] = [
  { id: 1, email: 'john@acmestore.com', name: 'John Doe', company_name: 'Acme Enterprise Store', company_id: 1, role: 'SuperAdmin', status: 'active', created_at: '2026-01-15' },
  { id: 2, email: 'alice@psglobal.io', name: 'Alice Merchant', company_name: 'PrestaShop Global Direct', company_id: 2, role: 'Owner', status: 'active', created_at: '2026-03-10' },
  { id: 3, email: 'bob@nexuscommerce.ro', name: 'Bob Operator', company_name: 'Nexus Commerce SRL', company_id: 3, role: 'CatalogManager', status: 'active', created_at: '2026-05-22' }
];

const MOCK_TIERS: PackageTier[] = [
  {
    id: 1,
    name: 'basic',
    display_name: 'Basic Tier',
    description: 'Entry level catalog management & local backup tools',
    max_domains: 1,
    capabilities: {
      PM_ENABLE_DB_TOOLS: false,
      PM_ENABLE_FILE_TOOLS: false,
      PM_ENABLE_GHOST_PURGER: true,
      PM_ENABLE_GDPR_SWEEPER: true,
      PM_ENABLE_HISTORY: true,
      query_visual_filter: false,
      query_visual_compile: false,
      query_visual_mutate: false,
      db_tools_export: true,
      db_tools_backup: false,
      db_diff_inspector: false,
      db_tools_restore: false,
      file_tools_browse: true,
      file_tools_backup: false,
      file_diff_inspector: false,
      backup_automation: false,
      governor_telemetry: true,
      governor_autopilot: false,
      sweeper_execution: false,
      rollback_history_limit: 5,
      max_bound_domains: 1,
      max_cloud_backups: 3,
      max_daily_sweeper_runs: 1,
      backup_destinations: ['local'],
    }
  },
  {
    id: 2,
    name: 'pro',
    display_name: 'Professional Tier',
    description: 'Complete database & cloud backup protection suite',
    max_domains: 5,
    capabilities: {
      PM_ENABLE_DB_TOOLS: true,
      PM_ENABLE_FILE_TOOLS: true,
      PM_ENABLE_GHOST_PURGER: true,
      PM_ENABLE_GDPR_SWEEPER: true,
      PM_ENABLE_HISTORY: true,
      query_visual_filter: true,
      query_visual_compile: true,
      query_visual_mutate: false,
      db_tools_export: true,
      db_tools_backup: true,
      db_diff_inspector: false,
      db_tools_restore: true,
      file_tools_browse: true,
      file_tools_backup: true,
      file_diff_inspector: false,
      backup_automation: true,
      governor_telemetry: true,
      governor_autopilot: false,
      sweeper_execution: false,
      rollback_history_limit: 15,
      max_bound_domains: 5,
      max_cloud_backups: 10,
      max_daily_sweeper_runs: 5,
      backup_destinations: ['local', 'gdrive'],
    }
  },
  {
    id: 3,
    name: 'enterprise',
    display_name: 'Enterprise Tier',
    description: 'Unlimited SaaS operations & telemetry suite',
    max_domains: 50,
    capabilities: {
      PM_ENABLE_DB_TOOLS: true,
      PM_ENABLE_FILE_TOOLS: true,
      PM_ENABLE_GHOST_PURGER: true,
      PM_ENABLE_GDPR_SWEEPER: true,
      PM_ENABLE_HISTORY: true,
      PM_ENABLE_SECURITY_HEALTH: true,
      multi_shop_scope: true,
      query_visual_filter: true,
      query_visual_compile: true,
      query_visual_mutate: true,
      db_tools_export: true,
      db_tools_backup: true,
      db_diff_inspector: true,
      db_tools_restore: true,
      file_tools_browse: true,
      file_tools_backup: true,
      file_diff_inspector: true,
      backup_automation: true,
      governor_telemetry: true,
      governor_autopilot: true,
      sweeper_execution: true,
      rollback_history_limit: 50,
      max_bound_domains: 50,
      max_cloud_backups: 50,
      max_daily_sweeper_runs: 24,
      backup_destinations: ['local', 'gdrive'],
    }
  },
  {
    id: 4,
    name: 'developer',
    display_name: 'Developer Tier',
    description: 'Full sandbox capabilities & unrestrained API access',
    max_domains: 999,
    capabilities: {
      PM_ENABLE_DB_TOOLS: true,
      PM_ENABLE_FILE_TOOLS: true,
      PM_ENABLE_GHOST_PURGER: true,
      PM_ENABLE_GDPR_SWEEPER: true,
      PM_ENABLE_HISTORY: true,
      PM_ENABLE_SECURITY_HEALTH: true,
      multi_shop_scope: true,
      query_visual_filter: true,
      query_visual_compile: true,
      query_visual_mutate: true,
      db_tools_export: true,
      db_tools_backup: true,
      db_diff_inspector: true,
      db_tools_restore: true,
      file_tools_browse: true,
      file_tools_backup: true,
      file_diff_inspector: true,
      backup_automation: true,
      governor_telemetry: true,
      governor_autopilot: true,
      sweeper_execution: true,
      rollback_history_limit: 999,
      max_bound_domains: 999,
      max_cloud_backups: 999,
      max_daily_sweeper_runs: 999,
      backup_destinations: ['local', 'gdrive'],
    }
  }
];

const MOCK_LICENSES: License[] = [
  {
    id: 1,
    company_id: 1,
    company_name: 'Acme Enterprise Store',
    user_id: 1,
    user_email: 'john@acmestore.com',
    user_name: 'John Doe',
    license_key: 'MASS-UTIL-ENTERPRISE-2026-X89K',
    store_url: 'https://acmestore.com',
    package_tier: 'Enterprise Tier',
    status: 'active',
    expires_at: '2027-01-15',
    created_at: '2026-01-15'
  },
  {
    id: 2,
    company_id: 2,
    company_name: 'PrestaShop Global Direct',
    user_id: 2,
    user_email: 'alice@psglobal.io',
    user_name: 'Alice Merchant',
    license_key: 'MASS-UTIL-PRO-2026-P42M',
    store_url: 'https://psglobal.io',
    package_tier: 'Professional Tier',
    status: 'active',
    expires_at: '2026-12-31',
    created_at: '2026-03-10'
  },
  {
    id: 3,
    company_id: 3,
    company_name: 'Nexus Commerce SRL',
    user_id: 3,
    user_email: 'bob@nexuscommerce.ro',
    user_name: 'Bob Operator',
    license_key: 'MASS-UTIL-BASIC-2026-S11Z',
    store_url: 'https://nexuscommerce.ro',
    package_tier: 'Basic Tier',
    status: 'expiring',
    expires_at: '2026-08-15',
    created_at: '2026-05-22'
  }
];

export const useAdminData = () => {
  const [authChecked, setAuthChecked] = useState(false);
  const [hasAdmin, setHasAdmin] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return (
      (window as any).PM_IS_DEMO === true ||
      (window as any).isDemoMode === true ||
      window.location.pathname.includes('/v2/') ||
      localStorage.getItem('pm_demo_mode') === 'true'
    );
  });

  const [licenses, setLicenses] = useState<License[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [tiers, setTiers] = useState<PackageTier[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastAlert | null>(null);

  const showAlert = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const resetDemoData = useCallback(() => {
    setCompanies([...MOCK_COMPANIES]);
    setUsers([...MOCK_USERS]);
    setTiers([...MOCK_TIERS]);
    setLicenses([...MOCK_LICENSES]);
    showAlert('🔄 Demo Vault Reset to Seed Defaults', 'success');
  }, [showAlert]);

  const enableDemoMode = useCallback(() => {
    setIsDemoMode(true);
    setAuthenticated(true);
    setHasAdmin(true);
    setAuthChecked(true);
    setCompanies([...MOCK_COMPANIES]);
    setUsers([...MOCK_USERS]);
    setTiers([...MOCK_TIERS]);
    setLicenses([...MOCK_LICENSES]);
    showAlert('🛡️ Super Admin Demo Mode Activated', 'success');
  }, [showAlert]);

  const disableDemoMode = useCallback(() => {
    setIsDemoMode(false);
    setAuthenticated(false);
    showAlert('🚪 Exited Admin Demo Mode', 'success');
  }, [showAlert]);

  // Demo Mutators for Interactive Sandbox Actions with Anti-Spam Safeguards
  const addCompany = useCallback((company: Partial<Company>) => {
    if (companies.length >= 12) {
      showAlert('⚠️ Demo Limit Reached: Maximum 12 sandbox organizations allowed. Reset vault to clear.', 'error');
      return null;
    }
    const newId = companies.length ? Math.max(...companies.map(c => Number(c.id))) + 1 : 1;
    const newCmp: Company = {
      id: newId,
      company_name: company.company_name || 'New Organization',
      tax_id: company.tax_id || 'TAX-' + Math.floor(1000000 + Math.random() * 9000000),
      max_licenses: company.max_licenses || 5,
      status: company.status || 'active',
      created_at: new Date().toISOString().split('T')[0],
      users_count: 0,
      licenses_count: 0
    };
    setCompanies(prev => [newCmp, ...prev]);
    showAlert(`🏢 Company Profile "${newCmp.company_name}" Created (Demo Sandbox)`, 'success');
    return newCmp;
  }, [companies, showAlert]);

  const updateCompany = useCallback((companyId: number, data: Partial<Company>) => {
    setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, ...data } : c));
    showAlert('🏢 Company Profile Details Updated', 'success');
  }, [showAlert]);

  const toggleCompanyStatus = useCallback((companyId: number) => {
    setCompanies(prev => prev.map(c => {
      if (c.id === companyId) {
        const nextStatus = c.status === 'active' ? 'suspended' : 'active';
        showAlert(`🏢 Organization "${c.company_name}" ${nextStatus === 'active' ? 'Activated' : 'Suspended'}`, 'success');
        return { ...c, status: nextStatus };
      }
      return c;
    }));
  }, [showAlert]);

  const deleteCompany = useCallback((companyId: number) => {
    setCompanies(prev => prev.filter(c => c.id !== companyId));
    showAlert('🗑️ Company Profile Removed (Demo Sandbox)', 'success');
  }, [showAlert]);

  const addUser = useCallback((user: Partial<UserAccount>) => {
    if (users.length >= 15) {
      showAlert('⚠️ Demo Limit Reached: Maximum 15 sandbox client accounts allowed. Reset vault to clear.', 'error');
      return null;
    }
    const newId = users.length ? Math.max(...users.map(u => Number(u.id))) + 1 : 1;
    const newUser: UserAccount = {
      id: newId,
      email: user.email || 'client@example.com',
      name: user.name || user.email?.split('@')[0] || 'Client Account',
      company_name: user.company_name || 'Independent Client',
      company_id: user.company_id || 1,
      role: user.role || 'CompanyAdmin',
      status: user.status || 'active',
      created_at: new Date().toISOString().split('T')[0]
    };
    setUsers(prev => [newUser, ...prev]);
    return newUser;
  }, [users, showAlert]);

  const updateUser = useCallback((userId: number, data: Partial<UserAccount>) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data } : u));
    showAlert('👤 Client Account Details Updated', 'success');
  }, [showAlert]);

  const toggleUserStatus = useCallback((userId: number) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const nextStatus = u.status === 'active' ? 'suspended' : 'active';
        showAlert(`👤 Account "${u.email}" ${nextStatus === 'active' ? 'Activated' : 'Suspended'}`, 'success');
        return { ...u, status: nextStatus };
      }
      return u;
    }));
  }, [showAlert]);

  const deleteUser = useCallback((userId: number) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    showAlert('🗑️ Client Account Removed (Demo Sandbox)', 'success');
  }, [showAlert]);

  const addLicense = useCallback((license: Partial<License>) => {
    if (licenses.length >= 15) {
      showAlert('⚠️ Demo Limit Reached: Maximum 15 sandbox licenses allowed. Reset vault to clear.', 'error');
      return null;
    }
    const newId = licenses.length ? Math.max(...licenses.map(l => Number(l.id))) + 1 : 1;
    const key = 'MASS-UTIL-DEMO-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const newLic: License = {
      id: newId,
      license_key: license.license_key || key,
      company_id: license.company_id || 1,
      company_name: license.company_name || 'Acme Enterprise Store',
      user_id: license.user_id || 1,
      user_email: license.user_email || 'john@acmestore.com',
      package_tier: license.package_tier || 'Professional Tier',
      status: license.status || 'active',
      expires_at: license.expires_at || '2027-12-31',
      created_at: new Date().toISOString().split('T')[0]
    };
    setLicenses(prev => [newLic, ...prev]);
    showAlert(`🔑 License Key "${newLic.license_key}" Issued (Demo Sandbox)`, 'success');
    return newLic;
  }, [licenses, showAlert]);

  const deleteLicense = useCallback((licenseId: number) => {
    setLicenses(prev => prev.filter(l => l.id !== licenseId));
    showAlert('🗑️ License Key Revoked & Removed', 'success');
  }, [showAlert]);

  const checkAuth = useCallback(async () => {
    if (isDemoMode) {
      setHasAdmin(true);
      setAuthenticated(true);
      setAuthChecked(true);
      setCompanies([...MOCK_COMPANIES]);
      setUsers([...MOCK_USERS]);
      setTiers([...MOCK_TIERS]);
      setLicenses([...MOCK_LICENSES]);
      return;
    }
    try {
      const res = await fetch(getApiUrl('api_status'));
      const data = await res.json();
      if (data.success) {
        setHasAdmin(data.has_admin);
        setAuthenticated(data.authenticated);
      } else {
        setAuthenticated(false);
      }
    } catch {
      setAuthenticated(false);
    } finally {
      setAuthChecked(true);
    }
  }, [isDemoMode]);

  const fetchAdminData = useCallback(async () => {
    if (isDemoMode) return;
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('api_list'));
      const data = await res.json();
      if (data.success) {
        setLicenses(data.licenses || []);
        setCompanies(data.companies || []);
        setTiers(data.tiers || []);
        setUsers(data.users || []);
      }
    } catch {
      // Network fetch error fallback
    } finally {
      setLoading(false);
    }
  }, [isDemoMode]);

  useEffect(() => {
    setDemoActiveFlag(isDemoMode);
    registerDemoVault({
      getCompanies: () => companies,
      getUsers: () => users,
      getLicenses: () => licenses,
      getTiers: () => tiers,
      getRoles: () => [
        { id: 1, name: 'Super Admin', slug: 'SuperAdmin', description: 'Full administrative access across all tenant features', is_system: 1, permissions: ['ast.query', 'ast.mutate', 'db.backup', 'db.restore', 'db.drop', 'files.backup', 'files.delete', 'settings.update', 'users.manage'] },
        { id: 2, name: 'Company Owner', slug: 'Owner', description: 'Primary organization owner with full tenant administrative authority', is_system: 1, permissions: ['ast.query', 'ast.mutate', 'db.backup', 'db.restore', 'db.drop', 'files.backup', 'files.delete', 'settings.update', 'users.manage'] },
        { id: 3, name: 'Company Admin', slug: 'CompanyAdmin', description: 'Organization administrator with user management rights', is_system: 1, permissions: ['ast.query', 'ast.mutate', 'db.backup', 'db.restore', 'db.drop', 'files.backup', 'files.delete', 'settings.update', 'users.manage'] },
        { id: 4, name: 'Catalog Manager', slug: 'CatalogManager', description: 'Full AST query and mutation capabilities', is_system: 1, permissions: ['ast.query', 'ast.mutate', 'db.backup', 'files.backup'] },
        { id: 5, name: 'Operator', slug: 'Operator', description: 'Standard maintenance and backup creation operator', is_system: 1, permissions: ['ast.query', 'db.backup', 'files.backup'] },
        { id: 6, name: 'Observer', slug: 'Observer', description: 'Read-only catalog and telemetry monitoring access', is_system: 1, permissions: ['ast.query'] }
      ],
      getPermissions: () => [
        { id: 1, slug: 'ast.query', group_name: 'AST Engine', description: 'Build visual SQL queries and inspect product catalogs' },
        { id: 2, slug: 'ast.mutate', group_name: 'AST Engine', description: 'Execute live database mutations and bulk catalog updates' },
        { id: 3, slug: 'db.backup', group_name: 'Database Tools', description: 'Create and compress database table backups' },
        { id: 4, slug: 'db.restore', group_name: 'Database Tools', description: 'Restore database snapshot backups' },
        { id: 5, slug: 'db.drop', group_name: 'Database Tools', description: 'Delete database backups or drop snapshot records' },
        { id: 6, slug: 'files.backup', group_name: 'File Systems', description: 'Archive directory assets and file backups' },
        { id: 7, slug: 'files.delete', group_name: 'File Systems', description: 'Delete file backup archives' },
        { id: 8, slug: 'settings.update', group_name: 'System Settings', description: 'Configure cron automation and governor rules' },
        { id: 9, slug: 'users.manage', group_name: 'User Access', description: 'Manage company users and role assignments' }
      ],
      getAuditLogs: () => [
        {
          id: 1,
          admin_username: 'superadmin',
          action_type: 'LICENSE_GENERATED',
          target_entity: 'LICENSE',
          target_id: 'MASS-8F4A-9C2E',
          details: 'Generated Enterprise Tier license key for Acme Enterprise Store',
          details_parsed: { tier: 'enterprise', company: 'Acme Enterprise Store' },
          ip_address: '127.0.0.1',
          created_at: '2026-07-30 08:30:00'
        },
        {
          id: 2,
          admin_username: 'superadmin',
          action_type: 'COMPANY_CREATED',
          target_entity: 'COMPANY',
          target_id: 'PrestaShop Global Direct',
          details: 'Created new B2B company profile',
          details_parsed: { max_licenses: 5 },
          ip_address: '127.0.0.1',
          created_at: '2026-07-30 09:15:00'
        },
        {
          id: 3,
          admin_username: 'superadmin',
          action_type: 'USER_ROLE_UPDATED',
          target_entity: 'USER',
          target_id: 'john@acmestore.com',
          details: 'Assigned SuperAdmin role to client account',
          details_parsed: { role: 'SuperAdmin' },
          ip_address: '127.0.0.1',
          created_at: '2026-07-30 10:45:00'
        }
      ],
      addCompany,
      updateCompany,
      toggleCompanyStatus,
      deleteCompany,
      addUser,
      updateUser,
      toggleUserStatus,
      deleteUser,
      addLicense,
      deleteLicense,
      createTier: (tier: any) => {
        const newTier = { id: tiers.length + 1, ...tier };
        setTiers(prev => [...prev, newTier]);
        return newTier;
      },
      deleteTier: (id: number) => {
        setTiers(prev => prev.filter(t => t.id !== id));
      },
      clearAuditLogs: () => {}
    });
  }, [isDemoMode, companies, users, licenses, tiers, addCompany, updateCompany, toggleCompanyStatus, deleteCompany, addUser, updateUser, toggleUserStatus, deleteUser, addLicense, deleteLicense]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (authenticated && !isDemoMode) {
      fetchAdminData();
    }
  }, [authenticated, isDemoMode, fetchAdminData]);

  return {
    authChecked,
    hasAdmin,
    authenticated,
    setAuthenticated,
    isDemoMode,
    enableDemoMode,
    disableDemoMode,
    resetDemoData,
    addCompany,
    updateCompany,
    toggleCompanyStatus,
    deleteCompany,
    addUser,
    updateUser,
    toggleUserStatus,
    deleteUser,
    addLicense,
    deleteLicense,
    licenses,
    companies,
    tiers,
    users,
    setCompanies,
    setLicenses,
    setTiers,
    setUsers,
    loading,
    toast,
    setToast,
    showAlert,
    checkAuth,
    fetchAdminData,
    getApiUrl,
  };
};

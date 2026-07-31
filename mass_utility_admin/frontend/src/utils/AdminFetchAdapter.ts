// @Arch[AdminFetchAdapter]
// Single-Source Network Adapter for Super Admin SaaS Broker SPA.
// Intercepts network calls when Demo Mode is active and returns simulated JSON responses.

import { Company, UserAccount, License, RbacRole, RbacPermission } from '../types/adminApi';

export const getApiUrl = (action: string): string => {
  return `${window.location.pathname}?action=${action}`;
};

interface DemoVault {
  getCompanies: () => Company[];
  getUsers: () => UserAccount[];
  getLicenses: () => License[];
  getTiers: () => any[];
  getRoles: () => RbacRole[];
  getPermissions?: () => RbacPermission[];
  getAuditLogs: () => any[];
  addCompany: (comp: Partial<Company>) => Company | null;
  updateCompany: (id: number, data: Partial<Company>) => void;
  toggleCompanyStatus: (id: number) => void;
  deleteCompany: (id: number) => void;
  addUser: (user: Partial<UserAccount>) => UserAccount | null;
  updateUser: (id: number, data: Partial<UserAccount>) => void;
  toggleUserStatus: (id: number) => void;
  deleteUser: (id: number) => void;
  addLicense: (lic: Partial<License>) => License | null;
  deleteLicense: (id: number) => void;
  createTier: (tier: any) => any;
  deleteTier: (id: number) => void;
  clearAuditLogs: () => any;
}

let activeVault: DemoVault | null = null;
let isDemoActiveFlag = false;

export const setDemoActiveFlag = (active: boolean) => {
  isDemoActiveFlag = active;
  (window as any).isDemoMode = active;
};

export const registerDemoVault = (vault: DemoVault) => {
  activeVault = vault;
};

export class AdminFetchAdapter {
  static async request(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const isDemo = isDemoActiveFlag || (window as any).isDemoMode === true;

    if (!isDemo || !activeVault) {
      return fetch(input, init);
    }

    // Extract action parameter from query string (e.g. index.php?action=api_companies or ?action=api_generate)
    const urlObj = new URL(urlStr, window.location.origin);
    const action = urlObj.searchParams.get('action') || '';

    // Handle FormData or JSON payload
    let payload: any = {};
    if (init && init.body) {
      if (typeof init.body === 'string') {
        try { payload = JSON.parse(init.body); } catch (e) { payload = {}; }
      } else if (init.body instanceof FormData) {
        init.body.forEach((val, key) => {
          payload[key] = val;
        });
      }
    }

    // Artificial network latency simulation (150ms) for realistic UX button spinners
    await new Promise(r => setTimeout(r, 150));

    const mockResponse = AdminFetchAdapter.dispatchMockAction(action, payload);
    return new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private static dispatchMockAction(action: string, payload: any): any {
    if (!activeVault) return { success: false, error: 'Demo vault uninitialized' };

    switch (action) {
      // --- COMPANIES ROUTING ---
      case 'api_companies':
        return { success: true, companies: activeVault.getCompanies() };

      case 'api_create_company': {
        const created = activeVault.addCompany({
          company_name: payload.company_name,
          tax_id: payload.tax_id,
          max_licenses: Number(payload.max_licenses) || 5
        });
        return created ? { success: true, company: created } : { success: false, error: 'Maximum company capacity reached (12)' };
      }

      case 'api_update_company':
        if (payload.status) {
          activeVault.toggleCompanyStatus(Number(payload.id));
        } else {
          activeVault.updateCompany(Number(payload.id), payload);
        }
        return { success: true };

      case 'api_delete_company':
        activeVault.deleteCompany(Number(payload.id));
        return { success: true };

      case 'api_company_roles':
        return { success: true, overrides: {} };

      case 'api_company_role_update':
        return { success: true };

      // --- CLIENTS ROUTING ---
      case 'api_users':
        return { success: true, users: activeVault.getUsers() };

      case 'api_create_user': {
        const createdUser = activeVault.addUser({
          email: payload.email,
          company_name: payload.company_name,
          role: payload.role || 'Company Admin'
        });
        if (!createdUser) return { success: false, error: 'Maximum client account capacity reached (15)' };

        let issuedKey = null;
        if (payload.provision_license === '1' || payload.provision_license === true) {
          issuedKey = activeVault.addLicense({
            user_id: createdUser.id,
            package_tier: payload.package_tier || 'Professional Tier',
            store_url: `https://${payload.email.split('@')[1] || 'store.com'}`
          });
        }

        return {
          success: true,
          user: createdUser,
          license_key: issuedKey ? issuedKey.license_key : null,
          temp_password: payload.password || 'DemoPass123!'
        };
      }

      case 'api_update_user':
        if (payload.status) {
          activeVault.toggleUserStatus(Number(payload.id));
        } else {
          activeVault.updateUser(Number(payload.id), payload);
        }
        return { success: true };

      case 'api_delete_user':
        activeVault.deleteUser(Number(payload.id));
        return { success: true };

      case 'api_reset_user_password':
        return { success: true, message: 'Password reset successfully in sandbox.' };

      // --- LICENSES ROUTING ---
      case 'api_licenses':
        return { success: true, licenses: activeVault.getLicenses() };

      case 'api_generate':
      case 'api_generate_license': {
        const created = activeVault.addLicense({
          user_id: Number(payload.user_id) || undefined,
          company_id: Number(payload.company_id) || undefined,
          package_tier: payload.package_tier || 'Professional Tier',
          expires_at: payload.expires_at,
          store_url: payload.store_url || 'https://demo-store.com'
        });
        return created
          ? { success: true, license_key: created.license_key, license: created }
          : { success: false, error: 'Maximum license capacity reached (15)' };
      }

      case 'api_update':
        return { success: true };

      case 'api_extend_license': {
        const lic = activeVault.getLicenses().find(l => Number(l.id) === Number(payload.id));
        if (lic) {
          const futureDate = new Date();
          futureDate.setMonth(futureDate.getMonth() + (Number(payload.months) || 3));
          lic.expires_at = payload.custom_date || futureDate.toISOString().split('T')[0];
        }
        return { success: true };
      }

      case 'api_assign_license': {
        const lic = activeVault.getLicenses().find(l => Number(l.id) === Number(payload.id));
        if (lic) {
          lic.user_id = Number(payload.user_id);
        }
        return { success: true };
      }

      case 'api_delete_license':
        activeVault.deleteLicense(Number(payload.id));
        return { success: true };

      // --- ROLES & GOVERNANCE ROUTING ---
      case 'api_roles':
      case 'api_rbac_roles':
        return {
          success: true,
          roles: activeVault.getRoles(),
          permissions: activeVault.getPermissions ? activeVault.getPermissions() : [],
          package_tiers: activeVault.getTiers()
        };

      case 'api_role_create':
        return { success: true };

      case 'api_role_update':
        return { success: true };

      case 'api_role_delete':
        return { success: true };

      // --- PACKAGE TIERS ROUTING ---
      case 'api_package_tiers':
        return { success: true, tiers: activeVault.getTiers() };

      case 'api_create_tier': {
        const created = activeVault.createTier(payload);
        return { success: true, tier: created };
      }

      case 'api_update_tier':
        return { success: true };

      case 'api_delete_tier':
        activeVault.deleteTier(Number(payload.id));
        return { success: true };

      // --- AUDIT LOGS & SYSTEM ROUTING ---
      case 'api_audit_logs':
        return { success: true, logs: activeVault.getAuditLogs() };

      case 'api_clear_audit_logs': {
        const clearedLogs = activeVault.clearAuditLogs() || [];
        return { success: true, logs: clearedLogs };
      }

      case 'api_system_status':
        return {
          success: true,
          status: 'HEALTHY',
          telemetry: {
            memory_free: '1.2 GB',
            memory_total: '2.0 GB',
            cpu_load: '12%',
            active_connections: 4
          }
        };

      case 'api_settings':
      case 'api_save_settings':
        return { success: true, message: 'Settings saved in sandbox.' };

      default:
        return { success: true, data: [] };
    }
  }
}

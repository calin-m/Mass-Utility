// @Arch[useAuthStore]
export interface UserPermissions {
  id: number;
  name: string;
  email: string;
  role: 'SuperAdmin' | 'CompanyAdmin' | 'CatalogManager' | 'Operator' | 'Observer' | string;
  company_name?: string;
  company_id?: number;
  permissions: string[];
}

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: UserPermissions | null;
  isAutoSso: boolean;
}

export const defaultStoreOwnerUser: UserPermissions = {
  id: 1,
  name: 'Store Owner',
  email: 'owner@store.com',
  role: 'SuperAdmin',
  company_name: 'Store Tenant',
  permissions: [
    'ast.query', 'ast.mutate', 'db.backup', 'db.restore', 'db.drop',
    'files.backup', 'files.delete', 'settings.update', 'users.manage'
  ]
};

export const defaultDemoUser: UserPermissions = {
  id: 402,
  name: 'Demo Administrator',
  email: 'demo.admin@massutility.com',
  role: 'CompanyAdmin',
  company_name: 'Acme SaaS Enterprise Corp (Demo Tenant #402)',
  company_id: 402,
  permissions: [
    'ast.query', 'ast.mutate', 'db.backup', 'db.restore', 'db.diff',
    'file.browse', 'file.backup', 'sweeper.execute', 'security.audit',
    'settings.update', 'users.manage'
  ]
};

export class AuthStore {
  private static listeners: Array<() => void> = [];
  private static state: AuthState = (() => {
    // Synchronous PrestaShop Module OTT Auto-SSO Check on Boot (Frame 0)
    let isOttLaunch = false;
    let isDemoMode = false;
    try {
      if (typeof window !== 'undefined') {
        const pmConfig = (window as any).PM_CONFIG;
        if (window.location.search.includes('ott=') || (pmConfig && (pmConfig.isAutoSso || pmConfig.employee_id))) {
          isOttLaunch = true;
        }
        if ((window as any).PM_IS_DEMO || (window as any).isDemoMode || window.location.pathname.includes('/demo')) {
          isDemoMode = true;
        }
      }
    } catch (e) {}

    const savedToken = localStorage.getItem('pm_user_token');
    const savedUser = localStorage.getItem('pm_user_data');
    let user: UserPermissions | null = null;
    if (savedUser) {
      try {
        user = JSON.parse(savedUser);
      } catch (e) {}
    }

    if (isOttLaunch) {
      return {
        isAuthenticated: true,
        token: savedToken || 'ott_auto_sso_token',
        user: user || defaultStoreOwnerUser,
        isAutoSso: true,
      };
    }

    if (isDemoMode) {
      return {
        isAuthenticated: true,
        token: 'demo_token_session',
        user: user || defaultDemoUser,
        isAutoSso: false,
      };
    }

    return {
      isAuthenticated: !!savedToken,
      token: savedToken,
      user: savedToken ? (user || defaultStoreOwnerUser) : null,
      isAutoSso: false,
    };
  })();

  public static getState(): AuthState {
    return AuthStore.state;
  }

  public static setSession(token: string, user: UserPermissions, isAutoSso: boolean = false): void {
    localStorage.setItem('pm_user_token', token);
    localStorage.setItem('pm_user_data', JSON.stringify(user));
    AuthStore.state = {
      isAuthenticated: true,
      token,
      user,
      isAutoSso,
    };
    AuthStore.notify();
  }

  public static logout(): void {
    localStorage.removeItem('pm_user_token');
    localStorage.removeItem('pm_user_data');
    try {
      if (typeof window !== 'undefined') {
        delete (window as any).PM_CONFIG;
        delete (window as any).PM_CAPABILITIES;
      }
    } catch (e) {}
    AuthStore.state = {
      isAuthenticated: false,
      token: null,
      user: null,
      isAutoSso: false,
    };
    AuthStore.notify();
  }

  public static subscribe(listener: () => void): () => void {
    AuthStore.listeners.push(listener);
    return () => {
      AuthStore.listeners = AuthStore.listeners.filter((l) => l !== listener);
    };
  }

  public static hasPermission(capability: string): boolean {
    const user = AuthStore.state.user;
    if (!AuthStore.state.isAuthenticated || !user) {
      return false;
    }

    if (user.role === 'SuperAdmin' || user.role === 'CompanyAdmin') {
      return true;
    }

    return (user.permissions || []).includes(capability);
  }

  private static notify(): void {
    AuthStore.listeners.forEach((l) => l());
  }
}

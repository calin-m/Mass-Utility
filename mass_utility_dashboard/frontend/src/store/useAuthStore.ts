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

export class AuthStore {
  private static listeners: Array<() => void> = [];
  private static state: AuthState = (() => {
    const savedToken = localStorage.getItem('pm_user_token');
    const savedUser = localStorage.getItem('pm_user_data');
    let user: UserPermissions | null = null;
    if (savedUser) {
      try {
        user = JSON.parse(savedUser);
      } catch (e) {}
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

  private static notify(): void {
    AuthStore.listeners.forEach((l) => l());
  }
}

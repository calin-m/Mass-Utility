// @Arch[adminApi]
// Super-Admin Portal Central TypeScript Domain Models & API Payload Contracts

export interface License {
  id: number;
  company_id?: number | null;
  company_name?: string | null;
  user_id?: number | null;
  user_email?: string | null;
  user_name?: string | null;
  license_key: string;
  store_url?: string | null;
  package_tier: string;
  status: 'active' | 'expiring' | 'suspended' | 'expired' | 'revoked';
  expires_at?: string | null;
  created_at?: string | null;
}

export interface UserAccount {
  id: number;
  email: string;
  name?: string | null;
  company_name?: string | null;
  company_id?: number | null;
  role?: string | null;
  status?: 'active' | 'suspended' | string;
  created_at?: string | null;
  license_count?: number;
  active_license_count?: number;
}

export interface Company {
  id: number;
  company_name: string;
  tax_id?: string;
  max_licenses?: number;
  status: 'active' | 'suspended' | string;
  created_at?: string | null;
  users_count?: number;
  licenses_count?: number;
  user_count?: number;
  license_count?: number;
}

export interface PackageTier {
  id?: number;
  name: string;
  display_name?: string | null;
  description?: string | null;
  max_domains?: number;
  max_rollback_snapshots?: number;
  max_cloud_backups?: number;
  allow_ast_queries?: boolean;
  capabilities: any;
  active_licenses?: number;
  created_at?: string | null;
}

export interface ApiAdminResponse<T = any> {
  success: boolean;
  error?: string;
  message?: string;
  data?: T;
  licenses?: License[];
  users?: UserAccount[];
  companies?: Company[];
  tiers?: PackageTier[];
}

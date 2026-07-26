import { useState, useEffect, useCallback } from 'react';
import { License, UserAccount, Company, PackageTier } from '../types/adminApi';

export interface ToastAlert {
  msg: string;
  type: 'success' | 'error';
}

const getApiUrl = (action: string) => {
  const path = window.location.pathname;
  return `${path}?action=${action}`;
};

export const useAdminData = () => {
  const [authChecked, setAuthChecked] = useState(false);
  const [hasAdmin, setHasAdmin] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

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

  const checkAuth = useCallback(async () => {
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
  }, []);

  const fetchAdminData = useCallback(async () => {
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
      showAlert('Failed to synchronize admin portal data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (authenticated) {
      fetchAdminData();
    }
  }, [authenticated, fetchAdminData]);

  return {
    authChecked,
    hasAdmin,
    authenticated,
    setAuthenticated,
    licenses,
    companies,
    tiers,
    users,
    loading,
    toast,
    setToast,
    showAlert,
    checkAuth,
    fetchAdminData,
    getApiUrl,
  };
};

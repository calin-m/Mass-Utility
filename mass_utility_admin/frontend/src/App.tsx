import React, { useState, useEffect } from 'react';
import { Key, Package, Settings, ShieldCheck, Sun, Moon, LogOut, AlertCircle, CheckCircle, Users, Building2 } from 'lucide-react';
import { LicensesTab, License, UserAccount } from './components/LicensesTab';
import { ClientsTab } from './components/ClientsTab';
import { CompaniesTab, Company } from './components/CompaniesTab';
import { PackageTiersTab, PackageTier } from './components/PackageTiersTab';
import { SettingsTab } from './components/SettingsTab';
import { SecurityHealthTab } from './components/SecurityHealthTab';
import { LoginView } from './components/LoginView';
import { SetupView } from './components/SetupView';

export const App: React.FC = () => {
  const [authChecked, setAuthChecked] = useState(false);
  const [hasAdmin, setHasAdmin] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const [activeTab, setActiveTab] = useState<'companies' | 'clients' | 'licenses' | 'tiers' | 'settings' | 'security'>('companies');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('pm-theme') !== 'light';
  });

  const [licenses, setLicenses] = useState<License[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [tiers, setTiers] = useState<PackageTier[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showAlert = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getApiUrl = (action: string) => {
    const path = window.location.pathname;
    return `${path}?action=${action}`;
  };

  const checkStatus = async () => {
    try {
      const res = await fetch(getApiUrl('api_status'));
      const data = await res.json();
      if (data.success) {
        setHasAdmin(data.has_admin);
        setAuthenticated(data.authenticated);
        if (data.authenticated) {
          fetchAdminData();
        }
      }
    } catch (e) {
      setAuthenticated(false);
    } finally {
      setAuthChecked(true);
    }
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('api_list'));
      const data = await res.json();
      if (data.success) {
        setLicenses(data.licenses || []);
        setCompanies(data.companies || []);
        setTiers(data.tiers || []);
        setUsers(data.users || []);
      } else {
        showAlert('❌ ' + (data.error || 'Failed to fetch admin data'), 'error');
      }
    } catch (e: any) {
      showAlert('Failed to fetch admin data: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(getApiUrl('api_logout'));
      setAuthenticated(false);
      showAlert('Logged out successfully', 'success');
    } catch (e) {}
  };

  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('pm-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('pm-theme', 'light');
    }
  }, [darkMode]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-pm-bg text-pm-text flex items-center justify-center">
        <div className="text-xs font-semibold text-pm-secondary animate-pulse">
          Initializing Super Admin Gateway...
        </div>
      </div>
    );
  }

  if (!hasAdmin) {
    return <SetupView onSetupSuccess={() => { setHasAdmin(true); setAuthenticated(true); fetchAdminData(); }} />;
  }

  if (!authenticated) {
    return <LoginView onLoginSuccess={() => { setAuthenticated(true); fetchAdminData(); }} />;
  }
  const [inspectedClient, setInspectedClient] = useState<any | null>(null);

  const handleInspectClient = (client: any) => {
    setInspectedClient(client);
    setActiveTab('clients');
  };

  return (
    <div className="min-h-screen bg-pm-bg text-pm-text p-4 md:p-8 transition-colors duration-200">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top duration-200 ${
          toast.type === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Admin Navigation Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-4 border-b border-pm-border">
        <div>
          <h1 className="text-xl font-extrabold text-pm-text flex items-center gap-2">
            <span className="bg-gradient-to-r from-purple-500 to-indigo-500 bg-clip-text text-transparent">Mass Utility Super Admin</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold uppercase">B2B v2.1</span>
          </h1>
          <p className="text-xs text-pm-secondary mt-0.5">Centralized Enterprise SaaS License Broker, B2B Companies Directory &amp; Tenant Operations Center</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="pm-btn-neutral px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            title="Toggle Light / Dark Theme"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
            <span>{darkMode ? 'Light' : 'Dark'}</span>
          </button>

          <button
            onClick={handleLogout}
            className="pm-btn-danger-outline px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="flex w-full justify-between mb-8 border-b border-pm-border pb-4 overflow-x-auto gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('companies')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'companies' ? 'pm-btn-primary shadow-md' : 'pm-btn-neutral'
            }`}
          >
            <Building2 className="w-4 h-4" /> Companies Directory
          </button>

          <button
            onClick={() => {
              setInspectedClient(null);
              setActiveTab('clients');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'clients' ? 'pm-btn-primary shadow-md' : 'pm-btn-neutral'
            }`}
          >
            <Users className="w-4 h-4" /> Clients Directory
          </button>

          <button
            onClick={() => setActiveTab('licenses')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'licenses' ? 'pm-btn-primary shadow-md' : 'pm-btn-neutral'
            }`}
          >
            <Key className="w-4 h-4" /> Licenses &amp; Subscriptions
          </button>

          <button
            onClick={() => setActiveTab('tiers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'tiers' ? 'pm-btn-primary shadow-md' : 'pm-btn-neutral'
            }`}
          >
            <Package className="w-4 h-4" /> Package Tiers
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'settings' ? 'pm-btn-primary shadow-md' : 'pm-btn-neutral'
            }`}
          >
            <Settings className="w-4 h-4" /> Settings
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'security' ? 'pm-btn-primary shadow-md' : 'pm-btn-neutral'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Security &amp; Health
          </button>
        </div>
      </nav>

      {/* Main Tab Content */}
      <main>
        {activeTab === 'companies' && (
          <CompaniesTab companies={companies} users={users} licenses={licenses} onRefresh={fetchAdminData} showAlert={showAlert} onInspectClient={handleInspectClient} />
        )}
        {activeTab === 'clients' && (
          <ClientsTab users={users} licenses={licenses} onRefresh={fetchAdminData} showAlert={showAlert} initialSelectedUser={inspectedClient} />
        )}
        {activeTab === 'licenses' && (
          <LicensesTab licenses={licenses} users={users} onRefresh={fetchAdminData} showAlert={showAlert} />
        )}
        {activeTab === 'tiers' && (
          <PackageTiersTab tiers={tiers} onRefresh={fetchAdminData} showAlert={showAlert} />
        )}
        {activeTab === 'settings' && <SettingsTab showAlert={showAlert} />}
        {activeTab === 'security' && <SecurityHealthTab showAlert={showAlert} />}
      </main>
    </div>
  );
};

export default App;

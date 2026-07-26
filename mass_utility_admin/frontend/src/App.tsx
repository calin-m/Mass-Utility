import React, { useState, useEffect } from 'react';
import { Key, Package, Settings, ShieldCheck, Shield, Sun, Moon, LogOut, AlertCircle, CheckCircle, Users, Building2, X } from 'lucide-react';
import { LicensesTab } from './components/LicensesTab';
import { ClientsTab } from './components/ClientsTab';
import { CompaniesTab } from './components/CompaniesTab';
import { PackageTiersTab } from './components/PackageTiersTab';
import { SettingsTab } from './components/SettingsTab';
import { SecurityHealthTab } from './components/SecurityHealthTab';
import { AuditLogsTab } from './components/AuditLogsTab';
import { LoginView } from './components/LoginView';
import { SetupView } from './components/SetupView';
import { ToastNotification } from './components/common/ToastNotification';
import { useTranslation } from './i18n/LanguageContext';
import { useAdminData } from './hooks/useAdminData';
import { License, UserAccount, Company } from './types/adminApi';

export const App: React.FC = () => {
  const { t } = useTranslation();
  const {
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
    fetchAdminData,
    checkAuth,
  } = useAdminData();

  const [activeTab, setActiveTab] = useState<'companies' | 'clients' | 'licenses' | 'tiers' | 'settings' | 'security' | 'audit'>('companies');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('pm-theme') !== 'light';
  });

  const [inspectedClient, setInspectedClient] = useState<UserAccount | null>(null);
  const [inspectedCompany, setInspectedCompany] = useState<Company | null>(null);
  const [highlightedLicenseKey, setHighlightedLicenseKey] = useState<string | null>(null);

  const handleInspectClient = (client: UserAccount) => {
    setInspectedClient(client);
    setActiveTab('clients');
  };

  const handleInspectCompany = (company: Company, licenseKey?: string | null) => {
    setInspectedCompany(company);
    setHighlightedLicenseKey(licenseKey || null);
    setActiveTab('companies');
  };


  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('pm-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('pm-theme', 'light');
    }
  }, [darkMode]);

  const handleLogout = async () => {
    try {
      await fetch('index.php?action=api_logout');
      setAuthenticated(false);
    } catch (e) {}
  };


  if (!authChecked) {
    return (
      <div className="min-h-screen bg-pm-bg text-pm-text flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-pm-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-pm-secondary font-mono">Initializing Super Admin Portal...</p>
        </div>
      </div>
    );
  }

  if (!hasAdmin) {
    return <SetupView onSetupSuccess={() => checkAuth()} />;
  }


  if (!authenticated) {
    return <LoginView onLoginSuccess={() => { setAuthenticated(true); fetchAdminData(); }} />;
  }

  return (
    <div className="min-h-screen bg-pm-bg text-pm-text p-4 md:p-8 transition-colors duration-200">
      {/* Toast Notification */}
      <ToastNotification toast={toast} onClose={() => setToast(null)} />

      {/* Admin Navigation Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-4 border-b border-pm-border">
        <div>
          <h1 className="text-xl font-extrabold text-pm-text flex items-center gap-2">
            <span className="bg-gradient-to-r from-purple-500 to-indigo-500 bg-clip-text text-transparent">{t('portal_title')}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold uppercase">{t('portal_tag')}</span>
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
            <span>{t('logout')}</span>
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="flex w-full justify-between mb-8 border-b border-pm-border pb-4 overflow-x-auto gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setInspectedCompany(null);
              setHighlightedLicenseKey(null);
              setActiveTab('companies');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'companies' ? 'pm-btn-primary shadow-md' : 'pm-btn-neutral'
            }`}
          >

            <Building2 className="w-4 h-4" /> {t('nav_companies')}
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
            <Users className="w-4 h-4" /> {t('nav_clients')}
          </button>

          <button
            onClick={() => setActiveTab('licenses')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'licenses' ? 'pm-btn-primary shadow-md' : 'pm-btn-neutral'
            }`}
          >
            <Key className="w-4 h-4" /> {t('nav_licenses')}
          </button>

          <button
            onClick={() => setActiveTab('tiers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'tiers' ? 'pm-btn-primary shadow-md' : 'pm-btn-neutral'
            }`}
          >
            <Package className="w-4 h-4" /> {t('nav_package_tiers')}
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'settings' ? 'pm-btn-primary shadow-md' : 'pm-btn-neutral'
            }`}
          >
            <Settings className="w-4 h-4" /> {t('nav_settings')}
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'security' ? 'pm-btn-primary shadow-md' : 'pm-btn-neutral'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> {t('nav_security')}
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'audit' ? 'pm-btn-primary shadow-md' : 'pm-btn-neutral'
            }`}
          >
            <Shield className="w-4 h-4" /> {t('nav_audit_logs')}
          </button>
        </div>
      </nav>

      {/* Main Tab Content Display */}
      <main className="w-full">
        {activeTab === 'companies' && (
          <CompaniesTab
            companies={companies}
            users={users}
            licenses={licenses}
            tiers={tiers}
            onRefresh={fetchAdminData}
            showAlert={showAlert}
            onInspectClient={handleInspectClient}
            onEditLicense={() => setActiveTab('licenses')}
            initialSelectedCompany={inspectedCompany}
            highlightedLicenseKey={highlightedLicenseKey}
          />
        )}


        {activeTab === 'clients' && (
          <ClientsTab
            users={users}
            licenses={licenses}
            companies={companies}
            tiers={tiers}
            onRefresh={fetchAdminData}
            showAlert={showAlert}
            initialSelectedUser={inspectedClient}
            onInspectCompany={handleInspectCompany}
          />
        )}


        {activeTab === 'licenses' && (
          <LicensesTab
            licenses={licenses}
            users={users}
            companies={companies}
            tiers={tiers}
            onRefresh={fetchAdminData}
            showAlert={showAlert}
            onInspectClient={handleInspectClient}
            onInspectCompany={handleInspectCompany}
          />
        )}



        {activeTab === 'tiers' && (
          <PackageTiersTab
            tiers={tiers}
            onRefresh={fetchAdminData}
            showAlert={showAlert}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab showAlert={showAlert} />
        )}

        {activeTab === 'security' && (
          <SecurityHealthTab showAlert={showAlert} />
        )}

        {activeTab === 'audit' && (
          <AuditLogsTab onNotify={showAlert} />
        )}
      </main>
    </div>
  );
};

export default App;

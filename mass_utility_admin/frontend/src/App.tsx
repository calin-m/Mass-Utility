import React, { useState, useEffect } from 'react';
import { Key, Package, Settings, ShieldCheck, Sun, Moon, LogOut, Code, AlertCircle, CheckCircle } from 'lucide-react';
import { LicensesTab, License } from './components/LicensesTab';
import { PackageTiersTab, PackageTier } from './components/PackageTiersTab';
import { SettingsTab } from './components/SettingsTab';
import { SecurityHealthTab } from './components/SecurityHealthTab';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'licenses' | 'tiers' | 'settings' | 'security'>('licenses');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('pm-theme') !== 'light';
  });

  const [licenses, setLicenses] = useState<License[]>([]);
  const [tiers, setTiers] = useState<PackageTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showAlert = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const res = await fetch('index.php?action=api_list');
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        window.location.href = 'index.php?action=login';
        return;
      }
      const data = await res.json();
      if (data.success) {
        setLicenses(data.licenses || []);
        setTiers(data.package_tiers || []);
      } else {
        showAlert('❌ ' + (data.error || 'Failed to fetch admin data'), 'error');
      }
    } catch (e: any) {
      showAlert('Failed to fetch admin data: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
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

  return (
    <div className="min-h-screen bg-pm-bg text-pm-text p-6 transition-colors duration-200">
      {/* Toast Alert Banner */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2 ${
          toast.type === 'success'
            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
            : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header Bar */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 mb-8 border-b border-pm-border gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-indigo-500 bg-clip-text text-transparent">
            🛠️ Project Mass - Super Admin Portal
          </h2>
          <span className="px-2.5 py-0.5 text-[0.65rem] font-bold uppercase rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
            V2 React SPA Active
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="pm-btn-neutral px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            title="Toggle Light / Dark Theme"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
            <span>{darkMode ? '☀️ Light' : '🌙 Dark'}</span>
          </button>

          <a
            href="index.php?ui=v1"
            className="pm-btn-neutral px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
            title="Switch to Legacy V1 TPL Layout"
          >
            <Code className="w-3.5 h-3.5" />
            <span>📜 V1 Legacy View</span>
          </a>

          <a
            href="index.php?action=logout"
            className="pm-btn-danger-outline px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </a>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="flex gap-2 mb-8 border-b border-pm-border pb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('licenses')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
            activeTab === 'licenses' ? 'pm-btn-primary shadow-md' : 'pm-btn-neutral'
          }`}
        >
          <Key className="w-4 h-4" /> Licenses & Clients
        </button>

        <button
          onClick={() => setActiveTab('tiers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
            activeTab === 'tiers' ? 'pm-btn-primary shadow-md' : 'pm-btn-neutral'
          }`}
        >
          <Package className="w-4 h-4" /> Package Tiers
        </button>

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
          <ShieldCheck className="w-4 h-4" /> Security & Health
        </button>
      </nav>

      {/* Main Tab Content */}
      <main>
        {activeTab === 'licenses' && (
          <LicensesTab licenses={licenses} onRefresh={fetchAdminData} showAlert={showAlert} />
        )}
        {activeTab === 'tiers' && (
          <PackageTiersTab tiers={tiers} onRefresh={fetchAdminData} showAlert={showAlert} />
        )}
        {activeTab === 'settings' && <SettingsTab showAlert={showAlert} />}
        {activeTab === 'security' && <SecurityHealthTab />}
      </main>
    </div>
  );
};

export default App;

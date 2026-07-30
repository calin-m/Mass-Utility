// @Arch[UI_Components]
// @Description: Root React component managing dashboard state, layout navigation tabs, and light/dark theme switchers.
// @Calls: logout

import { useState, useEffect } from 'react';
import { SettingsTab } from './components/settings/SettingsTab';
import { FileToolsTab } from './components/file_tools/FileToolsTab';
import { GovernorTab } from './components/governor/GovernorTab';
import { DatabaseToolsTab } from './components/DatabaseToolsTab';
import { QueryMutateTab } from './components/QueryMutateTab';
import { MutationHistoryTab } from './components/history/MutationHistoryTab';
import { EventLogsTab } from './components/history/EventLogsTab';
import { MerchantSecurityTab } from './components/security/MerchantSecurityTab';
import { AccountTab } from './components/account/AccountTab';
import { LoginPage } from './components/auth/LoginPage';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { AuthStore, defaultStoreOwnerUser } from './store/useAuthStore';
import { ModalProvider, useModal } from './utils/overlay';
import { FetchService } from './utils/FetchService';

type TabType = 'governor' | 'database' | 'files' | 'query' | 'history' | 'security' | 'logs' | 'settings' | 'account';

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => AuthStore.getState().isAuthenticated);
  const [isHydrating, setIsHydrating] = useState<boolean>(true);
  const { showConfirm, showToast } = useModal();
  const [resetToken] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'reset_password' && params.get('token')) {
        return params.get('token');
      }
    } catch (e) {}
    return null;
  });

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    try {
      const saved = sessionStorage.getItem('pm_active_tab_react');
      if (saved) return saved as TabType;
    } catch (e) {}
    return 'settings';
  });

  useEffect(() => {
    const unsubscribe = AuthStore.subscribe(() => {
      setIsAuthenticated(AuthStore.getState().isAuthenticated);
    });
    return unsubscribe;
  }, []);

  // PrestaShop OTT Auto-SSO Parameter Exchange & URL Sanitizer on Boot
  useEffect(() => {
    try {
      if (window.location.search.includes('ott=')) {
        AuthStore.setSession('ott_auto_sso_token', defaultStoreOwnerUser, true);
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('ott');
        window.history.replaceState({}, document.title, cleanUrl.toString());
      }
    } catch (e) {}
  }, []);

  // Hydrate PM_CONFIG and PM_CAPABILITIES on boot before rendering tabs
  useEffect(() => {
    if (!isAuthenticated) {
      setIsHydrating(false);
      return;
    }

    const initData = async () => {
      try {
        const data = await FetchService.post('hydrate_dashboard');
        if (data.success) {
          const config = (window as any).PM_CONFIG || {};
          config.categories = data.categories || [];
          config.manufacturers = data.manufacturers || [];
          config.profiles = data.profiles || [];
          config.presets = data.presets || {};
          config.backups = data.backups || [];
          config.settings = data.settings || {};
          
          let caps = {
            backup_destinations: ['local'],
            backup_automation: false,
            rollback_history_limit: 0,
            query_visual_execute: false,
            governor_autopilot: false,
            sweeper_execution: false
          };
          const licenseToken = data.settings?.PM_LICENSE_TOKEN;
          if (licenseToken) {
            try {
              const decoded = JSON.parse(atob(licenseToken));
              if (decoded.features && decoded.features.capabilities) {
                caps = decoded.features.capabilities;
              }
            } catch (e) {}
          }
          (window as any).PM_CAPABILITIES = caps;
          (window as any).PM_CONFIG = config;
        }
      } catch (e) {
      } finally {
        setIsHydrating(false);
      }
    };

    initData();
  }, [isAuthenticated]);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('pm-theme') !== 'light';
  });
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return (
      (window as any).PM_IS_DEMO === true ||
      (window as any).isDemoMode === true ||
      window.location.pathname.includes('/v2/') ||
      localStorage.getItem('pm_demo_mode') === 'true'
    );
  });

  useEffect(() => {
    (window as any).isDemoMode = isDemoMode;
  }, [isDemoMode]);

  // Sync theme choices to document classes and localStorage
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('pm-dark-mode');
      localStorage.setItem('pm-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('pm-dark-mode');
      localStorage.setItem('pm-theme', 'light');
    }
  }, [darkMode]);

  // Persist active tab selection
  useEffect(() => {
    try {
      sessionStorage.setItem('pm_active_tab_react', activeTab);
    } catch (e) {}
  }, [activeTab]);

  // Tab Visibility Sensor & 60s Background Heartbeat Session Check
  useEffect(() => {
    const checkSession = () => {
      FetchService.post('get_server_status').catch(() => {});
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    const heartbeatInterval = setInterval(checkSession, 60000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(heartbeatInterval);
    };
  }, []);

  // Mousemove spotlight proximity listener
  useEffect(() => {
    let cursorTicking = false;

    const handleMouseMove = (e: MouseEvent) => {
      if (cursorTicking) return;
      cursorTicking = true;

      requestAnimationFrame(() => {
        const elements = document.querySelectorAll('.pm-tab-label, .pm-sub-tab-btn, .pm-theme-btn');
        elements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          const rect = htmlEl.getBoundingClientRect();
          const dx = Math.max(0, rect.left - e.clientX, e.clientX - rect.right);
          const dy = Math.max(0, rect.top - e.clientY, e.clientY - rect.bottom);

          if (Math.sqrt(dx * dx + dy * dy) < 150) {
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            htmlEl.style.setProperty('--mouse-x', `${x}px`);
            htmlEl.style.setProperty('--mouse-y', `${y}px`);
          }
        });
        cursorTicking = false;
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  if (resetToken) {
    return <ResetPasswordPage token={resetToken} />;
  }

  if (!isAuthenticated && !isDemoMode) {
    return <LoginPage onDemoClick={() => setIsDemoMode(true)} />;
  }

  if (isHydrating) {
    return (
      <div className="min-h-screen bg-pm-body flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 border-3 border-pm-primary/30 border-t-pm-primary rounded-full animate-spin" />
        <p className="text-xs font-bold tracking-widest text-pm-text-secondary uppercase animate-pulse">
          ⚡ Hydrating Mass Utility Security Controls...
        </p>
      </div>
    );
  }

  const handleLogout = () => {
    showConfirm('Confirm Logout', 'Are you sure you want to log out from the administrative utility dashboard?', null, () => {
      showToast('Logging out...', 'info');
      try {
        sessionStorage.clear();
      } catch (e) {}
      AuthStore.logout();
    }, 'primary');
  };

  return (
    <div
      className="min-h-screen p-6 transition-colors duration-300 bg-pm-body text-pm-text"
      style={{ fontFamily: 'var(--pm-font-family, system-ui, -apple-system, sans-serif)' }}
    >
      <header
        className="mb-6 flex justify-between items-center border-b border-pm-border pb-4 flex-wrap gap-4 transition-colors duration-300"
      >
        <div>
          <h1
            className="text-2xl font-black tracking-wider bg-gradient-to-r from-pm-primary to-pm-purple bg-clip-text text-transparent uppercase"
          >
            ⚡ Mass Utility
          </h1>
          <p className="text-xs mt-1 uppercase tracking-widest text-pm-text-secondary">
            Enterprise-grade database &amp; file management
          </p>
        </div>
        {/* Right Side Headers controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider flex items-center gap-2 border focus:outline-none ${
              activeTab === 'account'
                ? 'bg-pm-card text-pm-primary border-pm-border shadow-md'
                : 'bg-pm-input/50 border-transparent text-pm-text hover:bg-pm-input shadow-sm'
            }`}
          >
            👤 Account &amp; RBAC
          </button>
          <button
            type="button"
            onClick={handleLogout}
            title="Log out from dashboard"
            className="p-2 rounded-lg text-xs font-bold transition-all border border-transparent bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>
      </header>
      {/* Navigation Tabs Nav Toggles */}
      {(() => {
        const config = (window as any).PM_CONFIG || {};
        const licKey = config.settings?.PM_LICENSE_KEY;
        const licStatus = config.settings?.PM_LICENSE_STATUS;
        const isUnlicensed = !isDemoMode && (!licKey || ['revoked', 'suspended', 'expired', 'unlicensed'].includes(String(licStatus).toLowerCase()));

        return (
          <>
            <div className="flex justify-between items-center border-b border-pm-border pb-4 mb-6 flex-wrap gap-4 transition-colors duration-300">
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={isUnlicensed}
                  onClick={() => setActiveTab('governor')}
                  className={`pm-tab-label px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 uppercase tracking-wider border focus:outline-none ${
                    isUnlicensed ? 'opacity-40 cursor-not-allowed border-transparent text-pm-text-secondary' :
                    activeTab === 'governor'
                      ? 'bg-pm-card text-pm-primary border-pm-border shadow-md'
                      : 'text-pm-text-secondary hover:text-pm-text border-transparent shadow-sm'
                  }`}
                >
                  🛡️ Safety Governor {isUnlicensed && '🔒'}
                </button>
                <button
                  type="button"
                  disabled={isUnlicensed}
                  onClick={() => setActiveTab('database')}
                  className={`pm-tab-label px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 uppercase tracking-wider border focus:outline-none ${
                    isUnlicensed ? 'opacity-40 cursor-not-allowed border-transparent text-pm-text-secondary' :
                    activeTab === 'database'
                      ? 'bg-pm-card text-pm-primary border-pm-border shadow-md'
                      : 'text-pm-text-secondary hover:text-pm-text border-transparent shadow-sm'
                  }`}
                >
                  🗄️ Database Tools {isUnlicensed && '🔒'}
                </button>
                <button
                  type="button"
                  disabled={isUnlicensed}
                  onClick={() => setActiveTab('files')}
                  className={`pm-tab-label px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 uppercase tracking-wider border focus:outline-none ${
                    isUnlicensed ? 'opacity-40 cursor-not-allowed border-transparent text-pm-text-secondary' :
                    activeTab === 'files'
                      ? 'bg-pm-card text-pm-primary border-pm-border shadow-md'
                      : 'text-pm-text-secondary hover:text-pm-text border-transparent shadow-sm'
                  }`}
                >
                  📂 File Backups {isUnlicensed && '🔒'}
                </button>
                <button
                  type="button"
                  disabled={isUnlicensed}
                  onClick={() => setActiveTab('query')}
                  className={`pm-tab-label px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 uppercase tracking-wider border focus:outline-none ${
                    isUnlicensed ? 'opacity-40 cursor-not-allowed border-transparent text-pm-text-secondary' :
                    activeTab === 'query'
                      ? 'bg-pm-card text-pm-primary border-pm-border shadow-md'
                      : 'text-pm-text-secondary hover:text-pm-text border-transparent shadow-sm'
                  }`}
                >
                  ⚡ Query &amp; Mutate {isUnlicensed && '🔒'}
                </button>
                <button
                  type="button"
                  disabled={isUnlicensed}
                  onClick={() => setActiveTab('history')}
                  className={`pm-tab-label px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 uppercase tracking-wider border focus:outline-none ${
                    isUnlicensed ? 'opacity-40 cursor-not-allowed border-transparent text-pm-text-secondary' :
                    activeTab === 'history'
                      ? 'bg-pm-card text-pm-primary border-pm-border shadow-md'
                      : 'text-pm-text-secondary hover:text-pm-text border-transparent shadow-sm'
                  }`}
                >
                  🕒 Mutation History {isUnlicensed && '🔒'}
                </button>
                <button
                  type="button"
                  disabled={isUnlicensed}
                  onClick={() => setActiveTab('security')}
                  className={`pm-tab-label px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 uppercase tracking-wider border focus:outline-none ${
                    isUnlicensed ? 'opacity-40 cursor-not-allowed border-transparent text-pm-text-secondary' :
                    activeTab === 'security'
                      ? 'bg-pm-card text-pm-primary border-pm-border shadow-md'
                      : 'text-pm-text-secondary hover:text-pm-text border-transparent shadow-sm'
                  }`}
                >
                  🛡️ Security &amp; Health {isUnlicensed && '🔒'}
                </button>
                <button
                  type="button"
                  disabled={isUnlicensed}
                  onClick={() => setActiveTab('logs')}
                  className={`pm-tab-label px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 uppercase tracking-wider border focus:outline-none ${
                    isUnlicensed ? 'opacity-40 cursor-not-allowed border-transparent text-pm-text-secondary' :
                    activeTab === 'logs'
                      ? 'bg-pm-card text-pm-primary border-pm-border shadow-md'
                      : 'text-pm-text-secondary hover:text-pm-text border-transparent shadow-sm'
                  }`}
                >
                  📜 Event Logs {isUnlicensed && '🔒'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDarkMode(!darkMode)}
                  className="pm-theme-btn px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 border bg-pm-input border-transparent text-pm-text hover:bg-pm-input/80 shadow-sm focus:outline-none"
                  title="Toggle Light/Dark Theme"
                >
                  {darkMode ? '☀️ Light' : '🌙 Dark'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className={`pm-tab-label px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 uppercase tracking-wider border focus:outline-none ${
                    activeTab === 'settings'
                      ? 'bg-pm-card text-pm-primary border-pm-border shadow-md'
                      : 'bg-pm-input border-transparent text-pm-text-secondary hover:text-pm-text shadow-sm'
                  }`}
                >
                  ⚙️ Settings
                </button>
              </div>
            </div>

            <main className="border border-pm-border bg-pm-card rounded-xl p-6 shadow-2xl transition-all duration-300">
              {isUnlicensed && !isDemoMode && activeTab !== 'settings' && activeTab !== 'account' ? (
                <div className="p-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-pm-danger/10 border border-pm-danger/20 rounded-full flex items-center justify-center mx-auto text-pm-danger">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 00-2.25 2.25z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold uppercase text-pm-text">🔒 Access Restricted: No Active License</h2>
                  <p className="text-sm text-pm-text-secondary max-w-md mx-auto">
                    This store does not have an active merchant license key. All database tools, backup engines, and query tools are disabled.
                  </p>
                  <div className="pt-4">
                    <button
                      onClick={() => setIsDemoMode(true)}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mx-auto"
                    >
                      🧪 Launch Interactive Demo Mode
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {isDemoMode && (
                    <div className="mb-4 p-3 bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold rounded-xl flex items-center justify-between shadow-inner">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
                        <span>🧪 <b>DEMO MODE ACTIVE</b> — Connected to Isolated Sandbox Catalog &amp; Mock File Vault</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => alert('Sandbox Database Reset to Defaults')}
                          className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 rounded-lg text-[11px] font-bold transition-all"
                        >
                          🔄 Reset Sandbox
                        </button>
                        <button
                          onClick={() => setIsDemoMode(false)}
                          className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg text-[11px] font-bold transition-all"
                        >
                          🚪 Exit Demo
                        </button>
                      </div>
                    </div>
                  )}
                  {activeTab === 'settings' && <SettingsTab />}
                  {activeTab === 'account' && <AccountTab />}
                  {activeTab === 'files' && <FileToolsTab />}
                  {activeTab === 'governor' && <GovernorTab />}
                  {activeTab === 'database' && <DatabaseToolsTab />}
                  {activeTab === 'query' && <QueryMutateTab />}
                  {activeTab === 'history' && <MutationHistoryTab />}
                  {activeTab === 'security' && <MerchantSecurityTab />}
                  {activeTab === 'logs' && <EventLogsTab />}
                </>
              )}
            </main>
          </>
        );
      })()}
    </div>
  );
}

export default function App() {
  return (
    <ModalProvider>
      <AppContent />
    </ModalProvider>
  );
}

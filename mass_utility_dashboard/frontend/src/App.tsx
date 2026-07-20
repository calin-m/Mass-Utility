// @Arch[UI_Components]
// @Description: Root React component managing dashboard state, layout navigation tabs, and light/dark theme switchers.

import { useState, useEffect } from 'react';
import { SettingsTab } from './components/SettingsTab';
import { FileToolsTab } from './components/FileToolsTab';
import { GovernorTab } from './components/GovernorTab';
import { DatabaseToolsTab } from './components/DatabaseToolsTab';

type TabType = 'governor' | 'database' | 'files' | 'query' | 'history' | 'logs' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    // Preserve tab on reload
    try {
      const saved = sessionStorage.getItem('pm_active_tab_react');
      if (saved) return saved as TabType;
    } catch (e) {}
    return 'settings';
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('pm-theme') !== 'light';
  });

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

  const handleLogout = () => {
    const confirm = window.confirm('Are you sure you want to log out?');
    if (confirm) {
      // Redirect to legacy module logout action
      const config = (window as any).PM_CONFIG || {};
      const basePath = config.basePath || '';
      const cleanBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
      window.location.href = `${cleanBase}/index.php?action=logout`;
    }
  };

  const handleLegacyFallback = (tabId: string) => {
    // Redirect back to legacy Smarty view, checking first the tab radio input
    const config = (window as any).PM_CONFIG || {};
    const basePath = config.basePath || '';
    const cleanBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
    
    // Store selected tab into session so when legacy loads it triggers the active tab radio
    try {
      sessionStorage.setItem('pm_active_tab', tabId);
    } catch (e) {}
    
    window.location.href = `${cleanBase}/index.php`;
  };

  return (
    <div
      className={`min-h-screen p-6 transition-colors duration-300 ${
        darkMode ? 'bg-[#09090e] text-[#e3e3e3]' : 'bg-slate-50 text-slate-800'
      }`}
      style={{ fontFamily: 'var(--pm-font-family, system-ui, -apple-system, sans-serif)' }}
    >
      <header
        className={`mb-6 flex justify-between items-center border-b pb-4 flex-wrap gap-4 transition-colors duration-300 ${
          darkMode ? 'border-white/[0.06]' : 'border-slate-200'
        }`}
      >
        <div>
          <h1
            className={`text-2xl font-black tracking-wider bg-gradient-to-r ${
              darkMode ? 'from-[#a78bfa] to-[#8b5cf6]' : 'from-indigo-600 to-violet-600'
            } bg-clip-text text-transparent uppercase`}
          >
            ⚡ Mass Utility
          </h1>
          <p
            className={`text-xs mt-1 uppercase tracking-widest ${
              darkMode ? 'text-gray-400' : 'text-slate-500 font-semibold'
            }`}
          >
            Enterprise-grade database &amp; file management
          </p>
        </div>

        {/* Right Side Headers controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleLogout}
            className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 dark:text-red-400 px-3.5 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider flex items-center gap-2 hover:scale-[1.02] active:scale-[0.97]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            Logout
          </button>
        </div>
      </header>

      {/* Legacy Mode Nav Toggles */}
      <div className={`flex justify-between items-center border-b pb-4 mb-6 flex-wrap gap-4 transition-colors duration-300 ${
        darkMode ? 'border-white/[0.06]' : 'border-slate-200'
      }`}>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('governor')}
            className={`pm-tab-label px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.97] uppercase tracking-wider ${
              activeTab === 'governor'
                ? darkMode ? 'bg-white/[0.05] text-[#a78bfa] border border-[#8b5cf6]/30 shadow-lg shadow-[#8b5cf6]/10' : 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-md'
                : darkMode ? 'bg-white/[0.02] text-gray-400 hover:text-gray-200 border border-white/[0.06]' : 'bg-white text-slate-500 hover:text-slate-700 border border-slate-200 shadow-sm'
            }`}
          >
            🛡️ Safety Governor
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`pm-tab-label px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.97] uppercase tracking-wider ${
              activeTab === 'database'
                ? darkMode ? 'bg-white/[0.05] text-[#a78bfa] border border-[#8b5cf6]/30 shadow-lg shadow-[#8b5cf6]/10' : 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-md'
                : darkMode ? 'bg-white/[0.02] text-gray-400 hover:text-gray-200 border border-white/[0.06]' : 'bg-white text-slate-500 hover:text-slate-700 border border-slate-200 shadow-sm'
            }`}
          >
            🗄️ Database Tools
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`pm-tab-label px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.97] uppercase tracking-wider ${
              activeTab === 'files'
                ? darkMode ? 'bg-white/[0.05] text-[#a78bfa] border border-[#8b5cf6]/30 shadow-lg shadow-[#8b5cf6]/10' : 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-md'
                : darkMode ? 'bg-white/[0.02] text-gray-400 hover:text-gray-200 border border-white/[0.06]' : 'bg-white text-slate-500 hover:text-slate-700 border border-slate-200 shadow-sm'
            }`}
          >
            📂 File Backups
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('query')}
            className={`pm-tab-label px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.97] uppercase tracking-wider ${
              activeTab === 'query'
                ? darkMode ? 'bg-white/[0.05] text-[#a78bfa] border border-[#8b5cf6]/30 shadow-lg shadow-[#8b5cf6]/10' : 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-md'
                : darkMode ? 'bg-white/[0.02] text-gray-400 hover:text-gray-200 border border-white/[0.06]' : 'bg-white text-slate-500 hover:text-slate-700 border border-slate-200 shadow-sm'
            }`}
          >
            ⚡ Query & Mutate
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pm-tab-label px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.97] uppercase tracking-wider ${
              activeTab === 'history'
                ? darkMode ? 'bg-white/[0.05] text-[#a78bfa] border border-[#8b5cf6]/30 shadow-lg shadow-[#8b5cf6]/10' : 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-md'
                : darkMode ? 'bg-white/[0.02] text-gray-400 hover:text-gray-200 border border-white/[0.06]' : 'bg-white text-slate-500 hover:text-slate-700 border border-slate-200 shadow-sm'
            }`}
          >
            🕒 Mutation History
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`pm-tab-label px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.97] uppercase tracking-wider ${
              activeTab === 'logs'
                ? darkMode ? 'bg-white/[0.05] text-[#a78bfa] border border-[#8b5cf6]/30 shadow-lg shadow-[#8b5cf6]/10' : 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-md'
                : darkMode ? 'bg-white/[0.02] text-gray-400 hover:text-gray-200 border border-white/[0.06]' : 'bg-white text-slate-500 hover:text-slate-700 border border-slate-200 shadow-sm'
            }`}
          >
            📜 Event Logs
          </button>
        </div>

        <div className="flex gap-2 items-center">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`pm-tab-label px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.97] uppercase tracking-wider ${
              activeTab === 'settings'
                ? darkMode
                  ? 'bg-white/[0.05] text-[#a78bfa] border border-[#8b5cf6]/30 shadow-lg shadow-[#8b5cf6]/10'
                  : 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-md shadow-indigo-600/5'
                : darkMode
                ? 'bg-white/[0.02] text-gray-400 hover:text-gray-200 border border-white/[0.06]'
                : 'bg-white text-slate-500 hover:text-slate-700 border border-slate-200 shadow-sm'
            }`}
          >
            ⚙️ Settings
          </button>

          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className={`pm-theme-btn px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.97] border ${
              darkMode
                ? 'bg-white/[0.02] border-white/[0.06] text-yellow-400 hover:bg-white/[0.05]'
                : 'bg-white border-slate-200 text-indigo-600 hover:bg-slate-50 shadow-sm'
            }`}
            title="Toggle Light/Dark Theme"
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </div>

      <main
        className={`border rounded-xl p-6 shadow-2xl transition-all duration-300 ${
          darkMode ? 'bg-[#12121a] border-white/[0.08]' : 'bg-white border-slate-200'
        }`}
      >
        {activeTab === 'settings' && <SettingsTab />}
        {activeTab === 'files' && <FileToolsTab />}
        
        {activeTab === 'governor' && <GovernorTab />}

        {activeTab === 'database' && <DatabaseToolsTab />}

        {activeTab === 'query' && (
          <div className="text-center py-12 space-y-4">
            <span className="text-4xl">⚡</span>
            <h3 className="text-lg font-bold">Query Wizard (Migration Pending)</h3>
            <p className={`text-sm max-w-md mx-auto ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
              The drag-and-drop Visual AST mutation compiler rules tree dashboard is currently operating under the legacy layout.
            </p>
            <button
              type="button"
              onClick={() => handleLegacyFallback('pm-tab-query-mutate')}
              className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-xs font-bold px-5 py-2.5 rounded-lg transition"
            >
              🔄 Launch Legacy Query Wizard
            </button>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="text-center py-12 space-y-4">
            <span className="text-4xl">🕒</span>
            <h3 className="text-lg font-bold">Mutation History (Migration Pending)</h3>
            <p className={`text-sm max-w-md mx-auto ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
              Change audit logs, row snapshot diff trees, and safe undo reversion rollbacks are currently operating under the legacy layout.
            </p>
            <button
              type="button"
              onClick={() => handleLegacyFallback('pm-tab-history')}
              className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-xs font-bold px-5 py-2.5 rounded-lg transition"
            >
              🔄 Launch Legacy History Tab
            </button>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="text-center py-12 space-y-4">
            <span className="text-4xl">📜</span>
            <h3 className="text-lg font-bold">Event Logs (Migration Pending)</h3>
            <p className={`text-sm max-w-md mx-auto ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
              The SaaS operation event journals and server-sent telemetry queues are currently operating under the legacy layout.
            </p>
            <button
              type="button"
              onClick={() => handleLegacyFallback('pm-tab-logs')}
              className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-xs font-bold px-5 py-2.5 rounded-lg transition"
            >
              🔄 Launch Legacy Event Logs
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// @Arch[UI_Components]
// @Description: Root React component managing dashboard state, layout navigation tabs, and light/dark theme switchers.

import { useState, useEffect } from 'react';
import { SettingsTab } from './components/SettingsTab';
import { FileToolsTab } from './components/FileToolsTab';

export default function App() {
  const [activeTab, setActiveTab] = useState<'settings' | 'files'>('settings');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    // Default to dark mode unless explicitly set to light
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
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h1
              className={`text-2xl font-black tracking-wider bg-gradient-to-r ${
                darkMode ? 'from-[#a78bfa] to-[#8b5cf6]' : 'from-indigo-600 to-violet-600'
              } bg-clip-text text-transparent uppercase`}
            >
              Project Mass v2
            </h1>
            <p
              className={`text-xs mt-1 uppercase tracking-widest ${
                darkMode ? 'text-gray-400' : 'text-slate-500 font-semibold'
              }`}
            >
              Headless React + TypeScript Administration
            </p>
          </div>

          {/* Theme Switcher Button */}
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg border transition-all duration-300 hover:scale-105 active:scale-95 ${
              darkMode
                ? 'bg-white/[0.02] border-white/[0.1] text-yellow-400 hover:bg-white/[0.05]'
                : 'bg-white border-slate-200 text-indigo-600 hover:bg-slate-100 shadow-sm'
            }`}
            title="Toggle Light/Dark Theme"
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>

        {/* Main Tab Navigation */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.97] uppercase tracking-wider ${
              activeTab === 'settings'
                ? darkMode
                  ? 'bg-[#8b5cf6] text-white shadow-lg shadow-[#8b5cf6]/30'
                  : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : darkMode
                ? 'bg-white/[0.02] text-gray-400 hover:text-gray-200 border border-white/[0.06]'
                : 'bg-white text-slate-500 hover:text-slate-700 border border-slate-200 shadow-sm'
            }`}
          >
            ⚙️ Settings Panel
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.97] uppercase tracking-wider ${
              activeTab === 'files'
                ? darkMode
                  ? 'bg-[#8b5cf6] text-white shadow-lg shadow-[#8b5cf6]/30'
                  : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : darkMode
                ? 'bg-white/[0.02] text-gray-400 hover:text-gray-200 border border-white/[0.06]'
                : 'bg-white text-slate-500 hover:text-slate-700 border border-slate-200 shadow-sm'
            }`}
          >
            📂 File Backups
          </button>
        </div>
      </header>

      <main
        className={`border rounded-xl p-6 shadow-2xl transition-colors duration-300 ${
          darkMode ? 'bg-[#12121a] border-white/[0.08]' : 'bg-white border-slate-200'
        }`}
      >
        {activeTab === 'settings' ? <SettingsTab /> : <FileToolsTab />}
      </main>
    </div>
  );
}

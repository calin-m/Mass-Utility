// @Arch[UI_Components]
// @Description: Root React component managing dashboard state and layout tabs.
import { useState } from 'react';
import { SettingsTab } from './components/SettingsTab';
import { FileToolsTab } from './components/FileToolsTab';

export default function App() {
  const [activeTab, setActiveTab] = useState<'settings' | 'files'>('settings');

  return (
    <div className="min-h-screen bg-[#09090e] text-[#e3e3e3] p-6" style={{ fontFamily: 'var(--pm-font-family, system-ui, -apple-system, sans-serif)' }}>
      <header className="mb-6 flex justify-between items-center border-b border-white/[0.06] pb-4 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-wider bg-gradient-to-r from-[#a78bfa] to-[#8b5cf6] bg-clip-text text-transparent uppercase">Project Mass v2</h1>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest">Headless React + TypeScript Administration</p>
        </div>
        
        {/* Main Tab Navigation */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${
              activeTab === 'settings'
                ? 'bg-[#8b5cf6] text-white shadow-lg shadow-[#8b5cf6]/30'
                : 'bg-white/[0.02] text-gray-400 hover:text-gray-200 border border-white/[0.06]'
            }`}
          >
            ⚙️ Settings Panel
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${
              activeTab === 'files'
                ? 'bg-[#8b5cf6] text-white shadow-lg shadow-[#8b5cf6]/30'
                : 'bg-white/[0.02] text-gray-400 hover:text-gray-200 border border-white/[0.06]'
            }`}
          >
            📂 File Backups
          </button>
        </div>
      </header>

      <main className="bg-[#12121a] border border-white/[0.08] rounded-xl p-6 shadow-2xl">
        {activeTab === 'settings' ? <SettingsTab /> : <FileToolsTab />}
      </main>
    </div>
  );
}

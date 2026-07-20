// @Arch[UI_Components]
// @Description: Root React component managing dashboard state and layout tabs.
import { useState } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <header className="mb-6 flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Project Mass v2</h1>
          <p className="text-xs text-slate-400">Headless React + TypeScript Interface</p>
        </div>
        <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-md text-xs font-semibold">
          React Dev Mode Active
        </div>
      </header>

      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'general' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
        >
          ⚙️ General Settings
        </button>
        <button 
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'security' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
        >
          🛡️ Security & Health
        </button>
      </div>

      <main className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        {activeTab === 'general' && (
          <div>
            <h2 className="text-lg font-bold mb-2">Global Settings</h2>
            <p className="text-slate-400 text-sm mb-4">Porting from Smarty settings.tpl ...</p>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/80">
              <span className="text-xs text-slate-500 block mb-1">Status</span>
              <span className="text-sm font-medium text-emerald-400">React Core Hydrated Successfully</span>
            </div>
          </div>
        )}
        {activeTab === 'security' && (
          <div>
            <h2 className="text-lg font-bold mb-2">Security & Health</h2>
            <p className="text-slate-400 text-sm">Security auditing panel...</p>
          </div>
        )}
      </main>
    </div>
  );
}

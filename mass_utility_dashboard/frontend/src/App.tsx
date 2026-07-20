// @Arch[UI_Components]
// @Description: Root React component managing dashboard state and layout tabs.
import { SettingsTab } from './components/SettingsTab';

export default function App() {
  return (
    <div className="min-h-screen bg-[#09090e] text-[#e3e3e3] p-6" style={{ fontFamily: 'var(--pm-font-family, system-ui, -apple-system, sans-serif)' }}>
      <header className="mb-6 flex justify-between items-center border-b border-white/[0.06] pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-wider bg-gradient-to-r from-[#a78bfa] to-[#8b5cf6] bg-clip-text text-transparent uppercase">Project Mass v2</h1>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest">Headless React + TypeScript Administration</p>
        </div>
        <div className="bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider">
          React Dev Mode Active
        </div>
      </header>

      <main className="bg-[#12121a] border border-white/[0.08] rounded-xl p-6 shadow-2xl">
        <SettingsTab />
      </main>
    </div>
  );
}

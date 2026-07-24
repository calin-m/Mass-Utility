import React from 'react';
import { Settings, ShieldCheck, Database, HardDrive } from 'lucide-react';

interface SettingsTabProps {
  showAlert: (msg: string, type?: 'success' | 'error') => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ showAlert }) => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm pm-card-elevation">
        <h3 className="text-base font-bold text-pm-text border-l-4 border-pm-primary pl-3 flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-pm-primary" /> Super Admin Portal Configuration
        </h3>
        
        <div className="space-y-4">
          <div className="p-4 bg-pm-input border border-pm-border rounded-lg flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-pm-text">SQLite Database Path</div>
              <div className="text-xs text-pm-secondary font-mono">mass_utility_dashboard/data/pm_cloud_backups.db</div>
            </div>
            <span className="px-2.5 py-1 text-xs font-bold bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/30">CONNECTED</span>
          </div>

          <div className="p-4 bg-pm-input border border-pm-border rounded-lg flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-pm-text">V2 Modern SPA Frontend Status</div>
              <div className="text-xs text-pm-secondary">React 18 + TypeScript + Vite + Tailwind CSS</div>
            </div>
            <span className="px-2.5 py-1 text-xs font-bold bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/30">ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Settings, ShieldCheck, Database, HardDrive, Lock } from 'lucide-react';

interface SettingsTabProps {
  showAlert: (msg: string, type?: 'success' | 'error') => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ showAlert }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const getApiUrl = (action: string) => {
    const path = window.location.pathname;
    return `${path}?action=${action}`;
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      showAlert('Both current and new passwords are required', 'error');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('old_password', currentPassword);
      formData.append('new_password', newPassword);

      const res = await fetch(getApiUrl('api_change_password'), {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        showAlert('Admin password updated successfully. Please use it for next login.', 'success');
        setCurrentPassword('');
        setNewPassword('');
      } else {
        showAlert('Failed: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (e: any) {
      showAlert('Error updating password: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
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

      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm pm-card-elevation">
        <h3 className="text-base font-bold text-pm-text border-l-4 border-rose-500 pl-3 flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-rose-500" /> Change Admin Password
        </h3>
        <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md mt-4">
          <div>
            <label className="block text-xs font-bold text-pm-secondary uppercase mb-1">Current Password</label>
            <input 
              type="password" 
              className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:outline-none focus:border-pm-primary"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-pm-secondary uppercase mb-1">New Password</label>
            <input 
              type="password" 
              className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:outline-none focus:border-pm-primary"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-2.5 rounded-lg text-sm font-bold flex justify-center items-center gap-2 transition ${loading ? 'bg-pm-border text-pm-secondary cursor-not-allowed' : 'pm-btn-danger'}`}
          >
            {loading ? 'Updating...' : 'Update Admin Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

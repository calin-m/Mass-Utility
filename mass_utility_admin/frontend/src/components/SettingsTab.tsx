import React, { useState } from 'react';
import { Settings, ShieldCheck, Database, HardDrive, Lock } from 'lucide-react';
import { SectionHeader } from './common/SectionHeader';

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
    <div className="space-y-6 w-full max-w-2xl">

      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm pm-card-elevation">
        <SectionHeader
          title="Change Admin Password"
          subtitle="Update primary administrative access credentials for Mass Utility Admin."
          icon={Lock}
        />
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

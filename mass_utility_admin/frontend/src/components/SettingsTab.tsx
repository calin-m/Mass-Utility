import React, { useState } from 'react';
import { Lock, RefreshCw, KeyRound, ShieldCheck } from 'lucide-react';
import { SectionHeader } from './common/SectionHeader';
import { Button } from './common/Button';
import { FormInput } from './common/FormInput';

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
      {/* Full Width Settings Card */}
      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm">
        <SectionHeader
          title="Change Admin Password"
          subtitle="Update primary administrative access credentials for Mass Utility Admin."
          icon={Lock}
        />

        <form onSubmit={handlePasswordUpdate} className="mt-6 space-y-6">
          {/* Side-by-Side 2-Column Password Input Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Current Password"
              icon={KeyRound}
              type="password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            <FormInput
              label="New Password"
              icon={ShieldCheck}
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="flex justify-end pt-2 border-t border-pm-border">
            <Button
              type="submit"
              variant="danger"
              size="md"
              icon={Lock}
              loading={loading}
            >
              Update Admin Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

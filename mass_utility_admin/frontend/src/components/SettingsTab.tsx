import React, { useState } from 'react';
import { Lock, RefreshCw, KeyRound, ShieldCheck, Languages, Globe } from 'lucide-react';
import { SectionHeader } from './common/SectionHeader';
import { Button } from './common/Button';
import { FormInput } from './common/FormInput';
import { FormSelect } from './common/FormSelect';
import { useTranslation } from '../i18n/LanguageContext';
import { SUPPORTED_LANGUAGES, Language } from '../i18n/translations';

interface SettingsTabProps {
  showAlert: (msg: string, type?: 'success' | 'error') => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ showAlert }) => {
  const { language, setLanguage, t } = useTranslation();
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

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value as Language;
    setLanguage(newLang);
    const selectedOpt = SUPPORTED_LANGUAGES.find(l => l.code === newLang);
    showAlert(`🌐 Interface language changed to ${selectedOpt?.flag} ${selectedOpt?.name}`, 'success');
  };

  return (
    <div className="space-y-6 w-full">
      {/* 1. Admin Password Security Settings Card */}
      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm">
        <SectionHeader
          title={t('settings_password_title')}
          subtitle={t('settings_password_subtitle')}
          icon={Lock}
        />

        <form onSubmit={handlePasswordUpdate} className="mt-6 space-y-6">
          {/* Side-by-Side 2-Column Password Input Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label={t('settings_current_password')}
              icon={KeyRound}
              type="password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            <FormInput
              label={t('settings_new_password')}
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
              {t('settings_update_password_btn')}
            </Button>
          </div>
        </form>
      </div>

      {/* 2. Portal Localization & Language Settings Card */}
      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm">
        <SectionHeader
          title={t('settings_lang_title')}
          subtitle={t('settings_lang_subtitle')}
          icon={Languages}
        />

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div>
            <FormSelect
              label={t('settings_lang_label')}
              value={language}
              onChange={handleLanguageChange}
              options={SUPPORTED_LANGUAGES.map(l => ({
                value: l.code,
                label: `${l.flag}  ${l.name}`
              }))}
            />
          </div>

          <div className="p-4 bg-pm-input/50 rounded-xl border border-pm-border text-xs text-pm-secondary space-y-1">
            <div className="font-bold text-pm-text flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Multi-Language Localization Engine</span>
            </div>
            <p className="leading-relaxed">
              Updates labels across the Super-Admin navigation, tables, search toolbars, buttons, and setting forms in real-time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

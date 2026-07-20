// @Arch[SettingsTab]
// @Description: Orchestrator component for settings sub-navigation layout that synchronizes states and delegates form components.
// @Calls: save_settings

import React, { useState, useEffect } from 'react';
import { SettingsGeneral } from './SettingsGeneral';
import { SettingsInfo } from './SettingsInfo';
import { SettingsSecurity } from './SettingsSecurity';
import { FetchService } from '../utils/FetchService';

export const SettingsTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'info' | 'security'>('general');
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Initialize from global config injection
  useEffect(() => {
    const configSettings = (window as any).PM_CONFIG?.settings || {};
    setSettings(configSettings);
  }, []);

  const handleSaveSettings = async (updatedSettings: Record<string, any>) => {
    setIsSaving(true);
    try {
      const response = await FetchService.post('save_settings', {
        settings: updatedSettings
      });
      if (response && response.success) {
        // Merge settings
        const merged = { ...settings, ...updatedSettings };
        setSettings(merged);
        
        // Hydrate PM_CONFIG as well
        if ((window as any).PM_CONFIG) {
          (window as any).PM_CONFIG.settings = merged;
        }

        if (typeof (window as any).showPremiumToast === 'function') {
          (window as any).showPremiumToast('Settings saved successfully', 'success');
        } else {
          alert('Settings saved successfully!');
        }
      } else {
        const errMsg = response?.error || 'Failed to save settings.';
        if (typeof (window as any).showPremiumToast === 'function') {
          (window as any).showPremiumToast(errMsg, 'error');
        } else {
          alert(errMsg);
        }
      }
    } catch (err: any) {
      const msg = err.message || 'Network error while saving settings.';
      if (typeof (window as any).showPremiumToast === 'function') {
        (window as any).showPremiumToast(msg, 'error');
      } else {
        alert(msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full">
      {/* Sub-navigation Pills */}
      <div className="flex gap-2 border-b dark:border-white/[0.06] border-slate-200 pb-4 mb-6 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveSubTab('general')}
          className={`pm-sub-tab-btn px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.97] uppercase tracking-wider ${
            activeSubTab === 'general'
              ? 'dark:bg-[#8b5cf6]/10 dark:text-[#a78bfa] dark:border-[#8b5cf6]/20 bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm'
              : 'dark:text-gray-400 dark:hover:text-gray-200 text-slate-500 hover:text-slate-700 border border-transparent'
          }`}
        >
          ⚙️ General Settings
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('info')}
          className={`pm-sub-tab-btn px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.97] uppercase tracking-wider ${
            activeSubTab === 'info'
              ? 'dark:bg-[#8b5cf6]/10 dark:text-[#a78bfa] dark:border-[#8b5cf6]/20 bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm'
              : 'dark:text-gray-400 dark:hover:text-gray-200 text-slate-500 hover:text-slate-700 border border-transparent'
          }`}
        >
          📖 Documentation & Info
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('security')}
          className={`pm-sub-tab-btn px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.97] uppercase tracking-wider ${
            activeSubTab === 'security'
              ? 'dark:bg-[#8b5cf6]/10 dark:text-[#a78bfa] dark:border-[#8b5cf6]/20 bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm'
              : 'dark:text-gray-400 dark:hover:text-gray-200 text-slate-500 hover:text-slate-700 border border-transparent'
          }`}
        >
          🛡️ Security & Health
        </button>
      </div>

      {/* Pane Content */}
      <div className="transition-all duration-300">
        {activeSubTab === 'general' && (
          <SettingsGeneral
            settings={settings}
            onSave={handleSaveSettings}
            isSaving={isSaving}
          />
        )}
        {activeSubTab === 'info' && <SettingsInfo />}
        {activeSubTab === 'security' && <SettingsSecurity />}
      </div>
    </div>
  );
};

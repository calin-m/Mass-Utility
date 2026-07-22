// @Arch[SettingsTab]
// @Description: Orchestrator component for settings sub-navigation layout that synchronizes states and delegates form components.
// @Calls: save_settings

import React, { useState, useEffect } from 'react';
import { SettingsGeneral } from './SettingsGeneral';
import { SettingsInfo } from './SettingsInfo';
import { SettingsSecurity } from './SettingsSecurity';
import { FetchService } from '../utils/FetchService';
import { useModal } from '../utils/overlay';

export const SettingsTab: React.FC = () => {
  const { showAlert, showToast } = useModal();
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

        showToast('Settings saved successfully!', 'success');
      } else {
        const errMsg = response?.error || 'Failed to save settings.';
        showAlert('Save Failed', errMsg, 'error');
      }
    } catch (err: any) {
      const msg = err.message || 'Network error while saving settings.';
      showAlert('Save Failed', msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full">
      {/* Sub-navigation Pills */}
      <div className="flex gap-2 border-b border-pm-border pb-4 mb-6 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveSubTab('general')}
          className={`pm-sub-tab-btn px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 uppercase tracking-wider border focus:outline-none ${
            activeSubTab === 'general'
              ? 'bg-pm-card text-pm-primary border-pm-border shadow-sm'
              : 'text-pm-text-secondary hover:text-pm-text border-transparent'
          }`}
        >
          ⚙️ General Settings
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('info')}
          className={`pm-sub-tab-btn px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 uppercase tracking-wider border focus:outline-none ${
            activeSubTab === 'info'
              ? 'bg-pm-card text-pm-primary border-pm-border shadow-sm'
              : 'text-pm-text-secondary hover:text-pm-text border-transparent'
          }`}
        >
          📖 Documentation & Info
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('security')}
          className={`pm-sub-tab-btn px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 uppercase tracking-wider border focus:outline-none ${
            activeSubTab === 'security'
              ? 'bg-pm-card text-pm-primary border-pm-border shadow-sm'
              : 'text-pm-text-secondary hover:text-pm-text border-transparent'
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

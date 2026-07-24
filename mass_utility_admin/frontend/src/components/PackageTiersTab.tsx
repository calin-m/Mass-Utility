import React, { useState } from 'react';
import { PackageCheck, Save } from 'lucide-react';

export interface PackageTier {
  id: number;
  name: string;
  capabilities: {
    backup_destinations: string[];
    backup_automation: boolean;
    rollback_history_limit: number;
    query_visual_execute: boolean;
    governor_autopilot: boolean;
    sweeper_execution: boolean;
  };
}

interface PackageTiersTabProps {
  tiers: PackageTier[];
  onRefresh: () => void;
  showAlert: (msg: string, type?: 'success' | 'error') => void;
}

export const PackageTiersTab: React.FC<PackageTiersTabProps> = ({ tiers, onRefresh, showAlert }) => {
  const [selectedTier, setSelectedTier] = useState<string>('basic');
  const [saving, setSaving] = useState(false);

  const activeTierObj = tiers.find(t => t.name.toLowerCase() === selectedTier.toLowerCase()) || {
    name: selectedTier,
    capabilities: {
      backup_destinations: ['local'],
      backup_automation: false,
      rollback_history_limit: 0,
      query_visual_execute: false,
      governor_autopilot: false,
      sweeper_execution: false
    }
  };

  const [caps, setCaps] = useState(activeTierObj.capabilities);

  const handleTierChange = (tierName: string) => {
    setSelectedTier(tierName);
    const found = tiers.find(t => t.name.toLowerCase() === tierName.toLowerCase());
    if (found) {
      setCaps(found.capabilities);
    }
  };

  const handleToggleCap = (key: keyof typeof caps) => {
    setCaps(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', selectedTier);
      formData.append('capabilities', JSON.stringify(caps));

      const res = await fetch('index.php?action=api_save_tier', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showAlert(`✅ Package tier '${selectedTier.toUpperCase()}' capabilities updated!`, 'success');
        onRefresh();
      } else {
        showAlert('❌ Error: ' + (data.error || 'Failed to update tier'), 'error');
      }
    } catch (err: any) {
      showAlert('❌ Request failed: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-sm pm-card-elevation max-w-3xl">
        <h3 className="text-base font-bold text-pm-text border-l-4 border-pm-primary pl-3 flex items-center gap-2 mb-4">
          <PackageCheck className="w-5 h-5 text-pm-primary" /> Feature Capability Matrix Editor
        </h3>

        <div className="flex gap-3 mb-6">
          {['basic', 'pro', 'enterprise'].map(tierName => (
            <button
              key={tierName}
              type="button"
              onClick={() => handleTierChange(tierName)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition ${
                selectedTier === tierName
                  ? 'pm-btn-primary'
                  : 'pm-btn-neutral'
              }`}
            >
              {tierName} TIER
            </button>
          ))}
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3 bg-pm-input border border-pm-border rounded-lg cursor-pointer hover:border-pm-primary transition">
              <input
                type="checkbox"
                checked={caps.backup_automation}
                onChange={() => handleToggleCap('backup_automation')}
                className="w-4 h-4 text-pm-primary rounded focus:ring-0"
              />
              <div>
                <div className="text-xs font-bold text-pm-text">Automated Cloud Backups</div>
                <div className="text-[0.65rem] text-pm-secondary">Cron-driven scheduled backups</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-pm-input border border-pm-border rounded-lg cursor-pointer hover:border-pm-primary transition">
              <input
                type="checkbox"
                checked={caps.query_visual_execute}
                onChange={() => handleToggleCap('query_visual_execute')}
                className="w-4 h-4 text-pm-primary rounded focus:ring-0"
              />
              <div>
                <div className="text-xs font-bold text-pm-text">Visual Query Execution</div>
                <div className="text-[0.65rem] text-pm-secondary">Batch mutation SQL engine</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-pm-input border border-pm-border rounded-lg cursor-pointer hover:border-pm-primary transition">
              <input
                type="checkbox"
                checked={caps.governor_autopilot}
                onChange={() => handleToggleCap('governor_autopilot')}
                className="w-4 h-4 text-pm-primary rounded focus:ring-0"
              />
              <div>
                <div className="text-xs font-bold text-pm-text">Governor Autopilot</div>
                <div className="text-[0.65rem] text-pm-secondary">Database performance governor</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-pm-input border border-pm-border rounded-lg cursor-pointer hover:border-pm-primary transition">
              <input
                type="checkbox"
                checked={caps.sweeper_execution}
                onChange={() => handleToggleCap('sweeper_execution')}
                className="w-4 h-4 text-pm-primary rounded focus:ring-0"
              />
              <div>
                <div className="text-xs font-bold text-pm-text">Orphan Sweeper</div>
                <div className="text-[0.65rem] text-pm-secondary">File & database cleanup tool</div>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Rollback History Snapshots Limit</label>
            <input
              type="number"
              min={0}
              max={100}
              className="w-full bg-pm-input border border-pm-border rounded-lg px-3 py-2 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
              value={caps.rollback_history_limit}
              onChange={e => setCaps({ ...caps, rollback_history_limit: parseInt(e.target.value) || 0 })}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="pm-btn-primary px-6 py-2.5 rounded-lg text-xs font-bold uppercase transition flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving Tier...' : `Save ${selectedTier.toUpperCase()} Capabilities`}
          </button>
        </form>
      </div>
    </div>
  );
};

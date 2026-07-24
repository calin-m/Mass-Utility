import React, { useState } from 'react';
import { PackageCheck, Save } from 'lucide-react';

export interface PackageTier {
  id: number;
  name: string;
  capabilities: {
    // Usability
    PM_ENABLE_DB_TOOLS: boolean;
    PM_ENABLE_FILE_TOOLS: boolean;
    PM_ENABLE_GHOST_PURGER: boolean;
    PM_ENABLE_GDPR_SWEEPER: boolean;
    PM_ENABLE_HISTORY: boolean;
    // Convenience
    query_visual_execute: boolean;
    backup_automation: boolean;
    governor_autopilot: boolean;
    sweeper_execution: boolean;
    rollback_history_limit: number;
    backup_destinations: string[];
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
      PM_ENABLE_DB_TOOLS: true,
      PM_ENABLE_FILE_TOOLS: true,
      PM_ENABLE_GHOST_PURGER: true,
      PM_ENABLE_GDPR_SWEEPER: true,
      PM_ENABLE_HISTORY: true,
      query_visual_execute: false,
      backup_automation: false,
      governor_autopilot: false,
      sweeper_execution: false,
      rollback_history_limit: 0,
      backup_destinations: ['local']
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

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Usability Section */}
          <div>
            <h4 className="text-sm font-bold text-pm-text border-b border-pm-border pb-2 mb-3">Core Usability</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-center gap-3 p-3 bg-pm-input border border-pm-border rounded-lg cursor-pointer hover:border-pm-primary transition">
                <input
                  type="checkbox"
                  checked={caps.PM_ENABLE_DB_TOOLS}
                  onChange={() => handleToggleCap('PM_ENABLE_DB_TOOLS')}
                  className="w-4 h-4 text-pm-primary rounded focus:ring-0"
                />
                <div>
                  <div className="text-xs font-bold text-pm-text">Database Tools</div>
                  <div className="text-[0.65rem] text-pm-secondary">Raw SQL execution and table browser</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-pm-input border border-pm-border rounded-lg cursor-pointer hover:border-pm-primary transition">
                <input
                  type="checkbox"
                  checked={caps.PM_ENABLE_FILE_TOOLS}
                  onChange={() => handleToggleCap('PM_ENABLE_FILE_TOOLS')}
                  className="w-4 h-4 text-pm-primary rounded focus:ring-0"
                />
                <div>
                  <div className="text-xs font-bold text-pm-text">File Explorer</div>
                  <div className="text-[0.65rem] text-pm-secondary">On-server file management & editing</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-pm-input border border-pm-border rounded-lg cursor-pointer hover:border-pm-primary transition">
                <input
                  type="checkbox"
                  checked={caps.PM_ENABLE_HISTORY}
                  onChange={() => handleToggleCap('PM_ENABLE_HISTORY')}
                  className="w-4 h-4 text-pm-primary rounded focus:ring-0"
                />
                <div>
                  <div className="text-xs font-bold text-pm-text">Rollback Snapshots</div>
                  <div className="text-[0.65rem] text-pm-secondary">Create backups before mutations</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-pm-input border border-pm-border rounded-lg cursor-pointer hover:border-pm-primary transition">
                <input
                  type="checkbox"
                  checked={caps.PM_ENABLE_GHOST_PURGER}
                  onChange={() => handleToggleCap('PM_ENABLE_GHOST_PURGER')}
                  className="w-4 h-4 text-pm-primary rounded focus:ring-0"
                />
                <div>
                  <div className="text-xs font-bold text-pm-text">Ghost File Purger</div>
                  <div className="text-[0.65rem] text-pm-secondary">Audit unreferenced / orphaned files</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-pm-input border border-pm-border rounded-lg cursor-pointer hover:border-pm-primary transition">
                <input
                  type="checkbox"
                  checked={caps.PM_ENABLE_GDPR_SWEEPER}
                  onChange={() => handleToggleCap('PM_ENABLE_GDPR_SWEEPER')}
                  className="w-4 h-4 text-pm-primary rounded focus:ring-0"
                />
                <div>
                  <div className="text-xs font-bold text-pm-text">GDPR Data Sweeper</div>
                  <div className="text-[0.65rem] text-pm-secondary">Audit and redact PII data</div>
                </div>
              </label>
            </div>
          </div>

          {/* Convenience Section */}
          <div>
            <h4 className="text-sm font-bold text-pm-text border-b border-pm-border pb-2 mb-3">Convenience & Automation</h4>
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
                  <div className="text-xs font-bold text-pm-text">Sweeper Active Execution</div>
                  <div className="text-[0.65rem] text-pm-secondary">Execute deletion of files & data</div>
                </div>
              </label>
              
              <label className="flex items-center gap-3 p-3 bg-pm-input border border-pm-border rounded-lg cursor-pointer hover:border-pm-primary transition">
                <input
                  type="checkbox"
                  checked={caps.backup_destinations.includes('gdrive')}
                  onChange={(e) => {
                    const hasLocal = caps.backup_destinations.includes('local');
                    const newDests = e.target.checked 
                      ? (hasLocal ? ['local', 'gdrive'] : ['gdrive']) 
                      : (hasLocal ? ['local'] : []);
                    setCaps({ ...caps, backup_destinations: newDests });
                  }}
                  className="w-4 h-4 text-pm-primary rounded focus:ring-0"
                />
                <div>
                  <div className="text-xs font-bold text-pm-text">Cloud Destinations (GDrive)</div>
                  <div className="text-[0.65rem] text-pm-secondary">Push backups to Google Drive</div>
                </div>
              </label>
            </div>
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

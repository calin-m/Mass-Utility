// @Arch[UI_Components]
// @Description: Sub-component managing saved query presets, mutation loadouts, and master template preset controls.

import React from 'react';

interface QueryPresetManagerProps {
  presets: any;
  selectedMasterPreset: string;
  selectedQueryPreset: string;
  selectedMutatePreset: string;
  onSelectMasterPreset: (val: string) => void;
  onSelectQueryPreset: (val: string) => void;
  onSelectMutatePreset: (val: string) => void;
  onSavePreset: (type: 'query' | 'mutate' | 'master') => void;
  onDeletePreset: (type: 'query' | 'mutate' | 'master', selectVal: string) => void;
}

export const QueryPresetManager: React.FC<QueryPresetManagerProps> = ({
  presets,
  selectedMasterPreset,
  selectedQueryPreset,
  selectedMutatePreset,
  onSelectMasterPreset,
  onSelectQueryPreset,
  onSelectMutatePreset,
  onSavePreset,
  onDeletePreset,
}) => {
  return (
    <div className="bg-[var(--pm-card-bg)] border border-[var(--pm-border-color)] rounded-xl p-5 shadow-xl space-y-4">
      <div className="flex justify-between items-center border-b border-[var(--pm-border-color)] pb-3 flex-wrap gap-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--pm-text-primary)]">Quick Preset Templates</h3>
          <p className="text-[0.65rem] text-[var(--pm-text-secondary)] mt-0.5">Load pre-built visual queries or save your custom mutation routines.</p>
        </div>

        {/* Save Master Template Button */}
        <button
          type="button"
          onClick={() => onSavePreset('master')}
          className="pm-btn pm-btn-success text-[0.7rem] font-bold px-3 py-1.5 rounded-lg transition uppercase flex items-center gap-1.5 cursor-pointer"
        >
          <span>⭐</span> Save Full Routine
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Master routine selector */}
        <div className="space-y-1.5">
          <label className="block text-[0.65rem] font-bold uppercase text-[#8b5cf6]">1. Master Routine (Query + Mutate)</label>
          <div className="flex gap-2">
            <select
              value={selectedMasterPreset}
              onChange={(e) => onSelectMasterPreset(e.target.value)}
              className="w-full bg-[var(--pm-body-bg)] border border-[var(--pm-border-color)] text-xs text-[var(--pm-text-primary)] rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="">-- Load Master Routine --</option>
              {(presets.master || []).map((p: any) => (
                <option key={p.id_preset} value={p.id_preset}>
                  {p.name}
                </option>
              ))}
            </select>
            {selectedMasterPreset && (
              <button
                type="button"
                onClick={() => onDeletePreset('master', selectedMasterPreset)}
                className="pm-btn pm-btn-danger px-2.5 py-1 rounded-lg text-xs"
              >
                🗑️
              </button>
            )}
          </div>
        </div>

        {/* Query AST preset selector */}
        <div className="space-y-1.5">
          <label className="block text-[0.65rem] font-bold uppercase text-[var(--pm-text-secondary)]">2. Query Ruleset Only</label>
          <div className="flex gap-2">
            <select
              value={selectedQueryPreset}
              onChange={(e) => onSelectQueryPreset(e.target.value)}
              className="w-full bg-[var(--pm-body-bg)] border border-[var(--pm-border-color)] text-xs text-[var(--pm-text-primary)] rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="">-- Load Query Ruleset --</option>
              {(presets.query || []).map((p: any) => (
                <option key={p.id_preset} value={p.id_preset}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onSavePreset('query')}
              className="pm-btn pm-btn-neutral px-2 py-1 rounded-lg text-xs font-bold uppercase"
            >
              Save
            </button>
            {selectedQueryPreset && (
              <button
                type="button"
                onClick={() => onDeletePreset('query', selectedQueryPreset)}
                className="pm-btn pm-btn-danger px-2 py-1 rounded-lg text-xs"
              >
                🗑️
              </button>
            )}
          </div>
        </div>

        {/* Mutate Ruleset preset selector */}
        <div className="space-y-1.5">
          <label className="block text-[0.65rem] font-bold uppercase text-[var(--pm-text-secondary)]">3. Mutation Actions Only</label>
          <div className="flex gap-2">
            <select
              value={selectedMutatePreset}
              onChange={(e) => onSelectMutatePreset(e.target.value)}
              className="w-full bg-[var(--pm-body-bg)] border border-[var(--pm-border-color)] text-xs text-[var(--pm-text-primary)] rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="">-- Load Mutation Ruleset --</option>
              {(presets.mutate || []).map((p: any) => (
                <option key={p.id_preset} value={p.id_preset}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onSavePreset('mutate')}
              className="pm-btn pm-btn-neutral px-2 py-1 rounded-lg text-xs font-bold uppercase"
            >
              Save
            </button>
            {selectedMutatePreset && (
              <button
                type="button"
                onClick={() => onDeletePreset('mutate', selectedMutatePreset)}
                className="pm-btn pm-btn-danger px-2 py-1 rounded-lg text-xs"
              >
                🗑️
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

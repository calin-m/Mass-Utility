// @Arch[UI_Components]
// @Description: Sub-component managing saved query presets, mutation loadouts, and master template preset controls.

import React from 'react';
import { PresetLoadoutBar } from '../common/PresetLoadoutBar';
import { SectionHeader } from '../common/SectionHeader';

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
  const queryPresetNames = (presets.query || []).map((p: any) => p.name || p.id_preset);
  const mutatePresetNames = (presets.mutate || []).map((p: any) => p.name || p.id_preset);

  return (
    <div className="bg-[var(--pm-card-bg)] border border-[var(--pm-border-color)] rounded-xl p-5 shadow-xl space-y-4">
      <SectionHeader
        title="Quick Preset Templates"
        subtitle="Load pre-built visual queries or save your custom mutation routines."
        borderBottom={true}
        actionSlot={
          <button
            type="button"
            onClick={() => onSavePreset('master')}
            className="pm-btn pm-btn-success text-[0.7rem] font-bold px-3 py-1.5 rounded-lg transition uppercase flex items-center gap-1.5 cursor-pointer"
          >
            <span>⭐</span> Save Full Routine
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Master routine selector */}
        <div className="space-y-1.5">
          <label className="block text-[0.65rem] font-bold uppercase text-purple-700 dark:text-purple-400">1. Master Routine (Query + Mutate)</label>
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
                className="pm-btn pm-btn-danger px-2.5 py-1 rounded-lg text-xs cursor-pointer"
              >
                🗑️
              </button>
            )}
          </div>
        </div>

        {/* Query AST preset selector */}
        <div className="space-y-1.5">
          <label className="block text-[0.65rem] font-bold uppercase text-[var(--pm-text-secondary)]">2. Query Ruleset Only</label>
          <PresetLoadoutBar
            label=""
            presets={queryPresetNames}
            selectedPreset={selectedQueryPreset}
            onSelectPreset={(pName) => {
              const matched = (presets.query || []).find((p: any) => p.name === pName || p.id_preset === pName);
              if (matched) onSelectQueryPreset(matched.id_preset);
            }}
            onSavePreset={() => onSavePreset('query')}
            onDeletePreset={() => onDeletePreset('query', selectedQueryPreset)}
            noneLabel="-- Load Query Ruleset --"
          />
        </div>

        {/* Mutate Ruleset preset selector */}
        <div className="space-y-1.5">
          <label className="block text-[0.65rem] font-bold uppercase text-[var(--pm-text-secondary)]">3. Mutation Actions Only</label>
          <PresetLoadoutBar
            label=""
            presets={mutatePresetNames}
            selectedPreset={selectedMutatePreset}
            onSelectPreset={(pName) => {
              const matched = (presets.mutate || []).find((p: any) => p.name === pName || p.id_preset === pName);
              if (matched) onSelectMutatePreset(matched.id_preset);
            }}
            onSavePreset={() => onSavePreset('mutate')}
            onDeletePreset={() => onDeletePreset('mutate', selectedMutatePreset)}
            noneLabel="-- Load Mutation Ruleset --"
          />
        </div>
      </div>
    </div>
  );
};

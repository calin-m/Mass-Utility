// @Arch[UI_Components]
// @Description: Unified preset loadout toolbar component rendering dropdown selector with Save and Delete action buttons.

import React from 'react';

interface PresetLoadoutBarProps {
  label?: string;
  presets: string[];
  selectedPreset: string;
  onSelectPreset: (presetName: string) => void;
  onSavePreset: () => void;
  onDeletePreset: () => void;
  noneLabel?: string;
}

export const PresetLoadoutBar: React.FC<PresetLoadoutBarProps> = ({
  label = 'Preset Loadout:',
  presets,
  selectedPreset,
  onSelectPreset,
  onSavePreset,
  onDeletePreset,
  noneLabel = '-- None / Load Template --',
}) => {
  return (
    <div className="flex items-center gap-2 text-xs flex-wrap">
      <span className="font-bold text-[var(--pm-text-secondary)] uppercase tracking-wider">{label}</span>
      <select
        value={selectedPreset}
        onChange={(e) => onSelectPreset(e.target.value)}
        className="bg-[var(--pm-card-bg)] border border-[var(--pm-border-color)] text-xs text-[var(--pm-text-primary)] rounded-md px-2.5 py-1.5 focus:outline-none cursor-pointer shadow-sm hover:bg-[var(--pm-body-bg)] transition-all duration-200"
      >
        <option value="">{noneLabel}</option>
        {presets.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onSavePreset}
        className="pm-btn pm-btn-success text-[0.65rem] font-bold px-3 py-1.5 rounded-md transition uppercase cursor-pointer"
      >
        Save Preset
      </button>
      {selectedPreset && (
        <button
          type="button"
          onClick={onDeletePreset}
          className="pm-btn pm-btn-danger text-[0.65rem] font-bold px-3 py-1.5 rounded-md transition uppercase cursor-pointer"
        >
          Delete
        </button>
      )}
    </div>
  );
};

// @Arch[FolderSelector]
// @Description: Renders the backup directories checklist, disabling manual checks and applying styles dynamically based on the active backup profile override.

import React from 'react';

export interface FolderEntry {
  path: string;
  name: string;
  is_excluded: boolean;
  file_count: number;
  size_formatted: string;
}

interface FolderSelectorProps {
  folders: FolderEntry[];
  profile: string;
  onToggleFolder: (path: string, checked: boolean) => void;
}

export const FolderSelector: React.FC<FolderSelectorProps> = ({
  folders,
  profile,
  onToggleFolder,
}) => {
  const isCustom = profile === 'custom';

  let forcedExclusions: string[] = [];
  let forcedInclusions: string[] = [];

  if (profile === 'core') {
    forcedExclusions = ['/img', '/themes', '/modules', '/upload', '/download'];
  } else if (profile === 'core_media') {
    forcedExclusions = ['/themes', '/modules'];
  } else if (profile === 'themes_modules') {
    forcedInclusions = ['/themes', '/modules'];
  } else if (profile === 'media') {
    forcedInclusions = ['/img', '/upload', '/download'];
  }

  const getFolderSelectionState = (folder: FolderEntry): { checked: boolean; disabled: boolean } => {
    if (isCustom) {
      return { checked: !folder.is_excluded, disabled: false };
    }
    
    if (profile === 'full') {
      return { checked: !folder.is_excluded, disabled: true };
    }

    if (profile === 'themes_modules' || profile === 'media') {
      const isForcedInclude = forcedInclusions.some(inc => folder.path.startsWith(inc));
      return { checked: isForcedInclude && !folder.is_excluded, disabled: true };
    }

    // core or core_media
    const isForcedExclude = forcedExclusions.some(exc => folder.path.startsWith(exc));
    return { checked: !isForcedExclude && !folder.is_excluded, disabled: true };
  };

  return (
    <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-xl space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 bg-pm-primary rounded-full shadow-lg shadow-pm-primary/50"></span>
          <h3 className="text-md font-bold tracking-wide text-pm-text uppercase">Backup Folder Selection</h3>
        </div>
        <span className="text-[0.7rem] bg-pm-primary/10 text-pm-primary border border-pm-primary/20 px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">
          🔒 Auto-Applies
        </span>
      </div>

      <p className="text-xs text-pm-text-secondary leading-relaxed">
        Check the directories you wish to include in your backups. Unchecking heavy directories (e.g. cache folders) can make backup operations up to 10x faster and prevent execution timeouts.
      </p>

      {!isCustom && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 p-4 rounded-xl text-xs font-medium leading-relaxed flex items-center gap-3 shadow-sm">
          <span className="text-lg shrink-0">⚠️</span>
          <span>
            <strong>Profile Active:</strong> Manual selections are disabled. The active profile automatically determines which folders are included (grayed out). Switch to <em>Custom / Load Profile</em> to customize folders.
          </span>
        </div>
      )}

      <div className="border border-pm-border rounded-xl bg-pm-input/30 p-4 max-h-[420px] overflow-y-auto">
        {folders.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-xs text-pm-text-secondary">
            ⏳ Scanning filesystem and calculating directory sizes...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {folders.map((item, idx) => {
              const { checked, disabled } = getFolderSelectionState(item);
              return (
                <label
                  key={idx}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-xl border transition-all duration-200 gap-3 ${
                    disabled
                      ? checked
                        ? 'bg-pm-primary/10 border border-pm-primary/30 text-pm-text opacity-90'
                        : 'bg-[var(--pm-body-bg)]/60 border border-pm-border/40 text-pm-text-secondary/70 opacity-60'
                      : checked
                        ? 'bg-pm-primary/5 border border-pm-primary/35 hover:bg-pm-primary/10 hover:border-pm-primary/50 cursor-pointer shadow-sm'
                        : 'bg-pm-card border border-pm-border hover:bg-pm-input/40 hover:border-pm-primary/40 cursor-pointer shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={e => onToggleFolder(item.path, e.target.checked)}
                      className={`w-4 h-4 rounded border-pm-border text-pm-primary focus:ring-0 focus:ring-offset-0 accent-pm-primary shrink-0 ${
                        disabled ? 'cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    />
                    <span className="text-md shrink-0">📁</span>
                    <span
                      className={`text-xs font-medium truncate flex-1 ${disabled && !checked ? 'text-pm-text-secondary/70' : 'text-pm-text'}`}
                      title={item.name}
                    >
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[0.65rem] text-pm-text-secondary/80 bg-pm-input/50 px-2 py-0.5 rounded-lg font-mono">
                      {item.file_count} files
                    </span>
                    <span
                      className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-lg font-mono ${
                        checked
                          ? 'bg-pm-primary/15 text-pm-primary'
                          : 'bg-pm-input/40 text-pm-text-secondary/80'
                      }`}
                    >
                      {item.size_formatted}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

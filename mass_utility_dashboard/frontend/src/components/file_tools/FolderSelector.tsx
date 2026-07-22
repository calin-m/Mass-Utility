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
    <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-xl space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 bg-pm-primary rounded-full shadow-lg shadow-pm-primary/50"></span>
          <h3 className="text-md font-bold tracking-wide text-pm-text uppercase">Backup Folder Selection</h3>
        </div>
        <span className="text-[0.7rem] bg-pm-primary/10 text-pm-primary px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">
          🔒 Auto-Applies
        </span>
      </div>

      <p className="text-sm text-pm-text-secondary leading-relaxed">
        Check the directories you wish to include in your backups. Unchecking heavy directories (e.g. cache folders) can make backup operations up to 10x faster and prevent execution timeouts.
      </p>

      {!isCustom && (
        <div className="bg-pm-warning/10 border border-pm-warning/20 text-pm-warning p-4 rounded-lg text-xs leading-relaxed flex items-center gap-2">
          <span>
            ⚠️ <strong>Profile Active:</strong> Manual selections are disabled. The active profile automatically determines which folders are included (grayed out). Switch to <em>Custom / Load Profile</em> to customize folders.
          </span>
        </div>
      )}

      <div className="bg-pm-input border border-pm-border rounded-lg p-5 max-h-[400px] overflow-y-auto">
        {folders.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-xs text-pm-text-secondary">
            ⏳ Scanning filesystem and calculating directory sizes...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {folders.map((item, idx) => {
              const { checked, disabled } = getFolderSelectionState(item);
              return (
                <label
                  key={idx}
                  className={`flex items-center justify-between p-3.5 rounded-lg border transition-all duration-200 ${
                    disabled
                      ? checked
                        ? 'bg-pm-primary/5 border-pm-primary/15 opacity-80 cursor-not-allowed'
                        : 'bg-pm-input/50 border-transparent opacity-40 cursor-not-allowed'
                      : 'bg-pm-input/20 border-pm-border/30 hover:bg-pm-input/40 hover:border-pm-border cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={e => onToggleFolder(item.path, e.target.checked)}
                      className="w-4 h-4 rounded border-pm-border text-pm-primary focus:ring-0 focus:ring-offset-0 cursor-inherit accent-pm-primary"
                    />
                    <span className="text-md">📁</span>
                    <span className="text-xs font-semibold text-pm-text truncate max-w-[120px]">{item.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[0.65rem] text-pm-text-secondary bg-pm-input px-1.5 py-0.5 rounded">
                      {item.file_count} files
                    </span>
                    <span className="text-[0.65rem] font-bold text-pm-primary bg-pm-primary/10 px-1.5 py-0.5 rounded">
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

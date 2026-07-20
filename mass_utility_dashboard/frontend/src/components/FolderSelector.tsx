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
    <div className="bg-[#12121a] border border-white/[0.08] rounded-xl p-6 shadow-xl space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 bg-[#3b82f6] rounded-full shadow-lg shadow-[#3b82f6]/50"></span>
          <h3 className="text-md font-bold tracking-wide text-white uppercase">Backup Folder Selection</h3>
        </div>
        <span className="text-[0.7rem] bg-[#3b82f6]/10 text-[#60a5fa] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">
          🔒 Auto-Applies
        </span>
      </div>

      <p className="text-sm text-gray-400 leading-relaxed">
        Check the directories you wish to include in your backups. Unchecking heavy directories (e.g. cache folders) can make backup operations up to 10x faster and prevent execution timeouts.
      </p>

      {!isCustom && (
        <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#f59e0b] p-4 rounded-lg text-xs leading-relaxed flex items-center gap-2">
          <span>
            ⚠️ <strong>Profile Active:</strong> Manual selections are disabled. The active profile automatically determines which folders are included (grayed out). Switch to <em>Custom / Load Profile</em> to customize folders.
          </span>
        </div>
      )}

      <div className="bg-[#171725] border border-white/[0.06] rounded-lg p-5 max-h-[400px] overflow-y-auto">
        {folders.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-xs text-gray-500">
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
                        ? 'bg-[#3b82f6]/5 border-[#3b82f6]/15 opacity-80 cursor-not-allowed'
                        : 'bg-white/[0.01] border-transparent opacity-40 cursor-not-allowed'
                      : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.1] cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={e => onToggleFolder(item.path, e.target.checked)}
                      className="w-4 h-4 rounded border-white/[0.1] text-[#8b5cf6] focus:ring-0 focus:ring-offset-0 cursor-inherit accent-[#8b5cf6]"
                    />
                    <span className="text-md">📁</span>
                    <span className="text-xs font-semibold text-white truncate max-w-[120px]">{item.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[0.65rem] text-gray-400 bg-white/[0.05] px-1.5 py-0.5 rounded">
                      {item.file_count} files
                    </span>
                    <span className="text-[0.65rem] font-bold text-[#8b5cf6] bg-[#8b5cf6]/10 px-1.5 py-0.5 rounded">
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

// @Arch[UI_Components]
// @Description: Unified progress bar primitive component rendering animated percentage progress, status text, and optional cancel button.

import React from 'react';

interface ProgressHUDProps {
  progressPercent: number;
  progressText: string;
  onCancel?: () => void;
  cancelText?: string;
  accentColor?: string;
}

export const ProgressHUD: React.FC<ProgressHUDProps> = ({
  progressPercent,
  progressText,
  onCancel,
  cancelText = '🛑 Stop Operation',
  accentColor = '#8b5cf6',
}) => {
  const safePercent = Math.min(100, Math.max(0, progressPercent));

  return (
    <div className="bg-[var(--pm-body-bg)] border border-[var(--pm-border-color)] rounded-xl p-4 space-y-3">
      <div className="flex justify-between text-xs text-[var(--pm-text-secondary)] font-mono">
        <span>{progressText}</span>
        <span className="font-bold text-[var(--pm-text-primary)]">{safePercent}%</span>
      </div>
      <div className="w-full h-2.5 bg-black/35 rounded-full overflow-hidden border border-[var(--pm-border-color)]">
        <div
          className="h-full transition-all duration-300 rounded-full"
          style={{ width: `${safePercent}%`, backgroundColor: accentColor }}
        ></div>
      </div>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="pm-btn pm-btn-danger text-[0.65rem] px-3 py-1 rounded-md transition uppercase font-bold cursor-pointer"
        >
          {cancelText}
        </button>
      )}
    </div>
  );
};

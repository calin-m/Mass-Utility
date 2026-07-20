// @Arch[BackupProgress]
// @Description: Renders the active file backup worker status details, containing progress indicators and cancellation command controls.

import React from 'react';

interface BackupProgressProps {
  progressText: string;
  progressPercent: number;
  onCancel: () => void;
  isCancelling: boolean;
}

export const BackupProgress: React.FC<BackupProgressProps> = ({
  progressText,
  progressPercent,
  onCancel,
  isCancelling,
}) => {
  return (
    <div className="bg-pm-card border border-pm-border rounded-xl p-5 shadow-xl space-y-4 transition-all duration-300">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <span className="text-xs font-bold text-pm-text uppercase tracking-wider">Active Backup Progress</span>
        <button
          type="button"
          disabled={isCancelling}
          onClick={onCancel}
          className="bg-pm-danger hover:opacity-90 disabled:bg-pm-input disabled:text-pm-text-secondary text-white text-[0.7rem] font-bold px-4 py-2 rounded-lg transition-all uppercase flex items-center gap-1.5"
        >
          {isCancelling ? 'Stopping...' : '🛑 Stop Backup'}
        </button>
      </div>
 
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs text-pm-text-secondary">
          <span>{progressText}</span>
          <span className="font-bold text-pm-text">{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full h-2.5 bg-pm-input rounded-full overflow-hidden border border-pm-border">
          <div
            className="h-full bg-gradient-to-r from-pm-primary to-pm-purple rounded-full transition-all duration-200 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};

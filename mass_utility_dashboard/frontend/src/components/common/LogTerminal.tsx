// @Arch[UI_Components]
// @Description: Unified terminal viewer primitive component supporting font-mono styling, dark background, auto-scroll, log copy, log save/export, and log clearance.

import React, { useRef, useEffect } from 'react';

interface LogTerminalProps {
  title?: string;
  logs: string;
  maxHeight?: string;
  showControls?: boolean;
  onClearLogs?: () => void;
  onSaveLogs?: () => void;
  downloadFilename?: string;
}

export const LogTerminal: React.FC<LogTerminalProps> = ({
  title = 'Execution Log Terminal',
  logs,
  maxHeight = '300px',
  showControls = true,
  onClearLogs,
  onSaveLogs,
  downloadFilename = 'execution.log',
}) => {
  const terminalRef = useRef<HTMLPreElement>(null);

  // Auto scroll to bottom when log content updates
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const handleDefaultSave = () => {
    if (onSaveLogs) {
      onSaveLogs();
      return;
    }
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[var(--pm-card-bg)] border border-[var(--pm-border-color)] rounded-xl p-5 shadow-xl space-y-3">
      {showControls && (
        <div className="flex justify-between items-center border-b border-[var(--pm-border-color)] pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2 font-bold text-xs uppercase text-[var(--pm-text-accent,#10b981)]">
            <span className="w-2 h-2 bg-[var(--pm-text-accent,#10b981)] rounded-full animate-pulse"></span>
            {title}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDefaultSave}
              className="pm-btn pm-btn-neutral text-[0.65rem] font-bold px-2.5 py-1 rounded-md transition uppercase cursor-pointer"
            >
              📥 Save Log
            </button>
            {onClearLogs && (
              <button
                type="button"
                onClick={onClearLogs}
                className="pm-btn pm-btn-danger text-[0.65rem] font-bold px-2.5 py-1 rounded-md transition uppercase cursor-pointer"
              >
                🗑️ Clear
              </button>
            )}
          </div>
        </div>
      )}
      <pre
        ref={terminalRef}
        style={{ maxHeight }}
        className="pm-log-terminal text-xs text-[var(--pm-terminal-text,#10b981)] bg-[var(--pm-terminal-bg,#05070f)] p-4 rounded-xl border border-[var(--pm-border-color)] overflow-y-auto font-mono leading-relaxed select-all"
      >
        {logs || 'No telemetry logs compiled yet.'}
      </pre>
    </div>
  );
};

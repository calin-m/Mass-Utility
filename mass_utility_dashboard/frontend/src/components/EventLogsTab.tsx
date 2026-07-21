// @Arch[UI_Components]
// @Description: Renders the Event Log Viewer terminal. Handles live polling, stream formatting, download proxies, and interactive clearance hooks.
// @Calls: hydrate_dashboard, clear_saas_log

import React, { useState, useEffect, useRef } from 'react';
import { FetchService } from '../utils/FetchService';
import { useModal } from '../utils/overlay';

export const EventLogsTab: React.FC = () => {
  const { showAlert, showConfirm } = useModal();
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(true);
  const [autoPoll, setAutoPoll] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<any>(null);

  const fetchLogs = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await FetchService.post('hydrate_dashboard');
      if (data.success) {
        setLogs(data.log_content || 'No log data retrieved.');
      }
    } catch (err: any) {
      if (!silent) {
        showAlert('Log Query Failed', err.message || 'Could not fetch logs from host.', 'error');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    
    // Set up polling
    if (autoPoll) {
      pollTimerRef.current = setInterval(() => {
        fetchLogs(true);
      }, 5000);
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [autoPoll]);

  // Scroll to bottom when logs refresh
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleClearLogs = () => {
    showConfirm(
      'Clear Application Logs',
      'Are you sure you want to permanently erase the SaaS telemetry logs from the host server? This action is irreversible.',
      'CLEAR',
      async () => {
        try {
          const data = await FetchService.post('clear_saas_log');
          if (data.success) {
            setLogs('No logs compiled yet.');
            showAlert('Logs Cleared', 'Host server telemetry logs cleared.', 'info');
          }
        } catch (err: any) {
          showAlert('Clear Failed', err.message || 'Failed to clear logs.', 'error');
        }
      }
    );
  };

  const handleDownloadLogFile = () => {
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `saas_telemetry_${new Date().toISOString().slice(0,10)}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filter logs line-by-line on frontend for high-speed searching
  const getFilteredLogs = () => {
    let filtered = logs;
    if (severityFilter !== 'ALL') {
      const lines = filtered.split('\n');
      filtered = lines
        .filter(line => line.toUpperCase().includes(severityFilter))
        .join('\n');
    }
    if (searchFilter.trim()) {
      const lines = filtered.split('\n');
      filtered = lines
        .filter(line => line.toLowerCase().includes(searchFilter.toLowerCase()))
        .join('\n');
    }
    return filtered;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-pm-border pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 text-lg">📋</div>
          <div>
            <h2 className="text-md font-bold tracking-wide text-pm-text uppercase">System Event Logs</h2>
            <p className="text-xs text-pm-text-secondary mt-0.5">Real-time telemetry stream, diagnostic warnings, and audit logging</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDownloadLogFile}
            className="pm-btn pm-btn-neutral px-4 py-2 text-xs font-bold uppercase"
          >
            📥 Download Log File
          </button>
          <button
            onClick={handleClearLogs}
            className="pm-btn pm-btn-danger px-4 py-2 text-xs font-bold uppercase"
          >
            🗑️ Clear Telemetry
          </button>
        </div>
      </div>

      {/* Terminal Settings and Filter */}
      <div className="flex flex-wrap gap-4 bg-pm-card border border-pm-border p-4 rounded-xl items-center justify-between shadow-md">
        <div className="flex items-center gap-3 flex-grow max-w-md">
          <span className="text-xs text-pm-text-secondary font-bold uppercase">Filter:</span>
          <input
            type="text"
            placeholder="Search log stream line-by-line..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-pm-input border border-pm-border text-xs text-pm-text rounded-lg px-3 py-2 focus:outline-none focus:border-pm-primary/50"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-pm-input border border-pm-border p-1 rounded-lg">
            {['ALL', 'ERROR', 'WARN', 'INFO'].map(st => (
              <button
                key={st}
                onClick={() => setSeverityFilter(st)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase transition ${
                  severityFilter === st ? 'bg-pm-card text-pm-text shadow-sm' : 'text-pm-text-secondary hover:text-pm-text'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-pm-text-secondary uppercase cursor-pointer">
            <input
              type="checkbox"
              checked={autoPoll}
              onChange={(e) => setAutoPoll(e.target.checked)}
              className="w-4 h-4 bg-pm-input border border-pm-border rounded text-pm-primary focus:ring-0 focus:ring-offset-0"
            />
            Live Polling (5s)
          </label>

          <button
            onClick={() => fetchLogs()}
            disabled={loading}
            className="pm-btn pm-btn-neutral px-4 py-1.5 text-xs font-bold"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Terminal logs container */}
      <div className="bg-pm-card border border-pm-border rounded-xl overflow-hidden shadow-xl flex flex-col">
        <div className="bg-black/40 px-4 py-2 border-b border-pm-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-bold text-pm-text-secondary uppercase font-mono">telemetry@mass-utility.sh</span>
          </div>
          <span className="text-[9px] text-pm-text-secondary font-mono">UTF-8 • Line Buffered</span>
        </div>

        <div className="p-4 bg-pm-terminal-bg rounded-b-xl border-x border-b border-pm-border min-h-[350px] max-h-[550px] overflow-y-auto font-mono text-xs text-slate-300 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
          {loading && !logs ? (
            <div className="flex items-center justify-center h-[350px] text-pm-text-secondary gap-2">
              <span className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></span>
              Streaming host telemetry console...
            </div>
          ) : (
            <pre className="text-emerald-400 whitespace-pre-wrap word-break-all">
              {getFilteredLogs() || 'No telemetry matches current filter criteria.'}
              <div ref={terminalEndRef} />
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

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
    if (!searchFilter.trim()) return logs;
    const lines = logs.split('\n');
    return lines
      .filter(line => line.toLowerCase().includes(searchFilter.toLowerCase()))
      .join('\n');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-pm-border pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 text-lg">📋</div>
          <div>
            <h2 className="text-md font-bold tracking-wide text-white uppercase">System Event Logs</h2>
            <p className="text-xs text-gray-400 mt-0.5">Real-time telemetry stream, diagnostic warnings, and audit logging</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDownloadLogFile}
            className="bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition uppercase"
          >
            📥 Download Log File
          </button>
          <button
            onClick={handleClearLogs}
            className="bg-red-950/20 border border-red-900/30 hover:bg-red-900/10 text-red-400 text-xs font-bold px-4 py-2 rounded-lg transition uppercase"
          >
            🗑️ Clear Telemetry
          </button>
        </div>
      </div>

      {/* Terminal Settings and Filter */}
      <div className="flex flex-wrap gap-4 bg-pm-card border border-pm-border p-4 rounded-xl items-center justify-between shadow-md">
        <div className="flex items-center gap-3 flex-grow max-w-md">
          <span className="text-xs text-gray-400 font-bold uppercase">Filter Content:</span>
          <input
            type="text"
            placeholder="Search log stream line-by-line..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-black/20 border border-pm-border text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#8b5cf6]/50"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase cursor-pointer">
            <input
              type="checkbox"
              checked={autoPoll}
              onChange={(e) => setAutoPoll(e.target.checked)}
              className="w-4 h-4 bg-black/20 border border-pm-border rounded text-[#8b5cf6] focus:ring-0 focus:ring-offset-0"
            />
            Live Polling (5s)
          </label>

          <button
            onClick={() => fetchLogs()}
            disabled={loading}
            className="bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition"
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
            <span className="text-[10px] font-bold text-gray-400 uppercase font-mono">telemetry@mass-utility.sh</span>
          </div>
          <span className="text-[9px] text-gray-500 font-mono">UTF-8 • Line Buffered</span>
        </div>

        <div className="p-4 bg-[#05070f] min-h-[400px] max-h-[500px] overflow-y-auto font-mono text-xs leading-relaxed select-all">
          {loading && !logs ? (
            <div className="flex items-center justify-center h-[350px] text-gray-500 gap-2">
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

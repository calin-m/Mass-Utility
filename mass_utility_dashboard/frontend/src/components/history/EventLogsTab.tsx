// @Arch[UI_Components]
// @Description: Renders the Event Log Viewer terminal. Handles live polling, stream formatting, download proxies, and interactive clearance hooks.
// @Calls: hydrate_dashboard, clear_saas_log

import React, { useState, useEffect, useRef } from 'react';
import { LogTerminal } from '../common/LogTerminal';
import { SearchFilterBar } from '../common/SearchFilterBar';
import { FetchService } from '../../utils/FetchService';
import { useModal } from '../../utils/overlay';

export const EventLogsTab: React.FC = () => {
  const { showAlert, showConfirm, showToast } = useModal();
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
      'DELETE ALL',
      async () => {
        try {
          const data = await FetchService.post('clear_saas_log');
          if (data.success) {
            setLogs('No logs compiled yet.');
            showToast('Host server telemetry logs cleared.', 'info');
          }
        } catch (err: any) {
          showAlert('Clear Failed', err.message || 'Failed to clear logs.', 'error');
        }
      },
      'danger'
    );
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
      </div>

      <SearchFilterBar
        searchValue={searchFilter}
        onSearchChange={setSearchFilter}
        placeholder="Search log stream line-by-line..."
        filterValue={severityFilter}
        onFilterChange={setSeverityFilter}
        filterLabel="Severity"
        filterOptions={[
          { value: 'ALL', label: 'ALL SEVERITIES' },
          { value: 'ERROR', label: 'ERROR' },
          { value: 'WARN', label: 'WARN' },
          { value: 'INFO', label: 'INFO' }
        ]}
        extraActions={
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-bold text-pm-text-secondary uppercase cursor-pointer mr-2">
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
              className="pm-btn pm-btn-neutral px-3 py-1.5 text-xs font-bold"
            >
              🔄 Refresh
            </button>
          </div>
        }
      />

      {/* Terminal logs container */}
      <LogTerminal
        title="Live Log Stream Console"
        logs={getFilteredLogs() || 'No telemetry matches current filter criteria.'}
        maxHeight="550px"
        onClearLogs={handleClearLogs}
        downloadFilename="saas_telemetry.log"
      />
    </div>
  );
};

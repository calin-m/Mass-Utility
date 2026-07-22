// @Arch[UI_Components]
// @Description: Renders the Safety Governor & Audits dashboard, displaying host LVE specs, diagnostics, and php.ini limits.

import { useState, useEffect } from 'react';
import { FetchService } from '../../utils/FetchService';

interface ChecklistItem {
  status: string;
  message: string;
}

interface ServerStatusResponse {
  success: boolean;
  load_state: string;
  cpu_load: string;
  chunk_size: number;
  sleep_delay: number;
  probe_status: string;
  probe_latency: string;
  memory_usage: string;
  cores?: number;
  db_max_connections?: number;
  memory_floor?: number;
  ps_version?: string;
  mysql_version?: string;
  cpu_speed?: string;
  php_version?: string;
  opcache_enabled?: string;
  opcache_active?: boolean;
  checklist?: {
    overall: boolean;
    db_locks?: ChecklistItem;
    disk_space?: ChecklistItem;
    memory?: ChecklistItem;
    file_permissions?: ChecklistItem;
  };
  ini?: {
    max_execution_time?: number;
    max_input_time?: number;
    default_socket_timeout?: number;
    upload_max_filesize?: string;
    post_max_size?: string;
    memory_limit?: string;
    session_gc_maxlifetime?: number;
  };
}

export const GovernorTab = () => {
  const [data, setData] = useState<ServerStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedIni, setExpandedIni] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchStatus = async () => {
      try {
        const res = await FetchService.post('get_server_status');
        if (active && res && res.success) {
          setData(res as ServerStatusResponse);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error fetching server diagnostics:', err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const isSafe = data ? (data.checklist?.overall && data.probe_status === 'PASSED') : true;
  const loadStateColor = !data ? 'text-pm-text-secondary' :
    data.load_state === 'CRITICAL' ? 'text-red-500' :
    data.load_state === 'HIGH' ? 'text-amber-500' :
    data.load_state === 'MEDIUM' ? 'text-blue-500' : 'text-emerald-500';

  return (
    <div className="space-y-6">
      {/* Status Hero Block */}
      <div className="bg-pm-card border border-pm-border rounded-2xl p-6 shadow-xl flex justify-between items-center flex-wrap gap-4 transition-all duration-300">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-pm-primary/10 border border-pm-primary/20 flex items-center justify-center text-pm-primary">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-wide text-pm-text">Native Safety Governor</h2>
            <p className="text-xs text-pm-text-secondary mt-0.5">Real-time load tracking &amp; execution throttle limits</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-pm-primary/10 border border-transparent text-pm-primary text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider">
            ☁️ CloudLinux LVE
          </span>
          {isLoading || !data ? (
            <div className="w-32 h-7 rounded-lg bg-pm-input/50 border border-pm-border animate-pulse"></div>
          ) : (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold ${
              isSafe
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isSafe ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
              {isSafe ? 'SAFE TO OPERATE' : 'SHIELD ACTIVE'}
            </div>
          )}
        </div>
      </div>

      {/* Pre-Flight Checklist Grid */}
      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-5 border-b border-pm-border pb-3">
          <span className="w-2.5 h-2.5 bg-pm-primary rounded-full"></span>
          <h3 className="text-sm font-bold tracking-wide text-pm-text uppercase">Phase 0 Pre-Flight Safety Audits</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Lock Audit */}
          <div className="p-4 bg-pm-input/50 border border-pm-border rounded-xl flex flex-col justify-between space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-pm-text uppercase tracking-wider flex items-center gap-2">
                <span>🔒</span> Database Locks
              </span>
              <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-md ${
                data?.checklist?.db_locks?.status === 'PASS'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-amber-500/15 text-amber-400'
              }`}>
                {data?.checklist?.db_locks?.status || 'CHECKING'}
              </span>
            </div>
            <p className="text-xs text-pm-text-secondary">{data?.checklist?.db_locks?.message || 'Auditing database locks...'}</p>
          </div>

          {/* Disk Space */}
          <div className="p-4 bg-pm-input/50 border border-pm-border rounded-xl flex flex-col justify-between space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-pm-text uppercase tracking-wider flex items-center gap-2">
                <span>💾</span> Staging Disk Space
              </span>
              <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-md ${
                data?.checklist?.disk_space?.status === 'PASS'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-red-500/15 text-red-400'
              }`}>
                {data?.checklist?.disk_space?.status || 'CHECKING'}
              </span>
            </div>
            <p className="text-xs text-pm-text-secondary">{data?.checklist?.disk_space?.message || 'Auditing disk space...'}</p>
          </div>

          {/* Memory */}
          <div className="p-4 bg-pm-input/50 border border-pm-border rounded-xl flex flex-col justify-between space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-pm-text uppercase tracking-wider flex items-center gap-2">
                <span>🧠</span> PHP Runtime Memory
              </span>
              <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-md ${
                data?.checklist?.memory?.status === 'PASS'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-red-500/15 text-red-400'
              }`}>
                {data?.checklist?.memory?.status || 'CHECKING'}
              </span>
            </div>
            <p className="text-xs text-pm-text-secondary">{data?.checklist?.memory?.message || 'Auditing memory allocation...'}</p>
          </div>

          {/* File Permissions */}
          <div className="p-4 bg-pm-input/50 border border-pm-border rounded-xl flex flex-col justify-between space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-pm-text uppercase tracking-wider flex items-center gap-2">
                <span>🛡️</span> Staging File Permissions
              </span>
              <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-md ${
                data?.checklist?.file_permissions?.status === 'PASS'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-red-500/15 text-red-400'
              }`}>
                {data?.checklist?.file_permissions?.status || 'CHECKING'}
              </span>
            </div>
            <p className="text-xs text-pm-text-secondary">{data?.checklist?.file_permissions?.message || 'Auditing permissions...'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Real-time Limits */}
        <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3 border-b border-pm-border pb-3">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
            <h3 className="text-sm font-bold tracking-wide text-pm-text uppercase">Governor Limits</h3>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-pm-text-secondary">Cgroup Load State</span>
              <span className={`font-bold ${loadStateColor}`}>{data?.load_state || 'OPERATIONAL'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-pm-text-secondary">Cgroup Calculated CPU</span>
              <span className="font-bold text-pm-text">{data?.cpu_load || 'Measuring...'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-pm-text-secondary">Dynamic Chunk Batch</span>
              <span className="font-bold text-pm-text">{data ? `${data.chunk_size} rows/batch` : 'Calculating...'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-pm-text-secondary">Micro-sleep Delay</span>
              <span className="font-bold text-pm-text">{data ? `${data.sleep_delay} ms` : 'Calculating...'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-pm-text-secondary">Active Memory Footprint</span>
              <span className="font-bold text-pm-text">{data?.memory_usage || 'Measuring...'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-pm-text-secondary">Probe Latency</span>
              <span className="font-bold text-pm-text">{data?.probe_latency || 'Measuring...'}</span>
            </div>
          </div>
        </div>

        {/* Engine Specs */}
        <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3 border-b border-pm-border pb-3">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span>
            <h3 className="text-sm font-bold tracking-wide text-pm-text uppercase">Hardware &amp; Engine Specs</h3>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-pm-text-secondary">Allocated CPU Speed</span>
              <span className="font-bold text-pm-text">{data?.cpu_speed || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-pm-text-secondary">Virtual Core Limit</span>
              <span className="font-bold text-pm-text">{data?.cores ? `${data.cores} Cores` : 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-pm-text-secondary">Max DB Connections</span>
              <span className="font-bold text-pm-text">{data?.db_max_connections || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-pm-text-secondary">Memory Safety Floor</span>
              <span className="font-bold text-pm-text">
                {data?.memory_floor ? `${(data.memory_floor / 1024 / 1024).toFixed(0)} MB` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-pm-text-secondary">PHP Version</span>
              <span className="font-bold text-pm-text">{data?.php_version || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-pm-text-secondary">OPcache Status</span>
              <span className={`font-bold ${data?.opcache_active ? 'text-emerald-400' : 'text-amber-400'}`}>
                {data?.opcache_enabled || 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable PHP limits card */}
      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-xl">
        <button
          type="button"
          onClick={() => setExpandedIni(!expandedIni)}
          className="w-full flex items-center justify-between text-left focus:outline-none"
        >
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-pm-primary rounded-full"></span>
            <h3 className="text-sm font-bold tracking-wide text-pm-text uppercase">PHP Runtime Environment Limits (php.ini)</h3>
          </div>
          <span className="text-xs text-pm-text-secondary">{expandedIni ? 'Hide Details ▲' : 'Inspect Limits ▼'}</span>
        </button>

        {expandedIni && data?.ini && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-5 border-t border-pm-border transition-all duration-300">
            <div className="p-4 bg-pm-input/50 border border-pm-border rounded-xl space-y-2.5">
              <h4 className="text-xs font-bold text-pm-text uppercase tracking-wider flex items-center gap-2">
                <span>⏱️</span> Execution Limits
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-pm-text-secondary">max_execution_time</span>
                  <span className="font-mono text-pm-text">{data.ini.max_execution_time}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pm-text-secondary">max_input_time</span>
                  <span className="font-mono text-pm-text">{data.ini.max_input_time}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pm-text-secondary">default_socket_timeout</span>
                  <span className="font-mono text-pm-text">{data.ini.default_socket_timeout}s</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-pm-input/50 border border-pm-border rounded-xl space-y-2.5">
              <h4 className="text-xs font-bold text-pm-text uppercase tracking-wider flex items-center gap-2">
                <span>📦</span> Memory &amp; Upload
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-pm-text-secondary">memory_limit</span>
                  <span className="font-mono text-pm-text">{data.ini.memory_limit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pm-text-secondary">upload_max_filesize</span>
                  <span className="font-mono text-pm-text">{data.ini.upload_max_filesize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pm-text-secondary">post_max_size</span>
                  <span className="font-mono text-pm-text">{data.ini.post_max_size}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-pm-input/50 border border-pm-border rounded-xl space-y-2.5">
              <h4 className="text-xs font-bold text-pm-text uppercase tracking-wider flex items-center gap-2">
                <span>🍪</span> Session Boundaries
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-pm-text-secondary">session.gc_maxlifetime</span>
                  <span className="font-mono text-pm-text">{data.ini.session_gc_maxlifetime}s</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

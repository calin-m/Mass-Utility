// @Arch[UI_Components]
// @Description: Renders the Safety Governor & Audits dashboard, displaying host LVE specs, diagnostics, and php.ini limits.

import { useState, useEffect } from 'react';
import { FetchService } from '../utils/FetchService';

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
  const [expandedIni, setExpandedIni] = useState(false);

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

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs uppercase tracking-widest text-slate-400">Loading Host Governor Telemetry...</p>
      </div>
    );
  }

  const isSafe = data.checklist?.overall && data.probe_status === 'PASSED';
  const loadStateColor = 
    data.load_state === 'CRITICAL' ? 'text-red-500' :
    data.load_state === 'HIGH' ? 'text-amber-500' :
    data.load_state === 'MEDIUM' ? 'text-blue-500' : 'text-emerald-500';

  return (
    <div className="space-y-6">
      {/* Status Hero Block */}
      <div className="bg-[#12121a] border border-white/[0.08] rounded-2xl p-6 shadow-xl flex justify-between items-center flex-wrap gap-4 transition-all duration-300">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-wide text-white">Native Safety Governor</h2>
            <p className="text-xs text-gray-400 mt-0.5">Real-time load tracking &amp; execution throttle limits</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-indigo-500/10 border border-indigo-500/20 text-[#a78bfa] text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider">
            ☁️ CloudLinux LVE
          </span>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold ${
            isSafe
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isSafe ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
            {isSafe ? 'SAFE TO OPERATE' : 'SHIELD ACTIVE'}
          </div>
        </div>
      </div>

      {/* Pre-Flight Checklist Grid */}
      <div className="bg-[#12121a] border border-white/[0.08] rounded-xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-5 border-b border-white/[0.06] pb-3">
          <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></span>
          <h3 className="text-sm font-bold tracking-wide text-white uppercase">Phase 0 Pre-Flight Safety Audits</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Lock Audit */}
          <div className="p-4 bg-black/10 border border-white/[0.06] rounded-xl flex flex-col justify-between space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>🔒</span> Database Locks
              </span>
              <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-md ${
                data.checklist?.db_locks?.status === 'PASS'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-amber-500/15 text-amber-400'
              }`}>
                {data.checklist?.db_locks?.status || 'UNKNOWN'}
              </span>
            </div>
            <p className="text-xs text-gray-400">{data.checklist?.db_locks?.message || 'No info'}</p>
          </div>

          {/* Disk Space */}
          <div className="p-4 bg-black/10 border border-white/[0.06] rounded-xl flex flex-col justify-between space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>💾</span> Staging Disk Space
              </span>
              <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-md ${
                data.checklist?.disk_space?.status === 'PASS'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-red-500/15 text-red-400'
              }`}>
                {data.checklist?.disk_space?.status || 'UNKNOWN'}
              </span>
            </div>
            <p className="text-xs text-gray-400">{data.checklist?.disk_space?.message || 'No info'}</p>
          </div>

          {/* Memory */}
          <div className="p-4 bg-black/10 border border-white/[0.06] rounded-xl flex flex-col justify-between space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>🧠</span> PHP Runtime Memory
              </span>
              <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-md ${
                data.checklist?.memory?.status === 'PASS'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-red-500/15 text-red-400'
              }`}>
                {data.checklist?.memory?.status || 'UNKNOWN'}
              </span>
            </div>
            <p className="text-xs text-gray-400">{data.checklist?.memory?.message || 'No info'}</p>
          </div>

          {/* File Permissions */}
          <div className="p-4 bg-black/10 border border-white/[0.06] rounded-xl flex flex-col justify-between space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>🛡️</span> Staging File Permissions
              </span>
              <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-md ${
                data.checklist?.file_permissions?.status === 'PASS'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-red-500/15 text-red-400'
              }`}>
                {data.checklist?.file_permissions?.status || 'UNKNOWN'}
              </span>
            </div>
            <p className="text-xs text-gray-400">{data.checklist?.file_permissions?.message || 'No info'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Real-time Limits */}
        <div className="bg-[#12121a] border border-white/[0.08] rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
            <h3 className="text-sm font-bold tracking-wide text-white uppercase">Governor Limits</h3>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Cgroup Load State</span>
              <span className={`font-bold ${loadStateColor}`}>{data.load_state}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Cgroup Calculated CPU</span>
              <span className="font-bold text-white">{data.cpu_load}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Dynamic Chunk Batch</span>
              <span className="font-bold text-white">{data.chunk_size} rows/batch</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Micro-sleep Delay</span>
              <span className="font-bold text-white">{data.sleep_delay} ms</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Active Memory Footprint</span>
              <span className="font-bold text-white">{data.memory_usage}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Probe Latency</span>
              <span className="font-bold text-white">{data.probe_latency}</span>
            </div>
          </div>
        </div>

        {/* Engine Specs */}
        <div className="bg-[#12121a] border border-white/[0.08] rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span>
            <h3 className="text-sm font-bold tracking-wide text-white uppercase">Hardware &amp; Engine Specs</h3>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Allocated CPU Speed</span>
              <span className="font-bold text-white">{data.cpu_speed || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Virtual Core Limit</span>
              <span className="font-bold text-white">{data.cores ? `${data.cores} Cores` : 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Max DB Connections</span>
              <span className="font-bold text-white">{data.db_max_connections || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Memory Safety Floor</span>
              <span className="font-bold text-white">
                {data.memory_floor ? `${(data.memory_floor / 1024 / 1024).toFixed(0)} MB` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">PHP Version</span>
              <span className="font-bold text-white">{data.php_version || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">OPcache Status</span>
              <span className={`font-bold ${data.opcache_active ? 'text-emerald-400' : 'text-amber-400'}`}>
                {data.opcache_enabled || 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable PHP limits card */}
      <div className="bg-[#12121a] border border-white/[0.08] rounded-xl p-6 shadow-xl">
        <button
          type="button"
          onClick={() => setExpandedIni(!expandedIni)}
          className="w-full flex items-center justify-between text-left focus:outline-none"
        >
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-purple-500 rounded-full"></span>
            <h3 className="text-sm font-bold tracking-wide text-white uppercase">PHP Runtime Environment Limits (php.ini)</h3>
          </div>
          <span className="text-xs text-gray-400">{expandedIni ? 'Hide Details ▲' : 'Inspect Limits ▼'}</span>
        </button>

        {expandedIni && data.ini && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-5 border-t border-white/[0.06] transition-all duration-300">
            <div className="p-4 bg-black/10 border border-white/[0.06] rounded-xl space-y-2.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>⏱️</span> Execution Limits
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">max_execution_time</span>
                  <span className="font-mono text-white">{data.ini.max_execution_time}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">max_input_time</span>
                  <span className="font-mono text-white">{data.ini.max_input_time}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">default_socket_timeout</span>
                  <span className="font-mono text-white">{data.ini.default_socket_timeout}s</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-black/10 border border-white/[0.06] rounded-xl space-y-2.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>📦</span> Memory &amp; Upload
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">memory_limit</span>
                  <span className="font-mono text-white">{data.ini.memory_limit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">upload_max_filesize</span>
                  <span className="font-mono text-white">{data.ini.upload_max_filesize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">post_max_size</span>
                  <span className="font-mono text-white">{data.ini.post_max_size}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-black/10 border border-white/[0.06] rounded-xl space-y-2.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>🍪</span> Session Boundaries
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">session.gc_maxlifetime</span>
                  <span className="font-mono text-white">{data.ini.session_gc_maxlifetime}s</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Project Mass - Governor Engine
 * Handles the Server Profiling & Safety Governor tab live metrics polling.
 */
const GovernorEngine = (function() {

    // --- Private Engine Logic ---
    function pollDiagnostics() {


        FetchEngine.post('get_server_status')
            .then(data => {
                if (!data || !data.success) return;

                // Update live metrics elements
                const stateEl = document.getElementById('pm-live-load-state');
                const cpuLoadEl = document.getElementById('pm-live-cpu-load');
                const chunkEl = document.getElementById('pm-live-chunk-size');
                const sleepEl = document.getElementById('pm-live-sleep-delay');
                const probeStatusEl = document.getElementById('pm-live-probe-status');
                const probeStatusTextEl = document.getElementById('pm-live-probe-status-text');
                const probeLatencyEl = document.getElementById('pm-live-probe-latency');
                const memEl = document.getElementById('pm-live-memory-usage');

                if (stateEl) {
                    stateEl.textContent = data.load_state;
                    let stateColor = '#10b981';
                    if (data.load_state === 'CRITICAL') stateColor = '#ef4444';
                    else if (data.load_state === 'HIGH') stateColor = '#f59e0b';
                    else if (data.load_state === 'MEDIUM') stateColor = '#3b82f6';
                    stateEl.style.color = stateColor;
                }
                if (cpuLoadEl) {
                    cpuLoadEl.textContent = data.cpu_load;
                }
                if (chunkEl) {
                    chunkEl.textContent = data.chunk_size + ' rows/batch';
                }
                if (sleepEl) {
                    sleepEl.textContent = data.sleep_delay + ' ms';
                }
                if (probeStatusEl) {
                    probeStatusEl.textContent = data.probe_status;
                    probeStatusEl.className = 'pm-status-pill ' + (data.probe_status === 'PASSED' ? 'success' : 'danger');
                }
                if (probeStatusTextEl) {
                    probeStatusTextEl.textContent = data.probe_status === 'PASSED' ? 'VERIFIED INTACT' : 'PROBE FAILED';
                    probeStatusTextEl.style.color = data.probe_status === 'PASSED' ? '#10b981' : '#ef4444';
                }
                if (probeLatencyEl) {
                    probeLatencyEl.textContent = data.probe_latency;
                }
                if (memEl) {
                    memEl.textContent = data.memory_usage;
                }

                // Update pre-flight safety audits checklist
                if (data.checklist) {
                    const locks = data.checklist.db_locks;
                    const disk = data.checklist.disk_space;
                    const memory = data.checklist.memory;
                    const filePerms = data.checklist.file_permissions;

                    const lockStatusEl = document.getElementById('pm-audit-db-locks-status');
                    const lockMessageEl = document.getElementById('pm-audit-db-locks-message');
                    if (lockStatusEl && locks) {
                        lockStatusEl.textContent = locks.status;
                        lockStatusEl.className = 'pm-status-pill ' + (locks.status === 'PASS' ? 'success' : 'warning');
                    }
                    if (lockMessageEl && locks) {
                        lockMessageEl.textContent = locks.message;
                    }

                    const diskStatusCheckEl = document.getElementById('pm-live-disk-status');
                    const diskMessageCheckEl = document.getElementById('pm-live-disk-message');
                    if (diskStatusCheckEl && disk) {
                        diskStatusCheckEl.textContent = disk.status;
                        diskStatusCheckEl.className = 'pm-status-pill ' + (disk.status === 'PASS' ? 'success' : 'danger');
                    }
                    if (diskMessageCheckEl && disk) {
                        diskMessageCheckEl.textContent = disk.message;
                    }

                    const memStatusEl = document.getElementById('pm-audit-memory-status');
                    const memMessageEl = document.getElementById('pm-audit-memory-message');
                    if (memStatusEl && memory) {
                        memStatusEl.textContent = memory.status;
                        memStatusEl.className = 'pm-status-pill ' + (memory.status === 'PASS' ? 'success' : 'danger');
                    }
                    if (memMessageEl && memory) {
                        memMessageEl.textContent = memory.message;
                    }

                    const permStatusEl = document.getElementById('pm-audit-file-permissions-status');
                    const permMessageEl = document.getElementById('pm-audit-file-permissions-message');
                    if (permStatusEl && filePerms) {
                        permStatusEl.textContent = filePerms.status;
                        permStatusEl.className = 'pm-status-pill ' + (filePerms.status === 'PASS' ? 'success' : 'danger');
                    }
                    if (permMessageEl && filePerms) {
                        permMessageEl.textContent = filePerms.message;
                    }

                    // Update overall safety indicator in top header
                    const safetyHeaderEl = document.getElementById('pm-live-header-safety');
                    const safetyDotEl = document.getElementById('pm-live-header-safety-dot');
                    const safetyTextEl = document.getElementById('pm-live-header-safety-text');
                    const isSafe = data.probe_success && data.checklist.overall;

                    if (safetyHeaderEl) {
                        safetyHeaderEl.style.background = isSafe ? 'rgba(var(--pm-success-rgb), 0.08)' : 'rgba(var(--pm-danger-rgb), 0.08)';
                        safetyHeaderEl.style.border = isSafe ? '1px solid rgba(var(--pm-success-rgb), 0.2)' : '1px solid rgba(var(--pm-danger-rgb), 0.2)';
                    }
                    if (safetyDotEl) {
                        safetyDotEl.className = 'pm-status-dot ' + (isSafe ? 'success' : 'danger');
                    }
                    if (safetyTextEl) {
                        safetyTextEl.textContent = isSafe ? 'SAFE TO OPERATE' : 'SHIELD ACTIVE';
                        safetyTextEl.style.color = isSafe ? 'var(--pm-success)' : 'var(--pm-danger)';
                    }

                    // Dynamically toggle backup triggers based on safety state
                    const dbBackupBtn = document.getElementById('pm-btn-backup');
                    if (dbBackupBtn) {
                        const dbRunning = document.getElementById('pm-backup-progress-container')?.style.display === 'block';
                        dbBackupBtn.disabled = dbRunning ? true : !isSafe;
                    }
                    const fileBackupBtn = document.getElementById('pm-btn-start-file-backup');
                    if (fileBackupBtn) {
                        const fileRunning = document.getElementById('pm-file-backup-progress-container')?.style.display === 'block';
                        fileBackupBtn.disabled = fileRunning ? true : !isSafe;
                    }
                }

                // Update Hardware Specs
                const coresEl = document.getElementById('pm-live-cores');
                if (coresEl && data.cores) {
                    coresEl.textContent = data.cores + ' Cores';
                }
                const dbMaxConnectionsEl = document.getElementById('pm-live-db-max-connections');
                if (dbMaxConnectionsEl && data.db_max_connections) {
                    dbMaxConnectionsEl.textContent = data.db_max_connections;
                }
                const memoryFloorEl = document.getElementById('pm-live-memory-floor');
                if (memoryFloorEl && data.memory_floor) {
                    memoryFloorEl.textContent = (data.memory_floor / 1024 / 1024).toFixed(2) + ' MB';
                }
                const psVersionEl = document.getElementById('pm-live-ps-version');
                if (psVersionEl && data.ps_version) {
                    psVersionEl.textContent = data.ps_version;
                }
                const mysqlVersionEl = document.getElementById('pm-live-mysql-version');
                if (mysqlVersionEl && data.mysql_version) {
                    mysqlVersionEl.textContent = data.mysql_version;
                }
                const cpuSpeedEl = document.getElementById('pm-live-cpu-speed');
                if (cpuSpeedEl && data.cpu_speed) {
                    cpuSpeedEl.textContent = data.cpu_speed;
                }

                // Update php.ini limits
                if (data.ini) {
                    const maxExecEl = document.getElementById('pm-ini-max-execution-time');
                    if (maxExecEl) maxExecEl.textContent = data.ini.max_execution_time + 's';
                    const maxInputEl = document.getElementById('pm-ini-max-input-time');
                    if (maxInputEl) maxInputEl.textContent = data.ini.max_input_time + 's';
                    const socketTimeoutEl = document.getElementById('pm-ini-default-socket-timeout');
                    if (socketTimeoutEl) socketTimeoutEl.textContent = data.ini.default_socket_timeout + 's';
                    const uploadMaxEl = document.getElementById('pm-ini-upload-max-filesize');
                    if (uploadMaxEl) uploadMaxEl.textContent = data.ini.upload_max_filesize;
                    const postMaxEl = document.getElementById('pm-ini-post-max-size');
                    if (postMaxEl) postMaxEl.textContent = data.ini.post_max_size;
                    const memLimitEl = document.getElementById('pm-ini-memory-limit');
                    if (memLimitEl) memLimitEl.textContent = data.ini.memory_limit;
                    const sessionGcEl = document.getElementById('pm-ini-session-gc-maxlifetime');
                    if (sessionGcEl) sessionGcEl.textContent = data.ini.session_gc_maxlifetime + 's';
                }

                const phpVersionEl = document.getElementById('pm-live-php-version');
                if (phpVersionEl && data.php_version) {
                    phpVersionEl.textContent = data.php_version;
                }

                const opcacheStatusEl = document.getElementById('pm-live-opcache-status');
                if (opcacheStatusEl) {
                    opcacheStatusEl.textContent = data.opcache_enabled;
                    opcacheStatusEl.style.color = data.opcache_active ? '#10b981' : '#f59e0b';
                }
            })
            .catch(err => console.error('Error polling diagnostics:', err));
    }

    function startDiagnosticsPolling() {
        setInterval(pollDiagnostics, 5000); // 5 seconds polling
    }

    // --- Public API ---
    return {
        initialize: function() {
            // Run once immediately on load
            pollDiagnostics();
            startDiagnosticsPolling();
        }
    };
})();

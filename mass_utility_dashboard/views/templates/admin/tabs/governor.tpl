<!-- TAB 1: SAFETY GOVERNOR & AUDITS -->
                <div class="pm-tab-content" id="pm-content-governor">
                    <!-- Modern Dashboard Hero Header -->
                    <div class="pm-status-hero" style="margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 2rem; background: var(--pm-hero-bg); border: 1px solid var(--pm-border-color); border-radius: 20px; box-shadow: 0 4px 20px var(--pm-shadow); flex-wrap: wrap; gap: 1.5rem;">
                        <div style="display: flex; align-items: center; gap: 1.5rem;">
                            <div style="width: 50px; height: 50px; border-radius: 12px; background: rgba(var(--pm-primary-rgb), 0.1); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(var(--pm-primary-rgb), 0.2);">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="none" style="stroke: var(--pm-primary);" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            </div>
                            <div>
                                <h2 style="margin: 0; font-family: 'Outfit', sans-serif; font-size: 1.5rem; font-weight: 700; color: var(--pm-text-primary); letter-spacing: -0.01em;">Native Safety Governor</h2>
                                <p style="margin: 0.25rem 0 0 0; font-size: 0.85rem; color: var(--pm-text-secondary);">Real-time metrics & host partition monitoring for Sitebunker CloudLinux.</p>
                            </div>
                        </div>
                        
                        <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
                            <div class="pm-status-pill success" style="font-family: 'Outfit', sans-serif; font-size: 0.75rem; font-weight: 700; padding: 0.4rem 0.8rem; background: rgba(var(--pm-primary-rgb), 0.1); color: var(--pm-primary); border: 1px solid rgba(var(--pm-primary-rgb), 0.2); border-radius: 8px;">
                                <span style="margin-right: 4px;">☁️</span> CloudLinux LVE
                            </div>
                            
                            <div id="pm-live-header-safety" class="pm-header-safety" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.8rem; border-radius: 8px; background: rgba(var(--pm-danger-rgb), 0.08); border: 1px solid rgba(var(--pm-danger-rgb), 0.2);">
                                <span id="pm-live-header-safety-dot" class="pm-status-dot danger" style="width: 8px; height: 8px; margin: 0;"></span>
                                <span id="pm-live-header-safety-text" style="font-weight: 700; font-size: 0.75rem; font-family: 'Outfit'; color: var(--pm-danger);">
                                    SHIELD ACTIVE
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="pm-grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));">
                        <!-- Pre-Flight Safety Checklist -->
                        <div class="pm-card" style="grid-column: span 2;">
                            <div class="pm-card-title">
                                <span class="pm-card-title-icon" style="background-color: var(--pm-primary);"></span>
                                Phase 0 Pre-Flight Safety Audits
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
                                <div style="padding: 1rem; background: rgba(0,0,0,0.015); border: 1px solid var(--pm-border-color); border-radius: 12px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                        <span class="pm-metric-label" style="display: flex; align-items: center; gap: 0.5rem;"><span style="font-size:1.1rem">🔒</span> Database Locks</span>
                                        <span id="pm-audit-db-locks-status" class="pm-status-pill warning">Checking...</span>
                                    </div>
                                    <div id="pm-audit-db-locks-message" style="font-size: 0.8rem; color: var(--pm-text-secondary);">Initiating database lock scan...</div>
                                </div>
                                <div style="padding: 1rem; background: rgba(0,0,0,0.015); border: 1px solid var(--pm-border-color); border-radius: 12px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                        <span class="pm-metric-label" style="display: flex; align-items: center; gap: 0.5rem;"><span style="font-size:1.1rem">💾</span> Staging Disk Quota</span>
                                        <span id="pm-live-disk-status" class="pm-status-pill warning">Checking...</span>
                                    </div>
                                    <div id="pm-live-disk-message" style="font-size: 0.8rem; color: var(--pm-text-secondary);">Querying host partition space...</div>
                                </div>
                                <div style="padding: 1rem; background: rgba(0,0,0,0.015); border: 1px solid var(--pm-border-color); border-radius: 12px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                        <span class="pm-metric-label" style="display: flex; align-items: center; gap: 0.5rem;"><span style="font-size:1.1rem">🧠</span> PHP Runtime Memory Limits</span>
                                        <span id="pm-audit-memory-status" class="pm-status-pill warning">Checking...</span>
                                    </div>
                                    <div id="pm-audit-memory-message" style="font-size: 0.8rem; color: var(--pm-text-secondary);">Auditing PHP memory ceilings...</div>
                                </div>
                                <div style="padding: 1rem; background: rgba(0,0,0,0.015); border: 1px solid var(--pm-border-color); border-radius: 12px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                        <span class="pm-metric-label" style="display: flex; align-items: center; gap: 0.5rem;"><span style="font-size:1.1rem">🛡️</span> Staging File Permissions</span>
                                        <span id="pm-audit-file-permissions-status" class="pm-status-pill warning">Checking...</span>
                                    </div>
                                    <div id="pm-audit-file-permissions-message" style="font-size: 0.8rem; color: var(--pm-text-secondary);">Testing directory permissions...</div>
                                </div>
                            </div>
                        </div>

                        <!-- 1. Safety Governor Real-Time Metrics -->
                        <div class="pm-card">
                            <div class="pm-card-title">
                                <span class="pm-card-title-icon" style="background-color: var(--pm-success);"></span>
                                Governor Real-Time Limits
                            </div>
                            
                            <div class="pm-metric-row">
                                <span class="pm-metric-label">Cgroup Load State</span>
                                <span class="pm-metric-value" id="pm-live-load-state" style="color: var(--pm-primary); font-weight: 700;">LOW</span>
                            </div>
                            <div class="pm-metric-row">
                                <span class="pm-metric-label">Cgroup Calculated CPU</span>
                                <span class="pm-metric-value" id="pm-live-cpu-load" style="color: var(--pm-primary); font-weight: 600;">10.00%</span>
                            </div>
                            <div class="pm-metric-row">
                                <span class="pm-metric-label">Dynamic Chunk Batch</span>
                                <span class="pm-metric-value" id="pm-live-chunk-size" style="color: var(--pm-success);">10000 rows</span>
                            </div>
                            <div class="pm-metric-row">
                                <span class="pm-metric-label">Micro-sleep Delay</span>
                                <span class="pm-metric-value" id="pm-live-sleep-delay" style="color: var(--pm-warning);">0 ms</span>
                            </div>
                            <div class="pm-metric-row">
                                <span class="pm-metric-label">Active Memory Footprint</span>
                                <span class="pm-metric-value" id="pm-live-memory-usage" style="color: var(--pm-primary-light);">0.00 MB</span>
                            </div>
                            <div class="pm-metric-row">
                                <span class="pm-metric-label">Sandbox Rollback State</span>
                                <span class="pm-metric-value" id="pm-live-probe-status-text" style="color: var(--pm-danger); font-weight: 700;">PROBE FAILED</span>
                            </div>
                        </div>

                        <!-- 2. Server Profiling & Hardware Ceilings -->
                        <div class="pm-card">
                            <div class="pm-card-title">
                                <span class="pm-card-title-icon" style="background-color: var(--pm-warning);"></span>
                                Hardware & Engine Specs
                            </div>
                            
                            <div class="pm-metric-row">
                                <span class="pm-metric-label">Allocated CPU Power</span>
                                <span id="pm-live-cpu-speed" class="pm-metric-value" style="color: var(--pm-success); font-weight: 700;">9.6 GHz</span>
                            </div>
                            <div class="pm-metric-row">
                                <span class="pm-metric-label">Virtual Core Limit</span>
                                <span id="pm-live-cores" class="pm-metric-value" style="color: var(--pm-warning); font-weight: 600;">1 Cores</span>
                            </div>
                            <div class="pm-metric-row">
                                <span class="pm-metric-label">Max DB Connections</span>
                                <span id="pm-live-db-max-connections" class="pm-metric-value" style="color: var(--pm-primary);">151</span>
                            </div>
                            <div class="pm-metric-row">
                                <span class="pm-metric-label">Memory Safety Floor</span>
                                <span id="pm-live-memory-floor" class="pm-metric-value" style="color: var(--pm-pink);">128.00 MB</span>
                            </div>
                            <div class="pm-metric-row">
                                <span class="pm-metric-label">PrestaShop Core</span>
                                <span id="pm-live-ps-version" class="pm-metric-value" style="color: var(--pm-text-secondary);">1.0.0</span>
                            </div>
                            <div class="pm-metric-row">
                                <span class="pm-metric-label">MySQL Version</span>
                                <span id="pm-live-mysql-version" class="pm-metric-value" style="color: var(--pm-text-secondary);">Unknown</span>
                            </div>
                        </div>
                    </div>

                    <!-- PHP.ini Runtime Configuration Accordions -->
                    <div class="pm-card" style="margin-top: 1.5rem;">
                        <div class="pm-card-title">
                            <span class="pm-card-title-icon" style="background-color: var(--pm-purple);"></span>
                            PHP Runtime Environment Limits (php.ini)
                        </div>
                        <p style="font-size: 0.85rem; color: var(--pm-text-secondary); margin-bottom: 1.25rem;">
                            Click to inspect the PHP runtime bounds enforced by the shared host partition.
                        </p>
                        
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
                            <!-- Column 1 -->
                            <div style="background: rgba(0,0,0,0.015); border: 1px solid var(--pm-border-color); border-radius: 12px; padding: 1.25rem;">
                                <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 1rem; color: var(--pm-text-primary); display: flex; align-items: center; gap: 0.5rem;">
                                    ⏱️ Execution Limits
                                </div>
                                <div class="pm-metric-row" style="padding: 0.5rem 0;">
                                    <span class="pm-metric-label">max_execution_time</span>
                                    <span id="pm-ini-max-execution-time" class="pm-metric-value">0s</span>
                                </div>
                                <div class="pm-metric-row" style="padding: 0.5rem 0;">
                                    <span class="pm-metric-label">max_input_time</span>
                                    <span id="pm-ini-max-input-time" class="pm-metric-value">0s</span>
                                </div>
                                <div class="pm-metric-row" style="padding: 0.5rem 0; border: none;">
                                    <span class="pm-metric-label">default_socket_timeout</span>
                                    <span id="pm-ini-default-socket-timeout" class="pm-metric-value">0s</span>
                                </div>
                            </div>
                            
                            <!-- Column 2 -->
                            <div style="background: rgba(0,0,0,0.015); border: 1px solid var(--pm-border-color); border-radius: 12px; padding: 1.25rem;">
                                <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 1rem; color: var(--pm-text-primary); display: flex; align-items: center; gap: 0.5rem;">
                                    📤 Uploads & Data Sizes
                                </div>
                                <div class="pm-metric-row" style="padding: 0.5rem 0;">
                                    <span class="pm-metric-label">upload_max_filesize</span>
                                    <span id="pm-ini-upload-max-filesize" class="pm-metric-value">0M</span>
                                </div>
                                <div class="pm-metric-row" style="padding: 0.5rem 0;">
                                    <span class="pm-metric-label">post_max_size</span>
                                    <span id="pm-ini-post-max-size" class="pm-metric-value">0M</span>
                                </div>
                                <div class="pm-metric-row" style="padding: 0.5rem 0; border: none;">
                                    <span class="pm-metric-label">memory_limit</span>
                                    <span id="pm-ini-memory-limit" class="pm-metric-value">0M</span>
                                </div>
                            </div>

                            <!-- Column 3 -->
                            <div style="background: rgba(0,0,0,0.015); border: 1px solid var(--pm-border-color); border-radius: 12px; padding: 1.25rem;">
                                <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 1rem; color: var(--pm-text-primary); display: flex; align-items: center; gap: 0.5rem;">
                                    🔒 Security & Session
                                </div>
                                <div class="pm-metric-row" style="padding: 0.5rem 0;">
                                    <span class="pm-metric-label">PHP Version</span>
                                    <span id="pm-live-php-version" class="pm-metric-value">Unknown</span>
                                </div>
                                <div class="pm-metric-row" style="padding: 0.5rem 0;">
                                    <span class="pm-metric-label">OpCache Status</span>
                                    <span id="pm-live-opcache-status" class="pm-metric-value" style="color: var(--pm-warning);">DISABLED</span>
                                </div>
                                <div class="pm-metric-row" style="padding: 0.5rem 0; border: none;">
                                    <span class="pm-metric-label">session.gc_maxlifetime</span>
                                    <span id="pm-ini-session-gc-maxlifetime" class="pm-metric-value">0s</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
<div class="pm-tab-content" id="pm-content-settings">
    <!-- Sub-navigation pills for Settings -->
    <div class="pm-sub-tabs" style="margin-bottom: 1.5rem;">
        <button type="button" class="pm-settings-tab-btn pm-sub-tab-btn active" data-sub-tab="pm-settings-pane-general">⚙️ General Settings</button>
        <button type="button" class="pm-settings-tab-btn pm-sub-tab-btn" data-sub-tab="pm-settings-pane-info">📖 Documentation & Info</button>
        <button type="button" class="pm-settings-tab-btn pm-sub-tab-btn" data-sub-tab="pm-settings-pane-security">🛡️ Security & Health</button>
    </div>

    <!-- Inner Sub-panel 1: General Settings -->
    <div class="pm-settings-tab-content" id="pm-settings-pane-general">
        <div class="pm-section-header">
            <h2 class="pm-h2">Global Settings</h2>
            <p class="pm-text-muted">Configure the Mass Utility platform to match your server environment.</p>
        </div>

    <!-- Activation Section -->
    <div id="pm-pro-card" class="pm-card pm-mb-6" style="border: 1px solid var(--pm-border-color);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <div class="pm-card-title" style="margin-bottom: 0;">
                <span id="pm-pro-icon" class="pm-card-title-icon" style="background-color: var(--pm-success);"></span>
                ⭐️ License Subscription Details
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
                <div id="pm-pro-badge-active" style="display: flex; padding: 0.4rem 0.8rem; background: rgba(16, 185, 129, 0.1); color: var(--pm-success); font-weight: 700; border-radius: 8px; font-size: 0.85rem;">
                    Active License
                </div>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; border-top: 1px solid var(--pm-border-color); padding-top: 1.25rem;">
            <!-- Key Info -->
            <div>
                <label class="pm-font-semibold pm-text-xs pm-mb-1" style="display: block; color: var(--pm-text-secondary);">License Subscription Key</label>
                <div id="pm-license-display-key" style="font-family: monospace; font-size: 1.1rem; font-weight: 700; color: var(--pm-warning); padding: 0.5rem 0;">MASS-••••-••••-••••</div>
                
                <label class="pm-font-semibold pm-text-xs pm-mb-1" style="display: block; color: var(--pm-text-secondary); margin-top: 1rem;">Subscription Package Tier</label>
                <div id="pm-license-display-tier" style="font-size: 1rem; font-weight: 700; color: var(--pm-primary); padding: 0.25rem 0; text-transform: uppercase;">PRO TIER</div>
            </div>

            <!-- Features Checklist -->
            <div style="border-left: 1px solid var(--pm-border-color); padding-left: 1.5rem;">
                <label class="pm-font-semibold pm-text-xs pm-mb-2" style="display: block; color: var(--pm-text-secondary);">Active Feature Capabilities</label>
                <ul id="pm-license-features-checklist" style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.85rem; color: var(--pm-text-primary);">
                    <!-- Populated dynamically via JS -->
                </ul>
            </div>
        </div>
    </div>

    <!-- GOOGLE DRIVE OFFSITE REDUNDANCY CARD -->
    <div class="pm-card pm-mb-6" id="pm-gdrive-card">
        <div class="pm-card-title pm-flex-between pm-flex-wrap pm-gap-2">
            <div class="pm-flex-center pm-gap-2">
                <span class="pm-card-title-icon" style="background-color: var(--pm-purple);"></span>
                ☁️ Google Drive Offsite Redundancy
            </div>
            <span id="pm-gdrive-badge" class="pm-status-pill" style="font-size: 0.65rem; padding: 0.2rem 0.6rem; font-weight: 700;">
                Checking...
            </span>
        </div>
        <p class="pm-text-sm pm-text-muted pm-mb-4" style="line-height: 1.45;">
            Configure Google Drive integration to sync site and database backups directly to the cloud. High-performance, chunk-streamed uploads avoid shared hosting memory limits.
        </p>

        <!-- Default Download Source -->
        <div style="margin-bottom: 1rem; border-top: 1px solid var(--pm-border-color); padding-top: 1rem;">
            <label class="pm-font-semibold pm-text-xs pm-mb-1" style="display: block; color: var(--pm-text-primary);">Default Download Source</label>
            <select id="pm-setting-gdrive-default-download" class="pm-form-control" style="width: 100%; font-size: 0.8rem; padding: 0.4rem 0.6rem; max-width: 300px;">
                <option value="cloud">Cloud (Google Drive)</option>
                <option value="local">Local Filesystem</option>
            </select>
            <p class="pm-text-muted" style="font-size: 0.75rem; margin-top: 0.25rem;">If a backup exists in both places, which one should be downloaded when you click "Download"? (It will automatically fallback if one is deleted).</p>
        </div>

        <!-- Automated Backups Staging Cleanup -->
        <div style="margin-bottom: 1rem; border-top: 1px solid var(--pm-border-color); padding-top: 1rem;">
            <label class="pm-font-semibold pm-text-xs pm-mb-1" style="display: block; color: var(--pm-text-primary);">Automated Backup Staging Cleanup</label>
            <select id="pm-setting-cleanup-backups" class="pm-form-control" style="width: 100%; font-size: 0.8rem; padding: 0.4rem 0.6rem; max-width: 300px;">
                <option value="1">Enabled (Delete local staging files > 24 hours)</option>
                <option value="0">Disabled (Retain all local files indefinitely)</option>
            </select>
            <p class="pm-text-muted" style="font-size: 0.75rem; margin-top: 0.25rem;">Cleans up local temporary backup files (.tar, .sql.gz, and .log) created during the offsite cloud backup staging process to prevent shared hosting quota exhaustion.</p>
        </div>

        <!-- Connection Control Panel -->
        <div id="pm-gdrive-control-panel" style="display: none; background: rgba(var(--pm-purple-rgb), 0.03); border: 1px dashed rgba(var(--pm-purple-rgb), 0.2); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <strong style="color: var(--pm-text-primary); font-size: 0.85rem; display: block;" id="pm-gdrive-conn-status">Checking connection status...</strong>
                    <span style="font-size: 0.75rem; color: var(--pm-text-secondary);" id="pm-gdrive-conn-details">Please authenticate the application with Google.</span>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button type="button" class="pm-btn pm-btn-purple pm-text-xs" id="pm-btn-connect-gdrive" style="padding: 0.45rem 1rem;">
                        ⚡ Authenticate & Connect
                    </button>
                    <button type="button" class="pm-btn pm-btn-danger pm-text-xs" id="pm-btn-disconnect-gdrive" style="padding: 0.45rem 1rem; display: none;">
                        🔌 Disconnect Account
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- UI & Appearance -->
    <div class="pm-card pm-mb-6">
        <div class="pm-card-title" style="margin-bottom: 0.5rem; color: var(--pm-primary);">
            <span class="pm-card-title-icon" style="background-color: var(--pm-primary);"></span>
            🎨 UI & Appearance
        </div>
        <p class="pm-text-muted" style="margin-bottom: 1.5rem; font-size: 0.9rem;">Customize the look and feel of your workspace.</p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
            <div>
                <label class="pm-font-semibold pm-mb-2" style="display: block; color: var(--pm-text-primary);">Base Typography</label>
                <select id="pm-setting-ui-font" class="pm-form-control" style="width: 100%;">
                    <option value="system-ui, -apple-system, sans-serif">System Native (Fastest, Default)</option>
                    <option value="Inter, sans-serif">Inter (Apple-like)</option>
                    <option value="Outfit, sans-serif">Outfit (Modern, Geometric)</option>
                    <option value="Roboto, sans-serif">Roboto (Android-like)</option>
                </select>
            </div>
            <div>
                <label class="pm-font-semibold pm-mb-2" style="display: block; color: var(--pm-text-primary);">Dashboard UI Theme</label>
                <select id="pm-setting-ui-theme" class="pm-form-control" style="width: 100%;">
                    <option value="classic">Classic Obsidian (Default)</option>
                </select>
            </div>
        </div>
    </div>
    <div class="pm-card pm-mb-6">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--pm-border-color);">
            <div>
                <div class="pm-card-title" style="margin-bottom: 0.25rem; color: var(--pm-primary);">
                    <span class="pm-card-title-icon" style="background-color: var(--pm-primary);"></span>
                    Engine Performance Mode
                </div>
                <p class="pm-text-muted pm-m-0" style="font-size: 0.9rem;">Controls the CPU governor. Automatically throttles SQL queries and TAR archive streaming based on real-time server load.</p>
            </div>
            <div class="pm-flex pm-rounded-md pm-text-sm pm-font-semibold" style="position: relative; background: var(--pm-input-bg); border: 1px solid var(--pm-border-color); padding: 0.25rem; display: flex; width: 350px;">
                <div id="pm-gov-slider" style="position: absolute; top: 0.25rem; bottom: 0.25rem; left: 0.25rem; width: calc(50% - 0.25rem); background: rgba(var(--pm-primary-rgb), 0.1); border-radius: 6px; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); pointer-events: none;"></div>
                
                <label id="pm-lbl-gov-auto" style="cursor: pointer; position: relative; z-index: 1; flex: 1; padding: 0.4rem 0; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 0.4rem; transition: color 0.3s; color: var(--pm-text-primary); margin: 0;">
                    <input type="radio" name="pm_governor_mode" value="auto" checked style="display: none;">
                    🤖 Auto-Pilot <span style="font-size: 0.75rem; background: var(--pm-warning); color: #fff; padding: 2px 6px; border-radius: 4px; margin-left: 4px;">PRO</span>
                </label>
                <label id="pm-lbl-gov-manual" style="cursor: pointer; position: relative; z-index: 1; flex: 1; padding: 0.4rem 0; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 0.4rem; transition: color 0.3s; color: var(--pm-text-secondary); margin: 0;">
                    <input type="radio" name="pm_governor_mode" value="manual" style="display: none;">
                    ⚙️ Manual Overrides
                </label>
            </div>
        </div>

        <div style="position: relative;">
            <div id="pm-manual-overrides-lock" style="position: absolute; top: -10px; left: -10px; right: -10px; bottom: -10px; background: rgba(128, 128, 128, 0.1); backdrop-filter: blur(3px); z-index: 10; display: flex; justify-content: center; align-items: center; border-radius: 12px;">
                <div class="pm-rounded-full pm-text-sm pm-flex-center pm-gap-2" style="background: var(--pm-card-bg); padding: 0.6rem 1.2rem; border: 1px solid var(--pm-border-color); color: var(--pm-text-primary); box-shadow: 0 8px 16px rgba(0,0,0,0.15); font-weight: 500;">
                    <span style="font-size: 1rem;">🔒</span> Currently managed by 🤖 Auto-Pilot (Smart). You can change this from the toggle above.
                </div>
            </div>

            <div id="pm-manual-overrides-container" style="transition: opacity 0.3s; display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                <!-- File Backup Overrides -->
                <div class="pm-rounded-md" style="background: var(--pm-input-bg); padding: 1.2rem; border: 1px solid var(--pm-border-color);">
                    <label class="pm-font-semibold pm-mb-2" style="display: block; color: var(--pm-text-primary);">TAR Streaming Append Threshold (MB)</label>
                    <select id="pm-setting-file-chunk" class="pm-form-control pm-mb-2" style="width: 100%;">
                        <option value="10">10 MB (Ultra Safe - Shared Hosting)</option>
                        <option value="20">20 MB (Safe - Shared Hosting)</option>
                        <option value="30">30 MB (Standard - cPanel)</option>
                        <option value="40">40 MB (Standard - cPanel)</option>
                        <option value="60">60 MB (Fast - VPS)</option>
                        <option value="120">120 MB (Extreme - Dedicated Server)</option>
                    </select>
                    <div id="pm-warning-file-chunk" style="color: var(--pm-danger); font-size: 0.75rem; margin-bottom: 1rem; display: none; padding-left: 4px;"></div>


                </div>

                <!-- Database Backup Overrides -->
                <div class="pm-rounded-md" style="background: var(--pm-input-bg); padding: 1.2rem; border: 1px solid var(--pm-border-color);">
                    <label class="pm-font-semibold pm-mb-2" style="display: block; color: var(--pm-text-primary);">Database Backup Row Chunk</label>
                    <p class="pm-text-muted" style="font-size: 0.8rem; margin-bottom: 0.5rem;">How many rows to fetch per query during backups.</p>
                    <select id="pm-setting-db-chunk" class="pm-form-control" style="width: 100%; margin-bottom: 0.5rem;">
                        <option value="250">250 Rows (Ultra Safe)</option>
                        <option value="500">500 Rows (Ultra Safe)</option>
                        <option value="1000">1,000 Rows (Safe)</option>
                        <option value="2500">2,500 Rows</option>
                        <option value="5000">5,000 Rows (Standard)</option>
                        <option value="10000">10,000 Rows (Fast)</option>
                        <option value="20000">20,000 Rows (Extreme)</option>
                    </select>
                    <div id="pm-warning-db-chunk" style="color: var(--pm-danger); font-size: 0.75rem; margin-bottom: 1rem; display: none; padding-left: 4px;"></div>
                </div>
            </div>
        </div>
    </div>


    <!-- Safety Guards & Server Overrides -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
        <div class="pm-card pm-h-full">
            <div class="pm-card-title" style="margin-bottom: 0.5rem; color: var(--pm-success);">
                <span class="pm-card-title-icon" style="background-color: var(--pm-success);"></span>
                🛡️ Safety Guards
            </div>
            <p class="pm-text-muted" style="margin-bottom: 1rem; font-size: 0.9rem;">
                Protect your database against accidental mass updates by forcing queries to simulate execution before going live.
            </p>
            
            <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer; margin-bottom: 0.75rem;">
                <input type="checkbox" id="pm-setting-default-dry-run" style="width: 1.2rem; height: 1.2rem;">
                <span style="font-weight: 500; color: var(--pm-text-primary);">Enforce "Dry Run (Simulate)" By Default</span>
            </label>

            <div style="padding: 0.75rem; background: rgba(16, 185, 129, 0.1); border-left: 3px solid var(--pm-success); border-radius: 4px; margin-bottom: 0.75rem;">
                <h4 style="margin: 0 0 0.25rem 0; font-size: 0.85rem; color: var(--pm-success);">What does Simulation Mode do?</h4>
                <p style="margin: 0; font-size: 0.8rem; color: var(--pm-text-secondary); line-height: 1.4;">
                    It compiles your visual blocks into SQL and performs a strict <strong>read-only</strong> validation. It returns the exact rows that <i>would</i> be affected, allowing you to audit the exact impact (e.g., verifying that exactly 15 products are targeted) before actually committing the physical database mutation.
                </p>
            </div>

            <div style="padding: 0.75rem; background: rgba(59, 130, 246, 0.1); border-left: 3px solid var(--pm-primary); border-radius: 4px;">
                <h4 style="margin: 0 0 0.25rem 0; font-size: 0.85rem; color: var(--pm-primary);">When should I use this?</h4>
                <p style="margin: 0; font-size: 0.8rem; color: var(--pm-text-secondary); line-height: 1.4;">
                    Keep this enabled at all times. It acts as a mandatory checkpoint, forcing you to manually uncheck the toggle per-query to commit actual changes, providing a critical physical safeguard.
                </p>
            </div>
        </div>

        <div class="pm-card pm-h-full">
            <div class="pm-card-title" style="margin-bottom: 0.5rem; color: var(--pm-danger);">
                <span class="pm-card-title-icon" style="background-color: var(--pm-danger);"></span>
                ⚙️ Server Environment Fallbacks
            </div>
            <p class="pm-text-muted" style="margin-bottom: 1rem; font-size: 0.9rem;">Only use these if the dashboard fails to auto-detect your hosting limits.</p>

            <label class="pm-font-semibold pm-mb-2" style="display: block; color: var(--pm-text-primary);">Override cPanel Disk Quota (GB)</label>
            <p class="pm-text-muted" style="font-size: 0.8rem; margin-bottom: 0.5rem;">If your host disables UAPI access, enter your strict cPanel SSD limit here (e.g. 20) to fix the Staging metrics. Enter 0 for Auto.</p>
            <input type="number" id="pm-setting-custom-quota" class="pm-form-control" placeholder="0" min="0" step="0.5" style="width: 100%;">
        </div>
    </div>

    <!-- Backup Retention & Automations -->
    <div class="pm-card pm-mb-6">
        <div class="pm-card-title" style="margin-bottom: 0.5rem; color: var(--pm-warning);">
            <span class="pm-card-title-icon" style="background-color: var(--pm-warning);"></span>
            🕒 Backup Retention & Scheduled Automations
        </div>
        <p class="pm-text-muted" style="margin-bottom: 1.25rem; font-size: 0.9rem;">Configure automatic pruning policies and scheduled crons execution limits.</p>

        <!-- Dual-Tier Retention Configuration Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.25rem;">
            <!-- Local Storage Limits -->
            <div style="padding: 1rem; border: 1px dashed var(--pm-border-color); border-radius: 6px;">
                <h4 style="font-size: 0.9rem; font-weight: 600; color: var(--pm-text-primary); margin-bottom: 0.75rem;">💾 Local Retention (Host Server)</h4>
                <div style="margin-bottom: 0.75rem;">
                    <label class="pm-font-semibold pm-mb-1" style="display: block; color: var(--pm-text-secondary); font-size: 0.8rem;">Max Local Backups to Keep</label>
                    <input type="number" id="pm-setting-backup-max-count" class="pm-form-control" min="0" placeholder="0 for Infinite backups" style="width: 100%;">
                    <p class="pm-text-muted" style="font-size: 0.7rem; margin-top: 0.25rem;">Set to 0 for infinite local retention (never prune).</p>
                </div>
                <div>
                    <label class="pm-font-semibold pm-mb-1" style="display: block; color: var(--pm-text-secondary); font-size: 0.8rem;">Max Local Age (Days)</label>
                    <input type="number" id="pm-setting-backup-max-days" class="pm-form-control" min="0" placeholder="0 for Infinite retention" style="width: 100%;">
                    <p class="pm-text-muted" style="font-size: 0.7rem; margin-top: 0.25rem;">Set to 0 to keep backups regardless of age.</p>
                </div>
            </div>
            <!-- Cloud Storage Limits -->
            <div style="padding: 1rem; border: 1px dashed var(--pm-border-color); border-radius: 6px;">
                <h4 style="font-size: 0.9rem; font-weight: 600; color: var(--pm-warning); margin-bottom: 0.75rem;">☁️ Cloud Retention (Google Drive)</h4>
                <div style="margin-bottom: 0.75rem;">
                    <label class="pm-font-semibold pm-mb-1" style="display: block; color: var(--pm-text-secondary); font-size: 0.8rem;">Max Cloud Backups to Keep</label>
                    <input type="number" id="pm-setting-backup-cloud-max-count" class="pm-form-control" min="0" placeholder="0 for Infinite backups" style="width: 100%;">
                    <p class="pm-text-muted" style="font-size: 0.7rem; margin-top: 0.25rem;">Set to 0 for infinite cloud retention.</p>
                </div>
                <div>
                    <label class="pm-font-semibold pm-mb-1" style="display: block; color: var(--pm-text-secondary); font-size: 0.8rem;">Max Cloud Age (Days)</label>
                    <input type="number" id="pm-setting-backup-cloud-max-days" class="pm-form-control" min="0" placeholder="0 for Infinite retention" style="width: 100%;">
                    <p class="pm-text-muted" style="font-size: 0.7rem; margin-top: 0.25rem;">Set to 0 to ignore cloud backup age limits.</p>
                </div>
            </div>
        </div>

        <!-- Backup Frequency Selection -->
        <div style="padding-top: 1.25rem; border-top: 1px solid var(--pm-border-color); margin-bottom: 1.25rem;">
            <label class="pm-font-semibold pm-mb-1" style="display: block; color: var(--pm-text-primary);">Backup Frequency Throttle</label>
            <select id="pm-setting-backup-frequency" class="pm-form-control" style="width: 100%;">
                <option value="0">No Throttling (Always execute backup when triggered)</option>
                <option value="3600">Hourly (Minimum 1 hour between backups)</option>
                <option value="86400">Daily (Minimum 24 hours between backups)</option>
                <option value="604800">Weekly (Minimum 7 days between backups)</option>
                <option value="2592000">Monthly (Minimum 30 days between backups)</option>
            </select>
            <p class="pm-text-muted" style="font-size: 0.75rem; margin-top: 0.25rem;">
                Avoids resource spikes on shared hosting. Scheduled runs of <code>cli_backup.php</code> will exit early if the time since the last successful backup is less than the minimum interval.
            </p>
        </div>

        <div style="padding-top: 1.25rem; border-top: 1px solid var(--pm-border-color);">
            <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer;">
                <input type="checkbox" id="pm-setting-backup-cron-auto" style="width: 1.2rem; height: 1.2rem;">
                <span style="font-weight: 500; color: var(--pm-text-primary);">Enable Scheduled Background Backups (via Cron CLI)</span>
            </label>
            <p class="pm-text-muted" style="font-size: 0.8rem; margin-top: 0.25rem; padding-left: 2rem; margin-bottom: 0;">
                If disabled, automated crontab execution calls of cli_backup.php will exit early. Manual backups triggered via Web GUI will remain functional.
            </p>
        </div>
    </div>

    <!-- Save Button -->
    <div style="display: flex; justify-content: flex-end; margin-top: 2rem;">
        <button type="button" id="pm-btn-save-settings" class="pm-btn pm-btn-success" style="font-size: 1.1rem; padding: 0.75rem 2rem;">
            💾 Save Global Settings
        </button>
    </div>
</div>

<!-- Inner Sub-panel 2: Documentation & Info -->
<div class="pm-settings-tab-content" id="pm-settings-pane-info" style="display: none;">
    <div class="pm-section-header">
        <h2 class="pm-h2">Module Documentation & Manual</h2>
        <p class="pm-text-muted">In-depth guide on the Mass Utility module's architecture and procedural operations.</p>
    </div>

    <div class="pm-card pm-mb-6">
        <div class="pm-card-title" style="margin-bottom: 1.5rem; color: var(--pm-primary);">
            <span class="pm-card-title-icon" style="background-color: var(--pm-primary);"></span>
            1. Core Architectural Pipeline Guide
        </div>

        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
            <!-- Simulation Mode -->
            <div style="border-bottom: 1px solid var(--pm-border-color); padding-bottom: 1rem;">
                <h4 style="color: var(--pm-text-primary); margin-bottom: 0.5rem; font-size: 0.95rem; font-weight: 600;">⚙️ Simulation Mode (Dry Run) Process</h4>
                <ol style="color: var(--pm-text-secondary); line-height: 1.5; padding-left: 1.2rem; margin: 0;">
                    <li><strong>AST Compilation:</strong> Translates visual rules builder JSON payload into an Abstract Syntax Tree structure.</li>
                    <li><strong>Query Isolation:</strong> Compiles AST rule groups into a read-only MySQL <code>SELECT</code> query instead of a destructive write statement.</li>
                    <li><strong>Pre-flight Audit:</strong> Returns affected target row counts and metadata, rendering changes visually without committing real mutations.</li>
                </ol>
            </div>

            <!-- Database Backups -->
            <div style="border-bottom: 1px solid var(--pm-border-color); padding-bottom: 1rem;">
                <h4 style="color: var(--pm-text-primary); margin-bottom: 0.5rem; font-size: 0.95rem; font-weight: 600;">🗄️ Database Backups & Table Drift Detection</h4>
                <ol style="color: var(--pm-text-secondary); line-height: 1.5; padding-left: 1.2rem; margin: 0;">
                    <li><strong>Schema Mapping:</strong> Groups MySQL tables into Core, Catalog, and Sales categories dynamically.</li>
                    <li><strong>Chunked Dump:</strong> Iterates target tables using <code>SELECT * LIMIT [size] OFFSET [x]</code> streaming straight into a <code>gzwrite</code> file buffer, keeping memory below 2MB.</li>
                    <li><strong>Drift Analysis:</strong> The frontend computes a diff between the loaded preset's table configurations and the database's actual schema, throwing a visual warning if newly created tables are detected.</li>
                </ol>
            </div>

            <!-- InnoDB Defragmenter -->
            <div style="border-bottom: 1px solid var(--pm-border-color); padding-bottom: 1rem;">
                <h4 style="color: var(--pm-text-primary); margin-bottom: 0.5rem; font-size: 0.95rem; font-weight: 600;">📈 InnoDB Optimizer & Defragmentation</h4>
                <ol style="color: var(--pm-text-secondary); line-height: 1.5; padding-left: 1.2rem; margin: 0;">
                    <li><strong>Fragmentation Profiling:</strong> Queries target tables dynamically using <code>INFORMATION_SCHEMA</code> space metrics to detect fragmentation levels and data overhead.</li>
                    <li><strong>Index Rebuilding:</strong> Runs safe, non-destructive table optimization commands (e.g. <code>OPTIMIZE TABLE</code>) table-by-table.</li>
                    <li><strong>SSD Reclamation:</strong> Reclaims unused disk pages and fragmented indexes, releasing unused storage space back to host OS SSD boundaries.</li>
                </ol>
            </div>

            <!-- File Tools -->
            <div style="border-bottom: 1px solid var(--pm-border-color); padding-bottom: 1rem;">
                <h4 style="color: var(--pm-text-primary); margin-bottom: 0.5rem; font-size: 0.95rem; font-weight: 600;">📁 File Tools: Streaming TAR/GZIP Archival</h4>
                <ol style="color: var(--pm-text-secondary); line-height: 1.5; padding-left: 1.2rem; margin: 0;">
                    <li><strong>Exclusions Scan:</strong> Parses folder tree selections and stores unchecked paths as exclusions inside settings.</li>
                    <li><strong>CLI Streaming:</strong> Spawns an external native shell process (<code>tar</code> CLI via <code>proc_open</code>) to stream file compression.</li>
                    <li><strong>Checksum Validation:</strong> Automatically calculates and writes a SHA256 checksum in a parallel sidecar file on completion.</li>
                </ol>
            </div>

            <!-- Google Drive Cloud Sync -->
            <div style="border-bottom: 1px solid var(--pm-border-color); padding-bottom: 1rem;">
                <h4 style="color: var(--pm-text-primary); margin-bottom: 0.5rem; font-size: 0.95rem; font-weight: 600;">☁️ Google Drive Cloud Sync & Streaming Restore</h4>
                <ol style="color: var(--pm-text-secondary); line-height: 1.5; padding-left: 1.2rem; margin: 0;">
                    <li><strong>Resumable Session:</strong> Initiates a Google Drive resumable upload session endpoint.</li>
                    <li><strong>Chunked Streaming:</strong> Uploads binary backup packets in 5MB chunks directly to cloud servers, bypassing local memory limits.</li>
                    <li><strong>SSE Cloud Restore:</strong> Streams bytes from Google Cloud via curl callbacks directly into local storage files, monitoring download progress via Server-Sent Events.</li>
                </ol>
            </div>

            <!-- Query & Mutate -->
            <div style="border-bottom: 1px solid var(--pm-border-color); padding-bottom: 1rem;">
                <h4 style="color: var(--pm-text-primary); margin-bottom: 0.5rem; font-size: 0.95rem; font-weight: 600;">⚡ Query & Mutate Deadlock Shield</h4>
                <ol style="color: var(--pm-text-secondary); line-height: 1.5; padding-left: 1.2rem; margin: 0;">
                    <li><strong>Query Fetching:</strong> Compiles and queries index-only primary key IDs of targeted products.</li>
                    <li><strong>Numeric Sorting:</strong> Sorts target IDs in ascending numerical order (e.g. <code>[5, 10, 15]</code>) to enforce deterministic InnoDB row locking.</li>
                    <li><strong>Lock Shield:</strong> Acquires row locks and applies mutations sequentially, preventing cross-thread database deadlocks.</li>
                </ol>
            </div>

            <!-- History and Rollback -->
            <div style="border-bottom: 1px solid var(--pm-border-color); padding-bottom: 1rem;">
                <h4 style="color: var(--pm-text-primary); margin-bottom: 0.5rem; font-size: 0.95rem; font-weight: 600;">🕒 Mutation History & Reversion Rollbacks</h4>
                <ol style="color: var(--pm-text-secondary); line-height: 1.5; padding-left: 1.2rem; margin: 0;">
                    <li><strong>Pre-Update Snapshot:</strong> Queries and caches all columns of targeted rows in a serialized JSON snapshot.</li>
                    <li><strong>Sandbox Archival:</strong> Records the JSON snapshot to the local SQLite database.</li>
                    <li><strong>Reversion:</strong> When rolling back, parses the JSON state and builds precise targeted <code>UPDATE</code> queries restoring historical values.</li>
                </ol>
            </div>

            <!-- Data Sweeper -->
            <div style="border-bottom: 1px solid var(--pm-border-color); padding-bottom: 1rem;">
                <h4 style="color: var(--pm-text-primary); margin-bottom: 0.5rem; font-size: 0.95rem; font-weight: 600;">🧹 Data Sweeper Cleanup Pipeline</h4>
                <ol style="color: var(--pm-text-secondary); line-height: 1.5; padding-left: 1.2rem; margin: 0;">
                    <li><strong>Bloat Assessment:</strong> Scans tables and reports count metrics of connections, guests, logs, and expired carts.</li>
                    <li><strong>Chunked Deletion:</strong> Runs iterative limits-capped queries (e.g., <code>DELETE LIMIT 500</code>).</li>
                    <li><strong>InnoDB Lock Breathing:</strong> Pauses deletion for 50ms between chunks, allowing other customer transaction threads to execute.</li>
                </ol>
            </div>

            <!-- Ghost Product Image Sweeper -->
            <div style="border-bottom: 1px solid var(--pm-border-color); padding-bottom: 1rem;">
                <h4 style="color: var(--pm-text-primary); margin-bottom: 0.5rem; font-size: 0.95rem; font-weight: 600;">🖼️ Ghost Product Image Sweeper</h4>
                <ol style="color: var(--pm-text-secondary); line-height: 1.5; padding-left: 1.2rem; margin: 0;">
                    <li><strong>Catalog Sync Scan:</strong> Cross-references physical product image subdirectories in PrestaShop <code>/img/p/</code> with DB image references.</li>
                    <li><strong>Orphan Identification:</strong> Identifies unreferenced legacy image files and orphan database connections.</li>
                    <li><strong>Safe Disk Sweeping:</strong> Safely purges physical files and purifies database images records without breaking catalog integrity.</li>
                </ol>
            </div>

            <!-- Backup Retention Rules -->
            <div>
                <h4 style="color: var(--pm-text-primary); margin-bottom: 0.5rem; font-size: 0.95rem; font-weight: 600;">🕒 Automatic Backup Retention & Storage Cleaners</h4>
                <ol style="color: var(--pm-text-secondary); line-height: 1.5; padding-left: 1.2rem; margin: 0;">
                    <li><strong>Policy Verification:</strong> Checks count limits and age policies (maximum age in days) defined in your backup policies.</li>
                    <li><strong>Old File Pruning:</strong> Checks directory archives during database/file backups or CLI cron runs.</li>
                    <li><strong>Automatic Pruning:</strong> Prunes the oldest SQL and TAR archives to automatically keep host storage clean.</li>
                </ol>
            </div>
        </div>
    </div>

    <!-- Troubleshooting Card -->
    <div class="pm-card pm-mb-6">
        <div class="pm-card-title" style="margin-bottom: 1rem; color: var(--pm-danger);">
            <span class="pm-card-title-icon" style="background-color: var(--pm-danger);"></span>
            2. Administrator Troubleshooting
        </div>
        <ul style="color: var(--pm-text-secondary); line-height: 1.6; margin: 0; padding-left: 1.2rem; font-size: 0.95rem;">
            <li><strong>File backup fails:</strong> Lower the <em>TAR Streaming Append Threshold</em> to 10MB or 20MB.</li>
            <li><strong>Database export timeouts:</strong> Reduce the <em>Database Row Chunk</em> to 1000 or 500 rows.</li>
            <li><strong>Cloud Sync setup:</strong> Input Google developer client credentials and ensure the Redirect URI is properly registered in Google Cloud Console.</li>
        </ul>
    </div>

    <!-- Inner Sub-panel 3: Security & Health -->
    <div class="pm-settings-tab-content" id="pm-settings-pane-security" style="display: none;">
        <div class="pm-section-header">
            <h2 class="pm-h2">🛡️ Security & Health Diagnostics</h2>
            <p class="pm-text-muted">Audit the files, permissions, and transport safety of your decoupled monorepo deployment.</p>
        </div>

        <div class="pm-card pm-mb-6">
            <div class="pm-card-title pm-flex-between">
                <div>
                    <span class="pm-card-title-icon" style="background-color: var(--pm-primary);"></span>
                    System Diagnostics Scan
                </div>
                <button type="button" class="pm-btn pm-btn-primary pm-text-xs" id="pm-btn-run-diagnostics">⚡ Run Security Audit</button>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1.5rem;" id="pm-diagnostics-results-container">
                <p class="pm-text-sm pm-text-muted">Click the button above to run security checks on the SaaS server and the PrestaShop Bridge connection.</p>
            </div>
        </div>
    </div>
</div>
</div>

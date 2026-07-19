<div class="pm-tab-content" id="pm-content-settings">
    <!-- Sub-navigation pills for Settings -->
    <div class="pm-sub-tabs" style="margin-bottom: 1.5rem;">
        <button type="button" class="pm-settings-tab-btn pm-sub-tab-btn active" data-sub-tab="pm-settings-pane-general">⚙️ General Settings</button>
        <button type="button" class="pm-settings-tab-btn pm-sub-tab-btn" data-sub-tab="pm-settings-pane-info">📖 Documentation & Info</button>
    </div>

    <!-- Inner Sub-panel 1: General Settings -->
    <div class="pm-settings-tab-content" id="pm-settings-pane-general">
        <div class="pm-section-header">
            <h2 class="pm-h2">Global Settings</h2>
            <p class="pm-text-muted">Configure the Mass Utility platform to match your server environment.</p>
        </div>

    <!-- Activation Section -->
    <div id="pm-pro-card" class="pm-card pm-mb-6" style="border: 1px solid var(--pm-border-color);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <div class="pm-card-title" style="margin-bottom: 0;">
                <span id="pm-pro-icon" class="pm-card-title-icon" style="background-color: var(--pm-warning);"></span>
                ⭐️ Mass Utility Pro Activation
            </div>
            <div id="pm-pro-badge-active" style="display: none; padding: 0.4rem 0.8rem; background: rgba(16, 185, 129, 0.1); color: var(--pm-success); font-weight: 700; border-radius: 8px; font-size: 0.85rem;">
                ✅ Active License
            </div>
            <div id="pm-pro-badge-free" style="display: block; padding: 0.4rem 0.8rem; background: rgba(245, 158, 11, 0.1); color: var(--pm-warning); font-weight: 700; border-radius: 8px; font-size: 0.85rem;">
                🔒 Free Version
            </div>
        </div>
        <p class="pm-text-muted" style="margin-bottom: 1.5rem;">Enter your Pro license key to unlock the Mass Query Engine, File Backup Tools, and Automated Maintenance Sweepers.</p>
        
        <div style="display: flex; gap: 1rem; align-items: center;">
            <input type="text" id="pm-pro-license-key" placeholder="Enter license key (e.g. 3010)" style="flex: 1; padding: 0.75rem; border: 1px solid var(--pm-border-color); border-radius: 8px; background: var(--pm-input-bg); color: var(--pm-text-primary); font-family: monospace; font-size: 1.1rem;">
            <button type="button" class="pm-btn" id="pm-btn-activate-pro" style="background-color: var(--pm-warning); color: var(--pm-white); padding: 0.75rem 2rem; font-weight: bold;">Unlock Now</button>
            <button type="button" class="pm-btn" id="pm-btn-remove-license" style="display: none; background-color: var(--pm-danger); color: var(--pm-white); padding: 0.75rem 2rem; font-weight: bold;">Remove License</button>
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

    <!-- Modularity & Appearance -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
        <!-- UI & Fonts -->
        <div class="pm-card pm-h-full">
            <div class="pm-card-title" style="margin-bottom: 0.5rem; color: var(--pm-primary);">
                <span class="pm-card-title-icon" style="background-color: var(--pm-primary);"></span>
                🎨 UI & Appearance
            </div>
            <p class="pm-text-muted" style="margin-bottom: 1rem; font-size: 0.9rem;">Customize the look and feel of your workspace.</p>
            
            <label class="pm-font-semibold pm-mb-2" style="display: block; color: var(--pm-text-primary);">Base Typography</label>
            <select id="pm-setting-ui-font" class="pm-form-control pm-mb-4" style="width: 100%;">
                <option value="system-ui, -apple-system, sans-serif">System Native (Fastest, Default)</option>
                <option value="Inter, sans-serif">Inter (Apple-like)</option>
                <option value="Outfit, sans-serif">Outfit (Modern, Geometric)</option>
                <option value="Roboto, sans-serif">Roboto (Android-like)</option>
            </select>

            <label class="pm-font-semibold pm-mb-2" style="display: block; color: var(--pm-text-primary);">Dashboard UI Theme</label>
            <select id="pm-setting-ui-theme" class="pm-form-control pm-mb-2" style="width: 100%;">
                <option value="classic">Classic Obsidian (Default)</option>
                <option value="tabler">Modern Tabler</option>
            </select>
        </div>

        <!-- Modularity Toggles -->
        <div class="pm-card pm-h-full">
            <div class="pm-card-title" style="margin-bottom: 0.5rem; color: var(--pm-info);">
                <span class="pm-card-title-icon" style="background-color: var(--pm-info);"></span>
                🧩 Modularity & UI Toggles
            </div>
            <p class="pm-text-muted" style="margin-bottom: 1rem; font-size: 0.9rem;">Turn off modules you don't use.</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer;">
                    <input type="checkbox" id="pm-setting-enable-db-tools" style="width: 1.2rem; height: 1.2rem;">
                    <span style="font-weight: 500; color: var(--pm-text-primary);">Enable Database Tools Tab <span style="font-size: 0.75rem; background: var(--pm-success); color: var(--pm-white); padding: 2px 6px; border-radius: 4px; margin-left: 5px;">FREE</span></span>
                </label>
                <label id="pm-lbl-enable-query-wizard" style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer;">
                    <input type="checkbox" id="pm-setting-enable-query-wizard" style="width: 1.2rem; height: 1.2rem;">
                    <span style="font-weight: 500; color: var(--pm-text-primary);">Enable Query & Mutate Tab <span style="font-size: 0.75rem; background: var(--pm-warning); color: var(--pm-white); padding: 2px 6px; border-radius: 4px; margin-left: 5px;">PRO</span></span>
                </label>
                <label id="pm-lbl-enable-history" style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer;">
                    <input type="checkbox" id="pm-setting-enable-history" style="width: 1.2rem; height: 1.2rem;">
                    <span style="font-weight: 500; color: var(--pm-text-primary);">Enable Mutation History Tab <span style="font-size: 0.75rem; background: var(--pm-warning); color: var(--pm-white); padding: 2px 6px; border-radius: 4px; margin-left: 5px;">PRO</span></span>
                </label>
                <label id="pm-lbl-enable-file-tools" style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer;">
                    <input type="checkbox" id="pm-setting-enable-file-tools" style="width: 1.2rem; height: 1.2rem;">
                    <span style="font-weight: 500; color: var(--pm-text-primary);">Enable File Tools Tab <span style="font-size: 0.75rem; background: var(--pm-warning); color: var(--pm-white); padding: 2px 6px; border-radius: 4px; margin-left: 5px;">PRO</span></span>
                </label>
                <label id="pm-lbl-enable-ghost-purger" style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer;">
                    <input type="checkbox" id="pm-setting-enable-ghost-purger" style="width: 1.2rem; height: 1.2rem;">
                    <span style="font-weight: 500; color: var(--pm-text-primary);">Enable Ghost File Purger <span style="font-size: 0.75rem; background: var(--pm-warning); color: var(--pm-white); padding: 2px 6px; border-radius: 4px; margin-left: 5px;">PRO</span></span>
                </label>
                <label style="display: flex; align-items: center; gap: 0.75rem; cursor: not-allowed; opacity: 0.6;">
                    <input type="checkbox" id="pm-setting-enable-gdpr-sweeper" style="width: 1.2rem; height: 1.2rem;" disabled>
                    <span style="font-weight: 500; color: var(--pm-text-primary);">Enable GDPR Sweeper <span style="font-size: 0.75rem; background: var(--pm-neutral); color: var(--pm-white); padding: 2px 6px; border-radius: 4px; margin-left: 5px; font-weight: bold;">COMING SOON</span></span>
                </label>
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
    <!-- Backup Retention Rules -->
    <div class="pm-card pm-mb-6">
        <div class="pm-card-title" style="margin-bottom: 0.5rem; color: var(--pm-warning);">
            <span class="pm-card-title-icon" style="background-color: var(--pm-warning);"></span>
            🕒 Backup Retention Policies
        </div>
        <p class="pm-text-muted" style="margin-bottom: 1.25rem; font-size: 0.9rem;">
            Automatically prune local database and file backups to keep server storage clean. Set to 0 to disable.
        </p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
            <div>
                <label class="pm-font-semibold pm-text-xs pm-mb-1" style="display: block; color: var(--pm-text-primary);">Maximum Backups to Keep</label>
                <input type="number" id="pm-setting-backup-max-count" class="pm-form-control" min="0" placeholder="5 (0 to disable)" style="width: 100%;">
            </div>
            <div>
                <label class="pm-font-semibold pm-text-xs pm-mb-1" style="display: block; color: var(--pm-text-primary);">Maximum Age of Backups (Days)</label>
                <input type="number" id="pm-setting-backup-max-days" class="pm-form-control" min="0" placeholder="30 (0 to disable)" style="width: 100%;">
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

    <!-- Save Button -->
    <div style="display: flex; justify-content: flex-end; margin-top: 2rem;">
        <button type="button" id="pm-btn-save-settings" class="pm-btn pm-btn-success" style="font-size: 1.1rem; padding: 0.75rem 2rem;">
            💾 Save Global Settings
        </button>
    </div>
</div>

<!-- Inner Sub-panel 2: Documentation & Info -->
<div class="pm-settings-tab-content" id="pm-settings-pane-info" style="display: none;">
    <style>
        .pm-markdown-body h1, .pm-markdown-body h2, .pm-markdown-body h3, .pm-markdown-body h4 {
            font-family: var(--pm-font-family-heading);
            color: var(--pm-card-title-color);
            margin-top: 1.75rem;
            margin-bottom: 0.85rem;
            font-weight: 600;
        }
        .pm-markdown-body h1 { font-size: 1.6rem; border-bottom: 2px solid var(--pm-border-color); padding-bottom: 0.5rem; }
        .pm-markdown-body h2 { font-size: 1.3rem; border-bottom: 1px solid var(--pm-border-color); padding-bottom: 0.35rem; }
        .pm-markdown-body h3 { font-size: 1.1rem; }
        .pm-markdown-body p { margin-bottom: 1rem; color: var(--pm-text-secondary); line-height: 1.6; }
        .pm-markdown-body code {
            font-family: monospace;
            background: rgba(var(--pm-primary-rgb, 59, 130, 246), 0.1);
            color: var(--pm-primary);
            padding: 0.15rem 0.35rem;
            border-radius: 4px;
            font-size: 0.9em;
        }
        .pm-markdown-body pre {
            background: rgba(0,0,0,0.03);
            border: 1px solid var(--pm-border-color);
            padding: 1.25rem;
            border-radius: 8px;
            overflow-x: auto;
            margin-bottom: 1.25rem;
        }
        .pm-markdown-body pre code {
            background: transparent;
            color: var(--pm-text-primary);
            padding: 0;
            font-size: 0.85rem;
        }
        .pm-markdown-body ul, .pm-markdown-body ol {
            margin-bottom: 1.25rem;
            padding-left: 1.5rem;
            color: var(--pm-text-secondary);
            line-height: 1.6;
        }
        .pm-markdown-body li { margin-bottom: 0.4rem; }
        .pm-markdown-body table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 1.5rem;
            font-size: 0.85rem;
        }
        .pm-markdown-body th, .pm-markdown-body td {
            border: 1px solid var(--pm-border-color);
            padding: 0.65rem 0.85rem;
            text-align: left;
        }
        .pm-markdown-body th {
            background: rgba(0,0,0,0.02);
            color: var(--pm-card-title-color);
            font-weight: 600;
        }
        .pm-markdown-body hr {
            border: 0;
            border-top: 1px solid var(--pm-border-color);
            margin: 1.75rem 0;
        }
        .pm-markdown-body blockquote {
            border-left: 4px solid var(--pm-primary);
            padding-left: 1rem;
            margin-left: 0;
            margin-bottom: 1.25rem;
            font-style: italic;
            color: var(--pm-text-secondary);
        }
    </style>

    <div class="pm-section-header pm-flex-between pm-flex-wrap pm-gap-2">
        <div>
            <h2 class="pm-h2">Module Documentation & Manual</h2>
            <p class="pm-text-muted">In-depth guide on the Mass Utility module's architecture and procedural operations.</p>
        </div>
        <button type="button" id="pm-btn-reload-readme" class="pm-btn pm-btn-primary pm-text-xs" style="padding: 0.45rem 1rem;">
            🔄 Refresh Manual
        </button>
    </div>

    <!-- Live Markdown Render Area -->
    <div class="pm-card pm-mb-6" style="padding: 2rem; background: var(--pm-card-bg); border: 1px solid var(--pm-border-color); border-radius: 12px; overflow-x: auto;">
        <div id="pm-readme-render-area" class="pm-markdown-body">
            <div class="pm-flex-center pm-gap-2" style="justify-content: center; padding: 3rem 0; color: var(--pm-text-secondary);">
                <span class="pm-card-title-icon pm-bg-primary" style="animation: pm-pulse 1.5s infinite;"></span>
                <span>Fetching and rendering live manual...</span>
            </div>
        </div>
    </div>
</div>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Project Mass - Super Admin Panel</title>
    <link rel="stylesheet" href="views/css/admin.css?v=1.2">
    <script>
        (function() {
            var theme = localStorage.getItem('pm-theme');
            if (theme !== 'light') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        })();
    </script>
</head>
<body>
    <div class="pm-admin-wrapper">
        <header class="pm-admin-header">
            <div style="display: flex; align-items: center; gap: 1rem;">
                <h2>🛠️ Project Mass - Super Admin Portal</h2>
                <span class="pm-badge badge-active" style="font-size: 0.65rem; text-transform: uppercase; tracking-wide: 0.05em;">V2 Modern UI Active</span>
            </div>
            <div style="display: flex; items-center; gap: 0.75rem;">
                <button type="button" id="pm-theme-toggle-btn" class="pm-btn pm-btn-sm pm-btn-neutral" title="Toggle Light / Dark Mode">🌙 Dark / ☀️ Light</button>
                <a href="index.php?ui=v1" class="pm-btn pm-btn-sm pm-btn-neutral" style="text-decoration: none;" title="Switch to Legacy V1 TPL Layout">📜 V1 Legacy View</a>
                <a href="index.php?ui=v2" class="pm-btn pm-btn-sm pm-btn-primary" style="text-decoration: none;" title="Active V2 Glassmorphic Layout">✨ V2 Modern SPA</a>
                <a href="index.php?action=logout" class="pm-logout-btn">Logout</a>
            </div>
        </header>

        <main class="pm-admin-main">
            <div class="pm-tabs">
                <button type="button" class="pm-tab-btn active" data-target="pm-tab-licenses">🔑 Licenses & Clients</button>
                <button type="button" class="pm-tab-btn" data-target="pm-tab-tiers">📦 Package Tiers</button>
                <button type="button" class="pm-tab-btn" data-target="pm-tab-settings">⚙️ Settings</button>
                <button type="button" class="pm-tab-btn" data-target="pm-tab-security">🛡️ Security & Health</button>
            </div>

            <!-- Tab Pane 1: Licenses -->
            <div id="pm-tab-licenses" class="pm-tab-pane active">
                <!-- Client Creation & Key Generation Grid -->
                <div class="pm-grid-2 pm-mb-6">
                    <!-- Client Account Creation -->
                    <div class="pm-card">
                        <h3>👥 Create Standalone Client Account</h3>
                        <form id="pm-user-form" style="margin-top: 1rem;">
                            <div class="pm-mb-4">
                                <label class="pm-label">Client Email</label>
                                <input type="email" id="pm-user-email" class="pm-input" style="width: 100%;" placeholder="merchant@email.com" required>
                            </div>
                            <div class="pm-mb-4">
                                <label class="pm-label">Password</label>
                                <div class="pm-input-group">
                                    <input type="password" id="pm-user-pass" class="pm-input" style="flex: 1;" required autocomplete="new-password">
                                    <button type="button" id="pm-btn-gen-pass" class="pm-btn pm-btn-neutral" style="white-space: nowrap;">⚡ Generate</button>
                                </div>
                            </div>
                            <div class="pm-mb-4">
                                <label class="pm-label">Company Name</label>
                                <input type="text" id="pm-user-company" class="pm-input" style="width: 100%;" placeholder="Store Co.">
                            </div>
                            <button type="submit" class="pm-btn pm-btn-primary" style="width: 100%;">Create Client</button>
                        </form>
                    </div>

                    <!-- Key Generation Panel -->
                    <div class="pm-card">
                        <h3>🔑 Generate New License Key</h3>
                        <form id="pm-generate-form" style="margin-top: 1rem; display: flex; flex-direction: column; height: calc(100% - 2.5rem); justify-content: space-between;">
                            <div class="pm-mb-4">
                                <label class="pm-label">Client User</label>
                                <select id="pm-new-user-id" class="pm-input" style="width: 100%; height: 38px;" required>
                                    <!-- Dynamically loaded list of users -->
                                </select>
                            </div>
                            <div class="pm-mb-4">
                                <label class="pm-label">Package Tier</label>
                                <select id="pm-new-tier" class="pm-input" style="width: 100%; height: 38px;">
                                    <option value="basic">Basic (Database Only)</option>
                                    <option value="pro">Pro (Cloud Sync & Files)</option>
                                    <option value="developer">Developer (Full Stack & SQL Toolsets)</option>
                                </select>
                            </div>
                            <div class="pm-mb-4">
                                <label class="pm-label">Expiration Date (Optional)</label>
                                <input type="date" id="pm-new-expiry" class="pm-input" style="width: 100%; height: 38px;">
                            </div>
                            <button type="submit" class="pm-btn pm-btn-primary" style="width: 100%;">Generate Key</button>
                        </form>
                    </div>
                </div>

                <!-- Active Licenses Table -->
                <div class="pm-card">
                    <h3>📋 Active Licenses Registry</h3>
                    <div class="pm-table-container">
                        <table class="pm-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Client Email</th>
                                    <th>License Key</th>
                                    <th>Bound Domain</th>
                                    <th>Tier</th>
                                    <th>Status</th>
                                    <th>Expiry</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="pm-licenses-list">
                                <!-- Populated dynamically via JS -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Tab Pane 3: Package Tiers -->
            <div id="pm-tab-tiers" class="pm-tab-pane">
                <!-- Create/Edit Tier Form -->
                <div class="pm-card pm-mb-6">
                    <h3>📦 Manage Package Tier Capabilities</h3>
                    <form id="pm-tier-form" style="margin-top: 1rem;">
                        <div class="pm-grid-2 pm-mb-4">
                            <div>
                                <label class="pm-label">Package Name (Lowercase identifier)</label>
                                <input type="text" id="pm-tier-name" class="pm-input" style="width: 100%;" placeholder="e.g. enterprise" required>
                            </div>
                            <div>
                                <label class="pm-label">Rollback History Retention Limit</label>
                                <input type="number" id="pm-cap-rollback-limit" class="pm-input" style="width: 100%;" min="0" placeholder="0 for none, 999 for unlimited" required>
                                <p style="font-size: 0.75rem; color: var(--pm-text-secondary); margin-top: 0.25rem;">Specify the maximum undo rollback logs allowed on the client's SQLite database.</p>
                            </div>
                        </div>

                        <div class="pm-mb-4">
                            <label class="pm-label" style="font-weight: 700; margin-bottom: 0.5rem; display: block;">Feature Capabilities Toggles</label>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.75rem; background: rgba(255,255,255,0.02); border: 1px solid var(--pm-border-color); padding: 1rem; border-radius: 8px;">
                                <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer; color: var(--pm-text-primary);">
                                    <input type="checkbox" id="pm-cap-visual-execute" style="width: 1.1rem; height: 1.1rem;">
                                    <span>⚡ Enable Visual AST Write Execution</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer; color: var(--pm-text-primary);">
                                    <input type="checkbox" id="pm-cap-gdrive" style="width: 1.1rem; height: 1.1rem;">
                                    <span>☁️ Enable Google Drive Cloud Sync</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer; color: var(--pm-text-primary);">
                                    <input type="checkbox" id="pm-cap-automation" style="width: 1.1rem; height: 1.1rem;">
                                    <span>⏱️ Enable Scheduled Backups (Crons)</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer; color: var(--pm-text-primary);">
                                    <input type="checkbox" id="pm-cap-sweeper" style="width: 1.1rem; height: 1.1rem;">
                                    <span>🧹 Enable Bulk Data & Image Sweeper</span>
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer; color: var(--pm-text-primary);">
                                    <input type="checkbox" id="pm-cap-autopilot" style="width: 1.1rem; height: 1.1rem;">
                                    <span>🛡️ Enable Safety Auto-Pilot Tuning</span>
                                </label>
                            </div>
                        </div>

                        <div style="display: flex; justify-content: flex-end;">
                            <button type="submit" class="pm-btn pm-btn-primary" style="padding: 0.6rem 2rem;">Save Package Tier</button>
                        </div>
                    </form>
                </div>

                <!-- Tiers Registry List -->
                <div class="pm-card">
                    <h3>📋 Defined Subscription Tiers</h3>
                    <div class="pm-table-container" style="margin-top: 1rem;">
                        <table class="pm-table">
                            <thead>
                                <tr>
                                    <th style="width: 160px;">Tier Name</th>
                                    <th>Capabilities / Features Unlocked</th>
                                    <th style="width: 140px; text-align: right;">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="pm-tiers-list">
                                <!-- Populated dynamically via JS -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Tab Pane 2: Settings -->
            <div id="pm-tab-settings" class="pm-tab-pane">
                <div style="max-width: 500px;">
                    <!-- Admin Security Password Update -->
                    <div class="pm-card">
                        <h3>🔒 Change Admin Password</h3>
                        <form id="pm-password-form" style="margin-top: 1rem;">
                            <div class="pm-mb-4">
                                <label class="pm-label">Current Password</label>
                                <input type="password" id="pm-admin-old-pass" class="pm-input" style="width: 100%;" required autocomplete="current-password">
                            </div>
                            <div class="pm-mb-4">
                                <label class="pm-label">New Password</label>
                                <input type="password" id="pm-admin-new-pass" class="pm-input" style="width: 100%;" required autocomplete="new-password">
                            </div>
                            <button type="submit" class="pm-btn pm-btn-danger" style="width: 100%; margin-top: 1rem;">Update Admin Password</button>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Tab Pane 4: Security & Health -->
            <div id="pm-tab-security" class="pm-tab-pane">
                <div class="pm-card" style="margin-bottom: 1.5rem;">
                    <div class="pm-flex-between">
                        <div>
                            <h3>🛡️ Multi-Server Security & Health Diagnostics</h3>
                            <p class="pm-label" style="font-weight: normal; margin-top: 0.25rem; color: var(--pm-text-secondary);">
                                Audits the security configurations, file system access, and SSL safety of both the Admin Portal and SaaS Dashboard servers.
                            </p>
                        </div>
                        <button type="button" class="pm-btn pm-btn-primary" id="pm-btn-run-diagnostics" style="white-space: nowrap;">⚡ Run System Security Audit</button>
                    </div>
                </div>

                <div id="pm-diagnostics-results" style="display: flex; flex-direction: column; gap: 1rem;">
                    <p class="pm-label" style="color: var(--pm-text-secondary); text-align: center; padding: 2rem 0;">
                        Click "Run System Security Audit" above to scan the decoupled server environment.
                    </p>
                </div>
            </div>
        </main>
    </div>

    <!-- Edit License Dialog Modal -->
    <div id="pm-edit-modal" class="pm-modal" style="display: none;">
        <div class="pm-modal-content">
            <h3 style="margin-bottom: 1rem;">✏️ Edit License Details</h3>
            <form id="pm-edit-form">
                <input type="hidden" id="pm-edit-id">
                <div class="pm-mb-4">
                    <label class="pm-label">Bound Domain</label>
                    <input type="text" id="pm-edit-domain" class="pm-input" style="width: 100%;" placeholder="e.g. store.com">
                </div>
                <div class="pm-mb-4">
                    <label class="pm-label">Package Tier</label>
                    <select id="pm-edit-tier" class="pm-input" style="width: 100%;">
                        <option value="basic">Basic</option>
                        <option value="pro">Pro</option>
                        <option value="developer">Developer</option>
                    </select>
                </div>
                <div class="pm-mb-4">
                    <label class="pm-label">Status</label>
                    <select id="pm-edit-status" class="pm-input" style="width: 100%;">
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="expired">Expired</option>
                    </select>
                </div>
                <div class="pm-mb-4">
                    <label class="pm-label">Expiry Date</label>
                    <input type="date" id="pm-edit-expiry" class="pm-input" style="width: 100%;">
                </div>
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button type="button" id="pm-edit-cancel" class="pm-btn pm-btn-neutral">Cancel</button>
                    <button type="submit" class="pm-btn pm-btn-primary">Save Changes</button>
                </div>
            </form>
        </div>
    </div>

    <script src="views/js/AdminEngine.js?v=1.2"></script>
</body>
</html>

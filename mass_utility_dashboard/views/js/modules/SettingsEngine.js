/**
 * Project Mass - Settings Engine
 * Handles saving and retrieving SaaS configuration preferences,
 * license key checks, and UI mode toggling persistency.
 */
window.SettingsEngine = (function() {
    let settings = {};

    function init() {
        bindEvents();
    }

    function hydrateSettings(data) {
        settings = Object.assign({}, settings, data || {});
        if (window.PM_CONFIG) {
            window.PM_CONFIG.settings = settings;
        }

        // Dynamically compute capabilities from the signed license token
        let capabilities = {
            backup_destinations: ['local'],
            backup_automation: false,
            rollback_history_limit: 0,
            query_visual_execute: false,
            governor_autopilot: false,
            sweeper_execution: false
        };
        let tierName = 'free';

        if (settings.PM_LICENSE_TOKEN) {
            try {
                const payloadStr = atob(settings.PM_LICENSE_TOKEN);
                const payload = JSON.parse(payloadStr);
                tierName = payload.tier || 'basic';
                if (payload.features && payload.features.capabilities) {
                    capabilities = payload.features.capabilities;
                } else {
                    // Safe fallback mappings based on tier name
                    const isDeveloper = (tierName === 'developer');
                    const isPro = (tierName === 'pro' || isDeveloper);
                    capabilities = {
                        backup_destinations: isPro ? ['local', 'gdrive'] : ['local'],
                        backup_automation: isPro,
                        rollback_history_limit: isDeveloper ? 999 : (isPro ? 10 : 0),
                        query_visual_execute: isPro,
                        governor_autopilot: isPro,
                        sweeper_execution: isPro
                    };
                }
            } catch (e) {
                console.error('Failed to decode dynamic license token signature.', e);
            }
        }

        // Cache capabilities globally
        window.PM_CAPABILITIES = capabilities;
        window.PM_TIER_NAME = tierName;
        window.pmIsPro = true; // Dashboard is running in active authenticated state

        // Hydrate license subscription visual card
        const keyDisplay = document.getElementById('pm-license-display-key');
        const tierDisplay = document.getElementById('pm-license-display-tier');
        const featuresChecklist = document.getElementById('pm-license-features-checklist');

        if (keyDisplay) {
            const rawKey = settings.PM_LICENSE_KEY || 'None';
            if (rawKey !== 'None' && rawKey.length > 10) {
                keyDisplay.textContent = rawKey.substring(0, 9) + '-••••-••••-••••';
            } else {
                keyDisplay.textContent = rawKey;
            }
        }
        if (tierDisplay) {
            tierDisplay.textContent = `${tierName} TIER`;
        }
        if (featuresChecklist) {
            featuresChecklist.innerHTML = ''; // nosec
            const items = [
                { label: 'Raw SQL Execution (Terminal)', active: true },
                { label: 'Local Backups (Manual)', active: true },
                { label: 'Visual Query Builder (AST Editor)', active: !!capabilities.query_visual_execute },
                { label: 'Offsite Cloud Backup (Google Drive)', active: !!(capabilities.backup_destinations && capabilities.backup_destinations.includes('gdrive')) },
                { label: 'Scheduled Backups (Cron CLI)', active: !!capabilities.backup_automation },
                { label: 'Safety Auto-Pilot Performance Tuning', active: !!capabilities.governor_autopilot },
                { label: 'Undo Rollback Mutations', active: !!(capabilities.rollback_history_limit > 0) },
                { label: 'Data & Image Sweeper Execution', active: !!capabilities.sweeper_execution }
            ];

            items.forEach(item => {
                const li = document.createElement('li');
                li.style.display = 'flex';
                li.style.alignItems = 'center';
                li.style.gap = '0.5rem';
                
                const dot = document.createElement('span');
                dot.style.display = 'inline-block';
                dot.style.width = '8px';
                dot.style.height = '8px';
                dot.style.borderRadius = '50%';
                dot.style.backgroundColor = item.active ? 'var(--pm-success)' : '#64748b';
                
                li.appendChild(dot);
                
                const text = document.createElement('span');
                text.textContent = item.label;
                if (!item.active) {
                    text.style.color = '#64748b';
                    text.innerHTML += ' <span style="font-size: 0.7rem; background: #334155; color: #cbd5e1; padding: 1px 4px; border-radius: 4px; font-weight: bold; margin-left: 5px;">PRO LOCK</span>';
                }
                li.appendChild(text);
                
                featuresChecklist.appendChild(li);
            });
        }

        // Lock/unlock Auto-Pilot slider based on capabilities
        const autoRadio = document.querySelector('input[name="pm_governor_mode"][value="auto"]');
        const manualRadio = document.querySelector('input[name="pm_governor_mode"][value="manual"]');
        const autoLabel = document.getElementById('pm-lbl-gov-auto');
        
        if (autoLabel) {
            if (!capabilities.governor_autopilot) {
                autoLabel.classList.add('pm-pro-locked');
                autoLabel.style.opacity = '0.5';
                autoLabel.style.cursor = 'not-allowed';
            } else {
                autoLabel.classList.remove('pm-pro-locked');
                autoLabel.style.opacity = '1';
                autoLabel.style.cursor = 'pointer';
            }
        }

        const govMode = !capabilities.governor_autopilot ? 'manual' : (settings.PM_GOVERNOR_MODE || 'auto');
        if (autoRadio && manualRadio) {
            if (govMode === 'manual') manualRadio.checked = true;
            else autoRadio.checked = true;
        }

        if (document.getElementById('pm-setting-file-chunk')) {
            document.getElementById('pm-setting-file-chunk').value = settings.PM_FILE_CHUNK_MB || '60';
        }
        if (document.getElementById('pm-setting-file-exclusions')) {
            document.getElementById('pm-setting-file-exclusions').value = settings.PM_FILE_EXCLUSIONS || "/var/cache/\n/img/tmp/";
        }
        if (document.getElementById('pm-setting-gdrive-default-download')) {
            document.getElementById('pm-setting-gdrive-default-download').value = settings.PM_GDRIVE_DEFAULT_DOWNLOAD || "cloud";
        }
        if (document.getElementById('pm-setting-db-chunk')) {
            document.getElementById('pm-setting-db-chunk').value = settings.PM_DB_CHUNK_ROWS || '5000';
        }

        // Lock / Unlock retention inputs based on history capabilities limit
        const retentionInputs = [
            'pm-setting-backup-max-count',
            'pm-setting-backup-max-days',
            'pm-setting-backup-cloud-max-count',
            'pm-setting-backup-cloud-max-days'
        ];
        retentionInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                if (capabilities.rollback_history_limit === 0) {
                    input.disabled = true;
                    input.style.opacity = '0.5';
                    input.style.cursor = 'not-allowed';
                    input.value = '0';
                } else {
                    input.disabled = false;
                    input.style.opacity = '1';
                    input.style.cursor = 'text';
                }
            }
        });

        if (document.getElementById('pm-setting-backup-max-count') && !document.getElementById('pm-setting-backup-max-count').disabled) {
            document.getElementById('pm-setting-backup-max-count').value = settings.PM_BACKUP_MAX_COUNT || "0";
        }
        if (document.getElementById('pm-setting-backup-max-days') && !document.getElementById('pm-setting-backup-max-days').disabled) {
            document.getElementById('pm-setting-backup-max-days').value = settings.PM_BACKUP_MAX_DAYS || "0";
        }
        if (document.getElementById('pm-setting-backup-cloud-max-count') && !document.getElementById('pm-setting-backup-cloud-max-count').disabled) {
            document.getElementById('pm-setting-backup-cloud-max-count').value = settings.PM_BACKUP_CLOUD_MAX_COUNT || "0";
        }
        if (document.getElementById('pm-setting-backup-cloud-max-days') && !document.getElementById('pm-setting-backup-cloud-max-days').disabled) {
            document.getElementById('pm-setting-backup-cloud-max-days').value = settings.PM_BACKUP_CLOUD_MAX_DAYS || "0";
        }

        if (document.getElementById('pm-setting-backup-frequency')) {
            document.getElementById('pm-setting-backup-frequency').value = settings.PM_BACKUP_FREQUENCY || "0";
        }

        // Lock / Unlock Cron check box based on capabilities
        const cronAutoCheckbox = document.getElementById('pm-setting-backup-cron-auto');
        if (cronAutoCheckbox) {
            if (!capabilities.backup_automation) {
                cronAutoCheckbox.checked = false;
                cronAutoCheckbox.disabled = true;
                cronAutoCheckbox.parentElement.style.opacity = '0.5';
                cronAutoCheckbox.parentElement.style.cursor = 'not-allowed';
            } else {
                cronAutoCheckbox.disabled = false;
                cronAutoCheckbox.parentElement.style.opacity = '1';
                cronAutoCheckbox.parentElement.style.cursor = 'pointer';
                cronAutoCheckbox.checked = parseInt(settings.PM_BACKUP_CRON_AUTO ?? 1) === 1;
            }
        }

        // Lock / Unlock Google Drive panel based on capabilities
        const gdriveCard = document.getElementById('pm-gdrive-card');
        if (gdriveCard) {
            const cloudEnabled = capabilities.backup_destinations && capabilities.backup_destinations.includes('gdrive');
            const gdriveBadge = document.getElementById('pm-gdrive-badge');
            if (!cloudEnabled) {
                gdriveCard.style.opacity = '0.5';
                gdriveCard.style.pointerEvents = 'none';
                if (gdriveBadge) {
                    gdriveBadge.textContent = '🔒 Locked';
                    gdriveBadge.style.backgroundColor = '#475569';
                    gdriveBadge.style.color = '#e2e8f0';
                }
            } else {
                gdriveCard.style.opacity = '1';
                gdriveCard.style.pointerEvents = 'auto';
            }
        }

        // Toggles
        if (document.getElementById('pm-setting-enable-db-tools')) {
            const el = document.getElementById('pm-setting-enable-db-tools');
            el.checked = el.disabled ? false : parseInt(settings.PM_ENABLE_DB_TOOLS ?? 1) === 1;
        }
        if (document.getElementById('pm-setting-enable-file-tools')) {
            const el = document.getElementById('pm-setting-enable-file-tools');
            el.checked = el.disabled ? false : parseInt(settings.PM_ENABLE_FILE_TOOLS ?? 1) === 1;
        }
        if (document.getElementById('pm-setting-enable-ghost-purger')) {
            const el = document.getElementById('pm-setting-enable-ghost-purger');
            el.checked = el.disabled ? false : parseInt(settings.PM_ENABLE_GHOST_PURGER ?? 1) === 1;
        }
        if (document.getElementById('pm-setting-enable-query-wizard')) {
            const el = document.getElementById('pm-setting-enable-query-wizard');
            el.checked = el.disabled ? false : parseInt(settings.PM_ENABLE_QUERY_WIZARD ?? 1) === 1;
        }
        if (document.getElementById('pm-setting-enable-history')) {
            const el = document.getElementById('pm-setting-enable-history');
            el.checked = el.disabled ? false : parseInt(settings.PM_ENABLE_HISTORY ?? 1) === 1;
        }
        if (document.getElementById('pm-setting-enable-gdpr-sweeper')) {
            const el = document.getElementById('pm-setting-enable-gdpr-sweeper');
            el.checked = el.disabled ? false : parseInt(settings.PM_ENABLE_GDPR_SWEEPER ?? 1) === 1;
        }

        // Safety
        if (document.getElementById('pm-setting-default-dry-run')) {
            document.getElementById('pm-setting-default-dry-run').checked = parseInt(settings.PM_DEFAULT_DRY_RUN ?? 1) === 1;
        }

        // Customizations
        if (document.getElementById('pm-setting-ui-font')) {
            document.getElementById('pm-setting-ui-font').value = settings.PM_UI_FONT || "system-ui, -apple-system, sans-serif";
        }
        if (document.getElementById('pm-setting-ui-theme')) {
            document.getElementById('pm-setting-ui-theme').value = settings.PM_UI_THEME || "classic";
        }
        if (document.getElementById('pm-setting-custom-quota')) {
            document.getElementById('pm-setting-custom-quota').value = settings.PM_CUSTOM_DISK_QUOTA_GB || "0";
        }

        const frequencySelect = document.getElementById('pm-setting-backup-frequency');
        if (cronAutoCheckbox && frequencySelect) {
            frequencySelect.disabled = !cronAutoCheckbox.checked;
            if (!cronAutoCheckbox.dataset.listenerBound) {
                cronAutoCheckbox.dataset.listenerBound = "true";
                cronAutoCheckbox.addEventListener('change', () => {
                    frequencySelect.disabled = !cronAutoCheckbox.checked;
                });
            }
        }

        applyUIEffects();
    }

    function applyUIEffects() {
        const container = document.querySelector('.pm-container');
        if (container) {
            container.setAttribute('data-theme', settings.PM_UI_THEME || "classic");
        }
        const premiumModal = document.getElementById('pm-modal-premium');
        if (premiumModal) {
            premiumModal.setAttribute('data-theme', settings.PM_UI_THEME || "classic");
        }

        // Toggle tabs visibility dynamically (keep visible if enabled)
        const fileTab = document.querySelector('label[for="pm-tab-file-tools"]');
        if (fileTab) {
            fileTab.style.display = parseInt(settings.PM_ENABLE_FILE_TOOLS ?? 1) === 1 ? 'flex' : 'none';
        }

        const dbTab = document.querySelector('label[for="pm-tab-database"]');
        if (dbTab) {
            dbTab.style.display = parseInt(settings.PM_ENABLE_DB_TOOLS ?? 1) === 1 ? 'flex' : 'none';
        }

        const queryTab = document.querySelector('label[for="pm-tab-query-mutate"]');
        if (queryTab) {
            queryTab.style.display = parseInt(settings.PM_ENABLE_QUERY_WIZARD ?? 1) === 1 ? 'flex' : 'none';
        }

        const historyTab = document.querySelector('label[for="pm-tab-history"]');
        if (historyTab) {
            historyTab.style.display = parseInt(settings.PM_ENABLE_HISTORY ?? 1) === 1 ? 'flex' : 'none';
        }

        // Default Dry Run enforcement
        const dryRunCheckbox = document.getElementById('pm-simulate');
        if (dryRunCheckbox && parseInt(settings.PM_DEFAULT_DRY_RUN ?? 1) === 1) {
            dryRunCheckbox.checked = true;
        }

        syncGovernorUI();
    }

    function syncGovernorUI() {
        const manualRadio = document.querySelector('input[name="pm_governor_mode"][value="manual"]');
        const isManual = manualRadio && manualRadio.checked;
        
        const lock = document.getElementById('pm-manual-overrides-lock');
        const container = document.getElementById('pm-manual-overrides-container');
        const lblAuto = document.getElementById('pm-lbl-gov-auto');
        const lblManual = document.getElementById('pm-lbl-gov-manual');

        if (lock && container && lblAuto && lblManual) {
            const slider = document.getElementById('pm-gov-slider');
            if (isManual) {
                lock.style.display = 'none';
                container.style.opacity = '1';
                lblManual.style.color = 'var(--pm-text-primary)';
                lblAuto.style.color = 'var(--pm-text-secondary)';
                if (slider) slider.style.transform = 'translateX(100%)';
            } else {
                lock.style.display = 'flex';
                container.style.opacity = '0.6';
                lblAuto.style.color = 'var(--pm-text-primary)';
                lblManual.style.color = 'var(--pm-text-secondary)';
                if (slider) slider.style.transform = 'translateX(0)';
            }
        }
    }

    function evaluateSafetyWarnings() {
        const cores = window.PM_CONFIG && window.PM_CONFIG.cores ? window.PM_CONFIG.cores : 2;
        
        // Check DB Chunk
        const dbSelect = document.getElementById('pm-setting-db-chunk');
        const dbWarning = document.getElementById('pm-warning-db-chunk');
        if (dbSelect && dbWarning) {
            const rows = parseInt(dbSelect.value);
            if (cores <= 2 && rows > 5000) {
                dbWarning.textContent = '⚠️ Warning: Fetching >5000 rows on a 2-core environment heavily risks 503 Gateway Timeouts or Out-of-Memory crashes.';
                dbWarning.style.display = 'block';
            } else if (cores <= 4 && rows > 10000) {
                dbWarning.textContent = '⚠️ Warning: Fetching >10,000 rows requires significant DB thread limits. Use caution.';
                dbWarning.style.display = 'block';
            } else {
                dbWarning.style.display = 'none';
            }
        }

        // Check File Chunk
        const fileSelect = document.getElementById('pm-setting-file-chunk');
        const fileWarning = document.getElementById('pm-warning-file-chunk');
        if (fileSelect && fileWarning) {
            const mb = parseInt(fileSelect.value);
            if (cores <= 2 && mb > 30) {
                fileWarning.textContent = '⚠️ Warning: Archiving >30MB chunks on shared hosting typically hits process kill limits.';
                fileWarning.style.display = 'block';
            } else {
                fileWarning.style.display = 'none';
            }
        }
    }

    function bindEvents() {
        const radios = document.querySelectorAll('input[name="pm_governor_mode"]');
        radios.forEach(r => {
            r.addEventListener('change', function() {
                syncGovernorUI();
            });
        });

        const fileSelect = document.getElementById('pm-setting-file-chunk');
        if (fileSelect) fileSelect.addEventListener('change', evaluateSafetyWarnings);
        
        const dbSelect = document.getElementById('pm-setting-db-chunk');
        if (dbSelect) dbSelect.addEventListener('change', evaluateSafetyWarnings);

        const fontSelect = document.getElementById('pm-setting-ui-font');
        if (fontSelect) {
            fontSelect.addEventListener('change', function() {
                document.documentElement.style.setProperty('--pm-font-family', this.value);
            });
        }

        const themeSelect = document.getElementById('pm-setting-ui-theme');
        if (themeSelect) {
            themeSelect.addEventListener('change', function() {
                const container = document.querySelector('.pm-container');
                if (container) container.setAttribute('data-theme', this.value);
                const premiumModal = document.getElementById('pm-modal-premium');
                if (premiumModal) premiumModal.setAttribute('data-theme', this.value);
            });
        }

        const saveBtn = document.getElementById('pm-btn-save-settings');
        if (saveBtn) {
            saveBtn.addEventListener('click', async function() {
                saveBtn.disabled = true;
                const originalText = saveBtn.textContent;
                saveBtn.textContent = '💾 Saving...';

                const govModeRadio = document.querySelector('input[name="pm_governor_mode"]:checked');

                const payload = {
                    settings: {
                        PM_GOVERNOR_MODE: govModeRadio ? govModeRadio.value : 'auto',
                        PM_FILE_CHUNK_MB: document.getElementById('pm-setting-file-chunk').value,
                        PM_FILE_EXCLUSIONS: document.getElementById('pm-setting-file-exclusions') ? document.getElementById('pm-setting-file-exclusions').value : (settings.PM_FILE_EXCLUSIONS || ''),
                        PM_DB_CHUNK_ROWS: document.getElementById('pm-setting-db-chunk').value,
                        PM_ENABLE_FILE_TOOLS: 1,
                        PM_ENABLE_DB_TOOLS: 1,
                        PM_ENABLE_QUERY_WIZARD: 1,
                        PM_ENABLE_HISTORY: 1,
                        PM_ENABLE_GHOST_PURGER: 1,
                        PM_ENABLE_GDPR_SWEEPER: 1,
                        PM_DEFAULT_DRY_RUN: document.getElementById('pm-setting-default-dry-run').checked ? 1 : 0,
                        PM_GDRIVE_DEFAULT_DOWNLOAD: document.getElementById('pm-setting-gdrive-default-download') ? document.getElementById('pm-setting-gdrive-default-download').value : (settings.PM_GDRIVE_DEFAULT_DOWNLOAD || 'cloud'),
                        PM_UI_FONT: document.getElementById('pm-setting-ui-font').value,
                        PM_UI_THEME: document.getElementById('pm-setting-ui-theme').value,
                        PM_CUSTOM_DISK_QUOTA_GB: document.getElementById('pm-setting-custom-quota').value || "0",
                        PM_BACKUP_MAX_COUNT: document.getElementById('pm-setting-backup-max-count') ? document.getElementById('pm-setting-backup-max-count').value : "0",
                        PM_BACKUP_MAX_DAYS: document.getElementById('pm-setting-backup-max-days') ? document.getElementById('pm-setting-backup-max-days').value : "0",
                        PM_BACKUP_CLOUD_MAX_COUNT: document.getElementById('pm-setting-backup-cloud-max-count') ? document.getElementById('pm-setting-backup-cloud-max-count').value : "0",
                        PM_BACKUP_CLOUD_MAX_DAYS: document.getElementById('pm-setting-backup-cloud-max-days') ? document.getElementById('pm-setting-backup-cloud-max-days').value : "0",
                        PM_BACKUP_FREQUENCY: document.getElementById('pm-setting-backup-frequency').value || "0",
                        PM_BACKUP_CRON_AUTO: document.getElementById('pm-setting-backup-cron-auto') ? (document.getElementById('pm-setting-backup-cron-auto').checked ? 1 : 0) : 0
                    }
                };

                try {
                    const response = await window.FetchEngine.post('save_settings', payload);
                    if (response && response.success) {
                        window.showPremiumToast('Settings saved successfully', 'success');
                        hydrateSettings(payload.settings);
                    } else {
                        window.showPremiumToast(response?.error || 'Failed to save settings.', 'error');
                    }
                } catch (error) {
                    window.showPremiumToast('Network error while saving settings.', 'error');
                } finally {
                    saveBtn.disabled = false;
                    saveBtn.textContent = originalText;
                }
            });
        }

        // Tab locked redirect checks
        document.addEventListener('click', function(e) {
            const label = e.target.closest('.pm-pro-locked');
            if (label) {
                const cloudEnabled = window.PM_CAPABILITIES && window.PM_CAPABILITIES.backup_destinations && window.PM_CAPABILITIES.backup_destinations.includes('gdrive');
                const autopilotEnabled = window.PM_CAPABILITIES && window.PM_CAPABILITIES.governor_autopilot;
                const cronEnabled = window.PM_CAPABILITIES && window.PM_CAPABILITIES.backup_automation;
                
                let isLocked = false;
                if (label.id === 'pm-lbl-gov-auto' && !autopilotEnabled) isLocked = true;
                if (label.id === 'pm-lbl-enable-query-wizard' && !(window.PM_CAPABILITIES && window.PM_CAPABILITIES.query_visual_execute)) isLocked = true;
                if (label.id === 'pm-lbl-enable-history' && !(window.PM_CAPABILITIES && window.PM_CAPABILITIES.rollback_history_limit > 0)) isLocked = true;
                
                if (isLocked) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.showPremiumToast('This automation feature requires a Pro or Developer license.', 'warning');
                }
            }
        }, true);

        // Settings Sub-tabs switching
        const settingsSubTabBtns = document.querySelectorAll('.pm-settings-tab-btn');
        settingsSubTabBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                settingsSubTabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const targetId = btn.getAttribute('data-sub-tab');
                const paneGeneral = document.getElementById('pm-settings-pane-general');
                const paneInfo = document.getElementById('pm-settings-pane-info');
                const paneSecurity = document.getElementById('pm-settings-pane-security');
                if (paneGeneral && paneInfo) {
                    paneGeneral.style.display = (targetId === 'pm-settings-pane-general') ? 'block' : 'none';
                    paneInfo.style.display = (targetId === 'pm-settings-pane-info') ? 'block' : 'none';
                    if (paneSecurity) {
                        paneSecurity.style.display = (targetId === 'pm-settings-pane-security') ? 'block' : 'none';
                    }
                }
            });
        });

        // Run Security Diagnostics Scan
        const runDiagBtn = document.getElementById('pm-btn-run-diagnostics');
        if (runDiagBtn) {
            runDiagBtn.addEventListener('click', async function() {
                runDiagBtn.disabled = true;
                const originalText = runDiagBtn.textContent;
                runDiagBtn.textContent = '⚡ Running Audit...';
                
                const resultsContainer = document.getElementById('pm-diagnostics-results-container');
                if (resultsContainer) {
                    resultsContainer.innerHTML = '<p class="pm-text-sm" style="color: var(--pm-primary);">Initiating multi-server security scan...</p>'; // nosec
                }

                try {
                    const response = await window.FetchEngine.post('get_diagnostics', {});
                    if (response && response.success && response.diagnostics) {
                        const d = response.diagnostics;
                        let html = '<div style="display: flex; flex-direction: column; gap: 0.75rem;">';
                        
                        html += `
                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; background: rgba(255,255,255,0.02); border: 1px solid var(--pm-border-color); border-radius: 8px;">
                                <div>
                                    <strong style="font-size: 0.9rem; color: var(--pm-text-primary);">SaaS Git Repository Security (.git Exposure)</strong>
                                    <p style="font-size: 0.75rem; color: var(--pm-text-secondary); margin-top: 0.2rem;">Checks if the underlying .git directory is accessible from public HTTP traffic.</p>
                                </div>
                                <span style="padding: 0.3rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; ${d.git_exposed ? 'background: rgba(239, 68, 68, 0.1); color: var(--pm-danger);' : 'background: rgba(16, 185, 129, 0.1); color: var(--pm-success);'}">
                                    ${d.git_exposed ? '⚠️ EXPOSED' : '🟢 SECURE'}
                                </span>
                            </div>
                        `;

                        html += `
                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; background: rgba(255,255,255,0.02); border: 1px solid var(--pm-border-color); border-radius: 8px;">
                                <div>
                                    <strong style="font-size: 0.9rem; color: var(--pm-text-primary);">SaaS Vault DB Security (.db Download Exposure)</strong>
                                    <p style="font-size: 0.75rem; color: var(--pm-text-secondary); margin-top: 0.2rem;">Checks if your SQLite database file can be downloaded directly from the web.</p>
                                </div>
                                <span style="padding: 0.3rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; ${d.db_exposed ? 'background: rgba(239, 68, 68, 0.1); color: var(--pm-danger);' : 'background: rgba(16, 185, 129, 0.1); color: var(--pm-success);'}">
                                    ${d.db_exposed ? '⚠️ EXPOSED' : '🟢 SECURE'}
                                </span>
                            </div>
                        `;

                        html += `
                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; background: rgba(255,255,255,0.02); border: 1px solid var(--pm-border-color); border-radius: 8px;">
                                <div>
                                    <strong style="font-size: 0.9rem; color: var(--pm-text-primary);">Decoupled Bridge Encryption (SSL/TLS Transport)</strong>
                                    <p style="font-size: 0.75rem; color: var(--pm-text-secondary); margin-top: 0.2rem;">Checks if communications between SaaS Dashboard and client Bridge are encrypted (HTTPS).</p>
                                </div>
                                <span style="padding: 0.3rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; ${d.bridge_encrypted ? 'background: rgba(16, 185, 129, 0.1); color: var(--pm-success);' : 'background: rgba(245, 158, 11, 0.1); color: var(--pm-warning);'}">
                                    ${d.bridge_encrypted ? '🟢 HTTPS ENCRYPTED' : '⚠️ HTTP UNENCRYPTED'}
                                </span>
                            </div>
                        `;

                        html += `
                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; background: rgba(255,255,255,0.02); border: 1px solid var(--pm-border-color); border-radius: 8px;">
                                <div>
                                    <strong style="font-size: 0.9rem; color: var(--pm-text-primary);">SaaS Browser Transport Encryption (SSL/TLS Connection)</strong>
                                    <p style="font-size: 0.75rem; color: var(--pm-text-secondary); margin-top: 0.2rem;">Checks if your active dashboard administration session is running over HTTPS.</p>
                                </div>
                                <span style="padding: 0.3rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; ${d.ssl_enforced ? 'background: rgba(16, 185, 129, 0.1); color: var(--pm-success);' : 'background: rgba(245, 158, 11, 0.1); color: var(--pm-warning);'}">
                                    ${d.ssl_enforced ? '🟢 SSL ON' : '⚠️ SSL OFF'}
                                </span>
                            </div>
                        `;

                        let showFixButton = false;
                        let pathsHtml = '<div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem; padding: 0.5rem; background: rgba(0,0,0,0.1); border-radius: 6px;">';
                        if (d.paths) {
                            for (const key in d.paths) {
                                const p = d.paths[key];
                                const isMismatched = (p.current !== p.recommended);
                                if (isMismatched) showFixButton = true;
                                pathsHtml += `
                                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; padding: 0.25rem 0;">
                                        <span style="font-family: monospace; color: var(--pm-text-secondary);">${p.path}</span>
                                        <span>
                                            Current: <strong style="${isMismatched ? 'color: var(--pm-warning);' : 'color: var(--pm-success);'}">${p.current}</strong> 
                                            (Recommended: <strong>${p.recommended}</strong>)
                                        </span>
                                    </div>
                                `;
                            }
                        }
                        pathsHtml += '</div>';

                        html += `
                            <details style="padding: 0.75rem; background: rgba(255,255,255,0.02); border: 1px solid var(--pm-border-color); border-radius: 8px; cursor: pointer;">
                                <summary style="display: flex; align-items: center; justify-content: space-between; font-weight: 700; color: var(--pm-text-primary); outline: none; list-style: none;">
                                    <div style="display: flex; flex-direction: column;">
                                        <strong style="font-size: 0.9rem;">SaaS Files & Folders Hardening Status</strong>
                                        <span style="font-size: 0.75rem; color: var(--pm-text-secondary); font-weight: normal; margin-top: 0.2rem;">Click to expand file permission checks and auto-heal loose settings.</span>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                                        <span style="padding: 0.3rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; ${showFixButton ? 'background: rgba(245, 158, 11, 0.1); color: var(--pm-warning);' : 'background: rgba(16, 185, 129, 0.1); color: var(--pm-success);'}">
                                            ${showFixButton ? '⚠️ HARMONIZE' : '🟢 SECURE'}
                                        </span>
                                    </div>
                                </summary>
                                ${pathsHtml}
                                ${showFixButton ? '<div style="display: flex; justify-content: flex-end; margin-top: 0.75rem;"><button type="button" id="pm-btn-fix-dashboard-perms" style="background: var(--pm-primary); border: none; border-radius: 4px; padding: 0.4rem 0.8rem; font-size: 0.8rem; color: #fff; font-weight: bold; cursor: pointer;">⚡ Auto-Fix & Harden Permissions</button></div>' : ''}
                            </details>
                        `;

                        html += '</div>';
                        resultsContainer.innerHTML = html; // nosec

                        // Bind dashboard fix permissions button
                        const fixDashboardPermsBtn = document.getElementById('pm-btn-fix-dashboard-perms');
                        if (fixDashboardPermsBtn) {
                            fixDashboardPermsBtn.addEventListener('click', async function(e) {
                                e.stopPropagation();
                                fixDashboardPermsBtn.disabled = true;
                                fixDashboardPermsBtn.textContent = '⚡ Fixing...';
                                try {
                                    const fixRes = await window.FetchEngine.post('fix_diagnostics_permissions', {});
                                    if (fixRes && fixRes.success) {
                                        window.showPremiumToast('Permissions successfully secured to standard 0755/0644 values.', 'success');
                                        runDiagBtn.click();
                                    } else {
                                        window.showPremiumToast('Failed to write permissions changes.', 'error');
                                    }
                                } catch (err) {
                                    window.showPremiumToast('Network error during permissions correction.', 'error');
                                }
                            });
                        }
                    } else {
                        resultsContainer.innerHTML = '<p class="pm-text-sm" style="color: var(--pm-danger);">Security diagnostics audit failed to run.</p>'; // nosec
                    }
                } catch (err) {
                    resultsContainer.innerHTML = '<p class="pm-text-sm" style="color: var(--pm-danger);">Network error during diagnostics request.</p>'; // nosec
                } finally {
                    runDiagBtn.disabled = false;
                    runDiagBtn.textContent = originalText;
                }
            });
        }
    }

    return {
        init: init,
        hydrateSettings: hydrateSettings
    };
})();

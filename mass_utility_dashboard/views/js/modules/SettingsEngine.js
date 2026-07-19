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
        settings = data || {};
        if (window.PM_CONFIG) {
            window.PM_CONFIG.settings = settings;
        }

        // Dynamically compute and cache Pro license state
        const isPro = !!(settings.PM_LICENSE_KEY && settings.PM_LICENSE_KEY.trim() !== '');
        window.pmIsPro = isPro;

        // Hydrate license activation visual interface elements
        const proCard = document.getElementById('pm-pro-card');
        const proIcon = document.getElementById('pm-pro-icon');
        const proBadgeActive = document.getElementById('pm-pro-badge-active');
        const proBadgeFree = document.getElementById('pm-pro-badge-free');
        const proInput = document.getElementById('pm-pro-license-key');
        const proBtn = document.getElementById('pm-btn-activate-pro');
        const removeBtn = document.getElementById('pm-btn-remove-license');

        if (proCard) {
            proCard.style.border = isPro ? '2px solid var(--pm-success)' : '2px solid var(--pm-warning)';
        }
        if (proIcon) {
            proIcon.style.backgroundColor = isPro ? 'var(--pm-success)' : 'var(--pm-warning)';
        }
        if (proBadgeActive) {
            proBadgeActive.style.display = isPro ? 'block' : 'none';
        }
        if (proBadgeFree) {
            proBadgeFree.style.display = isPro ? 'none' : 'block';
        }
        if (proInput) {
            proInput.value = settings.PM_LICENSE_KEY || '';
            proInput.disabled = isPro;
            proInput.style.opacity = isPro ? '0.6' : '1';
            proInput.style.cursor = isPro ? 'not-allowed' : 'text';
        }
        if (proBtn) {
            proBtn.innerText = isPro ? 'Update License' : 'Unlock Now';
        }
        if (removeBtn) {
            removeBtn.style.display = isPro ? 'block' : 'none';
        }

        // Engine Tuning
        const autoRadio = document.querySelector('input[name="pm_governor_mode"][value="auto"]');
        const manualRadio = document.querySelector('input[name="pm_governor_mode"][value="manual"]');
        const autoLabel = document.getElementById('pm-lbl-gov-auto');
        
        if (autoLabel) {
            if (!isPro) {
                autoLabel.classList.add('pm-pro-locked');
            } else {
                autoLabel.classList.remove('pm-pro-locked');
            }
        }

        const isFree = !isPro;
        const govMode = isFree ? 'manual' : (settings.PM_GOVERNOR_MODE || 'auto');
        
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

        // Configure Modularity checkbox disabled and styling properties
        const queryWizardInput = document.getElementById('pm-setting-enable-query-wizard');
        const queryWizardLabel = document.getElementById('pm-lbl-enable-query-wizard');
        if (queryWizardInput) {
            queryWizardInput.disabled = !isPro;
            if (queryWizardLabel) {
                queryWizardLabel.style.opacity = isPro ? '1' : '0.6';
            }
        }

        const historyInput = document.getElementById('pm-setting-enable-history');
        const historyLabel = document.getElementById('pm-lbl-enable-history');
        if (historyInput) {
            historyInput.disabled = !isPro;
            if (historyLabel) {
                historyLabel.style.opacity = isPro ? '1' : '0.6';
            }
        }

        const fileToolsInput = document.getElementById('pm-setting-enable-file-tools');
        const fileToolsLabel = document.getElementById('pm-lbl-enable-file-tools');
        if (fileToolsInput) {
            fileToolsInput.disabled = !isPro;
            if (fileToolsLabel) {
                fileToolsLabel.style.opacity = isPro ? '1' : '0.6';
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

        // Toggle tabs visibility based on settings
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

        // Default Dry Run enforcement (hook into existing UI if it exists)
        const dryRunCheckbox = document.getElementById('pm-simulate');
        if (dryRunCheckbox && parseInt(settings.PM_DEFAULT_DRY_RUN ?? 1) === 1) {
            dryRunCheckbox.checked = true;
        }

        // Governor UI state sync
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
                        PM_ENABLE_FILE_TOOLS: document.getElementById('pm-setting-enable-file-tools').disabled ? (settings.PM_ENABLE_FILE_TOOLS ?? 1) : (document.getElementById('pm-setting-enable-file-tools').checked ? 1 : 0),
                        PM_ENABLE_DB_TOOLS: document.getElementById('pm-setting-enable-db-tools').disabled ? (settings.PM_ENABLE_DB_TOOLS ?? 1) : (document.getElementById('pm-setting-enable-db-tools').checked ? 1 : 0),
                        PM_ENABLE_QUERY_WIZARD: document.getElementById('pm-setting-enable-query-wizard').disabled ? (settings.PM_ENABLE_QUERY_WIZARD ?? 1) : (document.getElementById('pm-setting-enable-query-wizard').checked ? 1 : 0),
                        PM_ENABLE_HISTORY: document.getElementById('pm-setting-enable-history').disabled ? (settings.PM_ENABLE_HISTORY ?? 1) : (document.getElementById('pm-setting-enable-history').checked ? 1 : 0),
                        PM_ENABLE_GHOST_PURGER: document.getElementById('pm-setting-enable-ghost-purger').disabled ? (settings.PM_ENABLE_GHOST_PURGER ?? 1) : (document.getElementById('pm-setting-enable-ghost-purger').checked ? 1 : 0),
                        PM_ENABLE_GDPR_SWEEPER: document.getElementById('pm-setting-enable-gdpr-sweeper').disabled ? (settings.PM_ENABLE_GDPR_SWEEPER ?? 1) : (document.getElementById('pm-setting-enable-gdpr-sweeper').checked ? 1 : 0),
                        PM_DEFAULT_DRY_RUN: document.getElementById('pm-setting-default-dry-run').checked ? 1 : 0,
                        PM_GDRIVE_DEFAULT_DOWNLOAD: document.getElementById('pm-setting-gdrive-default-download') ? document.getElementById('pm-setting-gdrive-default-download').value : (settings.PM_GDRIVE_DEFAULT_DOWNLOAD || 'cloud'),
                        PM_UI_FONT: document.getElementById('pm-setting-ui-font').value,
                        PM_UI_THEME: document.getElementById('pm-setting-ui-theme').value,
                        PM_CUSTOM_DISK_QUOTA_GB: document.getElementById('pm-setting-custom-quota').value || "0"
                    }
                };

                try {
                    const response = await window.FetchEngine.post('save_settings', payload);
                    if (response && response.success) {
                        window.showPremiumToast('Settings saved successfully', 'success');
                        hydrateSettings(payload.settings); // Re-apply locally
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

        const proBtn = document.getElementById('pm-btn-activate-pro');
        const proInput = document.getElementById('pm-pro-license-key');
        if (proBtn && proInput) {
            proBtn.addEventListener('click', async function() {
                const key = proInput.value.trim();
                if (!key) {
                    window.showPremiumToast('Please enter a license key', 'error');
                    return;
                }
                
                proBtn.disabled = true;
                proBtn.innerText = 'Verifying...';
                
                try {
                    const response = await window.FetchEngine.post('activate_license', { key: key });
                    if (response && response.success) {
                        window.showPremiumToast(response.message, 'success');
                        const cleanUrl = window.location.href.split('#')[0];
                        setTimeout(() => window.location.href = cleanUrl + (cleanUrl.includes('?') ? '&' : '?') + 'reload=' + new Date().getTime(), 1500);
                    } else {
                        window.showPremiumToast(response.error || 'Activation failed', 'error');
                        proBtn.disabled = false;
                        proBtn.innerText = 'Try Again';
                    }
                } catch (err) {
                    window.showPremiumToast(err.message || 'Network error', 'error');
                    proBtn.disabled = false;
                    proBtn.innerText = 'Try Again';
                }
            });
        }
        
        const removeBtn = document.getElementById('pm-btn-remove-license');
        if (removeBtn) {
            removeBtn.addEventListener('click', async function() {
                window.showPremiumConfirmModal(
                    'Remove Pro License',
                    'Are you sure you want to completely remove your active Pro license?<br><br>Doing this will immediately lock you out of the Mass Query Engine, File Backup Tools, and Automated Maintenance Sweepers.<br><br>To confirm, please type <strong style="color: #ef4444;">REMOVE</strong> below:',
                    'REMOVE',
                    async () => {
                        removeBtn.disabled = true;
                        removeBtn.innerText = 'Removing...';
                        const proInput = document.getElementById('pm-pro-license-key');
                        if (proInput) {
                            proInput.value = '';
                            proInput.disabled = true;
                        }
                        
                        try {
                            const response = await window.FetchEngine.post('remove_license', {});
                            if (response && response.success) {
                                window.showPremiumToast(response.message, 'success');
                                const cleanUrl = window.location.href.split('#')[0];
                                setTimeout(() => window.location.href = cleanUrl + (cleanUrl.includes('?') ? '&' : '?') + 'reload=' + new Date().getTime(), 500);
                            } else {
                                window.showPremiumToast(response.error || 'Failed to remove license', 'error');
                                removeBtn.disabled = false;
                                removeBtn.innerText = 'Try Again';
                            }
                        } catch (err) {
                            window.showPremiumToast(err.message || 'Network error', 'error');
                            removeBtn.disabled = false;
                            removeBtn.innerText = 'Try Again';
                        }
                    }
                );
            });
        }
        
        // Handle Locked Tabs via event delegation
        document.addEventListener('click', function(e) {
            const label = e.target.closest('.pm-pro-locked');
            if (label && window.pmIsPro !== true) {
                e.preventDefault();
                e.stopPropagation();
                const settingsTab = document.getElementById('pm-tab-settings');
                if (settingsTab) {
                    settingsTab.checked = true;
                }
                if (window.UiEngine && typeof window.UiEngine.showToast === 'function') {
                    window.UiEngine.showToast('This feature requires Mass Utility Pro. Please activate below.', 'warning');
                } else if (typeof window.showPremiumToast === 'function') {
                    window.showPremiumToast('This feature requires Mass Utility Pro. Please activate below.', 'warning');
                }
            }
        }, true);

        // Settings Sub-tabs switching logic
        const settingsSubTabBtns = document.querySelectorAll('.pm-settings-tab-btn');
        settingsSubTabBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                settingsSubTabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const targetId = btn.getAttribute('data-sub-tab');
                const paneGeneral = document.getElementById('pm-settings-pane-general');
                const paneInfo = document.getElementById('pm-settings-pane-info');
                if (paneGeneral && paneInfo) {
                    paneGeneral.style.display = (targetId === 'pm-settings-pane-general') ? 'block' : 'none';
                    paneInfo.style.display = (targetId === 'pm-settings-pane-info') ? 'block' : 'none';
                }
            });
        });
    }

    return {
        init: init,
        hydrateSettings: hydrateSettings
    };
})();

/**
 * Project Mass - Compiled JS Bundle
 * Generated: 2026-07-19 16:16:49 UTC
 */

/* --- UiEngine.js --- */
/**
 * Project Mass - UI Engine (TX-153)
 * Handles all globally accessible UI components, modals, alerts, and toasts.
 * Engineered for cross-tab reuse and SPA structural integrity.
 */

class UiEngine {
    
    // Core DOM Getters
    static getPremiumModal = () => document.getElementById('pm-modal-premium');
    static getPremiumModalTitle = () => document.getElementById('pm-premium-modal-title');
    static getPremiumModalBody = () => document.getElementById('pm-premium-modal-body');
    static getPremiumModalInputContainer = () => document.getElementById('pm-premium-modal-input-container');
    static getPremiumModalInput = () => document.getElementById('pm-premium-modal-input');
    static getPremiumModalBtnCancel = () => document.getElementById('pm-premium-modal-btn-cancel');
    static getPremiumModalBtnConfirm = () => document.getElementById('pm-premium-modal-btn-confirm');
    static getPremiumModalCloseBtn = () => document.getElementById('pm-premium-modal-close-btn');

    static onPremiumModalConfirm = null;

    static closePremiumModal() {
        this.getPremiumModal().style.display = 'none';
        if (window.onPremiumModalClose) {
            const cb = window.onPremiumModalClose;
            window.onPremiumModalClose = null;
            cb();
        }
    }

    static initializeHooks() {
        // Only map if elements exist
        if (!this.getPremiumModalBtnConfirm()) return;
        
        this.getPremiumModalBtnConfirm().onclick = () => {
            if (this.onPremiumModalConfirm) this.onPremiumModalConfirm();
        };
        
        this.getPremiumModalBtnCancel().onclick = () => this.closePremiumModal();
        this.getPremiumModalCloseBtn().onclick = () => this.closePremiumModal();
        
        // Escape key binding for all modals
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = this.getPremiumModal();
                if (modal && modal.style.display === 'flex') {
                    this.closePremiumModal();
                }
            }
        });

        // Initialize Gemini spotlight hover tracking
        this.initializeCursorTracking();
    }

    static initializeCursorTracking() {
        let cursorTicking = false;
        
        // Use live HTMLCollections instead of static querySelectorAll. 
        // This entirely eliminates the need for an expensive MutationObserver!
        const tabs = document.getElementsByClassName('pm-tab-label');
        const subTabs = document.getElementsByClassName('pm-sub-tab-btn');
        const themeBtns = document.getElementsByClassName('pm-theme-btn');
        
        // [TX-207] Bulletproof initial state injection to prevent 0,0 hover flash on load
        const initFallback = (el) => {
            el.style.setProperty('--mouse-x', '-100px');
            el.style.setProperty('--mouse-y', '-100px');
        };
        for (let i = 0; i < tabs.length; i++) initFallback(tabs[i]);
        for (let i = 0; i < subTabs.length; i++) initFallback(subTabs[i]);
        for (let i = 0; i < themeBtns.length; i++) initFallback(themeBtns[i]);
        
        document.addEventListener('mousemove', (e) => {
            if (cursorTicking) return;
            cursorTicking = true;
            
            requestAnimationFrame(() => {
                const processNode = (el) => {
                    const rect = el.getBoundingClientRect();
                    // Distance check: only calculate inside 150px radius to save GPU overhead
                    const dx = Math.max(0, rect.left - e.clientX, e.clientX - rect.right);
                    const dy = Math.max(0, rect.top - e.clientY, e.clientY - rect.bottom);
                    
                    if (Math.sqrt(dx * dx + dy * dy) < 150) {
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        el.style.setProperty('--mouse-x', `${x}px`);
                        el.style.setProperty('--mouse-y', `${y}px`);
                    }
                };

                for (let i = 0; i < tabs.length; i++) processNode(tabs[i]);
                for (let i = 0; i < subTabs.length; i++) processNode(subTabs[i]);
                for (let i = 0; i < themeBtns.length; i++) processNode(themeBtns[i]);
                
                cursorTicking = false;
            });
        });
    }

    static showAlert(title, message, type = 'info') {
        this.getPremiumModalTitle().innerHTML = title; // nosec
        this.getPremiumModalBody().innerHTML = message; // nosec
        this.getPremiumModalInputContainer().style.display = 'none';
        this.getPremiumModalBtnCancel().style.display = 'none';
        this.getPremiumModalBtnConfirm().innerHTML = 'OK'; // nosec
        this.getPremiumModalBtnConfirm().style.backgroundColor = type === 'error' ? 'var(--pm-danger)' : 'var(--pm-success)';
        this.getPremiumModalBtnConfirm().style.boxShadow = type === 'error' ? '0 3px 8px rgba(var(--pm-danger-rgb), 0.2)' : '0 3px 8px rgba(var(--pm-success-rgb), 0.2)';
        this.getPremiumModalBtnConfirm().disabled = false;
        
        this.getPremiumModal().style.display = 'flex';
        this.onPremiumModalConfirm = () => {
            this.closePremiumModal();
        };
    }

    static showPromptModal(title, message, placeholder, onConfirmCallback) {
        this.getPremiumModalTitle().innerHTML = title; // nosec
        this.getPremiumModalBody().innerHTML = message; // nosec
        
        this.getPremiumModalInputContainer().style.display = 'block';
        this.getPremiumModalInput().value = '';
        this.getPremiumModalInput().placeholder = placeholder;
        this.getPremiumModalBtnConfirm().disabled = true;

        const onInputHandler = () => {
            if (this.getPremiumModalInput().value.trim().length > 0) {
                this.getPremiumModalBtnConfirm().disabled = false;
            } else {
                this.getPremiumModalBtnConfirm().disabled = true;
            }
        };
        this.getPremiumModalInput().oninput = onInputHandler;

        this.getPremiumModal().style.display = 'flex';
        setTimeout(() => this.getPremiumModalInput().focus(), 100);
        
        this.onPremiumModalConfirm = () => {
            const val = this.getPremiumModalInput().value.trim();
            this.closePremiumModal();
            if (onConfirmCallback) onConfirmCallback(val);
        };
    }

    static showConfirmModal(title, message, expectedPhrase, onConfirmCallback) {
        this.getPremiumModalTitle().innerHTML = title; // nosec
        this.getPremiumModalBody().innerHTML = message; // nosec
        
        if (expectedPhrase) {
            this.getPremiumModalInputContainer().style.display = 'block';
            this.getPremiumModalInput().value = '';
            this.getPremiumModalInput().placeholder = `Type '${expectedPhrase}' to confirm`;
            this.getPremiumModalBtnConfirm().disabled = true;

            const onInputHandler = () => {
                this.getPremiumModalInput().value = this.getPremiumModalInput().value.toUpperCase();
                if (this.getPremiumModalInput().value.trim().toLowerCase() === expectedPhrase.toLowerCase()) {
                    this.getPremiumModalBtnConfirm().disabled = false;
                } else {
                    this.getPremiumModalBtnConfirm().disabled = true;
                }
            };
            this.getPremiumModalInput().oninput = onInputHandler;

            this.getPremiumModalInput().onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!this.getPremiumModalBtnConfirm().disabled) {
                        this.getPremiumModalBtnConfirm().click();
                    }
                }
            };
        } else {
            this.getPremiumModalInputContainer().style.display = 'none';
            this.getPremiumModalBtnConfirm().disabled = false;
        }

        if (!onConfirmCallback) {
            this.getPremiumModalBtnCancel().style.display = 'none';
            this.getPremiumModalBtnConfirm().innerHTML = 'Close'; // nosec
            this.getPremiumModalBtnConfirm().style.backgroundColor = 'var(--pm-neutral)';
            this.getPremiumModalBtnConfirm().style.boxShadow = 'none';
        } else {
            this.getPremiumModalBtnCancel().style.display = 'block';
            this.getPremiumModalBtnConfirm().innerHTML = 'Confirm'; // nosec
            this.getPremiumModalBtnConfirm().style.backgroundColor = 'var(--pm-danger)';
            this.getPremiumModalBtnConfirm().style.boxShadow = '0 3px 8px rgba(var(--pm-danger-rgb), 0.2)';
        }

        this.getPremiumModal().style.display = 'flex';
        
        this.onPremiumModalConfirm = () => {
            this.closePremiumModal();
            if (onConfirmCallback) onConfirmCallback();
        };
    }

    static showToast(message, type = 'success') {
        const container = document.getElementById('pm-toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.style.pointerEvents = 'auto';
        toast.style.minWidth = '280px';
        toast.style.background = 'var(--pm-card-bg)';
        toast.style.backdropFilter = 'blur(12px)';
        toast.style.borderLeft = type === 'error' ? '4px solid var(--pm-danger)' : '4px solid var(--pm-success)';
        toast.style.borderTop = '1px solid var(--pm-border-color)';
        toast.style.borderRight = '1px solid var(--pm-border-color)';
        toast.style.borderBottom = '1px solid var(--pm-border-color)';
        toast.style.padding = '0.75rem 1rem';
        toast.style.borderRadius = '8px';
        toast.style.boxShadow = 'var(--pm-shadow-md)';
        toast.style.display = 'flex';
        toast.style.alignItems = 'center';
        toast.style.justifyContent = 'space-between';
        toast.style.gap = '1rem';
        toast.style.color = 'var(--pm-text-primary)';
        toast.style.fontSize = '0.85rem';
        toast.style.fontWeight = '500';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        toast.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';

        const text = document.createElement('span');
        text.innerHTML = (type === 'error' ? '&#10060; ' : '&#9989; ') + message; // nosec
        toast.appendChild(text);

        const close = document.createElement('button');
        close.innerHTML = '&times;'; // nosec
        close.style.background = 'none';
        close.style.border = 'none';
        close.style.color = 'var(--pm-text-secondary)';
        close.style.cursor = 'pointer';
        close.style.fontSize = '1.1rem';
        close.style.padding = '0';
        close.onclick = () => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 300);
        };
        toast.appendChild(close);

        container.appendChild(toast);

        // Trigger reflow/animation
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 50);

        // Auto dismiss after 4 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(-20px)';
                setTimeout(() => toast.remove(), 300);
            }
        }, 6500);
    }
}

// Global Legacy Bindings (To prevent breaking existing procedural code during transition)
window.showPremiumAlert = (...args) => UiEngine.showAlert(...args);
window.showPremiumConfirmModal = (...args) => UiEngine.showConfirmModal(...args);
window.showPremiumPromptModal = (...args) => UiEngine.showPromptModal(...args);
window.showPremiumToast = (...args) => UiEngine.showToast(...args);

// Initialize static hooks when DOM is ready

/* --- FetchEngine.js --- */
/**
 * Project Mass - Fetch Engine (Core)
 * A centralized, DRY abstraction for all backend AJAX communication.
 * Automatically handles security tokens, JSON parsing, FormData conversion, and global error shielding.
 */
class FetchEngine {
    
    /**
     * Executes a POST request to the backend API.
     * 
     * @param {string} action - The controller action to target (e.g., 'start_file_backup').
     * @param {Object|FormData} payload - The data to send. Can be a plain JS object or a pre-built FormData object.
     * @param {string} [customUrl] - Optional. The URL to hit. Defaults to window.location.href.
     * @returns {Promise<Object>} - Resolves with the parsed JSON data if successful.
     */
    static post(action, payload = {}, customUrl = null) {
        const basePath = (window.PM_CONFIG && typeof window.PM_CONFIG.basePath === 'string') ? window.PM_CONFIG.basePath : '';
        const cleanBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
        const url = customUrl || (cleanBase + '/api/v1/' + action);
        let formData;

        if (payload instanceof FormData) {
            formData = payload;
        } else {
            formData = new FormData();
            Object.keys(payload).forEach(key => {
                let value = payload[key];
                if (typeof value === 'object' && !(value instanceof File) && !(value instanceof Blob)) {
                    value = JSON.stringify(value);
                }
                formData.append(key, value);
            });
        }

        // Enforce the universal action mapping
        formData.set('ajax', '1');
        formData.set('action', action);

        // Global Security Token Injection
        if (window.PM_CONFIG && window.PM_CONFIG.securityToken) {
            formData.set('token', window.PM_CONFIG.securityToken);
        }

        return fetch(url, { method: 'POST', body: formData })
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }
                return res.json();
            })
            .then(data => {
                // Intercept logic-level failures globally
                if (!data.success) {
                    throw new Error(data.error || 'The backend returned an unknown failure state.');
                }
                return data;
            });
            // We intentionally do NOT catch the error here by default.
            // This allows specific UI components to catch it and trigger UiEngine.showAlert,
            // or we could catch it globally here if we pass a config flag. 
            // For now, we'll let the callers handle the UI presentation of the error.
    }
}

// Attach to window globally for generic legacy scopes if needed
window.FetchEngine = FetchEngine;

/* --- mass_utility.js --- */
/**
 * Project Mass - Main Dashboard Entry Point
 * Implements pre-hydration dark mode adjustments and coordinates
 * early initialization of all decoupled modules.
 */
// Pre-Hydration Dark Mode Init (TX-222)
(function() {
    const isDark = localStorage.getItem('pm-theme') === 'dark';
    if (isDark) {
        const pmThemeInterval = setInterval(() => {
            const container = document.querySelector('.pm-container');
            if (container) {
                container.classList.add('pm-dark-mode');
                clearInterval(pmThemeInterval);
            }
        }, 5);
        // Fallback clear
        setTimeout(() => clearInterval(pmThemeInterval), 5000);
    }
})();

const pmInitializeEngine = function() {
    try {
        // Asynchronous UI Hydration Pipeline (TX-174)
        if (typeof FetchEngine !== 'undefined' && typeof HydrationEngine !== 'undefined') {
            FetchEngine.post('hydrate_dashboard')
                .then(data => {
                    // Inject into PM_CONFIG global bridge
                    window.PM_CONFIG.categories = data.categories || [];
                    window.PM_CONFIG.manufacturers = data.manufacturers || [];
                    window.PM_CONFIG.profiles = data.profiles || [];
                    window.PM_CONFIG.presets = data.presets || {};
                    window.PM_CONFIG.backups = data.backups || [];
                    
                    // Hydrate DOM Grids natively
                    HydrationEngine.hydrateAll(data);
                    
                    // Initialize decoupled OOP modules AFTER DOM is populated
                    if (typeof UiEngine !== 'undefined') UiEngine.initializeHooks();
                    if (typeof FileToolsEngine !== 'undefined') FileToolsEngine.initialize();
                    if (typeof DatabaseToolsEngine !== 'undefined') DatabaseToolsEngine.initialize();
                    if (typeof DataSweeperEngine !== 'undefined') DataSweeperEngine.initialize();
                    if (typeof GoogleDriveEngine !== 'undefined') GoogleDriveEngine.initialize();
                    if (typeof PresetEngine !== 'undefined') PresetEngine.initialize();
                    if (typeof GovernorEngine !== 'undefined') GovernorEngine.initialize();
                    if (typeof HistoryEngine !== 'undefined') HistoryEngine.initialize();
                    if (typeof AstEngine !== 'undefined') AstEngine.initialize();
                    
                    if (typeof SettingsEngine !== 'undefined') {
                        SettingsEngine.init();
                        SettingsEngine.hydrateSettings(data.settings);
                    }

                    const logoutBtn = document.getElementById('pm-logout-btn');
                    if (logoutBtn) {
                        logoutBtn.onclick = () => {
                            FetchEngine.post('logout')
                                .then(() => {
                                    window.location.reload();
                                })
                                .catch(err => {
                                    console.error("Logout Failed: ", err);
                                    window.location.reload();
                                });
                        };
                    }
                })
                .catch(err => {
                    console.error("Hydration Failed: ", err);
                    alert("Dashboard Hydration Failed. See console.");
                });
        } else {
            console.error("FetchEngine or HydrationEngine is undefined. Cannot boot.");
        }
    } catch (e) {
        alert("CRITICAL JS ERROR: " + e.message);
        console.error("CRITICAL JS ERROR: ", e);
    }
};

// Bulletproof initialization poller for PrestaShop's asynchronous AJAX module loader
let pmInitAttempts = 0;
const pmInitInterval = setInterval(() => {
    // Check for a critical DOM element that is deep in the layout
    if (document.getElementById('pm-query-builder-root')) {
        clearInterval(pmInitInterval);
        pmInitializeEngine();
    } else if (pmInitAttempts > 50) {
        clearInterval(pmInitInterval);
        console.error("Project Mass Initialization Failed: DOM elements not found.");
    }
    pmInitAttempts++;
}, 100);

/* --- SettingsEngine.js --- */
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
            proCard.style.border = isPro ? '1px solid var(--pm-primary)' : '1px solid var(--pm-border-color)';
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
            removeBtn.style.display = isPro ? 'inline-flex' : 'none';
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
        if (document.getElementById('pm-setting-backup-max-count')) {
            document.getElementById('pm-setting-backup-max-count').value = settings.PM_BACKUP_MAX_COUNT || "0";
        }
        if (document.getElementById('pm-setting-backup-max-days')) {
            document.getElementById('pm-setting-backup-max-days').value = settings.PM_BACKUP_MAX_DAYS || "0";
        }
        if (document.getElementById('pm-setting-backup-cloud-max-count')) {
            document.getElementById('pm-setting-backup-cloud-max-count').value = settings.PM_BACKUP_CLOUD_MAX_COUNT || "0";
        }
        if (document.getElementById('pm-setting-backup-cloud-max-days')) {
            document.getElementById('pm-setting-backup-cloud-max-days').value = settings.PM_BACKUP_CLOUD_MAX_DAYS || "0";
        }
        if (document.getElementById('pm-setting-backup-frequency')) {
            document.getElementById('pm-setting-backup-frequency').value = settings.PM_BACKUP_FREQUENCY || "0";
        }
        if (document.getElementById('pm-setting-backup-cron-auto')) {
            document.getElementById('pm-setting-backup-cron-auto').checked = parseInt(settings.PM_BACKUP_CRON_AUTO ?? 1) === 1;
        }

        const cronAutoCheckbox = document.getElementById('pm-setting-backup-cron-auto');
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
                        PM_CUSTOM_DISK_QUOTA_GB: document.getElementById('pm-setting-custom-quota').value || "0",
                        PM_BACKUP_MAX_COUNT: document.getElementById('pm-setting-backup-max-count').value || "0",
                        PM_BACKUP_MAX_DAYS: document.getElementById('pm-setting-backup-max-days').value || "0",
                        PM_BACKUP_CLOUD_MAX_COUNT: document.getElementById('pm-setting-backup-cloud-max-count').value || "0",
                        PM_BACKUP_CLOUD_MAX_DAYS: document.getElementById('pm-setting-backup-cloud-max-days').value || "0",
                        PM_BACKUP_FREQUENCY: document.getElementById('pm-setting-backup-frequency').value || "0",
                        PM_BACKUP_CRON_AUTO: document.getElementById('pm-setting-backup-cron-auto').checked ? 1 : 0
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

/* --- HydrationEngine.js --- */
/**
 * Project Mass - Hydration Engine
 * Responsible for rendering initial UI grids asynchronously.
 */
const HydrationEngine = (function() {

    
    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function hydrateDatabaseTools(data) {
        // 1. Checkboxes
        ['catalog', 'stock_attributes', 'pricing_taxes', 'customers_orders', 'system_settings'].forEach(domain => {
            let groupId = 'pm-group-' + domain.split('_')[0];
            if (domain === 'system_settings') groupId = 'pm-group-system';
            const groupDiv = document.getElementById(groupId);
            if (!groupDiv) return;
            
            let html = '';
            if (data.categorized_tables && data.categorized_tables[domain]) {
                data.categorized_tables[domain].forEach(tbl => {
                    html += `<label style="display: block; margin: 0.2rem 0; cursor: pointer; font-family: monospace; font-size: 0.75rem; overflow-wrap: anywhere;">
                        <input type="checkbox" class="pm-table-checkbox" data-domain="${domain}" value="${tbl}" ${domain === 'catalog' ? 'checked' : ''}> ${tbl}
                    </label>`;
                });
            }
            groupDiv.innerHTML = html; // nosec
            
            const link = document.querySelector(`.pm-toggle-group-link[data-group="${groupId}"]`);
            if (link && data.categorized_tables && data.categorized_tables[domain]) {
                link.textContent = `Show Tables (${data.categorized_tables[domain].length})`;
            }
        });

        // 2. DB Backups
        if (typeof pmRenderAllGrids === 'function') {
            pmRenderAllGrids(data.backups || []);
        }
    }

    function hydrateFileTools(data) {
        if (typeof FileToolsEngine !== 'undefined' && FileToolsEngine.renderGrid) {
            FileToolsEngine.renderGrid(data.fileBackups || []);
        }
    }

    function hydrateLogs(data) {
        const pre = document.getElementById('pm-log-terminal');
        if (pre && data.log_content) {
            pre.textContent = data.log_content;
        }
        const mutTerm = document.getElementById('pm-mutation-log-terminal');
        if (mutTerm && data.log_content) {
            mutTerm.textContent = data.log_content;
        }
    }

    return {
        hydrateAll: function(data) {
            hydrateDatabaseTools(data);
            hydrateFileTools(data);
            hydrateLogs(data);
        }
    };
})();

/* --- FileToolsEngine.js --- */
/**
 * Project Mass - File Tools Engine (TX-153)
 * Handles File Backup generation, verification, and deletion.
 */
class FileToolsEngine {

    static initialize() {
        this.bindGenerateBackup();
        this.bindClearBackups();
        this.bindTableEvents();
        this.bindProfileSelect();
        this.loadDirectoryExclusions();
    }

    static bindProfileSelect() {
        const select = document.getElementById('pm-file-backup-profile');
        if (select) {
            select.addEventListener('change', () => {
                this.updateCheckboxesBasedOnProfile();
            });
        }
    }

    static bindGenerateBackup() {
        const btnFileBackup = document.getElementById('pm-btn-start-file-backup');
        if (!btnFileBackup) return;

        btnFileBackup.addEventListener('click', () => {
            UiEngine.showConfirmModal(
                'Confirm File Backup Execution',
                'You are about to initiate a file system archive sequence targeting the selected files and directories.<br><br>If the chosen profile contains many files, this can temporarily spike CPU utilization and IOPS on your server.<br><br>Are you sure you want to proceed?<br><br><span style="color: var(--pm-text-secondary); font-size: 0.9rem;">To confirm, please type <strong style="color: var(--pm-danger);">EXECUTE</strong> in the text box below.</span>',
                'EXECUTE',
                () => {
                    btnFileBackup.disabled = true;
                    btnFileBackup.innerHTML = '⚙️ Initializing Engine...'; // nosec
            
            const container = document.getElementById('pm-file-backup-progress-container');
            const bar = document.getElementById('pm-file-backup-progress-bar');
            const text = document.getElementById('pm-file-backup-progress-text');
            const percent = document.getElementById('pm-file-backup-progress-percent');
            
            const stopBtn = document.getElementById('pm-btn-stop-file-backup');
            if (stopBtn) {
                stopBtn.style.display = 'inline-block';
                stopBtn.disabled = false;
            }
            
            container.style.display = 'block';
            bar.style.width = '0%';
            text.innerText = 'Scanning file system...';
            percent.innerText = '0%';

            const selectProfile = document.getElementById('pm-file-backup-profile');
            const profileVal = selectProfile ? selectProfile.value : 'full';

            FetchEngine.post('start_file_backup', { profile: profileVal })
            .then(data => {
                text.innerText = 'Compiling archive in memory-safe chunks...';
                const jobId = data.job_id;
                let source = null;
                
                const stopBtn = document.getElementById('pm-btn-stop-file-backup');
                if (stopBtn) {
                    stopBtn.disabled = false;
                    stopBtn.onclick = () => {
                        stopBtn.disabled = true;
                        text.innerText = 'Cancelling backup...';
                        FetchEngine.post('cancel_job', { job_id: jobId })
                        .then(() => {
                            window.showPremiumToast('Cancellation request sent.', 'success');
                        })
                        .catch(err => {
                            UiEngine.showAlert('Cancellation Error', err.message);
                        });
                    };
                }
                
                const handleStateUpdate = (d) => {
                    bar.style.width = d.progress + '%';
                    percent.innerText = Math.round(d.progress) + '%';
                    text.innerText = d.status_text || `Archived ${d.processed_items} of ${d.total_items} files`;
                    
                    if (d.status === 'completed') {
                        if (source) source.close();
                        btnFileBackup.innerHTML = '✅ Backup Completed!'; // nosec
                        bar.style.width = '100%';
                        percent.innerText = '100%';
                        
                        const stopBtn = document.getElementById('pm-btn-stop-file-backup');
                        if (stopBtn) stopBtn.style.display = 'none';
                        
                        setTimeout(() => {
                            btnFileBackup.innerHTML = '📥 Generate Site Backup'; // nosec
                            btnFileBackup.disabled = false;
                            if (container) container.style.display = 'none';
                            if (d.backups) this.renderGrid(d.backups);
                        }, 3000);
                        return true;
                    } else if (d.status === 'cancelled') {
                        if (source) source.close();
                        btnFileBackup.innerHTML = '🛑 Backup Cancelled'; // nosec
                        
                        const stopBtn = document.getElementById('pm-btn-stop-file-backup');
                        if (stopBtn) stopBtn.style.display = 'none';
                        
                        if (container) container.style.display = 'none';
                        window.showPremiumToast('Backup cancelled successfully.', 'warning');
                        setTimeout(() => {
                            btnFileBackup.innerHTML = '📥 Generate Site Backup'; // nosec
                            btnFileBackup.disabled = false;
                            if (d.backups) this.renderGrid(d.backups);
                        }, 2000);
                        return true;
                    } else if (d.status === 'failed') {
                        throw new Error(d.error || 'Backup worker failed.');
                    }
                    return false;
                };

                const runAjaxPollingFallback = () => {
                    const poll = () => {
                        FetchEngine.post('poll_job_progress', { job_id: jobId })
                        .then(d => {
                            if (d.error) {
                                  throw new Error(d.error);
                            }
                            const isFinished = handleStateUpdate(d);
                            if (!isFinished) {
                                  setTimeout(poll, 1500);
                            }
                        })
                        .catch(err => {
                            UiEngine.showAlert('Archive Engine Error', err.message);
                            btnFileBackup.innerHTML = '❌ Backup Failed'; // nosec
                            btnFileBackup.disabled = false;
                            
                            const stopBtn = document.getElementById('pm-btn-stop-file-backup');
                            if (stopBtn) stopBtn.style.display = 'none';
                            
                            if (container) container.style.display = 'none';
                        });
                    };
                    setTimeout(poll, 1500);
                };

                if (window.EventSource) {
                    try {
                        const sseUrl = new URL(window.location.href);
                        sseUrl.searchParams.set('ajax', '1');
                        sseUrl.searchParams.set('action', 'stream_job_progress');
                        sseUrl.searchParams.set('job_id', jobId);
                        if (window.PM_CONFIG && window.PM_CONFIG.securityToken) {
                            sseUrl.searchParams.set('token', window.PM_CONFIG.securityToken);
                        }
                        
                        source = new EventSource(sseUrl.toString());
                        
                        source.onmessage = function(event) {
                            try {
                                const d = JSON.parse(event.data);
                                if (d.success === false) {
                                    throw new Error(d.error || 'SSE stream reported a failure.');
                                }
                                handleStateUpdate(d);
                            } catch (err) {
                                if (source) source.close();
                                UiEngine.showAlert('Archive Engine Error', err.message);
                                btnFileBackup.innerHTML = '❌ Backup Failed'; // nosec
                                btnFileBackup.disabled = false;
                                
                                const stopBtn = document.getElementById('pm-btn-stop-file-backup');
                                if (stopBtn) stopBtn.style.display = 'none';
                                
                                if (container) container.style.display = 'none';
                            }
                        };
                        
                        source.onerror = function() {
                            if (source) source.close();
                            source = null;
                            runAjaxPollingFallback();
                        };
                    } catch (e) {
                        runAjaxPollingFallback();
                    }
                } else {
                    runAjaxPollingFallback();
                }
            })
            .catch(err => {
                UiEngine.showAlert('Engine Boot Error', err.message);
                btnFileBackup.innerHTML = '❌ Initialization Failed'; // nosec
                btnFileBackup.disabled = false;
            });
                }
            );
        });
    }

    static bindClearBackups() {
        const btnClearFileBackups = document.getElementById('pm-btn-clear-file-backups');
        if (!btnClearFileBackups) return;

        btnClearFileBackups.addEventListener('click', () => {
            UiEngine.showConfirmModal('Clear All File Backups?', 'Are you sure you want to permanently delete all generated ZIP archives? This cannot be undone. To confirm, please type <strong style="color: var(--pm-danger);">CLEAR</strong> below:', 'CLEAR', () => {
                FetchEngine.post('clear_file_backups')
                .then(data => {
                    this.renderGrid(data.backups || []);
                })
                .catch(err => {
                    UiEngine.showAlert('Error', err.message);
                });
            });
        });
    }

    static bindTableEvents() {
        const fileBackupsTable = document.getElementById('pm-file-backups-table');
        if (!fileBackupsTable) return;

        fileBackupsTable.addEventListener('click', (e) => {
            const btnDelete = e.target.closest('.pm-btn-delete-file-backup');
            if (btnDelete) {
                const backupName = btnDelete.getAttribute('data-backup');
                UiEngine.showConfirmModal('Delete File Archive?', `Are you sure you want to delete ${backupName}?`, 'DELETE', () => {
                    FetchEngine.post('delete_file_backup', { file: backupName })
                    .then(data => {
                        FileToolsEngine.renderGrid(data.backups || []);
                    })
                    .catch(err => {
                        UiEngine.showAlert('Error', err.message);
                    });
                });
                return;
            }

            const btnPin = e.target.closest('.pm-btn-pin-file, .pm-btn-unpin-file');
            if (btnPin) {
                const backupName = btnPin.getAttribute('data-backup');
                btnPin.disabled = true;
                FetchEngine.post('toggle_pin_file_backup', { file: backupName })
                .then(data => {
                    if (data.success) {
                        window.showPremiumToast(data.pinned ? '📌 Backup pinned successfully' : '📌 Backup unpinned');
                        FileToolsEngine.renderGrid(data.backups || []);
                    } else {
                        window.showPremiumToast(data.error || 'Failed to toggle pin', 'error');
                        btnPin.disabled = false;
                    }
                })
                .catch(err => {
                    window.showPremiumToast('Network error while toggling pin', 'error');
                    btnPin.disabled = false;
                });
                return;
            }

            const btnVerify = e.target.closest('.pm-btn-verify-backup');
            if (btnVerify) {
                const backupName = btnVerify.getAttribute('data-backup');
                const originalHtml = btnVerify.innerHTML;
                btnVerify.innerHTML = '⏳ Verifying...'; // nosec
                btnVerify.disabled = true;

                FetchEngine.post('verify_backup_integrity', { file: backupName })
                .then(data => {
                    btnVerify.innerHTML = originalHtml; // nosec
                    btnVerify.disabled = false;
                    UiEngine.showAlert('Cryptographic Integrity Verified', data.message, 'success');
                })
                .catch(err => {
                    btnVerify.innerHTML = originalHtml; // nosec
                    btnVerify.disabled = false;
                    UiEngine.showAlert('Corruption Detected', err.message, 'error');
                });
            }
        });
    }

    static renderGrid(backups) {
        const table = document.getElementById('pm-file-backups-table');
        if (!table) return;

        // Remove all existing tbody elements
        table.querySelectorAll('tbody').forEach(tb => tb.remove());

        if (!backups || backups.length === 0) {
            const emptyTbody = document.createElement('tbody');
            emptyTbody.innerHTML = /* nosec */ `
                <tr class="pm-empty-row">
                    <td colspan="4" style="padding: 0;">
                        <div class="pm-empty-state" style="margin: 0; border: none; border-radius: 0; background: transparent;">
                            <div class="pm-empty-state-icon">&#128193;</div>
                            <div class="pm-empty-state-text">No File Backups Found</div>
                            <div class="pm-empty-state-subtext">The historical backups repository is currently empty.</div>
                        </div>
                    </td>
                </tr>`; // nosec
            table.appendChild(emptyTbody);
            return;
        }
        const adminUrl = window.PM_CONFIG ? window.PM_CONFIG.adminModulesUrl : '';

        const escapeHtml = (str) => {
            if (!str) return '';
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        };

        backups.forEach(b => {
            const isUploaded = b.is_uploaded;
            let pill = '';
            let borderColor = '';
            let bgColor = '';
            
            if (!b.is_local && b.is_cloud) {
                pill = `<span class="pm-status-pill pm-base-status-badge" style="background: rgba(var(--pm-purple-rgb), 0.1); color: var(--pm-purple); font-size: 0.65rem; padding: 0.15rem 0.4rem; letter-spacing: 0; display: inline-block;">☁️ Cloud Only</span>`;
                borderColor = 'var(--pm-purple)'; bgColor = 'rgba(var(--pm-purple-rgb), 0.02)';
            } else if (isUploaded) {
                pill = `<span class="pm-status-pill pm-base-status-badge" style="background: rgba(var(--pm-purple-rgb), 0.1); color: var(--pm-purple); font-size: 0.65rem; padding: 0.15rem 0.4rem; letter-spacing: 0; display: inline-block;">&#128194; Uploaded</span>`;
                borderColor = 'var(--pm-purple)'; bgColor = 'rgba(var(--pm-purple-rgb), 0.02)';
            } else {
                pill = `<span class="pm-status-pill success pm-base-status-badge" style="font-size: 0.65rem; padding: 0.15rem 0.4rem; letter-spacing: 0; display: inline-block;">&#128190; Local</span>`;
            }

            const durationBadge = b.duration ? `<span style="font-size: 0.65rem; color: var(--pm-text-secondary); display: inline-flex; align-items: center; gap: 0.2rem;"><span style="font-weight:600; color:var(--pm-text-primary);">Completed In:</span> ${escapeHtml(String(b.duration))}</span>` : '';

            const entryTbody = document.createElement('tbody');
            entryTbody.className = 'pm-backup-entry';
            if (borderColor) {
                entryTbody.style.borderLeft = '4px solid ' + borderColor;
                entryTbody.style.background = bgColor;
            }

            const trData = document.createElement('tr');
            trData.className = 'pm-data-row';
            trData.setAttribute('data-is-local', (b.is_local !== false) ? 'true' : 'false');
            trData.setAttribute('data-is-cloud', b.is_cloud ? 'true' : 'false');
            if (borderColor) { trData.style.borderLeft = '4px solid ' + borderColor; trData.style.background = bgColor; }

            const safeName = escapeHtml(b.basename);
            const safeSize = escapeHtml(String(b.size));

            let dateStr = '';
            if (b.timestamp) {
                const d = new Date(b.timestamp * 1000);
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const h = String(d.getHours()).padStart(2, '0');
                const min = String(d.getMinutes()).padStart(2, '0');
                const s = String(d.getSeconds()).padStart(2, '0');
                dateStr = y + '-' + m + '-' + day + ' ' + h + ':' + min + ':' + s;
            }
            
            let actionsHtml = `
                <a href="${b.archive_download_url}" class="pm-btn pm-btn-sm" title="Download Backup">⬇️ Download</a>
                ${b.has_log ? `
                <a href="${b.log_download_url}" class="pm-btn pm-btn-sm pm-btn-neutral" title="Download Log">📄 Log</a>
                ` : ''}
            `;
            if (b.hash) {
                actionsHtml = `
                <button type="button" class="pm-btn pm-btn-sm pm-btn-verify-backup pm-btn-success" data-backup="${safeName}" title="Verify Integrity">
                    🛡️ Verify
                </button>
                ` + actionsHtml;
            }
            if (b.is_local) {
                const pinText = b.is_pinned ? '📌 Unpin' : '📌 Pin';
                const pinClass = b.is_pinned ? 'pm-btn-unpin-file pm-btn-success' : 'pm-btn-pin-file pm-btn-neutral';
                actionsHtml += `
                <button type="button" class="pm-btn pm-btn-sm pm-btn-delete-file-backup pm-btn-danger" data-backup="${safeName}" title="Delete Local">
                    🗑️ Delete
                </button>
                <button type="button" class="pm-btn pm-btn-sm ${pinClass}" data-backup="${safeName}" title="Toggle Pin">
                    ${pinText}
                </button>
                `;
            } else {
                actionsHtml += `
                <button type="button" class="pm-btn pm-btn-sm pm-btn-cloud-restore pm-btn-purple" data-backup="${safeName}" data-type="file" title="Restore Local">
                    ☁️ Restore
                </button>
                `;
            }

            trData.innerHTML = /* nosec */ `
                <td style="vertical-align: middle;">
                    <div>
                        <div class="pm-flex-center pm-gap-2 pm-flex-wrap" style="justify-content: flex-start; gap: 0.5rem; display: inline-flex; vertical-align: middle;">
                            <span class="pm-truncated-filename" style="font-family: monospace; font-weight: 600; color: var(--pm-text-primary);" data-full-name="${safeName}">
                                ${safeName}
                            </span>
                            <span class="pm-copy-trigger" style="cursor: pointer; font-size: 0.95rem; opacity: 0.6; transition: opacity 0.2s;" data-copy="${safeName}" title="Copy to clipboard">📋</span>
                        </div>
                        <div class="pm-backup-badges" style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.25rem;">
                            ${pill}
                            ${durationBadge}
                        </div>
                    </div>
                </td>
                <td><span class="pm-badge pm-bg-primary-light" style="color: var(--pm-primary);">${safeSize}</span></td>
                <td class="pm-text-muted pm-text-sm" style="vertical-align: middle;">
                    ${dateStr}
                </td>
                <td style="vertical-align: middle; text-align: right;">
                    <div class="pm-actions-group" style="justify-content: flex-end; display: inline-flex; max-width: none !important;">
                        ${actionsHtml}
                    </div>
                </td>
            `; // nosec
            entryTbody.appendChild(trData);
            table.appendChild(entryTbody);
        });
        if (typeof GoogleDriveEngine !== 'undefined') {
            GoogleDriveEngine.updateGridsUI();
        }
    }

    static loadDirectoryExclusions() {
        const container = document.getElementById('pm-directory-tree-container');
        if (!container) return;

        FetchEngine.post('get_directory_tree')
        .then(data => {
            if (!data.success || !data.directories) {
                container.innerHTML = `<div style="padding: 1rem 0; color: var(--pm-danger);">Failed to load directories: ${data.error || 'Unknown error'}</div>`; // nosec
                return;
            }
            container.innerHTML = ''; // nosec
            
            if (data.directories.length === 0) {
                container.innerHTML = `<div style="padding: 1rem 0; text-align: center; color: var(--pm-text-secondary);">No directories found.</div>`; // nosec
                return;
            }
            
            this.directoryItems = data.directories;
            
            const list = document.createElement('div');
            list.style.display = 'grid';
            list.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
            list.style.gap = '0.75rem';

            data.directories.forEach(item => {
                const label = document.createElement('label');
                label.className = 'pm-exclusion-item';
                label.style.display = 'flex';
                label.style.alignItems = 'center';
                label.style.justifyContent = 'space-between';
                label.style.padding = '0.75rem 1rem';
                label.style.borderRadius = '8px';
                label.style.background = 'rgba(255,255,255,0.02)';
                label.style.border = '1px solid rgba(255,255,255,0.05)';
                label.style.cursor = 'pointer';
                label.style.transition = 'all 0.2s ease';
                label.style.margin = '0';
                
                label.addEventListener('mouseenter', () => {
                    if (label.style.cursor !== 'not-allowed') {
                        label.style.background = 'rgba(255,255,255,0.04)';
                        label.style.borderColor = 'rgba(255,255,255,0.1)';
                    }
                });
                label.addEventListener('mouseleave', () => {
                    if (label.style.cursor !== 'not-allowed') {
                        label.style.background = 'rgba(255,255,255,0.02)';
                        label.style.borderColor = 'rgba(255,255,255,0.05)';
                    }
                });

                const left = document.createElement('div');
                left.style.display = 'flex';
                left.style.alignItems = 'center';
                left.style.gap = '0.75rem';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = item.path;
                checkbox.checked = !item.is_excluded;
                checkbox.className = 'pm-exclusion-checkbox';
                checkbox.style.width = '1.2rem';
                checkbox.style.height = '1.2rem';
                checkbox.style.cursor = 'inherit';
                checkbox.style.margin = '0';
                checkbox.style.accentColor = 'var(--pm-primary)';

                const iconSpan = document.createElement('span');
                iconSpan.innerHTML = '📁'; // nosec
                iconSpan.style.fontSize = '1.1rem';

                const textSpan = document.createElement('span');
                textSpan.innerText = item.name;
                textSpan.style.fontWeight = '500';
                textSpan.style.color = 'var(--pm-text-primary)';
                textSpan.style.wordBreak = 'break-all';

                left.appendChild(checkbox);
                left.appendChild(iconSpan);
                left.appendChild(textSpan);

                const right = document.createElement('div');
                right.style.display = 'flex';
                right.style.alignItems = 'center';
                right.style.gap = '0.5rem';

                const countBadge = document.createElement('span');
                countBadge.innerText = `${item.file_count} files`;
                countBadge.style.fontSize = '0.75rem';
                countBadge.style.color = 'var(--pm-text-secondary)';
                countBadge.style.background = 'rgba(255,255,255,0.05)';
                countBadge.style.padding = '0.2rem 0.4rem';
                countBadge.style.borderRadius = '4px';

                const sizeBadge = document.createElement('span');
                sizeBadge.innerText = item.size_formatted;
                sizeBadge.style.fontSize = '0.75rem';
                sizeBadge.style.fontWeight = '600';
                sizeBadge.style.color = 'var(--pm-primary)';
                sizeBadge.style.background = 'rgba(var(--pm-primary-rgb), 0.1)';
                sizeBadge.style.padding = '0.2rem 0.4rem';
                sizeBadge.style.borderRadius = '4px';

                right.appendChild(countBadge);
                right.appendChild(sizeBadge);

                label.appendChild(left);
                label.appendChild(right);
                list.appendChild(label);
            });

            container.appendChild(list);
            this.bindExclusionsEvents();
            this.updateCheckboxesBasedOnProfile();
        })
        .catch(err => {
            container.innerHTML = `<div style="padding: 1rem 0; color: var(--pm-danger);">Error fetching directories: ${err.message}</div>`; // nosec
        });
    }

    static bindExclusionsEvents() {
        const container = document.getElementById('pm-directory-tree-container');
        if (!container) return;
        
        container.querySelectorAll('.pm-exclusion-checkbox').forEach(cb => {
            cb.addEventListener('change', () => {
                const uncheckedPaths = Array.from(container.querySelectorAll('.pm-exclusion-checkbox:not(:checked)'))
                    .map(input => input.value);
                
                // Update local state so switching back keeps choices
                if (this.directoryItems) {
                    this.directoryItems.forEach(d => {
                        d.is_excluded = uncheckedPaths.includes(d.path);
                    });
                }
                
                FetchEngine.post('save_exclusions', { exclusions: JSON.stringify(uncheckedPaths) })
                .then(data => {
                    if (data.success) {
                        window.showPremiumToast('Backup settings auto-saved.', 'success');
                    } else {
                        window.showPremiumToast(data.error || 'Failed to auto-save settings', 'error');
                    }
                })
                .catch(err => {
                    window.showPremiumToast('Error saving settings: ' + err.message, 'error');
                });
            });
        });
    }

    static updateCheckboxesBasedOnProfile() {
        const profileSelect = document.getElementById('pm-file-backup-profile');
        const container = document.getElementById('pm-directory-tree-container');
        const infoDiv = document.getElementById('pm-profile-override-info');
        
        if (!profileSelect || !container || !this.directoryItems) return;
        
        const profile = profileSelect.value;
        const isCustom = (profile === 'custom');
        
        if (infoDiv) {
            infoDiv.style.display = isCustom ? 'none' : 'flex';
        }
        
        let forcedExclusions = [];
        let forcedInclusions = [];
        
        if (profile === 'core') {
            forcedExclusions = ['/img', '/themes', '/modules', '/upload', '/download'];
        } else if (profile === 'core_media') {
            forcedExclusions = ['/themes', '/modules'];
        } else if (profile === 'themes_modules') {
            forcedInclusions = ['/themes', '/modules'];
        } else if (profile === 'media') {
            forcedInclusions = ['/img', '/upload', '/download'];
        }
        
        container.querySelectorAll('.pm-exclusion-item').forEach(label => {
            const cb = label.querySelector('.pm-exclusion-checkbox');
            if (!cb) return;
            const path = cb.value;
            
            let isChecked = false;
            let itemData = this.directoryItems.find(d => d.path === path);
            let globallyExcluded = itemData ? itemData.is_excluded : false;
            
            if (isCustom) {
                isChecked = !globallyExcluded;
            } else {
                if (profile === 'full') {
                    isChecked = !globallyExcluded;
                } else if (profile === 'themes_modules' || profile === 'media') {
                    let isForcedInclude = false;
                    for (let inc of forcedInclusions) {
                        if (path.startsWith(inc)) {
                            isForcedInclude = true;
                            break;
                        }
                    }
                    isChecked = isForcedInclude && !globallyExcluded;
                } else {
                    // core or core_media
                    let isForcedExclude = false;
                    for (let exc of forcedExclusions) {
                        if (path.startsWith(exc)) {
                            isForcedExclude = true;
                            break;
                        }
                    }
                    isChecked = !isForcedExclude && !globallyExcluded;
                }
            }
            
            cb.checked = isChecked;
            cb.disabled = !isCustom;
            
            if (!isCustom) {
                label.style.opacity = isChecked ? '0.85' : '0.4';
                label.style.cursor = 'not-allowed';
                label.style.background = isChecked ? 'rgba(59, 130, 246, 0.05)' : 'rgba(255,255,255,0.01)';
                label.style.borderColor = isChecked ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.01)';
            } else {
                label.style.opacity = '1';
                label.style.cursor = 'pointer';
                label.style.background = 'rgba(255,255,255,0.02)';
                label.style.borderColor = 'rgba(255,255,255,0.05)';
            }
        });
    }
}

// Global binding for backward compatibility if needed outside
window.pmRenderFileBackupsGrid = (backups) => FileToolsEngine.renderGrid(backups);

/* --- DatabaseToolsEngine.js --- */
/**
 * Project Mass - Database Tools Engine
 * Handles full database backup, table selection, and the AJAX SQL restoration/import wizard.
 */
const DatabaseToolsEngine = (function() {

    // --- Private Methods & Event Listeners ---
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
                // B1. Customize Tables Drawer Toggle
                const customizeBtn = document.getElementById('pm-btn-customize-tables');
                const customizerDrawer = document.getElementById('pm-tables-customizer');
                if (customizeBtn && customizerDrawer) {
                    customizeBtn.addEventListener('click', function() {
                        const isHidden = (customizerDrawer.style.display === 'none');
                        customizerDrawer.style.display = isHidden ? 'block' : 'none';
                        customizeBtn.style.backgroundColor = isHidden ? 'var(--pm-primary-hover)' : 'var(--pm-neutral)';
                    });
                }

                // Toggle individual sub-tables view link
                const toggleGroupLinks = document.querySelectorAll('.pm-toggle-group-link');
                toggleGroupLinks.forEach(link => {
                    link.addEventListener('click', function(e) {
                        e.preventDefault();
                        const groupDiv = document.getElementById(link.getAttribute('data-group'));
                        if (groupDiv) {
                            const isHidden = (groupDiv.style.display === 'none');
                            groupDiv.style.display = isHidden ? 'block' : 'none';
                            link.textContent = isHidden ? 'Hide Tables' : 'Show Tables (' + groupDiv.querySelectorAll('input').length + ')';
                        }
                    });
                });

                // Bind Restore Log Terminal Save & Clear buttons
                const btnSaveRestoreLog = document.getElementById('pm-btn-save-restore-log');
                if (btnSaveRestoreLog) {
                    btnSaveRestoreLog.addEventListener('click', function() {
                        const logTerminal = document.getElementById('pm-restore-log-terminal');
                        if (logTerminal) {
                            const text = logTerminal.textContent;
                            const blob = new Blob([text], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'database_restore_execution.log';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                        }
                    });
                }

                const btnClearRestoreLog = document.getElementById('pm-btn-clear-restore-log');
                if (btnClearRestoreLog) {
                    btnClearRestoreLog.addEventListener('click', function() {
                        const logTerminal = document.getElementById('pm-restore-log-terminal');
                        if (typeof FetchEngine !== 'undefined') {
                            FetchEngine.post('clear_saas_log')
                            .then(data => {
                                if (data.success) {
                                    if (logTerminal) {
                                        logTerminal.textContent = 'Diagnostics terminal cleared.\n';
                                    }
                                    showPremiumToast('Diagnostics log cleared.');
                                }
                            })
                            .catch(err => console.error('Error clearing console log: ', err));
                        } else {
                            if (logTerminal) {
                                logTerminal.textContent = 'Diagnostics terminal cleared.\n';
                            }
                        }
                    });
                }

                // Check/Uncheck entire domain group when domain select is clicked
                const domainSelects = document.querySelectorAll('.pm-domain-select');
                domainSelects.forEach(ds => {
                    ds.addEventListener('change', function() {
                        const domain = ds.getAttribute('data-domain');
                        const checkboxes = document.querySelectorAll('.pm-table-checkbox[data-domain="' + domain + '"]');
                        checkboxes.forEach(cb => {
                            cb.checked = ds.checked;
                        });
                        updateSelectAllState();
                    });
                });

                // Use event delegation for dynamically hydrated table checkboxes
                document.addEventListener('change', function(e) {
                    if (e.target && e.target.classList.contains('pm-table-checkbox')) {
                        const cb = e.target;
                        const domain = cb.getAttribute('data-domain');
                        const ds = document.querySelector('.pm-domain-select[data-domain="' + domain + '"]');
                        if (ds) {
                            const siblings = document.querySelectorAll('.pm-table-checkbox[data-domain="' + domain + '"]');
                            const allChecked = Array.from(siblings).every(s => s.checked);
                            const someChecked = Array.from(siblings).some(s => s.checked);
                            ds.checked = allChecked;
                            ds.indeterminate = someChecked && !allChecked;
                        }
                        updateSelectAllState();
                    }
                });

                // Select All Tables (Full Backup) logic
                const selectAllTablesCheckbox = document.getElementById('pm-select-all-tables');
                if (selectAllTablesCheckbox) {
                    selectAllTablesCheckbox.addEventListener('change', function() {
                        const isChecked = selectAllTablesCheckbox.checked;
                        domainSelects.forEach(ds => {
                            ds.checked = isChecked;
                            ds.indeterminate = false;
                        });
                        document.querySelectorAll('.pm-table-checkbox').forEach(cb => {
                            cb.checked = isChecked;
                        });
                    });
                }

                function updateSelectAllState() {
                    if (selectAllTablesCheckbox) {
                        const currentCheckboxes = document.querySelectorAll('.pm-table-checkbox');
                        if (currentCheckboxes.length > 0) {
                            const allChecked = Array.from(currentCheckboxes).every(cb => cb.checked);
                            const someChecked = Array.from(currentCheckboxes).some(cb => cb.checked);
                            selectAllTablesCheckbox.checked = allChecked;
                            selectAllTablesCheckbox.indeterminate = someChecked && !allChecked;
                        }
                    }
                }

                // B. AJAX Backup triggering logic
                const backupBtn = document.getElementById('pm-btn-backup');
                if (backupBtn) {
                    backupBtn.addEventListener('click', function() {
                        // Collect all checked individual tables
                        const checkedTables = [];
                        document.querySelectorAll('.pm-table-checkbox:checked').forEach(cb => {
                            checkedTables.push(cb.value);
                        });

                        if (checkedTables.length === 0) {
                            showPremiumAlert('Selection Required', 'You must select at least one database table to archive.');
                            return;
                        }

                        showPremiumConfirmModal(
                            'Confirm Backup Execution',
                             `You are about to initiate a heavy database Gzip archive sequence targeting <strong>${checkedTables.length} tables</strong>.<br><br>If your database is gigabytes in size, this can temporarily spike CPU utilization and IOPS on your server.<br><br>Are you sure you want to proceed?<br><br><span style="color: var(--pm-text-secondary); font-size: 0.9rem;">To confirm, please type <strong style="color: var(--pm-danger);">EXECUTE</strong> in the text box below.</span>`,
                            'EXECUTE',
                            () => {
                                backupBtn.disabled = true;
                                const originalText = backupBtn.innerHTML;
                                backupBtn.innerHTML = '&#9881;&#65039; Compiling Archive...'; // nosec
                                
                                const progressContainer = document.getElementById('pm-backup-progress-container');
                                const progressBar = document.getElementById('pm-backup-progress-bar');
                                const progressText = document.getElementById('pm-backup-progress-text');
                                const progressPercent = document.getElementById('pm-backup-progress-percent');
                                
                                if (progressContainer) progressContainer.style.display = 'block';
                                if (progressBar) {
                                    progressBar.style.animation = 'none';
                                    progressBar.style.width = '0%';
                                }
                                if (progressText) progressText.innerText = 'Initializing database backup job...';
                                if (progressPercent) progressPercent.innerText = '0%';
                                
                                 FetchEngine.post('create_backup', { tables: JSON.stringify(checkedTables) })
                                    .then(data => {
                                        const jobId = data.job_id;
                                        let source = null;
                                        
                                        const stopBtn = document.getElementById('pm-btn-stop-backup');
                                        if (stopBtn) {
                                            stopBtn.disabled = false;
                                            stopBtn.onclick = () => {
                                                stopBtn.disabled = true;
                                                if (progressText) progressText.innerText = 'Cancelling backup...';
                                                FetchEngine.post('cancel_job', { job_id: jobId })
                                                    .then(() => {
                                                        showPremiumToast('Cancellation request sent.');
                                                    })
                                                    .catch(err => {
                                                        showPremiumAlert('Cancellation Error', err.message);
                                                    });
                                            };
                                        }
                                        
                                        const handleStateUpdate = (d) => {
                                            if (progressBar) progressBar.style.width = d.progress + '%';
                                            if (progressPercent) progressPercent.innerText = Math.round(d.progress) + '%';
                                            if (progressText) progressText.innerText = d.status_text || `Dumping tables: ${d.processed_items} of ${d.total_items} tables...`;
                                            
                                            if (d.status === 'completed') {
                                                if (source) source.close();
                                                backupBtn.disabled = false;
                                                backupBtn.innerHTML = originalText; // nosec
                                                if (progressContainer) progressContainer.style.display = 'none';
                                                showPremiumToast('Table catalog backup archive compiled: ' + d.basename);
                                                pmRenderAllGrids(d.backups);
                                                return true;
                                            } else if (d.status === 'cancelled') {
                                                if (source) source.close();
                                                backupBtn.disabled = false;
                                                backupBtn.innerHTML = originalText; // nosec
                                                if (progressContainer) progressContainer.style.display = 'none';
                                                showPremiumToast('Backup cancelled successfully.', 'warning');
                                                pmRenderAllGrids(d.backups);
                                                return true;
                                            } else if (d.status === 'failed') {
                                                throw new Error(d.error || 'Database backup worker failed.');
                                            }
                                            return false;
                                        };

                                        const runAjaxPollingFallback = () => {
                                            const poll = () => {
                                                FetchEngine.post('poll_job_progress', { job_id: jobId })
                                                    .then(d => {
                                                        if (d.error) {
                                                            throw new Error(d.error);
                                                        }
                                                        const isFinished = handleStateUpdate(d);
                                                        if (!isFinished) {
                                                            setTimeout(poll, 1500);
                                                        }
                                                    })
                                                    .catch(err => {
                                                        backupBtn.disabled = false;
                                                        backupBtn.innerHTML = originalText; // nosec
                                                        if (progressContainer) progressContainer.style.display = 'none';
                                                        showPremiumAlert('Database Backup Error', err.message);
                                                     });
                                            };
                                            setTimeout(poll, 1000);
                                        };

                                        if (window.EventSource) {
                                            try {
                                                const sseUrl = new URL(window.location.href);
                                                sseUrl.searchParams.set('ajax', '1');
                                                sseUrl.searchParams.set('action', 'stream_job_progress');
                                                sseUrl.searchParams.set('job_id', jobId);
                                                if (window.PM_CONFIG && window.PM_CONFIG.securityToken) {
                                                    sseUrl.searchParams.set('token', window.PM_CONFIG.securityToken);
                                                }
                                                
                                                source = new EventSource(sseUrl.toString());
                                                
                                                source.onmessage = function(event) {
                                                    try {
                                                        const d = JSON.parse(event.data);
                                                        if (d.success === false) {
                                                            throw new Error(d.error || 'SSE stream reported a failure.');
                                                        }
                                                        handleStateUpdate(d);
                                                    } catch (err) {
                                                        if (source) source.close();
                                                        backupBtn.disabled = false;
                                                        backupBtn.innerHTML = originalText; // nosec
                                                        if (progressContainer) progressContainer.style.display = 'none';
                                                        showPremiumAlert('Database Backup Error', err.message);
                                                    }
                                                };
                                                
                                                source.onerror = function() {
                                                    if (source) source.close();
                                                    source = null;
                                                    runAjaxPollingFallback();
                                                };
                                            } catch (e) {
                                                runAjaxPollingFallback();
                                            }
                                        } else {
                                            runAjaxPollingFallback();
                                        }
                                    })
                                    .catch(error => {
                                        backupBtn.disabled = false;
                                        backupBtn.innerHTML = originalText; // nosec
                                        if (progressContainer) progressContainer.style.display = 'none';
                                        showPremiumAlert('Database Backup Initialization Error', error.message);
                                    });
                            }
                        );
                    });
                }

                // C. AJAX Compare drift triggers
                document.addEventListener('click', function(e) {
                    const btn = e.target.closest('.pm-btn-compare');
                    if (!btn) return;
                    
                    const backupName = btn.getAttribute('data-backup');
                    btn.disabled = true;
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '&#9889; Checking...'; // nosec

                    FetchEngine.post('compare_backup', { file: backupName })
                        .then(data => {
                            btn.disabled = false;
                            btn.innerHTML = originalText; // nosec
                            window.PM_LAST_COMPARE = data;
                            window.pmRenderKeySyncAuditModal(data);
                        })
                        .catch(error => {
                            btn.disabled = false;
                            btn.innerHTML = originalText; // nosec
                        });
                });

                // D. AJAX Delete triggers
                let backupToDelete = '';

                document.addEventListener('click', function(e) {
                    const btn = e.target.closest('.pm-btn-delete');
                    if (!btn) return;
                    
                    backupToDelete = btn.getAttribute('data-backup');
                    
                    showPremiumConfirmModal(
                        'Confirm Permanent Deletion',
                        `Are you sure you want to permanently delete the backup and logs for <strong style="color: var(--pm-text-primary);">${backupToDelete}</strong>?<br><br>This operation cannot be undone. To confirm, please type <strong style="color: var(--pm-danger);">DELETE</strong> in the box below:`,
                        'DELETE',
                        () => {
                            FetchEngine.post('delete_backup', { file: backupToDelete })
                                .then(data => {
                                    showPremiumToast('Success! Backup and matched logs permanently deleted.');
                                    pmRenderAllGrids(data.backups || []);
                                });
                        }
                    );
                });
 
                document.addEventListener('click', function(e) {
                    const btn = e.target.closest('.pm-btn-pin, .pm-btn-unpin');
                    if (!btn) return;
                    
                    const backupFile = btn.getAttribute('data-backup');
                    btn.disabled = true;
                    FetchEngine.post('toggle_pin_backup', { file: backupFile })
                        .then(data => {
                            if (data.success) {
                                showPremiumToast(data.pinned ? '📌 Backup pinned successfully' : '📌 Backup unpinned');
                                pmRenderAllGrids(data.backups || []);
                            } else {
                                showPremiumToast(data.error || 'Failed to toggle pin', 'error');
                                btn.disabled = false;
                            }
                        })
                        .catch(err => {
                            showPremiumToast('Network error while toggling pin', 'error');
                            btn.disabled = false;
                        });
                });



                // J. Database Restore / Import Staging & Chunk Execution Loop
                 function pmRenderAllGrids(backups) {
                     window.PM_CONFIG.backups = backups || [];
                     
                     const escapeHtml = (str) => {
                         if (!str) return '';
                         return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                     };
                     
                     const restoreList = document.getElementById('pm-restore-local-list');
                     const backupsTable = document.getElementById('pm-backups-table');
                     
                     if (restoreList) restoreList.innerHTML = ''; // nosec
                     if (backupsTable) {
                         backupsTable.querySelectorAll('tbody').forEach(tb => tb.remove());
                     }
                     
                     let hasBackups = false;
 
                     if (!backups || backups.length === 0) {
                         if (restoreList) {
                             restoreList.innerHTML = /* nosec */ `
                                 <tr class="pm-empty-row">
                                     <td colspan="4" style="padding: 0;">
                                         <div class="pm-empty-state" style="margin: 0; border: none; border-radius: 0; background: transparent;">
                                             <div class="pm-empty-state-icon">&#128193;</div>
                                             <div class="pm-empty-state-text">No Local Backups Found</div>
                                             <div class="pm-empty-state-subtext">No local database backups are available to restore.</div>
                                         </div>
                                     </td>
                                 </tr>`; // nosec
                         }
                         if (backupsTable) {
                             const emptyTbody = document.createElement('tbody');
                             emptyTbody.innerHTML = /* nosec */ `
                                 <tr class="pm-empty-row">
                                     <td colspan="5" style="padding: 0;">
                                         <div class="pm-empty-state" style="margin: 0; border: none; border-radius: 0; background: transparent;">
                                             <div class="pm-empty-state-icon">&#128193;</div>
                                             <div class="pm-empty-state-text">No Database Backups Found</div>
                                             <div class="pm-empty-state-subtext">The historical backups repository is currently empty.</div>
                                         </div>
                                     </td>
                                 </tr>`; // nosec
                             backupsTable.appendChild(emptyTbody);
                         }
                         return;
                     }
 
                     backups.forEach(b => {
                         let pill = ''; 
                         let borderColor = ''; 
                         let bgColor = '';
                         const isCatalog = true; // All generated backups are now catalog backups since mock data is removed
                         const isUploaded = b.is_uploaded || b.basename.indexOf('import_tmp') > -1;
 
                         // Unified date formatting — mirrors HydrationEngine.js rendering path
                         let dateStr = b.date;
                         if (typeof dateStr === 'number') {
                             const d = new Date(dateStr * 1000);
                             dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
                         }
                         dateStr = dateStr || 'Unknown Date';
 
                         // Unified size formatting — mirrors HydrationEngine.js rendering path
                         const size = typeof b.sql_size === 'number' ? ((b.sql_size / 1024) / 1024).toFixed(2) + ' MB' : (b.sql_size || 'Unknown Size');
 
                         if (!b.is_local && b.is_cloud) {
                             pill = `<span class="pm-status-pill pm-base-status-badge" style="background: rgba(var(--pm-purple-rgb), 0.1); color: var(--pm-purple); font-size: 0.65rem; padding: 0.15rem 0.4rem; letter-spacing: 0; display: inline-block;">☁️ Cloud Only</span>`;
                             borderColor = 'var(--pm-purple)'; bgColor = 'rgba(var(--pm-purple-rgb), 0.02)';
                         } else if (isUploaded) {
                             pill = `<span class="pm-status-pill pm-base-status-badge" style="background: rgba(var(--pm-purple-rgb), 0.1); color: var(--pm-purple); font-size: 0.65rem; padding: 0.15rem 0.4rem; letter-spacing: 0; display: inline-block;">&#128194; Uploaded</span>`;
                             borderColor = 'var(--pm-purple)'; bgColor = 'rgba(var(--pm-purple-rgb), 0.02)';
                         } else {
                             pill = `<span class="pm-status-pill success pm-base-status-badge" style="font-size: 0.65rem; padding: 0.15rem 0.4rem; letter-spacing: 0; display: inline-block;">&#128190; Local</span>`;
                         }
                         
                         const durationBadge = b.duration ? `<span style="font-size: 0.65rem; color: var(--pm-text-secondary); display: inline-flex; align-items: center; gap: 0.2rem;"><span style="font-weight:600; color:var(--pm-text-primary);">Completed In:</span> ${b.duration}</span>` : '';
 
                         // 1. Restore Sub-tab List Entry (All types as table rows)
                         if (restoreList) {
                             const trRestore = document.createElement('tr');
                             trRestore.className = 'pm-data-row pm-backup-entry';
                             if (borderColor) { trRestore.style.borderLeft = '4px solid ' + borderColor; trRestore.style.background = bgColor; }
                             
                             const restoreButtonHtml = b.is_local ? 
                                 `<button type="button" class="pm-btn pm-btn-sm pm-btn-restore-trigger pm-btn-danger" data-backup="${escapeHtml(b.basename)}">⚡ Restore</button>` :
                                 `<button type="button" class="pm-btn pm-btn-sm pm-btn-cloud-restore pm-btn-purple" data-backup="${escapeHtml(b.basename)}" data-type="database">☁️ Restore</button>`;
 
                             trRestore.innerHTML = /* nosec */ `
                                 <td style="vertical-align: middle;">
                                     <div>
                                         <div class="pm-flex-center pm-gap-2 pm-flex-wrap" style="justify-content: flex-start; gap: 0.5rem; display: inline-flex; vertical-align: middle;">
                                             <span class="pm-truncated-filename" style="font-family: monospace; font-weight: 600; color: var(--pm-text-primary);" data-full-name="${escapeHtml(b.basename)}">
                                                 ${escapeHtml(b.basename)}
                                             </span>
                                             <span class="pm-copy-trigger" style="cursor: pointer; font-size: 0.95rem; opacity: 0.6; transition: opacity 0.2s;" data-copy="${escapeHtml(b.basename)}" title="Copy to clipboard">📋</span>
                                         </div>
                                         <div class="pm-backup-badges" style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.25rem;">
                                             ${pill}
                                             ${durationBadge}
                                         </div>
                                     </div>
                                 </td>
                                 <td style="color: var(--pm-text-secondary); vertical-align: middle;">${size}</td>
                                 <td style="color: var(--pm-text-secondary); vertical-align: middle;">${dateStr}</td>
                                 <td style="vertical-align: middle; text-align: right;">
                                     <div class="pm-actions-group" style="justify-content: flex-end; display: inline-flex; max-width: none !important;">
                                         ${restoreButtonHtml}
                                         <button type="button" class="pm-btn pm-btn-sm pm-btn-delete-trigger pm-btn-neutral" data-backup="${escapeHtml(b.basename)}">🗑️ Delete</button>
                                     </div>
                                 </td>
                             `; // nosec
                             restoreList.appendChild(trRestore);
                         }
 
                         const trData = document.createElement('tr');
                         trData.className = 'pm-data-row';
                         trData.setAttribute('data-is-local', (b.is_local !== false) ? 'true' : 'false');
                         trData.setAttribute('data-is-cloud', b.is_cloud ? 'true' : 'false');
                         if (borderColor) { trData.style.borderLeft = '4px solid ' + borderColor; trData.style.background = bgColor; }
 
                         let actionsHtml = `
                             <a href="${b.sql_download_url}" class="pm-btn pm-btn-sm" title="Download SQL">⬇️ SQL</a>
                             ${b.log_filename ? `<a href="${b.log_download_url}" class="pm-btn pm-btn-sm pm-btn-neutral" title="Download Log">📄 Log</a>` : ''}
                         `;
                         if (isCatalog) {
                             actionsHtml += `<button type="button" class="pm-btn pm-btn-sm pm-btn-compare pm-btn-purple" data-backup="${escapeHtml(b.basename)}" title="Compare Diff">🔍 Diff</button>`;
                         }
                         if (b.is_local !== false) {
                              const pinText = b.is_pinned ? '📌 Unpin' : '📌 Pin';
                              const pinClass = b.is_pinned ? 'pm-btn-unpin pm-btn-success' : 'pm-btn-pin pm-btn-neutral';
                              actionsHtml += `<button type="button" class="pm-btn pm-btn-sm pm-btn-delete pm-btn-danger" data-backup="${escapeHtml(b.basename)}" title="Delete Local">🗑️ Delete</button>`;
                              actionsHtml += `<button type="button" class="pm-btn pm-btn-sm ${pinClass}" data-backup="${escapeHtml(b.basename)}" title="Toggle Pin">${pinText}</button>`;
                          } else {
                              actionsHtml += `<button type="button" class="pm-btn pm-btn-sm pm-btn-cloud-restore pm-btn-purple" data-backup="${escapeHtml(b.basename)}" data-type="database" title="Restore Local">☁️ Restore</button>`;
                          }

                        trData.innerHTML = /* nosec */ `
                            <td style="vertical-align: middle;">
                                <div>
                                    <div class="pm-flex-center pm-gap-2 pm-flex-wrap" style="justify-content: flex-start; gap: 0.5rem; display: inline-flex; vertical-align: middle;">
                                        <span class="pm-truncated-filename" style="font-family: monospace; font-weight: 600; color: var(--pm-text-primary);" data-full-name="${escapeHtml(b.basename)}">
                                            ${escapeHtml(b.basename)}
                                        </span>
                                        <span class="pm-copy-trigger" style="cursor: pointer; font-size: 0.95rem; opacity: 0.6; transition: opacity 0.2s;" data-copy="${escapeHtml(b.basename)}" title="Copy to clipboard">📋</span>
                                    </div>
                                    <div class="pm-backup-badges" style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.25rem;">
                                        ${pill}
                                        ${durationBadge}
                                    </div>
                                </div>
                            </td>
                            <td style="color: var(--pm-text-secondary); vertical-align: middle;">${size}</td>
                            <td style="color: var(--pm-text-secondary); vertical-align: middle;">${typeof b.log_size === 'number' ? (b.log_size / 1024).toFixed(2) + ' KB' : b.log_size}</td>
                            <td style="vertical-align: middle;">${dateStr}</td>
                            <td style="vertical-align: middle; text-align: right;">
                                <div class="pm-actions-group" style="justify-content: flex-end; display: inline-flex; max-width: none !important;">
                                    ${actionsHtml}
                                </div>
                            </td>
                        `; // nosec

                        if (isCatalog || isUploaded) {
                            if (backupsTable) {
                                const entryTbody = document.createElement('tbody');
                                entryTbody.className = 'pm-backup-entry';
                                if (borderColor) {
                                    entryTbody.style.borderLeft = '4px solid ' + borderColor;
                                    entryTbody.style.background = bgColor;
                                }
                                entryTbody.appendChild(trData);
                                backupsTable.appendChild(entryTbody);
                                hasBackups = true;
                            }
                        }
                    });

                    if (!hasBackups && backupsTable) {
                        const emptyTbody = document.createElement('tbody');
                        emptyTbody.innerHTML = /* nosec */ `
                            <tr class="pm-empty-row">
                                <td colspan="4" style="padding: 0;">
                                    <div class="pm-empty-state" style="margin: 0; border: none; border-radius: 0; background: transparent;">
                                        <div class="pm-empty-state-icon">&#128193;</div>
                                        <div class="pm-empty-state-text">No Database Backups Found</div>
                                        <div class="pm-empty-state-subtext">The historical backups repository is currently empty.</div>
                                    </div>
                                </td>
                            </tr>`; // nosec
                        backupsTable.appendChild(emptyTbody);
                    }
                    
                    if (restoreList) {
                        restoreList.querySelectorAll('.pm-btn-restore-trigger').forEach(btn => {
                            btn.addEventListener('click', function() { initiateDatabaseRestore(this.getAttribute('data-backup')); });
                        });
                        restoreList.querySelectorAll('.pm-btn-delete-trigger').forEach(btn => {
                            btn.addEventListener('click', function() {
                                const backupToDelete = this.getAttribute('data-backup');
                                showPremiumConfirmModal('Purge Archive', `Are you sure you want to permanently delete <strong style="color: var(--pm-text-primary);">${backupToDelete}</strong>?<br><br>This operation cannot be undone. To confirm, please type <strong style="color: #ef4444;">DELETE</strong> in the box below:`, 'DELETE', () => {
                                    FetchEngine.post('delete_backup', { file: backupToDelete })
                                    .then(data => {
                                        showPremiumToast('Archive permanently deleted.');
                                        pmRenderAllGrids(data.backups);
                                    }).catch(err => showPremiumAlert('Connection Error', err.message, 'error'));
                                });
                            });
                        });
                    }
                    if (typeof GoogleDriveEngine !== 'undefined') {
                        GoogleDriveEngine.updateGridsUI();
                    }
                }
                // Sub-tabs switching logic (3-panel: Backup | Profiler | Restore)
                const subTabBtns = document.querySelectorAll('#pm-content-database .pm-sub-tab-btn');
                subTabBtns.forEach(btn => {
                    btn.addEventListener('click', function() {
                        subTabBtns.forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');

                        const targetId = btn.getAttribute('data-sub-tab');
                        document.getElementById('pm-sub-content-backup').style.display = (targetId === 'pm-sub-content-backup') ? 'block' : 'none';
                        document.getElementById('pm-sub-content-profiler').style.display = (targetId === 'pm-sub-content-profiler') ? 'block' : 'none';
                        document.getElementById('pm-sub-content-restore').style.display = (targetId === 'pm-sub-content-restore') ? 'block' : 'none';
                        document.getElementById('pm-sub-content-sweeper').style.display = (targetId === 'pm-sub-content-sweeper') ? 'block' : 'none';

                        if (targetId === 'pm-sub-content-profiler') {
                            const gradeEl = document.getElementById('pm-db-grade');
                            if (gradeEl && gradeEl.textContent === '-') {
                                pmFetchDbProfile();
                            }
                        }
                    });
                });

                const runProfileBtn = document.getElementById('pm-btn-run-profile');
                if (runProfileBtn) {
                    runProfileBtn.addEventListener('click', function() {
                        pmFetchDbProfile();
                    });
                }

                function pmFetchDbProfile() {
                    if (runProfileBtn) {
                        runProfileBtn.disabled = true;
                        runProfileBtn.innerHTML = '⚙️ Analyzing...'; // nosec
                    }

                    FetchEngine.post('profile_database')
                        .then(data => {
                            if (runProfileBtn) {
                                runProfileBtn.disabled = false;
                                runProfileBtn.innerHTML = '🔄 Refresh Profile Analysis'; // nosec
                            }

                            if (!data.success) {
                                showPremiumAlert('Analysis Failed', data.error || 'Failed to profile database.', 'error');
                                return;
                            }

                            const gradeEl = document.getElementById('pm-db-grade');
                            const gradeLabelEl = document.getElementById('pm-db-grade-label');
                            const totalFreeEl = document.getElementById('pm-db-total-free');
                            const fragRatioEl = document.getElementById('pm-db-frag-ratio');
                            const tablesCountEl = document.getElementById('pm-db-tables-count');

                            if (gradeEl) {
                                gradeEl.textContent = data.summary.grade;
                                if (data.summary.grade === 'A') gradeEl.style.color = '#10b981';
                                else if (data.summary.grade === 'B') gradeEl.style.color = '#3b82f6';
                                else if (data.summary.grade === 'C') gradeEl.style.color = '#f59e0b';
                                else gradeEl.style.color = '#ef4444';
                            }
                            if (gradeLabelEl) {
                                if (data.summary.grade === 'A') gradeLabelEl.textContent = 'Excellent Health';
                                else if (data.summary.grade === 'B') gradeLabelEl.textContent = 'Good Health';
                                else if (data.summary.grade === 'C') gradeLabelEl.textContent = 'Minor Fragmentation';
                                else gradeLabelEl.textContent = 'Action Required';
                            }
                            if (totalFreeEl) totalFreeEl.textContent = (data.summary.total_free / 1024 / 1024).toFixed(2) + ' MB';
                            if (fragRatioEl) fragRatioEl.textContent = data.summary.ratio.toFixed(2) + '%';
                            if (tablesCountEl) tablesCountEl.textContent = data.summary.total_tables + ' tables monitored';

                            const tableTbody = document.querySelector('#pm-db-profiler-table tbody');
                            if (tableTbody) {
                                if (data.fragmented_tables.length === 0) {
                                    tableTbody.innerHTML = /* nosec */ `
                                        <tr class="pm-empty-row">
                                            <td colspan="6" style="padding: 0;">
                                                <div class="pm-empty-state" style="margin: 0; border: none; border-radius: 0; background: transparent;">
                                                    <div class="pm-empty-state-icon" style="color: #10b981;">🎉</div>
                                                    <div class="pm-empty-state-text">No Fragmentation Detected</div>
                                                    <div class="pm-empty-state-subtext">All PrestaShop tables are optimized! Health grade: A</div>
                                                </div>
                                            </td>
                                        </tr>`; // nosec
                                } else {
                                    let html = '';
                                    data.fragmented_tables.forEach(t => {
                                        const sizeMb = (t.size / 1024 / 1024).toFixed(2) + ' MB';
                                        const freeMb = (t.free / 1024 / 1024).toFixed(2) + ' MB';
                                        
                                        html += `<tr>
                                            <td style="font-family: monospace; font-weight: 600; color: var(--pm-text-primary); vertical-align: middle;">${escapeHtml(t.name)}</td>
                                            <td style="color: var(--pm-text-secondary); vertical-align: middle;">${escapeHtml(t.engine)}</td>
                                            <td style="color: var(--pm-text-secondary); vertical-align: middle;">${sizeMb}</td>
                                            <td style="color: #f59e0b; font-weight: 600; vertical-align: middle;">${freeMb}</td>
                                            <td style="vertical-align: middle;"><span class="pm-badge" style="background: rgba(245, 158, 11, 0.1); color: #f59e0b;">${t.ratio}%</span></td>
                                            <td style="vertical-align: middle;">
                                                <button type="button" class="pm-btn pm-btn-success pm-text-xs pm-btn-optimize" data-table="${escapeHtml(t.name)}" style="padding: 0.3rem 0.6rem;">
                                                    ⚡ Optimize
                                                </button>
                                            </td>
                                        </tr>`;
                                    });
                                    tableTbody.innerHTML = html; // nosec

                                    tableTbody.querySelectorAll('.pm-btn-optimize').forEach(btn => {
                                        btn.addEventListener('click', function() {
                                            const tableName = this.getAttribute('data-table');
                                            pmOptimizeTable(tableName, this);
                                        });
                                    });
                                }
                            }
                        })
                        .catch(error => {
                            if (runProfileBtn) {
                                runProfileBtn.disabled = false;
                                runProfileBtn.innerHTML = '🔄 Refresh Profile Analysis'; // nosec
                            }
                        });
                }

                function pmOptimizeTable(tableName, btnEl) {
                    showPremiumConfirmModal(
                         'Confirm Table Optimization',
                         `Are you sure you want to optimize table <strong style="color: var(--pm-text-primary);">${escapeHtml(tableName)}</strong>?<br><br>MySQL will recreate the table to reclaim unused disk space and rebuild indexes. During this brief operation, the table may be locked.`,
                         null,
                         () => {
                             btnEl.disabled = true;
                             btnEl.innerHTML = '⚙️ Optimizing...'; // nosec
                             FetchEngine.post('optimize_table', { table: tableName })
                                 .then(data => {
                                     showPremiumToast(`Successfully optimized table: ${tableName}`);
                                     pmFetchDbProfile();
                                 })
                                 .catch(err => {
                                     btnEl.disabled = false;
                                     btnEl.innerHTML = '⚡ Optimize'; // nosec
                                 });
                         }
                    );
                }



                function initiateDatabaseRestore(backupName) {
                    showPremiumConfirmModal(
                        'Database Overwrite Verification',
                        `You are about to overwrite active database catalog tables with: <strong>${backupName}</strong>.<br><br><span style="color: #ef4444; font-weight: bold;">CRITICAL WARNING:</span> This will DROP existing active tables and recreate them. This operation cannot be canceled once started.<br><br>To proceed, please type <strong style="color: #ef4444;">RESTORE</strong> below:`,
                        'RESTORE',
                        () => {
                            startRestoreExecution(backupName);
                        }
                    );
                }

                function startRestoreExecution(backupName) {
                    const hud = document.getElementById('pm-restore-hud');
                    const percentText = document.getElementById('pm-restore-percent');
                    const progressBar = document.getElementById('pm-restore-progress-bar');
                    const statsExecuted = document.getElementById('pm-restore-stats-executed');
                    const statsAction = document.getElementById('pm-restore-stats-action');
                    const hudState = document.getElementById('pm-restore-hud-state');
                    const logTerminal = document.getElementById('pm-restore-log-terminal');
                    const alertContainer = document.getElementById('pm-restore-shop-alert');

                    if (hud) hud.style.display = 'block';
                    if (alertContainer) alertContainer.style.display = 'none';
                    if (logTerminal) logTerminal.textContent = 'STAGE 1: Enforcing safety bounds. Putting shop to Maintenance...\n';
                    if (statsAction) statsAction.textContent = 'Enforcing safety...';
                    if (hudState) hudState.textContent = 'STAGE 1: PRE-FLIGHT';
                    
                    if (hud) {
                        hud.scrollIntoView({ behavior: 'smooth' });
                    }

                    FetchEngine.post('prepare_restore', { backup_name: backupName })
                        .then(prepData => {

                            const totalStatements = prepData.statement_count;
                            const wasShopEnabled = prepData.was_shop_enabled;
                            
                            logTerminal.textContent += `Success: Staged ${totalStatements} SQL statements.\n`;
                            logTerminal.textContent += `STAGE 2: Commencing chunked execution loop (Chunk size: 100 queries)...\n`;
                            
                            let currentOffset = 0;
                            const limit = 100;
                            
                            function executeNextChunk() {
                                if (currentOffset >= totalStatements) {
                                    finalizeRestore(backupName, wasShopEnabled);
                                    return;
                                }

                                if (statsAction) statsAction.textContent = `Queries: ${currentOffset} to ${Math.min(totalStatements, currentOffset + limit)}`;
                                if (hudState) hudState.textContent = `STAGE 2: REBUILDING (${currentOffset} / ${totalStatements})`;

                                FetchEngine.post('execute_restore_chunk', { backup_name: backupName, offset: currentOffset, limit: limit })
                                    .then(chunkData => {

                                        const executed = chunkData.executed_count;
                                        currentOffset = chunkData.new_offset;
                                        
                                        const percent = Math.min(100, Math.round((currentOffset / totalStatements) * 100));
                                        if (percentText) percentText.textContent = percent + '%';
                                        if (progressBar) progressBar.style.width = percent + '%';
                                        if (statsExecuted) statsExecuted.textContent = `${currentOffset} / ${totalStatements}`;
                                        
                                        logTerminal.textContent += `Executed statement chunk: queries ${currentOffset - executed} to ${currentOffset} completed successfully.\n`;
                                        logTerminal.scrollTop = logTerminal.scrollHeight;

                                        executeNextChunk();
                                    })
                                    .catch(err => {
                                        logTerminal.textContent += `\nCRITICAL FAILURE: ${err.message}\n`;
                                        logTerminal.scrollTop = logTerminal.scrollHeight;
                                        if (statsAction) {
                                            statsAction.textContent = 'CRASHED';
                                            statsAction.style.color = '#ef4444';
                                        }
                                        if (hudState) {
                                            hudState.textContent = 'FAILURE';
                                            hudState.className = 'pm-status-pill danger';
                                        }
                                        showPremiumAlert('Restoration Failed', 'Restoration sequence failed! Check terminal logs for detailed queries diagnostic.', 'error');
                                    });
                            }

                            executeNextChunk();
                        })
                        .catch(err => {
                            logTerminal.textContent += `\nCRITICAL PRE-FLIGHT ERROR: ${err.message}\n`;
                            logTerminal.scrollTop = logTerminal.scrollHeight;
                            if (statsAction) {
                                statsAction.textContent = 'CRASHED';
                                statsAction.style.color = '#ef4444';
                            }
                            showPremiumAlert('Pre-Flight Failure', 'Staging preparation failed: ' + err.message, 'error');
                        });
                }

                function finalizeRestore(backupName, wasShopEnabled) {
                    const percentText = document.getElementById('pm-restore-percent');
                    const progressBar = document.getElementById('pm-restore-progress-bar');
                    const statsAction = document.getElementById('pm-restore-stats-action');
                    const hudState = document.getElementById('pm-restore-hud-state');
                    const logTerminal = document.getElementById('pm-restore-log-terminal');
                    const alertContainer = document.getElementById('pm-restore-shop-alert');

                    if (percentText) percentText.textContent = '100%';
                    if (progressBar) progressBar.style.width = '100%';
                    if (statsAction) statsAction.textContent = 'Finalizing...';
                    if (hudState) hudState.textContent = 'STAGE 3: FINALIZATION';
                    
                    FetchEngine.post('complete_restore', { backup_name: backupName, was_shop_enabled: wasShopEnabled ? 1 : 0 })
                        .then(data => {
                            logTerminal.textContent += `\nSUCCESS: Database restoration sequence completed smoothly!\n`;
                            logTerminal.scrollTop = logTerminal.scrollHeight;
                            
                            if (statsAction) {
                                statsAction.textContent = 'SUCCESS';
                                statsAction.style.color = '#10b981';
                            }
                            if (hudState) {
                                hudState.textContent = 'COMPLETE';
                                hudState.className = 'pm-status-pill success';
                            }

                            const generalTerminal = document.getElementById('pm-log-terminal');
                            if (generalTerminal && data.log_content) {
                                generalTerminal.textContent = data.log_content;
                            }

                            if (data.shop_status === 'MAINTENANCE') {
                                if (alertContainer) alertContainer.style.display = 'block';
                            } else {
                                showPremiumToast('Success! Catalog database restored and store set LIVE.');
                            }
                        });
                }

                // K. External SQL Drag & Drop File Upload Stager
                const dropzone = document.getElementById('pm-restore-dropzone');
                const fileInput = document.getElementById('pm-restore-file-input');
                const fileNameSpan = document.getElementById('pm-restore-file-name');
                const btnUploadStage = document.getElementById('pm-btn-upload-stage');
                
                let selectedFile = null;

                if (dropzone && fileInput && btnUploadStage) {
                    dropzone.addEventListener('click', () => fileInput.click());
                    
                    dropzone.addEventListener('dragover', (e) => {
                        e.preventDefault();
                        dropzone.style.background = 'rgba(59, 130, 246, 0.04)';
                        dropzone.style.borderColor = '#3b82f6';
                    });
                    
                    dropzone.addEventListener('dragleave', () => {
                        dropzone.style.background = 'var(--pm-input-bg)';
                        dropzone.style.borderColor = 'var(--pm-border-color)';
                    });
                    
                    dropzone.addEventListener('drop', (e) => {
                        e.preventDefault();
                        dropzone.style.background = 'var(--pm-input-bg)';
                        dropzone.style.borderColor = 'var(--pm-border-color)';
                        
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                            handleFileSelected(e.dataTransfer.files[0]);
                        }
                    });
                    
                    fileInput.addEventListener('change', (e) => {
                        if (e.target.files && e.target.files.length > 0) {
                            handleFileSelected(e.target.files[0]);
                        }
                    });
                    
                    function handleFileSelected(file) {
                        const ext = file.name.split('.').pop().toLowerCase();
                        if (ext !== 'sql' && ext !== 'gz') {
                            alert('Invalid file format. Please select a valid .sql or .sql.gz file.');
                            selectedFile = null;
                            fileNameSpan.textContent = 'Click or drag SQL/GZ file here...';
                            btnUploadStage.disabled = true;
                            return;
                        }
                        
                        selectedFile = file;
                        fileNameSpan.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
                        btnUploadStage.disabled = false;
                    }
                    
                    let currentUploadXhr = null;
                    const btnUploadCancel = document.getElementById('pm-btn-upload-cancel');
                    const uploadProgressContainer = document.getElementById('pm-upload-progress-container');
                    const uploadProgressBar = document.getElementById('pm-upload-progress-bar');
                    const uploadPercent = document.getElementById('pm-upload-percent');

                    if (btnUploadCancel) {
                        btnUploadCancel.addEventListener('click', () => {
                            if (currentUploadXhr) {
                                currentUploadXhr.abort();
                                currentUploadXhr = null;
                            }
                            
                            btnUploadStage.disabled = false;
                            btnUploadStage.innerHTML = '📤 Upload & Stage'; // nosec
                            btnUploadCancel.style.display = 'none';
                            uploadProgressContainer.style.display = 'none';
                            uploadProgressBar.style.width = '0%';
                            uploadPercent.textContent = '0%';
                            
                            selectedFile = null;
                            fileNameSpan.textContent = 'Click or drag SQL/GZ file here...';
                            btnUploadStage.disabled = true;
                            document.getElementById('pm-restore-file-input').value = '';
                        });
                    }

                    btnUploadStage.addEventListener('click', () => {
                        if (!selectedFile) return;
                        
                        btnUploadStage.disabled = true;
                        const originalText = btnUploadStage.innerHTML;
                        btnUploadStage.innerHTML = '📤 Uploading...'; // nosec
                        
                        btnUploadCancel.style.display = 'block';
                        uploadProgressContainer.style.display = 'block';
                        uploadProgressBar.style.width = '0%';
                        uploadPercent.textContent = '0%';
                        
                        const formData = new FormData();
                        formData.append('file', selectedFile);
                        
                        currentUploadXhr = new XMLHttpRequest();
                        currentUploadXhr.open('POST', window.location.href + '&ajax=1&action=upload_restore_file');
                        
                        currentUploadXhr.upload.onprogress = function(event) {
                            if (event.lengthComputable) {
                                const percentComplete = Math.round((event.loaded / event.total) * 100);
                                uploadProgressBar.style.width = percentComplete + '%';
                                uploadPercent.textContent = percentComplete + '%';
                            }
                        };
                        
                        currentUploadXhr.onload = function() {
                            currentUploadXhr = null;
                            btnUploadStage.disabled = false;
                            btnUploadStage.innerHTML = originalText; // nosec
                            btnUploadCancel.style.display = 'none';
                            uploadProgressContainer.style.display = 'none';
                            
                            if (this.status >= 200 && this.status < 300) {
                                try {
                                    const data = JSON.parse(this.responseText);
                                    if (data.success) {
                                        showPremiumToast(data.message);
                                        pmRenderAllGrids(data.backups || []);
                                        
                                        selectedFile = null;
                                        fileNameSpan.textContent = 'Click or drag SQL/GZ file here...';
                                        btnUploadStage.disabled = true;
                                        document.getElementById('pm-restore-file-input').value = '';
                                    } else {
                                        showPremiumAlert('Upload Failed', data.error, 'danger');
                                    }
                                } catch(e) {
                                    showPremiumAlert('Upload Failed', 'Invalid server response.', 'danger');
                                }
                            } else {
                                showPremiumAlert('Upload Failed', 'Server error ' + this.status, 'danger');
                            }
                        };
                        
                        currentUploadXhr.onerror = function() {
                            currentUploadXhr = null;
                            btnUploadStage.disabled = false;
                            btnUploadStage.innerHTML = originalText; // nosec
                            btnUploadCancel.style.display = 'none';
                            uploadProgressContainer.style.display = 'none';
                            showPremiumAlert('Network Error', 'A network error occurred during upload.', 'danger');
                        };
                        
                        currentUploadXhr.send(formData);
                    });
                }

                // L. Maintenance Mode Manual Live Engager
                const btnSetLive = document.getElementById('pm-btn-restore-set-live');
                if (btnSetLive) {
                    btnSetLive.addEventListener('click', function() {
                        btnSetLive.disabled = true;
                        FetchEngine.post('set_shop_live')
                            .then(data => {
                                btnSetLive.disabled = false;
                                showPremiumToast(data.message);
                                const alertContainer = document.getElementById('pm-restore-shop-alert');
                                if (alertContainer) alertContainer.style.display = 'none';
                            })
                            .catch(err => {
                                btnSetLive.disabled = false;
                            });
                    });
                }



                const btnClearBackups = document.getElementById('pm-btn-clear-backups');
                if (btnClearBackups) {
                    btnClearBackups.addEventListener('click', function() {
                        if (!window.PM_CONFIG.backups || window.PM_CONFIG.backups.length === 0) {
                            showPremiumAlert('Nothing to Clear', 'There is nothing to clear. No backup archives are currently stored.', 'info');
                            return;
                        }
                        showPremiumConfirmModal(
                            'Clear All Backups',
                            'You are about to permanently purge all generated local Gzip catalog backups. This action cannot be undone.<br><br>To proceed, please type <strong style="color: #ef4444;">CLEAR</strong> below:',
                            'CLEAR',
                            () => {
                                FetchEngine.post('clear_backup_history')
                                    .then(data => {
                                        showPremiumToast('All database backups purged successfully.');
                                        
                                        // Rebuild table body to empty
                                        pmRenderAllGrids([]);
                                    });
                            }
                        );
                    });
                }



                window.pmInspectTableDiff = function(backupName, tableName) {
                    const drawer = document.getElementById('pm-drift-detail-drawer');
                    if(drawer) drawer.style.display = 'none'; // hide drawer to focus on diff
                    
                    showPremiumToast('Fetching row-level diff for ' + tableName + '...');
                    
                    FetchEngine.post('diff_table_rows', { file: backupName, table: tableName })
                        .then(data => {
                            if (!data.diffs) {
                                showPremiumAlert('Error', 'Diff data is missing from response.', 'danger');
                                return;
                            }
                            
                            const d = data.diffs;
                            let html = `<div style="margin-bottom: 1rem; padding: 1rem; background-color: var(--pm-card-bg); border-radius: 8px; border: 1px solid var(--pm-border-color);">
                                <div style="display: flex; gap: 1rem; margin-bottom: 0.5rem;">
                                    <span style="font-size: 0.8rem;"><strong style="color: #10b981;">Added:</strong> ${escapeHtml(d.summary.added)}</span>
                                    <span style="font-size: 0.8rem;"><strong style="color: #ef4444;">Deleted:</strong> ${escapeHtml(d.summary.deleted)}</span>
                                    <span style="font-size: 0.8rem;"><strong style="color: #f59e0b;">Modified:</strong> ${escapeHtml(d.summary.modified)}</span>
                                </div>
                                <span style="font-size: 0.7rem; color: var(--pm-text-secondary);">Showing up to 50 items per category. For full data, use the Export button.</span>
                            </div>`;
 
                            // Render Modified
                            if (d.modified_rows && d.modified_rows.length > 0) {
                                html += `<h5 style="margin-top: 1rem; color: var(--pm-text-primary); font-family: 'Outfit'; border-bottom: 1px solid var(--pm-border-color); padding-bottom: 0.3rem;">Modified Rows</h5>`;
                                html += `<div style="max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.3rem;">`;
                                d.modified_rows.forEach(r => {
                                    let changesHtml = '';
                                    Object.keys(r.changes).forEach(col => {
                                        let c = r.changes[col];
                                        changesHtml += `<div style="margin-top: 0.2rem; font-size: 0.75rem; background: rgba(255,255,255,0.02); padding: 0.3rem; border-radius: 4px;">
                                            <span style="color: var(--pm-text-secondary); font-family: monospace;">${escapeHtml(col)}:</span> 
                                            <span style="text-decoration: line-through; color: #ef4444;">${escapeHtml(c.backup || 'NULL')}</span> ➔ 
                                            <span style="color: #10b981;">${escapeHtml(c.live || 'NULL')}</span>
                                        </div>`;
                                    });
                                    html += `<div style="padding: 0.5rem; border: 1px solid var(--pm-border-color); border-left: 3px solid #f59e0b; border-radius: 4px;">
                                        <div style="font-family: monospace; font-weight: 600; font-size: 0.8rem;">PK: ${escapeHtml(r.pk)}</div>
                                        ${changesHtml}
                                    </div>`;
                                });
                                html += `</div>`;
                            }

                            // Render Added
                            if (d.added_rows && d.added_rows.length > 0) {
                                html += `<h5 style="margin-top: 1rem; color: var(--pm-text-primary); font-family: 'Outfit'; border-bottom: 1px solid var(--pm-border-color); padding-bottom: 0.3rem;">Added Rows</h5>`;
                                html += `<div style="max-height: 150px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.3rem;">`;
                                d.added_rows.forEach(r => {
                                    let colsHtml = '';
                                    Object.keys(r).forEach(col => {
                                        colsHtml += `<div style="margin-top: 0.2rem; font-size: 0.75rem; background: rgba(255,255,255,0.02); padding: 0.3rem; border-radius: 4px; color: var(--pm-text-primary);">
                                            <span style="color: var(--pm-text-secondary); font-family: monospace;">${escapeHtml(col)}:</span> 
                                            <span style="color: #10b981;">${escapeHtml(String(r[col] ?? 'NULL'))}</span>
                                        </div>`;
                                    });
                                    let pkVal = d.primary_key && r[d.primary_key] !== undefined ? r[d.primary_key] : 'N/A';
                                    html += `<div style="padding: 0.5rem; border: 1px solid var(--pm-border-color); border-left: 3px solid #10b981; border-radius: 4px; color: var(--pm-text-primary);">
                                        <div style="font-family: monospace; font-weight: 600; font-size: 0.8rem; color: var(--pm-text-primary);">PK: ${escapeHtml(pkVal)}</div>
                                        ${colsHtml}
                                    </div>`;
                                });
                                html += `</div>`;
                            }

                            // Render Deleted
                            if (d.deleted_rows && d.deleted_rows.length > 0) {
                                html += `<h5 style="margin-top: 1rem; color: var(--pm-text-primary); font-family: 'Outfit'; border-bottom: 1px solid var(--pm-border-color); padding-bottom: 0.3rem;">Deleted Rows</h5>`;
                                html += `<div style="max-height: 150px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.3rem;">`;
                                d.deleted_rows.forEach(r => {
                                    let colsHtml = '';
                                    Object.keys(r).forEach(col => {
                                        colsHtml += `<div style="margin-top: 0.2rem; font-size: 0.75rem; background: rgba(255,255,255,0.02); padding: 0.3rem; border-radius: 4px; color: var(--pm-text-primary);">
                                            <span style="color: var(--pm-text-secondary); font-family: monospace;">${escapeHtml(col)}:</span> 
                                            <span style="color: #ef4444; text-decoration: line-through;">${escapeHtml(String(r[col] ?? 'NULL'))}</span>
                                        </div>`;
                                    });
                                    let pkVal = d.primary_key && r[d.primary_key] !== undefined ? r[d.primary_key] : 'N/A';
                                    html += `<div style="padding: 0.5rem; border: 1px solid var(--pm-border-color); border-left: 3px solid #ef4444; border-radius: 4px; color: var(--pm-text-primary);">
                                        <div style="font-family: monospace; font-weight: 600; font-size: 0.8rem; color: var(--pm-text-primary);">PK: ${escapeHtml(pkVal)}</div>
                                        ${colsHtml}
                                    </div>`;
                                });
                                html += `</div>`;
                            }
 
                            // Set close callback to restore the Key Sync Audit modal with last drawer
                            window.onPremiumModalClose = () => {
                                if (window.PM_LAST_COMPARE) {
                                    window.pmRenderKeySyncAuditModal(window.PM_LAST_COMPARE, window.PM_LAST_COMPARE_DRAWER_TYPE);
                                }
                            };
 
                            showPremiumConfirmModal('Row Diff: ' + escapeHtml(tableName), html, null, null);
                        })
                        .catch(err => {
                            showPremiumAlert('Error', 'Failed to fetch row diffs.', 'danger');
                        });
                };

                window.pmInspectProductDeltas = function(type) {
                    const data = window.PM_LAST_COMPARE;
                    if (!data) return;
                    
                    const products = type === 'added' ? (data.added || []) : (data.deleted || []);
                    if (products.length === 0) return;
                    
                    const color = type === 'added' ? '#10b981' : '#ef4444';
                    const title = type === 'added' ? 'Added Products' : 'Deleted Products';
                    
                    let html = `<div style="max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; padding-right: 0.5rem;">`;
                    html += products.map(i => {
                        return `<div style="background-color: ${color}10; border-left: 3px solid ${color}; padding: 0.6rem; border-radius: 0 4px 4px 0; display: flex; justify-content: space-between; align-items: center;">
                            <div style="display: flex; flex-direction: column; gap: 0.2rem; width: 100%;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-weight: 600; color: var(--pm-text-primary); font-family: monospace;">ID: ${escapeHtml(i.id_product)}</span>
                                    <span style="font-size: 0.8rem; color: var(--pm-text-secondary); font-family: monospace;">Ref: ${escapeHtml(i.reference || 'N/A')}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-size: 0.85rem; color: var(--pm-text-secondary);">${escapeHtml(i.name)}</span>
                                    <span style="font-size: 0.85rem; color: var(--pm-text-primary); font-weight: 600;">$${parseFloat(i.price).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>`;
                    }).join('');
                    html += `</div>`;
                    
                    // Set close callback to restore Key Sync Audit modal with last drawer
                    window.onPremiumModalClose = () => {
                        if (window.PM_LAST_COMPARE) {
                            window.pmRenderKeySyncAuditModal(window.PM_LAST_COMPARE, window.PM_LAST_COMPARE_DRAWER_TYPE);
                        }
                    };
 
                    showPremiumConfirmModal(title + ` (${products.length})`, html, null, null);
                };
 
                window.pmRenderKeySyncAuditModal = function(data, autoOpenDrawerType = null) {
                    let statusColor = '#10b981';
                    let statusText = 'STABLE (100% Identical)';
                    if (data.added_count === 0 && data.deleted_count === 0 && data.backup_rows === data.active_rows) {
                        if (data.checksum_drift) {
                            statusText = 'CONTENT DRIFT DETECTED (Row counts match, but content checksums differ)';
                            statusColor = '#f59e0b';
                        }
                    } else {
                        statusText = 'STRUCTURAL DRIFT DETECTED (Row count discrepancy)';
                        statusColor = '#ef4444';
                    }
 
                    let checksumsHtml = '';
                    let volatileCount = 0;
                    let modifiedCount = 0;
                    let volatileTables = [];
                    let modifiedTables = [];
 
                    if (data.checksum_status) {
                        Object.keys(data.checksum_status).forEach(tbl => {
                            const c = data.checksum_status[tbl];
                            let badge = '';
                            if (c.match === true) {
                                badge = '<span class="pm-status-pill success" style="font-size: 0.65rem; padding: 0.15rem 0.4rem; border-radius: 4px;">IDENTICAL</span>';
                            } else if (c.match === false) {
                                let driftStatus = 'Checksum Mismatch';
                                if (c.active === 'MISSING') driftStatus = 'Missing in Active DB';
                                else if (c.backup === null) driftStatus = 'Missing in Backup Archive';
 
                                let driftMeta = {
                                    name: tbl,
                                    active_rows: c.active_rows !== undefined ? c.active_rows : 0,
                                    backup_rows: c.backup_rows !== undefined ? c.backup_rows : 0,
                                    status: driftStatus
                                };
 
                                if (c.volatile) {
                                    badge = '<span class="pm-status-pill warning" style="font-size: 0.65rem; padding: 0.15rem 0.4rem; border-radius: 4px; background-color: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3);" title="Session/log tables update automatically on every request.">VOLATILE</span>';
                                    volatileCount++;
                                    volatileTables.push(driftMeta);
                                } else {
                                    badge = '<span class="pm-status-pill danger" style="font-size: 0.65rem; padding: 0.15rem 0.4rem; border-radius: 4px;">MODIFIED</span>';
                                    modifiedCount++;
                                    modifiedTables.push(driftMeta);
                                }
                            } else {
                                badge = '<span class="pm-status-pill warning" style="font-size: 0.65rem; padding: 0.15rem 0.4rem; border-radius: 4px;">UNSUPPORTED</span>';
                            }
                            checksumsHtml += `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid var(--pm-border-color);">
                                    <div style="display: flex; flex-direction: column; gap: 0.15rem; text-align: left;">
                                        <span style="font-family: monospace; font-weight:600;">${escapeHtml(tbl)}</span>
                                        <span style="font-size: 0.75rem; color: var(--pm-text-secondary);">
                                            Rows: ${c.backup_rows !== undefined ? escapeHtml(c.backup_rows) : 'N/A'} ➔ ${c.active_rows !== undefined ? escapeHtml(c.active_rows) : 'N/A'}
                                        </span>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                                        <span style="font-family: monospace; font-size: 0.75rem; color: var(--pm-text-secondary);">
                                            ${c.backup ? escapeHtml(c.backup) : 'N/A'} ➔ ${escapeHtml(c.active)}
                                        </span>
                                        ${badge}
                                    </div>
                                </div>
                            `;
                        });
                    } else {
                        checksumsHtml = '<div style="color: var(--pm-text-secondary); text-align: center; padding: 0.5rem;">No table checksum metadata found.</div>';
                    }
 
                    let modalBody = `
                        <div class="pm-metric-row" style="margin-bottom: 1rem;">
                            <span class="pm-metric-label">Staging Database Integrity</span>
                            <span class="pm-metric-value" style="font-weight: 700; font-family: 'Outfit'; color: ${statusColor};">${escapeHtml(statusText)}</span>
                        </div>
                        <div class="pm-grid" style="margin-bottom: 1.5rem; grid-template-columns: repeat(3, 1fr);">
                            <div class="pm-card" style="padding: 1rem;">
                                <span style="font-size: 0.8rem; color: var(--pm-text-secondary);">Backup Tables Rows</span>
                                <div style="font-size: 1.5rem; font-weight: 700; font-family: 'Outfit';">${escapeHtml(data.backup_rows)}</div>
                            </div>
                            <div class="pm-card" style="padding: 1rem;">
                                <span style="font-size: 0.8rem; color: var(--pm-text-secondary);">Active Tables Rows</span>
                                <div style="font-size: 1.5rem; font-weight: 700; font-family: 'Outfit';">${escapeHtml(data.active_rows)}</div>
                            </div>
                            <div class="pm-card" id="pm-card-added" data-count="${data.added_count}" style="padding: 1rem; cursor: ${data.added_count > 0 ? 'pointer' : 'default'};">
                                <span style="font-size: 0.8rem; color: var(--pm-text-secondary);">Added Products (Deltas)</span>
                                <div style="font-size: 1.5rem; font-weight: 700; font-family: 'Outfit'; color: #10b981;">+${data.added_count}</div>
                                ${data.added_count > 0 ? '<div style="font-size: 0.65rem; color: var(--pm-text-secondary); margin-top: 4px;">Click to view list</div>' : ''}
                            </div>
                            <div class="pm-card" id="pm-card-deleted" data-count="${data.deleted_count}" style="padding: 1rem; cursor: ${data.deleted_count > 0 ? 'pointer' : 'default'};">
                                <span style="font-size: 0.8rem; color: var(--pm-text-secondary);">Deleted Products (Deltas)</span>
                                <div style="font-size: 1.5rem; font-weight: 700; font-family: 'Outfit'; color: #ef4444;">-${data.deleted_count}</div>
                                ${data.deleted_count > 0 ? '<div style="font-size: 0.65rem; color: var(--pm-text-secondary); margin-top: 4px;">Click to view list</div>' : ''}
                            </div>
                            <div class="pm-card" id="pm-card-modified" data-count="${modifiedCount}" style="padding: 1rem; cursor: ${modifiedCount > 0 ? 'pointer' : 'default'};">
                                <span style="font-size: 0.8rem; color: var(--pm-text-secondary);">Modified Tables</span>
                                <div style="font-size: 1.5rem; font-weight: 700; font-family: 'Outfit'; color: ${modifiedCount > 0 ? '#ef4444' : 'var(--pm-text-primary)'};">${modifiedCount}</div>
                                ${modifiedCount > 0 ? '<div style="font-size: 0.65rem; color: var(--pm-text-secondary); margin-top: 4px;">Click to view list</div>' : ''}
                            </div>
                            <div class="pm-card" id="pm-card-volatile" data-count="${volatileCount}" style="padding: 1rem; cursor: ${volatileCount > 0 ? 'pointer' : 'default'};">
                                <span style="font-size: 0.8rem; color: var(--pm-text-secondary);">Volatile Tables</span>
                                <div style="font-size: 1.5rem; font-weight: 700; font-family: 'Outfit'; color: ${volatileCount > 0 ? '#f59e0b' : 'var(--pm-text-primary)'};">${volatileCount}</div>
                                ${volatileCount > 0 ? '<div style="font-size: 0.65rem; color: var(--pm-text-secondary); margin-top: 4px;">Click to view list</div>' : ''}
                            </div>
                        </div>
                        <div id="pm-drift-detail-drawer" style="display: none; margin-top: -1rem; margin-bottom: 1.5rem; padding: 1rem; background: rgba(255, 255, 255, 0.02); border: 1px dashed var(--pm-border-color); border-radius: 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <span id="pm-drawer-title" style="font-size: 0.8rem; font-weight: 600; color: var(--pm-text-primary); font-family: 'Outfit';"></span>
                                <span style="cursor: pointer; font-size: 0.75rem; color: var(--pm-text-secondary);" onclick="document.getElementById('pm-drift-detail-drawer').style.display='none'">✕ Close</span>
                            </div>
                            <div id="pm-drawer-body" style="max-height: 120px; overflow-y: auto; display: flex; flex-wrap: wrap; gap: 0.4rem; font-family: monospace;"></div>
                        </div>
                        <span class="pm-subtitle" style="display: block; margin-top: 1rem; margin-bottom: 0.5rem;">Database Tables Content Integrity</span>
                        <div style="max-height: 250px; overflow-y: auto; background-color: var(--pm-card-bg); border: 1px solid var(--pm-border-color); border-radius: 8px; padding: 0.5rem 1rem; margin-bottom: 1.5rem;">
                            ${checksumsHtml}
                        </div>
                        <span class="pm-subtitle" style="display: block; margin-bottom: 0.5rem;">Staging Telemetry Log Checksum</span>
                        <pre class="pm-log-terminal" style="max-height: 180px; font-size: 0.8rem; margin-bottom: 0;">${escapeHtml(data.log_metadata)}</pre>
                    `;
 
                    window.PM_LAST_COMPARE = data;
                    showPremiumConfirmModal('Key Sync Audit: ' + escapeHtml(data.backup_name), modalBody, null, null);
 
                    const bindDrawer = (cardId, title, items, color, type) => {
                        const card = document.getElementById(cardId);
                        if (card && parseInt(card.dataset.count) > 0) {
                            const handleOpenDrawer = () => {
                                window.PM_LAST_COMPARE_DRAWER_TYPE = type;
                                const drawer = document.getElementById('pm-drift-detail-drawer');
                                const dTitle = document.getElementById('pm-drawer-title');
                                const dBody = document.getElementById('pm-drawer-body');
                                drawer.style.display = 'block';
 
                                // Add Inspect All & Export Buttons if type is products
                                let exportBtn = '';
                                if (type === 'products_added' || type === 'products_deleted') {
                                    const inspectType = type === 'products_added' ? 'added' : 'deleted';
                                    exportBtn = `
                                        <button type="button" class="pm-btn pm-btn-sm" style="font-size: 0.7rem; padding: 0.2rem 0.5rem; margin-left: 1rem; background-color: var(--pm-primary); border-radius: 4px; box-shadow: none;" onclick="window.pmInspectProductDeltas('${inspectType}')">Inspect All</button>
                                        <button type="button" class="pm-btn pm-btn-sm" style="font-size: 0.7rem; padding: 0.2rem 0.5rem; margin-left: 0.5rem; background-color: var(--pm-neutral); border-radius: 4px; box-shadow: none;" onclick="window.location.href='${window.location.href}&ajax=1&action=export_diff&file=${escapeHtml(data.backup_name)}&table=product_deltas&format=csv'">Export CSV</button>
                                    `;
                                }
                                dTitle.innerHTML = title + exportBtn; // nosec
 
                                dBody.innerHTML = items.map(i => { // nosec
                                    if (typeof i === 'object' && i.id_product) {
                                        // Rich Product Delta Rendering
                                        return `<div style="background-color: ${color}10; border-left: 3px solid ${color}; padding: 0.4rem 0.6rem; border-radius: 0 4px 4px 0; width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem;">
                                            <div style="display: flex; flex-direction: column; gap: 0.15rem; width: 100%;">
                                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                                    <span style="font-weight: 600; color: var(--pm-text-primary); font-family: monospace;">ID: ${escapeHtml(i.id_product)}</span>
                                                    <span style="font-size: 0.7rem; color: var(--pm-text-secondary);">Ref: ${escapeHtml(i.reference || 'N/A')}</span>
                                                </div>
                                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                                    <span style="font-size: 0.75rem; color: var(--pm-text-secondary);">${escapeHtml(i.name)}</span>
                                                    <span style="font-size: 0.75rem; color: var(--pm-text-primary); font-weight: 600;">$${parseFloat(i.price).toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>`;
                                    } else if (typeof i === 'object') {
                                        // Table Item Rendering
                                        let diff = parseInt(i.active_rows) - parseInt(i.backup_rows);
                                        let diffText = diff > 0 ? ` (+${diff})` : (diff < 0 ? ` (${diff})` : '');
                                        let diffColor = diff > 0 ? '#10b981' : (diff < 0 ? '#ef4444' : 'var(--pm-text-secondary)');
 
                                        // Add Diff and Export Buttons
                                        let actionBtns = '';
                                        if (type === 'modified_tables' || type === 'volatile_tables') {
                                            actionBtns = `
                                                <button type="button" class="pm-btn pm-btn-sm" style="font-size: 0.65rem; padding: 0.15rem 0.4rem; background-color: var(--pm-primary); border-radius: 4px; box-shadow: none;" onclick="window.pmInspectTableDiff('${escapeHtml(data.backup_name)}', '${escapeHtml(i.name)}')">Inspect</button>
                                                <button type="button" class="pm-btn pm-btn-sm" style="font-size: 0.65rem; padding: 0.15rem 0.4rem; background-color: var(--pm-neutral); border-radius: 4px; box-shadow: none;" onclick="window.location.href='${window.location.href}&ajax=1&action=export_diff&file=${escapeHtml(data.backup_name)}&table=${escapeHtml(i.name)}&format=csv'">Export</button>
                                            `;
                                        }
 
                                        return `<div style="background-color: ${color}10; border-left: 3px solid ${color}; padding: 0.4rem 0.6rem; border-radius: 0 4px 4px 0; width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem;">
                                            <span style="font-weight: 600; color: var(--pm-text-primary); font-family: monospace;">${escapeHtml(i.name)}</span>
                                            <div style="display: flex; gap: 0.5rem; align-items: center;">
                                                <span style="font-size: 0.65rem; color: ${color}; border: 1px solid ${color}40; padding: 0.1rem 0.3rem; border-radius: 3px; font-weight: 600; font-family: 'Outfit';">${escapeHtml(i.status)}</span>
                                                <span style="font-size: 0.75rem; color: var(--pm-text-secondary); font-family: monospace;">A:${escapeHtml(i.active_rows)} / B:${escapeHtml(i.backup_rows)} <strong style="color: ${diffColor}">${escapeHtml(diffText)}</strong></span>
                                                ${actionBtns}
                                            </div>
                                        </div>`;
                                    } else {
                                        return `<span style="background-color: ${color}20; color: ${color}; border: 1px solid ${color}40; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.75rem;">${escapeHtml(i)}</span>`;
                                    }
                                }).join('');
                            };

                            card.addEventListener('click', handleOpenDrawer);

                            if (autoOpenDrawerType === type) {
                                handleOpenDrawer();
                            }
                        }
                    };

                    bindDrawer('pm-card-added', 'Added Products (Deltas)', data.added || [], '#10b981', 'products_added');
                    bindDrawer('pm-card-deleted', 'Deleted Products (Deltas)', data.deleted || [], '#ef4444', 'products_deleted');
                    bindDrawer('pm-card-modified', 'Modified Tables', modifiedTables, '#ef4444', 'modified_tables');
                    bindDrawer('pm-card-volatile', 'Volatile Tables', volatileTables, '#f59e0b', 'volatile_tables');
                };

    // --- Public API ---
    return {
        initialize: function() {
            // Initial render call
            if (typeof pmRenderAllGrids === 'function' && window.PM_CONFIG.backups) {
                pmRenderAllGrids(window.PM_CONFIG.backups);
            }


        },
        renderGrid: function(backups) {
            if (typeof pmRenderAllGrids === 'function') {
                pmRenderAllGrids(backups);
            }
        }
    };
})();

/* --- DataSweeperEngine.js --- */
/**
 * Project Mass - Data Sweeper Engine (TX-298)
 * Orchestrates the Pre-flight Scan and chunked database purge loops.
 */
class DataSweeperEngine {
    static statsTotal = 0;
    static cartsTotal = 0;
    static orphanedImages = [];
    static isRunning = false;
    static isAborted = false;

    static initialize() {
        this.bindAnalyze();
        this.bindExecute();
        this.bindAbort();
    }

    static logConsole(message, type = 'SYSTEM') {
        const consoleEl = document.getElementById('pm-sweeper-console');
        if (!consoleEl) return;
        const timestamp = new Date().toLocaleTimeString();
        consoleEl.innerHTML += `\n[${timestamp}] [${type}] ${message}`;
        consoleEl.scrollTop = consoleEl.scrollHeight;
    }

    static bindAnalyze() {
        const btnAnalyze = document.getElementById('pm-btn-sweeper-analyze');
        if (!btnAnalyze) return;

        btnAnalyze.addEventListener('click', () => {
            const daysSelect = document.getElementById('pm-sweeper-days');
            const daysOld = daysSelect ? daysSelect.value : 30;

            btnAnalyze.disabled = true;
            btnAnalyze.innerHTML = '⚡ Scanning Database...'; // nosec

            const scanPromise = FetchEngine.post('sweeper_analyze', { days_old: daysOld });
            const imagePromise = FetchEngine.post('sweeper_scan_images');

            Promise.all([scanPromise, imagePromise])
                .then(([data, imageData]) => {
                    btnAnalyze.disabled = false;
                    btnAnalyze.innerHTML = '🔍 Run Pre-Flight Scan'; // nosec

                    if (!data.success) {
                        UiEngine.showAlert('Scan Error', data.error || 'Failed to complete pre-flight scan.');
                        return;
                    }

                    // Store row counts
                    this.statsTotal = data.stats.total;
                    this.cartsTotal = data.carts.total;
                    this.orphanedImages = imageData.success ? imageData.orphaned_files : [];

                    // Update UI Readout elements
                    document.getElementById('pm-scan-connections').innerText = data.stats.connections.toLocaleString();
                    document.getElementById('pm-scan-pages').innerText = data.stats.connections_page.toLocaleString();
                    document.getElementById('pm-scan-sources').innerText = data.stats.connections_source.toLocaleString();
                    document.getElementById('pm-scan-guests').innerText = data.stats.guests.toLocaleString();
                    document.getElementById('pm-scan-stats-total').innerText = data.stats.total.toLocaleString();

                    document.getElementById('pm-scan-carts').innerText = data.carts.carts.toLocaleString();
                    document.getElementById('pm-scan-products').innerText = data.carts.cart_products.toLocaleString();
                    document.getElementById('pm-scan-rules').innerText = data.carts.cart_rules.toLocaleString();
                    document.getElementById('pm-scan-carts-total').innerText = data.carts.total.toLocaleString();

                    if (imageData.success) {
                        document.getElementById('pm-scan-images-total').innerText = imageData.scanned_files.toLocaleString();
                        document.getElementById('pm-scan-images-orphans').innerText = imageData.orphaned_files.length.toLocaleString();
                        document.getElementById('pm-scan-images-size').innerText = (imageData.total_orphaned_size / 1024 / 1024).toFixed(2) + ' MB';
                        document.getElementById('pm-check-images-count').innerText = imageData.orphaned_files.length.toLocaleString();
                    } else {
                        document.getElementById('pm-scan-images-total').innerText = 'Error';
                        document.getElementById('pm-scan-images-orphans').innerText = '0';
                        document.getElementById('pm-scan-images-size').innerText = '0.00 MB';
                        document.getElementById('pm-check-images-count').innerText = '0';
                    }

                    // Checkbox counts
                    document.getElementById('pm-check-stats-count').innerText = data.stats.total.toLocaleString();
                    document.getElementById('pm-check-carts-count').innerText = data.carts.total.toLocaleString();

                    // Reveal Results
                    const resultsCard = document.getElementById('pm-sweeper-results-card');
                    if (resultsCard) {
                        resultsCard.style.display = 'block';
                        resultsCard.scrollIntoView({ behavior: 'smooth' });
                    }
                })
                .catch(err => {
                    btnAnalyze.disabled = false;
                    btnAnalyze.innerHTML = '🔍 Run Pre-Flight Scan'; // nosec
                    UiEngine.showAlert('Scan Connection Error', err.message);
                });
        });
    }

    static bindExecute() {
        const btnExecute = document.getElementById('pm-btn-sweeper-execute');
        if (!btnExecute) return;

        btnExecute.addEventListener('click', () => {
            const statsEnabled = document.getElementById('pm-sweeper-check-stats').checked;
            const cartsEnabled = document.getElementById('pm-sweeper-check-carts').checked;
            const imagesEnabled = document.getElementById('pm-sweeper-check-images').checked;

            if (!statsEnabled && !cartsEnabled && !imagesEnabled) {
                UiEngine.showAlert('No Options Selected', 'Please check at least one of the data domains to purge.');
                return;
            }

            const totalExpected = (statsEnabled ? this.statsTotal : 0) + (cartsEnabled ? this.cartsTotal : 0) + (imagesEnabled ? this.orphanedImages.length : 0);
            if (totalExpected === 0) {
                UiEngine.showAlert('No Records to Purge', 'The selected options contain 0 expired items matching the criteria.');
                return;
            }

            UiEngine.showConfirmModal(
                'Confirm Database & Files Purge',
                `You are about to permanently sweep up to <strong>${totalExpected.toLocaleString()}</strong> items (database records and physical files). This operation runs chunked to respect CloudLinux constraints, but cannot be undone.<br><br>Type <strong style="color: var(--pm-danger);">SWEEP</strong> in the field below to confirm:`,
                'SWEEP',
                () => {
                    this.startPurgeSequence(statsEnabled, cartsEnabled, imagesEnabled);
                }
            );
        });
    }

    static bindAbort() {
        const btnAbort = document.getElementById('pm-btn-sweeper-abort');
        if (!btnAbort) return;

        btnAbort.addEventListener('click', () => {
            this.isAborted = true;
            btnAbort.disabled = true;
            btnAbort.innerHTML = '⏳ Aborting...'; // nosec
            this.logConsole('Abort request registered. Stopping execution after current chunk...', 'WARNING');
        });
    }

    static startPurgeSequence(statsEnabled, cartsEnabled, imagesEnabled) {
        this.isRunning = true;
        this.isAborted = false;

        const resultsCard = document.getElementById('pm-sweeper-results-card');
        const progressCard = document.getElementById('pm-sweeper-progress-card');
        const btnAnalyze = document.getElementById('pm-btn-sweeper-analyze');
        const btnExecute = document.getElementById('pm-btn-sweeper-execute');
        const btnAbort = document.getElementById('pm-btn-sweeper-abort');

        if (resultsCard) resultsCard.style.display = 'none';
        if (progressCard) progressCard.style.display = 'block';
        if (btnAnalyze) btnAnalyze.disabled = true;
        if (btnExecute) btnExecute.disabled = true;
        if (btnAbort) {
            btnAbort.disabled = false;
            btnAbort.style.display = 'inline-block';
            btnAbort.innerHTML = '🛑 Abort Operation'; // nosec
        }

        const headerText = document.getElementById('pm-sweeper-header-text');
        if (headerText) {
            headerText.textContent = '🧹 Database Clean Sweep in Progress...';
        }

        const daysSelect = document.getElementById('pm-sweeper-days');
        const daysOld = daysSelect ? parseInt(daysSelect.value) : 30;
        const chunkSize = 5000;

        const imagesList = [...(this.orphanedImages || [])];
        const totalExpected = (statsEnabled ? this.statsTotal : 0) + (cartsEnabled ? this.cartsTotal : 0) + (imagesEnabled ? imagesList.length : 0);
        let totalDeleted = 0;

        const consoleEl = document.getElementById('pm-sweeper-console');
        if (consoleEl) consoleEl.innerHTML = '[SYSTEM] Launching clean sweep sequence...'; // nosec

        const updateProgressBar = () => {
            const bar = document.getElementById('pm-sweeper-progress-bar');
            const percentText = document.getElementById('pm-sweeper-progress-percent');
            const pct = Math.min(100, Math.round((totalDeleted / totalExpected) * 100));

            if (bar) bar.style.width = pct + '%';
            if (percentText) percentText.innerText = pct + '%';
        };

        const executeNext = () => {
            if (this.isAborted) {
                this.logConsole('Purge loop aborted by user action.', 'ABORTED');
                this.finishSequence(false, 'Operation aborted.');
                return;
            }

            // Step 1: Statistical connections
            if (statsEnabled) {
                this.logConsole(`Executing chunk delete on ps_connections (target size: ${chunkSize})...`, 'STATS');
                document.getElementById('pm-sweeper-progress-text').innerText = 'Sweeping statistical connections...';
                
                FetchEngine.post('sweeper_sweep_connections', { days_old: daysOld, chunk_size: chunkSize })
                    .then(res => {
                        if (!res.success) throw new Error(res.error || 'Unknown endpoint error');

                        if (res.deleted > 0) {
                            totalDeleted += res.deleted;
                            updateProgressBar();
                            this.logConsole(`Successfully purged ${res.deleted.toLocaleString()} connection records.`, 'SUCCESS');
                        }

                        if (!res.done) {
                            setTimeout(executeNext, 200);
                        } else {
                            statsEnabled = false;
                            executeNext();
                        }
                    })
                    .catch(err => {
                        this.logConsole(`Fatal error: ${err.message}`, 'ERROR');
                        this.finishSequence(false, err.message);
                    });
                return;
            }

            // Step 2: Guest sessions
            if (this.statsTotal > 0 && !statsEnabled && this.statsTotal !== -1) {
                this.logConsole(`Scanning for unreferenced guests in ps_guest...`, 'STATS');
                document.getElementById('pm-sweeper-progress-text').innerText = 'Sweeping orphaned visitor guest accounts...';
                
                FetchEngine.post('sweeper_sweep_guests', { chunk_size: chunkSize })
                    .then(res => {
                        if (!res.success) throw new Error(res.error || 'Unknown guest endpoint error');

                        if (res.deleted > 0) {
                            totalDeleted += res.deleted;
                            updateProgressBar();
                            this.logConsole(`Purged ${res.deleted.toLocaleString()} orphaned guest records.`, 'SUCCESS');
                        }

                        if (!res.done) {
                            setTimeout(executeNext, 200);
                        } else {
                            this.statsTotal = -1;
                            executeNext();
                        }
                    })
                    .catch(err => {
                        this.logConsole(`Fatal guest error: ${err.message}`, 'ERROR');
                        this.finishSequence(false, err.message);
                    });
                return;
            }

            // Step 3: Abandoned carts
            if (cartsEnabled) {
                this.logConsole(`Executing chunk delete on ps_cart (target size: ${chunkSize})...`, 'CARTS');
                document.getElementById('pm-sweeper-progress-text').innerText = 'Sweeping abandoned shopping carts...';

                FetchEngine.post('sweeper_sweep_carts', { days_old: daysOld, chunk_size: chunkSize })
                    .then(res => {
                        if (!res.success) throw new Error(res.error || 'Unknown cart endpoint error');

                        if (res.deleted > 0) {
                            totalDeleted += res.deleted;
                            updateProgressBar();
                            this.logConsole(`Purged ${res.deleted.toLocaleString()} expired cart records.`, 'SUCCESS');
                        }

                        if (!res.done) {
                            setTimeout(executeNext, 200);
                        } else {
                            cartsEnabled = false;
                            executeNext();
                        }
                    })
                    .catch(err => {
                        this.logConsole(`Fatal cart error: ${err.message}`, 'ERROR');
                        this.finishSequence(false, err.message);
                    });
                return;
            }

            // Step 4: Ghost Product Images
            if (imagesEnabled) {
                this.logConsole(`Executing purge on orphaned product images...`, 'IMAGES');
                document.getElementById('pm-sweeper-progress-text').innerText = 'Sweeping ghost product images...';

                const filesChunk = imagesList.splice(0, 50).map(f => f.relative_path);
                if (filesChunk.length > 0) {
                    FetchEngine.post('sweeper_purge_images', { files: filesChunk })
                        .then(res => {
                            if (!res.success) throw new Error(res.error || 'Unknown image sweeper endpoint error');

                            if (res.deleted_count > 0) {
                                totalDeleted += res.deleted_count;
                                updateProgressBar();
                                this.logConsole(`Purged ${res.deleted_count.toLocaleString()} ghost image files.`, 'SUCCESS');
                            }

                            if (imagesList.length > 0) {
                                setTimeout(executeNext, 200);
                            } else {
                                imagesEnabled = false;
                                executeNext();
                            }
                        })
                        .catch(err => {
                            this.logConsole(`Fatal image sweeper error: ${err.message}`, 'ERROR');
                            this.finishSequence(false, err.message);
                        });
                } else {
                    imagesEnabled = false;
                    executeNext();
                }
                return;
            }

            // All steps finished
            this.finishSequence(true, `Purged a total of ${totalDeleted.toLocaleString()} items successfully.`);
        };

        setTimeout(executeNext, 500);
    }

    static finishSequence(success, message) {
        this.isRunning = false;
        const btnAnalyze = document.getElementById('pm-btn-sweeper-analyze');
        const btnExecute = document.getElementById('pm-btn-sweeper-execute');
        const btnAbort = document.getElementById('pm-btn-sweeper-abort');

        if (btnAnalyze) btnAnalyze.disabled = false;
        if (btnExecute) btnExecute.disabled = false;
        if (btnAbort) {
            btnAbort.disabled = true;
            btnAbort.style.display = 'none';
        }

        const headerText = document.getElementById('pm-sweeper-header-text');
        if (headerText) {
            headerText.textContent = success ? '🧹 Database Clean Sweep Completed' : '🧹 Database Clean Sweep Halted';
        }

        if (success) {
            this.logConsole('Database Clean Sweep Completed successfully.', 'COMPLETE');
            document.getElementById('pm-sweeper-progress-text').innerText = 'Database cleanup successful!';
            document.getElementById('pm-sweeper-progress-bar').style.backgroundColor = '#10b981';
            UiEngine.showAlert('Clean Sweep Finished', message, 'success');
        } else {
            document.getElementById('pm-sweeper-progress-text').innerText = 'Database cleanup failed or aborted.';
            UiEngine.showAlert('Clean Sweep Halted', message, 'error');
        }
    }
}

/* --- GoogleDriveEngine.js --- */
/**
 * Project Mass - Google Drive Redundancy Engine (TX-329)
 * Manages Google Drive OAuth configuration, connection state, offsite backup uploads, and cloud file deletion.
 */
class GoogleDriveEngine {
    static syncedFiles = [];
    static isGoogleAuthenticated = false;

    static initialize() {
        this.bindEvents();
        this.checkStatus();

        // Listen for OAuth success message from callback popup window
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'google_drive_auth_success') {
                window.showPremiumToast('Google Drive connected successfully!', 'success');
                this.checkStatus();
            }
        });
    }

    static bindEvents() {
        // Authenticate & Connect (Opens OAuth Popup)
        const btnConnect = document.getElementById('pm-btn-connect-gdrive');
        if (btnConnect) {
            btnConnect.addEventListener('click', () => {
                const authUrl = btnConnect.getAttribute('data-auth-url');
                if (authUrl) {
                    window.open(authUrl, 'GoogleDriveOAuth', 'width=600,height=650,left=150,top=100');
                } else {
                    UiEngine.showAlert('Authorization Error', 'Google Authorization URL not loaded yet.');
                }
            });
        }

        // Disconnect Account
        const btnDisconnect = document.getElementById('pm-btn-disconnect-gdrive');
        if (btnDisconnect) {
            btnDisconnect.addEventListener('click', () => {
                UiEngine.showConfirmModal(
                    'Disconnect Google Drive?',
                    'Are you sure you want to disconnect your Google Drive integration? This will wipe your local cloud status cache, but your files on Google Drive will remain intact.',
                    null,
                    () => {
                        btnDisconnect.disabled = true;
                        btnDisconnect.textContent = '🔌 Disconnecting...';

                        FetchEngine.post('disconnect_google_drive')
                        .then(() => {
                            window.showPremiumToast('Disconnected from Google Drive.', 'success');
                            btnDisconnect.disabled = false;
                            btnDisconnect.textContent = '🔌 Disconnect Account';
                            this.checkStatus();
                        })
                        .catch(err => {
                            UiEngine.showAlert('Disconnect Error', err.message);
                            btnDisconnect.disabled = false;
                            btnDisconnect.textContent = '🔌 Disconnect Account';
                        });
                    }
                );
            });
        }

        // Wire delegators for Sync, Cloud Delete, and Verify Cloud buttons on tables
        document.addEventListener('click', (e) => {
            const btnSync = e.target.closest('.pm-btn-sync-cloud');
            if (btnSync) {
                const file = btnSync.getAttribute('data-backup');
                const type = btnSync.getAttribute('data-type');
                this.syncBackupToCloud(file, type, btnSync);
                return;
            }

            const btnDeleteCloud = e.target.closest('.pm-btn-delete-cloud');
            if (btnDeleteCloud) {
                const file = btnDeleteCloud.getAttribute('data-backup');
                const type = btnDeleteCloud.getAttribute('data-type');
                this.deleteBackupFromCloud(file, type, btnDeleteCloud);
                return;
            }

            const btnVerifyCloud = e.target.closest('.pm-btn-verify-cloud');
            if (btnVerifyCloud) {
                const file = btnVerifyCloud.getAttribute('data-backup');
                const type = btnVerifyCloud.getAttribute('data-type');
                this.verifyCloudBackup(file, type, btnVerifyCloud);
                return;
            }

            const btnCloudRestore = e.target.closest('.pm-btn-cloud-restore');
            if (btnCloudRestore) {
                const file = btnCloudRestore.getAttribute('data-backup');
                const type = btnCloudRestore.getAttribute('data-type');
                this.restoreBackupFromCloud(file, type, btnCloudRestore);
            }
        });
    }

    static checkStatus() {
        const controlPanel = document.getElementById('pm-gdrive-control-panel');
        const badge = document.getElementById('pm-gdrive-badge');
        const connStatus = document.getElementById('pm-gdrive-conn-status');
        const connDetails = document.getElementById('pm-gdrive-conn-details');
        const btnConnect = document.getElementById('pm-btn-connect-gdrive');
        const btnDisconnect = document.getElementById('pm-btn-disconnect-gdrive');

        if (!controlPanel) return;

        FetchEngine.post('get_auth_status')
        .then(data => {
            this.syncedFiles = data.synced_files || [];
            this.isGoogleAuthenticated = data.authenticated;

            if (!data.configured) {
                controlPanel.style.display = 'block';
                badge.className = 'pm-status-pill danger';
                badge.innerText = '⚠️ Broker Unconfigured';
                connStatus.innerText = 'OAuth Broker Credentials Missing';
                connStatus.style.color = 'var(--pm-danger)';
                connDetails.innerText = 'Central OAuth Broker Client ID and Secret are not set in the server environment (.env).';
                btnConnect.style.display = 'none';
                btnDisconnect.style.display = 'none';
            } else if (!data.authenticated) {
                controlPanel.style.display = 'block';
                badge.className = 'pm-status-pill warning';
                badge.innerText = '🔒 Needs Authentication';
                connStatus.innerText = 'Google Drive Integration Ready';
                connStatus.style.color = 'var(--pm-warning)';
                connDetails.innerText = 'Please authenticate with Google to connect this tenant.';
                btnConnect.style.display = 'inline-block';
                btnConnect.setAttribute('data-auth-url', data.auth_url);
                btnDisconnect.style.display = 'none';
            } else {
                controlPanel.style.display = 'block';
                badge.className = 'pm-status-pill success';
                badge.innerText = '✅ Connected';
                connStatus.innerText = 'Connected to Google Drive';
                connStatus.style.color = 'var(--pm-success)';
                connDetails.innerText = `Central OAuth Broker Active | Synced Backups: ${this.syncedFiles.length}`;
                btnConnect.style.display = 'none';
                btnDisconnect.style.display = 'inline-block';
            }
            const downloadSourceDropdown = document.getElementById('pm-setting-gdrive-default-download');
            if (!data.configured || !data.authenticated) {
                if (downloadSourceDropdown) {
                    if (downloadSourceDropdown.value === 'cloud') {
                        downloadSourceDropdown.value = 'local';
                        FetchEngine.post('save_settings', {
                            settings: { PM_GDRIVE_DEFAULT_DOWNLOAD: 'local' }
                        }).catch(() => {});
                    }
                    downloadSourceDropdown.disabled = true;
                }
            } else {
                if (downloadSourceDropdown) {
                    downloadSourceDropdown.disabled = false;
                }
            }

            this.updateGridsUI();
        })
        .catch(err => {
            console.error('Google Drive status check failed:', err);
        });
    }

    static syncBackupToCloud(file, type, btnEl) {
        if (!this.isGoogleAuthenticated) {
            UiEngine.showAlert('Authentication Needed', 'You must authenticate Google Drive before performing cloud sync actions.', 'error');
            return;
        }

        btnEl.disabled = true;
        const originalText = btnEl.textContent;
        btnEl.textContent = '⏳ Init...';

        FetchEngine.post('init_sync_to_drive', { file: file, type: type })
        .then(data => {
            const tasks = data.tasks;
            const folderId = data.folder_id;
            let currentTaskIndex = 0;

            const runNextTask = () => {
                if (currentTaskIndex >= tasks.length) {
                    btnEl.textContent = '⏳ Finalizing...';
                    FetchEngine.post('finalize_sync', { file: file, folder_id: folderId, type: type })
                    .then(finalizeData => {
                        btnEl.textContent = '☁️ 100%';
                        window.showPremiumToast('Backup synced to Google Drive successfully!', 'success');

                        if (!this.syncedFiles.includes(file)) {
                            this.syncedFiles.push(file);
                        }

                        if (type === 'database') {
                            if (typeof pmRenderAllGrids === 'function') {
                                pmRenderAllGrids(finalizeData.backups || []);
                            }
                        } else {
                            if (typeof FileToolsEngine !== 'undefined') {
                                FileToolsEngine.renderGrid(finalizeData.backups || []);
                            }
                        }

                        this.checkStatus();
                    })
                    .catch(err => {
                        UiEngine.showAlert('Cloud Sync Failure', 'Finalizing sync failed: ' + err.message, 'error');
                        btnEl.disabled = false;
                        btnEl.textContent = originalText;
                        this.checkStatus();
                    });
                    return;
                }

                const task = tasks[currentTaskIndex];
                const uploadUrl = task.upload_url;
                const fileSize = task.file_size;
                const fileKey = task.file_key;
                const fileName = task.file_name;
                let offset = 0;

                const uploadNextChunk = () => {
                    const progress = Math.round((offset / fileSize) * 100);
                    const label = fileKey === 'archive' ? (type === 'database' ? 'SQL' : 'Files') : 'Log';
                    btnEl.textContent = `☁️ ${label} ${progress}%`;

                    FetchEngine.post('upload_sync_chunk', {
                        file: file,
                        type: type,
                        upload_url: uploadUrl,
                        offset: offset,
                        file_key: fileKey
                    })
                    .then(chunkData => {
                        if (chunkData.complete) {
                            currentTaskIndex++;
                            runNextTask();
                        } else {
                            offset = chunkData.uploaded_bytes;
                            uploadNextChunk();
                        }
                    })
                    .catch(err => {
                        UiEngine.showAlert('Cloud Sync Failure', `Syncing ${fileName} failed: ` + err.message, 'error');
                        btnEl.disabled = false;
                        btnEl.textContent = originalText;
                        this.checkStatus();
                    });
                };

                uploadNextChunk();
            };

            runNextTask();
        })
        .catch(err => {
            UiEngine.showAlert('Cloud Sync Failure', err.message, 'error');
            btnEl.disabled = false;
            btnEl.textContent = originalText;
        });
    }

    static deleteBackupFromCloud(file, type, btnEl) {
        UiEngine.showConfirmModal(
            'Delete Cloud Backup?',
            `Are you sure you want to permanently delete <strong style="color: var(--pm-text-primary);">${file}</strong> from Google Drive?<br><br>This will only remove the copy from your Google Drive folder, leaving the local file untouched.`,
            null,
            () => {
                btnEl.disabled = true;
                const originalText = btnEl.textContent;
                btnEl.textContent = '⏳ Del...';

                FetchEngine.post('delete_from_drive', { file: file, type: type })
                .then(data => {
                    window.showPremiumToast('Backup deleted from Google Drive.', 'success');

                    // Remove from synced lists and refresh
                    this.syncedFiles = this.syncedFiles.filter(item => item !== file);

                    if (type === 'database') {
                        if (typeof pmRenderAllGrids === 'function') {
                            pmRenderAllGrids(data.backups || []);
                        }
                    } else {
                        if (typeof FileToolsEngine !== 'undefined') {
                            FileToolsEngine.renderGrid(data.backups || []);
                        }
                    }

                    this.checkStatus();
                })
                .catch(err => {
                    UiEngine.showAlert('Cloud Delete Failure', err.message, 'error');
                    btnEl.disabled = false;
                    btnEl.textContent = originalText;
                });
            }
        );
    }

    static verifyCloudBackup(file, type, btnEl) {
        btnEl.disabled = true;
        const originalText = btnEl.textContent;
        btnEl.textContent = '⏳ Checking...';

        FetchEngine.post('verify_cloud_integrity', { file: file, type: type })
        .then(data => {
            btnEl.disabled = false;
            btnEl.textContent = originalText;

            if (data.verified) {
                UiEngine.showAlert('Integrity Verified', data.message, 'success');
            } else {
                UiEngine.showConfirmModal(
                    'Repair Cloud Backup?',
                    `${data.message}<br><br>Would you like to repair this offsite backup by re-uploading the local files to Google Drive?`,
                    null,
                    () => {
                        this.syncBackupToCloud(file, type, btnEl);
                    }
                );
            }
        })
        .catch(err => {
            UiEngine.showAlert('Integrity Check Error', err.message, 'error');
            btnEl.disabled = false;
            btnEl.textContent = originalText;
        });
    }

    static updateGridsUI() {
        // Helper to rebuild buttons in an actions cell
        const rebuildActions = (actionCell, name, type) => {
            if (!actionCell) return;

            // 1. Remove any old dynamic cloud buttons first
            actionCell.querySelectorAll('.pm-btn-sync-cloud, .pm-btn-delete-cloud, .pm-btn-verify-cloud').forEach(el => el.remove());

            if (!this.isGoogleAuthenticated) return;

            const isSynced = this.syncedFiles.includes(name);
            const localDeleteBtn = actionCell.querySelector('.pm-btn-delete-file-backup, .pm-btn-delete, .pm-btn-cloud-restore');

            if (isSynced) {
                // Render Check button
                const btnVerify = document.createElement('button');
                btnVerify.type = 'button';
                btnVerify.className = 'pm-btn pm-btn-sm pm-btn-verify-cloud pm-btn-success';
                btnVerify.setAttribute('data-backup', name);
                btnVerify.setAttribute('data-type', type);
                btnVerify.textContent = '🛡️ Verify Cloud';

                // Render Delete Cloud button
                const btnDelCloud = document.createElement('button');
                btnDelCloud.type = 'button';
                btnDelCloud.className = 'pm-btn pm-btn-sm pm-btn-delete-cloud pm-btn-neutral';
                btnDelCloud.setAttribute('data-backup', name);
                btnDelCloud.setAttribute('data-type', type);
                btnDelCloud.textContent = '☁️ Delete Cloud';

                if (localDeleteBtn) {
                    actionCell.insertBefore(btnVerify, localDeleteBtn);
                    actionCell.insertBefore(btnDelCloud, localDeleteBtn);
                } else {
                    actionCell.appendChild(btnVerify);
                    actionCell.appendChild(btnDelCloud);
                }
            } else {
                // Render Sync button
                const btnSync = document.createElement('button');
                btnSync.type = 'button';
                btnSync.className = 'pm-btn pm-btn-sm pm-btn-sync-cloud pm-btn-purple';
                btnSync.setAttribute('data-backup', name);
                btnSync.setAttribute('data-type', type);
                btnSync.textContent = '☁️ Sync to Cloud';

                if (localDeleteBtn) {
                    actionCell.insertBefore(btnSync, localDeleteBtn);
                } else {
                    actionCell.appendChild(btnSync);
                }
            }
        };

        const updateGridRows = (tableId, type) => {
            const table = document.getElementById(tableId);
            if (!table) return;

            table.querySelectorAll('tbody tr.pm-data-row').forEach(tr => {
                const nameSpan = tr.querySelector('td:first-child .pm-truncated-filename');
                if (!nameSpan) return;
                const name = nameSpan.getAttribute('data-full-name');
                if (!name) return;

                const isSynced = this.syncedFiles.includes(name);
                const isLocal = tr.getAttribute('data-is-local') !== 'false';

                if (!isSynced && !isLocal) {
                    const tbody = tr.closest('tbody');
                    if (tbody) {
                        tbody.remove();
                    } else {
                        tr.remove();
                    }
                    return;
                }

                const badgeContainer = tr.querySelector('.pm-backup-badges');
                if (badgeContainer) {
                    let cloudBadge = badgeContainer.querySelector('.pm-cloud-sync-badge');
                    let baseBadge = badgeContainer.querySelector('.pm-base-status-badge');
                    
                    const shouldShowSyncedOnly = isSynced && isLocal;

                    if (shouldShowSyncedOnly) {
                        if (baseBadge) {
                            baseBadge.style.display = 'none';
                        }
                        if (!cloudBadge) {
                            cloudBadge = document.createElement('span');
                            cloudBadge.className = 'pm-status-pill pm-cloud-sync-badge';
                            cloudBadge.style.background = 'rgba(168, 85, 247, 0.1)';
                            cloudBadge.style.color = 'var(--pm-purple)';
                            cloudBadge.style.fontSize = '0.65rem';
                            cloudBadge.style.padding = '0.15rem 0.4rem';
                            cloudBadge.style.letterSpacing = '0';
                            cloudBadge.innerText = '☁️ Synced';
                            
                            badgeContainer.appendChild(cloudBadge);
                        } else {
                            cloudBadge.style.display = 'inline-block';
                        }
                    } else {
                        if (baseBadge) {
                            baseBadge.style.display = 'inline-block';
                        }
                        if (cloudBadge) {
                            cloudBadge.remove();
                        }
                    }
                }

                const actionCell = tr.nextElementSibling ? tr.nextElementSibling.querySelector('.pm-actions-group') : null;
                rebuildActions(actionCell, name, type);
            });
        };

        updateGridRows('pm-file-backups-table', 'file');
        updateGridRows('pm-backups-table', 'database');
    }

    static restoreBackupFromCloud(file, type, btnEl) {
        UiEngine.showConfirmModal(
            'Restore Local Backup?',
            `Are you sure you want to download and restore <strong style="color: var(--pm-text-primary);">${file}</strong> from Google Drive back to your local server?`,
            null,
            () => {
                btnEl.disabled = true;
                const originalText = btnEl.textContent;
                btnEl.textContent = '⏳ 0%';

                const jobId = 'restore_' + Date.now();
                const adminModulesUrl = window.PM_CONFIG ? window.PM_CONFIG.adminModulesUrl : '';
                let isCompletedByStream = false;

                if (adminModulesUrl) {
                    const es = new EventSource(adminModulesUrl + '&configure=mass_utility&action=stream_job_progress&job_id=' + jobId);
                    
                    es.onmessage = (event) => {
                        try {
                            const data = JSON.parse(event.data);
                            if (data.progress !== undefined) {
                                btnEl.textContent = `⏳ ${data.progress}%`;
                            }
                            if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
                                es.close();
                                if (data.status === 'completed') {
                                    isCompletedByStream = true;
                                    window.showPremiumToast('Backup restored locally successfully!', 'success');
                                    btnEl.disabled = false;
                                    btnEl.textContent = originalText;
                                    
                                    if (type === 'database') {
                                        if (typeof pmRenderAllGrids === 'function') {
                                            pmRenderAllGrids(data.backups || []);
                                        }
                                    } else {
                                        if (typeof FileToolsEngine !== 'undefined') {
                                            FileToolsEngine.renderGrid(data.backups || []);
                                        }
                                    }
                                    this.checkStatus();
                                } else if (data.status === 'failed') {
                                    UiEngine.showAlert('Local Restore Failure', data.error || 'Unknown error occurred.', 'error');
                                    btnEl.disabled = false;
                                    btnEl.textContent = originalText;
                                }
                            }
                        } catch (e) {
                            console.error('Failed to parse SSE data:', e);
                        }
                    };

                    es.onerror = () => {
                        es.close();
                    };
                }

                FetchEngine.post('restore_from_drive', { file: file, type: type, job_id: jobId })
                .then(data => {
                    if (!isCompletedByStream) {
                        window.showPremiumToast('Backup restored locally successfully!', 'success');
                        btnEl.disabled = false;
                        btnEl.textContent = originalText;

                        if (type === 'database') {
                            if (typeof pmRenderAllGrids === 'function') {
                                pmRenderAllGrids(data.backups || []);
                            }
                        } else {
                            if (typeof FileToolsEngine !== 'undefined') {
                                FileToolsEngine.renderGrid(data.backups || []);
                            }
                        }
                        this.checkStatus();
                    }
                })
                .catch(err => {
                    if (!isCompletedByStream) {
                        UiEngine.showAlert('Local Restore Failure', err.message, 'error');
                        btnEl.disabled = false;
                        btnEl.textContent = originalText;
                    }
                });
            }
        );
    }
}

/* --- PresetEngine.js --- */
/**
 * Project Mass - Preset & Tab State Engine
 * Handles AST template loading/saving and global UI memory persistence.
 */
const PresetEngine = (function() {

    // --- Private Engine Logic ---
    function pmInitializePresets() {
        const presets = window.PM_CONFIG.presets || {};

        function savePreset(name, type, payload) {
            FetchEngine.post('save_preset', { name: name, preset_type: type, payload: JSON.stringify(payload) })
            .then(data => {
                showPremiumToast('Preset saved successfully!', 'success');
                // Dynamically inject into DOM without reloading
                const selectId = 'pm-preset-' + type;
                const select = document.getElementById(selectId);
                if (select) {
                    const opt = document.createElement('option');
                    opt.value = data.id_preset;
                    opt.textContent = name;
                    opt.dataset.payload = typeof payload === 'string' ? payload : JSON.stringify(payload);
                    select.appendChild(opt);
                    select.value = data.id_preset;
                    select.dispatchEvent(new Event('change'));
                }
            });
        }

        function deletePreset(id, type, selectId) {
            showPremiumConfirmModal('Delete Preset', 'Are you sure you want to permanently delete this preset?', 'DELETE', () => {
                FetchEngine.post('delete_preset', { id_preset: id })
                .then(data => {
                    showPremiumToast('Preset deleted!', 'success');
                    // Remove from DOM dynamically
                    const select = document.getElementById(selectId);
                    if (select) {
                        const opt = select.querySelector(`option[value="${id}"]`);
                        if (opt) opt.remove();
                        select.value = '';
                        select.dispatchEvent(new Event('change'));
                    }
                });
            });
        }

        function populateDropdown(selectId, type) {
            const select = document.getElementById(selectId);
            const delBtn = document.getElementById('pm-btn-delete-preset-' + type);
            if (!select) return;
            
            if (presets[type]) {
                presets[type].forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id_preset;
                    opt.textContent = p.name;
                    opt.dataset.payload = typeof p.payload === 'string' ? p.payload : JSON.stringify(p.payload);
                    select.appendChild(opt);
                });
            }

            select.addEventListener('change', () => {
                if (delBtn) delBtn.disabled = !select.value;
            });

            if (delBtn) {
                delBtn.addEventListener('click', () => {
                    if (select.value) deletePreset(select.value, type, selectId);
                });
            }
        }

        function getActiveRootGroup() {
            const qbRoot = document.getElementById('pm-query-builder-root');
            return qbRoot ? qbRoot.querySelector('.pm-query-group') : null;
        }

        // 1. BACKUP PRESETS
        populateDropdown('pm-preset-backup', 'backup');
        document.getElementById('pm-btn-save-preset-backup')?.addEventListener('click', () => {
            const allCheckboxes = document.querySelectorAll('.pm-table-checkbox');
            const checkedCheckboxes = document.querySelectorAll('.pm-table-checkbox:checked');
            
            let tables = Array.from(checkedCheckboxes).map(cb => cb.value);
            if (tables.length === 0) return showPremiumAlert('Error', 'No tables selected!');
            
            // If every single table is selected, save as a dynamic "__ALL__" preset
            if (tables.length === allCheckboxes.length) {
                tables = ['__ALL__'];
            }
            
            showPremiumPromptModal('Save Backup Preset', 'Enter a name for your table loadout preset:', 'E.g., Catalog Only Core', (name) => {
                if (name) savePreset(name, 'backup', tables);
            });
        });
        document.getElementById('pm-preset-backup')?.addEventListener('change', function(e) {
            const warningDiv = document.getElementById('pm-preset-backup-warning');
            if (warningDiv) {
                warningDiv.style.display = 'none';
                const warningTextEl = warningDiv.querySelector('.pm-warning-text');
                if (warningTextEl) warningTextEl.textContent = '';
            }

            if (!this.value) {
                if (e.isTrusted) {
                    document.querySelectorAll('.pm-table-checkbox').forEach(cb => {
                        cb.checked = false;
                        cb.dispatchEvent(new Event('change', { bubbles: true }));
                    });
                    showPremiumToast('Tables deselected', 'info');
                }
                return;
            }
            
            let tables = [];
            try {
                let payloadData = this.options[this.selectedIndex].dataset.payload;
                tables = JSON.parse(payloadData);
                // Hotfix: If the preset was saved during the double-stringification bug, it will be a string array. We must double-parse it.
                if (typeof tables === 'string') {
                    tables = JSON.parse(tables);
                }
            } catch(err) {
                console.error("MassUtility: Failed to parse backup preset payload", err);
            }
            
            if (!Array.isArray(tables)) tables = [];

            document.querySelectorAll('.pm-table-checkbox').forEach(cb => {
                cb.checked = false;
                cb.dispatchEvent(new Event('change', { bubbles: true }));
            });

            if (tables.includes('__ALL__')) {
                // Dynamic restore of all current tables
                document.querySelectorAll('.pm-table-checkbox').forEach(cb => {
                    cb.checked = true;
                    cb.dispatchEvent(new Event('change', { bubbles: true }));
                });
            } else {
                tables.forEach(t => {
                    // Ensure we escape quotes if any, though tables shouldn't have them
                    const escapedTable = t.replace(/"/g, '\\"');
                    const cb = document.querySelector(`.pm-table-checkbox[value="${escapedTable}"]`);
                    if (cb) {
                        cb.checked = true;
                        cb.dispatchEvent(new Event('change', { bubbles: true }));
                    } else {
                        console.warn(`MassUtility: Preset tried to load table ${t} but it was not found in the DOM.`);
                    }
                });

                // Compute preset drift
                const allDomainCbs = document.querySelectorAll('.pm-table-checkbox[data-domain="catalog"], .pm-table-checkbox[data-domain="stock_attributes"], .pm-table-checkbox[data-domain="pricing_taxes"]');
                const allDomainValues = Array.from(allDomainCbs).map(cb => cb.value);
                const missingTablesInPreset = allDomainValues.filter(v => !tables.includes(v));
                const nonexistentTables = tables.filter(t => !document.querySelector(`.pm-table-checkbox[value="${t.replace(/"/g, '\\"')}"]`));

                if (warningDiv && (missingTablesInPreset.length > 0 || nonexistentTables.length > 0)) {
                    const warningTextEl = warningDiv.querySelector('.pm-warning-text');
                    let warningMsg = '';
                    if (missingTablesInPreset.length > 0) {
                        warningMsg += `Preset Drift: This preset is missing ${missingTablesInPreset.length} catalog tables (e.g. ${missingTablesInPreset.slice(0, 3).join(', ')}${missingTablesInPreset.length > 3 ? '...' : ''}). `;
                    }
                    if (nonexistentTables.length > 0) {
                        warningMsg += `Outdated tables: ${nonexistentTables.length} tables in this preset do not exist on this site (e.g. ${nonexistentTables.slice(0, 3).join(', ')}${nonexistentTables.length > 3 ? '...' : ''}).`;
                    }
                    if (warningTextEl && warningMsg !== '') {
                        warningTextEl.textContent = warningMsg;
                        warningDiv.style.display = 'flex';
                    }
                }
            }
            showPremiumToast('Backup table preset loaded', 'success');
        });

        // 2. QUERY PRESETS
        populateDropdown('pm-preset-query', 'query');
        document.getElementById('pm-btn-save-preset-query')?.addEventListener('click', () => {
            const rGroup = getActiveRootGroup();
            if (!rGroup) return showPremiumAlert('Error', 'Builder not ready');
            const ast = serializeGroup(rGroup);
            showPremiumPromptModal('Save Query Preset', 'Enter a name for this AST filter configuration:', 'E.g., Out of stock laptops', (name) => {
                if (name) savePreset(name, 'query', ast);
            });
        });

        // 3. MUTATE PRESETS
        populateDropdown('pm-preset-mutate', 'mutate');
        document.getElementById('pm-btn-save-preset-mutate')?.addEventListener('click', () => {
            const actions = [];
            document.querySelectorAll('.pm-mutation-rule').forEach(el => {
                actions.push({
                    field: el.querySelector('.pm-mutation-field').value,
                    type: el.querySelector('.pm-mutation-type').value,
                    value: el.querySelector('.pm-mutation-value').value.trim()
                });
            });
            if (actions.length === 0) return showPremiumAlert('Error', 'No mutation actions added!');
            showPremiumPromptModal('Save Mutate Preset', 'Enter a name for these action rules:', 'E.g., Set Price to 0', (name) => {
                if (name) savePreset(name, 'mutate', actions);
            });
        });

        // 4. MASTER COMBO PRESETS
        populateDropdown('pm-preset-master', 'master');
        document.getElementById('pm-btn-save-preset-master')?.addEventListener('click', () => {
            const rGroup = getActiveRootGroup();
            if (!rGroup) return showPremiumAlert('Error', 'Builder not ready');
            const ast = serializeGroup(rGroup);
            const actions = [];
            document.querySelectorAll('.pm-mutation-rule').forEach(el => {
                actions.push({
                    field: el.querySelector('.pm-mutation-field').value,
                    type: el.querySelector('.pm-mutation-type').value,
                    value: el.querySelector('.pm-mutation-value').value.trim()
                });
            });
            if (actions.length === 0) return showPremiumAlert('Error', 'No mutation actions added!');
            showPremiumPromptModal('Save Master Preset', 'Enter a name for this combined Query & Mutate template:', 'E.g., Global Black Friday Discount', (name) => {
                if (name) savePreset(name, 'master', { query: ast, mutate: actions });
            });
        });

        // Recursive builder for AST
        function buildASTDOM(groupData, groupNode) {
            if (!groupData) return;
            if (groupData.logical_operator) {
                groupNode.querySelector('.pm-group-operator').value = groupData.logical_operator;
            }
            if (groupData.rules) {
                groupData.rules.forEach(rule => {
                    const addRuleBtn = groupNode.querySelector(':scope > .pm-query-group-header .pm-btn-add-rule') || groupNode.querySelector('.pm-btn-add-rule');
                    if (addRuleBtn) addRuleBtn.click();
                    const newRule = groupNode.querySelector(':scope > .pm-query-rules-container').lastElementChild;
                    if (newRule && newRule.classList.contains('pm-query-rule')) {
                        newRule.querySelector('.pm-rule-field').value = rule.field;
                        newRule.querySelector('.pm-rule-field').dispatchEvent(new Event('change'));
                        newRule.querySelector('.pm-rule-operator').value = rule.operator;
                        newRule.querySelector('.pm-rule-value').value = rule.value;
                    }
                });
            }
            if (groupData.groups) {
                groupData.groups.forEach(subG => {
                    const addGroupBtn = groupNode.querySelector(':scope > .pm-query-group-header .pm-btn-add-group') || groupNode.querySelector('.pm-btn-add-group');
                    if (addGroupBtn) addGroupBtn.click();
                    const newSubGroup = groupNode.querySelector(':scope > .pm-query-subgroups-container').lastElementChild;
                    if (newSubGroup) buildASTDOM(subG, newSubGroup);
                });
            }
        }

        // Handlers for loading query / mutate
        function loadQuery(ast) {
            const rGroup = getActiveRootGroup();
            if (!rGroup) return;
            const rulesC = rGroup.querySelector(':scope > .pm-query-rules-container');
            const groupsC = rGroup.querySelector(':scope > .pm-query-subgroups-container');
            if (rulesC) rulesC.textContent = '';
            if (groupsC) groupsC.textContent = '';
            buildASTDOM(ast, rGroup);
        }

        function loadMutate(actions) {
            const container = document.getElementById('pm-mutation-rules-container');
            if (container) container.textContent = '';
            if (!actions || !Array.isArray(actions)) return;
            const addBtn = document.getElementById('pm-btn-add-mutation'); // fixed button ID
            actions.forEach(act => {
                if (addBtn) addBtn.click();
                const newRule = container.lastElementChild;
                if (newRule) {
                    const fieldSel = newRule.querySelector('.pm-mutation-field');
                    fieldSel.value = act.field;
                    fieldSel.dispatchEvent(new Event('change'));
                    
                    newRule.querySelector('.pm-mutation-type').value = act.type;
                    const valInput = newRule.querySelector('.pm-mutation-value');
                    if (valInput) {
                        valInput.value = act.value;
                    }
                }
            });
        }

        // --- PRESET UX OVERHAUL: STATELESS TEMPLATE INJECTION ---
        
        window.pmIsHydratingPreset = false;

        const resetDropdown = (id) => {
            const drop = document.getElementById(id);
            if (drop && drop.value !== '') {
                drop.value = '';
                drop.dispatchEvent(new Event('change'));
            }
        };

        const markPresetsDirty = () => {
            if (window.pmIsHydratingPreset) return;
            ['pm-preset-query', 'pm-preset-mutate', 'pm-preset-master'].forEach(resetDropdown);
        };

        // Mark dirty when user manually interacts with the builders
        document.getElementById('pm-query-builder-root')?.addEventListener('change', markPresetsDirty);
        document.getElementById('pm-query-builder-root')?.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) markPresetsDirty();
        });
        document.getElementById('pm-mutation-rules-container')?.addEventListener('change', markPresetsDirty);
        document.getElementById('pm-mutation-rules-container')?.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) markPresetsDirty();
        });
        document.getElementById('pm-btn-add-mutation')?.addEventListener('click', markPresetsDirty);

        document.getElementById('pm-preset-query')?.addEventListener('change', function(e) {
            if (!this.value || !e.isTrusted) return; // e.isTrusted ensures programmatic resets don't trigger loading
            let payload = JSON.parse(this.options[this.selectedIndex].dataset.payload);
            if (typeof payload === 'string') {
                try { payload = JSON.parse(payload); } catch(err) {}
            }
            
            window.pmIsHydratingPreset = true;
            try {
                loadQuery(payload);
                setTimeout(() => {
                    const btnCompile = document.getElementById('pm-btn-preview-query');
                    if (btnCompile) btnCompile.click();
                }, 100); // Slight delay to ensure DOM is fully painted
            } finally {
                window.pmIsHydratingPreset = false;
            }
            
            resetDropdown('pm-preset-master'); // Desync master since we just overwrote its query half
            showPremiumToast('Query template injected. Builder remains editable.', 'success');
        });
        
        document.getElementById('pm-preset-mutate')?.addEventListener('change', function(e) {
            if (!this.value || !e.isTrusted) return;
            let payload = JSON.parse(this.options[this.selectedIndex].dataset.payload);
            if (typeof payload === 'string') {
                try { payload = JSON.parse(payload); } catch(err) {}
            }
            
            window.pmIsHydratingPreset = true;
            try {
                loadMutate(payload);
                const step2 = document.getElementById('pm-wizard-step-2');
                if (step2 && payload && payload.length > 0) step2.style.display = 'block';
            } finally {
                window.pmIsHydratingPreset = false;
            }
            
            resetDropdown('pm-preset-master'); // Desync master since we just overwrote its mutate half
            showPremiumToast('Action Rules template injected. Builder remains editable.', 'success');
        });

        document.getElementById('pm-preset-master')?.addEventListener('change', function(e) {
            if (!this.value || !e.isTrusted) return;
            let payload = JSON.parse(this.options[this.selectedIndex].dataset.payload);
            if (typeof payload === 'string') {
                try { payload = JSON.parse(payload); } catch(err) {}
            }
            
            window.pmIsHydratingPreset = true;
            try {
                loadQuery(payload.query);
                loadMutate(payload.mutate);
                setTimeout(() => {
                    const btnCompile = document.getElementById('pm-btn-preview-query');
                    if (btnCompile) btnCompile.click();
                }, 100);
            } finally {
                window.pmIsHydratingPreset = false;
            }
            
            resetDropdown('pm-preset-query');
            resetDropdown('pm-preset-mutate');
            showPremiumToast('Master Combo template injected. Builders remain editable.', 'success');
        });
    }

    // --- Tab Persistence Initialization ---
    function bindTabPersistence() {
        const tabInterval = setInterval(() => {
            const tabRadios = document.querySelectorAll('input[name="pm-tab-group"]');
            if (tabRadios.length > 0) {
                clearInterval(tabInterval);
                const savedTab = sessionStorage.getItem('pm_active_tab');
                if (savedTab) {
                    const targetTab = document.getElementById(savedTab);
                    if (targetTab) targetTab.checked = true;
                }
                tabRadios.forEach(radio => {
                    radio.addEventListener('change', function() {
                        if (this.checked) sessionStorage.setItem('pm_active_tab', this.id);
                    });
                });
            }
        }, 100);
    }

    // --- Public API ---
    return {
        initialize: function() {
            pmInitializePresets();
            bindTabPersistence();
        }
    };
})();

/* --- GovernorEngine.js --- */
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

/* --- HistoryEngine.js --- */
/**
 * Project Mass - History & Rollback Engine
 * Handles the Mutation Ledger UI, Revert actions, Reapply payloads, and SQL Reconstruction previews.
 */
const HistoryEngine = (function() {

    // --- Private Engine Logic ---
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

                function pmReconstructSQL(details) {
                    const dbPrefix = window.pmDbPrefix || 'ps_';
                    const idShop = window.pmIdShop || 1;
                    
                    let mutationSql = '-- No executed mutations captured or invalid payload.\n';
                    let revertSql = '-- No rollback safety snapshots recorded or invalid payload.\n';

                    try {
                        const rawPayload = JSON.parse(details.raw_payload);
                        const revertData = JSON.parse(details.revert_payload);
                        
                        let productIds = revertData && revertData.target_ids ? revertData.target_ids : [];
                        if (productIds.length === 0) {
                            productIds = revertData && revertData.products ? Object.keys(revertData.products) : [];
                        }
                        const escapedIds = productIds.join(', ');

                        if (rawPayload && productIds.length > 0) {
                            let mStatements = [];
                            Object.keys(rawPayload).forEach(field => {
                                const action = rawPayload[field];
                                const type = (action.type || 'SET').toUpperCase();
                                const val = action.value;

                                switch (field) {
                                    case 'price':
                                    case 'product.price':
                                        const escFloat = parseFloat(val) || 0;
                                        if (type === 'ADD') {
                                            mStatements.push(`UPDATE \`${dbPrefix}product_shop\` SET price = price + ${escFloat} WHERE id_product IN (${escapedIds}) AND id_shop = ${idShop};`);
                                            mStatements.push(`UPDATE \`${dbPrefix}product\` SET price = price + ${escFloat} WHERE id_product IN (${escapedIds});`);
                                        } else if (type === 'MULTIPLY') {
                                            mStatements.push(`UPDATE \`${dbPrefix}product_shop\` SET price = price * ${escFloat} WHERE id_product IN (${escapedIds}) AND id_shop = ${idShop};`);
                                            mStatements.push(`UPDATE \`${dbPrefix}product\` SET price = price * ${escFloat} WHERE id_product IN (${escapedIds});`);
                                        } else {
                                            mStatements.push(`UPDATE \`${dbPrefix}product_shop\` SET price = ${escFloat} WHERE id_product IN (${escapedIds}) AND id_shop = ${idShop};`);
                                            mStatements.push(`UPDATE \`${dbPrefix}product\` SET price = ${escFloat} WHERE id_product IN (${escapedIds});`);
                                        }
                                        break;
                                    case 'active':
                                    case 'product.active':
                                        const escInt = parseInt(val) ? 1 : 0;
                                        mStatements.push(`UPDATE \`${dbPrefix}product_shop\` SET active = ${escInt} WHERE id_product IN (${escapedIds}) AND id_shop = ${idShop};`);
                                        mStatements.push(`UPDATE \`${dbPrefix}product\` SET active = ${escInt} WHERE id_product IN (${escapedIds});`);
                                        break;
                                    case 'reference':
                                    case 'product.reference':
                                        const escStr = String(val).replace(/'/g, "\\'");
                                        mStatements.push(`UPDATE \`${dbPrefix}product\` SET reference = '${escStr}' WHERE id_product IN (${escapedIds});`);
                                        break;
                                    case 'id_manufacturer':
                                    case 'manufacturer.id':
                                    case 'product.id_manufacturer':
                                        const escMan = parseInt(val) || 0;
                                        mStatements.push(`UPDATE \`${dbPrefix}product\` SET id_manufacturer = ${escMan} WHERE id_product IN (${escapedIds});`);
                                        mStatements.push(`UPDATE \`${dbPrefix}product_shop\` SET id_manufacturer = ${escMan} WHERE id_product IN (${escapedIds}) AND id_shop = ${idShop};`);
                                        break;
                                    case 'discount_percent':
                                        const escPct = (parseFloat(val) || 0) / 100.0;
                                        mStatements.push(`DELETE FROM \`${dbPrefix}specific_price\` WHERE id_product IN (${escapedIds}) AND id_shop IN (0, ${idShop});`);
                                        if (escPct > 0) {
                                            productIds.forEach(idProduct => {
                                                mStatements.push(`INSERT INTO \`${dbPrefix}specific_price\` (\`id_product\`, \`id_shop\`, \`id_currency\`, \`id_country\`, \`id_group\`, \`id_customer\`, \`id_product_attribute\`, \`price\`, \`from_quantity\`, \`reduction\`, \`reduction_tax\`, \`reduction_type\`, \`from\`, \`to\`) VALUES (${idProduct}, ${idShop}, 0, 0, 0, 0, 0, -1.000000, 1, ${escPct}, 1, 'percentage', '0000-00-00 00:00:00', '0000-00-00 00:00:00');`);
                                            });
                                        }
                                        break;
                                    case 'discount_amount':
                                        const escAmt = parseFloat(val) || 0;
                                        mStatements.push(`DELETE FROM \`${dbPrefix}specific_price\` WHERE id_product IN (${escapedIds}) AND id_shop IN (0, ${idShop});`);
                                        if (escAmt > 0) {
                                            productIds.forEach(idProduct => {
                                                mStatements.push(`INSERT INTO \`${dbPrefix}specific_price\` (\`id_product\`, \`id_shop\`, \`id_currency\`, \`id_country\`, \`id_group\`, \`id_customer\`, \`id_product_attribute\`, \`price\`, \`from_quantity\`, \`reduction\`, \`reduction_tax\`, \`reduction_type\`, \`from\`, \`to\`) VALUES (${idProduct}, ${idShop}, 0, 0, 0, 0, 0, -1.000000, 1, ${escAmt}, 1, 'amount', '0000-00-00 00:00:00', '0000-00-00 00:00:00');`);
                                            });
                                        }
                                        break;
                                }
                            });
                            if (mStatements.length > 0) {
                                mutationSql = mStatements.join('\n');
                            }
                        }
                    } catch (e) {
                        mutationSql = '-- Error compiling executed Mutation SQL: ' + e.message + '\n';
                    }

                    try {
                        const revertData = JSON.parse(details.revert_payload);
                        if (revertData) {
                            let rStatements = [];
                            // 1. Revert product & product_shop
                            if (revertData.products) {
                                let productGroups = {}; 
                                let productShopGroups = {};
                                
                                Object.keys(revertData.products).forEach(idProduct => {
                                    const data = revertData.products[idProduct];
                                    
                                    if (data.product) {
                                        let cols = [];
                                        Object.keys(data.product).forEach(col => {
                                            if (col === 'id_product') return;
                                            const val = data.product[col];
                                            cols.push(`\`${col}\` = ` + (val === null ? 'NULL' : `'${String(val).replace(/'/g, "\\'")}'`));
                                        });
                                        if (cols.length > 0) {
                                            let setStr = cols.join(', ');
                                            if (!productGroups[setStr]) productGroups[setStr] = [];
                                            productGroups[setStr].push(idProduct);
                                        }
                                    }
                                    
                                    if (data.product_shop) {
                                        let cols = [];
                                        Object.keys(data.product_shop).forEach(col => {
                                            if (col === 'id_product' || col === 'id_shop') return;
                                            const val = data.product_shop[col];
                                            cols.push(`\`${col}\` = ` + (val === null ? 'NULL' : `'${String(val).replace(/'/g, "\\'")}'`));
                                        });
                                        if (cols.length > 0) {
                                            let setStr = cols.join(', ');
                                            if (!productShopGroups[setStr]) productShopGroups[setStr] = [];
                                            productShopGroups[setStr].push(idProduct);
                                        }
                                    }
                                });
                                
                                Object.keys(productGroups).forEach(setStr => {
                                    const ids = productGroups[setStr].join(', ');
                                    rStatements.push(`UPDATE \`${dbPrefix}product\` SET ${setStr} WHERE id_product IN (${ids});`);
                                });
                                
                                Object.keys(productShopGroups).forEach(setStr => {
                                    const ids = productShopGroups[setStr].join(', ');
                                    rStatements.push(`UPDATE \`${dbPrefix}product_shop\` SET ${setStr} WHERE id_product IN (${ids}) AND id_shop = ${idShop};`);
                                });
                            }

                            // 2. Revert specific prices
                            let productIds = revertData.target_ids ? revertData.target_ids : [];
                            if (productIds.length === 0) {
                                productIds = revertData.products ? Object.keys(revertData.products) : [];
                            }
                            if (productIds.length > 0) {
                                rStatements.push(`DELETE FROM \`${dbPrefix}specific_price\` WHERE id_product IN (${productIds.join(', ')}) AND id_shop IN (0, ${idShop});`);
                            }
                            if (revertData.specific_prices && revertData.specific_prices.length > 0) {
                                revertData.specific_prices.forEach(sp => {
                                    let insertKeys = [];
                                    let insertValues = [];
                                    Object.keys(sp).forEach(col => {
                                        if (col === 'id_specific_price') return;
                                        insertKeys.push(`\`${col}\``);
                                        const val = sp[col];
                                        insertValues.push(val === null ? 'NULL' : `'${String(val).replace(/'/g, "\\'")}'`);
                                    });
                                    rStatements.push(`INSERT INTO \`${dbPrefix}specific_price\` (${insertKeys.join(', ')}) VALUES (${insertValues.join(', ')});`);
                                });
                            }

                            if (rStatements.length > 0) {
                                revertSql = rStatements.join('\n');
                            }
                        }
                    } catch (e) {
                        revertSql = '-- Error compiling Reversion SQL: ' + e.message + '\n';
                    }

                    return { mutationSql, revertSql };
                }

                // Pre-populated dynamic lists from PHP isolated bridge (TX-107.B)
                window.pmCategories = window.PM_CONFIG.categories;
                window.pmManufacturers = window.PM_CONFIG.manufacturers;
                window.pmProfiles = window.PM_CONFIG.profiles;
                window.pmBackups = window.PM_CONFIG.backups;
                window.pmDbPrefix = window.PM_CONFIG.dbPrefix;
                window.pmIdShop = window.PM_CONFIG.idShop;

                
    function bindEvents() {
        const historyBody = document.getElementById('pm-mutation-history-body');

// A. Light/Dark Theme persistent logic
                const toggleBtn = document.getElementById('pm-theme-toggle');
                const container = document.querySelector('.pm-container');
                const icon = document.getElementById('pm-theme-icon');
                const text = document.getElementById('pm-theme-text');
                
                if (toggleBtn && !toggleBtn.dataset.themeBound) {
                    toggleBtn.dataset.themeBound = "true";
                    const currentTheme = localStorage.getItem('pm-theme') || 'light';
                    if (currentTheme === 'dark') {
                        container.classList.add('pm-dark-mode');
                        if (typeof getPremiumModal === 'function' && getPremiumModal()) getPremiumModal().classList.add('pm-dark-mode');
                        if (icon) icon.textContent = '🌙';
                        if (text) text.textContent = 'Dark Mode';
                    }
                    
                    toggleBtn.addEventListener('click', function() {
                        container.classList.toggle('pm-dark-mode');
                        if (typeof getPremiumModal === 'function' && getPremiumModal()) getPremiumModal().classList.toggle('pm-dark-mode');
                        const isDark = container.classList.contains('pm-dark-mode');
                        localStorage.setItem('pm-theme', isDark ? 'dark' : 'light');
                        if (icon) icon.textContent = isDark ? '🌙' : '☀️';
                        if (text) text.textContent = isDark ? 'Dark Mode' : 'Light Mode';
                    });
                }

                const btnRefreshHistory = document.getElementById('pm-btn-refresh-history');

                function fetchMutationHistory() {
                    if (!historyBody) return;
                    
                    FetchEngine.post('get_mutation_history')
                    .then(data => {
                            if (data.success) {
                                historyBody.textContent = '';
                                if (data.history.length === 0) {
                                    const emptyHtml = `
                                        <tr>
                                            <td colspan="6" style="padding: 0;">
                                                <div class="pm-empty-state" style="margin: 0; border: none; border-radius: 0; background: transparent;">
                                                    <div class="pm-empty-state-icon">&#128194;</div>
                                                    <div class="pm-empty-state-text">No Mutations Found</div>
                                                    <div class="pm-empty-state-subtext">The mutation tracking ledger is currently empty.</div>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                                    historyBody.innerHTML = emptyHtml; // nosec
                                    return;
                                }

                                data.history.forEach(job => {
                                    let badgeColor = 'var(--pm-success)'; // Green for SUCCESS
                                    if (job.state === 'ROLLED_BACK') badgeColor = 'var(--pm-primary)'; // Blue
                                    else if (job.state === 'CRASHED') badgeColor = 'var(--pm-danger)'; // Red
                                    else if (job.state === 'PROCESSING') badgeColor = 'var(--pm-warning)'; // Yellow
                                    
                                    // Store raw details securely in global memory map to avoid HTML escaping issues
                                    if (!window.pmHistoryMap) window.pmHistoryMap = new Map();
                                    window.pmHistoryMap.set(job.job_id, {
                                        actions: job.actions,
                                        raw_payload: job.raw_payload,
                                        revert_payload: job.revert_payload
                                    });

                                    const row = document.createElement('tr');
                                    row.style.borderBottom = '1px solid var(--pm-border-color)';
                                    const rowHtml = `
                                        <td style="padding: 0.75rem 1rem; font-family: monospace; font-weight: 500; color: var(--pm-text-primary);">${escapeHtml(job.job_id)}</td>
                                        <td style="padding: 0.75rem 1rem; color: var(--pm-text-secondary);">${escapeHtml(job.date)}</td>
                                        <td style="padding: 0.75rem 1rem; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--pm-text-primary);" title="${escapeHtml(job.actions)}">${escapeHtml(job.actions)}</td>
                                        <td style="padding: 0.75rem 1rem; text-align: center; font-weight: 700; color: var(--pm-text-primary);">${escapeHtml(job.affected_count)}</td>
                                        <td style="padding: 0.75rem 1rem; text-align: center;">
                                            <span style="display: inline-block; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 700; color: var(--pm-white); background-color: ${badgeColor}; text-transform: uppercase;">
                                                ${escapeHtml(job.state)}
                                            </span>
                                        </td>
                                        <td style="padding: 0.75rem 1rem; text-align: right; display: flex; gap: 0.35rem; justify-content: flex-end;">
                                            <button type="button" class="pm-btn pm-btn-download-job" data-job-id="${escapeHtml(job.job_id)}" style="font-size: 0.75rem; padding: 0.3rem 0.6rem; background-color: var(--pm-primary); box-shadow: none;" title="Download JSON Gzip Archive">
                                                &#11015;&#65039; Download .gz
                                            </button>
                                            <button type="button" class="pm-btn pm-btn-inspect-job" data-job-id="${escapeHtml(job.job_id)}" style="font-size: 0.75rem; padding: 0.3rem 0.6rem; background-color: var(--pm-neutral); box-shadow: none;">
                                                &#128269; Inspect
                                            </button>
                                            ${job.state === 'ROLLED_BACK' ? `
                                                <button type="button" class="pm-btn pm-btn-reapply-job" data-job-id="${escapeHtml(job.job_id)}" style="font-size: 0.75rem; padding: 0.3rem 0.6rem; background-color: var(--pm-success); box-shadow: 0 2px 4px rgba(16, 185, 129, 0.15);" title="Re-executes original mutation rules. A fresh safety baseline will be captured before execution.">
                                                    &#128260; Reapply
                                                </button>
                                            ` : job.has_revert ? `
                                                <button type="button" class="pm-btn pm-btn-revert-job" data-job-id="${escapeHtml(job.job_id)}" style="font-size: 0.75rem; padding: 0.3rem 0.6rem; background-color: var(--pm-danger); box-shadow: 0 2px 4px rgba(239, 68, 68, 0.15);">
                                                    &#9889; Revert
                                                </button>
                                            ` : `<span style="font-size: 0.75rem; color: var(--pm-text-secondary); font-style: italic; align-self: center;">N/A</span>`}
                                            <button type="button" class="pm-btn pm-btn-delete-job" data-job-id="${escapeHtml(job.job_id)}" style="font-size: 0.75rem; padding: 0.3rem 0.6rem; background-color: var(--pm-danger); box-shadow: none;" title="Delete Ledger Entry">
                                                &#128465;&#65039; Delete
                                            </button>
                                        </td>
                                    `;
                                    row.innerHTML = rowHtml; // nosec
                                    historyBody.appendChild(row);
                                });

                                // Bind click handler on Inspect buttons
                                historyBody.querySelectorAll('.pm-btn-inspect-job').forEach(btn => {
                                    btn.addEventListener('click', function() {
                                        const jobId = this.getAttribute('data-job-id');
                                        const details = window.pmHistoryMap.get(jobId);
                                        if (!details) return;

                                        let payloadText, revertText;
                                        try { payloadText = JSON.stringify(JSON.parse(details.raw_payload), null, 4); } 
                                        catch (e) { payloadText = details.raw_payload || 'No action scope recorded.'; }
                                        try { revertText = JSON.stringify(JSON.parse(details.revert_payload), null, 4); } 
                                        catch (e) { revertText = details.revert_payload || 'No baseline rollback snapshots recorded.'; }

                                        // Compile and inject dynamic SQL reconstruction preview
                                        const reconstructed = pmReconstructSQL(details);

                                        let modalBody = `
                                            <div style="font-size: 0.9rem; color: var(--pm-text-secondary); line-height: 1.5; margin-bottom: 1.25rem;">
                                                Analyze the target filters (Visual AST Payload), actions, and captured baseline snapshots for a complete audit trail.
                                            </div>

                                            <!-- Inspect Modal Inner Sub-tabs -->
                                            <div class="pm-sub-tabs" style="margin-bottom: 1.25rem;">
                                                <button type="button" class="pm-sub-tab-btn active" id="pm-btn-inspect-tab-json" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="document.getElementById('pm-btn-inspect-tab-json').classList.add('active'); document.getElementById('pm-btn-inspect-tab-sql').classList.remove('active'); document.getElementById('pm-inspect-content-json').style.display='flex'; document.getElementById('pm-inspect-content-sql').style.display='none';">📋 JSON Payloads</button>
                                                <button type="button" class="pm-sub-tab-btn" id="pm-btn-inspect-tab-sql" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="document.getElementById('pm-btn-inspect-tab-sql').classList.add('active'); document.getElementById('pm-btn-inspect-tab-json').classList.remove('active'); document.getElementById('pm-inspect-content-sql').style.display='flex'; document.getElementById('pm-inspect-content-json').style.display='none';">🌐 SQL Code Preview</button>
                                            </div>
                                            
                                            <!-- JSON Payloads Container -->
                                            <div id="pm-inspect-content-json" style="display: flex; flex-direction: column; gap: 1.25rem; margin-bottom: 1.5rem;">
                                                <div>
                                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                                        <span class="pm-subtitle" style="font-weight: 600;">&#9889; Mutation Action Rules & Scope</span>
                                                        <button type="button" style="background: none; border: none; cursor: pointer; color: var(--pm-text-secondary); font-size: 1.1rem; padding: 0; transition: transform 0.2s;" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText).then(() => showPremiumToast('Copied to clipboard!')); this.style.transform = 'scale(1.2)'; setTimeout(() => this.style.transform = 'scale(1)', 200);" title="Copy Snippet">&#128203;</button>
                                                    </div>
                                                    <pre class="pm-log-terminal" style="max-height: 160px; font-size: 0.8rem; overflow-y: auto; margin: 0;">${escapeHtml(payloadText)}</pre>
                                                </div>
                                                <div>
                                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                                        <span class="pm-subtitle" style="font-weight: 600;">&#128302; Captured Baseline Revert States (Original Database Cell Margins)</span>
                                                        <button type="button" style="background: none; border: none; cursor: pointer; color: var(--pm-text-secondary); font-size: 1.1rem; padding: 0; transition: transform 0.2s;" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText).then(() => showPremiumToast('Copied to clipboard!')); this.style.transform = 'scale(1.2)'; setTimeout(() => this.style.transform = 'scale(1)', 200);" title="Copy Snippet">&#128203;</button>
                                                    </div>
                                                    <pre class="pm-log-terminal" style="max-height: 250px; font-size: 0.8rem; overflow-y: auto; margin: 0;">${escapeHtml(revertText)}</pre>
                                                </div>
                                            </div>

                                            <!-- SQL Code Preview Container -->
                                            <div id="pm-inspect-content-sql" style="display: none; flex-direction: column; gap: 1.25rem; margin-bottom: 1.5rem;">
                                                <div>
                                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                                        <span class="pm-subtitle" style="font-weight: 600; color: var(--pm-warning);">&#9889; Executed Mutation SQL Statements</span>
                                                        <button type="button" style="background: none; border: none; cursor: pointer; color: var(--pm-text-secondary); font-size: 1.1rem; padding: 0; transition: transform 0.2s;" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText).then(() => showPremiumToast('Copied to clipboard!')); this.style.transform = 'scale(1.2)'; setTimeout(() => this.style.transform = 'scale(1)', 200);" title="Copy Snippet">&#128203;</button>
                                                    </div>
                                                    <pre class="pm-log-terminal" style="max-height: 200px; font-size: 0.8rem; overflow-y: auto; margin: 0; color: var(--pm-primary-light); border-color: rgba(var(--pm-primary-rgb), 0.2); background: var(--pm-terminal-bg);">${escapeHtml(reconstructed.mutationSql)}</pre>
                                                </div>
                                                <div>
                                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                                        <span class="pm-subtitle" style="font-weight: 600; color: var(--pm-danger);">&#128302; Projected Rollback Reversion SQL Statements</span>
                                                        <button type="button" style="background: none; border: none; cursor: pointer; color: var(--pm-text-secondary); font-size: 1.1rem; padding: 0; transition: transform 0.2s;" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText).then(() => showPremiumToast('Copied to clipboard!')); this.style.transform = 'scale(1.2)'; setTimeout(() => this.style.transform = 'scale(1)', 200);" title="Copy Snippet">&#128203;</button>
                                                    </div>
                                                    <pre class="pm-log-terminal" style="max-height: 250px; font-size: 0.8rem; overflow-y: auto; margin: 0; color: var(--pm-primary-light); border-color: rgba(var(--pm-danger-rgb), 0.2); background: var(--pm-terminal-bg);">${escapeHtml(reconstructed.revertSql)}</pre>
                                                </div>
                                            </div>
                                        `;
                                        showPremiumConfirmModal('&#128269; Inspect Mutation Details & Baseline', modalBody, null, null);
                                    });
                                });

                                // Bind click handler on Revert buttons
                                historyBody.querySelectorAll('.pm-btn-revert-job').forEach(btn => {
                                    btn.addEventListener('click', function() {
                                        const jobId = this.getAttribute('data-job-id');
                                        
                                        showPremiumConfirmModal(
                                            'Double-Key Revert Verification',
                                            `You are about to revert all database changes made by job <strong>${escapeHtml(jobId)}</strong>.<br><br>This will safely restore the original baseline catalog values recorded during the transaction's pre-flight compilation block.<br><br>To proceed, please type <strong style="color: var(--pm-danger);">REVERT</strong> below:`,
                                            'REVERT',
                                            () => {
                                                btn.disabled = true;
                                                btn.textContent = 'Reverting...';
                                                showPremiumToast('Rollback sequence initiated. Processing transactional reverse-sync...');

                                                FetchEngine.post('rollback_mutation', { job_id: jobId })
                                                    .then(result => {
                                                        showPremiumAlert('Rollback Successful', `Successfully reverted all catalog mutations for job <strong>${escapeHtml(jobId)}</strong>. baseline values restored!`);
                                                        showPremiumToast('Transaction rollback complete.');
                                                        fetchMutationHistory();
                                                        
                                                        const generalTerminal = document.getElementById('pm-log-terminal');
                                                        if (generalTerminal && result.log_content) {
                                                            generalTerminal.textContent = result.log_content;
                                                        }
                                                    })
                                                    .catch(err => {
                                                        btn.disabled = false;
                                                        btn.textContent = '⚡ Revert';
                                                        showPremiumAlert('Rollback Failed', err.message || 'The rollback sequence failed.', 'error');
                                                    });
                                            }
                                        );
                                    });
                                });

                                // Bind click handler on Reapply buttons
                                historyBody.querySelectorAll('.pm-btn-reapply-job').forEach(btn => {
                                    btn.addEventListener('click', function() {
                                        const jobId = this.getAttribute('data-job-id');
                                        
                                        showPremiumConfirmModal(
                                            'Reapply Mutation Rules',
                                            `Are you sure you want to re-execute the original mutation rules for job <strong>${escapeHtml(jobId)}</strong>?<br><br><span style="color: var(--pm-warning);">&#9888;&#65039; A fresh safety baseline snapshot will be automatically captured based on the database's <strong>current</strong> values before execution.</span><br><br>To proceed, please type <strong style="color: var(--pm-success);">REAPPLY</strong> below:`,
                                            'REAPPLY',
                                            () => {
                                                btn.disabled = true;
                                                btn.textContent = 'Reapplying...';
                                                showPremiumToast('Reapply sequence initiated. Capturing fresh baseline and applying rules...');

                                                FetchEngine.post('reapply_mutation', { job_id: jobId })
                                                    .then(result => {
                                                        showPremiumAlert('Reapply Successful', `Successfully reapplied mutation rules for job <strong>${escapeHtml(jobId)}</strong> and updated safety baseline.`);
                                                        showPremiumToast('Mutation successfully reapplied.');
                                                        fetchMutationHistory();
                                                        
                                                        const generalTerminal = document.getElementById('pm-log-terminal');
                                                        if (generalTerminal && result.log_content) {
                                                            generalTerminal.textContent = result.log_content;
                                                        }
                                                    })
                                                    .catch(err => {
                                                        btn.disabled = false;
                                                        btn.textContent = '🔄 Reapply';
                                                        showPremiumAlert('Reapply Failed', err.message || 'The reapply sequence failed.', 'error');
                                                    });
                                            }
                                        );
                                    });
                                });

                                // Bind click handler on Download buttons
                                historyBody.querySelectorAll('.pm-btn-download-job').forEach(btn => {
                                    btn.addEventListener('click', function() {
                                        const jobId = this.getAttribute('data-job-id');
                                        window.location.href = window.location.href + '&ajax=1&action=download_mutation_gzip&job_id=' + encodeURIComponent(jobId);
                                    });
                                });

                                // Bind click handler on Delete buttons
                                historyBody.querySelectorAll('.pm-btn-delete-job').forEach(btn => {
                                    btn.addEventListener('click', function() {
                                        const jobId = this.getAttribute('data-job-id');
                                        showPremiumConfirmModal(
                                            'Delete Ledger Entry',
                                            `Are you sure you want to permanently delete the mutation ledger entry for <strong>${escapeHtml(jobId)}</strong>?<br><br>This will permanently erase its JSON payloads from the server.`,
                                            'DELETE',
                                            () => {
                                                const row = btn.closest('tr');
                                                if (row) row.style.opacity = '0.5';
                                                FetchEngine.post('delete_mutation_job', { job_id: jobId })
                                                    .then(result => {
                                                        showPremiumToast(`Deleted ledger entry for ${escapeHtml(jobId)}`);
                                                        fetchMutationHistory();
                                                    })
                                                    .catch(err => {
                                                        if (row) row.style.opacity = '1';
                                                        showPremiumAlert('Error Deleting', err.message || 'Failed to delete ledger entry.');
                                                    });
                                            }
                                        );
                                    });
                                });
                            }
                        })
                        .catch(err => {
                            console.error('Failed fetching mutation log history:', err);
                        });
                }

                if (btnRefreshHistory) {
                    btnRefreshHistory.addEventListener('click', fetchMutationHistory);
                }

                // Call on tab changes
                const tabHistory = document.getElementById('pm-tab-history');
                if (tabHistory) {
                    tabHistory.addEventListener('change', function() {
                        if (this.checked) fetchMutationHistory();
                    });
                }
                
                // Accordion switching logic [TX-207] Refactored for smooth grid transitions
                const accordionHeaders = document.querySelectorAll('.pm-accordion-header');
                accordionHeaders.forEach(header => {
                    header.addEventListener('click', function() {
                        const contentWrapper = header.nextElementSibling;
                        const icon = header.querySelector('.pm-accordion-icon');
                        const isVisible = contentWrapper.classList.contains('is-open');
                        
                        // Close all accordions in the same card
                        const parent = header.closest('.pm-card');
                        parent.querySelectorAll('.pm-accordion-content-wrapper').forEach(c => c.classList.remove('is-open'));
                        parent.querySelectorAll('.pm-accordion-icon').forEach(i => i.textContent = '▼');
                        
                        if (!isVisible) {
                            contentWrapper.classList.add('is-open');
                            icon.textContent = '▲';
                        }
                    });
                });



                // N. Admin Purge Controls (Clear History and Clear Backups)
                const btnClearHistory = document.getElementById('pm-btn-clear-history');
                if (btnClearHistory) {
                    btnClearHistory.addEventListener('click', function() {
                        if (!window.pmHistoryMap || window.pmHistoryMap.size === 0) {
                            showPremiumAlert('Nothing to Clear', 'There is nothing to clear. The mutation history log is already empty.', 'info');
                            return;
                        }
                        showPremiumConfirmModal(
                            'Clear Mutation History',
                            'You are about to permanently purge the entire mutation history log tracking database table. This action cannot be undone.<br><br>To proceed, please type <strong style="color: var(--pm-danger);">CLEAR</strong> below:',
                            'CLEAR',
                            () => {
                                FetchEngine.post('clear_mutation_history')
                                .then(data => {
                                        if (data.success) {
                                            showPremiumToast('Mutation history cleared successfully.');
                                            window.pmHistoryMap = new Map();
                                            fetchMutationHistory();
                                        } else {
                                            showPremiumAlert('Failed to Clear', data.error || 'Unknown error', 'error');
                                        }
                                    })
                                    .catch(err => showPremiumAlert('Connection Error', err, 'error'));
                            }
                        );
                    });
                }

                // O. Event Logs Tab Controls
                const btnClearLogs = document.getElementById('pm-btn-clear-logs');
                if (btnClearLogs) {
                    btnClearLogs.addEventListener('click', function() {
                        showPremiumConfirmModal(
                            'Clear Event Logs',
                            'Are you sure you want to permanently clear the staging event logging console?<br><br>To proceed, please type <strong style="color: var(--pm-danger);">CLEAR</strong> below:',
                            'CLEAR',
                            () => {
                                FetchEngine.post('clear_logs')
                                .then(data => {
                                    if (data.success) {
                                        showPremiumToast('Event logs cleared successfully.');
                                        const term = document.getElementById('pm-log-terminal');
                                        if (term) term.textContent = 'No event logs compiled yet.';
                                    } else {
                                        showPremiumAlert('Failed to Clear Logs', data.error || 'Unknown error', 'error');
                                    }
                                })
                                .catch(err => showPremiumAlert('Connection Error', err, 'error'));
                            }
                        );
                    });
                }

                const btnDownloadLogs = document.getElementById('pm-btn-download-logs');
                if (btnDownloadLogs) {
                    btnDownloadLogs.addEventListener('click', function() {
                        window.location.href = window.location.href + '&ajax=1&action=download_logs';
                    });
                }

                // Global Copy to Clipboard delegated listener
                document.addEventListener('click', function(e) {
                    const trigger = e.target.closest('.pm-copy-trigger');
                    if (trigger) {
                        const text = trigger.getAttribute('data-copy');
                        if (text) {
                            navigator.clipboard.writeText(text).then(() => {
                                if (typeof showPremiumToast === 'function') {
                                    showPremiumToast('Copied to clipboard!');
                                }
                            }).catch(err => {
                                console.error('Clipboard copy failed:', err);
                            });
                        }
                    }
                });

                // Fetch history initially in background
                // Initialize listeners


        // Expose fetchMutationHistory to the IIFE scope
        window._pmFetchMutationHistory = fetchMutationHistory;
    }
    
    // --- Public API ---
    return {
        initialize: function() {
            bindEvents();
            if (typeof window._pmFetchMutationHistory === 'function') {
                window._pmFetchMutationHistory();
            }
        },
        refresh: function() {
            if (typeof window._pmFetchMutationHistory === 'function') {
                window._pmFetchMutationHistory();
            }
        }
    };
})();

/* --- AstEngine.js --- */
/**
 * Project Mass - AST Builder Engine
 * Handles the visual query builder, JSON payload generation, human-readable translations,
 * and the recursive chunked execution loop.
 */
const AstEngine = (function() {

    function bindEvents() {
        // F. Query Builder visual rendering and AJAX preview logic
                const builderRoot = document.getElementById('pm-query-builder-root');
                const btnPreviewQuery = document.getElementById('pm-btn-preview-query');

                function createRuleNode() {
                    const div = document.createElement('div');
                    div.className = 'pm-query-rule';
                    const ruleHtml = `
                        <select class="pm-query-select pm-rule-field">
                            <option value="product.active">Product: Active Status</option>
                            <option value="product.reference">Product: Reference / SKU</option>
                            <option value="product.price">Product: Base Price</option>
                            <option value="product.final_price">Product: Discounted Price</option>
                            <option value="product.has_discount">Product: Has Active Discount</option>
                            <option value="product.name">Product: Name</option>
                            <option value="category.id">Category: ID</option>
                            <option value="manufacturer.id">Manufacturer: ID</option>
                            <option value="product.id_manufacturer">Product: Manufacturer ID</option>
                            <option value="employee.id_profile">Employee: Profile (User Type)</option>
                            <option value="discount.reduction_percent">Discount: Reduction Percentage (%)</option>
                            <option value="discount.reduction_amount">Discount: Flat Amount Reduction</option>
                        </select>
                        <select class="pm-query-select pm-rule-operator">
                            <option value="EQUAL">Equals</option>
                            <option value="NOT_EQUAL">Not Equals</option>
                            <option value="GREATER_THAN">Greater Than</option>
                            <option value="LESS_THAN">Less Than</option>
                            <option value="LIKE">Contains (Like)</option>
                            <option value="IN">In List (Comma separated)</option>
                            <option value="NOT_IN">Not In List (Comma separated)</option>
                        </select>
                        <span class="pm-rule-value-container"></span>
                        <button type="button" class="pm-btn pm-btn-delete-rule" style="background-color: #ef4444; padding: 0.35rem 0.6rem; font-size: 0.75rem; box-shadow: none;">&#128465;&#65039;</button>
                    `;
                    div.innerHTML = ruleHtml; // nosec
                    
                    const fieldSelect = div.querySelector('.pm-rule-field');
                    const opSelect = div.querySelector('.pm-rule-operator');
                    const valueContainer = div.querySelector('.pm-rule-value-container');
                    let forceManualMode = false; // Persistent user mode toggle

                    function updateValueInput() {
                        const field = fieldSelect.value;
                        const op = opSelect.value;
                        valueContainer.innerHTML = ''; // nosec
                        
                        // IN and NOT_IN operators strictly require manual comma-separated text lists
                        const isListOp = (op === 'IN' || op === 'NOT_IN');
                        
                        // Build options list for selection fields
                        let selectOptions = null;
                        if (field === 'product.active') {
                            selectOptions = [
                                { value: '1', label: 'Active' },
                                { value: '0', label: 'Inactive' }
                            ];
                        } else if (field === 'product.has_discount') {
                            selectOptions = [
                                { value: '1', label: 'Has Active Discount' },
                                { value: '0', label: 'No Discount' }
                            ];
                        } else if (field === 'category.id' && window.pmCategories && window.pmCategories.length > 0) {
                            selectOptions = window.pmCategories.map(c => ({ value: c.id, label: `[${c.id}] ${c.name}` }));
                        } else if ((field === 'manufacturer.id' || field === 'product.id_manufacturer') && window.pmManufacturers && window.pmManufacturers.length > 0) {
                            selectOptions = window.pmManufacturers.map(m => ({ value: m.id, label: `[${m.id}] ${m.name}` }));
                        } else if (field === 'employee.id_profile' && window.pmProfiles && window.pmProfiles.length > 0) {
                            selectOptions = window.pmProfiles.map(p => ({ value: p.id, label: `[${p.id}] ${p.name}` }));
                        }

                        if (selectOptions && !isListOp && !forceManualMode) {
                            // Selection Dropdown Mode
                            const selectEl = document.createElement('select');
                            selectEl.className = 'pm-query-select pm-rule-value';
                            selectEl.style.minWidth = '180px';
                            selectOptions.forEach(opt => {
                                const option = document.createElement('option');
                                option.value = opt.value;
                                option.textContent = opt.label;
                                selectEl.appendChild(option);
                            });

                            const modeToggle = document.createElement('button');
                            modeToggle.type = 'button';
                            modeToggle.className = 'pm-btn-toggle-mode';
                            modeToggle.title = 'Switch to manual type-in mode';
                            modeToggle.innerHTML = '📝'; // nosec
                            modeToggle.addEventListener('click', function() {
                                forceManualMode = true;
                                updateValueInput();
                            });

                            valueContainer.appendChild(selectEl);
                            valueContainer.appendChild(modeToggle);
                        } else {
                            // Manual Input Mode
                            const inputEl = document.createElement('input');
                            inputEl.type = 'text';
                            inputEl.className = 'pm-query-input pm-rule-value';
                            inputEl.placeholder = isListOp ? 'Enter values (comma separated)...' : 'Enter value...';
                            inputEl.style.minWidth = '180px';

                            const modeToggle = document.createElement('button');
                            modeToggle.type = 'button';
                            modeToggle.className = 'pm-btn-toggle-mode';
                            modeToggle.title = 'Switch to selection dropdown mode';
                            modeToggle.innerHTML = '📋'; // nosec
                            modeToggle.addEventListener('click', function() {
                                forceManualMode = false;
                                updateValueInput();
                            });

                            valueContainer.appendChild(inputEl);
                            if (selectOptions && !isListOp) {
                                valueContainer.appendChild(modeToggle);
                            }
                        }
                    }
                    
                    fieldSelect.addEventListener('change', function() {
                        forceManualMode = false; // Reset toggle status on field changes
                        updateValueInput();
                    });
                    opSelect.addEventListener('change', updateValueInput);
                    updateValueInput(); // Initial trigger

                    div.querySelector('.pm-btn-delete-rule').addEventListener('click', function() {
                        div.remove();
                    });
                    return div;
                }

                function createGroupNode(isRoot = false) {
                    const div = document.createElement('div');
                    div.className = 'pm-query-group';
                    
                    const groupHtml = `
                        <div class="pm-query-group-header">
                            <div style="display: flex; align-items: center; gap: 0.4rem;">
                                <select class="pm-query-select pm-group-operator" style="font-weight: 700;">
                                    <option value="AND">AND (All match)</option>
                                    <option value="OR">OR (Any match)</option>
                                    <option value="NAND">NAND (Not all match)</option>
                                    <option value="NOR">NOR (None match)</option>
                                    <option value="XOR">XOR (Exactly one matches)</option>
                                </select>
                                <div class="pm-tooltip-wrapper">
                                    <span class="pm-tooltip-trigger">ℹ️</span>
                                    <div class="pm-tooltip-popup">
                                        <div class="pm-tooltip-title">Logical Operators Cheat Sheet</div>
                                        <div class="pm-tooltip-row"><span class="pm-gate-badge gate-and">AND</span> <span>All nested conditions must be <strong>True</strong>.</span></div>
                                        <div class="pm-tooltip-row"><span class="pm-gate-badge gate-or">OR</span> <span>At least one nested condition must be <strong>True</strong>.</span></div>
                                        <div class="pm-tooltip-row"><span class="pm-gate-badge gate-nand">NAND</span> <span>NOT all conditions can be true (negated AND).</span></div>
                                        <div class="pm-tooltip-row"><span class="pm-gate-badge gate-nor">NOR</span> <span>None of the conditions can be true (negated OR).</span></div>
                                        <div class="pm-tooltip-row"><span class="pm-gate-badge gate-xor">XOR</span> <span>Exactly <strong>one</strong> nested condition must be true.</span></div>
                                    </div>
                                </div>
                            </div>
                            <div style="display: flex; gap: 0.5rem;">
                                <button type="button" class="pm-btn pm-btn-add-rule" style="background-color: #3b82f6; padding: 0.35rem 0.6rem; font-size: 0.75rem; box-shadow: none;">➕ Rule</button>
                                <button type="button" class="pm-btn pm-btn-add-group" style="background-color: #64748b; padding: 0.35rem 0.6rem; font-size: 0.75rem; box-shadow: none;">➕ Group</button>
                                ${!isRoot ? `<button type="button" class="pm-btn pm-btn-delete-group" style="background-color: #ef4444; padding: 0.35rem 0.6rem; font-size: 0.75rem; box-shadow: none;">&#128465;&#65039; Group</button>` : ''}
                            </div>
                        </div>
                        <div class="pm-query-rules-container"></div>
                        <div class="pm-query-subgroups-container"></div>
                    `;
                    div.innerHTML = groupHtml; // nosec

                    const rulesContainer = div.querySelector('.pm-query-rules-container');
                    const subgroupsContainer = div.querySelector('.pm-query-subgroups-container');

                    div.querySelector('.pm-group-operator').addEventListener('change', function() {
                        const val = this.value;
                        div.className = 'pm-query-group';
                        if (val === 'OR') {
                            div.classList.add('pm-group-or');
                        } else if (val === 'NAND') {
                            div.classList.add('pm-group-nand');
                        } else if (val === 'NOR') {
                            div.classList.add('pm-group-nor');
                        } else if (val === 'XOR') {
                            div.classList.add('pm-group-xor');
                        }
                    });

                    div.querySelector('.pm-btn-add-rule').addEventListener('click', function() {
                        rulesContainer.appendChild(createRuleNode());
                    });

                    div.querySelector('.pm-btn-add-group').addEventListener('click', function() {
                        subgroupsContainer.appendChild(createGroupNode(false));
                    });

                    if (!isRoot) {
                        div.querySelector('.pm-btn-delete-group').addEventListener('click', function() {
                            div.remove();
                        });
                    }

                    // Add one default rule
                    rulesContainer.appendChild(createRuleNode());

                    return div;
                }

                function serializeGroup(groupEl) {
                    const logicalOperator = groupEl.querySelector('.pm-group-operator').value;
                    const rules = [];
                    const groups = [];

                    // Process direct rules in this group only
                    const rulesContainer = groupEl.querySelector('.pm-query-rules-container');
                    if (rulesContainer) {
                        const ruleEls = rulesContainer.querySelectorAll(':scope > .pm-query-rule');
                        ruleEls.forEach(ruleEl => {
                            const field = ruleEl.querySelector('.pm-rule-field').value;
                            const operator = ruleEl.querySelector('.pm-rule-operator').value;
                            let valStr = ruleEl.querySelector('.pm-rule-value').value.trim();

                            let value = valStr;
                            if (operator === 'IN' || operator === 'NOT_IN') {
                                value = valStr.split(',').map(s => s.trim()).filter(s => s !== '');
                            } else if (field === 'product.active' || field === 'category.id' || field === 'manufacturer.id' || field === 'product.id_manufacturer' || field === 'product.has_discount' || field === 'employee.id_profile') {
                                value = isNaN(valStr) ? valStr : parseInt(valStr, 10);
                            } else if (field === 'product.price' || field === 'product.final_price' || field === 'discount.reduction_percent' || field === 'discount.reduction_amount') {
                                value = isNaN(valStr) ? valStr : parseFloat(valStr);
                            }

                            rules.push({ field, operator, value });
                        });
                    }

                    // Process subgroups in this group only
                    const subgroupsContainer = groupEl.querySelector('.pm-query-subgroups-container');
                    if (subgroupsContainer) {
                        const subGroupEls = subgroupsContainer.querySelectorAll(':scope > .pm-query-group');
                        subGroupEls.forEach(subEl => {
                            groups.push(serializeGroup(subEl));
                        });
                    }

                    return {
                        logical_operator: logicalOperator,
                        rules: rules,
                        groups: groups
                    };
                }

                if (builderRoot) {
                    // Draw initial root group
                    const rootGroup = createGroupNode(true);
                    builderRoot.appendChild(rootGroup);

                    const resultPanel = document.getElementById('pm-query-result-panel');

                    // G. Live Human-Readable Translation Engine
                    const explanationText = document.getElementById('pm-query-explanation-text');

                    function translateGroup(group) {
                        const operator = group.logical_operator;
                        const rules = group.rules || [];
                        const groups = group.groups || [];

                        if (rules.length === 0 && groups.length === 0) {
                            return '';
                        }

                        const ruleTexts = rules.map(rule => {
                            const fieldLabels = {
                                'product.active': 'Active Status',
                                'product.reference': 'Reference / SKU',
                                'product.price': 'Base Price',
                                'product.final_price': 'Discounted Price',
                                'product.has_discount': 'Discount Status',
                                'product.name': 'Name',
                                'category.id': 'Category ID',
                                'manufacturer.id': 'Manufacturer ID',
                                'product.id_manufacturer': 'Manufacturer ID',
                                'employee.id_profile': 'Employee Profile',
                                'discount.reduction_percent': 'Discount Reduction %',
                                'discount.reduction_amount': 'Discount Flat Amount'
                            };
                            const fieldLabel = fieldLabels[rule.field] || rule.field;

                            const opLabels = {
                                'EQUAL': 'is',
                                'NOT_EQUAL': 'is not',
                                'GREATER_THAN': 'is greater than',
                                'LESS_THAN': 'is less than',
                                'LIKE': 'contains',
                                'IN': 'is in list',
                                'NOT_IN': 'is not in list'
                            };
                            const opLabel = opLabels[rule.operator] || rule.operator;

                            let valText = rule.value;
                            if (rule.field === 'product.active') {
                                valText = (rule.value == '1') ? 'Active' : 'Inactive';
                            } else if (rule.field === 'product.has_discount') {
                                valText = (rule.value == '1') ? 'Has Discount' : 'No Discount';
                            } else if (Array.isArray(rule.value)) {
                                valText = `[${rule.value.join(', ')}]`;
                            } else if (rule.value === '' || rule.value === undefined || rule.value === null) {
                                valText = '...';
                            }

                            return `<strong>${fieldLabel}</strong> ${opLabel} <strong>"${valText}"</strong>`;
                        });

                        const subGroupTexts = groups.map(g => {
                            const subText = translateGroup(g);
                            return subText ? `(${subText})` : '';
                        }).filter(t => t !== '');

                        const allParts = [...ruleTexts, ...subGroupTexts];
                        if (allParts.length === 0) return '';

                        switch (operator) {
                            case 'AND':
                                return allParts.join(' <span style="color:#3b82f6;font-weight:700;">AND</span> ');
                            case 'OR':
                                return allParts.join(' <span style="color:#f59e0b;font-weight:700;">OR</span> ');
                            case 'NAND':
                                return `<strong>NOT ALL</strong> of the following are true: [ ${allParts.join(', ')} ]`;
                            case 'NOR':
                                return `<strong>NONE</strong> of the following are true: [ ${allParts.join(', ')} ]`;
                            case 'XOR':
                                return `<strong>EXACTLY ONE</strong> of the following is true: [ ${allParts.join(', ')} ]`;
                            default:
                                return allParts.join(` ${operator} `);
                        }
                    }

                    function updateLiveExplanation() {
                        if (!builderRoot || !explanationText) return;
                        
                        const rootGroupEl = builderRoot.querySelector('.pm-query-group');
                        if (!rootGroupEl) {
                            explanationText.innerHTML = 'No rules defined yet. Add a rule below to start.'; // nosec
                            return;
                        }

                        const ast = serializeGroup(rootGroupEl);
                        const translation = translateGroup(ast);
                        if (translation) {
                            explanationText.innerHTML = `This matches products where: ${translation}`; // nosec
                        } else {
                            explanationText.innerHTML = 'No active rules configured.'; // nosec
                        }

                        // Safety Lock: When query inputs drift, hide Step 2 so mutations cannot run until a fresh compilation is verified!
                        window.lastCompiledAst = null;
                        const step2 = document.getElementById('pm-wizard-step-2');
                        if (step2) {
                            step2.style.display = 'none';
                        }
                    }

                    // Attach real-time event delegation updates
                    builderRoot.addEventListener('change', updateLiveExplanation);
                    builderRoot.addEventListener('input', updateLiveExplanation);
                    builderRoot.addEventListener('keyup', updateLiveExplanation);

                    // Initial draw trigger
                    updateLiveExplanation();

                    // Wire up triggers inside rule creation/deletion to keep translation fresh
                    const originalCreateRuleNode = createRuleNode;
                    createRuleNode = function() {
                        const rule = originalCreateRuleNode();
                        setTimeout(updateLiveExplanation, 0);
                        // Wire deletion trigger callback
                        rule.querySelector('.pm-btn-delete-rule').addEventListener('click', function() {
                            setTimeout(updateLiveExplanation, 0);
                        });
                        return rule;
                    };

                    const originalCreateGroupNode = createGroupNode;
                    createGroupNode = function(isRoot = false) {
                        const group = originalCreateGroupNode(isRoot);
                        setTimeout(updateLiveExplanation, 0);
                        
                        group.querySelector('.pm-btn-add-rule').addEventListener('click', function() {
                            setTimeout(updateLiveExplanation, 0);
                        });
                        group.querySelector('.pm-btn-add-group').addEventListener('click', function() {
                            setTimeout(updateLiveExplanation, 0);
                        });
                        if (!isRoot) {
                            group.querySelector('.pm-btn-delete-group').addEventListener('click', function() {
                                setTimeout(updateLiveExplanation, 0);
                            });
                        }
                        return group;
                    };

                    btnPreviewQuery.addEventListener('click', function() {
                        btnPreviewQuery.disabled = true;
                        const originalText = btnPreviewQuery.innerHTML;
                        btnPreviewQuery.innerHTML = '&#9889; Compiling AST & Resolving Joins...'; // nosec

                        const ast = {
                            condition_tree: serializeGroup(rootGroup)
                        };

                        FetchEngine.post('preview_query', { payload: JSON.stringify(ast) })
                            .then(data => {
                                btnPreviewQuery.disabled = false;
                                btnPreviewQuery.innerHTML = originalText; // nosec

                                if (data.success) {
                                    document.getElementById('pm-preview-count').textContent = data.count;
                                    document.getElementById('pm-preview-sql').textContent = data.sql;
                                    
                                    const samplesContainer = document.getElementById('pm-preview-samples');
                                    samplesContainer.innerHTML = ''; // nosec
                                    if (data.sample_ids && data.sample_ids.length > 0) {
                                        samplesContainer.textContent = data.sample_ids.join(', ');
                                    } else {
                                        samplesContainer.textContent = 'No matching product IDs found for this visual query.';
                                    }

                                    // Sync to Step 2 Configure & Execute Mutations
                                    window.lastCompiledAst = ast;
                                    const execCount = document.getElementById('pm-execute-target-count');
                                    const execStatus = document.getElementById('pm-execute-sync-status');
                                    const execExplanation = document.getElementById('pm-execute-target-explanation');
                                    const execBtn = document.getElementById('pm-btn-execute-mutations');
                                    const step2Container = document.getElementById('pm-wizard-step-2');
                                    
                                    if (execCount) execCount.textContent = data.count;
                                    if (execStatus) {
                                        execStatus.textContent = 'SYNCED WITH BUILDER';
                                        execStatus.className = 'pm-status-pill success';
                                    }
                                    if (execExplanation && explanationText) {
                                        execExplanation.innerHTML = explanationText.innerHTML; // nosec
                                    }
                                    if (execBtn) {
                                        execBtn.disabled = (data.count === 0);
                                    }

                                    resultPanel.style.display = 'block';

                                    if (data.count > 0) {
                                        if (step2Container) {
                                            step2Container.style.display = 'block';
                                            setTimeout(() => {
                                                step2Container.scrollIntoView({ behavior: 'smooth' });
                                            }, 150);
                                        }
                                    } else {
                                        if (step2Container) {
                                            step2Container.style.display = 'none';
                                        }
                                        resultPanel.scrollIntoView({ behavior: 'smooth' });
                                    }
                                } else {
                                    alert('AST Compilation Failure: ' + (data.error || 'Unknown Error'));
                                }
                            })
                            .catch(error => {
                                btnPreviewQuery.disabled = false;
                                btnPreviewQuery.innerHTML = originalText; // nosec
                                alert('Network error during compilation request: ' + error);
                            });
                    });
                }

                // H. Visual Mutation Actions Builder
                const mutationContainer = document.getElementById('pm-mutation-rules-container');
                const btnAddMutation = document.getElementById('pm-btn-add-mutation');
                const btnExecuteMutations = document.getElementById('pm-btn-execute-mutations');
                const mutationResultPanel = document.getElementById('pm-mutation-result-panel');
                const mutationLogTerminal = document.getElementById('pm-mutation-log-terminal');
                
                const btnSaveMutationLog = document.getElementById('pm-btn-save-mutation-log');
                if (btnSaveMutationLog) {
                    btnSaveMutationLog.addEventListener('click', function() {
                        if (mutationLogTerminal) {
                            const text = mutationLogTerminal.textContent;
                            const blob = new Blob([text], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'mutation_execution.log';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                        }
                    });
                }

                const btnClearMutationLog = document.getElementById('pm-btn-clear-mutation-log');
                if (btnClearMutationLog) {
                    btnClearMutationLog.addEventListener('click', function() {
                        if (typeof FetchEngine !== 'undefined') {
                            FetchEngine.post('clear_saas_log')
                            .then(data => {
                                if (data.success) {
                                    if (mutationLogTerminal) {
                                        mutationLogTerminal.textContent = 'No mutation logs compiled yet.';
                                    }
                                    showPremiumToast('Mutation console log cleared.');
                                }
                            })
                            .catch(err => console.error('Error clearing console log: ', err));
                        } else {
                            if (mutationLogTerminal) {
                                mutationLogTerminal.textContent = 'No mutation logs compiled yet.';
                            }
                        }
                    });
                }

                function createMutationNode() {
                    const div = document.createElement('div');
                    div.className = 'pm-query-rule pm-mutation-rule';
                    const mutationHtml = `
                        <select class="pm-query-select pm-mutation-field">
                            <option value="price">Product: Base Price</option>
                            <option value="active">Product: Active Status</option>
                            <option value="reference">Product: Reference / SKU</option>
                            <option value="id_manufacturer">Product: Manufacturer ID</option>
                            <option value="discount_percent">Discount: Percentage Reduction (%)</option>
                            <option value="discount_amount">Discount: Flat Amount Reduction</option>
                        </select>
                        <select class="pm-query-select pm-mutation-type">
                            <option value="SET">SET to</option>
                            <option value="ADD">ADD (+)</option>
                            <option value="MULTIPLY">MULTIPLY (*)</option>
                        </select>
                        <span class="pm-mutation-value-container">
                            <input type="text" class="pm-query-input pm-mutation-value" placeholder="Enter value..." style="min-width:180px;">
                        </span>
                        <button type="button" class="pm-btn pm-btn-delete-mutation" style="background-color: #ef4444; padding: 0.35rem 0.6rem; font-size: 0.75rem; box-shadow: none;">&#128465;&#65039;</button>
                    `;
                    div.innerHTML = mutationHtml; // nosec

                    const fieldSelect = div.querySelector('.pm-mutation-field');
                    const typeSelect = div.querySelector('.pm-mutation-type');
                    const valueContainer = div.querySelector('.pm-mutation-value-container');

                    let forceManualMode = false;

                    function updateMutationControls() {
                        const field = fieldSelect.value;
                        valueContainer.innerHTML = ''; // nosec
                        const modeToggle = document.createElement('button');
                        modeToggle.type = 'button';
                        modeToggle.className = 'pm-btn-toggle-mode';

                        if (field === 'price') {
                            typeSelect.style.display = 'inline-block';
                            typeSelect.innerHTML = `<option value="SET">SET to</option><option value="ADD">ADD (+)</option><option value="MULTIPLY">MULTIPLY (*)</option>`; // nosec
                            const input = document.createElement('input');
                            input.type = 'number';
                            input.step = '0.01';
                            input.className = 'pm-query-input pm-mutation-value';
                            input.placeholder = 'Enter price...';
                            input.style.minWidth = '180px';
                            valueContainer.appendChild(input);
                        } else if (field === 'active') {
                            typeSelect.innerHTML = `<option value="SET">SET to</option>`; // nosec
                            if (!forceManualMode) {
                                const select = document.createElement('select');
                                select.className = 'pm-query-select pm-mutation-value';
                                select.style.minWidth = '180px';
                                select.innerHTML = `<option value="1">Active</option><option value="0">Inactive</option>`; // nosec
                                modeToggle.title = 'Switch to manual type-in mode';
                                modeToggle.innerHTML = '✏️'; // nosec
                                modeToggle.addEventListener('click', () => { forceManualMode = true; updateMutationControls(); });
                                valueContainer.appendChild(select);
                                valueContainer.appendChild(modeToggle);
                            } else {
                                const input = document.createElement('input');
                                input.type = 'text';
                                input.className = 'pm-query-input pm-mutation-value';
                                input.placeholder = 'Enter 1 or 0...';
                                input.style.minWidth = '180px';
                                modeToggle.title = 'Switch to selection dropdown mode';
                                modeToggle.innerHTML = '📜'; // nosec
                                modeToggle.addEventListener('click', () => { forceManualMode = false; updateMutationControls(); });
                                valueContainer.appendChild(input);
                                valueContainer.appendChild(modeToggle);
                            }
                        } else if (field === 'reference') {
                            typeSelect.innerHTML = `<option value="SET">SET to</option>`; // nosec
                            const input = document.createElement('input');
                            input.type = 'text';
                            input.className = 'pm-query-input pm-mutation-value';
                            input.placeholder = 'Enter SKU...';
                            input.style.minWidth = '180px';
                            valueContainer.appendChild(input);
                        } else if (field === 'id_manufacturer') {
                            typeSelect.innerHTML = `<option value="SET">SET to</option>`; // nosec
                            if (!forceManualMode) {
                                const select = document.createElement('select');
                                select.className = 'pm-query-select pm-mutation-value';
                                select.style.minWidth = '180px';
                                if (window.pmManufacturers && window.pmManufacturers.length > 0) {
                                    window.pmManufacturers.forEach(m => {
                                        const opt = document.createElement('option');
                                        opt.value = m.id;
                                        opt.textContent = `[${m.id}] ${m.name}`;
                                        select.appendChild(opt);
                                    });
                                } else {
                                    const opt = document.createElement('option');
                                    opt.value = '0';
                                    opt.textContent = 'No manufacturers available';
                                    select.appendChild(opt);
                                }
                                modeToggle.title = 'Switch to manual type-in mode';
                                modeToggle.innerHTML = '✏️'; // nosec
                                modeToggle.addEventListener('click', () => { forceManualMode = true; updateMutationControls(); });
                                valueContainer.appendChild(select);
                                valueContainer.appendChild(modeToggle);
                            } else {
                                const input = document.createElement('input');
                                input.type = 'text';
                                input.className = 'pm-query-input pm-mutation-value';
                                input.placeholder = 'Enter manufacturer ID...';
                                input.style.minWidth = '180px';
                                modeToggle.title = 'Switch to selection dropdown mode';
                                modeToggle.innerHTML = '📜'; // nosec
                                modeToggle.addEventListener('click', () => { forceManualMode = false; updateMutationControls(); });
                                valueContainer.appendChild(input);
                                valueContainer.appendChild(modeToggle);
                            }
                        } else if (field === 'discount_percent') {
                            typeSelect.innerHTML = `<option value="SET">SET to</option>`; // nosec
                            const input = document.createElement('input');
                            input.type = 'number';
                            input.step = '0.01';
                            input.min = '0';
                            input.max = '100';
                            input.className = 'pm-query-input pm-mutation-value';
                            input.placeholder = 'Enter percentage (e.g. 20)...';
                            input.style.minWidth = '180px';
                            valueContainer.appendChild(input);
                        } else if (field === 'discount_amount') {
                            typeSelect.innerHTML = `<option value="SET">SET to</option>`; // nosec
                            const input = document.createElement('input');
                            input.type = 'number';
                            input.step = '0.01';
                            input.min = '0';
                            input.className = 'pm-query-input pm-mutation-value';
                            input.placeholder = 'Enter flat reduction amount...';
                            input.style.minWidth = '180px';
                            valueContainer.appendChild(input);
                        }
                    }

                    fieldSelect.addEventListener('change', function() {
                        forceManualMode = false;
                        updateMutationControls();
                    });
                    div.querySelector('.pm-btn-delete-mutation').addEventListener('click', function() {
                        div.remove();
                    });

                    // Initial trigger
                    updateMutationControls();
                    return div;
                }

                if (mutationContainer && btnAddMutation) {
                    // Populate initial rule
                    mutationContainer.appendChild(createMutationNode());

                    btnAddMutation.addEventListener('click', function() {
                        mutationContainer.appendChild(createMutationNode());
                    });
                }

                if (btnExecuteMutations) {
                    btnExecuteMutations.addEventListener('click', function() {
                        if (!window.lastCompiledAst) {
                            showPremiumAlert('Out of Sync', 'Target scope is out of sync. Please preview your query on the Query Builder tab first.', 'warning');
                            return;
                        }

                        // Collect action items
                        const actions = {};
                        const ruleEls = document.querySelectorAll('.pm-mutation-rule');
                        if (ruleEls.length === 0) {
                            showPremiumAlert('Missing Actions', 'Please add at least one mutation action before execution.', 'warning');
                            return;
                        }

                        ruleEls.forEach(el => {
                            const field = el.querySelector('.pm-mutation-field').value;
                            const type = el.querySelector('.pm-mutation-type').value;
                            const value = el.querySelector('.pm-mutation-value').value.trim();
                            actions[field] = { type, value };
                        });

                        // Double check safety dialog confirmation
                        showPremiumConfirmModal(
                            'Atomic Execution Pre-Flight',
                            'CRITICAL ACTION PRE-FLIGHT CHECKLIST:<br><br>1. Active InnoDB Transactions will acquire locks on targets.<br>2. In case of unexpected server crashes, modifications will ROLLBACK.<br>3. Historical backups are recommended.<br><br>Are you sure you want to trigger this database synchronization now? Type <strong style="color: #ef4444;">EXECUTE</strong> to confirm:',
                            'EXECUTE',
                            () => {
                                btnExecuteMutations.disabled = true;
                                const originalText = btnExecuteMutations.innerHTML;
                                btnExecuteMutations.innerHTML = '&#9889; Processing atomic operations...'; // nosec

                                // FormData replaced by FetchEngine
                                
                                // Fire recursive mutation chunking request
                                const limit = 100;
                                let cumulativeLogs = '';
                                
                                function executeChunk(offset) {
                                    
                                    
                                    btnExecuteMutations.innerHTML = `<span class="pm-spinner" style="margin-right: 8px;"></span> Mutating... (${offset})`; // nosec
                                    
                                    FetchEngine.post('execute_mutations', {
                                        payload: JSON.stringify(window.lastCompiledAst),
                                        actions: JSON.stringify(actions),
                                        offset: offset,
                                        limit: limit
                                    })
                                        .then(data => {
                                            if (!data.success) {
                                                throw new Error(data.error || 'Execution Failure');
                                            }
                                            
                                            if (data.log_content) {
                                                cumulativeLogs += data.log_content;
                                            }
                                            
                                            if (!data.done) {
                                                // Recurse for the next chunk
                                                executeChunk(data.new_offset);
                                            } else {
                                                // Finished all chunks
                                                btnExecuteMutations.disabled = false;
                                                btnExecuteMutations.innerHTML = originalText; // nosec
        
                                                showPremiumToast('Atomic execution completed! The mutation was securely recorded and can be inspected in the Mutation History tab.', 'success');
                                                
                                                // Render terminal result
                                                if (mutationResultPanel && mutationLogTerminal) {
                                                    mutationLogTerminal.textContent = cumulativeLogs || data.message;
                                                    mutationLogTerminal.scrollTop = mutationLogTerminal.scrollHeight;
                                                    mutationResultPanel.style.display = 'block';
                                                    mutationResultPanel.scrollIntoView({ behavior: 'smooth' });
                                                }
        
                                                // Refresh the general Event Logs terminal on Tab 5 as well!
                                                const generalTerminal = document.getElementById('pm-log-terminal');
                                                if (generalTerminal && cumulativeLogs) {
                                                    generalTerminal.textContent = cumulativeLogs;
                                                    generalTerminal.scrollTop = 0;
                                                }
                                                
                                                // Auto refresh mutation history table
                                                if (typeof HistoryEngine !== 'undefined') HistoryEngine.refresh();
                                            }
                                        })
                                        .catch(error => {
                                            btnExecuteMutations.disabled = false;
                                            btnExecuteMutations.innerHTML = originalText; // nosec
                                            showPremiumAlert('Execution Error', 'Error during mutation execution: ' + error.message, 'error');
                                        });
                                }
                                
                                // Kick off the first chunk
                                executeChunk(0);
                            }
                        );
                    });
                }

                


                // --- FILE TOOLS POLLING LOGIC ---
    }

    return {
        initialize: function() {
            bindEvents();
        }
    };
})();


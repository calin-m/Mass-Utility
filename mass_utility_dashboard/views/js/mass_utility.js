// @Arch[mass_utility]
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

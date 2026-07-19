<!-- Un-Smarty-fied Static Template -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;600;800&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../css/base.css">
<link rel="stylesheet" href="../../css/components.css">
<link rel="stylesheet" href="../../css/utilities.css">

<style>
    :root {
        --pm-font-family: 'Inter', sans-serif;
    }
</style>

<div class="pm-container">
    <!-- Module Header -->
    <div class="pm-header">
        <div class="pm-header-row" style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h1 class="pm-title">⚡ Mass Utility</h1>
                <p class="pm-subtitle">Enterprise-grade database &amp; file management</p>
            </div>
            <div>
                <button id="pm-logout-btn" style="display: flex; align-items: center; gap: 6px; padding: 0.6rem 1.2rem; font-size: 0.85rem; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.25); color: #f87171; border-radius: 6px; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(239,68,68,0.22)'; this.style.borderColor='rgba(239,68,68,0.45)'" onmouseout="this.style.background='rgba(239,68,68,0.12)'; this.style.borderColor='rgba(239,68,68,0.25)'">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 16px; height: 16px;">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                    </svg>
                    Logout
                </button>
            </div>
        </div>
    </div>

    <!-- Unified Tabs Layout -->
    <div class="pm-tabs">
        <input type="radio" name="pm-tab-group" id="pm-tab-governor" checked>
        <input type="radio" name="pm-tab-group" id="pm-tab-database">
        <input type="radio" name="pm-tab-group" id="pm-tab-file-tools">
        <input type="radio" name="pm-tab-group" id="pm-tab-query-mutate">
        <input type="radio" name="pm-tab-group" id="pm-tab-history">
        <input type="radio" name="pm-tab-group" id="pm-tab-logs">
        <input type="radio" name="pm-tab-group" id="pm-tab-settings">
        <script>
            (function(){
                try {
                    var saved = sessionStorage.getItem('pm_active_tab');
                    if (saved) {
                        var target = document.getElementById(saved);
                        if (target) target.checked = true;
                    }
                } catch(e) {}
            })();
        </script>

        <div class="pm-tab-nav" style="justify-content: space-between; align-items: center;">
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <label for="pm-tab-governor" class="pm-tab-label">🛡️ Native Safety Governor Staging</label>
                <label for="pm-tab-database" class="pm-tab-label">🗄️ Database Tools</label>
                <label for="pm-tab-file-tools" class="pm-tab-label">📁 File Tools</label>
                <label for="pm-tab-query-mutate" class="pm-tab-label">⚡ Query & Mutate</label>
                <label for="pm-tab-history" class="pm-tab-label">🕒 Mutation History</label>
                <label for="pm-tab-logs" class="pm-tab-label">📜 Event Logs</label>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
                <label for="pm-tab-settings" class="pm-tab-label" style="margin: 0; display: flex; align-items: center; gap: 0.3rem;">⚙️ Settings</label>
                <!-- Theme Toggle -->
                <button type="button" id="pm-theme-toggle" class="pm-theme-btn" style="margin: 0; padding: 0.4rem 0.8rem;">
                    <span id="pm-theme-icon">☀️</span> <span id="pm-theme-text">Light Mode</span>
                </button>
            </div>
        </div>

        <!-- Tab content will be loaded dynamically or compiled -->
    </div>

    <!-- PREMIUM GLOBAL TOAST CONTAINER -->
    <div id="pm-toast-container" style="position: fixed; bottom: 2rem; right: 2rem; z-index: 9999; display: flex; flex-direction: column; gap: 0.75rem; pointer-events: none;"></div>
</div>

<!-- PREMIUM GLOBAL ALERT / CONFIRM MODAL OVERLAY -->
<div id="pm-modal-premium" class="pm-modal-overlay">
    <div class="pm-modal-card" style="max-width: 720px; position: relative;">
        <div class="pm-modal-header">
            <h2 class="pm-modal-title" id="pm-premium-modal-title">Confirm</h2>
            <button type="button" class="pm-modal-close-icon" id="pm-premium-modal-close-btn" title="Close (Esc)">&times;</button>
        </div>
        <div id="pm-premium-modal-body" style="font-size: 0.9rem; color: var(--pm-text-secondary); line-height: 1.5; margin-bottom: 1.5rem;">
        </div>
        <div id="pm-premium-modal-input-container" style="margin-bottom: 1.5rem; display: none;">
            <input type="text" id="pm-premium-modal-input" placeholder="Type confirmation here" style="width: 100%; padding: 0.6rem; border: 1px solid var(--pm-border-color); border-radius: 8px; background: rgba(0,0,0,0.02); color: var(--pm-text-primary); font-family: monospace; font-size: 0.95rem; text-align: center;" autocomplete="off">
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
            <div style="font-size: 0.8rem; color: var(--pm-text-secondary); opacity: 0.7;">
                <kbd style="background: rgba(128,128,128,0.1); padding: 3px 6px; border-radius: 4px; border: 1px solid var(--pm-border-color); font-family: monospace; font-size: 0.75rem; color: var(--pm-text-primary);">Esc</kbd> to close
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
                <button type="button" id="pm-premium-modal-btn-cancel" class="pm-btn" style="background-color: var(--pm-neutral); box-shadow: none;">Cancel</button>
                <button type="button" id="pm-premium-modal-btn-confirm" class="pm-btn" style="background-color: var(--pm-danger); box-shadow: 0 3px 8px rgba(var(--pm-danger-rgb), 0.2);">Confirm</button>
            </div>
        </div>
    </div>
</div>

<!-- DEPENDENCY BRIDGE -->
<script>
    window.pmIsPro = false;
    window.PM_CONFIG = {
        categories: [],
        manufacturers: [],
        profiles: [],
        backups: [],
        dbPrefix: 'ps_',
        idShop: 1,
        securityToken: '',
        presets: {}
    };
</script>

<!-- Theme, AJAX and UX Dynamic Core scripts -->
<script src="../../js/mass_utility.bundle.js" defer></script>

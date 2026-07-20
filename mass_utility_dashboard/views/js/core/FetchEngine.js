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

        const headers = {};
        if (window.PM_CONFIG && window.PM_CONFIG.csrfToken) {
            headers['X-CSRF-Token'] = window.PM_CONFIG.csrfToken;
        }

        return fetch(url, { method: 'POST', body: formData, headers: headers })
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

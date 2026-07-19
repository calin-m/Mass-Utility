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

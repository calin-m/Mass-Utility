<!-- TAB: DATA SWEEPER -->
<div class="pm-sub-tab-content" id="pm-sub-content-sweeper" style="display: none;">
    
    <!-- Sweeper Settings Card -->
    <div class="pm-card pm-mb-6">
        <div class="pm-card-title pm-flex-between pm-m-0 pm-flex-wrap" style="gap: 0.75rem;">
            <div class="pm-flex-center pm-gap-2">
                <span class="pm-card-title-icon pm-bg-primary"></span>
                🧹 Database Cleanup & Optimization
            </div>
        </div>

        <div class="pm-flex-center pm-gap-4 pm-mb-4" style="margin-top: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid var(--pm-border-color); flex-wrap: wrap;">
            <div class="pm-flex-center pm-gap-2" style="flex-grow: 1;">
                <span style="font-family: 'Outfit'; font-weight: 600; font-size: 0.85rem; color: var(--pm-card-title-color);">Retention Period:</span>
                <select id="pm-sweeper-days" class="pm-select" style="min-width: 150px; padding: 0.2rem 0.5rem; font-size: 0.8rem;">
                    <option value="30" selected>Older than 30 Days (Recommended)</option>
                    <option value="90">Older than 90 Days</option>
                    <option value="180">Older than 180 Days</option>
                </select>
            </div>
            <button type="button" id="pm-btn-sweeper-analyze" class="pm-btn pm-btn-primary" style="padding: 0.45rem 1.25rem;">
                🔍 Run Pre-Flight Scan
            </button>
        </div>

        <p class="pm-text-sm pm-text-muted pm-m-0" style="line-height: 1.4;">
            Scans the database for statistical records and unconverted carts exceeding the retention threshold. Run the pre-flight scan to check how much space can be reclaimed before starting the clean operation.
        </p>
    </div>

    <!-- Scan Results Analysis Card -->
    <div class="pm-card pm-mb-6" id="pm-sweeper-results-card" style="display: none;">
        <div class="pm-card-title pm-flex-between pm-m-0">
            <div class="pm-flex-center pm-gap-2">
                <span class="pm-card-title-icon pm-bg-warning"></span>
                📊 Scan Intelligence & Reclaimable Space
            </div>
        </div>

        <div style="margin-top: 1.25rem;">
            <div class="pm-grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
                
                <!-- Stats Bloat readout -->
                <div style="background: rgba(0,0,0,0.02); padding: 1rem; border-radius: 8px; border: 1px solid var(--pm-border-color);">
                    <h4 style="margin: 0 0 0.75rem 0; font-family: 'Outfit'; font-size: 0.9rem; color: var(--pm-card-title-color);">📉 Statistical & Visitor Bloat</h4>
                    <div style="display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.8rem; color: var(--pm-text-secondary);">
                        <div class="pm-flex-between"><span>Connections Log (`ps_connections`):</span><strong id="pm-scan-connections">-</strong></div>
                        <div class="pm-flex-between"><span>Page Views Log (`ps_connections_page`):</span><strong id="pm-scan-pages">-</strong></div>
                        <div class="pm-flex-between"><span>Referral Sources (`ps_connections_source`):</span><strong id="pm-scan-sources">-</strong></div>
                        <div class="pm-flex-between"><span>Orphaned Guests (`ps_guest`):</span><strong id="pm-scan-guests">-</strong></div>
                        <hr style="border: 0; border-top: 1px solid var(--pm-border-color); margin: 0.5rem 0;">
                        <div class="pm-flex-between" style="font-weight: bold; color: var(--pm-text-primary);">
                            <span>Total Stats Rows:</span><span id="pm-scan-stats-total">-</span>
                        </div>
                    </div>
                </div>

                <!-- Carts readout -->
                <div style="background: rgba(0,0,0,0.02); padding: 1rem; border-radius: 8px; border: 1px solid var(--pm-border-color);">
                    <h4 style="margin: 0 0 0.75rem 0; font-family: 'Outfit'; font-size: 0.9rem; color: var(--pm-card-title-color);">🛒 Abandoned Shopping Carts</h4>
                    <div style="display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.8rem; color: var(--pm-text-secondary);">
                        <div class="pm-flex-between"><span>Cart Records (`ps_cart`):</span><strong id="pm-scan-carts">-</strong></div>
                        <div class="pm-flex-between"><span>Cart Product Links (`ps_cart_product`):</span><strong id="pm-scan-products">-</strong></div>
                        <div class="pm-flex-between"><span>Applied Cart Rules (`ps_cart_rule`):</span><strong id="pm-scan-rules">-</strong></div>
                        <hr style="border: 0; border-top: 1px solid var(--pm-border-color); margin: 0.5rem 0;">
                        <div class="pm-flex-between" style="font-weight: bold; color: var(--pm-text-primary);">
                            <span>Total Carts Rows:</span><span id="pm-scan-carts-total">-</span>
                        </div>
                    </div>
                </div>

            </div>

            <!-- Execution Panel -->
            <div style="margin-top: 1.5rem; background: rgba(59, 130, 246, 0.05); padding: 1.25rem; border-radius: 8px; border: 1px dashed rgba(59, 130, 246, 0.3); display: flex; flex-direction: column; gap: 1rem;">
                <div class="pm-flex-between pm-flex-wrap pm-gap-2">
                    <div>
                        <h4 style="margin: 0; font-family: 'Outfit'; font-size: 0.95rem; color: var(--pm-text-primary);">Execute Clean Sweep Operations</h4>
                        <p class="pm-text-xs pm-text-muted pm-m-0" style="margin-top: 0.25rem;">Select the domains you wish to purge. Operations run in asynchronous chunks of 5,000 rows.</p>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button type="button" id="pm-btn-sweeper-execute" class="pm-btn pm-btn-danger" style="padding: 0.45rem 1.25rem;">
                            💥 Execute Sweeper
                        </button>
                    </div>
                </div>

                <div style="display: flex; gap: 1.5rem; font-size: 0.85rem; color: var(--pm-text-primary); flex-wrap: wrap;">
                    <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer;">
                        <input type="checkbox" id="pm-sweeper-check-stats" checked> Purge Statistical & Visitor Bloat (<span id="pm-check-stats-count">0</span> rows)
                    </label>
                    <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer;">
                        <input type="checkbox" id="pm-sweeper-check-carts" checked> Purge Abandoned Shopping Carts (<span id="pm-check-carts-count">0</span> rows)
                    </label>
                </div>
            </div>
        </div>
    </div>

    <!-- Active Sweep Progress Card -->
    <div class="pm-card pm-mb-6" id="pm-sweeper-progress-card" style="display: none;">
        <div class="pm-card-title pm-flex-between pm-m-0">
            <div class="pm-flex-center pm-gap-2">
                <span class="pm-card-title-icon pm-bg-success" style="animation: pm-pulse 1.5s infinite;"></span>
                <span id="pm-sweeper-header-text">🧹 Database Clean Sweep in Progress...</span>
            </div>
            <button type="button" id="pm-btn-sweeper-abort" class="pm-btn pm-btn-danger pm-text-xs" style="padding: 0.3rem 0.75rem;">
                🛑 Abort Operation
            </button>
        </div>

        <div style="margin-top: 1.25rem;">
            <div class="pm-flex-between pm-text-xs pm-text-muted" style="margin-bottom: 0.3rem;">
                <span id="pm-sweeper-progress-text">Initializing sweep routines...</span>
                <span id="pm-sweeper-progress-percent">0%</span>
            </div>
            <div style="width: 100%; height: 8px; background: rgba(0,0,0,0.05); border-radius: 4px; overflow: hidden; position: relative; margin-bottom: 1rem;">
                <div id="pm-sweeper-progress-bar" style="width: 0%; height: 100%; background: var(--pm-danger); border-radius: 4px; transition: width 0.2s ease;"></div>
            </div>
            <div style="background: rgba(0,0,0,0.02); padding: 0.75rem; border-radius: 6px; font-family: monospace; font-size: 0.75rem; max-height: 120px; overflow-y: auto; color: var(--pm-text-secondary); line-height: 1.4; white-space: pre-wrap;" id="pm-sweeper-console">
                [SYSTEM] Initializing database transaction filters...
            </div>
        </div>
    </div>

</div>

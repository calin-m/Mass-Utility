<!-- TAB 4: SYSTEM EVENT LOGS -->
<div class="pm-tab-content" id="pm-content-logs">
    <div class="pm-card">
        <div class="pm-card-title" style="justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span class="pm-card-title-icon" style="background-color: #a855f7;"></span>
                Staging Event Logging Console
            </div>
            <div style="display: flex; gap: 0.5rem;">
                <button type="button" class="pm-btn pm-btn-outline" id="pm-btn-download-logs" style="padding: 0.3rem 0.8rem; font-size: 0.8rem; display: flex; align-items: center; gap: 0.4rem;">
                    <span>📥</span> Download
                </button>
                <button type="button" class="pm-btn pm-btn-outline" id="pm-btn-clear-logs" style="padding: 0.3rem 0.8rem; font-size: 0.8rem; color: var(--pm-danger); border-color: rgba(239, 68, 68, 0.2); display: flex; align-items: center; gap: 0.4rem;">
                    <span>🗑️</span> Clear
                </button>
            </div>
        </div>
        <pre class="pm-log-terminal" id="pm-log-terminal" style="max-height: 600px; overflow-y: auto;">{if empty($logContent)}No event logs compiled yet.
{else}{$logContent|escape:"html"}{/if}</pre>
    </div>
</div>

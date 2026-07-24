{* PrestaShop Back-Office Module Launcher for Mass Utility V2 React SPA *}
<div class="panel" style="background: linear-gradient(135deg, #1e1e2f 0%, #0f0f1a 100%); border: 1px solid #2d2d44; border-radius: 12px; padding: 2.5rem; color: #e3e3e3; font-family: 'Inter', sans-serif; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4); margin: 20px 0;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <div>
            <h2 style="font-size: 2rem; font-weight: 700; background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0 0 0.5rem 0;">
                ⚡ Mass Utility Suite
            </h2>
            <p style="font-size: 0.95rem; color: #9ca3af; margin: 0;">
                V2 Standalone React 18 SPA Architecture &amp; Headless API Bridge
            </p>
        </div>
        <div>
            <span style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #10b981; padding: 0.4rem 0.85rem; border-radius: 20px; font-weight: 600; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.4rem;">
                🟢 Active &amp; Operational
            </span>
        </div>
    </div>

    <hr style="border: 0; border-top: 1px solid #2d2d44; margin: 1.5rem 0;" />

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid #2d2d44; border-radius: 8px; padding: 1.25rem;">
            <h4 style="color: #a78bfa; margin-top: 0; margin-bottom: 0.5rem; font-size: 1rem;">🛡️ Safety Governor</h4>
            <p style="color: #9ca3af; font-size: 0.85rem; margin: 0; line-height: 1.4;">
                Real-time Cgroup LVE telemetry monitoring, CPU load protection &amp; CloudLinux quota floor.
            </p>
        </div>
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid #2d2d44; border-radius: 8px; padding: 1.25rem;">
            <h4 style="color: #a78bfa; margin-top: 0; margin-bottom: 0.5rem; font-size: 1rem;">⚡ AST Query Engine</h4>
            <p style="color: #9ca3af; font-size: 0.85rem; margin: 0; line-height: 1.4;">
                Non-destructive AST query wizard, 1-click mutation snapshots &amp; MariaDB rollback projection.
            </p>
        </div>
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid #2d2d44; border-radius: 8px; padding: 1.25rem;">
            <h4 style="color: #a78bfa; margin-top: 0; margin-bottom: 0.5rem; font-size: 1rem;">📁 Storage Repositories</h4>
            <p style="color: #9ca3af; font-size: 0.85rem; margin: 0; line-height: 1.4;">
                Chunked Gzip backups, pinned sidecar metadata, and secure OAuth Google Drive cloud sync.
            </p>
        </div>
    </div>

    <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
        {if isset($launcher_url) && $launcher_url}
            <a href="{$launcher_url|escape:'html':'UTF-8'}" target="_blank" style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: #ffffff !important; font-weight: 600; padding: 0.85rem 1.75rem; border-radius: 8px; text-decoration: none !important; display: inline-flex; align-items: center; gap: 0.75rem; box-shadow: 0 4px 12px rgba(109, 40, 217, 0.3); font-size: 1rem;">
                🚀 Launch Standalone V2 Dashboard &rarr;
            </a>
        {else}
            <a href="../mass_utility_dashboard/" target="_blank" style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: #ffffff !important; font-weight: 600; padding: 0.85rem 1.75rem; border-radius: 8px; text-decoration: none !important; display: inline-flex; align-items: center; gap: 0.75rem; box-shadow: 0 4px 12px rgba(109, 40, 217, 0.3); font-size: 1rem;">
                🚀 Launch Standalone V2 Dashboard &rarr;
            </a>
        {/if}
    </div>
</div>

<!-- TAB 6: FILE TOOLS -->
<div class="pm-tab-content pm-file-tools-refreshed" id="pm-content-file-tools">
    
    <div class="pm-card pm-mb-6">
        <div class="pm-card-title pm-flex-between pm-m-0 pm-flex-wrap" style="gap: 0.75rem;">
            <div class="pm-flex-center pm-gap-2">
                <span class="pm-card-title-icon pm-bg-warning"></span>
                File Backup System
            </div>
            <button type="button" id="pm-btn-start-file-backup" class="pm-btn" disabled>
                📥 Generate Site Backup
            </button>
        </div>

        <!-- BACKUP PROFILE MATRIX -->
        <div class="pm-flex-center pm-gap-2 pm-mb-4" style="margin-top: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid var(--pm-border-color);">
            <span style="font-family: 'Outfit'; font-weight: 600; font-size: 0.85rem; color: var(--pm-card-title-color);">Backup Profile Matrix:</span>
            <select id="pm-file-backup-profile" class="pm-select" style="flex-grow: 1; min-width: 200px; padding: 0.2rem 0.5rem; font-size: 0.8rem;">
                <option value="custom">Custom / Load Profile</option>
                <option value="full">Full Backup (All Files)</option>
                <option value="core">Core Files Only</option>
                <option value="core_media">Core Files & Media</option>
                <option value="themes_modules">Themes & Modules</option>
                <option value="media">Media Files Only</option>
            </select>
        </div>
        <div id="pm-file-backup-progress-container" style="display: none; margin-top: 1rem;">
            <div class="pm-flex-between pm-text-xs pm-text-muted" style="margin-bottom: 0.3rem;">
                <span id="pm-file-backup-progress-text">Scanning directory...</span>
                <span id="pm-file-backup-progress-percent">0%</span>
            </div>
            <div style="width: 100%; height: 6px; background: rgba(0,0,0,0.05); border-radius: 4px; overflow: hidden; position: relative; margin-bottom: 0.75rem;">
                <div id="pm-file-backup-progress-bar" style="width: 0%; height: 100%; background: var(--pm-primary); border-radius: 4px; transition: width 0.2s linear;"></div>
            </div>
            <button type="button" id="pm-btn-stop-file-backup" class="pm-btn pm-btn-danger pm-text-xs" style="padding: 0.2rem 0.6rem;">
                🛑 Stop Backup
            </button>
        </div>
        <p class="pm-text-sm pm-text-muted pm-m-0" style="margin-top: 1rem; line-height: 1.4;">
            Generates a streaming TAR archive of the PrestaShop filesystem based on the selected segment profile. The engine uses an asynchronous chunking algorithm to respect CloudLinux LVE limits and prevent 503 Gateway Timeouts.
        </p>
    </div>
 
    <div class="pm-card pm-mb-6" id="pm-directory-exclusions-card">
        <div class="pm-card-title pm-flex-between pm-flex-wrap pm-gap-2">
            <div class="pm-flex-center pm-gap-2">
                <span class="pm-card-title-icon pm-bg-info"></span>
                Backup Folder Selection
            </div>
            <span style="font-size: 0.8rem; background: rgba(59, 130, 246, 0.1); color: var(--pm-primary); padding: 0.2rem 0.6rem; border-radius: 6px; font-weight: 600;">
                🔒 Save Auto-Applies
            </span>
        </div>
        <p class="pm-text-sm pm-text-muted pm-mb-4" style="line-height: 1.4;">
            Check the directories you wish to include in your backups. Unchecking heavy directories (e.g. cache folders) can make backup operations up to 10x faster and prevent execution timeouts.
        </p>
        
        <div id="pm-profile-override-info" style="display: none; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); color: var(--pm-warning); padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.85rem; align-items: center; gap: 0.5rem;">
            <span>⚠️ <strong>Profile Active:</strong> Manual selections are disabled. The active profile automatically determines which folders are included (grayed out). Switch to <em>Custom / Load Profile</em> to customize folders.</span>
        </div>

        <div id="pm-directory-tree-container" class="pm-rounded-md" style="background: var(--pm-input-bg); border: 1px solid var(--pm-border-color); padding: 1rem; max-height: 400px; overflow-y: auto;">
            <div class="pm-flex-center" style="padding: 1.5rem 0; color: var(--pm-text-secondary);">
                <span>⏳ Scanning filesystem and calculating directory sizes...</span>
            </div>
        </div>
    </div>


    <!-- Future expansion: File Backup List Table can go here -->
    <div class="pm-card">
        <div class="pm-card-title pm-flex-between pm-flex-wrap pm-gap-2">
            <div class="pm-flex-center pm-gap-2">
                <span class="pm-card-title-icon pm-bg-primary"></span>
                Historical Backups Repository
            </div>
            <button type="button" class="pm-btn pm-btn-danger pm-text-xs" id="pm-btn-clear-file-backups" style="padding: 0.35rem 0.75rem;">
                🗑️ Clear Backups
            </button>
        </div>
        <div class="pm-table-wrapper pm-rounded-md">
            <table class="pm-table" id="pm-file-backups-table">
                <thead>
                    <tr>
                        <th>Archive Name</th>
                        <th>Archive Size</th>
                        <th>Timestamp Created</th>
                        <th style="text-align: right;">Actions</th>
                    </tr>
                </thead>
                {foreach from=$fileBackups item=b}
                    {assign var="isUploaded" value=false}
                    {if isset($b.is_uploaded) && $b.is_uploaded}
                        {assign var="isUploaded" value=true}
                    {/if}
                    
                    {assign var="isLocal" value=true}
                    {if isset($b.is_local) && !$b.is_local}
                        {assign var="isLocal" value=false}
                    {/if}
                    
                    {if !$isLocal && isset($b.is_cloud) && $b.is_cloud}
                        {assign var="typeBadge" value='<span class="pm-status-pill pm-base-status-badge" style="background: rgba(var(--pm-purple-rgb), 0.1); color: var(--pm-purple); font-size: 0.65rem; padding: 0.15rem 0.4rem; letter-spacing: 0; display: inline-block;">☁️ Cloud Only</span>'}
                        {assign var="rowStyle" value='border-left: 4px solid var(--pm-purple); background: rgba(var(--pm-purple-rgb), 0.02);'}
                    {elseif $isUploaded}
                        {assign var="typeBadge" value='<span class="pm-status-pill pm-base-status-badge" style="background: rgba(var(--pm-purple-rgb), 0.1); color: var(--pm-purple); font-size: 0.65rem; padding: 0.15rem 0.4rem; letter-spacing: 0; display: inline-block;">&#128194; Uploaded</span>'}
                        {assign var="rowStyle" value='border-left: 4px solid var(--pm-purple); background: rgba(var(--pm-purple-rgb), 0.02);'}
                    {else}
                        {assign var="typeBadge" value='<span class="pm-status-pill success pm-base-status-badge" style="font-size: 0.65rem; padding: 0.15rem 0.4rem; letter-spacing: 0; display: inline-block;">&#128190; Local</span>'}
                        {assign var="rowStyle" value=''}
                    {/if}

                    <tbody class="pm-backup-entry" style="{$rowStyle nofilter}">
                        <tr class="pm-data-row" style="{$rowStyle nofilter}" data-is-local="{if $isLocal}true{else}false{/if}" data-is-cloud="{if isset($b.is_cloud) && $b.is_cloud}true{else}false{/if}">
                            <td style="vertical-align: middle;">
                                <div>
                                    <div class="pm-flex-center pm-gap-2 pm-flex-wrap" style="justify-content: flex-start; gap: 0.5rem; display: inline-flex; vertical-align: middle;">
                                        <span class="pm-truncated-filename" style="font-family: monospace; font-weight: 600; color: var(--pm-text-primary);" data-full-name="{$b.basename|escape:"html"}">
                                            {$b.basename|escape:"html"}
                                        </span>
                                        <span class="pm-copy-trigger" style="cursor: pointer; font-size: 0.95rem; opacity: 0.6; transition: opacity 0.2s;" data-copy="{$b.basename|escape:"html"}" title="Copy to clipboard">📋</span>
                                    </div>
                                    <div class="pm-backup-badges" style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.25rem;">
                                        {$typeBadge nofilter}
                                        {if isset($b.duration) && $b.duration}
                                            <span style="font-size: 0.65rem; color: var(--pm-text-secondary); display: inline-flex; align-items: center; gap: 0.2rem;">
                                                <span style="font-weight:600; color:var(--pm-text-primary);">Completed In:</span> {$b.duration|escape:"html"}
                                            </span>
                                        {/if}
                                    </div>
                                </div>
                            </td>
                            <td><span class="pm-badge pm-bg-primary-light" style="color: var(--pm-primary);">{$b.size}</span></td>
                            <td class="pm-text-muted pm-text-sm" style="vertical-align: middle;">
                                {$b.timestamp|date_format:"%Y-%m-%d %H:%M:%S"}
                            </td>
                            <td style="vertical-align: middle; text-align: right;">
                                <div class="pm-actions-group" style="justify-content: flex-end; display: inline-flex; max-width: none !important;">
                                    {if isset($b.hash) && $b.hash}
                                        <button type="button" class="pm-btn pm-btn-sm pm-btn-success pm-btn-verify-backup" data-backup="{$b.basename|escape:"html"}" title="Verify Integrity">
                                            🛡️ Verify
                                        </button>
                                    {/if}
                                    <a href="{$adminModulesUrl nofilter}&configure=mass_utility&action=download_file_backup&file={$b.basename|urlencode}" class="pm-btn pm-btn-sm" title="Download Backup">
                                        ⬇️ Download
                                    </a>
                                    {if $b.has_log}
                                        <a href="{$adminModulesUrl nofilter}&configure=mass_utility&action=download_file_backup_log&file={$b.basename|urlencode}" class="pm-btn pm-btn-sm pm-btn-neutral" title="Download Log">
                                            📄 Log
                                        </a>
                                    {/if}
                                    <button type="button" class="pm-btn pm-btn-sm pm-btn-danger pm-btn-delete-file-backup" data-backup="{$b.basename|escape:"html"}" title="Delete Local">
                                        🗑️ Delete
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                {foreachelse}
                    <tbody>
                        <tr class="pm-empty-row">
                            <td colspan="4" style="padding: 0;">
                                <div class="pm-empty-state" style="margin: 0; border: none; border-radius: 0; background: transparent;">
                                    <div class="pm-empty-state-icon" style="animation: pm-pulse 2s infinite;">&#128340;</div>
                                    <div class="pm-empty-state-text">Loading File Archives...</div>
                                    <div class="pm-empty-state-subtext">Fetching file system archives from the repository.</div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                {/foreach}
            </table>
        </div>
    </div>
</div>

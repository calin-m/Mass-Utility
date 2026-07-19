<!-- TAB 2: DATABASE TOOLS (CONSOLIDATED) -->
                <div class="pm-tab-content" id="pm-content-database">
                    <!-- 3-pill Sub-navigation pills -->
                    <div class="pm-sub-tabs">
                        <button type="button" class="pm-sub-tab-btn active" data-sub-tab="pm-sub-content-backup">📥 Generate Backup</button>
                        <button type="button" class="pm-sub-tab-btn" data-sub-tab="pm-sub-content-restore">📤 Restore / Import</button>
                        <button type="button" class="pm-sub-tab-btn" data-sub-tab="pm-sub-content-profiler">📈 DB Profiler & Optimization</button>
                        <button type="button" class="pm-sub-tab-btn" data-sub-tab="pm-sub-content-sweeper">🧹 Data Sweeper</button>
                    </div>
                    
                    <!-- Inner Sub-panel 1: Generate Backup -->
                    <div class="pm-sub-tab-content" id="pm-sub-content-backup">
                        <div class="pm-card pm-mb-6">
                            <div class="pm-card-title pm-flex-between pm-m-0 pm-flex-wrap" style="gap: 0.75rem;">
                                <div class="pm-flex-center pm-gap-2">
                                    <span class="pm-card-title-icon pm-bg-warning"></span>
                                    Pre-Flight Database Catalog Exporter
                                </div>
                                <div class="pm-flex-center pm-gap-2">
                                    <button type="button" id="pm-btn-customize-tables" class="pm-btn pm-btn-neutral">
                                        🔧 Customize Tables
                                    </button>
                                    <button type="button" id="pm-btn-backup" class="pm-btn" disabled>
                                        📥 Generate Backup & Log Archive
                                    </button>
                                </div>
                            </div>
                            <div id="pm-backup-progress-container" style="display: none; margin-top: 1rem;">
                                <div class="pm-flex-between pm-text-xs pm-text-muted" style="margin-bottom: 0.3rem;">
                                    <span id="pm-backup-progress-text">Compiling backup archive...</span>
                                    <span id="pm-backup-progress-percent">0%</span>
                                </div>
                                <div style="width: 100%; height: 6px; background: rgba(0,0,0,0.05); border-radius: 4px; overflow: hidden; position: relative; margin-bottom: 0.75rem;">
                                    <div id="pm-backup-progress-bar" style="width: 0%; height: 100%; background: var(--pm-primary); border-radius: 4px; transition: width 0.2s linear;"></div>
                                </div>
                                <button type="button" id="pm-btn-stop-backup" class="pm-btn pm-btn-danger pm-text-xs" style="padding: 0.2rem 0.6rem;">
                                    🛑 Stop Backup
                                </button>
                            </div>
                            <p class="pm-text-sm pm-text-muted pm-m-0" style="margin-top: 1rem; line-height: 1.4;">
                                Generates an atomic structure and data dump of target database tables. Files are compressed natively using Gzip (Level 9) and saved inside your secure module folder under their own subfolder.
                            </p>

                            <!-- Collapsible Table Selection Drawer -->
                            <div id="pm-tables-customizer" style="display: block; margin-top: 1.5rem; padding: 1.25rem; background: rgba(0,0,0,0.02); border: 1px solid var(--pm-border-color); border-radius: 12px; transition: all 0.3s ease;">
                                
                                <!-- BACKUP PRESET INJECTION -->
                                <div class="pm-flex-center pm-gap-2 pm-mb-4" style="padding-bottom: 1rem; border-bottom: 1px solid var(--pm-border-color);">
                                    <span style="font-family: 'Outfit'; font-weight: 600; font-size: 0.85rem; color: var(--pm-card-title-color);">Table Loadout Preset:</span>
                                    <select id="pm-preset-backup" class="pm-select" style="flex-grow: 1; min-width: 200px; padding: 0.2rem 0.5rem; font-size: 0.8rem;">
                                        <option value="">-- None / Load Template --</option>
                                    </select>
                                    <button type="button" id="pm-btn-save-preset-backup" class="pm-btn pm-btn-success pm-text-xs pm-text-center" style="padding: 0.2rem 0.6rem; min-width: 80px;">Save</button>
                                    <button type="button" id="pm-btn-delete-preset-backup" class="pm-btn pm-btn-danger pm-text-xs pm-text-center" style="padding: 0.2rem 0.6rem; min-width: 80px;" disabled>Delete</button>
                                </div>
                                <div id="pm-preset-backup-warning" style="display: none; padding: 0.5rem 0.75rem; background: rgba(var(--pm-warning-rgb), 0.1); border: 1px solid rgba(var(--pm-warning-rgb), 0.3); border-radius: 8px; color: var(--pm-warning); font-size: 0.75rem; margin-top: -0.75rem; margin-bottom: 1rem; line-height: 1.4; align-items: center; gap: 0.5rem;">
                                    <span>⚠️</span> <span class="pm-warning-text"></span>
                                </div>

                                <div class="pm-flex-between pm-flex-wrap pm-gap-2 pm-mb-4" style="border-bottom: 1px solid var(--pm-border-color); padding-bottom: 0.5rem;">
                                    <span style="font-family: 'Outfit'; font-weight: 600; font-size: 0.9rem; color: var(--pm-card-title-color);">Table Selection Matrix</span>
                                    <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; color: var(--pm-primary);">
                                        <input type="checkbox" id="pm-select-all-tables"> Select All Tables (Full Backup)
                                    </label>
                                </div>
                                <div class="pm-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 0.5rem;">
                                    
                                    <!-- Catalog Core Domain -->
                                    <div class="pm-rounded-md" style="background: var(--pm-card-bg); border: 1px solid var(--pm-border-color); padding: 0.75rem; display: flex; flex-direction: column; justify-content: space-between;">
                                        <div>
                                            <label class="pm-flex-center pm-font-semibold pm-text-sm" style="gap: 0.4rem; cursor: pointer; color: var(--pm-card-title-color);">
                                                <input type="checkbox" class="pm-domain-select" data-domain="catalog" checked> Catalog Core
                                            </label>
                                            <div style="font-size: 0.7rem; color: var(--pm-text-secondary); margin-top: 0.25rem; margin-bottom: 0.5rem;">Products, categories, categories languages</div>
                                        </div>
                                        <div>
                                            <div id="pm-group-catalog" style="display: none; font-size: 0.8rem; max-height: 120px; overflow-y: auto; padding-left: 0.75rem; border-left: 2px solid var(--pm-border-color); margin-bottom: 0.5rem;">
                                                {foreach from=$categorized.catalog item=tbl}
                                                    <label style="display: block; margin: 0.2rem 0; cursor: pointer; font-family: monospace; font-size: 0.75rem; overflow-wrap: anywhere;">
                                                        <input type="checkbox" class="pm-table-checkbox" data-domain="catalog" value="{$tbl|escape:"html"}" checked> {$tbl|escape:"html"}
                                                    </label>
                                                {/foreach}
                                            </div>
                                            <a href="#" class="pm-toggle-group-link" data-group="pm-group-catalog" style="font-size: 0.75rem; color: var(--pm-primary); text-decoration: none; font-weight: 600;">Show Tables ({$categorized.catalog|@count})</a>
                                        </div>
                                    </div>

                                    <!-- Stock & Attributes Domain -->
                                    <div class="pm-rounded-md" style="background: var(--pm-card-bg); border: 1px solid var(--pm-border-color); padding: 0.75rem; display: flex; flex-direction: column; justify-content: space-between;">
                                        <div>
                                            <label class="pm-flex-center pm-font-semibold pm-text-sm" style="gap: 0.4rem; cursor: pointer; color: var(--pm-card-title-color);">
                                                <input type="checkbox" class="pm-domain-select" data-domain="stock_attributes"> Stock & Variations
                                            </label>
                                            <div style="font-size: 0.7rem; color: var(--pm-text-secondary); margin-top: 0.25rem; margin-bottom: 0.5rem;">Stock inventory, attributes & variations</div>
                                        </div>
                                        <div>
                                            <div id="pm-group-stock" style="display: none; font-size: 0.8rem; max-height: 120px; overflow-y: auto; padding-left: 0.75rem; border-left: 2px solid var(--pm-border-color); margin-bottom: 0.5rem;">
                                                {foreach from=$categorized.stock_attributes item=tbl}
                                                    <label style="display: block; margin: 0.2rem 0; cursor: pointer; font-family: monospace; font-size: 0.75rem; overflow-wrap: anywhere;">
                                                        <input type="checkbox" class="pm-table-checkbox" data-domain="stock_attributes" value="{$tbl|escape:"html"}"> {$tbl|escape:"html"}
                                                    </label>
                                                {/foreach}
                                            </div>
                                            <a href="#" class="pm-toggle-group-link" data-group="pm-group-stock" style="font-size: 0.75rem; color: var(--pm-primary); text-decoration: none; font-weight: 600;">Show Tables ({$categorized.stock_attributes|@count})</a>
                                        </div>
                                    </div>

                                    <!-- Pricing & Carriers Domain -->
                                    <div class="pm-rounded-md" style="background: var(--pm-card-bg); border: 1px solid var(--pm-border-color); padding: 0.75rem; display: flex; flex-direction: column; justify-content: space-between;">
                                        <div>
                                            <label class="pm-flex-center pm-font-semibold pm-text-sm" style="gap: 0.4rem; cursor: pointer; color: var(--pm-card-title-color);">
                                                <input type="checkbox" class="pm-domain-select" data-domain="pricing_taxes"> Pricing & Taxes
                                            </label>
                                            <div style="font-size: 0.7rem; color: var(--pm-text-secondary); margin-top: 0.25rem; margin-bottom: 0.5rem;">Specific prices, taxes, carrier rules</div>
                                        </div>
                                        <div>
                                            <div id="pm-group-pricing" style="display: none; font-size: 0.8rem; max-height: 120px; overflow-y: auto; padding-left: 0.75rem; border-left: 2px solid var(--pm-border-color); margin-bottom: 0.5rem;">
                                                {foreach from=$categorized.pricing_taxes item=tbl}
                                                    <label style="display: block; margin: 0.2rem 0; cursor: pointer; font-family: monospace; font-size: 0.75rem; overflow-wrap: anywhere;">
                                                        <input type="checkbox" class="pm-table-checkbox" data-domain="pricing_taxes" value="{$tbl|escape:"html"}"> {$tbl|escape:"html"}
                                                    </label>
                                                {/foreach}
                                            </div>
                                            <a href="#" class="pm-toggle-group-link" data-group="pm-group-pricing" style="font-size: 0.75rem; color: var(--pm-primary); text-decoration: none; font-weight: 600;">Show Tables ({$categorized.pricing_taxes|@count})</a>
                                        </div>
                                    </div>

                                    <!-- Customers & Orders Domain -->
                                    <div class="pm-rounded-md" style="background: var(--pm-card-bg); border: 1px solid var(--pm-border-color); padding: 0.75rem; display: flex; flex-direction: column; justify-content: space-between;">
                                        <div>
                                            <label class="pm-flex-center pm-font-semibold pm-text-sm" style="gap: 0.4rem; cursor: pointer; color: var(--pm-card-title-color);">
                                                <input type="checkbox" class="pm-domain-select" data-domain="customers_orders"> Customers & Orders
                                            </label>
                                            <div style="font-size: 0.7rem; color: var(--pm-text-secondary); margin-top: 0.25rem; margin-bottom: 0.5rem;">Orders, carts, addresses, customers</div>
                                        </div>
                                        <div>
                                            <div id="pm-group-customers" style="display: none; font-size: 0.8rem; max-height: 120px; overflow-y: auto; padding-left: 0.75rem; border-left: 2px solid var(--pm-border-color); margin-bottom: 0.5rem;">
                                                {foreach from=$categorized.customers_orders item=tbl}
                                                    <label style="display: block; margin: 0.2rem 0; cursor: pointer; font-family: monospace; font-size: 0.75rem; overflow-wrap: anywhere;">
                                                        <input type="checkbox" class="pm-table-checkbox" data-domain="customers_orders" value="{$tbl|escape:"html"}"> {$tbl|escape:"html"}
                                                    </label>
                                                {/foreach}
                                            </div>
                                            <a href="#" class="pm-toggle-group-link" data-group="pm-group-customers" style="font-size: 0.75rem; color: var(--pm-primary); text-decoration: none; font-weight: 600;">Show Tables ({$categorized.customers_orders|@count})</a>
                                        </div>
                                    </div>

                                    <!-- System & Settings Domain -->
                                    <div class="pm-rounded-md" style="background: var(--pm-card-bg); border: 1px solid var(--pm-border-color); padding: 0.75rem; display: flex; flex-direction: column; justify-content: space-between;">
                                        <div>
                                            <label class="pm-flex-center pm-font-semibold pm-text-sm" style="gap: 0.4rem; cursor: pointer; color: var(--pm-card-title-color);">
                                                <input type="checkbox" class="pm-domain-select" data-domain="system_settings"> System & Settings
                                            </label>
                                            <div style="font-size: 0.7rem; color: var(--pm-text-secondary); margin-top: 0.25rem; margin-bottom: 0.5rem;">Configuration and module system tables</div>
                                        </div>
                                        <div>
                                            <div id="pm-group-system" style="display: none; font-size: 0.8rem; max-height: 120px; overflow-y: auto; padding-left: 0.75rem; border-left: 2px solid var(--pm-border-color); margin-bottom: 0.5rem;">
                                                {foreach from=$categorized.system_settings item=tbl}
                                                    <label style="display: block; margin: 0.2rem 0; cursor: pointer; font-family: monospace; font-size: 0.75rem; overflow-wrap: anywhere;">
                                                        <input type="checkbox" class="pm-table-checkbox" data-domain="system_settings" value="{$tbl|escape:"html"}"> {$tbl|escape:"html"}
                                                    </label>
                                                {/foreach}
                                            </div>
                                            <a href="#" class="pm-toggle-group-link" data-group="pm-group-system" style="font-size: 0.75rem; color: var(--pm-primary); text-decoration: none; font-weight: 600;">Show Tables ({$categorized.system_settings|@count})</a>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                        <div class="pm-card">
                            <div class="pm-card-title pm-flex-between pm-flex-wrap pm-gap-2">
                                <div class="pm-flex-center pm-gap-2">
                                    <span class="pm-card-title-icon pm-bg-primary"></span>
                                    Historical Backups Repository
                                </div>
                                <button type="button" class="pm-btn pm-btn-danger pm-text-xs" id="pm-btn-clear-backups" style="padding: 0.35rem 0.75rem;">
                                    🗑️ Clear Backups
                                </button>
                            </div>
                            <div class="pm-table-wrapper pm-rounded-md">
                                <table class="pm-table" id="pm-backups-table">
                                    <thead>
                                        <tr>
                                            <th>Backup Name</th>
                                            <th>SQL File Size</th>
                                            <th>Log File Size</th>
                                            <th>Timestamp Created</th>
                                            <th style="text-align: right;">Actions</th>
                                        </tr>
                                    </thead>
                                        {foreach from=$backups item=b}
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
                                                    <td style="color: var(--pm-text-secondary); vertical-align: middle;">{(($b.sql_size / 1024) / 1024)|string_format:"%.2f MB"}</td>
                                                    <td style="color: var(--pm-text-secondary); vertical-align: middle;">{($b.log_size / 1024)|string_format:"%.2f KB"}</td>
                                                    <td style="color: var(--pm-text-secondary); vertical-align: middle;">{$b.date|date_format:"%Y-%m-%d %H:%M:%S"}</td>
                                                    <td style="vertical-align: middle; text-align: right;">
                                                        <div class="pm-actions-group" style="justify-content: flex-end; display: inline-flex;">
                                                            <a href="{$adminModulesUrl nofilter}&configure=mass_utility&action=download_backup&file={$b.sql_filename|urlencode}" class="pm-btn pm-btn-sm" title="Download SQL">
                                                                ⬇️ SQL
                                                            </a>
                                                            {if $b.log_filename}
                                                                <a href="{$adminModulesUrl nofilter}&configure=mass_utility&action=download_backup&file={$b.log_filename|urlencode}" class="pm-btn pm-btn-sm pm-btn-neutral" title="Download Log">
                                                                    📄 Log
                                                                </a>
                                                            {/if}
                                                            <button type="button" class="pm-btn pm-btn-sm pm-btn-compare pm-btn-purple" data-backup="{$b.basename|escape:"html"}" title="Compare Diff">
                                                                🔍 Diff
                                                            </button>
                                                            <button type="button" class="pm-btn pm-btn-sm pm-btn-danger pm-btn-delete" data-backup="{$b.basename|escape:"html"}" title="Delete Local">
                                                                🗑️ Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        {/foreach}
                                        {if empty($backups)}
                                        <tbody>
                                            <tr class="pm-empty-row">
                                                <td colspan="5" style="padding: 0;">
                                                    <div class="pm-empty-state" style="margin: 0; border: none; border-radius: 0; background: transparent;">
                                                        <div class="pm-empty-state-icon" style="animation: pm-pulse 2s infinite;">&#128340;</div>
                                                        <div class="pm-empty-state-text">Loading Database Backups...</div>
                                                        <div class="pm-empty-state-subtext">Fetching historical backups from the repository.</div>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tbody>
                                        {/if}
                                </table>
                            </div>
                        </div>



                    </div>

                    <!-- Inner Sub-panel 3: Restore / Import -->
                    <div class="pm-sub-tab-content" id="pm-sub-content-restore" style="display: none;">
                        <div class="pm-card pm-mb-6 pm-border-l-4-danger">
                            <div class="pm-card-title">
                                <span class="pm-card-title-icon pm-bg-danger"></span>
                                Database Restore & Import Manager
                            </div>
                            <p class="pm-text-sm pm-text-muted pm-m-0" style="line-height: 1.45;">
                                Restore your catalog tables from a previously generated local backup, or upload an external SQL script. 
                                The system runs a **chunked execution loop** to completely bypass web server gateway and PHP timeout bounds. 
                                <strong>Safety Check:</strong> The shop will be placed into Maintenance Mode during the restore to prevent write drift.
                            </p>
                        </div>

                        <div style="display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 1.5rem;">
                            <!-- External SQL Import Zone (Full Width) -->
                            <div class="pm-card">
                                <div class="pm-card-title" style="font-size: 1rem; color: var(--pm-text-primary); border-bottom: 1px solid var(--pm-border-color); padding-bottom: 0.5rem; margin-bottom: 1rem;">
                                    📤 Upload External SQL File
                                </div>
                                <p class="pm-text-sm pm-text-muted pm-mb-4" style="line-height: 1.4;">
                                    Select or upload a standard raw <code>.sql</code> or compressed <code>.sql.gz</code> database backup file to import it into your catalog tables.
                                </p>
                                
                                <div style="display: flex; gap: 0.75rem; align-items: center; width: 100%; flex-wrap: wrap;">
                                    <!-- Stylized File Selector Bar (acting as the dropzone target) -->
                                    <div id="pm-restore-dropzone" style="display: flex; align-items: center; flex-grow: 1; min-width: 250px; background: var(--pm-input-bg); border: 1px solid var(--pm-border-color); border-radius: 8px; padding: 0.2rem 0.2rem 0.2rem 0.75rem; transition: all 0.2s ease; cursor: pointer; height: 38px; box-sizing: border-box;">
                                        <span style="font-size: 1rem; margin-right: 0.5rem; display: flex; align-items: center;">📁</span>
                                        <span class="pm-text-sm pm-font-medium" style="color: var(--pm-text-secondary); flex-grow: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; user-select: none;" id="pm-restore-file-name">Click or drag SQL/GZ file here...</span>
                                        <button type="button" class="pm-btn pm-btn-neutral" style="padding: 0 1rem; height: 30px; line-height: 30px; font-size: 0.8rem; border-radius: 6px; pointer-events: none;">Browse</button>
                                        <input type="file" id="pm-restore-file-input" accept=".sql,.gz" style="display: none;">
                                    </div>
                                    
                                    <!-- Action Buttons -->
                                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                                        <button type="button" id="pm-btn-upload-cancel" class="pm-btn pm-btn-neutral" style="display: none; height: 38px; padding: 0 1.25rem;">
                                            Cancel
                                        </button>
                                        <button type="button" id="pm-btn-upload-stage" class="pm-btn pm-btn-purple" disabled style="height: 38px; padding: 0 1.25rem;">
                                            📤 Upload & Stage
                                        </button>
                                    </div>
                                </div>

                                <div id="pm-upload-progress-container" style="display: none; margin-top: 1rem; width: 100%;">
                                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--pm-text-secondary); margin-bottom: 0.3rem;">
                                        <span>Uploading...</span>
                                        <span id="pm-upload-percent">0%</span>
                                    </div>
                                    <div style="height: 6px; background: rgba(0,0,0,0.1); border-radius: 3px; overflow: hidden; border: 1px solid var(--pm-border-color);">
                                        <div id="pm-upload-progress-bar" style="width: 0%; height: 100%; background: var(--pm-purple); transition: width 0.15s ease;"></div>
                                    </div>
                                </div>
                            </div>

                            <!-- Local Backups Table List (Full Width) -->
                            <div class="pm-card">
                                <div class="pm-card-title pm-flex-between pm-flex-wrap pm-gap-2" style="border-bottom: 1px solid var(--pm-border-color); padding-bottom: 0.5rem; margin-bottom: 1rem;">
                                    <div class="pm-flex-center pm-gap-2">
                                        <span class="pm-card-title-icon pm-bg-primary"></span>
                                        📁 Select Local Backup
                                    </div>
                                    <div style="display: flex; gap: 1rem; font-size: 0.75rem;">
                                         <div style="display: flex; align-items: center; gap: 0.3rem;"><span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: var(--pm-success);"></span><span style="color: var(--pm-text-secondary);">Local</span></div>
                                         <div style="display: flex; align-items: center; gap: 0.3rem;"><span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: var(--pm-purple);"></span><span style="color: var(--pm-text-secondary);">Uploaded</span></div>
                                    </div>
                                </div>
                                <div class="pm-table-wrapper pm-rounded-md">
                                    <table class="pm-table">
                                        <thead>
                                            <tr>
                                                <th>Backup Name</th>
                                                <th>SQL File Size</th>
                                                <th>Timestamp Created</th>
                                                <th style="text-align: right;">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody id="pm-restore-local-list">
                                            <tr class="pm-empty-row">
                                                <td colspan="4" style="padding: 0;">
                                                    <div class="pm-empty-state" style="margin: 0; border: none; border-radius: 0; background: transparent;">
                                                        <div class="pm-empty-state-icon" style="animation: pm-pulse 2s infinite;">&#128340;</div>
                                                        <div class="pm-empty-state-text">Loading Local Backups...</div>
                                                        <div class="pm-empty-state-subtext">Fetching local database backups.</div>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <!-- Restoration Progress HUD -->
                        <div id="pm-restore-hud" class="pm-card" style="display: none; border-color: rgba(var(--pm-danger-rgb), 0.25); background: rgba(var(--pm-danger-rgb), 0.01); transition: all 0.3s ease; margin-bottom: 1.5rem;">
                            <div class="pm-card-title" style="color: var(--pm-danger); justify-content: space-between; align-items: center;">
                                <div class="pm-flex-center pm-gap-2">
                                    <span class="pm-card-title-icon pm-bg-danger"></span>
                                    Database Restore & Rebuild Sequence Active
                                </div>
                                <span class="pm-status-pill danger" id="pm-restore-hud-state" style="font-size: 0.65rem;">STAGE 1: PRE-FLIGHT</span>
                            </div>
                            
                            <div style="display: flex; align-items: center; gap: 1.5rem; margin-bottom: 1.5rem; margin-top: 1rem;">
                                <!-- Radial or Bar Progress -->
                                <div style="flex-grow: 1;">
                                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700; color: var(--pm-text-primary); margin-bottom: 0.4rem;">
                                        <span>Progress Status</span>
                                        <span id="pm-restore-percent">0%</span>
                                    </div>
                                    <div style="height: 10px; background: rgba(0,0,0,0.1); border-radius: 5px; overflow: hidden; border: 1px solid var(--pm-border-color);">
                                        <div id="pm-restore-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, var(--pm-danger), var(--pm-warning)); transition: width 0.15s ease;"></div>
                                    </div>
                                </div>
                            </div>

                            <div class="pm-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 1.5rem; gap: 1rem;">
                                <div class="pm-card" style="padding: 0.75rem 1rem;">
                                    <span style="font-size: 0.75rem; color: var(--pm-text-secondary);">Statements Executed</span>
                                    <div style="font-size: 1.25rem; font-weight: 700; font-family: 'Outfit';" id="pm-restore-stats-executed">0 / 0</div>
                                </div>
                                <div class="pm-card" style="padding: 0.75rem 1rem;">
                                    <span style="font-size: 0.75rem; color: var(--pm-text-secondary);">Current Action</span>
                                    <div style="font-size: 0.85rem; font-weight: 700; color: var(--pm-danger); margin-top: 0.3rem; text-transform: uppercase;" id="pm-restore-stats-action">Initializing...</div>
                                </div>
                                <div class="pm-card" style="padding: 0.75rem 1rem;">
                                    <span style="font-size: 0.75rem; color: var(--pm-text-secondary);">Shop Status</span>
                                    <div style="font-size: 0.85rem; font-weight: 700; color: var(--pm-warning); margin-top: 0.3rem; text-transform: uppercase;" id="pm-restore-stats-shop">Maintenance Mode</div>
                                </div>
                            </div>

                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <span class="pm-subtitle" style="margin-bottom: 0;">Restore Execution Diagnostics Terminal</span>
                                <div style="display: flex; gap: 0.5rem;">
                                    <button type="button" class="pm-btn pm-btn-outline" id="pm-btn-save-restore-log" style="padding: 0.2rem 0.6rem; font-size: 0.75rem; display: flex; align-items: center; gap: 0.3rem; line-height: 1;">
                                        <span>📥</span> Save Log
                                    </button>
                                    <button type="button" class="pm-btn pm-btn-outline" id="pm-btn-clear-restore-log" style="padding: 0.2rem 0.6rem; font-size: 0.75rem; color: var(--pm-danger); border-color: rgba(239, 68, 68, 0.2); display: flex; align-items: center; gap: 0.3rem; line-height: 1;">
                                        <span>🗑️</span> Clear
                                    </button>
                                </div>
                            </div>
                            <pre class="pm-log-terminal" id="pm-restore-log-terminal" style="max-height: 200px; color: var(--pm-danger); border-color: rgba(var(--pm-danger-rgb), 0.25); background: var(--pm-terminal-bg); font-size: 0.8rem;"></pre>
                        </div>

                        <!-- Post-Restore Shop Status Alert -->
                        <div id="pm-restore-shop-alert" class="pm-card" style="display: none; border-left: 4px solid var(--pm-warning); background: rgba(var(--pm-warning-rgb), 0.03); margin-bottom: 1.5rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                                <div style="display: flex; align-items: start; gap: 0.75rem;">
                                    <span style="font-size: 1.5rem;">⚠️</span>
                                    <div>
                                        <strong style="color: var(--pm-text-primary); font-size: 0.9rem;">Database Rebuild Complete — Store Remaining in Maintenance Mode</strong>
                                        <p style="font-size: 0.8rem; color: var(--pm-text-secondary); margin-top: 0.25rem; margin-bottom: 0; line-height: 1.4;">
                                            Because the store was already in Maintenance Mode before the restore began, it has been kept in Maintenance Mode for your safety. Review your catalog changes before putting the store Live.
                                        </p>
                                    </div>
                                </div>
                                <button type="button" id="pm-btn-restore-set-live" class="pm-btn pm-btn-success pm-text-sm" style="padding: 0.5rem 1rem;">
                                    ⚡ Take Store Live Now
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Inner Sub-panel 2: DB Profiler & Optimization -->
                    <div class="pm-sub-tab-content" id="pm-sub-content-profiler" style="display: none;">
                        <div class="pm-card pm-mb-6">
                            <div class="pm-card-title pm-flex-between pm-flex-wrap pm-m-0" style="gap: 0.75rem;">
                                <div class="pm-flex-center pm-gap-2">
                                    <span class="pm-card-title-icon pm-bg-primary" style="background: var(--pm-success);"></span>
                                    Automated Database Profiler & Space Optimizer
                                </div>
                                <button type="button" id="pm-btn-run-profile" class="pm-btn pm-btn-success pm-text-xs">
                                    🔄 Refresh Profile Analysis
                                </button>
                            </div>
                            <p class="pm-text-sm pm-text-muted pm-m-0" style="margin-top: 1rem; line-height: 1.4;">
                                Analyzes PrestaShop core tables in real-time to locate unused allocated memory, index fragmentation, and database overhead. Fragmented tables can slow down read/write transactions.
                            </p>
                        </div>

                        <!-- Profiler Score HUD -->
                        <div class="pm-grid pm-mb-6 pm-gap-6" style="grid-template-columns: repeat(3, 1fr);">
                            <div class="pm-card" style="padding: 1rem; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                                <span style="font-size: 0.8rem; color: var(--pm-text-secondary); display: block; margin-bottom: 0.5rem;">Database Health Grade</span>
                                <div style="font-size: 3rem; font-weight: 900; font-family: 'Outfit'; color: var(--pm-success); line-height: 1;" id="pm-db-grade">-</div>
                                <span style="font-size: 0.7rem; color: var(--pm-text-secondary); margin-top: 0.25rem;" id="pm-db-grade-label">No analysis performed</span>
                            </div>
                            <div class="pm-card" style="padding: 1rem; display: flex; flex-direction: column; justify-content: space-between;">
                                <div>
                                    <span style="font-size: 0.8rem; color: var(--pm-text-secondary);">Total Space Over-Allocated</span>
                                    <div style="font-size: 1.8rem; font-weight: 700; font-family: 'Outfit'; margin-top: 0.5rem;" id="pm-db-total-free">0.00 MB</div>
                                </div>
                                <span style="font-size: 0.7rem; color: var(--pm-text-secondary);">Can be reclaimed immediately</span>
                            </div>
                            <div class="pm-card" style="padding: 1rem; display: flex; flex-direction: column; justify-content: space-between;">
                                <div>
                                    <span style="font-size: 0.8rem; color: var(--pm-text-secondary);">Average Fragmentation Ratio</span>
                                    <div style="font-size: 1.8rem; font-weight: 700; font-family: 'Outfit'; margin-top: 0.5rem;" id="pm-db-frag-ratio">0.00%</div>
                                </div>
                                <span style="font-size: 0.7rem; color: var(--pm-text-secondary);" id="pm-db-tables-count">0 tables monitored</span>
                            </div>
                        </div>

                        <!-- Table Fragmentation Grid -->
                        <div class="pm-card">
                            <div class="pm-card-title">
                                📊 Overhead & Fragmentation Details
                            </div>
                            <div class="pm-table-wrapper pm-rounded-md">
                                <table class="pm-table" id="pm-db-profiler-table">
                                    <thead>
                                        <tr>
                                            <th>Table Name</th>
                                            <th>Engine</th>
                                            <th>Data & Index Size</th>
                                            <th>Reclaimable Space (Overhead)</th>
                                            <th>Frag. Ratio</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr class="pm-empty-row">
                                            <td colspan="6" style="padding: 0;">
                                                <div class="pm-empty-state" style="margin: 0; border: none; border-radius: 0; background: transparent;">
                                                    <div class="pm-empty-state-icon" style="animation: pm-pulse 2s infinite;">&#128373;</div>
                                                    <div class="pm-empty-state-text">No DB Profile Compiled</div>
                                                    <div class="pm-empty-state-subtext">Click the refresh button to analyze table metrics.</div>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    {$dataSweeperContent nofilter}
                </div>


                



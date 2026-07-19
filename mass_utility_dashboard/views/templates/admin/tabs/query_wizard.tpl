<!-- TAB 2b: ⚡ QUERY & MUTATE WIZARD -->
                <div class="pm-tab-content" id="pm-content-query-mutate">
                    
                    <!-- GLOBAL MASTER PRESET ENGINE -->
                    <div class="pm-card pm-mb-6 pm-p-4" style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2);">
                        <div class="pm-flex-center pm-gap-2 pm-mb-4">
                            <span class="pm-card-title-icon pm-bg-success"></span>
                            <span style="font-family: 'Outfit'; font-weight: 600; font-size: 0.95rem; color: var(--pm-card-title-color);">Master Combo Preset Engine</span>
                        </div>
                        <div class="pm-flex-center pm-gap-2" style="padding-top: 1rem; border-top: 1px solid rgba(16, 185, 129, 0.2);">
                            <span style="font-family: 'Outfit'; font-weight: 600; font-size: 0.85rem; color: var(--pm-card-title-color);">Combo Template:</span>
                            <select id="pm-preset-master" class="pm-select" style="flex-grow: 1; min-width: 200px; padding: 0.2rem 0.5rem; font-size: 0.8rem;">
                                <option value="">- Custom / No Template -</option>
                            </select>
                            <button type="button" id="pm-btn-save-preset-master" class="pm-btn pm-btn-success pm-text-xs pm-text-center" style="padding: 0.2rem 0.6rem; min-width: 80px;">Save</button>
                            <button type="button" id="pm-btn-delete-preset-master" class="pm-btn pm-btn-danger pm-text-xs pm-text-center" style="padding: 0.2rem 0.6rem; min-width: 80px;" disabled>Delete</button>
                        </div>
                    </div>

                    <!-- STEP 1: DEFINE TARGET PRODUCTS -->
                    <div class="pm-card pm-mb-6 pm-border-l-4-primary">
                        <div class="pm-mb-4">
                            <div class="pm-flex-center pm-gap-2 pm-mb-2">
                                <span class="pm-card-title-icon pm-bg-primary"></span>
                                <div class="pm-text-md pm-font-bold" style="color: var(--pm-primary-color);">
                                    Step 1: Define Target Products (Visual AST Filter)
                                </div>
                            </div>
                            <div class="pm-flex-center pm-gap-2" style="border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 0.5rem;">
                                <span style="font-family: 'Outfit'; font-weight: 600; font-size: 0.85rem; color: var(--pm-card-title-color);">Preset:</span>
                                <select id="pm-preset-query" class="pm-select" style="flex-grow: 1; min-width: 200px; padding: 0.2rem 0.5rem; font-size: 0.8rem;">
                                    <option value="">- Custom / No Preset -</option>
                                </select>
                                <button type="button" id="pm-btn-save-preset-query" class="pm-btn pm-btn-success pm-text-xs pm-text-center" style="padding: 0.2rem 0.6rem; min-width: 80px;">Save</button>
                                <button type="button" id="pm-btn-delete-preset-query" class="pm-btn pm-btn-danger pm-text-xs pm-text-center" style="padding: 0.2rem 0.6rem; min-width: 80px;" disabled>Delete</button>
                            </div>
                        </div>
                        <p class="pm-text-sm pm-text-muted pm-mb-6" style="line-height: 1.4;">
                            Formulate complex filter criteria recursively. The translation engine will securely parse the AST structure, resolve indexed database tables, and preview the affected database scopes.
                        </p>
                        
                        <!-- Live Translation Explanation Panel -->
                        <div id="pm-query-explanation-panel" class="pm-card pm-mb-6" style="background: rgba(59, 130, 246, 0.03); border-color: rgba(59, 130, 246, 0.15); transition: all 0.2s ease; box-shadow: none;">
                            <div class="pm-text-sm" style="color: var(--pm-text-primary); line-height: 1.55;">
                                🗣️ <strong>Query Live Translation:</strong> 
                                <span id="pm-query-explanation-text" style="font-style: italic; color: var(--pm-text-secondary); margin-left: 0.25rem;">
                                    No rules defined yet. Add a rule below to start.
                                </span>
                            </div>
                        </div>

                        <!-- Visual Builder Area -->
                        <div id="pm-query-builder-root">
                            <!-- Populated dynamically by JS -->
                        </div>
                        
                        <div class="pm-flex pm-gap-3 pm-flex-wrap" style="margin-top: 1.5rem;">
                            <button type="button" id="pm-btn-preview-query" class="pm-btn pm-btn-purple">
                                ⚡ Compile & Preview Affected Products
                            </button>
                        </div>
                    </div>

                    <!-- Result Panel -->
                    <div id="pm-query-result-panel" class="pm-card pm-mb-6" style="display: none; transition: all 0.3s ease;">
                        <div class="pm-card-title" style="color: #10b981;">
                            <span class="pm-card-title-icon pm-bg-success"></span>
                            AST Compilation Results
                        </div>
                        <div class="pm-grid pm-mb-6" style="grid-template-columns: repeat(2, 1fr);">
                            <div class="pm-card pm-p-4">
                                <span style="font-size: 0.8rem; color: var(--pm-text-secondary);">Affected Products Count</span>
                                <div style="font-size: 1.5rem; font-weight: 700; font-family: 'Outfit';" id="pm-preview-count">0</div>
                            </div>
                            <div class="pm-card pm-p-4">
                                <span style="font-size: 0.8rem; color: var(--pm-text-secondary);">Target Scope Security Status</span>
                                <div style="font-size: 1.15rem; font-weight: 700; font-family: 'Outfit'; color: #10b981; margin-top: 0.25rem;">SAFE & PARAMETERIZED</div>
                            </div>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <span class="pm-subtitle" style="display: block; margin: 0;">Compiled MariaDB SQL Query</span>
                            <button type="button" style="background: none; border: none; cursor: pointer; color: var(--pm-text-secondary); font-size: 1.1rem; padding: 0; transition: transform 0.2s;" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText).then(() => window.showPremiumToast('Copied to clipboard!')); this.style.transform = 'scale(1.2)'; setTimeout(() => this.style.transform = 'scale(1)', 200);" title="Copy Snippet">&#128203;</button>
                        </div>
                        <pre class="pm-log-terminal" id="pm-preview-sql" style="max-height: 150px; color: #60a5fa; border-color: rgba(96, 165, 250, 0.2); font-size: 0.8rem; margin-top: 0;"></pre>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; margin-bottom: 0.5rem;">
                            <span class="pm-subtitle" style="display: block; margin: 0;">Sample Target Product IDs</span>
                            <button type="button" style="background: none; border: none; cursor: pointer; color: var(--pm-text-secondary); font-size: 1.1rem; padding: 0; transition: transform 0.2s;" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText).then(() => window.showPremiumToast('Copied to clipboard!')); this.style.transform = 'scale(1.2)'; setTimeout(() => this.style.transform = 'scale(1)', 200);" title="Copy Snippet">&#128203;</button>
                        </div>
                        <div style="font-family: monospace; font-size: 0.85rem; padding: 0.75rem; border: 1px solid var(--pm-border-color); border-radius: 8px; background: rgba(0,0,0,0.02); max-height: 120px; overflow-y: auto; margin-top: 0;" id="pm-preview-samples">
                            <!-- Product IDs -->
                        </div>
                    </div>

                    <!-- STEP 2: CONFIGURE & EXECUTE MUTATIONS -->
                    <div id="pm-wizard-step-2" style="display: none; animation: pmFadeIn 0.5s ease;">
                        <div class="pm-card pm-mb-6 pm-border-l-4-danger" style="background: rgba(239, 68, 68, 0.02);">
                            <div class="pm-card-title" style="color: #ef4444;">
                                <span class="pm-card-title-icon pm-bg-danger"></span>
                                Step 2: Configure & Execute Mutations (Safety Shield Active)
                            </div>
                            <p class="pm-text-sm pm-text-muted pm-m-0" style="line-height: 1.5;">
                                <strong>Atomic Database Modifications:</strong> Mutations are executed inside rigid <code>START TRANSACTION</code> boundaries. 
                                Pessimistic intent-locks (<code>FOR UPDATE</code>) will be acquired on targets to prevent concurrent read/write drift. 
                                The <strong>Buffer Packet Shield</strong> dynamically adjusts batch sizing based on server limits. If any failure occurs, a full <code>ROLLBACK</code> is triggered automatically.
                            </p>
                        </div>

                        <div class="pm-grid pm-mb-6" style="grid-template-columns: repeat(2, 1fr);">
                            <div class="pm-card" style="padding: 1.25rem;">
                                <span style="font-size: 0.8rem; color: var(--pm-text-secondary); display: block; margin-bottom: 0.25rem;">Target Scope Count</span>
                                <div style="font-size: 1.75rem; font-weight: 700; font-family: 'Outfit'; display: flex; align-items: center; gap: 0.5rem;">
                                    🎯 <span id="pm-execute-target-count">0</span>
                                    <span style="font-size: 0.85rem; font-weight: normal; color: var(--pm-text-secondary);">products matched</span>
                                </div>
                                <span id="pm-execute-sync-status" class="pm-status-pill success" style="margin-top: 0.5rem; font-size: 0.65rem;">SYNCED WITH BUILDER</span>
                            </div>
                            <div class="pm-card" style="padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between;">
                                <div>
                                    <span style="font-size: 0.8rem; color: var(--pm-text-secondary); display: block; margin-bottom: 0.25rem;">Active Target Translation</span>
                                    <div id="pm-execute-target-explanation" style="font-size: 0.8rem; font-style: italic; color: var(--pm-text-secondary); max-height: 50px; overflow-y: auto;">
                                        Filter logic goes here...
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="pm-card pm-mb-6">
                            <div class="pm-mb-4">
                                <div class="pm-flex-center pm-gap-2 pm-mb-2">
                                    <span class="pm-card-title-icon pm-bg-primary"></span>
                                    <div class="pm-text-md pm-font-bold" style="color: var(--pm-card-title-color);">
                                        Action Rules Builder
                                    </div>
                                </div>
                                <div class="pm-flex-center pm-gap-2" style="border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 0.5rem;">
                                    <span style="font-family: 'Outfit'; font-weight: 600; font-size: 0.85rem; color: var(--pm-card-title-color);">Preset:</span>
                                    <select id="pm-preset-mutate" class="pm-select" style="flex-grow: 1; min-width: 200px; padding: 0.2rem 0.5rem; font-size: 0.8rem;">
                                        <option value="">- Custom / No Preset -</option>
                                    </select>
                                    <button type="button" id="pm-btn-save-preset-mutate" class="pm-btn pm-btn-success pm-text-xs pm-text-center" style="padding: 0.2rem 0.6rem; min-width: 80px;">Save</button>
                                    <button type="button" id="pm-btn-delete-preset-mutate" class="pm-btn pm-btn-danger pm-text-xs pm-text-center" style="padding: 0.2rem 0.6rem; min-width: 80px;" disabled>Delete</button>
                                </div>
                            </div>
                            <p class="pm-text-sm pm-text-muted" style="margin-bottom: 1.25rem; line-height: 1.4;">
                                Configure the exact mutations to apply onto the targeted scope of products. You can apply multiple changes at the same time atomically.
                            </p>
                            
                            <div id="pm-mutation-rules-container" class="pm-flex pm-gap-3" style="flex-direction: column; margin-bottom: 1.25rem;">
                                <!-- Populated dynamically by JS -->
                            </div>

                            <div class="pm-flex pm-gap-3 pm-flex-wrap">
                                <button type="button" id="pm-btn-add-mutation" class="pm-btn pm-btn-neutral">
                                    ➕ Add Mutation Action
                                </button>
                                <button type="button" id="pm-btn-execute-mutations" class="pm-btn pm-btn-danger">
                                    ⚡ Run Atomic Execution
                                </button>
                            </div>
                        </div>

                    </div>

                    <!-- Live Mutation Output Log Terminal -->
                    <div id="pm-mutation-result-panel" class="pm-card" style="margin-top: 1.5rem;">
                        <div class="pm-card-title" style="justify-content: space-between; align-items: center;">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span class="pm-card-title-icon" style="background-color: #10b981;"></span>
                                Mutation Execution Log Terminal
                            </div>
                            <div style="display: flex; gap: 0.5rem;">
                                <button type="button" class="pm-btn pm-btn-outline" id="pm-btn-save-mutation-log" style="padding: 0.3rem 0.8rem; font-size: 0.8rem; display: flex; align-items: center; gap: 0.4rem;">
                                    <span>📥</span> Save Log
                                </button>
                                <button type="button" class="pm-btn pm-btn-outline" id="pm-btn-clear-mutation-log" style="padding: 0.3rem 0.8rem; font-size: 0.8rem; color: var(--pm-danger); border-color: rgba(239, 68, 68, 0.2); display: flex; align-items: center; gap: 0.4rem;">
                                    <span>🗑️</span> Clear
                                </button>
                            </div>
                        </div>
                        <pre class="pm-log-terminal" id="pm-mutation-log-terminal" style="max-height: 300px; font-size: 0.8rem; border-color: rgba(16, 185, 129, 0.25); color: #10b981; background: #05070f; overflow-y: auto; white-space: pre-wrap; word-break: break-all;">{if empty($logContent)}No mutation logs compiled yet.
{else}{$logContent|escape:"html"}{/if}</pre>
                    </div>
                </div>

                
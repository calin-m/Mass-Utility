<!-- TAB 3: MUTATION TRANSACTION HISTORY -->
                <div class="pm-tab-content" id="pm-content-history">
                    <!-- Mutation History Card -->
                    <div class="pm-card pm-border-l-4-purple">
                        <div class="pm-card-title pm-flex-between pm-flex-wrap">
                            <div class="pm-flex-center pm-gap-2">
                                <span class="pm-card-title-icon pm-bg-purple"></span>
                                Mutation History & Safety Revert Console
                            </div>
                            <div class="pm-flex pm-gap-2">
                                <button type="button" class="pm-btn pm-btn-neutral pm-text-xs" id="pm-btn-refresh-history" style="padding: 0.35rem 0.75rem;">
                                    🔄 Refresh History
                                </button>
                                <button type="button" class="pm-btn pm-btn-danger pm-text-xs" id="pm-btn-clear-history" style="padding: 0.35rem 0.75rem;">
                                    🗑️ Clear History
                                </button>
                            </div>
                        </div>
                        <p class="pm-text-sm pm-text-muted" style="margin-bottom: 1.25rem;">
                            Review previous mass update transactions. You can trigger an atomic revert sequence to restore the initial captured baseline states at any time.
                        </p>
                        
                        <!-- History Table -->
                        <div class="pm-table-wrapper pm-rounded-md">
                            <table class="pm-table" id="pm-mutation-history-table">
                                <thead>
                                    <tr>
                                        <th>Job ID</th>
                                        <th>Date</th>
                                        <th>Mutated Fields / Action</th>
                                        <th class="pm-text-center">Targets</th>
                                        <th class="pm-text-center">Status</th>
                                        <th style="text-align: right;">Action</th>
                                    </tr>
                                </thead>
                                <tbody id="pm-mutation-history-body">
                                    <tr>
                                        <td colspan="6" style="padding: 0;">
                                            <div class="pm-empty-state" style="margin: 0; border: none; border-radius: 0; background: transparent;">
                                                <div class="pm-empty-state-icon" style="animation: pm-pulse 2s infinite;">&#128340;</div>
                                                <div class="pm-empty-state-text">Loading Mutation Ledger...</div>
                                                <div class="pm-empty-state-subtext">Fetching transactional records from the database.</div>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

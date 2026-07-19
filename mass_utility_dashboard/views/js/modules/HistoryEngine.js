/**
 * Project Mass - History & Rollback Engine
 * Handles the Mutation Ledger UI, Revert actions, Reapply payloads, and SQL Reconstruction previews.
 */
const HistoryEngine = (function() {

    // --- Private Engine Logic ---
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

                function pmReconstructSQL(details) {
                    const dbPrefix = window.pmDbPrefix || 'ps_';
                    const idShop = window.pmIdShop || 1;
                    
                    let mutationSql = '-- No executed mutations captured or invalid payload.\n';
                    let revertSql = '-- No rollback safety snapshots recorded or invalid payload.\n';

                    try {
                        const rawPayload = JSON.parse(details.raw_payload);
                        const revertData = JSON.parse(details.revert_payload);
                        
                        let productIds = revertData && revertData.target_ids ? revertData.target_ids : [];
                        if (productIds.length === 0) {
                            productIds = revertData && revertData.products ? Object.keys(revertData.products) : [];
                        }
                        const escapedIds = productIds.join(', ');

                        if (rawPayload && productIds.length > 0) {
                            let mStatements = [];
                            Object.keys(rawPayload).forEach(field => {
                                const action = rawPayload[field];
                                const type = (action.type || 'SET').toUpperCase();
                                const val = action.value;

                                switch (field) {
                                    case 'price':
                                    case 'product.price':
                                        const escFloat = parseFloat(val) || 0;
                                        if (type === 'ADD') {
                                            mStatements.push(`UPDATE \`${dbPrefix}product_shop\` SET price = price + ${escFloat} WHERE id_product IN (${escapedIds}) AND id_shop = ${idShop};`);
                                            mStatements.push(`UPDATE \`${dbPrefix}product\` SET price = price + ${escFloat} WHERE id_product IN (${escapedIds});`);
                                        } else if (type === 'MULTIPLY') {
                                            mStatements.push(`UPDATE \`${dbPrefix}product_shop\` SET price = price * ${escFloat} WHERE id_product IN (${escapedIds}) AND id_shop = ${idShop};`);
                                            mStatements.push(`UPDATE \`${dbPrefix}product\` SET price = price * ${escFloat} WHERE id_product IN (${escapedIds});`);
                                        } else {
                                            mStatements.push(`UPDATE \`${dbPrefix}product_shop\` SET price = ${escFloat} WHERE id_product IN (${escapedIds}) AND id_shop = ${idShop};`);
                                            mStatements.push(`UPDATE \`${dbPrefix}product\` SET price = ${escFloat} WHERE id_product IN (${escapedIds});`);
                                        }
                                        break;
                                    case 'active':
                                    case 'product.active':
                                        const escInt = parseInt(val) ? 1 : 0;
                                        mStatements.push(`UPDATE \`${dbPrefix}product_shop\` SET active = ${escInt} WHERE id_product IN (${escapedIds}) AND id_shop = ${idShop};`);
                                        mStatements.push(`UPDATE \`${dbPrefix}product\` SET active = ${escInt} WHERE id_product IN (${escapedIds});`);
                                        break;
                                    case 'reference':
                                    case 'product.reference':
                                        const escStr = String(val).replace(/'/g, "\\'");
                                        mStatements.push(`UPDATE \`${dbPrefix}product\` SET reference = '${escStr}' WHERE id_product IN (${escapedIds});`);
                                        break;
                                    case 'id_manufacturer':
                                    case 'manufacturer.id':
                                    case 'product.id_manufacturer':
                                        const escMan = parseInt(val) || 0;
                                        mStatements.push(`UPDATE \`${dbPrefix}product\` SET id_manufacturer = ${escMan} WHERE id_product IN (${escapedIds});`);
                                        mStatements.push(`UPDATE \`${dbPrefix}product_shop\` SET id_manufacturer = ${escMan} WHERE id_product IN (${escapedIds}) AND id_shop = ${idShop};`);
                                        break;
                                    case 'discount_percent':
                                        const escPct = (parseFloat(val) || 0) / 100.0;
                                        mStatements.push(`DELETE FROM \`${dbPrefix}specific_price\` WHERE id_product IN (${escapedIds}) AND id_shop IN (0, ${idShop});`);
                                        if (escPct > 0) {
                                            productIds.forEach(idProduct => {
                                                mStatements.push(`INSERT INTO \`${dbPrefix}specific_price\` (\`id_product\`, \`id_shop\`, \`id_currency\`, \`id_country\`, \`id_group\`, \`id_customer\`, \`id_product_attribute\`, \`price\`, \`from_quantity\`, \`reduction\`, \`reduction_tax\`, \`reduction_type\`, \`from\`, \`to\`) VALUES (${idProduct}, ${idShop}, 0, 0, 0, 0, 0, -1.000000, 1, ${escPct}, 1, 'percentage', '0000-00-00 00:00:00', '0000-00-00 00:00:00');`);
                                            });
                                        }
                                        break;
                                    case 'discount_amount':
                                        const escAmt = parseFloat(val) || 0;
                                        mStatements.push(`DELETE FROM \`${dbPrefix}specific_price\` WHERE id_product IN (${escapedIds}) AND id_shop IN (0, ${idShop});`);
                                        if (escAmt > 0) {
                                            productIds.forEach(idProduct => {
                                                mStatements.push(`INSERT INTO \`${dbPrefix}specific_price\` (\`id_product\`, \`id_shop\`, \`id_currency\`, \`id_country\`, \`id_group\`, \`id_customer\`, \`id_product_attribute\`, \`price\`, \`from_quantity\`, \`reduction\`, \`reduction_tax\`, \`reduction_type\`, \`from\`, \`to\`) VALUES (${idProduct}, ${idShop}, 0, 0, 0, 0, 0, -1.000000, 1, ${escAmt}, 1, 'amount', '0000-00-00 00:00:00', '0000-00-00 00:00:00');`);
                                            });
                                        }
                                        break;
                                }
                            });
                            if (mStatements.length > 0) {
                                mutationSql = mStatements.join('\n');
                            }
                        }
                    } catch (e) {
                        mutationSql = '-- Error compiling executed Mutation SQL: ' + e.message + '\n';
                    }

                    try {
                        const revertData = JSON.parse(details.revert_payload);
                        if (revertData) {
                            let rStatements = [];
                            // 1. Revert product & product_shop
                            if (revertData.products) {
                                let productGroups = {}; 
                                let productShopGroups = {};
                                
                                Object.keys(revertData.products).forEach(idProduct => {
                                    const data = revertData.products[idProduct];
                                    
                                    if (data.product) {
                                        let cols = [];
                                        Object.keys(data.product).forEach(col => {
                                            if (col === 'id_product') return;
                                            const val = data.product[col];
                                            cols.push(`\`${col}\` = ` + (val === null ? 'NULL' : `'${String(val).replace(/'/g, "\\'")}'`));
                                        });
                                        if (cols.length > 0) {
                                            let setStr = cols.join(', ');
                                            if (!productGroups[setStr]) productGroups[setStr] = [];
                                            productGroups[setStr].push(idProduct);
                                        }
                                    }
                                    
                                    if (data.product_shop) {
                                        let cols = [];
                                        Object.keys(data.product_shop).forEach(col => {
                                            if (col === 'id_product' || col === 'id_shop') return;
                                            const val = data.product_shop[col];
                                            cols.push(`\`${col}\` = ` + (val === null ? 'NULL' : `'${String(val).replace(/'/g, "\\'")}'`));
                                        });
                                        if (cols.length > 0) {
                                            let setStr = cols.join(', ');
                                            if (!productShopGroups[setStr]) productShopGroups[setStr] = [];
                                            productShopGroups[setStr].push(idProduct);
                                        }
                                    }
                                });
                                
                                Object.keys(productGroups).forEach(setStr => {
                                    const ids = productGroups[setStr].join(', ');
                                    rStatements.push(`UPDATE \`${dbPrefix}product\` SET ${setStr} WHERE id_product IN (${ids});`);
                                });
                                
                                Object.keys(productShopGroups).forEach(setStr => {
                                    const ids = productShopGroups[setStr].join(', ');
                                    rStatements.push(`UPDATE \`${dbPrefix}product_shop\` SET ${setStr} WHERE id_product IN (${ids}) AND id_shop = ${idShop};`);
                                });
                            }

                            // 2. Revert specific prices
                            let productIds = revertData.target_ids ? revertData.target_ids : [];
                            if (productIds.length === 0) {
                                productIds = revertData.products ? Object.keys(revertData.products) : [];
                            }
                            if (productIds.length > 0) {
                                rStatements.push(`DELETE FROM \`${dbPrefix}specific_price\` WHERE id_product IN (${productIds.join(', ')}) AND id_shop IN (0, ${idShop});`);
                            }
                            if (revertData.specific_prices && revertData.specific_prices.length > 0) {
                                revertData.specific_prices.forEach(sp => {
                                    let insertKeys = [];
                                    let insertValues = [];
                                    Object.keys(sp).forEach(col => {
                                        if (col === 'id_specific_price') return;
                                        insertKeys.push(`\`${col}\``);
                                        const val = sp[col];
                                        insertValues.push(val === null ? 'NULL' : `'${String(val).replace(/'/g, "\\'")}'`);
                                    });
                                    rStatements.push(`INSERT INTO \`${dbPrefix}specific_price\` (${insertKeys.join(', ')}) VALUES (${insertValues.join(', ')});`);
                                });
                            }

                            if (rStatements.length > 0) {
                                revertSql = rStatements.join('\n');
                            }
                        }
                    } catch (e) {
                        revertSql = '-- Error compiling Reversion SQL: ' + e.message + '\n';
                    }

                    return { mutationSql, revertSql };
                }

                // Pre-populated dynamic lists from PHP isolated bridge (TX-107.B)
                window.pmCategories = window.PM_CONFIG.categories;
                window.pmManufacturers = window.PM_CONFIG.manufacturers;
                window.pmProfiles = window.PM_CONFIG.profiles;
                window.pmBackups = window.PM_CONFIG.backups;
                window.pmDbPrefix = window.PM_CONFIG.dbPrefix;
                window.pmIdShop = window.PM_CONFIG.idShop;

                
    function bindEvents() {
        const historyBody = document.getElementById('pm-mutation-history-body');

// A. Light/Dark Theme persistent logic
                const toggleBtn = document.getElementById('pm-theme-toggle');
                const container = document.querySelector('.pm-container');
                const icon = document.getElementById('pm-theme-icon');
                const text = document.getElementById('pm-theme-text');
                
                if (toggleBtn && !toggleBtn.dataset.themeBound) {
                    toggleBtn.dataset.themeBound = "true";
                    const currentTheme = localStorage.getItem('pm-theme') || 'light';
                    if (currentTheme === 'dark') {
                        container.classList.add('pm-dark-mode');
                        if (typeof getPremiumModal === 'function' && getPremiumModal()) getPremiumModal().classList.add('pm-dark-mode');
                        if (icon) icon.textContent = '🌙';
                        if (text) text.textContent = 'Dark Mode';
                    }
                    
                    toggleBtn.addEventListener('click', function() {
                        container.classList.toggle('pm-dark-mode');
                        if (typeof getPremiumModal === 'function' && getPremiumModal()) getPremiumModal().classList.toggle('pm-dark-mode');
                        const isDark = container.classList.contains('pm-dark-mode');
                        localStorage.setItem('pm-theme', isDark ? 'dark' : 'light');
                        if (icon) icon.textContent = isDark ? '🌙' : '☀️';
                        if (text) text.textContent = isDark ? 'Dark Mode' : 'Light Mode';
                    });
                }

                const btnRefreshHistory = document.getElementById('pm-btn-refresh-history');

                function fetchMutationHistory() {
                    if (!historyBody) return;
                    
                    FetchEngine.post('get_mutation_history')
                    .then(data => {
                            if (data.success) {
                                historyBody.textContent = '';
                                if (data.history.length === 0) {
                                    const emptyHtml = `
                                        <tr>
                                            <td colspan="6" style="padding: 0;">
                                                <div class="pm-empty-state" style="margin: 0; border: none; border-radius: 0; background: transparent;">
                                                    <div class="pm-empty-state-icon">&#128194;</div>
                                                    <div class="pm-empty-state-text">No Mutations Found</div>
                                                    <div class="pm-empty-state-subtext">The mutation tracking ledger is currently empty.</div>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                                    historyBody.innerHTML = emptyHtml; // nosec
                                    return;
                                }

                                data.history.forEach(job => {
                                    let badgeColor = 'var(--pm-success)'; // Green for SUCCESS
                                    if (job.state === 'ROLLED_BACK') badgeColor = 'var(--pm-primary)'; // Blue
                                    else if (job.state === 'CRASHED') badgeColor = 'var(--pm-danger)'; // Red
                                    else if (job.state === 'PROCESSING') badgeColor = 'var(--pm-warning)'; // Yellow
                                    
                                    // Store raw details securely in global memory map to avoid HTML escaping issues
                                    if (!window.pmHistoryMap) window.pmHistoryMap = new Map();
                                    window.pmHistoryMap.set(job.job_id, {
                                        actions: job.actions,
                                        raw_payload: job.raw_payload,
                                        revert_payload: job.revert_payload
                                    });

                                    const row = document.createElement('tr');
                                    row.style.borderBottom = '1px solid var(--pm-border-color)';
                                    const rowHtml = `
                                        <td style="padding: 0.75rem 1rem; font-family: monospace; font-weight: 500; color: var(--pm-text-primary);">${escapeHtml(job.job_id)}</td>
                                        <td style="padding: 0.75rem 1rem; color: var(--pm-text-secondary);">${escapeHtml(job.date)}</td>
                                        <td style="padding: 0.75rem 1rem; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--pm-text-primary);" title="${escapeHtml(job.actions)}">${escapeHtml(job.actions)}</td>
                                        <td style="padding: 0.75rem 1rem; text-align: center; font-weight: 700; color: var(--pm-text-primary);">${escapeHtml(job.affected_count)}</td>
                                        <td style="padding: 0.75rem 1rem; text-align: center;">
                                            <span style="display: inline-block; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 700; color: var(--pm-white); background-color: ${badgeColor}; text-transform: uppercase;">
                                                ${escapeHtml(job.state)}
                                            </span>
                                        </td>
                                        <td style="padding: 0.75rem 1rem; text-align: right; display: flex; gap: 0.35rem; justify-content: flex-end;">
                                            <button type="button" class="pm-btn pm-btn-download-job" data-job-id="${escapeHtml(job.job_id)}" style="font-size: 0.75rem; padding: 0.3rem 0.6rem; background-color: var(--pm-primary); box-shadow: none;" title="Download JSON Gzip Archive">
                                                &#11015;&#65039; Download .gz
                                            </button>
                                            <button type="button" class="pm-btn pm-btn-inspect-job" data-job-id="${escapeHtml(job.job_id)}" style="font-size: 0.75rem; padding: 0.3rem 0.6rem; background-color: var(--pm-neutral); box-shadow: none;">
                                                &#128269; Inspect
                                            </button>
                                            ${job.state === 'ROLLED_BACK' ? `
                                                <button type="button" class="pm-btn pm-btn-reapply-job" data-job-id="${escapeHtml(job.job_id)}" style="font-size: 0.75rem; padding: 0.3rem 0.6rem; background-color: var(--pm-success); box-shadow: 0 2px 4px rgba(16, 185, 129, 0.15);" title="Re-executes original mutation rules. A fresh safety baseline will be captured before execution.">
                                                    &#128260; Reapply
                                                </button>
                                            ` : job.has_revert ? `
                                                <button type="button" class="pm-btn pm-btn-revert-job" data-job-id="${escapeHtml(job.job_id)}" style="font-size: 0.75rem; padding: 0.3rem 0.6rem; background-color: var(--pm-danger); box-shadow: 0 2px 4px rgba(239, 68, 68, 0.15);">
                                                    &#9889; Revert
                                                </button>
                                            ` : `<span style="font-size: 0.75rem; color: var(--pm-text-secondary); font-style: italic; align-self: center;">N/A</span>`}
                                            <button type="button" class="pm-btn pm-btn-delete-job" data-job-id="${escapeHtml(job.job_id)}" style="font-size: 0.75rem; padding: 0.3rem 0.6rem; background-color: var(--pm-danger); box-shadow: none;" title="Delete Ledger Entry">
                                                &#128465;&#65039; Delete
                                            </button>
                                        </td>
                                    `;
                                    row.innerHTML = rowHtml; // nosec
                                    historyBody.appendChild(row);
                                });

                                // Bind click handler on Inspect buttons
                                historyBody.querySelectorAll('.pm-btn-inspect-job').forEach(btn => {
                                    btn.addEventListener('click', function() {
                                        const jobId = this.getAttribute('data-job-id');
                                        const details = window.pmHistoryMap.get(jobId);
                                        if (!details) return;

                                        let payloadText, revertText;
                                        try { payloadText = JSON.stringify(JSON.parse(details.raw_payload), null, 4); } 
                                        catch (e) { payloadText = details.raw_payload || 'No action scope recorded.'; }
                                        try { revertText = JSON.stringify(JSON.parse(details.revert_payload), null, 4); } 
                                        catch (e) { revertText = details.revert_payload || 'No baseline rollback snapshots recorded.'; }

                                        // Compile and inject dynamic SQL reconstruction preview
                                        const reconstructed = pmReconstructSQL(details);

                                        let modalBody = `
                                            <div style="font-size: 0.9rem; color: var(--pm-text-secondary); line-height: 1.5; margin-bottom: 1.25rem;">
                                                Analyze the target filters (Visual AST Payload), actions, and captured baseline snapshots for a complete audit trail.
                                            </div>

                                            <!-- Inspect Modal Inner Sub-tabs -->
                                            <div class="pm-sub-tabs" style="margin-bottom: 1.25rem;">
                                                <button type="button" class="pm-sub-tab-btn active" id="pm-btn-inspect-tab-json" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="document.getElementById('pm-btn-inspect-tab-json').classList.add('active'); document.getElementById('pm-btn-inspect-tab-sql').classList.remove('active'); document.getElementById('pm-inspect-content-json').style.display='flex'; document.getElementById('pm-inspect-content-sql').style.display='none';">📋 JSON Payloads</button>
                                                <button type="button" class="pm-sub-tab-btn" id="pm-btn-inspect-tab-sql" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="document.getElementById('pm-btn-inspect-tab-sql').classList.add('active'); document.getElementById('pm-btn-inspect-tab-json').classList.remove('active'); document.getElementById('pm-inspect-content-sql').style.display='flex'; document.getElementById('pm-inspect-content-json').style.display='none';">🌐 SQL Code Preview</button>
                                            </div>
                                            
                                            <!-- JSON Payloads Container -->
                                            <div id="pm-inspect-content-json" style="display: flex; flex-direction: column; gap: 1.25rem; margin-bottom: 1.5rem;">
                                                <div>
                                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                                        <span class="pm-subtitle" style="font-weight: 600;">&#9889; Mutation Action Rules & Scope</span>
                                                        <button type="button" style="background: none; border: none; cursor: pointer; color: var(--pm-text-secondary); font-size: 1.1rem; padding: 0; transition: transform 0.2s;" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText).then(() => showPremiumToast('Copied to clipboard!')); this.style.transform = 'scale(1.2)'; setTimeout(() => this.style.transform = 'scale(1)', 200);" title="Copy Snippet">&#128203;</button>
                                                    </div>
                                                    <pre class="pm-log-terminal" style="max-height: 160px; font-size: 0.8rem; overflow-y: auto; margin: 0;">${escapeHtml(payloadText)}</pre>
                                                </div>
                                                <div>
                                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                                        <span class="pm-subtitle" style="font-weight: 600;">&#128302; Captured Baseline Revert States (Original Database Cell Margins)</span>
                                                        <button type="button" style="background: none; border: none; cursor: pointer; color: var(--pm-text-secondary); font-size: 1.1rem; padding: 0; transition: transform 0.2s;" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText).then(() => showPremiumToast('Copied to clipboard!')); this.style.transform = 'scale(1.2)'; setTimeout(() => this.style.transform = 'scale(1)', 200);" title="Copy Snippet">&#128203;</button>
                                                    </div>
                                                    <pre class="pm-log-terminal" style="max-height: 250px; font-size: 0.8rem; overflow-y: auto; margin: 0;">${escapeHtml(revertText)}</pre>
                                                </div>
                                            </div>

                                            <!-- SQL Code Preview Container -->
                                            <div id="pm-inspect-content-sql" style="display: none; flex-direction: column; gap: 1.25rem; margin-bottom: 1.5rem;">
                                                <div>
                                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                                        <span class="pm-subtitle" style="font-weight: 600; color: var(--pm-warning);">&#9889; Executed Mutation SQL Statements</span>
                                                        <button type="button" style="background: none; border: none; cursor: pointer; color: var(--pm-text-secondary); font-size: 1.1rem; padding: 0; transition: transform 0.2s;" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText).then(() => showPremiumToast('Copied to clipboard!')); this.style.transform = 'scale(1.2)'; setTimeout(() => this.style.transform = 'scale(1)', 200);" title="Copy Snippet">&#128203;</button>
                                                    </div>
                                                    <pre class="pm-log-terminal" style="max-height: 200px; font-size: 0.8rem; overflow-y: auto; margin: 0; color: var(--pm-primary-light); border-color: rgba(var(--pm-primary-rgb), 0.2); background: var(--pm-terminal-bg);">${escapeHtml(reconstructed.mutationSql)}</pre>
                                                </div>
                                                <div>
                                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                                        <span class="pm-subtitle" style="font-weight: 600; color: var(--pm-danger);">&#128302; Projected Rollback Reversion SQL Statements</span>
                                                        <button type="button" style="background: none; border: none; cursor: pointer; color: var(--pm-text-secondary); font-size: 1.1rem; padding: 0; transition: transform 0.2s;" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText).then(() => showPremiumToast('Copied to clipboard!')); this.style.transform = 'scale(1.2)'; setTimeout(() => this.style.transform = 'scale(1)', 200);" title="Copy Snippet">&#128203;</button>
                                                    </div>
                                                    <pre class="pm-log-terminal" style="max-height: 250px; font-size: 0.8rem; overflow-y: auto; margin: 0; color: var(--pm-primary-light); border-color: rgba(var(--pm-danger-rgb), 0.2); background: var(--pm-terminal-bg);">${escapeHtml(reconstructed.revertSql)}</pre>
                                                </div>
                                            </div>
                                        `;
                                        showPremiumConfirmModal('&#128269; Inspect Mutation Details & Baseline', modalBody, null, null);
                                    });
                                });

                                // Bind click handler on Revert buttons
                                historyBody.querySelectorAll('.pm-btn-revert-job').forEach(btn => {
                                    btn.addEventListener('click', function() {
                                        const jobId = this.getAttribute('data-job-id');
                                        
                                        showPremiumConfirmModal(
                                            'Double-Key Revert Verification',
                                            `You are about to revert all database changes made by job <strong>${escapeHtml(jobId)}</strong>.<br><br>This will safely restore the original baseline catalog values recorded during the transaction's pre-flight compilation block.<br><br>To proceed, please type <strong style="color: var(--pm-danger);">REVERT</strong> below:`,
                                            'REVERT',
                                            () => {
                                                btn.disabled = true;
                                                btn.textContent = 'Reverting...';
                                                showPremiumToast('Rollback sequence initiated. Processing transactional reverse-sync...');

                                                FetchEngine.post('rollback_mutation', { job_id: jobId })
                                                    .then(result => {
                                                        showPremiumAlert('Rollback Successful', `Successfully reverted all catalog mutations for job <strong>${escapeHtml(jobId)}</strong>. baseline values restored!`);
                                                        showPremiumToast('Transaction rollback complete.');
                                                        fetchMutationHistory();
                                                        
                                                        const generalTerminal = document.getElementById('pm-log-terminal');
                                                        if (generalTerminal && result.log_content) {
                                                            generalTerminal.textContent = result.log_content;
                                                        }
                                                    })
                                                    .catch(err => {
                                                        btn.disabled = false;
                                                        btn.textContent = '⚡ Revert';
                                                        showPremiumAlert('Rollback Failed', err.message || 'The rollback sequence failed.', 'error');
                                                    });
                                            }
                                        );
                                    });
                                });

                                // Bind click handler on Reapply buttons
                                historyBody.querySelectorAll('.pm-btn-reapply-job').forEach(btn => {
                                    btn.addEventListener('click', function() {
                                        const jobId = this.getAttribute('data-job-id');
                                        
                                        showPremiumConfirmModal(
                                            'Reapply Mutation Rules',
                                            `Are you sure you want to re-execute the original mutation rules for job <strong>${escapeHtml(jobId)}</strong>?<br><br><span style="color: var(--pm-warning);">&#9888;&#65039; A fresh safety baseline snapshot will be automatically captured based on the database's <strong>current</strong> values before execution.</span><br><br>To proceed, please type <strong style="color: var(--pm-success);">REAPPLY</strong> below:`,
                                            'REAPPLY',
                                            () => {
                                                btn.disabled = true;
                                                btn.textContent = 'Reapplying...';
                                                showPremiumToast('Reapply sequence initiated. Capturing fresh baseline and applying rules...');

                                                FetchEngine.post('reapply_mutation', { job_id: jobId })
                                                    .then(result => {
                                                        showPremiumAlert('Reapply Successful', `Successfully reapplied mutation rules for job <strong>${escapeHtml(jobId)}</strong> and updated safety baseline.`);
                                                        showPremiumToast('Mutation successfully reapplied.');
                                                        fetchMutationHistory();
                                                        
                                                        const generalTerminal = document.getElementById('pm-log-terminal');
                                                        if (generalTerminal && result.log_content) {
                                                            generalTerminal.textContent = result.log_content;
                                                        }
                                                    })
                                                    .catch(err => {
                                                        btn.disabled = false;
                                                        btn.textContent = '🔄 Reapply';
                                                        showPremiumAlert('Reapply Failed', err.message || 'The reapply sequence failed.', 'error');
                                                    });
                                            }
                                        );
                                    });
                                });

                                // Bind click handler on Download buttons
                                historyBody.querySelectorAll('.pm-btn-download-job').forEach(btn => {
                                    btn.addEventListener('click', function() {
                                        const jobId = this.getAttribute('data-job-id');
                                        window.location.href = window.location.href + '&ajax=1&action=download_mutation_gzip&job_id=' + encodeURIComponent(jobId);
                                    });
                                });

                                // Bind click handler on Delete buttons
                                historyBody.querySelectorAll('.pm-btn-delete-job').forEach(btn => {
                                    btn.addEventListener('click', function() {
                                        const jobId = this.getAttribute('data-job-id');
                                        showPremiumConfirmModal(
                                            'Delete Ledger Entry',
                                            `Are you sure you want to permanently delete the mutation ledger entry for <strong>${escapeHtml(jobId)}</strong>?<br><br>This will permanently erase its JSON payloads from the server.`,
                                            'DELETE',
                                            () => {
                                                const row = btn.closest('tr');
                                                if (row) row.style.opacity = '0.5';
                                                FetchEngine.post('delete_mutation_job', { job_id: jobId })
                                                    .then(result => {
                                                        showPremiumToast(`Deleted ledger entry for ${escapeHtml(jobId)}`);
                                                        fetchMutationHistory();
                                                    })
                                                    .catch(err => {
                                                        if (row) row.style.opacity = '1';
                                                        showPremiumAlert('Error Deleting', err.message || 'Failed to delete ledger entry.');
                                                    });
                                            }
                                        );
                                    });
                                });
                            }
                        })
                        .catch(err => {
                            console.error('Failed fetching mutation log history:', err);
                        });
                }

                if (btnRefreshHistory) {
                    btnRefreshHistory.addEventListener('click', fetchMutationHistory);
                }

                // Call on tab changes
                const tabHistory = document.getElementById('pm-tab-history');
                if (tabHistory) {
                    tabHistory.addEventListener('change', function() {
                        if (this.checked) fetchMutationHistory();
                    });
                }
                
                // Accordion switching logic [TX-207] Refactored for smooth grid transitions
                const accordionHeaders = document.querySelectorAll('.pm-accordion-header');
                accordionHeaders.forEach(header => {
                    header.addEventListener('click', function() {
                        const contentWrapper = header.nextElementSibling;
                        const icon = header.querySelector('.pm-accordion-icon');
                        const isVisible = contentWrapper.classList.contains('is-open');
                        
                        // Close all accordions in the same card
                        const parent = header.closest('.pm-card');
                        parent.querySelectorAll('.pm-accordion-content-wrapper').forEach(c => c.classList.remove('is-open'));
                        parent.querySelectorAll('.pm-accordion-icon').forEach(i => i.textContent = '▼');
                        
                        if (!isVisible) {
                            contentWrapper.classList.add('is-open');
                            icon.textContent = '▲';
                        }
                    });
                });



                // N. Admin Purge Controls (Clear History and Clear Backups)
                const btnClearHistory = document.getElementById('pm-btn-clear-history');
                if (btnClearHistory) {
                    btnClearHistory.addEventListener('click', function() {
                        if (!window.pmHistoryMap || window.pmHistoryMap.size === 0) {
                            showPremiumAlert('Nothing to Clear', 'There is nothing to clear. The mutation history log is already empty.', 'info');
                            return;
                        }
                        showPremiumConfirmModal(
                            'Clear Mutation History',
                            'You are about to permanently purge the entire mutation history log tracking database table. This action cannot be undone.<br><br>To proceed, please type <strong style="color: var(--pm-danger);">CLEAR</strong> below:',
                            'CLEAR',
                            () => {
                                FetchEngine.post('clear_mutation_history')
                                .then(data => {
                                        if (data.success) {
                                            showPremiumToast('Mutation history cleared successfully.');
                                            window.pmHistoryMap = new Map();
                                            fetchMutationHistory();
                                        } else {
                                            showPremiumAlert('Failed to Clear', data.error || 'Unknown error', 'error');
                                        }
                                    })
                                    .catch(err => showPremiumAlert('Connection Error', err, 'error'));
                            }
                        );
                    });
                }

                // O. Event Logs Tab Controls
                const btnClearLogs = document.getElementById('pm-btn-clear-logs');
                if (btnClearLogs) {
                    btnClearLogs.addEventListener('click', function() {
                        showPremiumConfirmModal(
                            'Clear Event Logs',
                            'Are you sure you want to permanently clear the staging event logging console?<br><br>To proceed, please type <strong style="color: var(--pm-danger);">CLEAR</strong> below:',
                            'CLEAR',
                            () => {
                                FetchEngine.post('clear_logs')
                                .then(data => {
                                    if (data.success) {
                                        showPremiumToast('Event logs cleared successfully.');
                                        const term = document.getElementById('pm-log-terminal');
                                        if (term) term.textContent = 'No event logs compiled yet.';
                                    } else {
                                        showPremiumAlert('Failed to Clear Logs', data.error || 'Unknown error', 'error');
                                    }
                                })
                                .catch(err => showPremiumAlert('Connection Error', err, 'error'));
                            }
                        );
                    });
                }

                const btnDownloadLogs = document.getElementById('pm-btn-download-logs');
                if (btnDownloadLogs) {
                    btnDownloadLogs.addEventListener('click', function() {
                        window.location.href = window.location.href + '&ajax=1&action=download_logs';
                    });
                }

                // Global Copy to Clipboard delegated listener
                document.addEventListener('click', function(e) {
                    const trigger = e.target.closest('.pm-copy-trigger');
                    if (trigger) {
                        const text = trigger.getAttribute('data-copy');
                        if (text) {
                            navigator.clipboard.writeText(text).then(() => {
                                if (typeof showPremiumToast === 'function') {
                                    showPremiumToast('Copied to clipboard!');
                                }
                            }).catch(err => {
                                console.error('Clipboard copy failed:', err);
                            });
                        }
                    }
                });

                // Fetch history initially in background
                // Initialize listeners


        // Expose fetchMutationHistory to the IIFE scope
        window._pmFetchMutationHistory = fetchMutationHistory;
    }
    
    // --- Public API ---
    return {
        initialize: function() {
            bindEvents();
            if (typeof window._pmFetchMutationHistory === 'function') {
                window._pmFetchMutationHistory();
            }
        },
        refresh: function() {
            if (typeof window._pmFetchMutationHistory === 'function') {
                window._pmFetchMutationHistory();
            }
        }
    };
})();

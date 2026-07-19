/**
 * Project Mass - Preset & Tab State Engine
 * Handles AST template loading/saving and global UI memory persistence.
 */
const PresetEngine = (function() {

    // --- Private Engine Logic ---
    function pmInitializePresets() {
        const presets = window.PM_CONFIG.presets || {};

        function savePreset(name, type, payload) {
            FetchEngine.post('save_preset', { name: name, preset_type: type, payload: JSON.stringify(payload) })
            .then(data => {
                showPremiumToast('Preset saved successfully!', 'success');
                // Dynamically inject into DOM without reloading
                const selectId = 'pm-preset-' + type;
                const select = document.getElementById(selectId);
                if (select) {
                    const opt = document.createElement('option');
                    opt.value = data.id_preset;
                    opt.textContent = name;
                    opt.dataset.payload = typeof payload === 'string' ? payload : JSON.stringify(payload);
                    select.appendChild(opt);
                    select.value = data.id_preset;
                    select.dispatchEvent(new Event('change'));
                }
            });
        }

        function deletePreset(id, type, selectId) {
            showPremiumConfirmModal('Delete Preset', 'Are you sure you want to permanently delete this preset?', 'DELETE', () => {
                FetchEngine.post('delete_preset', { id_preset: id })
                .then(data => {
                    showPremiumToast('Preset deleted!', 'success');
                    // Remove from DOM dynamically
                    const select = document.getElementById(selectId);
                    if (select) {
                        const opt = select.querySelector(`option[value="${id}"]`);
                        if (opt) opt.remove();
                        select.value = '';
                        select.dispatchEvent(new Event('change'));
                    }
                });
            });
        }

        function populateDropdown(selectId, type) {
            const select = document.getElementById(selectId);
            const delBtn = document.getElementById('pm-btn-delete-preset-' + type);
            if (!select) return;
            
            if (presets[type]) {
                presets[type].forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id_preset;
                    opt.textContent = p.name;
                    opt.dataset.payload = typeof p.payload === 'string' ? p.payload : JSON.stringify(p.payload);
                    select.appendChild(opt);
                });
            }

            select.addEventListener('change', () => {
                if (delBtn) delBtn.disabled = !select.value;
            });

            if (delBtn) {
                delBtn.addEventListener('click', () => {
                    if (select.value) deletePreset(select.value, type, selectId);
                });
            }
        }

        function getActiveRootGroup() {
            const qbRoot = document.getElementById('pm-query-builder-root');
            return qbRoot ? qbRoot.querySelector('.pm-query-group') : null;
        }

        // 1. BACKUP PRESETS
        populateDropdown('pm-preset-backup', 'backup');
        document.getElementById('pm-btn-save-preset-backup')?.addEventListener('click', () => {
            const allCheckboxes = document.querySelectorAll('.pm-table-checkbox');
            const checkedCheckboxes = document.querySelectorAll('.pm-table-checkbox:checked');
            
            let tables = Array.from(checkedCheckboxes).map(cb => cb.value);
            if (tables.length === 0) return showPremiumAlert('Error', 'No tables selected!');
            
            // If every single table is selected, save as a dynamic "__ALL__" preset
            if (tables.length === allCheckboxes.length) {
                tables = ['__ALL__'];
            }
            
            showPremiumPromptModal('Save Backup Preset', 'Enter a name for your table loadout preset:', 'E.g., Catalog Only Core', (name) => {
                if (name) savePreset(name, 'backup', tables);
            });
        });
        document.getElementById('pm-preset-backup')?.addEventListener('change', function(e) {
            const warningDiv = document.getElementById('pm-preset-backup-warning');
            if (warningDiv) {
                warningDiv.style.display = 'none';
                const warningTextEl = warningDiv.querySelector('.pm-warning-text');
                if (warningTextEl) warningTextEl.textContent = '';
            }

            if (!this.value) {
                if (e.isTrusted) {
                    document.querySelectorAll('.pm-table-checkbox').forEach(cb => {
                        cb.checked = false;
                        cb.dispatchEvent(new Event('change', { bubbles: true }));
                    });
                    showPremiumToast('Tables deselected', 'info');
                }
                return;
            }
            
            let tables = [];
            try {
                let payloadData = this.options[this.selectedIndex].dataset.payload;
                tables = JSON.parse(payloadData);
                // Hotfix: If the preset was saved during the double-stringification bug, it will be a string array. We must double-parse it.
                if (typeof tables === 'string') {
                    tables = JSON.parse(tables);
                }
            } catch(err) {
                console.error("MassUtility: Failed to parse backup preset payload", err);
            }
            
            if (!Array.isArray(tables)) tables = [];

            document.querySelectorAll('.pm-table-checkbox').forEach(cb => {
                cb.checked = false;
                cb.dispatchEvent(new Event('change', { bubbles: true }));
            });

            if (tables.includes('__ALL__')) {
                // Dynamic restore of all current tables
                document.querySelectorAll('.pm-table-checkbox').forEach(cb => {
                    cb.checked = true;
                    cb.dispatchEvent(new Event('change', { bubbles: true }));
                });
            } else {
                tables.forEach(t => {
                    // Ensure we escape quotes if any, though tables shouldn't have them
                    const escapedTable = t.replace(/"/g, '\\"');
                    const cb = document.querySelector(`.pm-table-checkbox[value="${escapedTable}"]`);
                    if (cb) {
                        cb.checked = true;
                        cb.dispatchEvent(new Event('change', { bubbles: true }));
                    } else {
                        console.warn(`MassUtility: Preset tried to load table ${t} but it was not found in the DOM.`);
                    }
                });

                // Compute preset drift
                const allDomainCbs = document.querySelectorAll('.pm-table-checkbox[data-domain="catalog"], .pm-table-checkbox[data-domain="stock_attributes"], .pm-table-checkbox[data-domain="pricing_taxes"]');
                const allDomainValues = Array.from(allDomainCbs).map(cb => cb.value);
                const missingTablesInPreset = allDomainValues.filter(v => !tables.includes(v));
                const nonexistentTables = tables.filter(t => !document.querySelector(`.pm-table-checkbox[value="${t.replace(/"/g, '\\"')}"]`));

                if (warningDiv && (missingTablesInPreset.length > 0 || nonexistentTables.length > 0)) {
                    const warningTextEl = warningDiv.querySelector('.pm-warning-text');
                    let warningMsg = '';
                    if (missingTablesInPreset.length > 0) {
                        warningMsg += `Preset Drift: This preset is missing ${missingTablesInPreset.length} catalog tables (e.g. ${missingTablesInPreset.slice(0, 3).join(', ')}${missingTablesInPreset.length > 3 ? '...' : ''}). `;
                    }
                    if (nonexistentTables.length > 0) {
                        warningMsg += `Outdated tables: ${nonexistentTables.length} tables in this preset do not exist on this site (e.g. ${nonexistentTables.slice(0, 3).join(', ')}${nonexistentTables.length > 3 ? '...' : ''}).`;
                    }
                    if (warningTextEl && warningMsg !== '') {
                        warningTextEl.textContent = warningMsg;
                        warningDiv.style.display = 'flex';
                    }
                }
            }
            showPremiumToast('Backup table preset loaded', 'success');
        });

        // 2. QUERY PRESETS
        populateDropdown('pm-preset-query', 'query');
        document.getElementById('pm-btn-save-preset-query')?.addEventListener('click', () => {
            const rGroup = getActiveRootGroup();
            if (!rGroup) return showPremiumAlert('Error', 'Builder not ready');
            const ast = serializeGroup(rGroup);
            showPremiumPromptModal('Save Query Preset', 'Enter a name for this AST filter configuration:', 'E.g., Out of stock laptops', (name) => {
                if (name) savePreset(name, 'query', ast);
            });
        });

        // 3. MUTATE PRESETS
        populateDropdown('pm-preset-mutate', 'mutate');
        document.getElementById('pm-btn-save-preset-mutate')?.addEventListener('click', () => {
            const actions = [];
            document.querySelectorAll('.pm-mutation-rule').forEach(el => {
                actions.push({
                    field: el.querySelector('.pm-mutation-field').value,
                    type: el.querySelector('.pm-mutation-type').value,
                    value: el.querySelector('.pm-mutation-value').value.trim()
                });
            });
            if (actions.length === 0) return showPremiumAlert('Error', 'No mutation actions added!');
            showPremiumPromptModal('Save Mutate Preset', 'Enter a name for these action rules:', 'E.g., Set Price to 0', (name) => {
                if (name) savePreset(name, 'mutate', actions);
            });
        });

        // 4. MASTER COMBO PRESETS
        populateDropdown('pm-preset-master', 'master');
        document.getElementById('pm-btn-save-preset-master')?.addEventListener('click', () => {
            const rGroup = getActiveRootGroup();
            if (!rGroup) return showPremiumAlert('Error', 'Builder not ready');
            const ast = serializeGroup(rGroup);
            const actions = [];
            document.querySelectorAll('.pm-mutation-rule').forEach(el => {
                actions.push({
                    field: el.querySelector('.pm-mutation-field').value,
                    type: el.querySelector('.pm-mutation-type').value,
                    value: el.querySelector('.pm-mutation-value').value.trim()
                });
            });
            if (actions.length === 0) return showPremiumAlert('Error', 'No mutation actions added!');
            showPremiumPromptModal('Save Master Preset', 'Enter a name for this combined Query & Mutate template:', 'E.g., Global Black Friday Discount', (name) => {
                if (name) savePreset(name, 'master', { query: ast, mutate: actions });
            });
        });

        // Recursive builder for AST
        function buildASTDOM(groupData, groupNode) {
            if (!groupData) return;
            if (groupData.logical_operator) {
                groupNode.querySelector('.pm-group-operator').value = groupData.logical_operator;
            }
            if (groupData.rules) {
                groupData.rules.forEach(rule => {
                    const addRuleBtn = groupNode.querySelector(':scope > .pm-query-group-header .pm-btn-add-rule') || groupNode.querySelector('.pm-btn-add-rule');
                    if (addRuleBtn) addRuleBtn.click();
                    const newRule = groupNode.querySelector(':scope > .pm-query-rules-container').lastElementChild;
                    if (newRule && newRule.classList.contains('pm-query-rule')) {
                        newRule.querySelector('.pm-rule-field').value = rule.field;
                        newRule.querySelector('.pm-rule-field').dispatchEvent(new Event('change'));
                        newRule.querySelector('.pm-rule-operator').value = rule.operator;
                        newRule.querySelector('.pm-rule-value').value = rule.value;
                    }
                });
            }
            if (groupData.groups) {
                groupData.groups.forEach(subG => {
                    const addGroupBtn = groupNode.querySelector(':scope > .pm-query-group-header .pm-btn-add-group') || groupNode.querySelector('.pm-btn-add-group');
                    if (addGroupBtn) addGroupBtn.click();
                    const newSubGroup = groupNode.querySelector(':scope > .pm-query-subgroups-container').lastElementChild;
                    if (newSubGroup) buildASTDOM(subG, newSubGroup);
                });
            }
        }

        // Handlers for loading query / mutate
        function loadQuery(ast) {
            const rGroup = getActiveRootGroup();
            if (!rGroup) return;
            const rulesC = rGroup.querySelector(':scope > .pm-query-rules-container');
            const groupsC = rGroup.querySelector(':scope > .pm-query-subgroups-container');
            if (rulesC) rulesC.textContent = '';
            if (groupsC) groupsC.textContent = '';
            buildASTDOM(ast, rGroup);
        }

        function loadMutate(actions) {
            const container = document.getElementById('pm-mutation-rules-container');
            if (container) container.textContent = '';
            if (!actions || !Array.isArray(actions)) return;
            const addBtn = document.getElementById('pm-btn-add-mutation'); // fixed button ID
            actions.forEach(act => {
                if (addBtn) addBtn.click();
                const newRule = container.lastElementChild;
                if (newRule) {
                    const fieldSel = newRule.querySelector('.pm-mutation-field');
                    fieldSel.value = act.field;
                    fieldSel.dispatchEvent(new Event('change'));
                    
                    newRule.querySelector('.pm-mutation-type').value = act.type;
                    const valInput = newRule.querySelector('.pm-mutation-value');
                    if (valInput) {
                        valInput.value = act.value;
                    }
                }
            });
        }

        // --- PRESET UX OVERHAUL: STATELESS TEMPLATE INJECTION ---
        
        window.pmIsHydratingPreset = false;

        const resetDropdown = (id) => {
            const drop = document.getElementById(id);
            if (drop && drop.value !== '') {
                drop.value = '';
                drop.dispatchEvent(new Event('change'));
            }
        };

        const markPresetsDirty = () => {
            if (window.pmIsHydratingPreset) return;
            ['pm-preset-query', 'pm-preset-mutate', 'pm-preset-master'].forEach(resetDropdown);
        };

        // Mark dirty when user manually interacts with the builders
        document.getElementById('pm-query-builder-root')?.addEventListener('change', markPresetsDirty);
        document.getElementById('pm-query-builder-root')?.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) markPresetsDirty();
        });
        document.getElementById('pm-mutation-rules-container')?.addEventListener('change', markPresetsDirty);
        document.getElementById('pm-mutation-rules-container')?.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) markPresetsDirty();
        });
        document.getElementById('pm-btn-add-mutation')?.addEventListener('click', markPresetsDirty);

        document.getElementById('pm-preset-query')?.addEventListener('change', function(e) {
            if (!this.value || !e.isTrusted) return; // e.isTrusted ensures programmatic resets don't trigger loading
            let payload = JSON.parse(this.options[this.selectedIndex].dataset.payload);
            if (typeof payload === 'string') {
                try { payload = JSON.parse(payload); } catch(err) {}
            }
            
            window.pmIsHydratingPreset = true;
            try {
                loadQuery(payload);
                setTimeout(() => {
                    const btnCompile = document.getElementById('pm-btn-preview-query');
                    if (btnCompile) btnCompile.click();
                }, 100); // Slight delay to ensure DOM is fully painted
            } finally {
                window.pmIsHydratingPreset = false;
            }
            
            resetDropdown('pm-preset-master'); // Desync master since we just overwrote its query half
            showPremiumToast('Query template injected. Builder remains editable.', 'success');
        });
        
        document.getElementById('pm-preset-mutate')?.addEventListener('change', function(e) {
            if (!this.value || !e.isTrusted) return;
            let payload = JSON.parse(this.options[this.selectedIndex].dataset.payload);
            if (typeof payload === 'string') {
                try { payload = JSON.parse(payload); } catch(err) {}
            }
            
            window.pmIsHydratingPreset = true;
            try {
                loadMutate(payload);
                const step2 = document.getElementById('pm-wizard-step-2');
                if (step2 && payload && payload.length > 0) step2.style.display = 'block';
            } finally {
                window.pmIsHydratingPreset = false;
            }
            
            resetDropdown('pm-preset-master'); // Desync master since we just overwrote its mutate half
            showPremiumToast('Action Rules template injected. Builder remains editable.', 'success');
        });

        document.getElementById('pm-preset-master')?.addEventListener('change', function(e) {
            if (!this.value || !e.isTrusted) return;
            let payload = JSON.parse(this.options[this.selectedIndex].dataset.payload);
            if (typeof payload === 'string') {
                try { payload = JSON.parse(payload); } catch(err) {}
            }
            
            window.pmIsHydratingPreset = true;
            try {
                loadQuery(payload.query);
                loadMutate(payload.mutate);
                setTimeout(() => {
                    const btnCompile = document.getElementById('pm-btn-preview-query');
                    if (btnCompile) btnCompile.click();
                }, 100);
            } finally {
                window.pmIsHydratingPreset = false;
            }
            
            resetDropdown('pm-preset-query');
            resetDropdown('pm-preset-mutate');
            showPremiumToast('Master Combo template injected. Builders remain editable.', 'success');
        });
    }

    // --- Tab Persistence Initialization ---
    function bindTabPersistence() {
        const tabInterval = setInterval(() => {
            const tabRadios = document.querySelectorAll('input[name="pm-tab-group"]');
            if (tabRadios.length > 0) {
                clearInterval(tabInterval);
                const savedTab = sessionStorage.getItem('pm_active_tab');
                if (savedTab) {
                    const targetTab = document.getElementById(savedTab);
                    if (targetTab) targetTab.checked = true;
                }
                tabRadios.forEach(radio => {
                    radio.addEventListener('change', function() {
                        if (this.checked) sessionStorage.setItem('pm_active_tab', this.id);
                    });
                });
            }
        }, 100);
    }

    // --- Public API ---
    return {
        initialize: function() {
            pmInitializePresets();
            bindTabPersistence();
        }
    };
})();

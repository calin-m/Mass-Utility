/**
 * Project Mass - AST Builder Engine
 * Handles the visual query builder, JSON payload generation, human-readable translations,
 * and the recursive chunked execution loop.
 */
const AstEngine = (function() {

    function bindEvents() {
        // F. Query Builder visual rendering and AJAX preview logic
                const builderRoot = document.getElementById('pm-query-builder-root');
                const btnPreviewQuery = document.getElementById('pm-btn-preview-query');

                function createRuleNode() {
                    const div = document.createElement('div');
                    div.className = 'pm-query-rule';
                    const ruleHtml = `
                        <select class="pm-query-select pm-rule-field">
                            <option value="product.active">Product: Active Status</option>
                            <option value="product.reference">Product: Reference / SKU</option>
                            <option value="product.price">Product: Base Price</option>
                            <option value="product.final_price">Product: Discounted Price</option>
                            <option value="product.has_discount">Product: Has Active Discount</option>
                            <option value="product.name">Product: Name</option>
                            <option value="category.id">Category: ID</option>
                            <option value="manufacturer.id">Manufacturer: ID</option>
                            <option value="product.id_manufacturer">Product: Manufacturer ID</option>
                            <option value="employee.id_profile">Employee: Profile (User Type)</option>
                            <option value="discount.reduction_percent">Discount: Reduction Percentage (%)</option>
                            <option value="discount.reduction_amount">Discount: Flat Amount Reduction</option>
                        </select>
                        <select class="pm-query-select pm-rule-operator">
                            <option value="EQUAL">Equals</option>
                            <option value="NOT_EQUAL">Not Equals</option>
                            <option value="GREATER_THAN">Greater Than</option>
                            <option value="LESS_THAN">Less Than</option>
                            <option value="LIKE">Contains (Like)</option>
                            <option value="IN">In List (Comma separated)</option>
                            <option value="NOT_IN">Not In List (Comma separated)</option>
                        </select>
                        <span class="pm-rule-value-container"></span>
                        <button type="button" class="pm-btn pm-btn-delete-rule" style="background-color: #ef4444; padding: 0.35rem 0.6rem; font-size: 0.75rem; box-shadow: none;">&#128465;&#65039;</button>
                    `;
                    div.innerHTML = ruleHtml; // nosec
                    
                    const fieldSelect = div.querySelector('.pm-rule-field');
                    const opSelect = div.querySelector('.pm-rule-operator');
                    const valueContainer = div.querySelector('.pm-rule-value-container');
                    let forceManualMode = false; // Persistent user mode toggle

                    function updateValueInput() {
                        const field = fieldSelect.value;
                        const op = opSelect.value;
                        valueContainer.innerHTML = ''; // nosec
                        
                        // IN and NOT_IN operators strictly require manual comma-separated text lists
                        const isListOp = (op === 'IN' || op === 'NOT_IN');
                        
                        // Build options list for selection fields
                        let selectOptions = null;
                        if (field === 'product.active') {
                            selectOptions = [
                                { value: '1', label: 'Active' },
                                { value: '0', label: 'Inactive' }
                            ];
                        } else if (field === 'product.has_discount') {
                            selectOptions = [
                                { value: '1', label: 'Has Active Discount' },
                                { value: '0', label: 'No Discount' }
                            ];
                        } else if (field === 'category.id' && window.pmCategories && window.pmCategories.length > 0) {
                            selectOptions = window.pmCategories.map(c => ({ value: c.id, label: `[${c.id}] ${c.name}` }));
                        } else if ((field === 'manufacturer.id' || field === 'product.id_manufacturer') && window.pmManufacturers && window.pmManufacturers.length > 0) {
                            selectOptions = window.pmManufacturers.map(m => ({ value: m.id, label: `[${m.id}] ${m.name}` }));
                        } else if (field === 'employee.id_profile' && window.pmProfiles && window.pmProfiles.length > 0) {
                            selectOptions = window.pmProfiles.map(p => ({ value: p.id, label: `[${p.id}] ${p.name}` }));
                        }

                        if (selectOptions && !isListOp && !forceManualMode) {
                            // Selection Dropdown Mode
                            const selectEl = document.createElement('select');
                            selectEl.className = 'pm-query-select pm-rule-value';
                            selectEl.style.minWidth = '180px';
                            selectOptions.forEach(opt => {
                                const option = document.createElement('option');
                                option.value = opt.value;
                                option.textContent = opt.label;
                                selectEl.appendChild(option);
                            });

                            const modeToggle = document.createElement('button');
                            modeToggle.type = 'button';
                            modeToggle.className = 'pm-btn-toggle-mode';
                            modeToggle.title = 'Switch to manual type-in mode';
                            modeToggle.innerHTML = '📝'; // nosec
                            modeToggle.addEventListener('click', function() {
                                forceManualMode = true;
                                updateValueInput();
                            });

                            valueContainer.appendChild(selectEl);
                            valueContainer.appendChild(modeToggle);
                        } else {
                            // Manual Input Mode
                            const inputEl = document.createElement('input');
                            inputEl.type = 'text';
                            inputEl.className = 'pm-query-input pm-rule-value';
                            inputEl.placeholder = isListOp ? 'Enter values (comma separated)...' : 'Enter value...';
                            inputEl.style.minWidth = '180px';

                            const modeToggle = document.createElement('button');
                            modeToggle.type = 'button';
                            modeToggle.className = 'pm-btn-toggle-mode';
                            modeToggle.title = 'Switch to selection dropdown mode';
                            modeToggle.innerHTML = '📋'; // nosec
                            modeToggle.addEventListener('click', function() {
                                forceManualMode = false;
                                updateValueInput();
                            });

                            valueContainer.appendChild(inputEl);
                            if (selectOptions && !isListOp) {
                                valueContainer.appendChild(modeToggle);
                            }
                        }
                    }
                    
                    fieldSelect.addEventListener('change', function() {
                        forceManualMode = false; // Reset toggle status on field changes
                        updateValueInput();
                    });
                    opSelect.addEventListener('change', updateValueInput);
                    updateValueInput(); // Initial trigger

                    div.querySelector('.pm-btn-delete-rule').addEventListener('click', function() {
                        div.remove();
                    });
                    return div;
                }

                function createGroupNode(isRoot = false) {
                    const div = document.createElement('div');
                    div.className = 'pm-query-group';
                    
                    const groupHtml = `
                        <div class="pm-query-group-header">
                            <div style="display: flex; align-items: center; gap: 0.4rem;">
                                <select class="pm-query-select pm-group-operator" style="font-weight: 700;">
                                    <option value="AND">AND (All match)</option>
                                    <option value="OR">OR (Any match)</option>
                                    <option value="NAND">NAND (Not all match)</option>
                                    <option value="NOR">NOR (None match)</option>
                                    <option value="XOR">XOR (Exactly one matches)</option>
                                </select>
                                <div class="pm-tooltip-wrapper">
                                    <span class="pm-tooltip-trigger">ℹ️</span>
                                    <div class="pm-tooltip-popup">
                                        <div class="pm-tooltip-title">Logical Operators Cheat Sheet</div>
                                        <div class="pm-tooltip-row"><span class="pm-gate-badge gate-and">AND</span> <span>All nested conditions must be <strong>True</strong>.</span></div>
                                        <div class="pm-tooltip-row"><span class="pm-gate-badge gate-or">OR</span> <span>At least one nested condition must be <strong>True</strong>.</span></div>
                                        <div class="pm-tooltip-row"><span class="pm-gate-badge gate-nand">NAND</span> <span>NOT all conditions can be true (negated AND).</span></div>
                                        <div class="pm-tooltip-row"><span class="pm-gate-badge gate-nor">NOR</span> <span>None of the conditions can be true (negated OR).</span></div>
                                        <div class="pm-tooltip-row"><span class="pm-gate-badge gate-xor">XOR</span> <span>Exactly <strong>one</strong> nested condition must be true.</span></div>
                                    </div>
                                </div>
                            </div>
                            <div style="display: flex; gap: 0.5rem;">
                                <button type="button" class="pm-btn pm-btn-add-rule" style="background-color: #3b82f6; padding: 0.35rem 0.6rem; font-size: 0.75rem; box-shadow: none;">➕ Rule</button>
                                <button type="button" class="pm-btn pm-btn-add-group" style="background-color: #64748b; padding: 0.35rem 0.6rem; font-size: 0.75rem; box-shadow: none;">➕ Group</button>
                                ${!isRoot ? `<button type="button" class="pm-btn pm-btn-delete-group" style="background-color: #ef4444; padding: 0.35rem 0.6rem; font-size: 0.75rem; box-shadow: none;">&#128465;&#65039; Group</button>` : ''}
                            </div>
                        </div>
                        <div class="pm-query-rules-container"></div>
                        <div class="pm-query-subgroups-container"></div>
                    `;
                    div.innerHTML = groupHtml; // nosec

                    const rulesContainer = div.querySelector('.pm-query-rules-container');
                    const subgroupsContainer = div.querySelector('.pm-query-subgroups-container');

                    div.querySelector('.pm-group-operator').addEventListener('change', function() {
                        const val = this.value;
                        div.className = 'pm-query-group';
                        if (val === 'OR') {
                            div.classList.add('pm-group-or');
                        } else if (val === 'NAND') {
                            div.classList.add('pm-group-nand');
                        } else if (val === 'NOR') {
                            div.classList.add('pm-group-nor');
                        } else if (val === 'XOR') {
                            div.classList.add('pm-group-xor');
                        }
                    });

                    div.querySelector('.pm-btn-add-rule').addEventListener('click', function() {
                        rulesContainer.appendChild(createRuleNode());
                    });

                    div.querySelector('.pm-btn-add-group').addEventListener('click', function() {
                        subgroupsContainer.appendChild(createGroupNode(false));
                    });

                    if (!isRoot) {
                        div.querySelector('.pm-btn-delete-group').addEventListener('click', function() {
                            div.remove();
                        });
                    }

                    // Add one default rule
                    rulesContainer.appendChild(createRuleNode());

                    return div;
                }

                function serializeGroup(groupEl) {
                    const logicalOperator = groupEl.querySelector('.pm-group-operator').value;
                    const rules = [];
                    const groups = [];

                    // Process direct rules in this group only
                    const rulesContainer = groupEl.querySelector('.pm-query-rules-container');
                    if (rulesContainer) {
                        const ruleEls = rulesContainer.querySelectorAll(':scope > .pm-query-rule');
                        ruleEls.forEach(ruleEl => {
                            const field = ruleEl.querySelector('.pm-rule-field').value;
                            const operator = ruleEl.querySelector('.pm-rule-operator').value;
                            let valStr = ruleEl.querySelector('.pm-rule-value').value.trim();

                            let value = valStr;
                            if (operator === 'IN' || operator === 'NOT_IN') {
                                value = valStr.split(',').map(s => s.trim()).filter(s => s !== '');
                            } else if (field === 'product.active' || field === 'category.id' || field === 'manufacturer.id' || field === 'product.id_manufacturer' || field === 'product.has_discount' || field === 'employee.id_profile') {
                                value = isNaN(valStr) ? valStr : parseInt(valStr, 10);
                            } else if (field === 'product.price' || field === 'product.final_price' || field === 'discount.reduction_percent' || field === 'discount.reduction_amount') {
                                value = isNaN(valStr) ? valStr : parseFloat(valStr);
                            }

                            rules.push({ field, operator, value });
                        });
                    }

                    // Process subgroups in this group only
                    const subgroupsContainer = groupEl.querySelector('.pm-query-subgroups-container');
                    if (subgroupsContainer) {
                        const subGroupEls = subgroupsContainer.querySelectorAll(':scope > .pm-query-group');
                        subGroupEls.forEach(subEl => {
                            groups.push(serializeGroup(subEl));
                        });
                    }

                    return {
                        logical_operator: logicalOperator,
                        rules: rules,
                        groups: groups
                    };
                }

                if (builderRoot) {
                    // Draw initial root group
                    const rootGroup = createGroupNode(true);
                    builderRoot.appendChild(rootGroup);

                    const resultPanel = document.getElementById('pm-query-result-panel');

                    // G. Live Human-Readable Translation Engine
                    const explanationText = document.getElementById('pm-query-explanation-text');

                    function translateGroup(group) {
                        const operator = group.logical_operator;
                        const rules = group.rules || [];
                        const groups = group.groups || [];

                        if (rules.length === 0 && groups.length === 0) {
                            return '';
                        }

                        const ruleTexts = rules.map(rule => {
                            const fieldLabels = {
                                'product.active': 'Active Status',
                                'product.reference': 'Reference / SKU',
                                'product.price': 'Base Price',
                                'product.final_price': 'Discounted Price',
                                'product.has_discount': 'Discount Status',
                                'product.name': 'Name',
                                'category.id': 'Category ID',
                                'manufacturer.id': 'Manufacturer ID',
                                'product.id_manufacturer': 'Manufacturer ID',
                                'employee.id_profile': 'Employee Profile',
                                'discount.reduction_percent': 'Discount Reduction %',
                                'discount.reduction_amount': 'Discount Flat Amount'
                            };
                            const fieldLabel = fieldLabels[rule.field] || rule.field;

                            const opLabels = {
                                'EQUAL': 'is',
                                'NOT_EQUAL': 'is not',
                                'GREATER_THAN': 'is greater than',
                                'LESS_THAN': 'is less than',
                                'LIKE': 'contains',
                                'IN': 'is in list',
                                'NOT_IN': 'is not in list'
                            };
                            const opLabel = opLabels[rule.operator] || rule.operator;

                            let valText = rule.value;
                            if (rule.field === 'product.active') {
                                valText = (rule.value == '1') ? 'Active' : 'Inactive';
                            } else if (rule.field === 'product.has_discount') {
                                valText = (rule.value == '1') ? 'Has Discount' : 'No Discount';
                            } else if (Array.isArray(rule.value)) {
                                valText = `[${rule.value.join(', ')}]`;
                            } else if (rule.value === '' || rule.value === undefined || rule.value === null) {
                                valText = '...';
                            }

                            return `<strong>${fieldLabel}</strong> ${opLabel} <strong>"${valText}"</strong>`;
                        });

                        const subGroupTexts = groups.map(g => {
                            const subText = translateGroup(g);
                            return subText ? `(${subText})` : '';
                        }).filter(t => t !== '');

                        const allParts = [...ruleTexts, ...subGroupTexts];
                        if (allParts.length === 0) return '';

                        switch (operator) {
                            case 'AND':
                                return allParts.join(' <span style="color:#3b82f6;font-weight:700;">AND</span> ');
                            case 'OR':
                                return allParts.join(' <span style="color:#f59e0b;font-weight:700;">OR</span> ');
                            case 'NAND':
                                return `<strong>NOT ALL</strong> of the following are true: [ ${allParts.join(', ')} ]`;
                            case 'NOR':
                                return `<strong>NONE</strong> of the following are true: [ ${allParts.join(', ')} ]`;
                            case 'XOR':
                                return `<strong>EXACTLY ONE</strong> of the following is true: [ ${allParts.join(', ')} ]`;
                            default:
                                return allParts.join(` ${operator} `);
                        }
                    }

                    function updateLiveExplanation() {
                        if (!builderRoot || !explanationText) return;
                        
                        const rootGroupEl = builderRoot.querySelector('.pm-query-group');
                        if (!rootGroupEl) {
                            explanationText.innerHTML = 'No rules defined yet. Add a rule below to start.'; // nosec
                            return;
                        }

                        const ast = serializeGroup(rootGroupEl);
                        const translation = translateGroup(ast);
                        if (translation) {
                            explanationText.innerHTML = `This matches products where: ${translation}`; // nosec
                        } else {
                            explanationText.innerHTML = 'No active rules configured.'; // nosec
                        }

                        // Safety Lock: When query inputs drift, hide Step 2 so mutations cannot run until a fresh compilation is verified!
                        window.lastCompiledAst = null;
                        const step2 = document.getElementById('pm-wizard-step-2');
                        if (step2) {
                            step2.style.display = 'none';
                        }
                    }

                    // Attach real-time event delegation updates
                    builderRoot.addEventListener('change', updateLiveExplanation);
                    builderRoot.addEventListener('input', updateLiveExplanation);
                    builderRoot.addEventListener('keyup', updateLiveExplanation);

                    // Initial draw trigger
                    updateLiveExplanation();

                    // Wire up triggers inside rule creation/deletion to keep translation fresh
                    const originalCreateRuleNode = createRuleNode;
                    createRuleNode = function() {
                        const rule = originalCreateRuleNode();
                        setTimeout(updateLiveExplanation, 0);
                        // Wire deletion trigger callback
                        rule.querySelector('.pm-btn-delete-rule').addEventListener('click', function() {
                            setTimeout(updateLiveExplanation, 0);
                        });
                        return rule;
                    };

                    const originalCreateGroupNode = createGroupNode;
                    createGroupNode = function(isRoot = false) {
                        const group = originalCreateGroupNode(isRoot);
                        setTimeout(updateLiveExplanation, 0);
                        
                        group.querySelector('.pm-btn-add-rule').addEventListener('click', function() {
                            setTimeout(updateLiveExplanation, 0);
                        });
                        group.querySelector('.pm-btn-add-group').addEventListener('click', function() {
                            setTimeout(updateLiveExplanation, 0);
                        });
                        if (!isRoot) {
                            group.querySelector('.pm-btn-delete-group').addEventListener('click', function() {
                                setTimeout(updateLiveExplanation, 0);
                            });
                        }
                        return group;
                    };

                    btnPreviewQuery.addEventListener('click', function() {
                        btnPreviewQuery.disabled = true;
                        const originalText = btnPreviewQuery.innerHTML;
                        btnPreviewQuery.innerHTML = '&#9889; Compiling AST & Resolving Joins...'; // nosec

                        const ast = {
                            condition_tree: serializeGroup(rootGroup)
                        };

                        FetchEngine.post('preview_query', { payload: JSON.stringify(ast) })
                            .then(data => {
                                btnPreviewQuery.disabled = false;
                                btnPreviewQuery.innerHTML = originalText; // nosec

                                if (data.success) {
                                    document.getElementById('pm-preview-count').textContent = data.count;
                                    document.getElementById('pm-preview-sql').textContent = data.sql;
                                    
                                    const samplesContainer = document.getElementById('pm-preview-samples');
                                    samplesContainer.innerHTML = ''; // nosec
                                    if (data.sample_ids && data.sample_ids.length > 0) {
                                        samplesContainer.textContent = data.sample_ids.join(', ');
                                    } else {
                                        samplesContainer.textContent = 'No matching product IDs found for this visual query.';
                                    }

                                    // Sync to Step 2 Configure & Execute Mutations
                                    window.lastCompiledAst = ast;
                                    const execCount = document.getElementById('pm-execute-target-count');
                                    const execStatus = document.getElementById('pm-execute-sync-status');
                                    const execExplanation = document.getElementById('pm-execute-target-explanation');
                                    const execBtn = document.getElementById('pm-btn-execute-mutations');
                                    const step2Container = document.getElementById('pm-wizard-step-2');
                                    
                                    if (execCount) execCount.textContent = data.count;
                                    if (execStatus) {
                                        execStatus.textContent = 'SYNCED WITH BUILDER';
                                        execStatus.className = 'pm-status-pill success';
                                    }
                                    if (execExplanation && explanationText) {
                                        execExplanation.innerHTML = explanationText.innerHTML; // nosec
                                    }
                                    if (execBtn) {
                                        execBtn.disabled = (data.count === 0);
                                    }

                                    resultPanel.style.display = 'block';

                                    if (data.count > 0) {
                                        if (step2Container) {
                                            step2Container.style.display = 'block';
                                            setTimeout(() => {
                                                step2Container.scrollIntoView({ behavior: 'smooth' });
                                            }, 150);
                                        }
                                    } else {
                                        if (step2Container) {
                                            step2Container.style.display = 'none';
                                        }
                                        resultPanel.scrollIntoView({ behavior: 'smooth' });
                                    }
                                } else {
                                    alert('AST Compilation Failure: ' + (data.error || 'Unknown Error'));
                                }
                            })
                            .catch(error => {
                                btnPreviewQuery.disabled = false;
                                btnPreviewQuery.innerHTML = originalText; // nosec
                                alert('Network error during compilation request: ' + error);
                            });
                    });
                }

                // H. Visual Mutation Actions Builder
                const mutationContainer = document.getElementById('pm-mutation-rules-container');
                const btnAddMutation = document.getElementById('pm-btn-add-mutation');
                const btnExecuteMutations = document.getElementById('pm-btn-execute-mutations');
                const mutationResultPanel = document.getElementById('pm-mutation-result-panel');
                const mutationLogTerminal = document.getElementById('pm-mutation-log-terminal');
                
                const btnSaveMutationLog = document.getElementById('pm-btn-save-mutation-log');
                if (btnSaveMutationLog) {
                    btnSaveMutationLog.addEventListener('click', function() {
                        if (mutationLogTerminal) {
                            const text = mutationLogTerminal.textContent;
                            const blob = new Blob([text], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'mutation_execution.log';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                        }
                    });
                }

                const btnClearMutationLog = document.getElementById('pm-btn-clear-mutation-log');
                if (btnClearMutationLog) {
                    btnClearMutationLog.addEventListener('click', function() {
                        if (typeof FetchEngine !== 'undefined') {
                            FetchEngine.post('clear_saas_log')
                            .then(data => {
                                if (data.success) {
                                    if (mutationLogTerminal) {
                                        mutationLogTerminal.textContent = 'No mutation logs compiled yet.';
                                    }
                                    showPremiumToast('Mutation console log cleared.');
                                }
                            })
                            .catch(err => console.error('Error clearing console log: ', err));
                        } else {
                            if (mutationLogTerminal) {
                                mutationLogTerminal.textContent = 'No mutation logs compiled yet.';
                            }
                        }
                    });
                }

                function createMutationNode() {
                    const div = document.createElement('div');
                    div.className = 'pm-query-rule pm-mutation-rule';
                    const mutationHtml = `
                        <select class="pm-query-select pm-mutation-field">
                            <option value="price">Product: Base Price</option>
                            <option value="active">Product: Active Status</option>
                            <option value="reference">Product: Reference / SKU</option>
                            <option value="id_manufacturer">Product: Manufacturer ID</option>
                            <option value="discount_percent">Discount: Percentage Reduction (%)</option>
                            <option value="discount_amount">Discount: Flat Amount Reduction</option>
                        </select>
                        <select class="pm-query-select pm-mutation-type">
                            <option value="SET">SET to</option>
                            <option value="ADD">ADD (+)</option>
                            <option value="MULTIPLY">MULTIPLY (*)</option>
                        </select>
                        <span class="pm-mutation-value-container">
                            <input type="text" class="pm-query-input pm-mutation-value" placeholder="Enter value..." style="min-width:180px;">
                        </span>
                        <button type="button" class="pm-btn pm-btn-delete-mutation" style="background-color: #ef4444; padding: 0.35rem 0.6rem; font-size: 0.75rem; box-shadow: none;">&#128465;&#65039;</button>
                    `;
                    div.innerHTML = mutationHtml; // nosec

                    const fieldSelect = div.querySelector('.pm-mutation-field');
                    const typeSelect = div.querySelector('.pm-mutation-type');
                    const valueContainer = div.querySelector('.pm-mutation-value-container');

                    let forceManualMode = false;

                    function updateMutationControls() {
                        const field = fieldSelect.value;
                        valueContainer.innerHTML = ''; // nosec
                        const modeToggle = document.createElement('button');
                        modeToggle.type = 'button';
                        modeToggle.className = 'pm-btn-toggle-mode';

                        if (field === 'price') {
                            typeSelect.style.display = 'inline-block';
                            typeSelect.innerHTML = `<option value="SET">SET to</option><option value="ADD">ADD (+)</option><option value="MULTIPLY">MULTIPLY (*)</option>`; // nosec
                            const input = document.createElement('input');
                            input.type = 'number';
                            input.step = '0.01';
                            input.className = 'pm-query-input pm-mutation-value';
                            input.placeholder = 'Enter price...';
                            input.style.minWidth = '180px';
                            valueContainer.appendChild(input);
                        } else if (field === 'active') {
                            typeSelect.innerHTML = `<option value="SET">SET to</option>`; // nosec
                            if (!forceManualMode) {
                                const select = document.createElement('select');
                                select.className = 'pm-query-select pm-mutation-value';
                                select.style.minWidth = '180px';
                                select.innerHTML = `<option value="1">Active</option><option value="0">Inactive</option>`; // nosec
                                modeToggle.title = 'Switch to manual type-in mode';
                                modeToggle.innerHTML = '✏️'; // nosec
                                modeToggle.addEventListener('click', () => { forceManualMode = true; updateMutationControls(); });
                                valueContainer.appendChild(select);
                                valueContainer.appendChild(modeToggle);
                            } else {
                                const input = document.createElement('input');
                                input.type = 'text';
                                input.className = 'pm-query-input pm-mutation-value';
                                input.placeholder = 'Enter 1 or 0...';
                                input.style.minWidth = '180px';
                                modeToggle.title = 'Switch to selection dropdown mode';
                                modeToggle.innerHTML = '📜'; // nosec
                                modeToggle.addEventListener('click', () => { forceManualMode = false; updateMutationControls(); });
                                valueContainer.appendChild(input);
                                valueContainer.appendChild(modeToggle);
                            }
                        } else if (field === 'reference') {
                            typeSelect.innerHTML = `<option value="SET">SET to</option>`; // nosec
                            const input = document.createElement('input');
                            input.type = 'text';
                            input.className = 'pm-query-input pm-mutation-value';
                            input.placeholder = 'Enter SKU...';
                            input.style.minWidth = '180px';
                            valueContainer.appendChild(input);
                        } else if (field === 'id_manufacturer') {
                            typeSelect.innerHTML = `<option value="SET">SET to</option>`; // nosec
                            if (!forceManualMode) {
                                const select = document.createElement('select');
                                select.className = 'pm-query-select pm-mutation-value';
                                select.style.minWidth = '180px';
                                if (window.pmManufacturers && window.pmManufacturers.length > 0) {
                                    window.pmManufacturers.forEach(m => {
                                        const opt = document.createElement('option');
                                        opt.value = m.id;
                                        opt.textContent = `[${m.id}] ${m.name}`;
                                        select.appendChild(opt);
                                    });
                                } else {
                                    const opt = document.createElement('option');
                                    opt.value = '0';
                                    opt.textContent = 'No manufacturers available';
                                    select.appendChild(opt);
                                }
                                modeToggle.title = 'Switch to manual type-in mode';
                                modeToggle.innerHTML = '✏️'; // nosec
                                modeToggle.addEventListener('click', () => { forceManualMode = true; updateMutationControls(); });
                                valueContainer.appendChild(select);
                                valueContainer.appendChild(modeToggle);
                            } else {
                                const input = document.createElement('input');
                                input.type = 'text';
                                input.className = 'pm-query-input pm-mutation-value';
                                input.placeholder = 'Enter manufacturer ID...';
                                input.style.minWidth = '180px';
                                modeToggle.title = 'Switch to selection dropdown mode';
                                modeToggle.innerHTML = '📜'; // nosec
                                modeToggle.addEventListener('click', () => { forceManualMode = false; updateMutationControls(); });
                                valueContainer.appendChild(input);
                                valueContainer.appendChild(modeToggle);
                            }
                        } else if (field === 'discount_percent') {
                            typeSelect.innerHTML = `<option value="SET">SET to</option>`; // nosec
                            const input = document.createElement('input');
                            input.type = 'number';
                            input.step = '0.01';
                            input.min = '0';
                            input.max = '100';
                            input.className = 'pm-query-input pm-mutation-value';
                            input.placeholder = 'Enter percentage (e.g. 20)...';
                            input.style.minWidth = '180px';
                            valueContainer.appendChild(input);
                        } else if (field === 'discount_amount') {
                            typeSelect.innerHTML = `<option value="SET">SET to</option>`; // nosec
                            const input = document.createElement('input');
                            input.type = 'number';
                            input.step = '0.01';
                            input.min = '0';
                            input.className = 'pm-query-input pm-mutation-value';
                            input.placeholder = 'Enter flat reduction amount...';
                            input.style.minWidth = '180px';
                            valueContainer.appendChild(input);
                        }
                    }

                    fieldSelect.addEventListener('change', function() {
                        forceManualMode = false;
                        updateMutationControls();
                    });
                    div.querySelector('.pm-btn-delete-mutation').addEventListener('click', function() {
                        div.remove();
                    });

                    // Initial trigger
                    updateMutationControls();
                    return div;
                }

                if (mutationContainer && btnAddMutation) {
                    // Populate initial rule
                    mutationContainer.appendChild(createMutationNode());

                    btnAddMutation.addEventListener('click', function() {
                        mutationContainer.appendChild(createMutationNode());
                    });
                }

                if (btnExecuteMutations) {
                    btnExecuteMutations.addEventListener('click', function() {
                        if (window.PM_CAPABILITIES && window.PM_CAPABILITIES.query_visual_execute === false) {
                            showPremiumAlert(
                                'Pro Feature Locked', 
                                'Visual execution of query wizard mutations requires a Pro or Developer subscription package.<br><br><strong>Note:</strong> You can still write and run your mutations as raw SQL statements inside the database terminal tab.', 
                                'warning'
                            );
                            return;
                        }

                        if (!window.lastCompiledAst) {
                            showPremiumAlert('Out of Sync', 'Target scope is out of sync. Please preview your query on the Query Builder tab first.', 'warning');
                            return;
                        }

                        // Collect action items
                        const actions = {};
                        const ruleEls = document.querySelectorAll('.pm-mutation-rule');
                        if (ruleEls.length === 0) {
                            showPremiumAlert('Missing Actions', 'Please add at least one mutation action before execution.', 'warning');
                            return;
                        }

                        ruleEls.forEach(el => {
                            const field = el.querySelector('.pm-mutation-field').value;
                            const type = el.querySelector('.pm-mutation-type').value;
                            const value = el.querySelector('.pm-mutation-value').value.trim();
                            actions[field] = { type, value };
                        });

                        // Double check safety dialog confirmation
                        showPremiumConfirmModal(
                            'Atomic Execution Pre-Flight',
                            'CRITICAL ACTION PRE-FLIGHT CHECKLIST:<br><br>1. Active InnoDB Transactions will acquire locks on targets.<br>2. In case of unexpected server crashes, modifications will ROLLBACK.<br>3. Historical backups are recommended.<br><br>Are you sure you want to trigger this database synchronization now? Type <strong style="color: #ef4444;">EXECUTE</strong> to confirm:',
                            'EXECUTE',
                            () => {
                                btnExecuteMutations.disabled = true;
                                const originalText = btnExecuteMutations.innerHTML;
                                btnExecuteMutations.innerHTML = '&#9889; Processing atomic operations...'; // nosec

                                // FormData replaced by FetchEngine
                                
                                // Fire recursive mutation chunking request
                                const limit = 100;
                                let cumulativeLogs = '';
                                
                                function executeChunk(offset) {
                                    
                                    
                                    btnExecuteMutations.innerHTML = `<span class="pm-spinner" style="margin-right: 8px;"></span> Mutating... (${offset})`; // nosec
                                    
                                    FetchEngine.post('execute_mutations', {
                                        payload: JSON.stringify(window.lastCompiledAst),
                                        actions: JSON.stringify(actions),
                                        offset: offset,
                                        limit: limit
                                    })
                                        .then(data => {
                                            if (!data.success) {
                                                throw new Error(data.error || 'Execution Failure');
                                            }
                                            
                                            if (data.log_content) {
                                                cumulativeLogs += data.log_content;
                                            }
                                            
                                            if (!data.done) {
                                                // Recurse for the next chunk
                                                executeChunk(data.new_offset);
                                            } else {
                                                // Finished all chunks
                                                btnExecuteMutations.disabled = false;
                                                btnExecuteMutations.innerHTML = originalText; // nosec
        
                                                showPremiumToast('Atomic execution completed! The mutation was securely recorded and can be inspected in the Mutation History tab.', 'success');
                                                
                                                // Render terminal result
                                                if (mutationResultPanel && mutationLogTerminal) {
                                                    mutationLogTerminal.textContent = cumulativeLogs || data.message;
                                                    mutationLogTerminal.scrollTop = mutationLogTerminal.scrollHeight;
                                                    mutationResultPanel.style.display = 'block';
                                                    mutationResultPanel.scrollIntoView({ behavior: 'smooth' });
                                                }
        
                                                // Refresh the general Event Logs terminal on Tab 5 as well!
                                                const generalTerminal = document.getElementById('pm-log-terminal');
                                                if (generalTerminal && cumulativeLogs) {
                                                    generalTerminal.textContent = cumulativeLogs;
                                                    generalTerminal.scrollTop = 0;
                                                }
                                                
                                                // Auto refresh mutation history table
                                                if (typeof HistoryEngine !== 'undefined') HistoryEngine.refresh();
                                            }
                                        })
                                        .catch(error => {
                                            btnExecuteMutations.disabled = false;
                                            btnExecuteMutations.innerHTML = originalText; // nosec
                                            showPremiumAlert('Execution Error', 'Error during mutation execution: ' + error.message, 'error');
                                        });
                                }
                                
                                // Kick off the first chunk
                                executeChunk(0);
                            }
                        );
                    });
                }

                


                // --- FILE TOOLS POLLING LOGIC ---
    }

    return {
        initialize: function() {
            bindEvents();
        }
    };
})();

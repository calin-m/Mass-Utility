document.addEventListener('DOMContentLoaded', () => {
    // Tab Switching
    const tabBtns = document.querySelectorAll('.pm-tab-btn');
    const tabPanes = document.querySelectorAll('.pm-tab-pane');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Generate Strong Password Button
    const genPassBtn = document.getElementById('pm-btn-gen-pass');
    if (genPassBtn) {
        genPassBtn.addEventListener('click', () => {
            const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+=-';
            let pass = '';
            for (let i = 0; i < 16; i++) {
                pass += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            const passInput = document.getElementById('pm-user-pass');
            passInput.value = pass;
            passInput.type = 'text'; // Show temporarily
            passInput.focus();
        });
    }

    loadData();

    document.getElementById('pm-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('pm-user-email').value;
        const pass = document.getElementById('pm-user-pass').value;
        const company = document.getElementById('pm-user-company').value;

        const formData = new FormData();
        formData.append('email', email);
        formData.append('password', pass);
        formData.append('company', company);

        const response = await fetch('index.php?action=api_create_user', { method: 'POST', body: formData });
        const result = await response.json();
        if (result.success) {
            alert('Client account created successfully!');
            document.getElementById('pm-user-email').value = '';
            document.getElementById('pm-user-pass').value = '';
            document.getElementById('pm-user-company').value = '';
            updateUsersDropdown(result.users);
        } else {
            alert(result.error || 'Failed to create user.');
        }
    });

    document.getElementById('pm-generate-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('pm-new-user-id').value;
        const tier = document.getElementById('pm-new-tier').value;
        const expiry = document.getElementById('pm-new-expiry').value;

        const formData = new FormData();
        formData.append('user_id', userId);
        formData.append('tier', tier);
        formData.append('expiry', expiry);

        const response = await fetch('index.php?action=api_generate', { method: 'POST', body: formData });
        const result = await response.json();
        if (result.success) {
            alert(`Generated Key: ${result.key}`);
            renderLicenses(result.licenses);
        } else {
            alert(result.error || 'Failed to generate key.');
        }
    });

    document.getElementById('pm-password-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const oldPass = document.getElementById('pm-admin-old-pass').value;
        const newPass = document.getElementById('pm-admin-new-pass').value;

        const formData = new FormData();
        formData.append('old_password', oldPass);
        formData.append('new_password', newPass);

        const response = await fetch('index.php?action=api_change_password', { method: 'POST', body: formData });
        const result = await response.json();
        if (result.success) {
            alert('Admin password updated successfully!');
            document.getElementById('pm-admin-old-pass').value = '';
            document.getElementById('pm-admin-new-pass').value = '';
        } else {
            alert(result.error || 'Failed to update password.');
        }
    });

    document.getElementById('pm-edit-cancel').addEventListener('click', () => {
        document.getElementById('pm-edit-modal').style.display = 'none';
    });

    document.getElementById('pm-edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('pm-edit-id').value;
        const tier = document.getElementById('pm-edit-tier').value;
        const status = document.getElementById('pm-edit-status').value;
        const expiry = document.getElementById('pm-edit-expiry').value;
        const domain = document.getElementById('pm-edit-domain').value;

        const formData = new FormData();
        formData.append('id', id);
        formData.append('tier', tier);
        formData.append('status', status);
        formData.append('expiry', expiry);
        formData.append('store_url', domain);

        const response = await fetch('index.php?action=api_update', { method: 'POST', body: formData });
        const result = await response.json();
        if (result.success) {
            document.getElementById('pm-edit-modal').style.display = 'none';
            renderLicenses(result.licenses);
        } else {
            alert(result.error || 'Failed to update license.');
        }
    });

    document.getElementById('pm-tier-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('pm-tier-name').value.trim().toLowerCase();
        const caps = {
            query_visual_execute: document.getElementById('pm-cap-visual-execute').checked,
            backup_destinations: document.getElementById('pm-cap-gdrive').checked ? ['local', 'gdrive'] : ['local'],
            backup_automation: document.getElementById('pm-cap-automation').checked,
            rollback_history_limit: parseInt(document.getElementById('pm-cap-rollback-limit').value || '0'),
            governor_autopilot: document.getElementById('pm-cap-autopilot').checked,
            sweeper_execution: document.getElementById('pm-cap-sweeper').checked
        };

        const formData = new FormData();
        formData.append('name', name);
        formData.append('capabilities', JSON.stringify(caps));

        const response = await fetch('index.php?action=api_save_tier', { method: 'POST', body: formData });
        const result = await response.json();
        if (result.success) {
            alert('Package tier saved successfully!');
            document.getElementById('pm-tier-name').value = '';
            document.getElementById('pm-cap-visual-execute').checked = false;
            document.getElementById('pm-cap-gdrive').checked = false;
            document.getElementById('pm-cap-automation').checked = false;
            document.getElementById('pm-cap-sweeper').checked = false;
            document.getElementById('pm-cap-autopilot').checked = false;
            document.getElementById('pm-cap-rollback-limit').value = '';
            renderTiers(result.tiers);
            updateTiersDropdowns(result.tiers);
            loadData();
        } else {
            alert(result.error || 'Failed to save package tier.');
        }
    });
});

async function loadData() {
    try {
        const response = await fetch('index.php?action=api_list');
        const result = await response.json();
        if (result.success) {
            renderLicenses(result.licenses);
            updateUsersDropdown(result.users);
            renderTiers(result.tiers || []);
            updateTiersDropdowns(result.tiers || []);
        } else {
            if (result.error && result.error.includes('Unauthenticated')) {
                window.location.href = 'index.php';
            } else {
                alert('API Error: ' + result.error);
            }
        }
    } catch (err) {
        console.error('Failed to load data', err);
        alert('Network Error loading data: ' + err.message);
    }
}

function updateUsersDropdown(users) {
    const select = document.getElementById('pm-new-user-id');
    if (!select) return;
    select.innerHTML = ''; // nosec
    users.forEach(u => {
        const option = document.createElement('option');
        option.value = u.id;
        option.textContent = `${u.email} (${u.company_name || 'No Company'})`;
        select.appendChild(option);
    });
}

function updateTiersDropdowns(tiers) {
    const newTierSelect = document.getElementById('pm-new-tier');
    const editTierSelect = document.getElementById('pm-edit-tier');
    if (!newTierSelect || !editTierSelect) return;
    
    if (tiers && tiers.length > 0) {
        newTierSelect.innerHTML = ''; // nosec
        editTierSelect.innerHTML = ''; // nosec
        
        tiers.forEach(t => {
            const opt1 = document.createElement('option');
            opt1.value = t.name;
            opt1.textContent = t.name.toUpperCase();
            newTierSelect.appendChild(opt1);
            
            const opt2 = document.createElement('option');
            opt2.value = t.name;
            opt2.textContent = t.name.toUpperCase();
            editTierSelect.appendChild(opt2);
        });
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function maskLicenseKey(key) {
    if (!key) return '';
    const parts = key.split('-');
    if (parts.length >= 4) {
        return `${parts[0]}-${parts[1]}-••••-••••-••••`;
    }
    if (key.length > 9) {
        return key.slice(0, 8) + '-••••-••••-••••';
    }
    return key;
}

window.toggleKeyMask = function(id, fullKey) {
    const span = document.getElementById(`pm-key-val-${id}`);
    const btn = document.getElementById(`pm-key-btn-${id}`);
    if (!span || !btn) return;
    const isMasked = span.getAttribute('data-masked') === 'true';
    if (isMasked) {
        span.textContent = fullKey;
        span.setAttribute('data-masked', 'false');
        btn.textContent = '🙈';
        btn.title = 'Hide Key';
    } else {
        span.textContent = maskLicenseKey(fullKey);
        span.setAttribute('data-masked', 'true');
        btn.textContent = '👁️';
        btn.title = 'Reveal Key';
    }
};

window.copyLicenseKey = function(fullKey) {
    if (!fullKey) return;
    navigator.clipboard.writeText(fullKey).then(() => {
        alert('📋 License Key copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy license key:', err);
    });
};

function renderLicenses(licenses) {
    const list = document.getElementById('pm-licenses-list');
    if (!list) return;
    list.innerHTML = ''; // nosec
    licenses.forEach(l => {
        const tr = document.createElement('tr');
        const emailSafe = escapeHtml(l.user_email || 'Unknown');
        const urlSafe = l.store_url ? escapeHtml(l.store_url) : '<em>Not bound yet</em>';
        const expiryVal = l.expires_at || '';
        const domainVal = l.store_url || '';
        const tierVal = l.package_tier || 'basic';
        const keyRaw = l.license_key || '';
        const keyMasked = maskLicenseKey(keyRaw);
        
        let toggleButton = '';
        if (l.status === 'active') {
            toggleButton = `<button class="pm-btn pm-btn-sm pm-btn-danger" style="margin-left: 0.5rem;" onclick="toggleStatus(${l.id}, 'suspended', '${escapeHtml(tierVal)}', '${escapeHtml(expiryVal)}', '${escapeHtml(domainVal)}')">🛑 Suspend</button>`;
        } else {
            toggleButton = `<button class="pm-btn pm-btn-sm pm-btn-primary" style="margin-left: 0.5rem;" onclick="toggleStatus(${l.id}, 'active', '${escapeHtml(tierVal)}', '${escapeHtml(expiryVal)}', '${escapeHtml(domainVal)}')">✅ Activate</button>`;
        }

        tr.innerHTML = /* nosec */ `
            <td>${l.id}</td>
            <td>${emailSafe}</td>
            <td>
                <div style="display: inline-flex; align-items: center; gap: 0.4rem;">
                    <span id="pm-key-val-${l.id}" data-masked="true" style="font-family: monospace; font-weight: bold; color: var(--pm-warning);">
                        ${escapeHtml(keyMasked)}
                    </span>
                    <button type="button" id="pm-key-btn-${l.id}" class="pm-btn-icon" title="Reveal Key" onclick="toggleKeyMask(${l.id}, '${escapeHtml(keyRaw)}')">👁️</button>
                    <button type="button" class="pm-btn-icon" title="Copy License Key" onclick="copyLicenseKey('${escapeHtml(keyRaw)}')">📋</button>
                </div>
            </td>
            <td>${urlSafe}</td>
            <td><strong>${escapeHtml(tierVal.toUpperCase())}</strong></td>
            <td><span class="pm-badge badge-${escapeHtml(l.status)}">${escapeHtml(l.status)}</span></td>
            <td>${escapeHtml(l.expires_at || 'Never')}</td>
            <td>
                <button class="pm-btn pm-btn-sm pm-btn-neutral" onclick="openEdit(${l.id}, '${escapeHtml(tierVal)}', '${escapeHtml(l.status)}', '${escapeHtml(l.expires_at || '')}', '${escapeHtml(l.store_url || '')}')">✏️ Edit</button>
                ${toggleButton}
            </td>
        `;
        list.appendChild(tr);
    });
}

function renderTiers(tiers) {
    const list = document.getElementById('pm-tiers-list');
    if (!list) return;
    list.innerHTML = ''; // nosec
    
    tiers.forEach(t => {
        let caps = {};
        try {
            caps = JSON.parse(t.capabilities);
        } catch(e) {}
        
        const tr = document.createElement('tr');
        const capabilitiesStr = `
            Visual Execute: <strong>${caps.query_visual_execute ? 'YES' : 'NO'}</strong> | 
            Destinations: <strong>${(caps.backup_destinations || []).join(', ')}</strong> | 
            Auto Crons: <strong>${caps.backup_automation ? 'YES' : 'NO'}</strong> | 
            Safety Auto-Pilot: <strong>${caps.governor_autopilot ? 'YES' : 'NO'}</strong> | 
            Sweeper Exec: <strong>${caps.sweeper_execution ? 'YES' : 'NO'}</strong> | 
            Rollbacks: <strong>${caps.rollback_history_limit}</strong>
        `;
        
        tr.innerHTML = /* nosec */ `
            <td style="font-weight: bold; color: var(--pm-primary);">${escapeHtml(t.name.toUpperCase())}</td>
            <td style="font-size: 0.85rem; color: var(--pm-text-secondary); line-height: 1.4;">${capabilitiesStr}</td>
            <td>
                <button class="pm-btn pm-btn-sm pm-btn-neutral" onclick="loadTierToForm('${escapeHtml(t.name)}', '${escapeHtml(t.capabilities)}')">✏️ Edit</button>
                <button class="pm-btn pm-btn-sm pm-btn-danger" style="margin-left: 0.5rem;" onclick="deleteTier(${t.id})">🗑️ Delete</button>
            </td>
        `;
        list.appendChild(tr);
    });
}

window.loadTierToForm = function(name, capabilitiesStr) {
    let caps = {};
    try {
        caps = JSON.parse(capabilitiesStr);
    } catch(e) {}
    
    document.getElementById('pm-tier-name').value = name;
    document.getElementById('pm-cap-visual-execute').checked = !!caps.query_visual_execute;
    document.getElementById('pm-cap-gdrive').checked = !!(caps.backup_destinations && caps.backup_destinations.includes('gdrive'));
    document.getElementById('pm-cap-automation').checked = !!caps.backup_automation;
    document.getElementById('pm-cap-sweeper').checked = !!caps.sweeper_execution;
    document.getElementById('pm-cap-autopilot').checked = !!caps.governor_autopilot;
    document.getElementById('pm-cap-rollback-limit').value = caps.rollback_history_limit ?? '0';
    
    document.getElementById('pm-tier-name').focus();
};

window.deleteTier = async function(id) {
    if (!confirm('Are you sure you want to delete this package tier? Licenses using this tier will fallback to default Basic limits.')) {
        return;
    }
    const formData = new FormData();
    formData.append('id', id);
    try {
        const response = await fetch('index.php?action=api_delete_tier', { method: 'POST', body: formData });
        const result = await response.json();
        if (result.success) {
            renderTiers(result.tiers);
            updateTiersDropdowns(result.tiers);
            loadData();
        } else {
            alert(result.error || 'Failed to delete tier.');
        }
    } catch (err) {
        console.error('Failed to delete tier', err);
    }
};

window.toggleStatus = async function(id, newStatus, currentTier, currentExpiry, currentDomain) {
    const formData = new FormData();
    formData.append('id', id);
    formData.append('status', newStatus);
    formData.append('tier', currentTier);
    formData.append('expiry', currentExpiry);
    formData.append('store_url', currentDomain);

    try {
        const response = await fetch('index.php?action=api_update', { method: 'POST', body: formData });
        const result = await response.json();
        if (result.success) {
            renderLicenses(result.licenses);
        } else {
            alert(result.error || 'Failed to update license status.');
        }
    } catch (err) {
        console.error('Failed to update status', err);
    }
};

window.openEdit = function(id, tier, status, expiry, domain) {
    document.getElementById('pm-edit-id').value = id;
    document.getElementById('pm-edit-tier').value = tier;
    document.getElementById('pm-edit-status').value = status;
    document.getElementById('pm-edit-expiry').value = expiry ? expiry.split(' ')[0] : '';
    document.getElementById('pm-edit-domain').value = domain || '';
    document.getElementById('pm-edit-modal').style.display = 'flex';
};

    // Run Security Diagnostics Scan
    const runDiagBtn = document.getElementById('pm-btn-run-diagnostics');
    if (runDiagBtn) {
        runDiagBtn.addEventListener('click', async () => {
            runDiagBtn.disabled = true;
            runDiagBtn.textContent = '⚡ Auditing...';

            const resultsContainer = document.getElementById('pm-diagnostics-results');
            if (resultsContainer) {
                resultsContainer.innerHTML = '<p class="pm-label" style="color: var(--pm-primary); text-align: center; padding: 2rem 0;">Scanning multi-server architecture safety indicators...</p>'; // nosec
            }

            try {
                const response = await fetch('index.php?action=api_get_diagnostics', { method: 'POST' });
                const result = await response.json();
                if (result.success && result.diagnostics) {
                    const d = result.diagnostics;
                    let html = '<div style="display: flex; flex-direction: column; gap: 1rem;">';

                    // 1. Super-Admin Portal Group
                    html += '<h4 style="margin: 0.5rem 0 0.25rem 0; color: var(--pm-text-primary); font-size: 1.1rem;">🛠️ Super-Admin Portal Environment</h4>';
                    
                    html += `
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: rgba(255,255,255,0.02); border: 1px solid var(--pm-border-color); border-radius: 8px;">
                            <div>
                                <strong style="font-size: 0.9rem; color: var(--pm-text-primary);">Admin Git Repository (.git Exposure)</strong>
                                <p style="font-size: 0.75rem; color: var(--pm-text-secondary); margin: 0.2rem 0 0 0;">Checks if Git directory is accessible from public HTTP traffic.</p>
                            </div>
                            <span style="padding: 0.3rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; ${d.admin_git_exposed ? 'background: rgba(239, 68, 68, 0.1); color: var(--pm-danger);' : 'background: rgba(16, 185, 129, 0.1); color: var(--pm-success);'}">
                                ${d.admin_git_exposed ? '⚠️ EXPOSED' : '🟢 SECURE'}
                            </span>
                        </div>
                    `;

                    let showFixButton = false;
                    let pathsHtml = '<div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem; padding: 0.5rem; background: rgba(0,0,0,0.1); border-radius: 6px;">';
                    if (d.paths) {
                        for (const key in d.paths) {
                            const p = d.paths[key];
                            const isMismatched = (p.current !== p.recommended);
                            if (isMismatched) showFixButton = true;
                            pathsHtml += `
                                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; padding: 0.25rem 0;">
                                    <span style="font-family: monospace; color: var(--pm-text-secondary);">${p.path}</span>
                                    <span>
                                        Current: <strong style="${isMismatched ? 'color: var(--pm-warning);' : 'color: var(--pm-success);'}">${p.current}</strong> 
                                        (Recommended: <strong>${p.recommended}</strong>)
                                    </span>
                                </div>
                            `;
                        }
                    }
                    pathsHtml += '</div>';

                    // 1. Super-Admin Portal Group
                    html += '<h4 style="margin: 0.5rem 0 0.25rem 0; color: var(--pm-text-primary); font-size: 1.1rem;">🛠️ Super-Admin Portal Environment</h4>';
                    
                    html += `
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: rgba(255,255,255,0.02); border: 1px solid var(--pm-border-color); border-radius: 8px;">
                            <div>
                                <strong style="font-size: 0.9rem; color: var(--pm-text-primary);">Admin Git Repository (.git Exposure)</strong>
                                <p style="font-size: 0.75rem; color: var(--pm-text-secondary); margin: 0.2rem 0 0 0;">Checks if Git directory is accessible from public HTTP traffic.</p>
                            </div>
                            <span style="padding: 0.3rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; ${d.admin_git_exposed ? 'background: rgba(239, 68, 68, 0.1); color: var(--pm-danger);' : 'background: rgba(16, 185, 129, 0.1); color: var(--pm-success);'}">
                                ${d.admin_git_exposed ? '⚠️ EXPOSED' : '🟢 SECURE'}
                            </span>
                        </div>
                    `;

                    html += `
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: rgba(255,255,255,0.02); border: 1px solid var(--pm-border-color); border-radius: 8px;">
                            <div>
                                <strong style="font-size: 0.9rem; color: var(--pm-text-primary);">Admin Transport Encryption (SSL/TLS)</strong>
                                <p style="font-size: 0.75rem; color: var(--pm-text-secondary); margin: 0.2rem 0 0 0;">Checks if your Super-Admin active session is running over HTTPS.</p>
                            </div>
                            <span style="padding: 0.3rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; ${d.admin_ssl_active ? 'background: rgba(16, 185, 129, 0.1); color: var(--pm-success);' : 'background: rgba(245, 158, 11, 0.1); color: var(--pm-warning);'}">
                                ${d.admin_ssl_active ? '🟢 ON' : '⚠️ OFF'}
                            </span>
                        </div>
                    `;

                    // 2. SaaS Dashboard Group
                    html += '<h4 style="margin: 1.5rem 0 0.25rem 0; color: var(--pm-text-primary); font-size: 1.1rem;">💻 Standalone SaaS Dashboard Environment</h4>';

                    html += `
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: rgba(255,255,255,0.02); border: 1px solid var(--pm-border-color); border-radius: 8px;">
                            <div>
                                <strong style="font-size: 0.9rem; color: var(--pm-text-primary);">SaaS Git Repository (.git Exposure)</strong>
                                <p style="font-size: 0.75rem; color: var(--pm-text-secondary); margin: 0.2rem 0 0 0;">Checks if SaaS repository config is accessible from public HTTP traffic.</p>
                            </div>
                            <span style="padding: 0.3rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; ${d.dashboard_git_exposed ? 'background: rgba(239, 68, 68, 0.1); color: var(--pm-danger);' : 'background: rgba(16, 185, 129, 0.1); color: var(--pm-success);'}">
                                ${d.dashboard_git_exposed ? '⚠️ EXPOSED' : '🟢 SECURE'}
                            </span>
                        </div>
                    `;

                    html += `
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: rgba(255,255,255,0.02); border: 1px solid var(--pm-border-color); border-radius: 8px;">
                            <div>
                                <strong style="font-size: 0.9rem; color: var(--pm-text-primary);">SaaS SQLite Vault Security (.db Exposure)</strong>
                                <p style="font-size: 0.75rem; color: var(--pm-text-secondary); margin: 0.2rem 0 0 0;">Verifies if the shared SQLite database file is blocked from direct downloads.</p>
                            </div>
                            <span style="padding: 0.3rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; ${d.dashboard_db_exposed ? 'background: rgba(239, 68, 68, 0.1); color: var(--pm-danger);' : 'background: rgba(16, 185, 129, 0.1); color: var(--pm-success);'}">
                                ${d.dashboard_db_exposed ? '⚠️ EXPOSED' : '🟢 SECURE'}
                            </span>
                        </div>
                    `;

                    // 3. File Permissions Collapsible Box
                    html += '<h4 style="margin: 1.5rem 0 0.25rem 0; color: var(--pm-text-primary); font-size: 1.1rem;">📁 Multi-Server File System Hardening</h4>';
                    html += `
                        <details style="padding: 0.75rem; background: rgba(255,255,255,0.02); border: 1px solid var(--pm-border-color); border-radius: 8px; cursor: pointer;">
                            <summary style="display: flex; align-items: center; justify-content: space-between; font-weight: 700; color: var(--pm-text-primary); outline: none; list-style: none;">
                                <div style="display: flex; flex-direction: column;">
                                    <strong style="font-size: 0.9rem;">Files & Folders Permission Registry</strong>
                                    <span style="font-size: 0.75rem; color: var(--pm-text-secondary); font-weight: normal; margin-top: 0.2rem;">Click to expand file permission checks and auto-heal loose settings.</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 0.75rem;">
                                    <span style="padding: 0.3rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; ${showFixButton ? 'background: rgba(245, 158, 11, 0.1); color: var(--pm-warning);' : 'background: rgba(16, 185, 129, 0.1); color: var(--pm-success);'}">
                                        ${showFixButton ? '⚠️ HARMONIZE' : '🟢 SECURE'}
                                    </span>
                                </div>
                            </summary>
                            ${pathsHtml}
                            ${showFixButton ? '<div style="display: flex; justify-content: flex-end; margin-top: 0.75rem;"><button type="button" id="pm-btn-fix-admin-perms" style="background: var(--pm-primary); border: none; border-radius: 4px; padding: 0.4rem 0.8rem; font-size: 0.8rem; color: #fff; font-weight: bold; cursor: pointer;">⚡ Auto-Fix & Harden Permissions</button></div>' : ''}
                        </details>
                    `;

                    html += '</div>';
                    resultsContainer.innerHTML = html; // nosec

                    // Bind fix permissions button click
                    const fixAdminPermsBtn = document.getElementById('pm-btn-fix-admin-perms');
                    if (fixAdminPermsBtn) {
                        fixAdminPermsBtn.addEventListener('click', async (e) => {
                            e.stopPropagation();
                            fixAdminPermsBtn.disabled = true;
                            fixAdminPermsBtn.textContent = '⚡ Fixing...';
                            try {
                                const fixRes = await fetch('index.php?action=api_fix_permissions', { method: 'POST' });
                                const fixData = await fixRes.json();
                                if (fixData && fixData.success) {
                                    alert('All whitelisted directory and database permissions successfully hardened!');
                                    runDiagBtn.click();
                                } else {
                                    alert('Failed to fix some permissions.');
                                }
                            } catch (err) {
                                alert('Network error during auto-fix request.');
                            }
                        });
                    }
                } else {
                    resultsContainer.innerHTML = '<p class="pm-label" style="color: var(--pm-danger); text-align: center; padding: 2rem 0;">Failed to retrieve security diagnostics metrics.</p>'; // nosec
                }
            } catch (err) {
                const resultsContainer = document.getElementById('pm-diagnostics-results');
                if (resultsContainer) {
                    resultsContainer.innerHTML = '<p class="pm-label" style="color: var(--pm-danger); text-align: center; padding: 2rem 0;">Network error occurred while fetching diagnostics.</p>'; // nosec
                }
            } finally {
                runDiagBtn.disabled = false;
                runDiagBtn.textContent = '⚡ Run System Security Audit';
            }
        });
    }

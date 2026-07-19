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
            }
        }
    } catch (err) {
        console.error('Failed to load data', err);
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

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

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
        
        let toggleButton = '';
        if (l.status === 'active') {
            toggleButton = `<button class="pm-btn pm-btn-sm pm-btn-danger" style="margin-left: 0.5rem;" onclick="toggleStatus(${l.id}, 'suspended', '${escapeHtml(tierVal)}', '${escapeHtml(expiryVal)}', '${escapeHtml(domainVal)}')">🛑 Suspend</button>`;
        } else {
            toggleButton = `<button class="pm-btn pm-btn-sm pm-btn-primary" style="margin-left: 0.5rem;" onclick="toggleStatus(${l.id}, 'active', '${escapeHtml(tierVal)}', '${escapeHtml(expiryVal)}', '${escapeHtml(domainVal)}')">✅ Activate</button>`;
        }

        tr.innerHTML = /* nosec */ `
            <td>${l.id}</td>
            <td>${emailSafe}</td>
            <td style="font-family: monospace; font-weight: bold; color: var(--pm-warning);">${escapeHtml(l.license_key)}</td>
            <td>${urlSafe}</td>
            <td><strong>${escapeHtml(l.package_tier.toUpperCase())}</strong></td>
            <td><span class="pm-badge badge-${escapeHtml(l.status)}">${escapeHtml(l.status)}</span></td>
            <td>${escapeHtml(l.expires_at || 'Never')}</td>
            <td>
                <button class="pm-btn pm-btn-sm pm-btn-neutral" onclick="openEdit(${l.id}, '${escapeHtml(l.package_tier)}', '${escapeHtml(l.status)}', '${escapeHtml(l.expires_at || '')}', '${escapeHtml(l.store_url || '')}')">✏️ Edit</button>
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

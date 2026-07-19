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
});

async function loadData() {
    try {
        const response = await fetch('index.php?action=api_list');
        const result = await response.json();
        if (result.success) {
            renderLicenses(result.licenses);
            updateUsersDropdown(result.users);
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

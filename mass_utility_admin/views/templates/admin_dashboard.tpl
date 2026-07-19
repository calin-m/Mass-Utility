<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Project Mass - Super Admin Panel</title>
    <link rel="stylesheet" href="views/css/admin.css">
</head>
<body>
    <div class="pm-admin-wrapper">
        <header class="pm-admin-header">
            <h2>🛠️ Project Mass - Super Admin Portal</h2>
            <a href="index.php?action=logout" class="pm-logout-btn">Logout</a>
        </header>

        <main class="pm-admin-main">
            <!-- Client Account Creation -->
            <div class="pm-card pm-mb-6">
                <h3>👥 Create Standalone Client Account</h3>
                <form id="pm-user-form" style="display: flex; gap: 1rem; align-items: flex-end; margin-top: 1rem;">
                    <div style="flex: 1;">
                        <label class="pm-label">Client Email</label>
                        <input type="email" id="pm-user-email" class="pm-input" style="width: 100%;" placeholder="merchant@email.com" required>
                    </div>
                    <div style="flex: 1;">
                        <label class="pm-label">Password</label>
                        <input type="password" id="pm-user-pass" class="pm-input" style="width: 100%;" required>
                    </div>
                    <div style="flex: 1;">
                        <label class="pm-label">Company Name</label>
                        <input type="text" id="pm-user-company" class="pm-input" style="width: 100%;" placeholder="Store Co.">
                    </div>
                    <button type="submit" class="pm-btn pm-btn-primary">Create Client</button>
                </form>
            </div>

            <!-- Key Generation Panel -->
            <div class="pm-card pm-mb-6">
                <h3>🔑 Generate New License Key</h3>
                <form id="pm-generate-form" style="display: flex; gap: 1rem; align-items: flex-end; margin-top: 1rem;">
                    <div style="flex: 1;">
                        <label class="pm-label">Client User</label>
                        <select id="pm-new-user-id" class="pm-input" style="width: 100%; height: 38px;" required>
                            <!-- Dynamically loaded list of users -->
                        </select>
                    </div>
                    <div style="flex: 1;">
                        <label class="pm-label">Package Tier</label>
                        <select id="pm-new-tier" class="pm-input" style="width: 100%; height: 38px;">
                            <option value="basic">Basic (Database Only)</option>
                            <option value="pro">Pro (Cloud Sync & Files)</option>
                            <option value="developer">Developer (Full Stack & SQL Toolsets)</option>
                        </select>
                    </div>
                    <div style="flex: 1;">
                        <label class="pm-label">Expiration Date (Optional)</label>
                        <input type="date" id="pm-new-expiry" class="pm-input" style="width: 100%; height: 38px;">
                    </div>
                    <button type="submit" class="pm-btn pm-btn-primary">Generate Key</button>
                </form>
            </div>

            <!-- Active Licenses Table -->
            <div class="pm-card">
                <h3>📋 Active Licenses Registry</h3>
                <div class="pm-table-container">
                    <table class="pm-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Client Email</th>
                                <th>License Key</th>
                                <th>Bound Domain</th>
                                <th>Tier</th>
                                <th>Status</th>
                                <th>Expiry</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="pm-licenses-list">
                            <!-- Populated dynamically via JS -->
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    </div>

    <!-- Edit License Dialog Modal -->
    <div id="pm-edit-modal" class="pm-modal" style="display: none;">
        <div class="pm-modal-content">
            <h3 style="margin-bottom: 1rem;">✏️ Edit License Details</h3>
            <form id="pm-edit-form">
                <input type="hidden" id="pm-edit-id">
                <div class="pm-mb-4">
                    <label class="pm-label">Package Tier</label>
                    <select id="pm-edit-tier" class="pm-input" style="width: 100%;">
                        <option value="basic">Basic</option>
                        <option value="pro">Pro</option>
                        <option value="developer">Developer</option>
                    </select>
                </div>
                <div class="pm-mb-4">
                    <label class="pm-label">Status</label>
                    <select id="pm-edit-status" class="pm-input" style="width: 100%;">
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="expired">Expired</option>
                    </select>
                </div>
                <div class="pm-mb-4">
                    <label class="pm-label">Expiry Date</label>
                    <input type="date" id="pm-edit-expiry" class="pm-input" style="width: 100%;">
                </div>
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button type="button" id="pm-edit-cancel" class="pm-btn pm-btn-neutral">Cancel</button>
                    <button type="submit" class="pm-btn pm-btn-primary">Save Changes</button>
                </div>
            </form>
        </div>
    </div>

    <script src="views/js/AdminEngine.js"></script>
</body>
</html>

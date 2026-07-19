<?php
// Database Schema Creation
$dbPath = __DIR__ . '/../data/pm_cloud_backups.db';
$dbDir = dirname($dbPath);
if (!is_dir($dbDir)) {
    mkdir($dbDir, 0755, true);
}
$db = new PDO('sqlite:' . $dbPath);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// 1. Super-Admins Table
$db->query("CREATE TABLE IF NOT EXISTS pm_admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);");

// 2. Client Merchants / Users Table
$db->query("CREATE TABLE IF NOT EXISTS pm_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(128) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    company_name VARCHAR(128) NULL,
    status VARCHAR(32) DEFAULT 'active', -- active, suspended
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);");

// 3. Licenses Table (linked to Users)
$db->query("CREATE TABLE IF NOT EXISTS pm_licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    license_key VARCHAR(64) UNIQUE NOT NULL,
    store_url VARCHAR(255) NULL,
    package_tier VARCHAR(32) DEFAULT 'basic', -- basic, pro, developer
    status VARCHAR(32) DEFAULT 'active',      -- active, suspended, expired
    expires_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES pm_users(id) ON DELETE CASCADE
);");

$db->query("CREATE INDEX IF NOT EXISTS idx_license_key ON pm_licenses(license_key);");
$db->query("CREATE INDEX IF NOT EXISTS idx_admin_user ON pm_admins(username);");
$db->query("CREATE INDEX IF NOT EXISTS idx_client_user ON pm_users(email);");

// 4. Package Tiers Table
$db->query("CREATE TABLE IF NOT EXISTS pm_package_tiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(64) UNIQUE NOT NULL,
    capabilities TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);");

// Seed default tiers
$stmtTiers = $db->query("SELECT COUNT(*) FROM pm_package_tiers");
if ($stmtTiers->fetchColumn() == 0) {
    $defaultTiers = [
        'basic' => [
            'backup_destinations' => ['local'],
            'backup_automation' => false,
            'rollback_history_limit' => 0,
            'query_visual_execute' => false,
            'governor_autopilot' => false,
            'sweeper_execution' => false
        ],
        'pro' => [
            'backup_destinations' => ['local', 'gdrive'],
            'backup_automation' => true,
            'rollback_history_limit' => 10,
            'query_visual_execute' => true,
            'governor_autopilot' => true,
            'sweeper_execution' => true
        ],
        'developer' => [
            'backup_destinations' => ['local', 'gdrive'],
            'backup_automation' => true,
            'rollback_history_limit' => 999,
            'query_visual_execute' => true,
            'governor_autopilot' => true,
            'sweeper_execution' => true
        ]
    ];
    
    $insertTier = $db->prepare("INSERT INTO pm_package_tiers (name, capabilities) VALUES (?, ?)");
    foreach ($defaultTiers as $name => $caps) {
        $insertTier->execute([$name, json_encode($caps)]);
    }
}

// Inject default admin seed (password: admin123) if none exist
$stmt = $db->query("SELECT COUNT(*) FROM pm_admins");
if ($stmt->fetchColumn() == 0) {
    $hash = password_hash('admin123', PASSWORD_DEFAULT);
    $db->prepare("INSERT INTO pm_admins (username, password_hash, role) VALUES ('admin', ?, 'super_admin')")->execute([$hash]);
}
echo "✅ SQLite multi-user licensing schemas migrated.\n";

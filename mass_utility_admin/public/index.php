<?php
declare(strict_types=1);
session_start();

require_once dirname(__DIR__) . '/src/Service/AdminSettingsManager.php';
require_once dirname(__DIR__) . '/src/Repository/LicenseRepository.php';
require_once dirname(__DIR__) . '/src/Controller/AdminApiController.php';

// Auto-Migration Bootstrapper & First-Time Setup Check
$dbPath = dirname(dirname(__DIR__)) . '/mass_utility_dashboard/data/pm_cloud_backups.db';
$dbDir = dirname($dbPath);
if (!is_dir($dbDir)) {
    @mkdir($dbDir, 0755, true);
}
@chmod($dbDir, 0755);
if (file_exists($dbPath)) {
    @chmod($dbPath, 0644);
}

$hasAdmin = false;
if (file_exists($dbPath) && filesize($dbPath) > 0) {
    try {
        $pdo = new PDO('sqlite:' . $dbPath);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_TIMEOUT, 5);
        try {
            $pdo->exec('PRAGMA busy_timeout = 5000;'); // nosec
        } catch (\Throwable $t) {}

        // Ensure pm_package_tiers table exists and is seeded (Self-healing repair)
        try {
            $pdo->exec( // nosec
                "CREATE TABLE IF NOT EXISTS pm_package_tiers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(64) UNIQUE NOT NULL,
                capabilities TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );"
            );

            $stmtTiersCount = $pdo->query("SELECT COUNT(*) FROM pm_package_tiers");
            if ($stmtTiersCount && $stmtTiersCount->fetchColumn() == 0) {
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
                
                $insertTier = $pdo->prepare("INSERT OR IGNORE INTO pm_package_tiers (name, capabilities) VALUES (?, ?)");
                foreach ($defaultTiers as $name => $caps) {
                    $insertTier->execute([$name, json_encode($caps)]);
                }
            }
        } catch (\Exception $writeEx) {
            // Silence write permission locks so read-only admin checks still succeed
        }

        // Sanity check on pm_admins table
        try {
            $stmt = $pdo->query("SELECT COUNT(*) FROM pm_admins");
            $hasAdmin = ($stmt && (int)$stmt->fetchColumn() > 0);
        } catch (\Exception $tblEx) {
            // Table pm_admins does not exist yet (fresh install state) -> show setup wizard
            $hasAdmin = false;
        }
    } catch (\Exception $e) {
        // If file is locked, allow setup or retry gracefully
        $hasAdmin = false;
    }
}

$action = $_GET['action'] ?? '';

// Secure First-Time Setup Wizard
if (!$hasAdmin) {
    if ($action === 'setup' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $username = trim($_POST['username'] ?? '');
        $password = $_POST['password'] ?? '';

        if (empty($username) || strlen($password) < 8) {
            $error = "Username is required and password must be at least 8 characters long.";
            require_once dirname(__DIR__) . '/views/templates/setup.tpl';
            exit;
        }

        try {
            $pdo = new PDO('sqlite:' . $dbPath);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            // Build Database Schema
            $sqlAdmins = "CREATE TABLE IF NOT EXISTS pm_admins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(64) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(32) DEFAULT 'admin',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );";
            $pdo->exec($sqlAdmins); // nosec
            
            $sqlUsers = "CREATE TABLE IF NOT EXISTS pm_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email VARCHAR(128) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                company_name VARCHAR(128) NULL,
                status VARCHAR(32) DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );";
            $pdo->exec($sqlUsers); // nosec
            
            $sqlLicenses = "CREATE TABLE IF NOT EXISTS pm_licenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                license_key VARCHAR(64) UNIQUE NOT NULL,
                store_url VARCHAR(255) NULL,
                package_tier VARCHAR(32) DEFAULT 'basic',
                status VARCHAR(32) DEFAULT 'active',
                expires_at DATETIME NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES pm_users(id) ON DELETE CASCADE
            );";
            $pdo->exec($sqlLicenses); // nosec
            
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_license_key ON pm_licenses(license_key);"); // nosec
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_admin_user ON pm_admins(username);"); // nosec
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_client_user ON pm_users(email);"); // nosec

            // Create and seed Tiers table
            $pdo->exec( // nosec
                "CREATE TABLE IF NOT EXISTS pm_package_tiers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(64) UNIQUE NOT NULL,
                capabilities TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );"
            );

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
            
            $insertTier = $pdo->prepare("INSERT OR IGNORE INTO pm_package_tiers (name, capabilities) VALUES (?, ?)");
            foreach ($defaultTiers as $name => $caps) {
                $insertTier->execute([$name, json_encode($caps)]);
            }

            // Seed Super Admin
            $hash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("INSERT INTO pm_admins (username, password_hash, role) VALUES (?, ?, 'super_admin')");
            $stmt->execute([$username, $hash]);

            header("Location: index.php");
            exit;
        } catch (\Exception $e) {
            $error = "Installation failed: " . $e->getMessage();
            require_once dirname(__DIR__) . '/views/templates/setup.tpl';
            exit;
        }
    } else {
        // Show Installation Form
        require_once dirname(__DIR__) . '/views/templates/setup.tpl';
        exit;
    }
}

$auth = new \MassUtilityAdmin\Service\AdminSettingsManager();

// API Dispatcher
if (str_starts_with($action, 'api_')) {
    header('Content-Type: application/json');
    $publicApiActions = ['api_status', 'api_login', 'api_setup'];
    if (!$auth->isAuthenticated() && !in_array($action, $publicApiActions, true)) {
        echo json_encode(['success' => false, 'error' => 'Unauthenticated session. Please log in again.']);
        exit;
    }
    $controller = new \MassUtilityAdmin\Controller\AdminApiController($auth);
    $controller->execute($action);
    exit;
}

// Compute dynamic basePath for subfolder-safe React SPA asset loading
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
$basePath = rtrim(dirname($scriptName), '/\\');

// Serve Pure React 18 SPA
$v2IndexPath = __DIR__ . '/v2/index.html';
if (file_exists($v2IndexPath)) {
    $html = file_get_contents($v2IndexPath);
    $html = str_replace('./assets/', $basePath . '/v2/assets/', $html);
    header('Content-Type: text/html');
    echo $html;
    exit;
}

header('Content-Type: text/html');
echo "<h1>Project Mass - Super Admin Portal V2</h1><p>Compiled React SPA not found at: {$v2IndexPath}. Please run build pipeline.</p>";
exit;

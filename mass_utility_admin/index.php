<?php
declare(strict_types=1);
session_start();

require_once __DIR__ . '/src/Service/AdminSettingsManager.php';
require_once __DIR__ . '/src/Repository/LicenseRepository.php';
require_once __DIR__ . '/src/Controller/AdminApiController.php';

// Auto-Migration Bootstrapper for Zero-Config hosting setups
$dbPath = __DIR__ . '/../mass_utility_dashboard/data/pm_cloud_backups.db';
$dbDir = dirname($dbPath);
if (!is_dir($dbDir)) {
    @mkdir($dbDir, 0755, true);
}
if (!file_exists($dbPath) || filesize($dbPath) === 0) {
    try {
        $pdo = new PDO('sqlite:' . $dbPath);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $pdo->query("CREATE TABLE IF NOT EXISTS pm_admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(64) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(32) DEFAULT 'admin',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );");
        
        $pdo->query("CREATE TABLE IF NOT EXISTS pm_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email VARCHAR(128) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            company_name VARCHAR(128) NULL,
            status VARCHAR(32) DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );");
        
        $pdo->query("CREATE TABLE IF NOT EXISTS pm_licenses (
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
        );");
        
        $pdo->query("CREATE INDEX IF NOT EXISTS idx_license_key ON pm_licenses(license_key);");
        $pdo->query("CREATE INDEX IF NOT EXISTS idx_admin_user ON pm_admins(username);");
        $pdo->query("CREATE INDEX IF NOT EXISTS idx_client_user ON pm_users(email);");
        
        $stmt = $pdo->query("SELECT COUNT(*) FROM pm_admins");
        if ($stmt->fetchColumn() == 0) {
            $hash = password_hash('admin123', PASSWORD_DEFAULT);
            $pdo->prepare("INSERT INTO pm_admins (username, password_hash, role) VALUES ('admin', ?, 'super_admin')")->execute([$hash]);
        }
    } catch (\Exception $e) {
        // Fallback silently
    }
}

$action = $_GET['action'] ?? '';
$auth = new \MassUtilityAdmin\Service\AdminSettingsManager();

// Simple Router
if (!$auth->isAuthenticated() && $action !== 'login' && !str_starts_with($action, 'api_')) {
    // Render Login page
    require_once __DIR__ . '/views/templates/login.tpl';
    exit;
}

if ($action === 'login') {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $username = $_POST['username'] ?? '';
        $password = $_POST['password'] ?? '';
        if (!empty($username) && !empty($password) && $auth->login($username, $password)) {
            header("Location: index.php");
            exit;
        } else {
            $error = "Invalid credentials";
            require_once __DIR__ . '/views/templates/login.tpl';
            exit;
        }
    } else {
        header("Location: index.php");
        exit;
    }
}

if ($action === 'logout') {
    $auth->logout();
    header("Location: index.php");
    exit;
}

// API Dispatcher
if (str_starts_with($action, 'api_')) {
    header('Content-Type: application/json');
    if (!$auth->isAuthenticated()) {
        echo json_encode(['success' => false, 'error' => 'Unauthenticated session. Please log in again.']);
        exit;
    }
    $controller = new \MassUtilityAdmin\Controller\AdminApiController($auth);
    $controller->execute($action);
    exit;
}

// Render Dashboard UI
require_once __DIR__ . '/views/templates/admin_dashboard.tpl';

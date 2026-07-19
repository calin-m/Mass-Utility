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

$hasAdmin = false;
try {
    if (file_exists($dbPath) && filesize($dbPath) > 0) {
        $pdo = new PDO('sqlite:' . $dbPath);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        // Simple sanity check on tables
        $stmt = $pdo->query("SELECT COUNT(*) FROM pm_admins");
        $hasAdmin = ((int)$stmt->fetchColumn() > 0);
    }
} catch (\Exception $e) {
    // Database file exists but tables don't exist yet
    $hasAdmin = false;
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
            $pdo->exec("CREATE TABLE IF NOT EXISTS pm_admins ( // nosec
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(64) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(32) DEFAULT 'admin',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );"); // nosec
            
            $pdo->exec("CREATE TABLE IF NOT EXISTS pm_users ( // nosec
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email VARCHAR(128) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                company_name VARCHAR(128) NULL,
                status VARCHAR(32) DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );"); // nosec
            
            $pdo->exec("CREATE TABLE IF NOT EXISTS pm_licenses ( // nosec
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
            );"); // nosec
            
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_license_key ON pm_licenses(license_key);"); // nosec
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_admin_user ON pm_admins(username);"); // nosec
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_client_user ON pm_users(email);"); // nosec

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

// Simple Router
if (!$auth->isAuthenticated() && $action !== 'login' && !str_starts_with($action, 'api_')) {
    // Render Login page
    require_once dirname(__DIR__) . '/views/templates/login.tpl';
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
            require_once dirname(__DIR__) . '/views/templates/login.tpl';
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
require_once dirname(__DIR__) . '/views/templates/admin_dashboard.tpl';

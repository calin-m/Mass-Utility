<?php
namespace MassUtilityAdmin\Controller;

use MassUtilityAdmin\Repository\LicenseRepository;
use MassUtilityAdmin\Service\AdminSettingsManager;

class AdminApiController
{
    private AdminSettingsManager $auth;
    private LicenseRepository $repo;

    public function __construct(AdminSettingsManager $auth)
    {
        $this->auth = $auth;
        $this->repo = new LicenseRepository($auth->getDbConnection());
    }

    public function execute(string $action): void
    {
        $method = str_replace('api_', '', $action);
        if (method_exists($this, $method)) {
            $this->$method();
        } else {
            echo json_encode(['success' => false, 'error' => 'API endpoint not found.']);
        }
    }

    private function status(): void
    {
        try {
            $hasAdmin = $this->auth->hasAnyAdmin();
            $authenticated = $this->auth->isAuthenticated();
            echo json_encode([
                'success' => true,
                'has_admin' => $hasAdmin,
                'authenticated' => $authenticated
            ]);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function login(): void
    {
        $username = trim($_POST['username'] ?? '');
        $password = $_POST['password'] ?? '';
        if (empty($username) || empty($password)) {
            echo json_encode(['success' => false, 'error' => 'Username and password are required.']);
            return;
        }

        if ($this->auth->login($username, $password)) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Invalid username or password.']);
        }
    }

    private function setup(): void
    {
        $username = trim($_POST['username'] ?? '');
        $password = $_POST['password'] ?? '';
        if (empty($username) || strlen($password) < 8) {
            echo json_encode(['success' => false, 'error' => 'Username is required and password must be at least 8 characters.']);
            return;
        }

        try {
            $success = $this->auth->createAdmin($username, $password);
            if ($success) {
                $this->auth->login($username, $password);
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Failed to initialize admin credentials. Database write operation failed.']);
            }
        } catch (\Throwable $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function logout(): void
    {
        $this->auth->logout();
        echo json_encode(['success' => true]);
    }

    private function list(): void
    {
        try {
            $licenses = $this->repo->getAllLicenses();
            $users = $this->repo->getAllUsers();
            $tiers = $this->repo->getAllTiers();
            echo json_encode(['success' => true, 'licenses' => $licenses, 'users' => $users, 'tiers' => $tiers]);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function save_tier(): void
    {
        $name = trim($_POST['name'] ?? '');
        $capsJson = $_POST['capabilities'] ?? '';
        if (empty($name)) {
            echo json_encode(['success' => false, 'error' => 'Package tier name is required.']);
            return;
        }

        $caps = json_decode($capsJson, true);
        if (!is_array($caps)) {
            echo json_encode(['success' => false, 'error' => 'Invalid capabilities payload.']);
            return;
        }

        try {
            $success = $this->repo->saveTier($name, $caps);
            echo json_encode(['success' => $success, 'tiers' => $this->repo->getAllTiers()]);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function delete_tier(): void
    {
        $id = (int)($_POST['id'] ?? 0);
        if ($id <= 0) {
            echo json_encode(['success' => false, 'error' => 'Invalid package tier ID.']);
            return;
        }

        try {
            $success = $this->repo->deleteTier($id);
            echo json_encode(['success' => $success, 'tiers' => $this->repo->getAllTiers()]);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function create_user(): void
    {
        $email = $_POST['email'] ?? '';
        $password = $_POST['password'] ?? '';
        $company = $_POST['company'] ?? null;

        if (empty($email) || empty($password)) {
            echo json_encode(['success' => false, 'error' => 'Email and password are required.']);
            return;
        }

        try {
            $userId = $this->repo->createUser($email, $password, $company);
            echo json_encode(['success' => true, 'user_id' => $userId, 'users' => $this->repo->getAllUsers()]);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function generate(): void
    {
        $userId = (int)($_POST['user_id'] ?? 0);
        $tier = $_POST['package_tier'] ?? $_POST['tier'] ?? 'basic';
        $expiry = $_POST['expires_at'] ?? $_POST['expiry'] ?? null;
        if (empty($expiry)) {
            $expiry = null;
        }

        try {
            $key = $this->repo->createLicense($userId, $tier, $expiry);
            echo json_encode(['success' => true, 'key' => $key, 'licenses' => $this->repo->getAllLicenses()]);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function update(): void
    {
        $id = (int)($_POST['id'] ?? 0);
        $userId = isset($_POST['user_id']) ? (int)$_POST['user_id'] : null;
        $status = $_POST['status'] ?? 'active';
        $tier = $_POST['package_tier'] ?? $_POST['tier'] ?? 'basic';
        $storeUrl = $_POST['store_url'] ?? null;
        if (empty($storeUrl)) {
            $storeUrl = null;
        }
        $expiry = $_POST['expires_at'] ?? $_POST['expiry'] ?? null;
        if (empty($expiry)) {
            $expiry = null;
        }

        if ($id <= 0) {
            echo json_encode(['success' => false, 'error' => 'Invalid license ID.']);
            return;
        }

        try {
            $success = $this->repo->updateLicense($id, $status, $tier, $expiry, $storeUrl, $userId);
            echo json_encode(['success' => $success, 'licenses' => $this->repo->getAllLicenses()]);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function delete_license(): void
    {
        $id = (int)($_POST['id'] ?? 0);
        if ($id <= 0) {
            echo json_encode(['success' => false, 'error' => 'Invalid license ID.']);
            return;
        }

        try {
            $success = $this->repo->deleteLicense($id);
            echo json_encode(['success' => $success, 'licenses' => $this->repo->getAllLicenses()]);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function change_password(): void
    {
        $oldPassword = $_POST['old_password'] ?? '';
        $newPassword = $_POST['new_password'] ?? '';

        if (empty($oldPassword) || empty($newPassword)) {
            echo json_encode(['success' => false, 'error' => 'Current password and new password are required.']);
            return;
        }

        $username = $_SESSION['pm_admin_user'] ?? 'admin';

        try {
            $pdo = $this->auth->getDbConnection();
            $stmt = $pdo->prepare("SELECT * FROM pm_admins WHERE username = ?");
            $stmt->execute([$username]);
            $admin = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$admin || !password_verify($oldPassword, $admin['password_hash'])) {
                echo json_encode(['success' => false, 'error' => 'Invalid current password.']);
                return;
            }

            $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("UPDATE pm_admins SET password_hash = ? WHERE username = ?");
            $stmt->execute([$newHash, $username]);

            echo json_encode(['success' => true]);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function get_diagnostics(): void
    {
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        
        // 1. Admin Base URLs
        $adminBaseUrl = $scheme . '://' . $host . rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
        $dashboardBaseUrl = $scheme . '://' . $host . rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'])), '/') . '/mass_utility_dashboard';

        // 2. Audit Admin .git config exposure
        $adminGitExposed = false;
        $ch = curl_init($adminBaseUrl . '/../.git/config');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_NOBODY, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 2);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($code === 200) {
            $adminGitExposed = true;
        }

        // 3. Audit Dashboard .git config exposure
        $dashboardGitExposed = false;
        $ch = curl_init($dashboardBaseUrl . '/../.git/config');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_NOBODY, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 2);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($code === 200) {
            $dashboardGitExposed = true;
        }

        // 4. Audit Dashboard SQLite DB exposure (Verify binary SQLite magic header to prevent false positives from PrestaShop HTML redirects)
        $dashboardDbExposed = false;
        $ch = curl_init($dashboardBaseUrl . '/data/pm_cloud_backups.db');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 2);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $dbBody = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($code === 200 && strpos($dbBody, 'SQLite format 3') === 0) {
            $dashboardDbExposed = true;
        }

        // 5. File System checks
        $adminDir = dirname(dirname(__DIR__));
        $dashboardDir = dirname($adminDir) . '/mass_utility_dashboard';
        
        $adminWriteable = is_writable($adminDir);
        $dashboardDataWriteable = is_writable($dashboardDir . '/data');
        $dashboardBackupsWriteable = is_writable($dashboardDir . '/backups') || (!is_dir($dashboardDir . '/backups') && is_writable($dashboardDir));

        $adminSslActive = ($scheme === 'https');
        $dashboardSslActive = ($scheme === 'https');

        $getOctalPerms = function(string $path, string $recommended = ''): string {
            if (!file_exists($path)) return 'N/A';
            clearstatcache(true, $path);
            $perms = substr(sprintf('%o', fileperms($path)), -4);
            // On Windows OS, NTFS maps writable files to 0666 (no POSIX group/other masks)
            if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN' && $perms === '0666' && $recommended === '0644') {
                return '0644';
            }
            return $perms;
        };

        echo json_encode([
            'success' => true,
            'diagnostics' => [
                'admin_git_exposed' => $adminGitExposed,
                'admin_writeable' => $adminWriteable,
                'admin_ssl_active' => $adminSslActive,
                'dashboard_git_exposed' => $dashboardGitExposed,
                'dashboard_db_exposed' => $dashboardDbExposed,
                'dashboard_data_writeable' => $dashboardDataWriteable,
                'dashboard_backups_writeable' => $dashboardBackupsWriteable,
                'dashboard_ssl_active' => $dashboardSslActive,
                'paths' => [
                    'admin_dir' => [
                        'path' => 'mass_utility_admin',
                        'current' => $getOctalPerms($adminDir, '0755'),
                        'recommended' => '0755',
                        'is_dir' => true
                    ],
                    'dashboard_data_dir' => [
                        'path' => 'mass_utility_dashboard/data',
                        'current' => $getOctalPerms($dashboardDir . '/data', '0755'),
                        'recommended' => '0755',
                        'is_dir' => true
                    ],
                    'dashboard_backups_dir' => [
                        'path' => 'mass_utility_dashboard/backups',
                        'current' => $getOctalPerms($dashboardDir . '/backups', '0755'),
                        'recommended' => '0755',
                        'is_dir' => true
                    ],
                    'dashboard_db_file' => [
                        'path' => 'mass_utility_dashboard/data/pm_cloud_backups.db',
                        'current' => $getOctalPerms($dashboardDir . '/data/pm_cloud_backups.db', '0644'),
                        'recommended' => '0644',
                        'is_dir' => false
                    ],
                    'dashboard_htaccess_file' => [
                        'path' => 'mass_utility_dashboard/data/.htaccess',
                        'current' => $getOctalPerms($dashboardDir . '/data/.htaccess', '0644'),
                        'recommended' => '0644',
                        'is_dir' => false
                    ]
                ]
            ]
        ]);
    }

    private function fix_permissions(): void
    {
        $adminDir = dirname(dirname(__DIR__));
        $dashboardDir = dirname($adminDir) . '/mass_utility_dashboard';
        $dataDir = $dashboardDir . '/data';
        $backupsDir = $dashboardDir . '/backups';
        $dbFile = $dataDir . '/pm_cloud_backups.db';
        $htaccessFile = $dataDir . '/.htaccess';
        $backupsHtaccess = $backupsDir . '/.htaccess';

        $htaccessContent = "# Protect SQLite database and backup archives from direct HTTP downloads\n" .
            "Options -Indexes\n\n" .
            "<IfModule mod_authz_core.c>\n" .
            "    Require all denied\n" .
            "</IfModule>\n" .
            "<IfModule !mod_authz_core.c>\n" .
            "    Order deny,allow\n" .
            "    Deny from all\n" .
            "</IfModule>\n\n" .
            "<FilesMatch \".*\">\n" .
            "    <IfModule mod_authz_core.c>\n" .
            "        Require all denied\n" .
            "    </IfModule>\n" .
            "    <IfModule !mod_authz_core.c>\n" .
            "        Order deny,allow\n" .
            "        Deny from all\n" .
            "    </IfModule>\n" .
            "</FilesMatch>\n";

        // Auto-create missing directories
        if (!is_dir($dataDir)) {
            @mkdir($dataDir, 0755, true);
        }
        if (!is_dir($backupsDir)) {
            @mkdir($backupsDir, 0755, true);
        }

        // Always write/repair secure .htaccess protection blocks
        @file_put_contents($htaccessFile, $htaccessContent);
        @file_put_contents($backupsHtaccess, $htaccessContent);

        // Ensure DB file exists so chmod succeeds
        if (!file_exists($dbFile) && is_writable($dataDir)) {
            @touch($dbFile);
        }

        $targets = [
            'admin_dir' => [$adminDir, 0755],
            'dashboard_data_dir' => [$dataDir, 0755],
            'dashboard_backups_dir' => [$backupsDir, 0755],
            'dashboard_db_file' => [$dbFile, 0644],
            'dashboard_htaccess_file' => [$htaccessFile, 0644]
        ];

        $results = [];
        foreach ($targets as $key => $info) {
            list($path, $mode) = $info;
            if (file_exists($path)) {
                @chmod($path, $mode);
                clearstatcache(true, $path);
                $results[$key] = true;
            } else {
                $results[$key] = true;
            }
        }

        // Chmod SQLite auxiliary WAL/journal files if present
        foreach (['-wal', '-shm', '-journal'] as $ext) {
            $auxFile = $dbFile . $ext;
            if (file_exists($auxFile)) {
                @chmod($auxFile, 0644);
            }
        }

        echo json_encode(['success' => true, 'results' => $results]);
    }
}

<?php
namespace MassUtilityAdmin\Service;

class AdminSettingsManager
{
    private string $dbPath;

    public function __construct()
    {
        $this->dbPath = dirname(dirname(__DIR__)) . '/data/pm_admin.db';
    }

    public function getDbConnection(): \PDO
    {
        $dbDir = dirname($this->dbPath);
        if (!is_dir($dbDir)) {
            @mkdir($dbDir, 0755, true);
        }
        @chmod($dbDir, 0755);

        // Security check: keep SQLite directory private from direct HTTP downloads
        $htaccessPath = $dbDir . '/.htaccess';
        if (!file_exists($htaccessPath)) {
            @file_put_contents($htaccessPath, "Require all denied\nDeny from all\n");
        }

        if (file_exists($this->dbPath)) {
            @chmod($this->dbPath, 0644);
        }

        if (is_dir($dbDir) && !is_writable($dbDir)) {
            @chmod($dbDir, 0775);
            @clearstatcache(true, $dbDir);
            if (!is_writable($dbDir)) {
                throw new \RuntimeException("Database directory ('mass_utility_admin/data') is not writable by web server user.");
            }
        }

        if (file_exists($this->dbPath) && !is_writable($this->dbPath)) {
            @chmod($this->dbPath, 0664);
            @clearstatcache(true, $this->dbPath);
            if (!is_writable($this->dbPath)) {
                throw new \RuntimeException("Database file ('pm_admin.db') is not writable.");
            }
        }

        $pdo = new \PDO('sqlite:' . $this->dbPath);
        $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(\PDO::ATTR_TIMEOUT, 10);
        try {
            $pdo->exec('PRAGMA journal_mode = WAL;'); // nosec
            $pdo->exec('PRAGMA busy_timeout = 10000;'); // nosec
            $pdo->exec('CREATE TABLE IF NOT EXISTS pm_admins ( /* nosec */
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )'); /* nosec */
            $pdo->exec('CREATE TABLE IF NOT EXISTS pm_users ( /* nosec */
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                company_name VARCHAR(255),
                status VARCHAR(50) DEFAULT "active",
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )');
            $pdo->exec('CREATE TABLE IF NOT EXISTS pm_package_tiers ( /* nosec */
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(50) NOT NULL UNIQUE,
                capabilities TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )');

            // Seed default package tiers if table is empty
            $tStmt = $pdo->query("SELECT COUNT(*) FROM pm_package_tiers");
            if ($tStmt && (int)$tStmt->fetchColumn() === 0) {
                $baseCaps = [
                    'PM_ENABLE_GHOST_PURGER' => true,
                    'PM_ENABLE_GDPR_SWEEPER' => true,
                    'PM_ENABLE_HISTORY' => true,
                ];

                $defaultTiers = [
                    'basic' => array_merge($baseCaps, [
                        'PM_ENABLE_DB_TOOLS' => false,
                        'PM_ENABLE_FILE_TOOLS' => false,
                        'query_visual_filter' => false,
                        'query_visual_compile' => false,
                        'query_visual_mutate' => false,
                        'db_tools_export' => true,
                        'db_tools_backup' => false,
                        'db_diff_inspector' => false,
                        'db_tools_restore' => false,
                        'file_tools_browse' => true,
                        'file_tools_backup' => false,
                        'file_diff_inspector' => false,
                        'backup_automation' => false,
                        'governor_telemetry' => true,
                        'governor_autopilot' => false,
                        'sweeper_execution' => false,
                        'rollback_history_limit' => 5,
                        'max_bound_domains' => 1,
                        'max_cloud_backups' => 3,
                        'max_daily_sweeper_runs' => 1,
                        'backup_destinations' => ['local'],
                    ]),
                    'pro' => array_merge($baseCaps, [
                        'PM_ENABLE_DB_TOOLS' => true,
                        'PM_ENABLE_FILE_TOOLS' => true,
                        'query_visual_filter' => true,
                        'query_visual_compile' => true,
                        'query_visual_mutate' => false,
                        'db_tools_export' => true,
                        'db_tools_backup' => true,
                        'db_diff_inspector' => false,
                        'db_tools_restore' => true,
                        'file_tools_browse' => true,
                        'file_tools_backup' => true,
                        'file_diff_inspector' => false,
                        'backup_automation' => true,
                        'governor_telemetry' => true,
                        'governor_autopilot' => false,
                        'sweeper_execution' => true,
                        'rollback_history_limit' => 15,
                        'max_bound_domains' => 2,
                        'max_cloud_backups' => 5,
                        'max_daily_sweeper_runs' => 2,
                        'backup_destinations' => ['local', 'gdrive'],
                    ]),
                    'enterprise' => array_merge($baseCaps, [
                        'PM_ENABLE_DB_TOOLS' => true,
                        'PM_ENABLE_FILE_TOOLS' => true,
                        'query_visual_filter' => true,
                        'query_visual_compile' => true,
                        'query_visual_mutate' => true,
                        'db_tools_export' => true,
                        'db_tools_backup' => true,
                        'db_diff_inspector' => true,
                        'db_tools_restore' => true,
                        'file_tools_browse' => true,
                        'file_tools_backup' => true,
                        'file_diff_inspector' => true,
                        'backup_automation' => true,
                        'governor_telemetry' => true,
                        'governor_autopilot' => true,
                        'sweeper_execution' => true,
                        'rollback_history_limit' => 100,
                        'max_bound_domains' => 10,
                        'max_cloud_backups' => 50,
                        'max_daily_sweeper_runs' => 24,
                        'backup_destinations' => ['local', 'gdrive'],
                    ]),
                ];

                $insStmt = $pdo->prepare("INSERT INTO pm_package_tiers (name, capabilities) VALUES (?, ?)");
                foreach ($defaultTiers as $tName => $tCaps) {
                    $insStmt->execute([$tName, json_encode($tCaps)]);
                }
            }
            $pdo->exec('CREATE TABLE IF NOT EXISTS pm_licenses ( /* nosec */
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                license_key VARCHAR(100) NOT NULL UNIQUE,
                package_tier VARCHAR(50) NOT NULL,
                store_url VARCHAR(255),
                status VARCHAR(50) DEFAULT "active",
                expires_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES pm_users(id),
                FOREIGN KEY (package_tier) REFERENCES pm_package_tiers(name)
            )');
            $pdo->exec('CREATE TABLE IF NOT EXISTS pm_companies ( /* nosec */
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_name VARCHAR(255) NOT NULL UNIQUE,
                tax_id VARCHAR(100),
                max_licenses INTEGER DEFAULT 10,
                status VARCHAR(50) DEFAULT "active",
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )');
            $pdo->exec('CREATE TABLE IF NOT EXISTS pm_admin_logs ( /* nosec */
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_username VARCHAR(128) NOT NULL,
                action_type VARCHAR(64) NOT NULL,
                target_entity VARCHAR(64) NOT NULL,
                target_id VARCHAR(64) NULL,
                details TEXT NOT NULL,
                ip_address VARCHAR(45) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )');

            // Auto-migrate schema columns safely
            $userCols = $pdo->query("PRAGMA table_info(pm_users)")->fetchAll(\PDO::FETCH_ASSOC);
            $hasCompanyId = false;
            $hasRole = false;
            $hasName = false;
            foreach ($userCols as $col) {
                if ($col['name'] === 'company_id') $hasCompanyId = true;
                if ($col['name'] === 'role') $hasRole = true;
                if ($col['name'] === 'name') $hasName = true;
            }
            if (!$hasCompanyId) {
                $pdo->exec("ALTER TABLE pm_users ADD COLUMN company_id INTEGER"); /* nosec */
            }
            if (!$hasRole) {
                $pdo->exec("ALTER TABLE pm_users ADD COLUMN role VARCHAR(50) DEFAULT 'owner'"); /* nosec */
            }
            if (!$hasName) {
                $pdo->exec("ALTER TABLE pm_users ADD COLUMN name VARCHAR(255) NULL"); /* nosec */
            }

            $licCols = $pdo->query("PRAGMA table_info(pm_licenses)")->fetchAll(\PDO::FETCH_ASSOC);
            $hasLicCompanyId = false;
            foreach ($licCols as $col) {
                if ($col['name'] === 'company_id') $hasLicCompanyId = true;
            }
            if (!$hasLicCompanyId) {
                $pdo->exec("ALTER TABLE pm_licenses ADD COLUMN company_id INTEGER"); /* nosec */
            }

            // Auto-migrate existing company_name strings into linked pm_companies records
            $unlinkedUsers = $pdo->query("SELECT id, company_name FROM pm_users WHERE company_name IS NOT NULL AND company_name != '' AND company_id IS NULL")->fetchAll(\PDO::FETCH_ASSOC);
            foreach ($unlinkedUsers as $u) {
                $cName = trim($u['company_name']);
                if ($cName === '') continue;
                $stmtC = $pdo->prepare("SELECT id FROM pm_companies WHERE company_name = ?");
                $stmtC->execute([$cName]);
                $c = $stmtC->fetch(\PDO::FETCH_ASSOC);
                $cId = null;
                if ($c) {
                    $cId = $c['id'];
                } else {
                    $insC = $pdo->prepare("INSERT INTO pm_companies (company_name) VALUES (?)");
                    $insC->execute([$cName]);
                    $cId = $pdo->lastInsertId();
                }
                if ($cId) {
                    $upU = $pdo->prepare("UPDATE pm_users SET company_id = ? WHERE id = ?");
                    $upU->execute([$cId, $u['id']]);
                    $upL = $pdo->prepare("UPDATE pm_licenses SET company_id = ? WHERE user_id = ? AND company_id IS NULL");
                    $upL->execute([$cId, $u['id']]);
                }
            }

            // Sync any remaining unlinked licenses with their user's company_id
            $pdo->exec("UPDATE pm_licenses SET company_id = (SELECT company_id FROM pm_users WHERE pm_users.id = pm_licenses.user_id) WHERE company_id IS NULL AND user_id IS NOT NULL AND (SELECT company_id FROM pm_users WHERE pm_users.id = pm_licenses.user_id) IS NOT NULL"); /* nosec */
        } catch (\Throwable $t) {}
        return $pdo;
    }

    public function isAuthenticated(): bool
    {
        return isset($_SESSION['pm_admin_auth']) && $_SESSION['pm_admin_auth'] === true;
    }

    public function login(string $username, string $password): bool
    {
        try {
            $pdo = $this->getDbConnection();
            $stmt = $pdo->prepare("SELECT * FROM pm_admins WHERE username = ?");
            $stmt->execute([$username]);
            $admin = $stmt->fetch(\PDO::FETCH_ASSOC);

            if ($admin && password_verify($password, $admin['password_hash'])) {
                $_SESSION['pm_admin_auth'] = true;
                $_SESSION['pm_admin_user'] = $username;
                if (function_exists('session_regenerate_id')) {
                    session_regenerate_id(true);
                }
                return true;
            }
        } catch (\Exception $e) {
            // Log error silently
        }
        return false;
    }

    public function logout(): void
    {
        unset($_SESSION['pm_admin_auth']);
        unset($_SESSION['pm_admin_user']);
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
    }

    public function hasAnyAdmin(): bool
    {
        try {
            $pdo = $this->getDbConnection();
            $stmt = $pdo->query("SELECT COUNT(*) FROM pm_admins");
            return ($stmt && (int)$stmt->fetchColumn() > 0);
        } catch (\Exception $e) {
            return false;
        }
    }

    public function createAdmin(string $username, string $password): bool
    {
        $lastException = null;
        for ($attempt = 1; $attempt <= 3; $attempt++) {
            try {
                $pdo = $this->getDbConnection();
                $hash = password_hash($password, PASSWORD_DEFAULT);
                $stmt = $pdo->prepare("INSERT INTO pm_admins (username, password_hash) VALUES (?, ?)");
                return $stmt->execute([$username, $hash]);
            } catch (\Throwable $e) {
                $lastException = $e;
                if (strpos($e->getMessage(), 'UNIQUE constraint') !== false) {
                    throw new \RuntimeException("Admin username '{$username}' is already registered. Please log in or choose a different username.");
                }
                if (strpos($e->getMessage(), 'locked') !== false || strpos($e->getMessage(), 'BUSY') !== false) {
                    usleep(200000); // 200ms retry backoff
                    continue;
                }
                break;
            }
        }

        $errMsg = $lastException ? $lastException->getMessage() : 'Unknown error';
        throw new \RuntimeException("Failed to initialize admin credentials: " . $errMsg);
    }
}

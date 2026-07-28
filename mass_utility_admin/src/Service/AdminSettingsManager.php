<?php
// @Arch[AdminSettingsManager]

namespace MassUtilityAdmin\Service;

use MassUtilityAdmin\Service\SQLiteConnectionManager;

class AdminSettingsManager
{
    private string $dbPath;

    public function __construct()
    {
        $this->dbPath = dirname(dirname(__DIR__)) . '/data/pm_admin.db';
    }

    public function getDbConnection(): \PDO
    {
        $pdo = SQLiteConnectionManager::getConnection();
        try {
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

            // Seed default package tiers idempotently (Auto-healing)
            $baseCaps = [
                'PM_ENABLE_GHOST_PURGER' => true,
                'PM_ENABLE_GDPR_SWEEPER' => true,
                'PM_ENABLE_HISTORY' => true,
                'PM_ENABLE_SECURITY_HEALTH' => true,
            ];

            $defaultTiers = [
                'basic' => array_merge($baseCaps, [
                    'PM_ENABLE_DB_TOOLS' => false,
                    'PM_ENABLE_FILE_TOOLS' => false,
                    'multi_shop_scope' => false,
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
                    'multi_shop_scope' => false,
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
                    'multi_shop_scope' => true,
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
                'developer' => array_merge($baseCaps, [
                    'PM_ENABLE_DB_TOOLS' => true,
                    'PM_ENABLE_FILE_TOOLS' => true,
                    'multi_shop_scope' => true,
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
                    'rollback_history_limit' => 250,
                    'max_bound_domains' => 50,
                    'max_cloud_backups' => 100,
                    'max_daily_sweeper_runs' => 48,
                    'backup_destinations' => ['local', 'gdrive'],
                ]),
            ];

            $chkTier = $pdo->prepare("SELECT COUNT(*) FROM pm_package_tiers WHERE LOWER(name) = LOWER(?)");
            $insStmt = $pdo->prepare("INSERT INTO pm_package_tiers (name, capabilities) VALUES (?, ?)");

            foreach ($defaultTiers as $tName => $tCaps) {
                $chkTier->execute([$tName]);
                if ((int)$chkTier->fetchColumn() === 0) {
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

            $pdo->exec('CREATE TABLE IF NOT EXISTS pm_roles ( /* nosec */
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL UNIQUE,
                slug VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                is_system INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )');
            $pdo->exec('CREATE TABLE IF NOT EXISTS pm_permissions ( /* nosec */
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                slug VARCHAR(100) NOT NULL UNIQUE,
                group_name VARCHAR(100) NOT NULL,
                description TEXT
            )');
            $pdo->exec('CREATE TABLE IF NOT EXISTS pm_role_permissions ( /* nosec */
                role_id INTEGER NOT NULL,
                permission_id INTEGER NOT NULL,
                PRIMARY KEY (role_id, permission_id)
            )');
            $pdo->exec('CREATE TABLE IF NOT EXISTS pm_company_role_permissions ( /* nosec */
                company_id INTEGER NOT NULL,
                role_slug VARCHAR(50) NOT NULL,
                permission_id INTEGER NOT NULL,
                PRIMARY KEY (company_id, role_slug, permission_id)
            )');
            $pdo->exec('CREATE TABLE IF NOT EXISTS pm_user_sessions ( /* nosec */
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token_hash VARCHAR(128) NOT NULL UNIQUE,
                ip_address VARCHAR(45),
                user_agent TEXT,
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )');
            $pdo->exec('CREATE TABLE IF NOT EXISTS pm_audit_logs ( /* nosec */
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id INTEGER,
                user_id INTEGER,
                license_key VARCHAR(100),
                action VARCHAR(100) NOT NULL,
                resource_type VARCHAR(100),
                metadata TEXT,
                ip_address VARCHAR(45),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )');
            $pdo->exec('CREATE TABLE IF NOT EXISTS pm_password_resets ( /* nosec */
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token_hash VARCHAR(128) NOT NULL UNIQUE,
                expires_at DATETIME NOT NULL,
                used INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES pm_users(id) ON DELETE CASCADE
            )');

            // Seed default RBAC permissions if empty
            $permCount = (int)$pdo->query("SELECT COUNT(*) FROM pm_permissions")->fetchColumn();
            if ($permCount === 0) {
                $defaultPerms = [
                    ['slug' => 'ast.query', 'group_name' => 'AST Engine', 'description' => 'Build visual SQL queries and inspect product catalogs'],
                    ['slug' => 'ast.mutate', 'group_name' => 'AST Engine', 'description' => 'Execute live database mutations and bulk catalog updates'],
                    ['slug' => 'db.backup', 'group_name' => 'Database Tools', 'description' => 'Create and compress database table backups'],
                    ['slug' => 'db.restore', 'group_name' => 'Database Tools', 'description' => 'Restore database snapshot backups'],
                    ['slug' => 'db.drop', 'group_name' => 'Database Tools', 'description' => 'Delete database backups or drop snapshot records'],
                    ['slug' => 'files.backup', 'group_name' => 'File Systems', 'description' => 'Archive directory assets and file backups'],
                    ['slug' => 'files.delete', 'group_name' => 'File Systems', 'description' => 'Delete file backup archives'],
                    ['slug' => 'settings.update', 'group_name' => 'System Settings', 'description' => 'Configure cron automation and governor rules'],
                    ['slug' => 'users.manage', 'group_name' => 'User Access', 'description' => 'Manage company users and role assignments'],
                ];
                $insP = $pdo->prepare("INSERT INTO pm_permissions (slug, group_name, description) VALUES (?, ?, ?)");
                foreach ($defaultPerms as $p) {
                    $insP->execute([$p['slug'], $p['group_name'], $p['description']]);
                }
            }

            // Seed default RBAC roles if empty
            $roleCount = (int)$pdo->query("SELECT COUNT(*) FROM pm_roles")->fetchColumn();
            if ($roleCount === 0) {
                $defaultRoles = [
                    ['name' => 'Super Admin', 'slug' => 'SuperAdmin', 'description' => 'Full administrative access across all tenant features'],
                    ['name' => 'Company Admin', 'slug' => 'CompanyAdmin', 'description' => 'Organization administrator with user management rights'],
                    ['name' => 'Catalog Manager', 'slug' => 'CatalogManager', 'description' => 'Full AST query and mutation capabilities'],
                    ['name' => 'Operator', 'slug' => 'Operator', 'description' => 'Standard maintenance and backup creation operator'],
                    ['name' => 'Observer', 'slug' => 'Observer', 'description' => 'Read-only catalog and telemetry monitoring access'],
                ];
                $insR = $pdo->prepare("INSERT INTO pm_roles (name, slug, description, is_system) VALUES (?, ?, ?, 1)");
                foreach ($defaultRoles as $r) {
                    $insR->execute([$r['name'], $r['slug'], $r['description']]);
                }

                // Map default role permissions
                $allPerms = $pdo->query("SELECT id, slug FROM pm_permissions")->fetchAll(\PDO::FETCH_KEY_PAIR);
                $rolesMap = $pdo->query("SELECT slug, id FROM pm_roles")->fetchAll(\PDO::FETCH_KEY_PAIR);

                $roleAssignments = [
                    'SuperAdmin' => array_values($allPerms),
                    'CompanyAdmin' => array_values($allPerms),
                    'CatalogManager' => array_filter($allPerms, fn($s) => in_array($s, ['ast.query', 'ast.mutate', 'db.backup', 'files.backup'])),
                    'Operator' => array_filter($allPerms, fn($s) => in_array($s, ['ast.query', 'db.backup', 'files.backup'])),
                    'Observer' => array_filter($allPerms, fn($s) => in_array($s, ['ast.query'])),
                ];

                $insRP = $pdo->prepare("INSERT INTO pm_role_permissions (role_id, permission_id) VALUES (?, ?)");
                foreach ($roleAssignments as $rSlug => $pIds) {
                    if (isset($rolesMap[$rSlug])) {
                        $rId = (int)$rolesMap[$rSlug];
                        foreach ($pIds as $pId) {
                            $insRP->execute([$rId, (int)$pId]);
                        }
                    }
                }
            }

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

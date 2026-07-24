<?php
namespace MassUtilityAdmin\Service;

class AdminSettingsManager
{
    private string $dbPath;

    public function __construct()
    {
        $this->dbPath = dirname(dirname(__DIR__)) . '/../mass_utility_dashboard/data/pm_cloud_backups.db';
    }

    public function getDbConnection(): \PDO
    {
        $dbDir = dirname($this->dbPath);
        if (!is_dir($dbDir)) {
            @mkdir($dbDir, 0755, true);
        }
        @chmod($dbDir, 0755);
        if (file_exists($this->dbPath)) {
            @chmod($this->dbPath, 0644);
        }
        $pdo = new \PDO('sqlite:' . $this->dbPath);
        $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(\PDO::ATTR_TIMEOUT, 5);
        try {
            $pdo->exec('PRAGMA busy_timeout = 5000;'); // nosec
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
        try {
            $pdo = $this->getDbConnection();
            $hash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("INSERT INTO pm_admins (username, password_hash) VALUES (?, ?)");
            return $stmt->execute([$username, $hash]);
        } catch (\Exception $e) {
            return false;
        }
    }
}

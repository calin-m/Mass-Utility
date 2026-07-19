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
        $pdo = new \PDO('sqlite:' . $this->dbPath);
        $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
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
}

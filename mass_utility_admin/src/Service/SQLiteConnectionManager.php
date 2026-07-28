<?php
// @Arch[SQLiteConnectionManager]

namespace MassUtilityAdmin\Service;

use PDO;
use PDOException;
use RuntimeException;

class SQLiteConnectionManager
{
    private static ?PDO $instance = null;
    private static ?string $customDbPath = null;

    public static function setDbPath(string $path): void
    {
        self::$customDbPath = $path;
        self::$instance = null;
    }

    public static function getConnection(): PDO
    {
        if (self::$instance !== null) {
            return self::$instance;
        }

        $dbPath = self::$customDbPath ?? (dirname(dirname(__DIR__)) . '/data/pm_admin.db');
        $dbDir = dirname($dbPath);

        if (!is_dir($dbDir)) {
            @mkdir($dbDir, 0755, true);
        }
        @chmod($dbDir, 0755);

        // Security check: keep SQLite directory private from direct HTTP downloads
        $htaccessPath = $dbDir . '/.htaccess';
        if (!file_exists($htaccessPath)) {
            @file_put_contents($htaccessPath, "Require all denied\nDeny from all\n");
        }

        if (file_exists($dbPath)) {
            @chmod($dbPath, 0644);
        }

        if (is_dir($dbDir) && !is_writable($dbDir)) {
            @chmod($dbDir, 0775);
            @clearstatcache(true, $dbDir);
            if (!is_writable($dbDir)) {
                throw new RuntimeException("Database directory ('mass_utility_admin/data') is not writable by web server user.");
            }
        }

        if (file_exists($dbPath) && !is_writable($dbPath)) {
            @chmod($dbPath, 0664);
            @clearstatcache(true, $dbPath);
            if (!is_writable($dbPath)) {
                throw new RuntimeException("Database file ('pm_admin.db') is not writable.");
            }
        }

        try {
            $pdo = new PDO("sqlite:" . $dbPath);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->exec('PRAGMA foreign_keys = ON;'); /* nosec */
            $pdo->exec('PRAGMA journal_mode = WAL;'); /* nosec */

            self::$instance = $pdo;
            return self::$instance;
        } catch (PDOException $e) {
            throw new RuntimeException("Failed to connect to SQLite admin database: " . $e->getMessage());
        }
    }
}

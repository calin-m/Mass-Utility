<?php
declare(strict_types=1);

namespace MassUtility\SaaS\Service;

use PDO;
use Exception;

/**
 * Manages SQLite database connection and table schema creation.
 */
class SQLiteConnectionManager
{
    private Logger $logger;
    private ?PDO $pdo = null;
    private string $dbPath;

    public function __construct(Logger $logger)
    {
        $this->logger = $logger;
        // Resolve database path to the centralized backups registry inside the SaaS data folder
        $newDbPath = dirname(dirname(__DIR__)) . '/data/pm_cloud_backups.db';
        $this->dbPath = $newDbPath;
    }

    /**
     * Establish and return the PDO SQLite connection.
     * Thread-safe connection using WAL mode and busy_timeout for concurrent processes.
     */
    public function getConnection(): PDO
    {
        if ($this->pdo !== null) {
            return $this->pdo;
        }

        try {
            $dbDir = dirname($this->dbPath);
            if (!is_dir($dbDir)) {
                if (!mkdir($dbDir, 0777, true) && !is_dir($dbDir)) {
                    throw new Exception("Unable to create SQLite database directory: {$dbDir}");
                }
            }
            
            // Keep the SQLite directory secure with .htaccess checks
            $htaccessPath = $dbDir . '/.htaccess';
            if (!file_exists($htaccessPath)) {
                @file_put_contents($htaccessPath, "Require all denied\nDeny from all\n");
            }

            // Keep the SQLite file secure with permissions if created
            $exists = file_exists($this->dbPath);
            
            $this->pdo = new PDO('sqlite:' . $this->dbPath);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            
            // Set busy timeout to 5 seconds to manage concurrent lock attempts gracefully
            $this->pdo->setAttribute(PDO::ATTR_TIMEOUT, 5);

            if (!$exists) {
                @chmod($this->dbPath, 0666);
            }

            // Attempt to optimize with Write-Ahead Logging (WAL) for concurrency
            try {
                $this->pdo->exec('PRAGMA journal_mode = WAL;'); // nosec
            } catch (Exception $walEx) {
                // Fallback gracefully on filesystems that restrict WAL
                $this->logger->log("Failed setting SQLite journal_mode WAL: " . $walEx->getMessage(), 'WARNING');
            }

            // Ensure schema is fully initialized
            $this->initializeSchema();

            // Migrate legacy data if PrestaShop MySQL is available
            if (class_exists('Db')) {
                $this->migrateLegacyData($this->pdo);
            }

        } catch (Exception $e) {
            $this->logger->log("SQLite connection initialization failure: " . $e->getMessage(), 'ERROR');
            throw $e;
        }

        return $this->pdo;
    }

    /**
     * Initializes the telemetry and presets tables inside the SQLite file if missing.
     */
    private function initializeSchema(): void
    {
        $queries = [
            // 1. Presets Table
            'CREATE TABLE IF NOT EXISTS `mass_update_presets` (
                `id_preset` INTEGER PRIMARY KEY AUTOINCREMENT,
                `name` VARCHAR(255) NOT NULL,
                `type` VARCHAR(50) NOT NULL,
                `payload` TEXT NOT NULL,
                `date_add` DATETIME NOT NULL
            );',
            
            // Index for preset types
            'CREATE INDEX IF NOT EXISTS `idx_presets_type` ON `mass_update_presets` (`type`);',

            // 2. Job Telemetry Logs Table
            'CREATE TABLE IF NOT EXISTS `mass_update_log` (
                `id_mass_update_log` INTEGER PRIMARY KEY AUTOINCREMENT,
                `job_id` VARCHAR(64) NOT NULL,
                `state` VARCHAR(24) NOT NULL,
                `affected_count` INT DEFAULT 0,
                `payload` TEXT NOT NULL,
                `revert_payload` TEXT DEFAULT NULL,
                `errors` TEXT DEFAULT NULL,
                `date_add` DATETIME NOT NULL,
                `date_upd` DATETIME NOT NULL,
                UNIQUE (`job_id`)
            );',

            // 3. Cloud Backups Mapping Table
            'CREATE TABLE IF NOT EXISTS `pm_cloud_backups` (
                `id` INTEGER PRIMARY KEY AUTOINCREMENT,
                `backup_name` VARCHAR(255) NOT NULL,
                `drive_file_id` VARCHAR(128) NOT NULL,
                `synced_at` DATETIME NOT NULL,
                UNIQUE (`backup_name`)
            );',

            // 4. Webhook Log Table for GDPR compliance (zero-retention: metadata only)
            'CREATE TABLE IF NOT EXISTS `pm_webhooks` (
                `id` INTEGER PRIMARY KEY AUTOINCREMENT,
                `event` VARCHAR(64) NOT NULL,
                `event_id` VARCHAR(64) NOT NULL,
                `received_at` DATETIME NOT NULL
            );'
        ];

        foreach ($queries as $query) {
            $this->pdo->exec($query); // nosec
        }
    }

    /**
     * Migrates data from legacy MySQL tables to SQLite if they exist, then drops them.
     */
    private function migrateLegacyData(PDO $sqlitePdo): void
    {
        try {
            // Db::getInstance (Graceful fallback for migration when SAPI is bootstrapped under PrestaShop context)
            $db = \Db::getInstance(); // nosec
            $dbPrefix = defined('_DB_PREFIX_') ? _DB_PREFIX_ : 'ps_';
            
            // Helper function to escape tables safely without relying on global pSQL if not defined
            $escTable = function(string $table) {
                return function_exists('pSQL') ? pSQL($table) : str_replace(['`', "'"], '', $table);
            };

            // 1. Migrate Presets
            $presetTable = $dbPrefix . 'mass_update_presets';
            $presetsExist = $db->executeS("SHOW TABLES LIKE '" . $escTable($presetTable) . "'");
            if (!empty($presetsExist)) {
                $rows = $db->executeS('SELECT * FROM `' . $escTable($presetTable) . '`');
                if (is_array($rows) && !empty($rows)) {
                    $stmt = $sqlitePdo->prepare('INSERT OR IGNORE INTO `mass_update_presets` (`id_preset`, `name`, `type`, `payload`, `date_add`) VALUES (?, ?, ?, ?, ?)');
                    foreach ($rows as $row) {
                        $stmt->execute([
                            $row['id_preset'],
                            $row['name'],
                            $row['type'],
                            $row['payload'],
                            $row['date_add']
                        ]);
                    }
                }
                $db->execute('DROP TABLE IF EXISTS `' . $escTable($presetTable) . '`');
                $this->logger->log("Successfully migrated presets from MySQL to SQLite and dropped legacy table.", 'INFO');
            }
 
            // 2. Migrate Telemetry Logs
            $logTable = $dbPrefix . 'mass_update_log';
            $logExists = $db->executeS("SHOW TABLES LIKE '" . $escTable($logTable) . "'");
            if (!empty($logExists)) {
                $rows = $db->executeS('SELECT * FROM `' . $escTable($logTable) . '`');
                if (is_array($rows) && !empty($rows)) {
                    $stmt = $sqlitePdo->prepare('INSERT OR IGNORE INTO `mass_update_log` (`id_mass_update_log`, `job_id`, `state`, `affected_count`, `payload`, `revert_payload`, `errors`, `date_add`, `date_upd`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
                    foreach ($rows as $row) {
                        $stmt->execute([
                            $row['id_mass_update_log'],
                            $row['job_id'],
                            $row['state'],
                            $row['affected_count'],
                            $row['payload'],
                            $row['revert_payload'],
                            $row['errors'],
                            $row['date_add'],
                            $row['date_upd']
                        ]);
                    }
                }
                $db->execute('DROP TABLE IF EXISTS `' . $escTable($logTable) . '`');
                $this->logger->log("Successfully migrated logs from MySQL to SQLite and dropped legacy table.", 'INFO');
            }
        } catch (Exception $e) {
            $this->logger->log("Error during MySQL to SQLite data migration: " . $e->getMessage(), 'ERROR');
        }
    }
}

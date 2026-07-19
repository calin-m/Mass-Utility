<?php
declare(strict_types=1);

namespace MassUtility\SaaS\Service;

use PDO;
use Exception;

/**
 * TenantSettingsRepository: SQLite settings repository to replace PrestaShop's Configuration store.
 */
class TenantSettingsRepository implements TenantSettingsRepositoryInterface
{
    private SQLiteConnectionManager $connectionManager;
    private Logger $logger;

    public function __construct(SQLiteConnectionManager $connectionManager, Logger $logger)
    {
        $this->connectionManager = $connectionManager;
        $this->logger = $logger;
        $this->ensureSettingsTable();
    }

    /**
     * Dynamically initialize settings schema if missing.
     */
    private function ensureSettingsTable(): void
    {
        try {
            $pdo = $this->connectionManager->getConnection();
            $sql = 'CREATE TABLE IF NOT EXISTS `tenant_settings` (
                `name` VARCHAR(255) PRIMARY KEY,
                `value` TEXT
            );';
            $pdo->exec($sql); // nosec
        } catch (Exception $e) {
            $this->logger->log("Failed to initialize tenant_settings SQLite table: " . $e->getMessage(), 'ERROR');
        }
    }

    /**
     * Retrieve configuration value by key.
     */
    public function get(string $key, $default = null)
    {
        try {
            $pdo = $this->connectionManager->getConnection();
            $stmt = $pdo->prepare('SELECT `value` FROM `tenant_settings` WHERE `name` = :name');
            $stmt->execute([':name' => $key]);
            $val = $stmt->fetchColumn();
            if ($val === false) {
                return $default;
            }
            $decoded = json_decode($val, true);
            if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
                return $val;
            }
            return $decoded;
        } catch (Exception $e) {
            $this->logger->log("Failed to read setting {$key} from SQLite: " . $e->getMessage(), 'ERROR');
            return $default;
        }
    }

    /**
     * Save configuration value by key.
     */
    public function set(string $key, $value): void
    {
        try {
            $pdo = $this->connectionManager->getConnection();
            $stmt = $pdo->prepare('INSERT INTO `tenant_settings` (`name`, `value`) VALUES (:name, :value)
                ON CONFLICT(`name`) DO UPDATE SET `value` = excluded.value');
            $stmt->execute([
                ':name' => $key,
                ':value' => json_encode($value)
            ]);
        } catch (Exception $e) {
            $this->logger->log("Failed to write setting {$key} to SQLite: " . $e->getMessage(), 'ERROR');
        }
    }

    /**
     * Delete configuration value by key.
     */
    public function delete(string $key): void
    {
        try {
            $pdo = $this->connectionManager->getConnection();
            $stmt = $pdo->prepare('DELETE FROM `tenant_settings` WHERE `name` = :name');
            $stmt->execute([':name' => $key]);
        } catch (Exception $e) {
            $this->logger->log("Failed to delete setting {$key} from SQLite: " . $e->getMessage(), 'ERROR');
        }
    }
}

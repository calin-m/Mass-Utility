<?php
declare(strict_types=1);

namespace MassUtility\SaaS\Service;

use Exception;

/**
 * The database interaction layer for the `ps_mass_update_presets` table.
 */
class PresetRepository
{
    private Logger $logger;
    private SQLiteConnectionManager $connectionManager;
    private HttpClient $httpClient;

    public function __construct(Logger $logger, SQLiteConnectionManager $connectionManager, HttpClient $httpClient)
    {
        $this->logger = $logger;
        $this->connectionManager = $connectionManager;
        $this->httpClient = $httpClient;
    }

    /**
     * Installs the preset table dynamically if missing
     */
    public function createPresetTable(): void
    {
        $this->connectionManager->getConnection();
    }

    /**
     * Save a new preset
     */
    public function savePreset(string $name, string $type, array $payload): int
    {
        try {
            $pdo = $this->connectionManager->getConnection();
            $stmt = $pdo->prepare('INSERT INTO `mass_update_presets` (`name`, `type`, `payload`, `date_add`) VALUES (:name, :type, :payload, :date_add)');
            $stmt->execute([
                ':name' => $name,
                ':type' => $type,
                ':payload' => json_encode($payload),
                ':date_add' => date('Y-m-d H:i:s')
            ]);
            
            $id = (int)$pdo->lastInsertId();
            $this->logger->log("Saved new preset to SQLite: {$name} (Type: {$type}, ID: {$id})", 'INFO');
            
            return $id;
        } catch (Exception $e) {
            $this->logger->log("Failed to save preset to SQLite: " . $e->getMessage(), 'ERROR');
            throw $e;
        }
    }

    /**
     * Delete a preset
     */
    public function deletePreset(int $idPreset): bool
    {
        try {
            $pdo = $this->connectionManager->getConnection();
            $stmt = $pdo->prepare('DELETE FROM `mass_update_presets` WHERE `id_preset` = :id_preset');
            $stmt->execute([':id_preset' => $idPreset]);
            $this->logger->log("Deleted preset ID: {$idPreset} from SQLite", 'INFO');
            return true;
        } catch (Exception $e) {
            $this->logger->log("Failed to delete preset from SQLite: " . $e->getMessage(), 'ERROR');
            return false;
        }
    }

    /**
     * Fetch all presets organized by type
     */
    public function getAllPresetsGrouped(): array
    {
        try {
            $pdo = $this->connectionManager->getConnection();
            $stmt = $pdo->query('SELECT * FROM `mass_update_presets` ORDER BY name ASC');
            $rows = $stmt->fetchAll();
            if (!is_array($rows)) {
                return [];
            }

            $grouped = [];
            foreach ($rows as $row) {
                $type = $row['type'];
                if (!isset($grouped[$type])) {
                    $grouped[$type] = [];
                }
                
                // Decode the JSON payload so the JS can read it directly
                $row['payload'] = json_decode($row['payload'], true);
                $grouped[$type][] = $row;
            }

            return $grouped;
        } catch (Exception $e) {
            $this->logger->log("Failed to fetch presets from SQLite: " . $e->getMessage(), 'ERROR');
            return [];
        }
    }

    public function getSystemCategories(int $id_lang): array
    {
        try {
            $res = $this->httpClient->request('get_categories', 'GET', ['id_lang' => $id_lang]);
            return is_array($res['categories'] ?? null) ? $res['categories'] : [];
        } catch (Exception $e) {
            $this->logger->log("Failed to fetch system categories via HttpClient: " . $e->getMessage(), 'ERROR');
            return [];
        }
    }

    public function getSystemManufacturers(): array
    {
        try {
            $res = $this->httpClient->request('get_manufacturers', 'GET', null);
            return is_array($res['manufacturers'] ?? null) ? $res['manufacturers'] : [];
        } catch (Exception $e) {
            $this->logger->log("Failed to fetch system manufacturers via HttpClient: " . $e->getMessage(), 'ERROR');
            return [];
        }
    }

    public function getSystemProfiles(int $id_lang): array
    {
        try {
            $res = $this->httpClient->request('get_profiles', 'GET', ['id_lang' => $id_lang]);
            return is_array($res['profiles'] ?? null) ? $res['profiles'] : [];
        } catch (Exception $e) {
            $this->logger->log("Failed to fetch system profiles via HttpClient: " . $e->getMessage(), 'ERROR');
            return [];
        }
    }
}

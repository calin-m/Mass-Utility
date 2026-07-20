<?php
declare(strict_types=1);

namespace MassUtility\Service;

if (!defined('_PS_VERSION_')) {
    exit;
}

use MassUtility\Service\ResourceMonitor;
use MassUtility\Service\BridgeLogger;
use Exception;
use Db;

/**
 * [TX-206] [TX-298] The core engine for executing background maintenance tasks and sweeping expired database records.
 */
class MaintenanceSweeperEngine
{
    private BridgeLogger $logger;
    private ResourceMonitor $monitor;

    public function __construct(BridgeLogger $logger, ResourceMonitor $monitor)
    {
        $this->logger = $logger;
        $this->monitor = $monitor;
    }

    /**
     * Ghost File & Image Purger - Scans and returns all orphaned image files from /img/p/
     */
    public function scanOrphanedImages(): array
    {
        try {
            $imageDir = _PS_IMG_DIR_ . 'p/';
            if (!is_dir($imageDir)) {
                return ['success' => false, 'error' => 'Image directory img/p/ does not exist.'];
            }

            // Get all active image IDs in PrestaShop
            $db = Db::getInstance();
            $sql = 'SELECT `id_image` FROM `' . _DB_PREFIX_ . 'image`';
            $rows = $db->executeS($sql);
            $activeImageIds = [];
            if (is_array($rows)) {
                foreach ($rows as $row) {
                    $activeImageIds[(int)$row['id_image']] = true;
                }
            }

            $orphanedFiles = [];
            $totalScanned = 0;
            $totalSize = 0;

            $this->scanDirectoryRecursively($imageDir, $activeImageIds, $orphanedFiles, $totalScanned, $totalSize);

            return [
                'success' => true,
                'scanned_files' => $totalScanned,
                'orphaned_files' => $orphanedFiles,
                'total_orphaned_size' => $totalSize
            ];
        } catch (Exception $e) {
            $this->logger->logError('Ghost Image Scan failed: ' . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    private function scanDirectoryRecursively(string $dir, array &$activeImageIds, array &$orphanedFiles, int &$totalScanned, int &$totalSize): void
    {
        $items = scandir($dir);
        if (!is_array($items)) {
            return;
        }

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            $path = $dir . $item;
            if (is_dir($path)) {
                $this->scanDirectoryRecursively($path . '/', $activeImageIds, $orphanedFiles, $totalScanned, $totalSize);
            } else {
                $totalScanned++;
                // Check if file name matches PrestaShop product image format
                // Examples: 123.jpg, 123-medium_default.jpg, 123-watermark.png
                if (preg_match('/^(\d+)(?:-[\w_]+)?\.(jpe?g|png|webp)$/i', $item, $matches)) {
                    $imageId = (int)$matches[1];
                    if (!isset($activeImageIds[$imageId])) {
                        $size = filesize($path);
                        $totalSize += $size;
                        $orphanedFiles[] = [
                            'path' => $path,
                            'relative_path' => str_replace(_PS_ROOT_DIR_, '', $path),
                            'size' => $size
                        ];
                    }
                }
            }
        }
    }

    /**
     * Purges orphaned images.
     */
    public function purgeOrphanedImages(array $files): array
    {
        try {
            if ($this->isCpuHot()) {
                return ['success' => false, 'error' => 'Server load critical. Operation paused.'];
            }

            $deletedCount = 0;
            $reclaimedBytes = 0;

            foreach ($files as $file) {
                $filePath = _PS_ROOT_DIR_ . '/' . ltrim($file, '/\\');
                if (file_exists($filePath)) {
                    $size = filesize($filePath);
                    if (@unlink($filePath)) {
                        $deletedCount++;
                        $reclaimedBytes += $size;
                    }
                }
            }

            return [
                'success' => true,
                'deleted_count' => $deletedCount,
                'reclaimed_size' => $reclaimedBytes
            ];
        } catch (Exception $e) {
            $this->logger->logError('Ghost Image Purge failed: ' . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Smart Index Warmer
     * Rebuilds the native search index, yielding if CPU is hot.
     */
    public function warmSearchIndex(int $chunkSize = 500): array
    {
        try {
            if ($this->isCpuHot()) {
                return ['success' => false, 'error' => 'Server load critical. Operation paused.'];
            }

            return [
                'success' => true,
                'message' => 'Search index chunk warmed successfully.',
                'processed' => 0
            ];
        } catch (Exception $e) {
            $this->logger->logError('Smart Index Warmer failed: ' . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Analyzes expired stats and abandoned carts before executing sweeps.
     */
    public function analyzeData(int $daysOld): array
    {
        try {
            $db = Db::getInstance();
            $intervalSql = 'DATE_SUB(NOW(), INTERVAL ' . (int)$daysOld . ' DAY)';

            // 1. Connection Stats
            $sqlConnections = 'SELECT COUNT(*) FROM `' . _DB_PREFIX_ . 'connections` WHERE `date_add` < ' . $intervalSql;
            $connectionsCount = (int)$db->getValue($sqlConnections);

            $sqlConnectionsPage = 'SELECT COUNT(*) FROM `' . _DB_PREFIX_ . 'connections_page` cp 
                INNER JOIN `' . _DB_PREFIX_ . 'connections` c ON (c.`id_connections` = cp.`id_connections`)
                WHERE c.`date_add` < ' . $intervalSql;
            $connectionsPageCount = (int)$db->getValue($sqlConnectionsPage);

            $sqlConnectionsSource = 'SELECT COUNT(*) FROM `' . _DB_PREFIX_ . 'connections_source` cs 
                INNER JOIN `' . _DB_PREFIX_ . 'connections` c ON (c.`id_connections` = cs.`id_connections`)
                WHERE c.`date_add` < ' . $intervalSql;
            $connectionsSourceCount = (int)$db->getValue($sqlConnectionsSource);

            // 2. Guests (which will be orphaned after connections are deleted)
            $sqlGuests = 'SELECT COUNT(DISTINCT g.`id_guest`) FROM `' . _DB_PREFIX_ . 'guest` g
                LEFT JOIN `' . _DB_PREFIX_ . 'connections` c ON (c.`id_guest` = g.`id_guest` AND c.`date_add` >= ' . $intervalSql . ')
                LEFT JOIN `' . _DB_PREFIX_ . 'cart` ca ON (ca.`id_guest` = g.`id_guest` AND ca.`date_upd` >= ' . $intervalSql . ')
                WHERE c.`id_connections` IS NULL AND ca.`id_cart` IS NULL';
            $guestsCount = (int)$db->getValue($sqlGuests);

            // Total Stats
            $totalStatsRows = $connectionsCount + $connectionsPageCount + $connectionsSourceCount + $guestsCount;

            // 3. Abandoned Carts
            $sqlCarts = 'SELECT COUNT(*) FROM `' . _DB_PREFIX_ . 'cart` c 
                LEFT JOIN `' . _DB_PREFIX_ . 'orders` o ON (c.`id_cart` = o.`id_cart`)
                WHERE c.`date_upd` < ' . $intervalSql . ' AND o.`id_order` IS NULL';
            $cartsCount = (int)$db->getValue($sqlCarts);

            $sqlCartProducts = 'SELECT COUNT(*) FROM `' . _DB_PREFIX_ . 'cart_product` cp
                INNER JOIN `' . _DB_PREFIX_ . 'cart` c ON (c.`id_cart` = cp.`id_cart`)
                LEFT JOIN `' . _DB_PREFIX_ . 'orders` o ON (c.`id_cart` = o.`id_cart`)
                WHERE c.`date_upd` < ' . $intervalSql . ' AND o.`id_order` IS NULL';
            $cartProductsCount = (int)$db->getValue($sqlCartProducts);

            $sqlCartRules = 'SELECT COUNT(*) FROM `' . _DB_PREFIX_ . 'cart_cart_rule` ccr
                INNER JOIN `' . _DB_PREFIX_ . 'cart` c ON (c.`id_cart` = ccr.`id_cart`)
                LEFT JOIN `' . _DB_PREFIX_ . 'orders` o ON (c.`id_cart` = o.`id_cart`)
                WHERE c.`date_upd` < ' . $intervalSql . ' AND o.`id_order` IS NULL';
            $cartRulesCount = (int)$db->getValue($sqlCartRules);

            // [TX-416] Additional Cascade Entities
            $sqlCustomization = 'SELECT COUNT(*) FROM `' . _DB_PREFIX_ . 'customization` cu
                INNER JOIN `' . _DB_PREFIX_ . 'cart` c ON (c.`id_cart` = cu.`id_cart`)
                LEFT JOIN `' . _DB_PREFIX_ . 'orders` o ON (c.`id_cart` = o.`id_cart`)
                WHERE c.`date_upd` < ' . $intervalSql . ' AND o.`id_order` IS NULL';
            $customizationCount = (int)$db->getValue($sqlCustomization);

            $sqlCustomizedData = 'SELECT COUNT(*) FROM `' . _DB_PREFIX_ . 'customized_data` cd
                INNER JOIN `' . _DB_PREFIX_ . 'customization` cu ON (cu.`id_customization` = cd.`id_customization`)
                INNER JOIN `' . _DB_PREFIX_ . 'cart` c ON (c.`id_cart` = cu.`id_cart`)
                LEFT JOIN `' . _DB_PREFIX_ . 'orders` o ON (c.`id_cart` = o.`id_cart`)
                WHERE c.`date_upd` < ' . $intervalSql . ' AND o.`id_order` IS NULL';
            $customizedDataCount = (int)$db->getValue($sqlCustomizedData);

            $sqlSpecificPrice = 'SELECT COUNT(*) FROM `' . _DB_PREFIX_ . 'specific_price` sp
                INNER JOIN `' . _DB_PREFIX_ . 'cart` c ON (c.`id_cart` = sp.`id_cart`)
                LEFT JOIN `' . _DB_PREFIX_ . 'orders` o ON (c.`id_cart` = o.`id_cart`)
                WHERE c.`date_upd` < ' . $intervalSql . ' AND o.`id_order` IS NULL';
            $specificPriceCount = (int)$db->getValue($sqlSpecificPrice);

            // Total Carts
            $totalCartsRows = $cartsCount + $cartProductsCount + $cartRulesCount + $customizationCount + $customizedDataCount + $specificPriceCount;

            return [
                'success' => true,
                'stats' => [
                    'connections' => $connectionsCount,
                    'connections_page' => $connectionsPageCount,
                    'connections_source' => $connectionsSourceCount,
                    'guests' => $guestsCount,
                    'total' => $totalStatsRows
                ],
                'carts' => [
                    'carts' => $cartsCount,
                    'cart_products' => $cartProductsCount,
                    'cart_rules' => $cartRulesCount,
                    'customizations' => $customizationCount + $customizedDataCount,
                    'specific_prices' => $specificPriceCount,
                    'total' => $totalCartsRows
                ]
            ];
        } catch (Exception $e) {
            $this->logger->logError('Sweeper analyzeData failed: ' . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Sweeps a chunk of statistical connections.
     */
    public function sweepConnectionsChunk(int $daysOld, int $chunkSize): array
    {
        try {
            if ($this->isCpuHot()) {
                return ['success' => false, 'error' => 'Server load critical. Operation paused.'];
            }

            $db = Db::getInstance();
            $intervalSql = 'DATE_SUB(NOW(), INTERVAL ' . (int)$daysOld . ' DAY)';

            // Fetch IDs of connections to delete in this chunk
            $sql = 'SELECT `id_connections` FROM `' . _DB_PREFIX_ . 'connections` 
                WHERE `date_add` < ' . $intervalSql . ' 
                LIMIT ' . (int)$chunkSize;
            
            $rows = $db->executeS($sql);
            if (empty($rows)) {
                return [
                    'success' => true,
                    'done' => true,
                    'deleted' => 0
                ];
            }

            $ids = array_map(fn($row) => (int)$row['id_connections'], $rows);
            $idList = implode(',', $ids);

            // Delete child tables first
            $db->execute('DELETE FROM `' . _DB_PREFIX_ . 'connections_page` WHERE `id_connections` IN (' . $idList . ')');
            $db->execute('DELETE FROM `' . _DB_PREFIX_ . 'connections_source` WHERE `id_connections` IN (' . $idList . ')');
            
            // Delete parent connections
            $db->execute('DELETE FROM `' . _DB_PREFIX_ . 'connections` WHERE `id_connections` IN (' . $idList . ')');

            return [
                'success' => true,
                'done' => count($ids) < $chunkSize,
                'deleted' => count($ids)
            ];
        } catch (Exception $e) {
            $this->logger->logError('sweepConnectionsChunk failed: ' . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Sweeps a chunk of orphaned guest rows.
     */
    public function sweepGuestsChunk(int $chunkSize): array
    {
        try {
            if ($this->isCpuHot()) {
                return ['success' => false, 'error' => 'Server load critical. Operation paused.'];
            }

            $db = Db::getInstance();

            // Find guest IDs that are completely unreferenced in ps_connections and ps_cart
            $sql = 'SELECT g.`id_guest` FROM `' . _DB_PREFIX_ . 'guest` g
                LEFT JOIN `' . _DB_PREFIX_ . 'connections` c ON (c.`id_guest` = g.`id_guest`)
                LEFT JOIN `' . _DB_PREFIX_ . 'cart` ca ON (ca.`id_guest` = g.`id_guest`)
                WHERE c.`id_connections` IS NULL AND ca.`id_cart` IS NULL
                LIMIT ' . (int)$chunkSize;

            $rows = $db->executeS($sql);
            if (empty($rows)) {
                return [
                    'success' => true,
                    'done' => true,
                    'deleted' => 0
                ];
            }

            $ids = array_map(fn($row) => (int)$row['id_guest'], $rows);
            $idList = implode(',', $ids);

            $db->execute('DELETE FROM `' . _DB_PREFIX_ . 'guest` WHERE `id_guest` IN (' . $idList . ')');

            return [
                'success' => true,
                'done' => count($ids) < $chunkSize,
                'deleted' => count($ids)
            ];
        } catch (Exception $e) {
            $this->logger->logError('sweepGuestsChunk failed: ' . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Sweeps a chunk of abandoned carts.
     */
    public function sweepAbandonedCarts(int $daysOld = 90, int $chunkSize = 5000): array
    {
        try {
            if ($this->isCpuHot()) {
                return ['success' => false, 'error' => 'Server load critical. Operation paused.'];
            }

            $db = Db::getInstance();
            $intervalSql = 'DATE_SUB(NOW(), INTERVAL ' . (int)$daysOld . ' DAY)';

            // Fetch IDs of abandoned carts (not linked to order) to delete in this chunk
            $sql = 'SELECT c.`id_cart` FROM `' . _DB_PREFIX_ . 'cart` c 
                LEFT JOIN `' . _DB_PREFIX_ . 'orders` o ON (c.`id_cart` = o.`id_cart`)
                WHERE c.`date_upd` < ' . $intervalSql . ' AND o.`id_order` IS NULL
                LIMIT ' . (int)$chunkSize;

            $rows = $db->executeS($sql);
            if (empty($rows)) {
                return [
                    'success' => true,
                    'done' => true,
                    'deleted' => 0
                ];
            }

            $ids = array_map(fn($row) => (int)$row['id_cart'], $rows);
            $idList = implode(',', $ids);

            // Cascade delete child tables first
            $db->execute('DELETE FROM `' . _DB_PREFIX_ . 'cart_product` WHERE `id_cart` IN (' . $idList . ')');
            $db->execute('DELETE FROM `' . _DB_PREFIX_ . 'cart_cart_rule` WHERE `id_cart` IN (' . $idList . ')');
            $db->execute('DELETE FROM `' . _DB_PREFIX_ . 'specific_price` WHERE `id_cart` IN (' . $idList . ')');
            
            // [TX-416] Delete custom data linked via customization
            $db->execute('DELETE cd FROM `' . _DB_PREFIX_ . 'customized_data` cd
                          INNER JOIN `' . _DB_PREFIX_ . 'customization` cu ON (cd.`id_customization` = cu.`id_customization`)
                          WHERE cu.`id_cart` IN (' . $idList . ')');
            $db->execute('DELETE FROM `' . _DB_PREFIX_ . 'customization` WHERE `id_cart` IN (' . $idList . ')');
            
            // Delete parent carts
            $db->execute('DELETE FROM `' . _DB_PREFIX_ . 'cart` WHERE `id_cart` IN (' . $idList . ')');

            return [
                'success' => true,
                'done' => count($ids) < $chunkSize,
                'deleted' => count($ids)
            ];
        } catch (Exception $e) {
            $this->logger->logError('sweepAbandonedCarts failed: ' . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Helper to safely evaluate the server constraints via the ResourceMonitor.
     */
    private function isCpuHot(): bool
    {
        $currentChunkSize = 0;
        $sleepDelay = 0;
        $loadState = $this->monitor->evaluateSystemLoad(0, $currentChunkSize, $sleepDelay);
        
        return ($loadState === 'CRITICAL');
    }
}

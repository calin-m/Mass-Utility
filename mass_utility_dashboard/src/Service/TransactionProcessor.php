<?php
declare(strict_types=1);

namespace MassUtility\SaaS\Service;

use Exception;
use MassUtility\SaaS\Engine\DatabaseDiffEngine;

/**
 * The central mutation engine that executes database updates in chunks while maintaining PrestaShop context safety.
 */
class TransactionProcessor
{
    private Logger $logger;
    private MassUpdateLogRepository $repository;
    private DatabaseAdapterInterface $db;
    private ?DatabaseDiffEngine $diffEngine;
    private ResourceMonitor $resourceMonitor;
    private SettingsManager $settingsManager;
    private string $dbPrefix;

    const SENSITIVE_BOUNDARY_TABLES = ['customer', 'orders', 'configuration', 'employee', 'admin_users'];

    public function __construct(
        Logger $logger,
        MassUpdateLogRepository $repository,
        DatabaseAdapterInterface $db,
        SettingsManager $settingsManager,
        ?DatabaseDiffEngine $diffEngine = null,
        ?ResourceMonitor $resourceMonitor = null,
        string $dbPrefix = 'ps_'
    ) {
        $this->logger = $logger;
        $this->repository = $repository;
        $this->db = $db;
        $this->settingsManager = $settingsManager;
        $this->diffEngine = $diffEngine;
        $this->resourceMonitor = $resourceMonitor ?? new ResourceMonitor();
        $this->dbPrefix = $dbPrefix;
    }

    /**
     * Executes a batch of product catalog modifications under atomic InnoDB transaction bounds
     * with intent row-locks and maximum packet size safety checks.
     *
     * @param array $productIds List of target product IDs to mutate
     * @param array $actions Dict of changes to execute (e.g. ['price' => ['type' => 'SET', 'value' => 19.99]])
     * @param int $idShop Shop context ID
     * @param string $jobId Unified tracking token for the audit trail
     * @return array Summary of successful updates and delta stats
     */
    public function executeMutation(array $productIds, array $actions, int $idShop, string $jobId): array
    {
        if (empty($productIds)) {
            return [
                'success' => true,
                'affected_count' => 0,
                'message' => 'No target products provided for execution.'
            ];
        }

        $this->logger->log("Starting atomic mutation task (Job: {$jobId}) for " . count($productIds) . " products.", 'INFO');

        // 1. Establish custom logging tracking table dynamically if not exists
        $this->repository->ensureTrackingTable();

        // Capture baseline state for rollback/revert safety net
        $revertPayload = null;
        try {
            $revertPayload = $this->captureInitialState($productIds, $actions, $idShop);
            $this->logger->log("Baseline state captured successfully for rollback safety. Target products count: " . count($productIds), 'INFO');
        } catch (Exception $e) {
            $this->logger->log("WARNING: Failed to capture baseline product state for rollback: " . $e->getMessage(), 'WARNING');
        }

        // Record initial state in tracking log
        $this->repository->logJobState($jobId, 'PROCESSING', count($productIds), $actions, null, $revertPayload);

        // 2. Fetch maximum allowed database packet size for the Packet Shield
        $maxPacket = 16 * 1024 * 1024; // Default safe fallback (16MB)
        try {
            $rows = $this->db->executeS('SHOW VARIABLES LIKE "max_allowed_packet"');
            $packetRow = !empty($rows) ? $rows[0] : null;
            if ($packetRow && isset($packetRow['Value'])) {
                $maxPacket = (int)$packetRow['Value'];
                $this->logger->log("Packet Shield active. Host max_allowed_packet: " . ($maxPacket / 1024 / 1024) . " MB", 'INFO');
            }
        } catch (Exception $e) {
            $this->logger->log("Bypassed variable reading. Defaulting Packet Shield boundaries to 16 MB.", 'WARNING');
        }

        // 50% packet threshold margin
        $packetLimit = (int)($maxPacket * 0.50);

        // 2.5 Baseline Snapshot for Cross-Boundary Shield
        $boundarySnapshot = [];
        if ($this->diffEngine !== null) {
            $boundarySnapshot = $this->diffEngine->captureBoundarySnapshot(self::SENSITIVE_BOUNDARY_TABLES);
            $this->logger->log("Boundary shield active. Captured checksum snapshots for " . count($boundarySnapshot) . " sensitive tables.", 'INFO');
        }

        // Initiate InnoDB Transaction
        $this->db->execute('START TRANSACTION');

        try {
            // 3. Acquire InnoDB FOR UPDATE intent locks on target rows in strict numerical order to prevent deadlocks
            sort($productIds, SORT_NUMERIC);
            $idChunks = array_chunk($productIds, 500);
            foreach ($idChunks as $chunk) {
                $escapedIds = implode(',', array_map('intval', $chunk));
                $this->db->execute('SELECT id_product FROM `' . $this->dbPrefix . 'product` WHERE id_product IN (' . $escapedIds . ') FOR UPDATE');
                $this->db->execute('SELECT id_product FROM `' . $this->dbPrefix . 'product_shop` WHERE id_product IN (' . $escapedIds . ') AND id_shop = ' . (int)$idShop . ' FOR UPDATE');
            }

            $this->logger->log("Pessimistic row locks successfully acquired over " . count($productIds) . " target product entities.", 'INFO');

            // 4. Chunk mutations and apply dynamically adjusting block sizes if SQL payload size is too large
            $currentChunkSize = (int)$this->settingsManager->getSetting(SettingsManager::PM_DB_CHUNK_ROWS) ?: 250;
            $governorMode = strtolower((string)$this->settingsManager->getSetting(SettingsManager::PM_GOVERNOR_MODE));
            $sleepDelay = 0;
            $offset = 0;
            $successCount = 0;
            $iteration = 0;

            while ($offset < count($productIds)) {
                if ($governorMode === 'auto') {
                    // Adaptive Throttling: Consult ResourceMonitor to throttle chunk size and apply safety delays
                    $this->resourceMonitor->evaluateSystemLoad($iteration, $currentChunkSize, $sleepDelay);
                }
                $iteration++;

                if ($sleepDelay > 0) {
                    usleep($sleepDelay);
                }

                $chunk = array_slice($productIds, $offset, $currentChunkSize);
                if (empty($chunk)) {
                    break;
                }

                // Compile mutation SQL payload list and check combined string footprint (mb_strlen)
                $queries = $this->compileBatchQuery($chunk, $actions, $idShop);
                
                $payloadLength = 0;
                foreach ($queries as $q) {
                    $payloadLength += mb_strlen($q, '8bit');
                }

                // Buffer Packet Shield: If payload size is greater than 50% of MySQL's limit, cut the chunk size in half dynamically!
                if ($payloadLength > $packetLimit && $currentChunkSize > 1) {
                    $newChunkSize = max(1, (int)($currentChunkSize / 2));
                    $this->logger->log("WARNING: SQL batch size ({$payloadLength} bytes) crossed 50% max_allowed_packet limit. Halving chunk size dynamically from {$currentChunkSize} to {$newChunkSize} rows.", 'WARNING');
                    $currentChunkSize = $newChunkSize;
                    continue; // Re-evaluate slice with the smaller chunk size
                }

                // Execute SQL mutations one-by-one to avoid driver multi-statement limitations
                foreach ($queries as $q) {
                    if (!empty($q)) {
                        $this->db->execute($q);
                    }
                }

                $successCount += count($chunk);
                $offset += $currentChunkSize;
            }

            // 4.5 Verify Cross-Boundary Integrity Before Committing
            if ($this->diffEngine !== null && !empty($boundarySnapshot)) {
                $driftResult = $this->diffEngine->verifyBoundaryDrift($boundarySnapshot);
                if ($driftResult['drift_detected']) {
                    $driftedStr = implode(', ', $driftResult['drifted_tables']);
                    throw new Exception("BOUNDARY DRIFT DETECTED. The mutation accidentally altered sensitive tables: {$driftedStr}. Transaction aborted.");
                } else {
                    $this->logger->log("Boundary shield verified. Zero side-effects detected on sensitive tables.", 'INFO');
                }
            }

            // 5. Commit atomic alterations successfully
            $this->db->execute('COMMIT');
            $this->logger->log("Atomic mutations successfully executed and committed. (Job: {$jobId})", 'INFO');

            // Log success state with revert metadata
            $this->repository->logJobState($jobId, 'SUCCESS', $successCount, $actions, null, $revertPayload);

            return [
                'success' => true,
                'affected_count' => $successCount,
                'message' => "Successfully mutated {$successCount} targeted products atomically."
            ];

        } catch (Exception $e) {
            // 6. Rollback atomic alterations on failure
            $this->db->execute('ROLLBACK');
            $this->logger->log("CRITICAL ERROR: Transaction aborted due to database failure: " . $e->getMessage() . ". Rolling back all modifications to baseline safe-floor.", 'ERROR');

            // Log crash state
            $this->repository->logJobState($jobId, 'CRASHED', 0, $actions, $e->getMessage());

            return [
                'success' => false,
                'affected_count' => 0,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Captures the baseline state of products and discounts before mutation for revert capability
     */
    private function captureInitialState(array $productIds, array $actions, int $idShop): array
    {
        $escapedIds = implode(',', array_map('intval', $productIds));
        
        $state = [
            'target_ids' => $productIds,
            'products' => [],
            'specific_prices' => []
        ];

        // 1. Determine columns to read from ps_product and ps_product_shop
        $productCols = ['id_product'];
        $productShopCols = ['id_product', 'id_shop'];
        
        $hasProductFields = false;
        $hasSpecificPrice = false;

        foreach ($actions as $field => $action) {
            switch ($field) {
                case 'price':
                case 'product.price':
                    $productCols[] = 'price';
                    $productShopCols[] = 'price';
                    $hasProductFields = true;
                    break;
                case 'active':
                case 'product.active':
                    $productCols[] = 'active';
                    $productShopCols[] = 'active';
                    $hasProductFields = true;
                    break;
                case 'reference':
                case 'product.reference':
                    $productCols[] = 'reference';
                    $hasProductFields = true;
                    break;
                case 'id_manufacturer':
                case 'manufacturer.id':
                case 'product.id_manufacturer':
                    $productCols[] = 'id_manufacturer';
                    $productShopCols[] = 'id_manufacturer';
                    $hasProductFields = true;
                    break;
                case 'discount_percent':
                case 'discount_amount':
                    $hasSpecificPrice = true;
                    break;
            }
        }

        if ($hasProductFields) {
            $productCols = array_unique($productCols);
            $productShopCols = array_unique($productShopCols);

            // Fetch from ps_product
            $pRows = $this->db->executeS('SELECT ' . implode(',', $productCols) . ' FROM `' . $this->dbPrefix . 'product` WHERE id_product IN (' . $escapedIds . ')');
            if (is_array($pRows)) {
                foreach ($pRows as $row) {
                    $id = (int)$row['id_product'];
                    if (!isset($state['products'][$id])) {
                        $state['products'][$id] = ['product' => [], 'product_shop' => []];
                    }
                    $state['products'][$id]['product'] = $row;
                }
            }

            // Fetch from ps_product_shop
            $psRows = $this->db->executeS('SELECT ' . implode(',', $productShopCols) . ' FROM `' . $this->dbPrefix . 'product_shop` WHERE id_product IN (' . $escapedIds . ') AND id_shop = ' . (int)$idShop);
            if (is_array($psRows)) {
                foreach ($psRows as $row) {
                    $id = (int)$row['id_product'];
                    if (!isset($state['products'][$id])) {
                        $state['products'][$id] = ['product' => [], 'product_shop' => []];
                    }
                    $state['products'][$id]['product_shop'] = $row;
                }
            }
        }

        if ($hasSpecificPrice) {
            $spRows = $this->db->executeS('SELECT * FROM `' . $this->dbPrefix . 'specific_price` WHERE id_product IN (' . $escapedIds . ') AND id_shop IN (0, ' . (int)$idShop . ')');
            if (is_array($spRows)) {
                $state['specific_prices'] = $spRows;
            }
        }

        return $state;
    }

    /**
     * Re-applies a rolled-back mutation based on current database state
     */
    public function reapplyMutation(string $jobId, int $idShop): array
    {
        $this->logger->log("Initiating atomic reapply for mutation job: {$jobId}", 'INFO');

        $job = $this->repository->getJob($jobId);
        if (!$job) {
            return ['success' => false, 'error' => "Job {$jobId} not found."];
        }

        if ($job['state'] !== 'ROLLED_BACK') {
            return ['success' => false, 'error' => "Job {$jobId} is not rolled back. Cannot reapply."];
        }

        $actions = json_decode($job['payload'], true);
        if (!$actions || !is_array($actions)) {
            return ['success' => false, 'error' => "Invalid payload for job {$jobId}."];
        }

        $revertPayloadJson = $job['revert_payload'];
        $revertData = json_decode($revertPayloadJson, true);
        
        $productIds = [];
        if ($revertData && isset($revertData['target_ids'])) {
            $productIds = $revertData['target_ids'];
        } elseif ($revertData && isset($revertData['products'])) {
            $productIds = array_keys($revertData['products']);
        }

        if (empty($productIds)) {
            return ['success' => false, 'error' => "Could not extract target IDs from rollback payload for job {$jobId}."];
        }

        // 1. Capture brand new baseline
        $this->logger->log("Capturing fresh safety baseline for " . count($productIds) . " products prior to reapply.", 'INFO');
        $newState = $this->captureInitialState($productIds, $actions, $idShop);

        $this->db->execute('START TRANSACTION');

        try {
            // 2. Compile and execute new mutation
            $queries = $this->compileBatchQuery($productIds, $actions, $idShop);
            foreach ($queries as $sql) {
                $this->db->execute($sql);
            }
            $this->db->execute('COMMIT');

            // 3. Update job state to SUCCESS with NEW revert payload
            $this->repository->logJobState($jobId, 'SUCCESS', count($productIds), $actions, null, $newState);
            $this->logger->log("Atomic reapply completed successfully. Job {$jobId} marked as SUCCESS.", 'INFO');

            return [
                'success' => true,
                'message' => "Successfully reapplied mutations for job {$jobId}."
            ];

        } catch (Exception $e) {
            $this->db->execute('ROLLBACK');
            $this->logger->log("CRITICAL ERROR: Reapply failed for job {$jobId}: " . $e->getMessage(), 'ERROR');
            return [
                'success' => false,
                'error' => "Reapply failed: " . $e->getMessage()
            ];
        }
    }

    /**
     * Reverts mutations of a specified job back to original captured states
     */
    public function rollbackMutation(string $jobId, int $idShop): array
    {
        $this->logger->log("Initiating atomic rollback for mutation job: {$jobId}", 'INFO');

        // Fetch job metadata
        $job = $this->repository->getJob($jobId);
        if (!$job) {
            return [
                'success' => false,
                'error' => "Job {$jobId} not found in the transaction log."
            ];
        }

        if ($job['state'] === 'ROLLED_BACK') {
            return [
                'success' => false,
                'error' => "Job {$jobId} has already been rolled back."
            ];
        }

        $revertPayloadJson = $job['revert_payload'];
        if (empty($revertPayloadJson)) {
            return [
                'success' => false,
                'error' => "No rollback safety metadata available for job {$jobId}."
            ];
        }

        $revertData = json_decode($revertPayloadJson, true);
        if (json_last_error() !== JSON_ERROR_NONE || empty($revertData)) {
            return [
                'success' => false,
                'error' => "Invalid or corrupt rollback metadata for job {$jobId}."
            ];
        }

        $this->db->execute('START TRANSACTION');

        try {
            $affectedCount = 0;

            // 1. Restore product & product_shop fields
            if (!empty($revertData['products'])) {
                foreach ($revertData['products'] as $idProduct => $data) {
                    $idProduct = (int)$idProduct;
                    
                    // Restore ps_product fields
                    if (!empty($data['product'])) {
                        $updates = [];
                        foreach ($data['product'] as $col => $val) {
                            if ($col === 'id_product') continue;
                            $updates[] = '`' . SaaSSQLEscaper::escapeBacktick($col) . '` = ' . ($val === null ? 'NULL' : '\'' . SaaSSQLEscaper::escape((string)$val) . '\'');
                        }
                        if (!empty($updates)) {
                            $this->db->execute('UPDATE `' . $this->dbPrefix . 'product` SET ' . implode(', ', $updates) . ' WHERE id_product = ' . $idProduct);
                        }
                    }

                    // Restore ps_product_shop fields
                    if (!empty($data['product_shop'])) {
                        $updates = [];
                        foreach ($data['product_shop'] as $col => $val) {
                            if ($col === 'id_product' || $col === 'id_shop') continue;
                            $updates[] = '`' . SaaSSQLEscaper::escapeBacktick($col) . '` = ' . ($val === null ? 'NULL' : '\'' . SaaSSQLEscaper::escape((string)$val) . '\'');
                        }
                        if (!empty($updates)) {
                            $this->db->execute('UPDATE `' . $this->dbPrefix . 'product_shop` SET ' . implode(', ', $updates) . ' WHERE id_product = ' . $idProduct . ' AND id_shop = ' . (int)$idShop);
                        }
                    }
                }
            }

            // 2. Restore specific prices
            // First, delete any current specific prices for the products in this shop
            $productIds = $revertData['target_ids'] ?? [];
            if (empty($productIds)) {
                // Fallback for older jobs
                $productIds = array_keys($revertData['products'] ?? []);
                if (empty($productIds) && !empty($revertData['specific_prices'])) {
                    $productIds = array_unique(array_column($revertData['specific_prices'], 'id_product'));
                }
            }
            
            $affectedCount = count($productIds);

            if (!empty($productIds)) {
                $escapedIds = implode(',', array_map('intval', $productIds));
                $this->db->execute('DELETE FROM `' . $this->dbPrefix . 'specific_price` WHERE id_product IN (' . $escapedIds . ') AND id_shop IN (0, ' . (int)$idShop . ')');
            }

            // Re-insert original specific prices
            if (!empty($revertData['specific_prices'])) {
                foreach ($revertData['specific_prices'] as $sp) {
                    $insertKeys = [];
                    $insertValues = [];
                    foreach ($sp as $col => $val) {
                        if ($col === 'id_specific_price') continue; // Let it auto-increment
                        $insertKeys[] = '`' . SaaSSQLEscaper::escapeBacktick($col) . '`';
                        $insertValues[] = $val === null ? 'NULL' : '\'' . SaaSSQLEscaper::escape((string)$val) . '\'';
                    }
                    $this->db->execute('INSERT INTO `' . $this->dbPrefix . 'specific_price` (' . implode(', ', $insertKeys) . ') VALUES (' . implode(', ', $insertValues) . ')');
                }
            }

            $this->db->execute('COMMIT');
            
            // Mark job as ROLLED_BACK
            $this->repository->logJobState($jobId, 'ROLLED_BACK', $affectedCount, json_decode($job['payload'], true));
            $this->logger->log("Atomic rollback completed successfully. Job {$jobId} marked as ROLLED_BACK. {$affectedCount} products reverted.", 'INFO');

            return [
                'success' => true,
                'message' => "Successfully reverted mutations for job {$jobId}."
            ];

        } catch (Exception $e) {
            $this->db->execute('ROLLBACK');
            $this->logger->log("CRITICAL ERROR: Rollback failed for job {$jobId}: " . $e->getMessage(), 'ERROR');
            return [
                'success' => false,
                'error' => "Rollback failed: " . $e->getMessage()
            ];
        }
    }

    /**
     * Compiles multiple update operations into a list of execution transaction queries
     */
    private function compileBatchQuery(array $chunkIds, array $actions, int $idShop): array
    {
        $escapedIds = implode(',', array_map('intval', $chunkIds));
        $queries = [];

        foreach ($actions as $field => $action) {
            $type = strtoupper($action['type'] ?? 'SET'); // SET, ADD, MULTIPLY
            $val = $action['value'];

            switch ($field) {
                case 'price':
                case 'product.price':
                    $escapedVal = (float)$val;
                    if ($type === 'ADD') {
                        $queries[] = 'UPDATE `' . $this->dbPrefix . 'product_shop` SET price = price + ' . $escapedVal . ' WHERE id_product IN (' . $escapedIds . ') AND id_shop = ' . (int)$idShop;
                        $queries[] = 'UPDATE `' . $this->dbPrefix . 'product` SET price = price + ' . $escapedVal . ' WHERE id_product IN (' . $escapedIds . ')';
                    } elseif ($type === 'MULTIPLY') {
                        $queries[] = 'UPDATE `' . $this->dbPrefix . 'product_shop` SET price = price * ' . $escapedVal . ' WHERE id_product IN (' . $escapedIds . ') AND id_shop = ' . (int)$idShop;
                        $queries[] = 'UPDATE `' . $this->dbPrefix . 'product` SET price = price * ' . $escapedVal . ' WHERE id_product IN (' . $escapedIds . ')';
                    } else {
                        $queries[] = 'UPDATE `' . $this->dbPrefix . 'product_shop` SET price = ' . $escapedVal . ' WHERE id_product IN (' . $escapedIds . ') AND id_shop = ' . (int)$idShop;
                        $queries[] = 'UPDATE `' . $this->dbPrefix . 'product` SET price = ' . $escapedVal . ' WHERE id_product IN (' . $escapedIds . ')';
                    }
                    break;

                case 'active':
                case 'product.active':
                    $escapedVal = (int)$val ? 1 : 0;
                    $queries[] = 'UPDATE `' . $this->dbPrefix . 'product_shop` SET active = ' . $escapedVal . ' WHERE id_product IN (' . $escapedIds . ') AND id_shop = ' . (int)$idShop;
                    $queries[] = 'UPDATE `' . $this->dbPrefix . 'product` SET active = ' . $escapedVal . ' WHERE id_product IN (' . $escapedIds . ')';
                    break;

                case 'reference':
                case 'product.reference':
                    $escapedVal = SaaSSQLEscaper::escape((string)$val);
                    $queries[] = 'UPDATE `' . $this->dbPrefix . 'product` SET reference = \'' . $escapedVal . '\' WHERE id_product IN (' . $escapedIds . ')';
                    break;

                case 'id_manufacturer':
                case 'manufacturer.id':
                case 'product.id_manufacturer':
                    $escapedVal = (int)$val;
                    $queries[] = 'UPDATE `' . $this->dbPrefix . 'product` SET id_manufacturer = ' . $escapedVal . ' WHERE id_product IN (' . $escapedIds . ')';
                    $queries[] = 'UPDATE `' . $this->dbPrefix . 'product_shop` SET id_manufacturer = ' . $escapedVal . ' WHERE id_product IN (' . $escapedIds . ') AND id_shop = ' . (int)$idShop;
                    break;

                case 'discount_percent':
                    $escapedVal = (float)$val / 100.0;
                    $queries[] = 'DELETE FROM `' . $this->dbPrefix . 'specific_price` WHERE id_product IN (' . $escapedIds . ') AND id_shop IN (0, ' . (int)$idShop . ')';
                    
                    if ($escapedVal > 0) {
                        $insertValues = [];
                        foreach ($chunkIds as $idProduct) {
                            $insertValues[] = '(' . (int)$idProduct . ', ' . (int)$idShop . ', 0, 0, 0, 0, 0, -1.000000, 1, ' . $escapedVal . ', 1, \'percentage\', \'0000-00-00 00:00:00\', \'0000-00-00 00:00:00\')';
                        }
                        $queries[] = 'INSERT INTO `' . $this->dbPrefix . 'specific_price` (`id_product`, `id_shop`, `id_currency`, `id_country`, `id_group`, `id_customer`, `id_product_attribute`, `price`, `from_quantity`, `reduction`, `reduction_tax`, `reduction_type`, `from`, `to`) VALUES ' . implode(',', $insertValues);
                    }
                    break;

                case 'discount_amount':
                    $escapedVal = (float)$val;
                    $queries[] = 'DELETE FROM `' . $this->dbPrefix . 'specific_price` WHERE id_product IN (' . $escapedIds . ') AND id_shop IN (0, ' . (int)$idShop . ')';
                    
                    if ($escapedVal > 0) {
                        $insertValues = [];
                        foreach ($chunkIds as $idProduct) {
                            $insertValues[] = '(' . (int)$idProduct . ', ' . (int)$idShop . ', 0, 0, 0, 0, 0, -1.000000, 1, ' . $escapedVal . ', 1, \'amount\', \'0000-00-00 00:00:00\', \'0000-00-00 00:00:00\')';
                        }
                        $queries[] = 'INSERT INTO `' . $this->dbPrefix . 'specific_price` (`id_product`, `id_shop`, `id_currency`, `id_country`, `id_group`, `id_customer`, `id_product_attribute`, `price`, `from_quantity`, `reduction`, `reduction_tax`, `reduction_type`, `from`, `to`) VALUES ' . implode(',', $insertValues);
                    }
                    break;
            }
        }

        return $queries;
    }
}

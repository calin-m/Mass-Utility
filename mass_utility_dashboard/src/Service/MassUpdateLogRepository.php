<?php
declare(strict_types=1);

namespace MassUtility\SaaS\Service;
use Exception;
use PDO;

/**
 * The database interaction layer for the `ps_mass_update_log` table.
 */
class MassUpdateLogRepository
{
    private Logger $logger;
    private SQLiteConnectionManager $connectionManager;

    public function __construct(Logger $logger, SQLiteConnectionManager $connectionManager)
    {
        $this->logger = $logger;
        $this->connectionManager = $connectionManager;
    }

    /**
     * Installs the tracking database table dynamically if missing and self-heals schemas
     */
    public function ensureTrackingTable(): void
    {
        $this->connectionManager->getConnection();
    }

    /**
     * Records job telemetry tracking states inside database logs
     */
    public function logJobState(string $jobId, string $state, int $affectedCount, array $payload, ?string $errors = null, ?array $revertPayload = null): void
    {
        try {
            $pdo = $this->connectionManager->getConnection();
            $now = date('Y-m-d H:i:s');
            
            $stmt = $pdo->prepare('INSERT INTO `mass_update_log` 
                (`job_id`, `state`, `affected_count`, `payload`, `revert_payload`, `errors`, `date_add`, `date_upd`) 
                VALUES (:job_id, :state, :affected_count, :payload, :revert_payload, :errors, :date_add, :date_upd)
                ON CONFLICT(`job_id`) DO UPDATE SET 
                `state` = excluded.state, 
                `affected_count` = excluded.affected_count, 
                `revert_payload` = CASE WHEN excluded.revert_payload IS NOT NULL THEN excluded.revert_payload ELSE `revert_payload` END,
                `errors` = excluded.errors, 
                `date_upd` = excluded.date_upd');
                
            $stmt->execute([
                ':job_id' => $jobId,
                ':state' => $state,
                ':affected_count' => $affectedCount,
                ':payload' => json_encode($payload),
                ':revert_payload' => $revertPayload ? json_encode($revertPayload) : null,
                ':errors' => $errors,
                ':date_add' => $now,
                ':date_upd' => $now
            ]);
        } catch (Exception $e) {
            $this->logger->log("Failed logging state to SQLite mass_update_log: " . $e->getMessage(), 'ERROR');
        }
    }

    /**
     * Retrieve a specific job entry by its ID
     */
    public function getJob(string $jobId): ?array
    {
        try {
            $pdo = $this->connectionManager->getConnection();
            $stmt = $pdo->prepare('SELECT * FROM `mass_update_log` WHERE `job_id` = :job_id');
            $stmt->execute([':job_id' => $jobId]);
            $row = $stmt->fetch();
            return is_array($row) ? $row : null;
        } catch (Exception $e) {
            $this->logger->log("Failed to fetch job from SQLite: " . $e->getMessage(), 'ERROR');
            return null;
        }
    }

    /**
     * Retrieve the most recent mutation jobs
     */
    public function getRecentJobs(int $limit = 20): array
    {
        try {
            $pdo = $this->connectionManager->getConnection();
            $stmt = $pdo->prepare('SELECT * FROM `mass_update_log` ORDER BY `date_add` DESC LIMIT :limit');
            $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll();
            return is_array($rows) ? $rows : [];
        } catch (Exception $e) {
            $this->logger->log("Failed to fetch recent jobs from SQLite: " . $e->getMessage(), 'ERROR');
            return [];
        }
    }

    /**
     * Clear all mutation logs
     */
    public function clearAllLogs(): void
    {
        try {
            $pdo = $this->connectionManager->getConnection();
            $pdo->exec('DELETE FROM `mass_update_log`'); // nosec
            $pdo->exec("DELETE FROM `sqlite_sequence` WHERE `name` = 'mass_update_log'"); // nosec
        } catch (Exception $e) {
            $this->logger->log("Failed to clear logs from SQLite: " . $e->getMessage(), 'ERROR');
        }
    }

    /**
     * Delete a specific mutation job by its ID
     */
    public function deleteJob(string $jobId): bool
    {
        try {
            $pdo = $this->connectionManager->getConnection();
            $stmt = $pdo->prepare('DELETE FROM `mass_update_log` WHERE `job_id` = :job_id');
            $stmt->execute([':job_id' => $jobId]);
            return true;
        } catch (Exception $e) {
            $this->logger->log("Failed to delete job from SQLite: " . $e->getMessage(), 'ERROR');
            return false;
        }
    }

    /**
     * Builds the Master Manifest for a Job and returns it as a gzip compressed binary string (Level 9).
     */
    public function exportJobGzip(string $jobId, string $dbPrefix = 'ps_', int $idShop = 1): ?string
    {
        $job = $this->getJob($jobId);
        if (!$job) {
            return null;
        }

        $sqlData = $this->reconstructSQLForArchive($job, $dbPrefix, $idShop);

        $manifest = [
            'job_metadata' => [
                'job_id' => $job['job_id'],
                'status' => $job['state'],
                'affected_count' => (int)$job['affected_count'],
                'date_executed' => $job['date_add'],
                'errors' => $job['errors'] ? json_decode($job['errors'], true) : null
            ],
            '📋 JSON Payloads' => [
                '⚡ Mutation Action Rules & Scope' => json_decode($job['payload'], true),
                '🔮 Captured Baseline Revert States (Original Database Cell Margins)' => $job['revert_payload'] ? json_decode($job['revert_payload'], true) : null
            ],
            '🌐 SQL Code' => [
                '⚡ Executed Mutation SQL Statements' => $sqlData['mutationSql'],
                '🔮 Projected Rollback Reversion SQL Statements' => $sqlData['revertSql']
            ]
        ];

        $jsonString = json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        
        // Compress at maximum level 9
        $gzData = gzencode($jsonString, 9);
        return $gzData !== false ? $gzData : null;
    }

    /**
     * Port of pmReconstructSQL to natively build SQL manifests server-side
     */
    private function reconstructSQLForArchive(array $job, string $dbPrefix, int $idShop): array
    {
        
        $mutationSql = '-- No executed mutations captured or invalid payload.\n';
        $revertSql = '-- No rollback safety snapshots recorded or invalid payload.\n';

        // 1. Reconstruct Mutation SQL
        $rawPayload = json_decode($job['payload'], true);
        $revertData = $job['revert_payload'] ? json_decode($job['revert_payload'], true) : null;
        
        $productIds = [];
        if ($revertData && isset($revertData['target_ids']) && is_array($revertData['target_ids'])) {
            $productIds = $revertData['target_ids'];
        } elseif ($revertData && isset($revertData['products']) && is_array($revertData['products'])) {
            $productIds = array_keys($revertData['products']);
        }
        
        if (!empty($rawPayload) && !empty($productIds)) {
            $mStatements = [];
            $escapedIds = implode(', ', array_map('intval', $productIds));
            
            foreach ($rawPayload as $field => $action) {
                $type = strtoupper($action['type'] ?? 'SET');
                $val = $action['value'];
                
                switch ($field) {
                    case 'price':
                    case 'product.price':
                        $escFloat = (float)$val;
                        if ($type === 'ADD') {
                            $mStatements[] = "UPDATE `{$dbPrefix}product_shop` SET price = price + {$escFloat} WHERE id_product IN ({$escapedIds}) AND id_shop = {$idShop};";
                            $mStatements[] = "UPDATE `{$dbPrefix}product` SET price = price + {$escFloat} WHERE id_product IN ({$escapedIds});";
                        } elseif ($type === 'MULTIPLY') {
                            $mStatements[] = "UPDATE `{$dbPrefix}product_shop` SET price = price * {$escFloat} WHERE id_product IN ({$escapedIds}) AND id_shop = {$idShop};";
                            $mStatements[] = "UPDATE `{$dbPrefix}product` SET price = price * {$escFloat} WHERE id_product IN ({$escapedIds});";
                        } else {
                            $mStatements[] = "UPDATE `{$dbPrefix}product_shop` SET price = {$escFloat} WHERE id_product IN ({$escapedIds}) AND id_shop = {$idShop};";
                            $mStatements[] = "UPDATE `{$dbPrefix}product` SET price = {$escFloat} WHERE id_product IN ({$escapedIds});";
                        }
                        break;
                    case 'active':
                    case 'product.active':
                        $escInt = (int)$val ? 1 : 0;
                        $mStatements[] = "UPDATE `{$dbPrefix}product_shop` SET active = {$escInt} WHERE id_product IN ({$escapedIds}) AND id_shop = {$idShop};";
                        $mStatements[] = "UPDATE `{$dbPrefix}product` SET active = {$escInt} WHERE id_product IN ({$escapedIds});";
                        break;
                    case 'reference':
                    case 'product.reference':
                        $escStr = SaaSSQLEscaper::escape((string)$val);
                        $mStatements[] = "UPDATE `{$dbPrefix}product` SET reference = '{$escStr}' WHERE id_product IN ({$escapedIds});";
                        break;
                    case 'id_manufacturer':
                    case 'manufacturer.id':
                    case 'product.id_manufacturer':
                        $escMan = (int)$val;
                        $mStatements[] = "UPDATE `{$dbPrefix}product` SET id_manufacturer = {$escMan} WHERE id_product IN ({$escapedIds});";
                        $mStatements[] = "UPDATE `{$dbPrefix}product_shop` SET id_manufacturer = {$escMan} WHERE id_product IN ({$escapedIds}) AND id_shop = {$idShop};";
                        break;
                    case 'discount_percent':
                        $escPct = ((float)$val) / 100.0;
                        $mStatements[] = "DELETE FROM `{$dbPrefix}specific_price` WHERE id_product IN ({$escapedIds}) AND id_shop IN (0, {$idShop});";
                        if ($escPct > 0) {
                            foreach ($productIds as $idProduct) {
                                $idProduct = (int)$idProduct;
                                $mStatements[] = "INSERT INTO `{$dbPrefix}specific_price` (`id_product`, `id_shop`, `id_currency`, `id_country`, `id_group`, `id_customer`, `id_product_attribute`, `price`, `from_quantity`, `reduction`, `reduction_tax`, `reduction_type`, `from`, `to`) VALUES ({$idProduct}, {$idShop}, 0, 0, 0, 0, 0, -1.000000, 1, {$escPct}, 1, 'percentage', '0000-00-00 00:00:00', '0000-00-00 00:00:00');";
                            }
                        }
                        break;
                    case 'discount_amount':
                        $escAmt = (float)$val;
                        $mStatements[] = "DELETE FROM `{$dbPrefix}specific_price` WHERE id_product IN ({$escapedIds}) AND id_shop IN (0, {$idShop});";
                        if ($escAmt > 0) {
                            foreach ($productIds as $idProduct) {
                                $idProduct = (int)$idProduct;
                                $mStatements[] = "INSERT INTO `{$dbPrefix}specific_price` (`id_product`, `id_shop`, `id_currency`, `id_country`, `id_group`, `id_customer`, `id_product_attribute`, `price`, `from_quantity`, `reduction`, `reduction_tax`, `reduction_type`, `from`, `to`) VALUES ({$idProduct}, {$idShop}, 0, 0, 0, 0, 0, -1.000000, 1, {$escAmt}, 1, 'amount', '0000-00-00 00:00:00', '0000-00-00 00:00:00');";
                            }
                        }
                        break;
                }
            }
            if (!empty($mStatements)) {
                $mutationSql = implode("\n", $mStatements);
            }
        }

        // 2. Reconstruct Reversion SQL
        if ($revertData) {
            $rStatements = [];
            
            if (isset($revertData['products']) && is_array($revertData['products'])) {
                $productGroups = [];
                $productShopGroups = [];
                
                foreach ($revertData['products'] as $idProduct => $data) {
                    $idProduct = (int)$idProduct;
                    
                    if (isset($data['product']) && is_array($data['product'])) {
                        $cols = [];
                        foreach ($data['product'] as $col => $val) {
                            if ($col === 'id_product') continue;
                            $escVal = $val === null ? 'NULL' : "'" . SaaSSQLEscaper::escape((string)$val) . "'";
                            $cols[] = "`{$col}` = {$escVal}";
                        }
                        if (!empty($cols)) {
                            $setStr = implode(', ', $cols);
                            if (!isset($productGroups[$setStr])) $productGroups[$setStr] = [];
                            $productGroups[$setStr][] = $idProduct;
                        }
                    }
                    
                    if (isset($data['product_shop']) && is_array($data['product_shop'])) {
                        $cols = [];
                        foreach ($data['product_shop'] as $col => $val) {
                            if ($col === 'id_product' || $col === 'id_shop') continue;
                            $escVal = $val === null ? 'NULL' : "'" . SaaSSQLEscaper::escape((string)$val) . "'";
                            $cols[] = "`{$col}` = {$escVal}";
                        }
                        if (!empty($cols)) {
                            $setStr = implode(', ', $cols);
                            if (!isset($productShopGroups[$setStr])) $productShopGroups[$setStr] = [];
                            $productShopGroups[$setStr][] = $idProduct;
                        }
                    }
                }
                
                foreach ($productGroups as $setStr => $ids) {
                    $idsStr = implode(', ', $ids);
                    $rStatements[] = "UPDATE `{$dbPrefix}product` SET {$setStr} WHERE id_product IN ({$idsStr});";
                }
                
                foreach ($productShopGroups as $setStr => $ids) {
                    $idsStr = implode(', ', $ids);
                    $rStatements[] = "UPDATE `{$dbPrefix}product_shop` SET {$setStr} WHERE id_product IN ({$idsStr}) AND id_shop = {$idShop};";
                }
            }
            
            if (!empty($productIds)) {
                $idsStr = implode(', ', array_map('intval', $productIds));
                $rStatements[] = "DELETE FROM `{$dbPrefix}specific_price` WHERE id_product IN ({$idsStr}) AND id_shop IN (0, {$idShop});";
            }
            
            if (isset($revertData['specific_prices']) && is_array($revertData['specific_prices'])) {
                foreach ($revertData['specific_prices'] as $sp) {
                    $insertKeys = [];
                    $insertValues = [];
                    foreach ($sp as $col => $val) {
                        if ($col === 'id_specific_price') continue;
                        $insertKeys[] = "`" . SaaSSQLEscaper::escapeBacktick($col) . "`";
                        $insertValues[] = $val === null ? 'NULL' : "'" . SaaSSQLEscaper::escape((string)$val) . "'";
                    }
                    $keysStr = implode(', ', $insertKeys);
                    $valsStr = implode(', ', $insertValues);
                    $rStatements[] = "INSERT INTO `{$dbPrefix}specific_price` ({$keysStr}) VALUES ({$valsStr});";
                }
            }
            
            if (!empty($rStatements)) {
                $revertSql = implode("\n", $rStatements);
            }
        }

        return [
            'mutationSql' => $mutationSql,
            'revertSql' => $revertSql
        ];
    }
}

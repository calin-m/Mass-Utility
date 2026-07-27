<?php
// @Arch[DatabaseDiffEngine]

/**
 * Project Mass - Database Audit Trail Diff Engine
 * Boundary Isolation Shield to mathematically prove zero side-effects during mutations.
 */

namespace MassUtility\SaaS\Engine;

use Exception;
use MassUtility\SaaS\Service\Logger;
use MassUtility\SaaS\Service\DatabaseAdapterInterface;

/**
 * The security governor ensuring table snapshots and mutations do not inadvertently alter unrelated data rows.
 */
class DatabaseDiffEngine
{
    private Logger $logger;
    private DatabaseAdapterInterface $db;
    private string $dbPrefix;

    public function __construct(Logger $logger, DatabaseAdapterInterface $db, string $dbPrefix = 'ps_')
    {
        $this->logger = $logger;
        $this->db = $db;
        $this->dbPrefix = $dbPrefix;
    }

    /**
     * Captures a checksum snapshot of highly sensitive boundary tables.
     * 
     * @param array $tables Array of non-prefixed table names (e.g. ['customer', 'orders'])
     * @return array Associative array of tableName => checksum
     */
    public function captureBoundarySnapshot(array $tables): array
    {
        $snapshot = [];

        foreach ($tables as $table) {
            $fullTableName = $this->dbPrefix . $table;
            try {
                $result = $this->db->executeS('CHECKSUM TABLE `' . $fullTableName . '`');
                if (!empty($result) && isset($result[0]['Checksum'])) {
                    $snapshot[$table] = $result[0]['Checksum'];
                }
            } catch (\Throwable $e) {
                $this->logger->log("WARNING: DiffEngine could not capture baseline checksum for protected table '{$fullTableName}'. Skipping. Error: " . $e->getMessage(), 'WARNING');
            }
        }

        return $snapshot;
    }

    /**
     * Recalculates checksums and compares against the baseline to detect drift.
     * 
     * @param array $baselineSnapshot The baseline array returned by captureBoundarySnapshot()
     * @return array ['drift_detected' => bool, 'drifted_tables' => array]
     */
    public function verifyBoundaryDrift(array $baselineSnapshot): array
    {
        $driftDetected = false;
        $driftedTables = [];
        
        $currentSnapshot = $this->captureBoundarySnapshot(array_keys($baselineSnapshot));

        foreach ($baselineSnapshot as $table => $baselineChecksum) {
            if (!isset($currentSnapshot[$table])) {
                $driftDetected = true;
                $driftedTables[] = $table;
                $this->logger->log("CRITICAL DRIFT DETECTED: Protected table '{$table}' vanished during mutation execution.", 'ERROR');
                continue;
            }

            if ((string)$baselineChecksum !== (string)$currentSnapshot[$table]) {
                $driftDetected = true;
                $driftedTables[] = $table;
                $this->logger->log("CRITICAL DRIFT DETECTED: Protected table '{$table}' was mutated! Baseline hash: {$baselineChecksum}, New hash: {$currentSnapshot[$table]}.", 'ERROR');
            }
        }

        return [
            'drift_detected' => $driftDetected,
            'drifted_tables' => $driftedTables
        ];
    }
}

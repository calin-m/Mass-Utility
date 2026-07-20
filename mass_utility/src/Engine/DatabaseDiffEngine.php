<?php

/**
 * Project Mass - Database Audit Trail Diff Engine
 * Boundary Isolation Shield to mathematically prove zero side-effects during mutations.
 */

namespace MassUtility\Engine;

if (!defined('_PS_VERSION_')) {
    exit;
}

use Db;
use Exception;
use MassUtility\Service\BridgeLogger;

/**
 * The security governor ensuring table snapshots and mutations do not inadvertently alter unrelated data rows.
 */
class DatabaseDiffEngine
{
    private BridgeLogger $logger;

    public function __construct(BridgeLogger $logger)
    {
        $this->logger = $logger;
    }

    /**
     * Captures a checksum snapshot of highly sensitive boundary tables.
     * 
     * @param array $tables Array of non-prefixed table names (e.g. ['customer', 'orders'])
     * @return array Associative array of tableName => checksum
     */
    public function captureBoundarySnapshot(array $tables): array
    {
        $db = Db::getInstance(true);
        $snapshot = [];

        foreach ($tables as $table) {
            $fullTableName = _DB_PREFIX_ . $table;
            try {
                // We use CHECKSUM TABLE which is extremely fast for MyISAM and InnoDB
                $result = $db->executeS('CHECKSUM TABLE `' . $fullTableName . '`');
                if (!empty($result) && isset($result[0]['Checksum'])) {
                    $snapshot[$table] = $result[0]['Checksum'];
                }
            } catch (\Throwable $e) {
                // Table might not exist or permission denied, log and skip
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
        
        // Take a fresh snapshot of the exact same tables that successfully baselined
        $currentSnapshot = $this->captureBoundarySnapshot(array_keys($baselineSnapshot));

        foreach ($baselineSnapshot as $table => $baselineChecksum) {
            if (!isset($currentSnapshot[$table])) {
                // If a table suddenly disappeared during the transaction
                $driftDetected = true;
                $driftedTables[] = $table;
                $this->logger->log("CRITICAL DRIFT DETECTED: Protected table '{$table}' vanished during mutation execution.", 'ERROR');
                continue;
            }

            if ((string)$baselineChecksum !== (string)$currentSnapshot[$table]) {
                // Hashes do not match. The table was altered!
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

<?php
declare(strict_types=1);

if (!defined('_PS_VERSION_')) {
    exit;
}

namespace MassUtility\Service;

use Db;
use Exception;

/**
 * Handles database profiling, index fragmentation analysis, and table optimization.
 */
class DatabaseProfilerEngine
{
    private BridgeLogger $logger;

    public function __construct(BridgeLogger $logger)
    {
        $this->logger = $logger;
    }

    /**
     * Analyzes all tables starting with the PrestaShop prefix in the current database.
     * Calculates fragmentation metrics and assigns an overall performance grade.
     *
     * @return array
     */
    public function analyzeFragmentation(): array
    {
        try {
            $prefix = _DB_PREFIX_;
            $sql = "SELECT TABLE_NAME, ENGINE, DATA_LENGTH, INDEX_LENGTH, DATA_FREE 
                    FROM information_schema.TABLES 
                    WHERE TABLE_SCHEMA = DATABASE() 
                      AND TABLE_NAME LIKE '" . pSQL($prefix) . "%'
                    ORDER BY DATA_FREE DESC";

            $rows = Db::getInstance()->executeS($sql);
            if (!is_array($rows)) {
                $rows = [];
            }

            $totalTables = count($rows);
            $totalSize = 0;
            $totalFree = 0;
            $fragmentedTables = [];

            foreach ($rows as $row) {
                $tableName = $row['TABLE_NAME'];
                $engine = $row['ENGINE'];
                $dataLength = (int)$row['DATA_LENGTH'];
                $indexLength = (int)$row['INDEX_LENGTH'];
                $dataFree = (int)$row['DATA_FREE'];

                $tableSize = $dataLength + $indexLength;
                $totalSize += $tableSize;
                $totalFree += $dataFree;

                // We consider a table fragmented if it has free space (overhead)
                if ($dataFree > 0) {
                    $fragRatio = $dataFree / ($tableSize + $dataFree) * 100;
                    $fragmentedTables[] = [
                        'name' => $tableName,
                        'engine' => $engine,
                        'size' => $tableSize,
                        'free' => $dataFree,
                        'ratio' => round($fragRatio, 2)
                    ];
                }
            }

            // Assign overall performance grade
            $overallRatio = ($totalSize + $totalFree) > 0 ? ($totalFree / ($totalSize + $totalFree)) * 100 : 0;
            $grade = 'A';
            if ($overallRatio >= 35) {
                $grade = 'F';
            } elseif ($overallRatio >= 20) {
                $grade = 'D';
            } elseif ($overallRatio >= 10) {
                $grade = 'C';
            } elseif ($overallRatio >= 5) {
                $grade = 'B';
            }

            return [
                'success' => true,
                'summary' => [
                    'total_tables' => $totalTables,
                    'total_size' => $totalSize,
                    'total_free' => $totalFree,
                    'ratio' => round($overallRatio, 2),
                    'grade' => $grade
                ],
                'fragmented_tables' => $fragmentedTables
            ];
        } catch (Exception $e) {
            $this->logger->log("Database profiling failed: " . $e->getMessage(), 'ERROR');
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Executes an OPTIMIZE TABLE command on a specific PrestaShop table.
     *
     * @param string $tableName
     * @return bool
     * @throws Exception
     */
    public function optimizeTable(string $tableName): bool
    {
        // 1. Strict pattern check (CWE-89 SQLi protection)
        if (!preg_match('/^[a-zA-Z0-9_-]+$/', $tableName)) {
            throw new Exception("Invalid table name characters.");
        }

        // 2. Strict PrestaShop prefix verification
        $prefix = _DB_PREFIX_;
        if (strpos($tableName, $prefix) !== 0) {
            throw new Exception("Unauthorized table access: Table does not belong to PrestaShop context.");
        }

        $this->logger->log("Running OPTIMIZE TABLE on: " . $tableName, 'INFO');
        
        $sql = "OPTIMIZE TABLE `" . bqSQL($tableName) . "`";
        $result = Db::getInstance()->execute($sql);

        if (!$result) {
            throw new Exception("Optimize command failed on database execution layer.");
        }

        $this->logger->log("Successfully optimized table: " . $tableName, 'INFO');
        return true;
    }
}

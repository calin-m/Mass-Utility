<?php
// @Arch[BackupDiffEngine]

declare(strict_types=1);

namespace MassUtility\Service;

if (!defined('_PS_VERSION_')) {
    exit;
}

use Db;
use Exception;

/**
 * Handles database backup comparison, drift analysis, and row-level diffing.
 */
class BackupDiffEngine
{
    private string $backupDir;
    private BridgeLogger $logger;
    private array $defaultTargetTables;

    public function __construct(BridgeLogger $logger, string $backupDir, array $defaultTargetTables = [])
    {
        $this->logger = $logger;
        $this->backupDir = $backupDir;
        $this->defaultTargetTables = $defaultTargetTables;
    }

    /**
     * Extracts row-level differences for a specific table between a backup and the live database.
     */
    public function diffTableRows(string $backupName, string $tableName): array
    {
        $backupName = basename($backupName);
        $baseName = preg_replace('/(\.sql\.gz|\.log)$/', '', $backupName);
        $sqlPath = $this->backupDir . $baseName . '/' . $baseName . '.sql.gz';

        if (!file_exists($sqlPath)) {
            throw new Exception('Target SQL backup file not found.');
        }

        $db = Db::getInstance(true);
        $tableName = pSQL($tableName);
        
        $activeRows = [];
        $primaryKey = null;
        try {
            $cols = $db->executeS('DESCRIBE `' . $tableName . '`');
            $columnsOrder = [];
            if (is_array($cols)) {
                foreach ($cols as $idx => $col) {
                    $columnsOrder[$idx] = $col['Field'];
                    if ($col['Key'] === 'PRI' && $primaryKey === null) {
                        $primaryKey = $col['Field'];
                    }
                }
            }
            
            if (!$primaryKey && count($columnsOrder) > 0) {
                $primaryKey = $columnsOrder[0];
            }

            if ($primaryKey) {
                $liveData = $db->executeS('SELECT * FROM `' . $tableName . '` LIMIT 5000');
                if (is_array($liveData)) {
                    foreach ($liveData as $row) {
                        $activeRows[(string)$row[$primaryKey]] = $row;
                    }
                }
            }
        } catch (\Throwable $e) {
            throw new Exception('Failed to fetch active state for ' . $tableName . ': ' . $e->getMessage());
        }

        $backupRows = [];
        $gz = @gzopen($sqlPath, 'r');
        if ($gz !== false) {
            try {
                while (!gzeof($gz)) {
                    $line = gzgets($gz, 65536);
                    if ($line === false) {
                        break;
                    }
                    
                    if (stripos($line, 'INSERT INTO `' . $tableName . '` VALUES') !== false) {
                        while (!gzeof($gz)) {
                            $valLine = gzgets($gz, 65536);
                            if ($valLine === false || trim($valLine) === '' || strpos($valLine, ';') === 0) {
                                break;
                            }
                            
                            $valLine = trim($valLine);
                            if (strpos($valLine, '(') === 0) {
                                $rparent = strrpos($valLine, ')');
                                if ($rparent !== false) {
                                    $inner = substr($valLine, 1, $rparent - 1);
                                    $parts = str_getcsv($inner, ',', "'");
                                    
                                    if (is_array($parts) && count($parts) > 0) {
                                        $rowAssoc = [];
                                        $pkValue = null;
                                        foreach ($parts as $idx => $val) {
                                            $colName = $columnsOrder[$idx] ?? 'col_' . $idx;
                                            $cleanVal = trim($val, "'");
                                            $rowAssoc[$colName] = $cleanVal;
                                            if ($colName === $primaryKey) {
                                                $pkValue = $cleanVal;
                                            }
                                        }
                                        
                                        if ($pkValue !== null) {
                                            $backupRows[(string)$pkValue] = $rowAssoc;
                                        }
                                    }
                                }
                            }
                            if (strpos($valLine, ';') !== false) {
                                break;
                            }
                        }
                        break; 
                    }
                }
                gzclose($gz);
            } catch (\Throwable $e) {
                @gzclose($gz);
            }
        }

        $added = [];
        $deleted = [];
        $modified = [];

        foreach ($activeRows as $pk => $liveRow) {
            if (!isset($backupRows[$pk])) {
                $added[] = $liveRow;
            } else {
                $backupRow = $backupRows[$pk];
                $diffs = [];
                foreach ($liveRow as $col => $liveVal) {
                    $backVal = $backupRow[$col] ?? null;
                    if ((string)$liveVal !== (string)$backVal) {
                        $diffs[$col] = ['backup' => $backVal, 'live' => $liveVal];
                    }
                }
                if (!empty($diffs)) {
                    $modified[] = [
                        'pk' => $pk,
                        'changes' => $diffs
                    ];
                }
            }
        }

        foreach ($backupRows as $pk => $backupRow) {
            if (!isset($activeRows[$pk])) {
                $deleted[] = $backupRow;
            }
        }

        return [
            'table' => $tableName,
            'primary_key' => $primaryKey,
            'summary' => [
                'added' => count($added),
                'deleted' => count($deleted),
                'modified' => count($modified),
            ],
            'added_rows' => array_slice($added, 0, 50),
            'deleted_rows' => array_slice($deleted, 0, 50),
            'modified_rows' => array_slice($modified, 0, 50),
        ];
    }

    /**
     * Compares active catalog products against backup rows and cross-checks telemetry log.
     */
    public function compareBackup(string $backupName): array
    {
        $backupName = basename($backupName);
        $baseName = preg_replace('/(\.sql\.gz|\.log)$/', '', $backupName);
        $sqlPath = $this->backupDir . $baseName . '/' . $baseName . '.sql.gz';
        $logPath = $this->backupDir . $baseName . '/' . $baseName . '.log';

        if (!file_exists($sqlPath)) {
            throw new Exception('Target SQL backup file not found.');
        }

        $db = Db::getInstance(true);

        $logMetadata = "No telemetry log file compiled for this backup.";
        $backupChecksums = [];
        $backupRowCounts = [];
        
        if (file_exists($logPath)) {
            $logMetadata = @file_get_contents($logPath);
            
            if (preg_match_all('/Table `([^`]+)` Checksum:\s*(\d+)/i', $logMetadata, $matches, PREG_SET_ORDER)) {
                foreach ($matches as $match) {
                    $backupChecksums[$match[1]] = $match[2];
                }
            }
            
            if (preg_match_all('/Table `([^`]+)`:\s*(\d+)\s*row/i', $logMetadata, $matches, PREG_SET_ORDER)) {
                foreach ($matches as $match) {
                    $backupRowCounts[$match[1]] = (int)$match[2];
                }
            }
        }

        $targetTablesToCheck = array_keys($backupChecksums);
        if (empty($targetTablesToCheck)) {
            $targetTablesToCheck = array_keys($backupRowCounts);
        }

        if (empty($targetTablesToCheck)) {
            $gz = @gzopen($sqlPath, 'r');
            if ($gz !== false) {
                while (!gzeof($gz)) {
                    $line = gzgets($gz, 4096);
                    if ($line === false) {
                        break;
                    }
                    if (preg_match('/DROP TABLE IF EXISTS `([^`]+)`/i', $line, $match)) {
                        $targetTablesToCheck[] = $match[1];
                    }
                }
                gzclose($gz);
                $targetTablesToCheck = array_unique($targetTablesToCheck);
            }
        }

        if (empty($targetTablesToCheck)) {
            foreach ($this->defaultTargetTables as $tableBase) {
                $targetTablesToCheck[] = _DB_PREFIX_ . $tableBase;
            }
        }

        $productTable = _DB_PREFIX_ . 'product';
        $runKeyCheck = in_array($productTable, $targetTablesToCheck);

        $activeProducts = [];
        $productCols = [];
        if ($runKeyCheck) {
            try {
                $cols = $db->executeS('DESCRIBE `' . $productTable . '`');
                if (is_array($cols)) {
                    foreach ($cols as $idx => $col) {
                        $productCols[$col['Field']] = $idx;
                    }
                }

                $langTable = _DB_PREFIX_ . 'product_lang';
                $langQuery = 'SELECT id_lang FROM `' . _DB_PREFIX_ . 'lang` WHERE active = 1 ORDER BY id_lang ASC LIMIT 1';
                $sql = 'SELECT p.id_product, p.reference, p.price, pl.name 
                        FROM `' . $productTable . '` p 
                        LEFT JOIN `' . $langTable . '` pl 
                          ON p.id_product = pl.id_product 
                          AND pl.id_lang = (' . $langQuery . ')';
                $rows = $db->executeS($sql);
                if (is_array($rows)) {
                    foreach ($rows as $r) {
                        $activeProducts[(int)$r['id_product']] = [
                            'id_product' => (int)$r['id_product'],
                            'reference' => (string)($r['reference'] ?? ''),
                            'price' => (float)($r['price'] ?? 0.0),
                            'name' => (string)($r['name'] ?? 'Product #' . $r['id_product'])
                        ];
                    }
                }
            } catch (\Throwable $e) {
                $this->logger->log('Failed to fetch active product metadata: ' . $e->getMessage(), 'WARNING');
            }
        }

        $backupProducts = [];
        if ($runKeyCheck && isset($productCols['id_product'])) {
            $idColIdx = $productCols['id_product'];
            $refColIdx = $productCols['reference'] ?? null;
            $priceColIdx = $productCols['price'] ?? null;

            $gz = @gzopen($sqlPath, 'r');
            if ($gz !== false) {
                try {
                    while (!gzeof($gz)) {
                        $line = gzgets($gz, 65536);
                        if ($line === false) {
                            break;
                        }

                        if (stripos($line, 'INSERT INTO `' . $productTable . '` VALUES') !== false) {
                            while (!gzeof($gz)) {
                                $valLine = gzgets($gz, 65536);
                                if ($valLine === false || trim($valLine) === '' || strpos($valLine, ';') === 0) {
                                    break;
                                }

                                $valLine = trim($valLine);
                                if (strpos($valLine, '(') === 0) {
                                    $rparent = strrpos($valLine, ')');
                                    if ($rparent !== false) {
                                        $inner = substr($valLine, 1, $rparent - 1);
                                        $parts = str_getcsv($inner, ',', "'");

                                        if (isset($parts[$idColIdx])) {
                                            $idVal = (int)trim($parts[$idColIdx], "'");
                                            $refVal = ($refColIdx !== null && isset($parts[$refColIdx])) ? trim($parts[$refColIdx], "'") : '';
                                            $priceVal = ($priceColIdx !== null && isset($parts[$priceColIdx])) ? (float)trim($parts[$priceColIdx], "'") : 0.0;

                                            $backupProducts[$idVal] = [
                                                'id_product' => $idVal,
                                                'reference' => $refVal,
                                                'price' => $priceVal,
                                                'name' => 'Product #' . $idVal
                                            ];
                                        }
                                    }
                                }
                                if (strpos($valLine, ';') !== false) {
                                    break;
                                }
                            }
                            break;
                        }
                    }
                    gzclose($gz);
                } catch (\Throwable $e) {
                    @gzclose($gz);
                }
            }
        }

        $addedProducts = [];
        $deletedProducts = [];

        if ($runKeyCheck) {
            foreach ($activeProducts as $id => $p) {
                if (!isset($backupProducts[$id])) {
                    $addedProducts[] = $p;
                }
            }
            foreach ($backupProducts as $id => $p) {
                if (!isset($activeProducts[$id])) {
                    $deletedProducts[] = $p;
                }
            }
        }

        $tableDrift = [];
        $checksumStatus = [];
        $totalBackupRows = 0;
        $totalActiveRows = 0;
        $checksumDriftFound = false;

        foreach ($targetTablesToCheck as $fullTableName) {
            $cleanName = str_replace(_DB_PREFIX_, '', $fullTableName);

            try {
                $chkRow = $db->getRow('CHECKSUM TABLE `' . $fullTableName . '`');
                $liveChecksum = isset($chkRow['Checksum']) ? (string)$chkRow['Checksum'] : '0';

                $cntRow = $db->getRow('SELECT COUNT(*) as total FROM `' . $fullTableName . '`');
                $liveCount = isset($cntRow['total']) ? (int)$cntRow['total'] : 0;

                $backupChecksum = $backupChecksums[$fullTableName] ?? $backupChecksums[$cleanName] ?? null;
                $backupCount = $backupRowCounts[$cleanName] ?? $backupRowCounts[$fullTableName] ?? 0;

                $totalBackupRows += $backupCount;
                $totalActiveRows += $liveCount;

                $checksumMatch = ($backupChecksum !== null) ? ((string)$backupChecksum === $liveChecksum) : true;
                if (!$checksumMatch) {
                    $checksumDriftFound = true;
                }

                $isVolatile = in_array($cleanName, ['connections', 'connections_source', 'guest', 'cart', 'log'], true);

                $checksumStatus[$fullTableName] = [
                    'match' => $checksumMatch,
                    'backup_rows' => $backupCount,
                    'active_rows' => $liveCount,
                    'volatile' => $isVolatile,
                    'backup' => $backupChecksum ?? 'N/A',
                    'active' => $liveChecksum
                ];

                $tableDrift[] = [
                    'table' => $cleanName,
                    'full_name' => $fullTableName,
                    'live_count' => $liveCount,
                    'backup_count' => $backupCount,
                    'live_checksum' => $liveChecksum,
                    'backup_checksum' => $backupChecksum,
                    'checksum_match' => $checksumMatch,
                    'count_diff' => ($backupCount !== null) ? ($liveCount - $backupCount) : 0
                ];
            } catch (\Throwable $e) {
                $this->logger->log("Failed checksum audit for {$fullTableName}: " . $e->getMessage(), 'WARNING');
            }
        }

        return [
            'success' => true,
            'backup_name' => $backupName,
            'checksum_drift' => $checksumDriftFound,
            'backup_rows' => $totalBackupRows,
            'active_rows' => $totalActiveRows,
            'checksum_status' => $checksumStatus,
            'table_drift' => $tableDrift,
            'added_products' => $addedProducts,
            'deleted_products' => $deletedProducts,
            'added' => $addedProducts,
            'deleted' => $deletedProducts,
            'added_count' => count($addedProducts),
            'deleted_count' => count($deletedProducts),
            'log_metadata' => $logMetadata
        ];
    }
}

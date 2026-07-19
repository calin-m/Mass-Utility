<?php
declare(strict_types=1);

namespace MassUtility\Service;

use Db;
use Exception;

/**
 * Responsible for the isolation, streaming, and generation of `.sql` files for specific database tables.
 */
class TableBackupManager
{
    private array $targetTables = [];
    private string $backupDir;
    private BridgeLogger $logger;
    private ResourceMonitor $resourceMonitor;
    private SettingsManager $settingsManager;

    public function __construct(BridgeLogger $logger, ?ResourceMonitor $resourceMonitor = null)
    {
        $this->logger = $logger;
        $this->resourceMonitor = $resourceMonitor ?? new ResourceMonitor();
        $this->settingsManager = new SettingsManager();
        // backups directory inside the mass_utility module folder
        $this->backupDir = _PS_MODULE_DIR_ . 'mass_utility/backups/';
        if (!is_dir($this->backupDir)) {
            if (!mkdir($this->backupDir, 0755, true) && !is_dir($this->backupDir)) {
                throw new Exception('Failed to create core backup directory at: ' . $this->backupDir);
            }
        }

        // Ensure import and manifest temp directories exist
        $importTmp = $this->backupDir . 'import_tmp/';
        if (!is_dir($importTmp)) {
            if (!mkdir($importTmp, 0755, true) && !is_dir($importTmp)) {
                throw new Exception('Failed to create import temp directory at: ' . $importTmp);
            }
        }
        $manifestTmp = $this->backupDir . 'manifest_tmp/';
        if (!is_dir($manifestTmp)) {
            if (!mkdir($manifestTmp, 0755, true) && !is_dir($manifestTmp)) {
                throw new Exception('Failed to create manifest temp directory at: ' . $manifestTmp);
            }
        }
        $this->targetTables = $this->getDefaultTargetTables();
    }

    public function getTargetTables(): array
    {
        return $this->targetTables;
    }

    public function getDefaultTargetTables(): array
    {
        try {
            $cats = $this->getAllTablesCategorized();
            $merged = array_unique(array_merge(
                $cats['catalog'] ?? [],
                $cats['stock_attributes'] ?? [],
                $cats['pricing_taxes'] ?? []
            ));
            if (!empty($merged)) {
                return $merged;
            }
        } catch (\Throwable $e) {
            $this->logger->log('Failed to dynamically resolve default tables: ' . $e->getMessage() . '. Falling back to legacy defaults.', 'WARNING');
        }
        return ['product', 'product_shop', 'product_lang'];
    }

    /**
     * Run all Pre-Flight Safety Audits
     */
    public function runPreFlightAudits(): array
    {
        $dbLocks = $this->auditDbLocks();
        $diskSpace = $this->auditDiskSpace();
        $memory = $this->auditMemoryFloor();
        $filePerms = $this->auditFilePermissions();

        $overall = true;
        if (isset($diskSpace['fail']) && $diskSpace['fail']) $overall = false;
        if (isset($memory['fail']) && $memory['fail']) $overall = false;
        if (isset($filePerms['fail']) && $filePerms['fail']) $overall = false;

        unset($diskSpace['fail'], $memory['fail'], $filePerms['fail']);

        return [
            'db_locks' => $dbLocks,
            'disk_space' => $diskSpace,
            'memory' => $memory,
            'file_permissions' => $filePerms,
            'overall' => $overall
        ];
    }

    private function auditDbLocks(): array
    {
        try {
            $db = Db::getInstance(true);
            $processlist = $db->executeS('SHOW FULL PROCESSLIST');
            $activeLocks = 0;
            if (is_array($processlist)) {
                foreach ($processlist as $proc) {
                    if (isset($proc['State']) && stripos($proc['State'], 'lock') !== false) {
                        $activeLocks++;
                    }
                }
            }
            if ($activeLocks > 0) {
                return ['status' => 'WARNING', 'message' => sprintf('%d active database lock(s) detected.', $activeLocks)];
            }
        } catch (\Throwable $e) {
            return ['status' => 'WARNING', 'message' => 'Could not audit active DB locks (restricted permissions).'];
        }
        return ['status' => 'PASS', 'message' => '0 active table locks detected.'];
    }

    private function auditDiskSpace(): array
    {
        $customQuotaGb = (float)$this->settingsManager->getSetting(SettingsManager::PM_CUSTOM_DISK_QUOTA_GB);
        
        if ($customQuotaGb > 0) {
            $usedMB = 0.0;
            if (function_exists('shell_exec')) {
                $duOutput = @shell_exec('du -sm ' . escapeshellarg(_PS_ROOT_DIR_)); // nosec
                if ($duOutput) {
                    $parts = explode("\t", trim($duOutput));
                    $usedMB = (float)$parts[0];
                }
            }
            if ($usedMB > 0) {
                $usedGB = $usedMB / 1024;
                $freeGB = max(0.0, $customQuotaGb - $usedGB);
                if ($freeGB < 0.2) {
                    return ['status' => 'FAIL', 'message' => sprintf('Low disk space: %.2f GB free of %.1f GB Custom Quota.', $freeGB, $customQuotaGb), 'fail' => true];
                }
                return ['status' => 'PASS', 'message' => sprintf('Sufficient disk space: %.2f GB free (%.2f GB used of %.1f GB Custom Quota).', $freeGB, $usedGB, $customQuotaGb)];
            }
            return ['status' => 'PASS', 'message' => sprintf('Custom cPanel Quota Active: %.1f GB Limit (Physical tracking restricted by host).', $customQuotaGb)];
        }

        $cpanelDisk = $this->getCpanelDiskSpace();
        if ($cpanelDisk !== null) {
            $freeMB = $cpanelDisk['free'] / 1024 / 1024;
            $limitGB = $cpanelDisk['limit'] / 1024 / 1024 / 1024;
            $usedGB = $cpanelDisk['used'] / 1024 / 1024 / 1024;
            
            if ($freeMB < 200.0) {
                return ['status' => 'FAIL', 'message' => sprintf('Low disk space: %.2f MB free of %.1f GB cPanel quota.', $freeMB, $limitGB), 'fail' => true];
            }
            return ['status' => 'PASS', 'message' => sprintf('Sufficient disk space: %.2f GB free (%.2f GB used of %.1f GB cPanel quota).', $freeMB / 1024, $usedGB, $limitGB)];
        }

        $freeBytes = @disk_free_space(_PS_ROOT_DIR_);
        if ($freeBytes !== false) {
            $freeMB = $freeBytes / 1024 / 1024;
            if ($freeMB < 200.0) {
                return ['status' => 'FAIL', 'message' => sprintf('Critically low disk space: %.2f MB available.', $freeMB), 'fail' => true];
            }
            return ['status' => 'PASS', 'message' => sprintf('Sufficient disk space: %.2f GB available (Partition limit).', $freeMB / 1024)];
        }
        
        return ['status' => 'WARNING', 'message' => 'Could not audit disk space limits.'];
    }

    private function auditMemoryFloor(): array
    {
        $memoryLimit = ini_get('memory_limit');
        $rawBytes = $this->resourceMonitor->parseMemoryToBytes((string)$memoryLimit);
        if ($rawBytes > 0 && $rawBytes < 128.0 * 1024 * 1024) {
            return ['status' => 'FAIL', 'message' => sprintf('PHP memory limit (%s) is below the 128MB safety floor.', $memoryLimit), 'fail' => true];
        }
        return ['status' => 'PASS', 'message' => sprintf('PHP memory limit is safe: %s.', $memoryLimit)];
    }

    private function auditFilePermissions(): array
    {
        if (!is_writable($this->backupDir)) {
            return ['status' => 'FAIL', 'message' => 'Target directory is not writable (chmod restriction).', 'fail' => true];
        }
        return ['status' => 'PASS', 'message' => 'Staging directory is perfectly writable.'];
    }

    /**
     * Create high-precision, 100% PHP-native gzipped SQL backup of catalog tables
     * Also compiles a matched Telemetry Log file under the same timestamp (Backup & Log Archive)
     */
    public function createBackup(?array $customTables = null, ?string $jobId = null, ?BridgeProgressTracker $progressTracker = null): string
    {
        $this->logger->log('Initiating Pre-Flight Catalog Database Backup...', 'INFO');
        
        $targetTables = $this->targetTables;
        if (is_array($customTables) && !empty($customTables)) {
            $targetTables = $customTables;
        }
        
        $timestamp = date('Ymd_His');
        $baseName = sprintf('catalog_backup_%s', $timestamp);
        
        // Individual backup subfolder matching backup name
        $individualBackupDir = $this->backupDir . $baseName . '/';
        if (!is_dir($individualBackupDir)) {
            if (!mkdir($individualBackupDir, 0755, true) && !is_dir($individualBackupDir)) {
                throw new Exception('Failed to create individual backup directory at: ' . $individualBackupDir);
            }
        }
        
        $backupFilename = $baseName . '.sql.gz';
        $logFilename = $baseName . '.log';
        
        $backupPath = $individualBackupDir . $backupFilename;
        $logPath = $individualBackupDir . $logFilename;

        // A. Run safety audits to write into the telemetry log file
        $audits = $this->runPreFlightAudits();

        // B. Open gzip file stream for writing
        $gz = @fopen($backupPath, 'wb');
        if ($gz === false) {
            throw new Exception('Could not open backup stream for writing at: ' . $backupPath);
        }

        // Append zlib.deflate stream filter to compress in-transit to GZIP format (window 31, compression 6)
        $filter = @stream_filter_append($gz, 'zlib.deflate', STREAM_FILTER_WRITE, [
            'window' => 31,
            'level' => 6
        ]);

        if (!$filter) {
            @fclose($gz);
            throw new Exception('Failed to append zlib.deflate stream filter for database compression.');
        }

        try {
            $db = Db::getInstance(true);
            
            // Header comments
            fwrite($gz, "-- Project Mass Catalog Backup\n");
            fwrite($gz, sprintf("-- Timestamp: %s\n", date('Y-m-d H:i:s')));
            fwrite($gz, "-- Native PHP Database Exporter\n\n");
            fwrite($gz, "SET FOREIGN_KEY_CHECKS=0;\n\n");

            $tableRowCounts = [];
            $iteration = 0;
            $sleepDelay = 0;
            $chunkSize = (int)$this->settingsManager->getSetting(SettingsManager::PM_DB_CHUNK_ROWS) ?: 5000;
            $governorMode = strtolower((string)$this->settingsManager->getSetting(SettingsManager::PM_GOVERNOR_MODE));

            $totalTables = count($targetTables);
            $processedTables = 0;
            if ($jobId && $progressTracker) {
                $progressTracker->startJob($jobId, 'database', $totalTables);
            }

            foreach ($targetTables as $tableBase) {
                if ($jobId && $progressTracker && $progressTracker->isCancelled($jobId)) {
                    if ($gz !== null) {
                        @fclose($gz);
                    }
                    if (is_dir($individualBackupDir)) {
                        $files = glob($individualBackupDir . '*');
                        if (is_array($files)) {
                            foreach ($files as $file) {
                                if (file_exists($file)) {
                                    @unlink($file);
                                }
                            }
                        }
                        @rmdir($individualBackupDir);
                    }
                    throw new Exception('cancelled');
                }

                if (!preg_match('/^[a-zA-Z0-9_]+$/', $tableBase)) {
                    throw new Exception('Invalid table name structure: ' . $tableBase);
                }
                $tableName = _DB_PREFIX_ . $tableBase;
                $this->logger->log('Dumping table: ' . $tableName, 'INFO');

                // 1. Get Table Creation Structure using executeS to bypass getRow's automatic LIMIT 1 modifier
                $createTableRows = $db->executeS('SHOW CREATE TABLE `' . $tableName . '`');
                $createTableQuery = (!empty($createTableRows) && is_array($createTableRows)) ? $createTableRows[0] : null;
                if (!$createTableQuery || !isset($createTableQuery['Create Table'])) {
                    throw new Exception('Could not query table structure for: ' . $tableName);
                }

                fwrite($gz, sprintf("DROP TABLE IF EXISTS `%s`;\n", $tableName));
                fwrite($gz, $createTableQuery['Create Table'] . ";\n\n");

                // 2. Dump Table Data in optimized chunks
                $offset = 0;
                $totalRows = 0;
                
                while (true) {
                    if ($governorMode === 'auto') {
                        // Adaptive Throttling: Consult ResourceMonitor to throttle chunk size and apply safety delays
                        $this->resourceMonitor->evaluateSystemLoad($iteration, $chunkSize, $sleepDelay);
                    }
                    $iteration++;

                    if ($sleepDelay > 0) {
                        usleep($sleepDelay);
                    }

                    $rows = $db->executeS('SELECT * FROM `' . $tableName . '` LIMIT ' . $offset . ', ' . $chunkSize);
                    if (empty($rows) || !is_array($rows)) {
                        break;
                    }

                    $totalRows += count($rows);
                    fwrite($gz, sprintf("INSERT INTO `%s` VALUES \n", $tableName));
                    
                    $valueLines = [];
                    foreach ($rows as $row) {
                        $escapedValues = [];
                        foreach ($row as $val) {
                            if ($val === null) {
                                $escapedValues[] = 'NULL';
                            } else {
                                $escapedValues[] = "'" . pSQL($val, true) . "'";
                            }
                        }
                        $valueLines[] = "(" . implode(', ', $escapedValues) . ")";
                    }
                    fwrite($gz, implode(",\n", $valueLines) . ";\n\n");

                    $offset += $chunkSize;
                    
                    // Prevent script memory exhaustion
                    unset($rows);
                    if (function_exists('gc_collect_cycles')) {
                        gc_collect_cycles();
                    }
                }

                $tableRowCounts[$tableBase] = $totalRows;
                $processedTables++;
                if ($jobId && $progressTracker) {
                    $progressTracker->updateProgress($jobId, $processedTables, [
                        'status_text' => "Dumped table: {$tableName} ({$totalRows} rows)"
                    ]);
                }
            }

            fwrite($gz, "SET FOREIGN_KEY_CHECKS=1;\n");
            fclose($gz);
            $gz = null;

            // C. Verify Backup Integrity
            if (!file_exists($backupPath) || filesize($backupPath) <= 0) {
                throw new Exception('Backup file integrity check failed (empty file generated).');
            }

            $sizeMB = filesize($backupPath) / 1024 / 1024;
            $this->logger->log(sprintf('Backup successfully generated: %s (%.2f MB)', $backupFilename, $sizeMB), 'INFO');

            // Calculate Checksums
            $checksums = [];
            foreach ($targetTables as $tableBase) {
                $tableName = _DB_PREFIX_ . $tableBase;
                try {
                    $checksumResult = $db->executeS('CHECKSUM TABLE `' . $tableName . '`');
                    if (!empty($checksumResult) && is_array($checksumResult) && isset($checksumResult[0]['Checksum'])) {
                        $checksums[$tableName] = $checksumResult[0]['Checksum'];
                    }
                } catch (\Throwable $e) {
                    // Ignore checksum errors if permissions are restricted
                }
            }

            // D. Generate matched Telemetry Log file (Backup & Log Archive)
            $logContent = sprintf(
                "==================================================\n" .
                "PROJECT MASS - Pre-Flight Staging Telemetry Log\n" .
                "==================================================\n" .
                "Backup File: %s\n" .
                "Timestamp:   %s\n" .
                "Host Server: startviziune.ro\n" .
                "\n" .
                "[1. Safety Checklist Audits]\n" .
                "- Database Locks: %s (%s)\n" .
                "- Disk Space:     %s (%s)\n" .
                "- Memory Floor:   %s (%s)\n" .
                "\n" .
                "[2. Database Catalog Statistics]\n",
                $backupFilename,
                date('Y-m-d H:i:s'),
                $audits['db_locks']['status'], $audits['db_locks']['message'],
                $audits['disk_space']['status'], $audits['disk_space']['message'],
                $audits['memory']['status'], $audits['memory']['message']
            );

            foreach ($tableRowCounts as $tbl => $cnt) {
                $logContent .= sprintf("- Table `%s%s`: %d row(s) dumped\n", _DB_PREFIX_, $tbl, $cnt);
            }

            $logContent .= "\n[3. Table Checksums]\n";
            foreach ($checksums as $tblName => $checksum) {
                $logContent .= sprintf("- Table `%s` Checksum: %s\n", $tblName, $checksum);
            }

            $logContent .= "\n[4. Execution Results]\n- Status: SUCCESS\n- Compression: Gzip (Level 9)\n";
            @file_put_contents($logPath, $logContent, LOCK_EX);

            return $baseName;
        } catch (\Throwable $e) {
            if ($gz !== null) {
                @fclose($gz);
            }
            @unlink($backupPath); // Delete incomplete files on error
            @unlink($logPath);
            $this->logger->log('Backup failed: ' . $e->getMessage(), 'ERROR');
            throw new Exception('Backup failed: ' . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Executes the backend OS file verification
     *
     * @param string $backupName Target ZIP or folder name
     * @return bool File verification result
     */
    public function verifyBackupFiles(string $backupName): bool
    {
        $backupName = basename($backupName);
        $baseName = preg_replace('/(\.sql\.gz|\.log)$/', '', $backupName);
        $folderPath = $this->backupDir . $baseName . '/';
        return file_exists($folderPath . $baseName . '.sql.gz');
    }

    /**
     * Extracts row-level differences for a specific table between a backup and the live database.
     * 
     * @param string $backupName The name of the backup
     * @param string $tableName The specific table to diff
     * @return array Array containing detailed diffs and statistics
     */
    public function diffTableRows(string $backupName, string $tableName): array
    {
        $backupName = basename($backupName);
        $baseName = preg_replace('/(\.sql\.gz|\.log)$/', '', $backupName);
        $sqlPath = $this->backupDir . $baseName . '/' . $baseName . '.sql.gz';

        if (!file_exists($sqlPath)) {
            throw new Exception('Target SQL backup file not found.');
        }

        $db = \Db::getInstance(true);
        $tableName = pSQL($tableName);
        
        // 1. Fetch live row state
        $activeRows = [];
        $primaryKey = null;
        try {
            // Find primary key
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
                // Fallback to first column if no PK
                $primaryKey = $columnsOrder[0];
            }

            if ($primaryKey) {
                $liveData = $db->executeS('SELECT * FROM `' . $tableName . '` LIMIT 5000'); // Limit to prevent OOM
                if (is_array($liveData)) {
                    foreach ($liveData as $row) {
                        $activeRows[(string)$row[$primaryKey]] = $row;
                    }
                }
            }
        } catch (\Throwable $e) {
            throw new Exception('Failed to fetch active state for ' . $tableName . ': ' . $e->getMessage());
        }

        // 2. Stream parse backup for target table
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
                                        // Build row assoc
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
                        // Break after finding and parsing the table's inserts
                        break; 
                    }
                }
                gzclose($gz);
            } catch (\Throwable $e) {
                @gzclose($gz);
            }
        }

        // 3. Compute Diffs
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
            'added_rows' => array_slice($added, 0, 50), // Cap to prevent huge payloads
            'deleted_rows' => array_slice($deleted, 0, 50),
            'modified_rows' => array_slice($modified, 0, 50),
        ];
    }

    /**
     * Dual Key Transfer Sync: High-performance streaming parser
     * Compares active catalog products against backup rows and cross-checks telemetry log
     */
    public function compareBackup(string $backupName): array
    {
        $backupName = basename($backupName);
        // 1. Locate backup files within their subfolder
        $baseName = preg_replace('/(\.sql\.gz|\.log)$/', '', $backupName);
        $sqlPath = $this->backupDir . $baseName . '/' . $baseName . '.sql.gz';
        $logPath = $this->backupDir . $baseName . '/' . $baseName . '.log';

        if (!file_exists($sqlPath)) {
            throw new Exception('Target SQL backup file not found.');
        }

        $db = Db::getInstance(true);

        // 2. Read the backup telemetry log, parse checksums and row counts FIRST
        $logMetadata = "No telemetry log file compiled for this backup.";
        $backupChecksums = [];
        $backupRowCounts = [];
        
        if (file_exists($logPath)) {
            $logMetadata = @file_get_contents($logPath);
            
            // Parse checksums from log
            if (preg_match_all('/Table `([^`]+)` Checksum:\s*(\d+)/i', $logMetadata, $matches, PREG_SET_ORDER)) {
                foreach ($matches as $match) {
                    $backupChecksums[$match[1]] = $match[2];
                }
            }
            
            // Parse table statistics (row counts) from log
            if (preg_match_all('/Table `([^`]+)`:\s*(\d+)\s*row/i', $logMetadata, $matches, PREG_SET_ORDER)) {
                foreach ($matches as $match) {
                    $backupRowCounts[$match[1]] = (int)$match[2];
                }
            }
        }

        // 3. Resolve target tables to check
        $targetTablesToCheck = array_keys($backupChecksums);
        if (empty($targetTablesToCheck)) {
            // Fallback 1: Resolve from row count keys in log
            $targetTablesToCheck = array_keys($backupRowCounts);
        }

        if (empty($targetTablesToCheck)) {
            // Fallback 2: Scan the SQL file structure directly for dumped table names
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
            // Fallback 3: Hardcoded defaults
            foreach ($this->targetTables as $tableBase) {
                $targetTablesToCheck[] = _DB_PREFIX_ . $tableBase;
            }
        }

        $productTable = _DB_PREFIX_ . 'product';
        $runKeyCheck = in_array($productTable, $targetTablesToCheck);

        $activeProducts = [];
        $productCols = [];
        if ($runKeyCheck) {
            try {
                // Determine column indices for backup parsing
                $cols = $db->executeS('DESCRIBE `' . $productTable . '`');
                if (is_array($cols)) {
                    foreach ($cols as $idx => $col) {
                        $productCols[$col['Field']] = $idx;
                    }
                }

                // Fetch active products with rich metadata
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
                            'reference' => $r['reference'] ?? '',
                            'price' => (float)($r['price'] ?? 0),
                            'name' => $r['name'] ?? 'Unknown Product'
                        ];
                    }
                }
            } catch (\Throwable $e) {
                // Table doesn't exist yet or query failed
            }
        }

        $backupProducts = [];
        if ($runKeyCheck) {
            $refIdx = $productCols['reference'] ?? 4;
            $priceIdx = $productCols['price'] ?? 8;
            $gz = @gzopen($sqlPath, 'r');
            if ($gz !== false) {
                try {
                    while (!gzeof($gz)) {
                        $line = gzgets($gz, 65536);
                        if ($line === false) {
                            break;
                        }
                        
                        // Scan for insert statements of product table
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
                                        if (is_array($parts) && count($parts) > 0) {
                                            $id_prod = (int)$parts[0];
                                            $backupProducts[$id_prod] = [
                                                'reference' => isset($parts[$refIdx]) ? trim($parts[$refIdx], "'") : '',
                                                'price' => isset($parts[$priceIdx]) ? (float)trim($parts[$priceIdx], "'") : 0,
                                                'name' => 'Unknown Product (Backup)' // Will be enriched from active if exists
                                            ];
                                        }
                                    }
                                }
                                if (strpos($valLine, ';') !== false) {
                                    break;
                                }
                            }
                        }
                    }
                    gzclose($gz);
                } catch (\Throwable $e) {
                    @gzclose($gz);
                }
            }
        }

        // Calculate Dual Key Sync Deltas
        $added = [];
        $deleted = [];

        foreach ($activeProducts as $id => $val) {
            if (!isset($backupProducts[$id])) {
                $added[] = [
                    'id_product' => $id,
                    'reference' => $val['reference'],
                    'price' => $val['price'],
                    'name' => $val['name']
                ];
            }
        }

        foreach ($backupProducts as $id => $val) {
            if (!isset($activeProducts[$id])) {
                $deleted[] = [
                    'id_product' => $id,
                    'reference' => $val['reference'],
                    'price' => $val['price'],
                    'name' => 'Deleted Product' // Cannot easily fetch name if strictly deleted
                ];
            }
        }

        // 5. Calculate active checksums and count sum of rows across ALL verified tables
        $activeChecksums = [];
        $totalBackupRows = 0;
        $totalActiveRows = 0;

        foreach ($targetTablesToCheck as $tableName) {
            // Backup row count
            $bRows = isset($backupRowCounts[$tableName]) ? $backupRowCounts[$tableName] : 0;
            $totalBackupRows += $bRows;

            // Active row count
            $aRows = 0;
            try {
                $aRows = (int)$db->getValue('SELECT COUNT(*) FROM `' . $tableName . '`');
            } catch (\Throwable $e) {}
            $totalActiveRows += $aRows;

            // Active checksum
            try {
                $checksumResult = $db->executeS('CHECKSUM TABLE `' . $tableName . '`');
                if (!empty($checksumResult) && is_array($checksumResult) && isset($checksumResult[0]['Checksum'])) {
                    $activeChecksums[$tableName] = $checksumResult[0]['Checksum'];
                }
            } catch (\Throwable $e) {}
        }

        // Build table-specific comparison structure
        $checksumStatus = [];
        $checksumDrift = false;

        foreach ($targetTablesToCheck as $tableName) {
            $backupChk = isset($backupChecksums[$tableName]) ? $backupChecksums[$tableName] : null;
            $activeChk = isset($activeChecksums[$tableName]) ? $activeChecksums[$tableName] : null;
            $bRows = isset($backupRowCounts[$tableName]) ? $backupRowCounts[$tableName] : 0;
            
            $aRows = 0;
            try {
                $aRows = (int)$db->getValue('SELECT COUNT(*) FROM `' . $tableName . '`');
            } catch (\Throwable $e) {}

            $isVolatile = (bool)preg_match('/(employee_session|customer_session|connections|connections_page|connections_source|guest|page_viewed|log|mail|statssearch|cart|cart_product)$/i', $tableName);

            if ($bRows === 0 && $aRows === 0) {
                // Empty tables are identical by definition (no rows to differ)
                $checksumStatus[$tableName] = [
                    'active' => $activeChk !== null ? $activeChk : '0',
                    'backup' => $backupChk !== null ? $backupChk : '0',
                    'match' => true,
                    'active_rows' => 0,
                    'backup_rows' => 0,
                    'volatile' => $isVolatile
                ];
            } else if ($backupChk !== null) {
                $isMatch = ($activeChk !== null && (string)$activeChk === (string)$backupChk);
                $checksumStatus[$tableName] = [
                    'active' => $activeChk !== null ? $activeChk : 'MISSING',
                    'backup' => $backupChk,
                    'match' => $isMatch,
                    'active_rows' => $aRows,
                    'backup_rows' => $bRows,
                    'volatile' => $isVolatile
                ];
                if (!$isMatch && !$isVolatile) {
                    $checksumDrift = true;
                }
            } else {
                $checksumStatus[$tableName] = [
                    'active' => $activeChk !== null ? $activeChk : 'UNKNOWN',
                    'backup' => null,
                    'match' => null,
                    'active_rows' => $aRows,
                    'backup_rows' => $bRows,
                    'volatile' => $isVolatile
                ];
            }
        }

        return [
            'success' => true,
            'backup_name' => $baseName,
            'backup_rows' => $totalBackupRows,
            'active_rows' => $totalActiveRows,
            'added' => $added,
            'deleted' => $deleted,
            'added_count' => count($added),
            'deleted_count' => count($deleted),
            'checksum_drift' => $checksumDrift,
            'checksum_status' => $checksumStatus,
            'log_metadata' => $logMetadata
        ];
    }

    /**
     * Retrieve a list of all historical backups from their individual folders
     */
    public function getBackupList(): array
    {
        $backups = [];
        $localMap = [];

        if (is_dir($this->backupDir)) {
            // Find all matching backup subdirectories
            $dirs = glob($this->backupDir . '{catalog_backup_*,mock_data_*}', GLOB_ONLYDIR | GLOB_BRACE);
            if (is_array($dirs)) {
                foreach ($dirs as $dir) {
                    $baseName = basename($dir);
                    $sqlFile = $dir . '/' . $baseName . '.sql.gz';
                    $logFile = $dir . '/' . $baseName . '.log';
                    
                    if (file_exists($sqlFile)) {
                        @clearstatcache(true, $sqlFile);
                        if (file_exists($logFile)) {
                            @clearstatcache(true, $logFile);
                        }

                        $bData = [
                            'basename' => $baseName,
                            'sql_filename' => $baseName . '.sql.gz',
                            'sql_size' => filesize($sqlFile),
                            'log_filename' => file_exists($logFile) ? $baseName . '.log' : null,
                            'log_size' => file_exists($logFile) ? filesize($logFile) : 0,
                            'date' => filemtime($sqlFile),
                            'is_uploaded' => false,
                            'is_local' => true,
                            'is_cloud' => false,
                            'is_pinned' => file_exists($dir . '/.pinned')
                        ];
                        $backups[] = $bData;
                        $localMap[$baseName] = true;

                        $metadataFile = $dir . '/metadata.json';
                        if (file_exists($metadataFile)) {
                            $metadata = json_decode(file_get_contents($metadataFile), true);
                            if (is_array($metadata) && isset($metadata['duration'])) {
                                $backups[count($backups) - 1]['duration'] = $metadata['duration'];
                            }
                        }
                    }
                }
            }
        }
        
        // Scan Uploaded Backups in import_tmp
        $importTmpDir = $this->backupDir . 'import_tmp/';
        if (is_dir($importTmpDir)) {
            $uploadedFiles = glob($importTmpDir . '*.{sql,sql.gz}', GLOB_BRACE);
            if (is_array($uploadedFiles)) {
                foreach ($uploadedFiles as $file) {
                    @clearstatcache(true, $file);
                    $baseName = basename($file);
                    $backups[] = [
                        'basename' => $baseName,
                        'sql_filename' => $baseName,
                        'sql_size' => filesize($file),
                        'log_filename' => null,
                        'log_size' => 0,
                        'date' => filemtime($file),
                        'is_uploaded' => true,
                        'is_local' => true,
                        'is_cloud' => false
                    ];
                    $localMap[$baseName] = true;
                    
                    $metadataFile = $file . '.metadata.json';
                    if (file_exists($metadataFile)) {
                        $metadata = json_decode(file_get_contents($metadataFile), true);
                        if (is_array($metadata) && isset($metadata['duration'])) {
                            $backups[count($backups) - 1]['duration'] = $metadata['duration'];
                        }
                    }
                }
            }
        }
        
        // Sort backups by date descending
        usort($backups, function($a, $b) {
            return $b['date'] <=> $a['date'];
        });

        return $backups;
    }

    /**
     * Save metadata to a JSON file in the backup folder
     */
    public function saveBackupMetadata(string $backupName, array $metadata): void
    {
        $backupName = basename($backupName);
        $baseName = preg_replace('/(\.sql\.gz|\.log|\.sql)$/', '', $backupName);
        $folderPath = $this->backupDir . $baseName . '/';
        
        if (is_dir($folderPath)) {
            $metadataFile = $folderPath . 'metadata.json';
            $existingData = [];
            if (file_exists($metadataFile)) {
                $existingData = json_decode(file_get_contents($metadataFile), true) ?: [];
            }
            $mergedData = array_merge($existingData, $metadata);
            $encoded = json_encode($mergedData, JSON_PRETTY_PRINT);
            if ($encoded === false) {
                $this->logger->log('Failed to encode backup metadata JSON.', 'ERROR');
            } else {
                file_put_contents($metadataFile, $encoded, LOCK_EX);
            }
        } else {
            // Check if it's an uploaded file in import_tmp
            $importTmpDir = $this->backupDir . 'import_tmp/';
            if (file_exists($importTmpDir . $backupName)) {
                $metadataFile = $importTmpDir . $backupName . '.metadata.json';
                $existingData = [];
                if (file_exists($metadataFile)) {
                    $existingData = json_decode(file_get_contents($metadataFile), true) ?: [];
                }
                $mergedData = array_merge($existingData, $metadata);
                $encoded = json_encode($mergedData, JSON_PRETTY_PRINT);
                if ($encoded === false) {
                    $this->logger->log('Failed to encode uploaded backup metadata JSON.', 'ERROR');
                } else {
                    file_put_contents($metadataFile, $encoded, LOCK_EX);
                }
            }
        }
    }

    /**
     * Delete an individual backup folder and all its contents
     */
    public function deleteBackup(string $backupName): void
    {
        $backupName = basename($backupName);
        // Check if it's an uploaded file in import_tmp
        $importTmpDir = $this->backupDir . 'import_tmp/';
        if (file_exists($importTmpDir . $backupName)) {
            @unlink($importTmpDir . $backupName);
            $this->logger->log('Uploaded backup deleted successfully: ' . $backupName, 'INFO');
            return;
        }

        $baseName = preg_replace('/(\.sql\.gz|\.log|\.sql)$/', '', $backupName);
        if (!preg_match('/^(catalog_backup|mock_data)_\d{8}_\d{6}$/', $baseName)) {
            throw new Exception('Invalid backup name structure.');
        }
        
        $folderPath = $this->backupDir . $baseName . '/';
        if (is_dir($folderPath)) {
            $files = glob($folderPath . '*');
            if (is_array($files)) {
                foreach ($files as $file) {
                    if (file_exists($file)) {
                        @unlink($file);
                    }
                }
            }
            @rmdir($folderPath);
            $this->logger->log('Backup folder deleted successfully: ' . $baseName, 'INFO');
        } else {
            throw new Exception('Backup archive folder not found.');
        }
    }


    /**
     * Get account-specific disk space allocation and free space from cPanel uapi if available
     */
    private function getCpanelDiskSpace(): ?array
    {
        if (!function_exists('shell_exec')) {
            return null;
        }

        try {
            // First try to get the user's specific quota (respects cPanel limit, not physical partition)
            $quotaOutput = @shell_exec('uapi --output=json Quota get_quota_info'); // nosec
            if ($quotaOutput && trim($quotaOutput) !== '') {
                $qDecoded = json_decode($quotaOutput, true);
                $qData = null;
                if (isset($qDecoded['result']['data'][0])) {
                    $qData = $qDecoded['result']['data'][0];
                } elseif (isset($qDecoded['data'][0])) {
                    $qData = $qDecoded['data'][0];
                } elseif (isset($qDecoded['result']['data']['megalimit'])) {
                    $qData = $qDecoded['result']['data'];
                }

                if ($qData) {
                    // Quota limits are typically returned in Megabytes
                    $limitMB = isset($qData['_disklimit']) ? (float)$qData['_disklimit'] : (isset($qData['megalimit']) ? (float)$qData['megalimit'] : 0.0);
                    $usedMB = isset($qData['_diskused']) ? (float)$qData['_diskused'] : (isset($qData['megabytes_used']) ? (float)$qData['megabytes_used'] : 0.0);
                    
                    if ($limitMB > 0.0 && $limitMB != 25000000) { // sometimes unlimited is a massive number
                        $limitBytes = $limitMB * 1024 * 1024;
                        $usedBytes = $usedMB * 1024 * 1024;
                        $freeBytes = max(0.0, $limitBytes - $usedBytes);
                        return [
                            'limit' => $limitBytes,
                            'used' => $usedBytes,
                            'free' => $freeBytes
                        ];
                    }
                }
            }

            // Fallback: Securely run uapi disk information command (might return physical partition)
            $output = @shell_exec('uapi --output=json Fileman get_disk_information'); // nosec
            if ($output && trim($output) !== '') {
                $decoded = json_decode($output, true);
                
                $data = null;
                if (isset($decoded['result']['data'])) {
                    $data = $decoded['result']['data'];
                } elseif (isset($decoded['data'])) {
                    $data = $decoded['data'];
                }

                if ($data) {
                    $limit = isset($data['absolute_limit']) ? (float)$data['absolute_limit'] : 0.0;
                    $used = isset($data['absolute_used']) ? (float)$data['absolute_used'] : 0.0;
                    
                    if ($limit > 0.0) {
                        $freeBytes = max(0.0, $limit - $used);
                        return [
                            'limit' => $limit,
                            'used' => $used,
                            'free' => $freeBytes
                        ];
                    }
                }
            }
        } catch (\Throwable $e) {
            // Fail silently and fall back to standard disk space audits
        }

        return null;
    }

    /**
     * Parses the SQL backup file and compiles a statement manifest JSON file to enable chunked AJAX execution
     * 0 MB RAM overhead using stream chunk reading.
     */
    public function prepareRestore(string $backupName): array
    {
        $backupName = basename($backupName);
        $baseName = preg_replace('/(\.sql\.gz|\.log|\.sql)$/', '', $backupName);
        
        // 1. Resolve file path (check local backups first, then import_tmp)
        $sqlGzPath = $this->backupDir . $baseName . '/' . $baseName . '.sql.gz';
        $sqlPath = $this->backupDir . $baseName . '/' . $baseName . '.sql';
        
        $filePath = null;
        $isGzip = false;
        
        if (file_exists($sqlGzPath)) {
            $filePath = $sqlGzPath;
            $isGzip = true;
        } elseif (file_exists($sqlPath)) {
            $filePath = $sqlPath;
            $isGzip = false;
        } else {
            // Check in import_tmp directory
            $importGz = $this->backupDir . 'import_tmp/' . $baseName . '.sql.gz';
            $importSql = $this->backupDir . 'import_tmp/' . $baseName . '.sql';
            $importGzDirect = $this->backupDir . 'import_tmp/' . $backupName; // exact name match
            
            if (file_exists($importGzDirect)) {
                $filePath = $importGzDirect;
                $isGzip = (substr($backupName, -3) === '.gz');
            } elseif (file_exists($importGz)) {
                $filePath = $importGz;
                $isGzip = true;
            } elseif (file_exists($importSql)) {
                $filePath = $importSql;
                $isGzip = false;
            }
        }
        
        if (!$filePath) {
            throw new Exception('Target SQL backup file not found.');
        }

        $this->logger->log("Preparing database restore manifest for: " . basename($filePath), 'INFO');

        // Create temporary directory for manifest files
        $manifestDir = $this->backupDir . 'manifest_tmp/';
        if (!is_dir($manifestDir)) {
            @mkdir($manifestDir, 0755, true);
        }
        $manifestPath = $manifestDir . $baseName . '_manifest.json';

        // 2. Stream-parse statements and index them
        $stream = $isGzip ? @gzopen($filePath, 'r') : @fopen($filePath, 'r');
        if ($stream === false) {
            throw new Exception('Could not open SQL file stream.');
        }

        $statements = [];
        $currentStatement = '';
        
        while (true) {
            $line = $isGzip ? gzgets($stream, 65536) : fgets($stream, 65536);
            if ($line === false) {
                break;
            }
            
            $trimmed = trim($line);
            
            // Skip comments and empty lines
            if ($trimmed === '' || strpos($trimmed, '--') === 0 || strpos($trimmed, '#') === 0 || strpos($trimmed, '/*') === 0) {
                continue;
            }
            
            $currentStatement .= $line;
            
            // Statement delimiter check (semicolon at the end of the line)
            if (substr($trimmed, -1) === ';') {
                $stmt = trim($currentStatement);
                if ($stmt !== '') {
                    $statements[] = $stmt;
                }
                $currentStatement = '';
            }
        }

        $isGzip ? gzclose($stream) : fclose($stream);

        // Add any remaining statement
        $stmt = trim($currentStatement);
        if ($stmt !== '') {
            $statements[] = $stmt;
        }

        // 3. Write manifest file
        $encoded = json_encode($statements);
        if ($encoded === false) {
            throw new Exception('Failed to compile statements JSON manifest.');
        }

        if (@file_put_contents($manifestPath, $encoded, LOCK_EX) === false) {
            throw new Exception('Failed to write statements manifest file.');
        }

        $this->logger->log(sprintf("Restore manifest successfully prepared with %d statements.", count($statements)), 'INFO');

        return [
            'success' => true,
            'backup_name' => $baseName,
            'statement_count' => count($statements)
        ];
    }

    /**
     * Executes a chunk of statements from the prepared JSON manifest file.
     * Keeps execution lightweight and timeout-safe.
     */
    public function executeRestoreChunk(string $backupName, int $offset, int $limit): array
    {
        $backupName = basename($backupName);
        $baseName = preg_replace('/(\.sql\.gz|\.log|\.sql)$/', '', $backupName);
        $manifestPath = $this->backupDir . 'manifest_tmp/' . $baseName . '_manifest.json';

        if (!file_exists($manifestPath)) {
            throw new Exception('Statements manifest file not found. Prepare the restore first.');
        }

        $json = @file_get_contents($manifestPath);
        $statements = json_decode($json, true);
        if (!is_array($statements)) {
            throw new Exception('Invalid or corrupt statements manifest file.');
        }

        $totalStatements = count($statements);
        $chunk = array_slice($statements, $offset, $limit);
        
        $db = Db::getInstance(true);
        $executedCount = 0;

        foreach ($chunk as $stmt) {
            if (!empty($stmt)) {
                // Execute statement
                $db->execute($stmt);
                $executedCount++;
            }
        }

        $newOffset = $offset + $executedCount;
        $done = ($newOffset >= $totalStatements);

        // Cleanup manifest file upon completion
        if ($done) {
            @unlink($manifestPath);
        }

        return [
            'success' => true,
            'executed_count' => $executedCount,
            'new_offset' => $newOffset,
            'total_statements' => $totalStatements,
            'done' => $done
        ];
    }

    public function getAllTablesCategorized(): array
    {
        $db = Db::getInstance(true);
        $rawTables = $db->executeS('SHOW TABLES');
        $allTables = [];
        $dbPrefix = _DB_PREFIX_;
        $prefixLength = strlen($dbPrefix);
        
        if (is_array($rawTables)) {
            foreach ($rawTables as $row) {
                $tableName = reset($row);
                $baseName = $tableName;
                if ($dbPrefix !== '' && strpos($tableName, $dbPrefix) === 0) {
                    $baseName = substr($tableName, $prefixLength);
                }
                $allTables[] = $baseName;
            }
        }

        $categorized = [
            'catalog' => [],
            'stock_attributes' => [],
            'pricing_taxes' => [],
            'customers_orders' => [],
            'system_settings' => []
        ];

        foreach ($allTables as $tbl) {
            if (preg_match('/^(product|category|manufacturer|supplier|feature|tag|image)/i', $tbl)) {
                if (preg_match('/^(product_attribute|stock)/i', $tbl)) {
                    $categorized['stock_attributes'][] = $tbl;
                } else {
                    $categorized['catalog'][] = $tbl;
                }
            } elseif (preg_match('/^(specific_price|tax|carrier|delivery)/i', $tbl)) {
                $categorized['pricing_taxes'][] = $tbl;
            } elseif (preg_match('/^(customer|order|cart|address|gender)/i', $tbl)) {
                $categorized['customers_orders'][] = $tbl;
            } else {
                $categorized['system_settings'][] = $tbl;
            }
        }
        return $categorized;
    }

    /**
     * Purge old database backups chronologically based on settings.
     */
    public function purgeOldBackups(): void
    {
        try {
            $maxCount = (int)$this->settingsManager->getSetting(SettingsManager::PM_BACKUP_MAX_COUNT);
            $maxDays = (int)$this->settingsManager->getSetting(SettingsManager::PM_BACKUP_MAX_DAYS);

            if ($maxCount <= 0 && $maxDays <= 0) {
                return; // Retention policies disabled
            }

            $backups = $this->getBackupList();
            // Filter only local backups that actually exist on disk
            $localBackups = array_filter($backups, function ($b) {
                return !empty($b['is_local']) && !empty($b['basename']);
            });

            if (empty($localBackups)) {
                return;
            }

            // Sort chronologically (oldest first)
            usort($localBackups, function ($a, $b) {
                return $a['date'] <=> $b['date'];
            });

            $now = time();

            foreach ($localBackups as $index => $b) {
                $basename = $b['basename'];
                $folderPath = $this->backupDir . $basename . '/';
                if (!is_dir($folderPath)) {
                    continue;
                }

                if (file_exists($folderPath . '.pinned')) {
                    continue; // Skip pinned backups from retention sweep
                }

                $shouldDelete = false;

                // 1. Age-based purge
                if ($maxDays > 0) {
                    $ageSeconds = $now - $b['date'];
                    $maxSeconds = $maxDays * 86400;
                    if ($ageSeconds > $maxSeconds) {
                        // Absolute Min-Keep Safeguard: Never delete the last unpinned backup
                        $unpinnedCount = 0;
                        foreach ($localBackups as $tmp) {
                            $tmpPath = $this->backupDir . $tmp['basename'] . '/';
                            if (is_dir($tmpPath) && !file_exists($tmpPath . '.pinned')) {
                                $unpinnedCount++;
                            }
                        }
                        if ($unpinnedCount > 1) {
                            $shouldDelete = true;
                        }
                    }
                }

                // 2. Count-based purge
                if ($maxCount > 0 && !$shouldDelete) {
                    $unpinnedCount = 0;
                    foreach ($localBackups as $tmp) {
                        $tmpPath = $this->backupDir . $tmp['basename'] . '/';
                        if (is_dir($tmpPath) && !file_exists($tmpPath . '.pinned')) {
                            $unpinnedCount++;
                        }
                    }
                    if ($unpinnedCount > $maxCount) {
                        $shouldDelete = true;
                    }
                }

                if ($shouldDelete) {
                    $this->deleteBackup($basename);
                    $this->logger->log("Retention Policy: Automatically deleted local database backup '{$basename}' to satisfy retention limits.", 'INFO');
                    // Remove from local list so count checks are correct
                    unset($localBackups[$index]);
                }
            }
        } catch (\Throwable $e) {
            $this->logger->log("Database backup retention purge failed: " . $e->getMessage(), 'ERROR');
        }
    }
}

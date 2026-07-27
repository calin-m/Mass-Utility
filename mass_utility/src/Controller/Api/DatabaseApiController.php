<?php
// @Arch[DatabaseApiController]

declare(strict_types=1);

namespace MassUtility\Controller\Api;

if (!defined('_PS_VERSION_')) {
    exit;
}

use Context;
use Configuration;
use Exception;
use Db;
use MassUtility\Service\BridgeLogger;
use MassUtility\Service\TableBackupManager;
use MassUtility\Service\DatabaseProfilerEngine;
use MassUtility\Service\BridgeProgressTracker;
use Tools;

require_once __DIR__ . '/AbstractApiController.php';
require_once dirname(dirname(__DIR__)) . '/Service/BridgeProgressTracker.php';

/**
 * Handles PrestaShop physical table isolation, SQL exports, and SQL imports.
 */
class DatabaseApiController extends AbstractApiController
{
    private BridgeLogger $logger;
    private TableBackupManager $backupManager;
    private DatabaseProfilerEngine $profilerEngine;

    public function __construct(BridgeLogger $logger, TableBackupManager $backupManager, DatabaseProfilerEngine $profilerEngine)
    {
        $this->logger = $logger;
        $this->backupManager = $backupManager;
        $this->profilerEngine = $profilerEngine;
    }

    protected function downloadBackup(): void
    {
        $file = trim((string)Tools::getValue('file'));
        $cleanFile = basename($file);
        if (!empty($cleanFile)) {
            $folderName = preg_replace('/(\.sql|\.sql\.gz|\.log)$/i', '', $cleanFile);

            $baseDirs = [];
            if (defined('_PS_MODULE_DIR_')) {
                $mDir = rtrim(_PS_MODULE_DIR_, '/\\');
                $baseDirs[] = str_ends_with($mDir, 'mass_utility') ? $mDir . '/backups/' : $mDir . '/mass_utility/backups/';
            }
            if (defined('_PS_ROOT_DIR_')) {
                $rDir = rtrim(_PS_ROOT_DIR_, '/\\');
                $baseDirs[] = $rDir . '/modules/mass_utility/backups/';
                $baseDirs[] = $rDir . '/mass_utility/backups/';
            }
            $baseDirs[] = dirname(__DIR__, 3) . '/backups/';
            $baseDirs[] = dirname(__DIR__, 4) . '/modules/mass_utility/backups/';

            foreach ($baseDirs as $bDir) {
                if (!is_dir($bDir)) continue;

                $candidatePaths = [
                    $bDir . $folderName . '/' . $cleanFile,
                    $bDir . $folderName . '/' . $folderName . '.sql.gz',
                    $bDir . $folderName . '/' . $folderName . '.sql',
                    $bDir . $folderName . '/' . $folderName . '.log',
                    $bDir . 'import_tmp/' . $cleanFile,
                    $bDir . 'import_tmp/' . $folderName . '.sql.gz',
                    $bDir . $cleanFile,
                    $bDir . $folderName . '.sql.gz'
                ];

                foreach ($candidatePaths as $filePath) {
                    if (file_exists($filePath) && is_file($filePath)) {
                        @clearstatcache(true, $filePath);
                        $this->logger->log("User downloaded backup file: " . basename($filePath), 'INFO');
                        @ini_set('zlib.output_compression', 'Off');
                        @ini_set('output_buffering', 'Off');
                        @set_time_limit(300);
                        while (ob_get_level()) {
                            @ob_end_clean();
                        }
                        header('Content-Description: File Transfer');
                        header('Content-Type: application/octet-stream');
                        header('Content-Disposition: attachment; filename="' . basename($filePath) . '"');
                        header('Expires: 0');
                        header('Cache-Control: must-revalidate');
                        header('Pragma: public');
                        header('Content-Length: ' . (string)filesize($filePath));
                        readfile($filePath);
                        exit;
                    }
                }
            }
        }
        $this->logger->log("Failed download attempt for backup: " . $file, 'WARNING');
        header('HTTP/1.1 404 Not Found');
        die('Backup file not found.');
    }

    protected function createBackup(): void
    {
        try {
            $selectedTables = Tools::getValue('tables');
            $tablesArray = null;
            if ($selectedTables) {
                $tablesArray = json_decode($selectedTables, true);
            }

            $jobId = 'db_backup_' . date('Ymd_His') . '_' . uniqid();
            
            $progressTracker = new BridgeProgressTracker();
            $progressTracker->startJob($jobId, 'database', 0);

            $secureToken = Configuration::get('PM_SECURE_TOKEN');
            if (empty($secureToken)) {
                $secureToken = bin2hex(random_bytes(32));
                Configuration::updateValue('PM_SECURE_TOKEN', $secureToken);
            }

            $scriptPath = _PS_MODULE_DIR_ . 'mass_utility/bin/cli_backup_worker.php';
            $args = '--type=database --job_id=' . escapeshellarg($jobId) . ' --token=' . escapeshellarg($secureToken);
            if (!empty($selectedTables) && is_array($tablesArray)) {
                $tablesList = implode(',', $tablesArray);
                $args .= ' --tables=' . escapeshellarg($tablesList);
            }

            $phpBinary = defined('PHP_BINARY') && PHP_BINARY ? PHP_BINARY : 'php';

            $isWindows = (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN');
            $requiredFunc = $isWindows ? 'popen' : 'exec';
            if (!function_exists($requiredFunc)) {
                throw new Exception("Required PHP command execution function '{$requiredFunc}' is disabled on this server.");
            }

            $logPath = _PS_MODULE_DIR_ . 'mass_utility/backups/worker_startup.log';
            @file_put_contents($logPath, "[" . date('Y-m-d H:i:s') . "] Spawning Database worker for Job {$jobId}\n", FILE_APPEND | LOCK_EX);

            if ($isWindows) {
                pclose(popen("start /B \"\" " . escapeshellarg($phpBinary) . " " . escapeshellarg($scriptPath) . " " . $args, "r"));
            } else {
                exec(escapeshellarg($phpBinary) . " " . escapeshellarg($scriptPath) . " " . $args . " >> " . escapeshellarg($logPath) . " 2>&1 &"); // nosec
            }

            $this->logger->log("Triggered async DB Backup. Job ID: " . $jobId, 'INFO');

            $this->sendJsonResponse([
                'success' => true,
                'job_id' => $jobId,
                'status' => 'started'
            ]);
        } catch (Exception $e) {
            $this->logger->log("Backup generation launch failed: " . $e->getMessage(), 'ERROR');
            $this->sendErrorResponse($e->getMessage());
        }
    }

    protected function compareBackup(): void
    {
        try {
            $file = Tools::getValue('file');
            $this->logger->log("Auditing DB drift against backup: " . $file, 'INFO');
            $comparison = $this->backupManager->compareBackup($file);
            $this->logger->log("DB drift check completed for " . $file . ". Result matches: " . (!$comparison['checksum_drift'] ? 'IDENTICAL' : 'DRIFT DETECTED'), 'INFO');
            $this->sendJsonResponse($comparison);
        } catch (Exception $e) {
            $this->logger->log("Drift comparison audit failed: " . $e->getMessage(), 'ERROR');
            $this->sendErrorResponse($e->getMessage());
        }
    }

    protected function diffTableRows(): void
    {
        try {
            $file = Tools::getValue('file');
            $table = Tools::getValue('table');
            if (empty($file) || empty($table)) {
                throw new Exception("Missing required parameters for row diffing.");
            }
            $this->logger->log("Extracting row-level differences for table {$table} against backup {$file}...", 'INFO');
            $diffs = $this->backupManager->diffTableRows($file, $table);
            $this->logger->log("Successfully computed row differences for {$table}.", 'INFO');
            $this->sendJsonResponse(['success' => true, 'diffs' => $diffs]);
        } catch (Exception $e) {
            $this->logger->log("Row diffing failed: " . $e->getMessage(), 'ERROR');
            $this->sendErrorResponse($e->getMessage());
        }
    }

    protected function exportDiff(): void
    {
        try {
            $file = Tools::getValue('file');
            $table = Tools::getValue('table');
            $format = Tools::getValue('format', 'json');
            
            if (empty($file) || empty($table)) {
                throw new Exception("Missing required parameters for export.");
            }
            
            // Sanitize file and table to prevent path traversal and CRLF header injection
            $file = preg_replace('/[^a-zA-Z0-9_.-]/', '', basename($file));
            $table = preg_replace('/[^a-zA-Z0-9_.-]/', '', basename($table));
            
            $diffs = $this->backupManager->diffTableRows($file, $table);
            $exportData = [];
            
            if ($table === 'product_deltas') {
                // Wait, if table is product_deltas, we need to export the product additions/deletions
                $comparison = $this->backupManager->compareBackup($file);
                $exportData = [
                    'added' => $comparison['added_products'] ?? [],
                    'deleted' => $comparison['deleted_products'] ?? []
                ];
                $filename = "export_deltas_{$file}";
            } else {
                $exportData = $diffs;
                $filename = "export_{$table}_{$file}";
            }

            if ($format === 'json') {
                header('Content-Type: application/json');
                header('Content-Disposition: attachment; filename="' . $filename . '.json"');
                echo json_encode($exportData, JSON_PRETTY_PRINT);
            } else {
                // CSV export
                header('Content-Type: text/csv; charset=utf-8');
                header('Content-Disposition: attachment; filename="' . $filename . '.csv"');
                $output = fopen('php://output', 'w');
                if ($table === 'product_deltas') {
                    fputcsv($output, ['State', 'ID Product', 'Reference', 'Price', 'Name']);
                    foreach ($exportData['added'] as $row) {
                        fputcsv($output, ['ADDED', $row['id_product'] ?? '', $row['reference'] ?? '', $row['price'] ?? '', $row['name'] ?? '']);
                    }
                    foreach ($exportData['deleted'] as $row) {
                        fputcsv($output, ['DELETED', $row['id_product'] ?? '', $row['reference'] ?? '', $row['price'] ?? '', $row['name'] ?? '']);
                    }
                } else {
                    fputcsv($output, ['State', 'Primary Key', 'Column', 'Live Value', 'Backup Value']);
                    foreach ($exportData['added_rows'] as $row) {
                        fputcsv($output, ['ADDED', implode(',', $row), '', '', '']);
                    }
                    foreach ($exportData['deleted_rows'] as $row) {
                        fputcsv($output, ['DELETED', implode(',', $row), '', '', '']);
                    }
                    foreach ($exportData['modified_rows'] as $mod) {
                        foreach ($mod['changes'] as $col => $vals) {
                            fputcsv($output, ['MODIFIED', $mod['pk'], $col, $vals['live'], $vals['backup']]);
                        }
                    }
                }
                fclose($output);
            }
            exit;
        } catch (Exception $e) {
            $this->logger->log("Export failed: " . $e->getMessage(), 'ERROR');
            header('HTTP/1.1 500 Internal Server Error');
            die($e->getMessage());
        }
    }

    protected function prepareRestore(): void
    {
        try {
            $backupName = Tools::getValue('backup_name');
            if (empty($backupName)) {
                throw new Exception('Missing backup name for restore preparation.');
            }
            // Get current shop state
            $isShopEnabled = (bool)Configuration::get('PS_SHOP_ENABLE');
            // Put shop to Maintenance Mode
            Configuration::updateValue('PS_SHOP_ENABLE', 0);
            $this->logger->log("Shop set to MAINTENANCE mode for database restore.", 'INFO');
            $result = $this->backupManager->prepareRestore($backupName);
            $result['was_shop_enabled'] = $isShopEnabled;
            $this->sendJsonResponse($result);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }

    protected function executeRestoreChunk(): void
    {
        try {
            $backupName = Tools::getValue('backup_name');
            $offset = (int)Tools::getValue('offset');
            $limit = (int)Tools::getValue('limit', 100);
            if (empty($backupName)) {
                throw new Exception('Missing backup name.');
            }
            $result = $this->backupManager->executeRestoreChunk($backupName, $offset, $limit);
            $this->sendJsonResponse($result);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }

    protected function completeRestore(): void
    {
        try {
            $backupName = Tools::getValue('backup_name');
            $wasShopEnabled = (bool)Tools::getValue('was_shop_enabled');
            if ($wasShopEnabled) {
                Configuration::updateValue('PS_SHOP_ENABLE', 1);
                $this->logger->log("Restore complete. Shop returned to LIVE state.", 'INFO');
                $shopStatus = 'LIVE';
            } else {
                $this->logger->log("Restore complete. Shop kept in MAINTENANCE mode (was in maintenance before).", 'INFO');
                $shopStatus = 'MAINTENANCE';
            }
            $this->logger->log("DATABASE RESTORE COMPLETED SUCCESSFULLY FOR: " . $backupName, 'INFO');
            $this->sendJsonResponse([
                'success' => true,
                'shop_status' => $shopStatus,
                'log_content' => $this->logger->getRecentLogsReversed(150)
            ]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }

    protected function uploadRestoreFile(): void
    {
        try {
            if (!isset($_FILES['file'])) {
                throw new Exception('No file uploaded.');
            }
            $file = $_FILES['file'];
            if ($file['error'] !== UPLOAD_ERR_OK) {
                throw new Exception('Upload error code: ' . $file['error']);
            }
            $fileName = basename($file['name']);
            if (!preg_match('/^[a-zA-Z0-9_-]+\.(sql|sql\.gz)$/i', $fileName)) {
                throw new Exception('Invalid file name structure or extension. Only alphanumeric filenames ending with .sql or .sql.gz are allowed.');
            }
            $importTmp = _PS_MODULE_DIR_ . 'mass_utility/backups/import_tmp/';
            if (!is_dir($importTmp)) {
                @mkdir($importTmp, 0755, true);
            }
            $destPath = $importTmp . $fileName;
            if (!@move_uploaded_file($file['tmp_name'], $destPath)) {
                throw new Exception('Failed to save uploaded file.');
            }
            $this->logger->log("External SQL backup uploaded and staged: " . $fileName, 'INFO');
            $backupsList = $this->backupManager->getBackupList();
            $formattedBackups = $this->formatBackupResponse($backupsList);
            $this->sendJsonResponse([
                'success' => true,
                'staged_filename' => $fileName,
                'message' => 'File successfully uploaded and staged for restoration.',
                'backups' => $formattedBackups
            ]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }

    protected function deleteBackup(): void
    {
        try {
            $file = Tools::getValue('file');
            $this->logger->log("Deleting backup archive and logs for: " . $file, 'INFO');
            $this->backupManager->deleteBackup($file);
            $this->logger->log("Successfully purged backup: " . $file, 'INFO');
            $backups = $this->backupManager->getBackupList();
            $formattedBackups = $this->formatBackupResponse($backups);
            $this->sendJsonResponse([
                'success' => true,
                'backups' => $formattedBackups
            ]);
        } catch (Exception $e) {
            $this->logger->log("Backup deletion failed: " . $e->getMessage(), 'ERROR');
            $this->sendErrorResponse($e->getMessage());
        }
    }

    protected function clearBackupHistory(): void
    {
        try {
            $backups = $this->backupManager->getBackupList();
            foreach ($backups as $b) {
                $this->backupManager->deleteBackup($b['basename']);
            }
            $this->logger->log("Admin purged all local Gzip catalog backups.", 'INFO');
            $this->sendJsonResponse(['success' => true]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }

    private function formatBackupResponse(array $backups): array
    {
        $formattedBackups = [];
        $adminModulesUrl = Context::getContext()->link->getAdminLink('AdminModules', true);
        $defaultDownload = Configuration::get('PM_GDRIVE_DEFAULT_DOWNLOAD') ?: 'cloud';
        $isGoogleDriveConnected = !empty(Configuration::get('PM_GD_REFRESH_TOKEN')) || !empty(Configuration::get('PM_GD_ACCESS_TOKEN'));
        if (!$isGoogleDriveConnected) {
            $defaultDownload = 'local';
        }

        foreach ($backups as $b) {
            $isLocal = isset($b['is_local']) ? $b['is_local'] : true;
            $isCloud = isset($b['is_cloud']) ? $b['is_cloud'] : false;
            
            $sqlDownloadUrl = '#';
            $logDownloadUrl = '#';
            
            $buildUrl = function(?string $baseUrl, string $act, string $file, string $type = ''): string {
                if (!empty($baseUrl) && (strpos($baseUrl, 'controller=AdminModules') !== false || strpos($baseUrl, 'index.php') !== false)) {
                    $sep = (strpos($baseUrl, '?') !== false) ? '&' : '?';
                    $u = $baseUrl . $sep . 'configure=mass_utility&mu_action=' . urlencode($act) . '&file=' . urlencode($file);
                    if (!empty($type)) {
                        $u .= '&type=' . urlencode($type);
                    }
                    return $u;
                }
                $u = 'index.php?mu_action=' . urlencode($act) . '&file=' . urlencode($file);
                if (!empty($type)) {
                    $u .= '&type=' . urlencode($type);
                }
                return $u;
            };

            if ($isLocal && $isCloud) {
                if ($defaultDownload === 'cloud') {
                    $sqlDownloadUrl = $buildUrl($adminModulesUrl, 'download_from_drive', $b['basename'], 'database');
                    $logDownloadUrl = $b['log_filename'] ? $buildUrl($adminModulesUrl, 'download_from_drive', $b['basename'], 'database') : '#';
                } else {
                    $sqlDownloadUrl = $buildUrl($adminModulesUrl, 'download_backup', $b['sql_filename']);
                    $logDownloadUrl = $b['log_filename'] ? $buildUrl($adminModulesUrl, 'download_backup', $b['log_filename']) : '#';
                }
            } elseif ($isCloud) {
                $sqlDownloadUrl = $buildUrl($adminModulesUrl, 'download_from_drive', $b['basename'], 'database');
                $logDownloadUrl = $b['log_filename'] ? $buildUrl($adminModulesUrl, 'download_from_drive', $b['basename'], 'database') : '#';
            } elseif ($isLocal) {
                $sqlDownloadUrl = $buildUrl($adminModulesUrl, 'download_backup', $b['sql_filename']);
                $logDownloadUrl = $b['log_filename'] ? $buildUrl($adminModulesUrl, 'download_backup', $b['log_filename']) : '#';
            }

            $formattedBackups[] = [
                'basename' => $b['basename'],
                'sql_filename' => $b['sql_filename'],
                'sql_size' => is_numeric($b['sql_size']) ? sprintf('%.2f MB', $b['sql_size'] / 1024 / 1024) : $b['sql_size'],
                'log_filename' => $b['log_filename'],
                'log_size' => is_numeric($b['log_size']) ? sprintf('%.2f KB', $b['log_size'] / 1024) : 0,
                'date' => date('Y-m-d H:i:s', $b['date']),
                'sql_download_url' => $sqlDownloadUrl,
                'log_download_url' => $logDownloadUrl,
                'is_uploaded' => isset($b['is_uploaded']) ? $b['is_uploaded'] : false,
                'is_local' => $isLocal,
                'is_cloud' => $isCloud,
                'duration' => isset($b['duration']) ? $this->formatDuration((int)$b['duration']) : null
            ];
        }
        return $formattedBackups;
    }

    protected function profileDatabase(): void
    {
        try {
            $profile = $this->profilerEngine->analyzeFragmentation();
            $this->sendJsonResponse($profile);
        } catch (Exception $e) {
            $this->logger->log("Profile database failed: " . $e->getMessage(), 'ERROR');
            $this->sendErrorResponse($e->getMessage());
        }
    }

    protected function optimizeTable(): void
    {
        try {
            $tableName = Tools::getValue('table');
            if (empty($tableName)) {
                throw new Exception("Missing table name for optimization.");
            }
            $this->profilerEngine->optimizeTable($tableName);
            $this->sendJsonResponse(['success' => true, 'message' => "Table optimized successfully."]);
        } catch (Exception $e) {
            $this->logger->log("Optimize table failed: " . $e->getMessage(), 'ERROR');
            $this->sendErrorResponse($e->getMessage());
        }
    }

    protected function getCategorizedTables(): void
    {
        try {
            $categorized = $this->backupManager->getAllTablesCategorized();
            $this->sendJsonResponse([
                'success' => true,
                'categorized_tables' => $categorized
            ]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }

    protected function getDbBackups(): void
    {
        try {
            $backups = $this->backupManager->getBackupList();
            $formatted = $this->formatBackupResponse($backups);
            $adminModulesUrl = Context::getContext()->link->getAdminLink('AdminModules', true);
            $this->sendJsonResponse([
                'success' => true,
                'backups' => $formatted,
                'admin_modules_url' => $adminModulesUrl
            ]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }

    protected function getFragmentationStatus(): void
    {
        try {
            $sql = "SELECT TABLE_NAME AS name, 
                           (DATA_LENGTH + INDEX_LENGTH) AS total_size, 
                           DATA_FREE AS data_free
                    FROM INFORMATION_SCHEMA.TABLES 
                    WHERE TABLE_SCHEMA = DATABASE() 
                      AND ENGINE = 'InnoDB'
                      AND DATA_FREE > 0";
            $rows = \Db::getInstance()->executeS($sql);
            $this->sendJsonResponse([
                'success' => true,
                'tables' => is_array($rows) ? $rows : []
            ]);
        } catch (\Throwable $e) {
            $this->logger->log("Get fragmentation status failed: " . $e->getMessage(), 'ERROR');
            $this->sendErrorResponse($e->getMessage());
        }
    }

    protected function togglePinBackup(): void
    {
        try {
            $file = Tools::getValue('file');
            if (empty($file)) {
                throw new Exception('Missing backup file name.');
            }
            $dir = _PS_MODULE_DIR_ . 'mass_utility/backups/' . preg_replace('/(\.sql\.gz|\.log)$/', '', $file) . '/';
            $pinFile = $dir . '.pinned';
            
            if (file_exists($pinFile)) {
                @unlink($pinFile);
                $pinned = false;
            } else {
                if (!is_dir($dir)) {
                    @mkdir($dir, 0755, true);
                }
                @file_put_contents($pinFile, (string)time());
                $pinned = true;
            }
            
            $backups = $this->backupManager->getBackupList();
            $this->sendJsonResponse([
                'success' => true,
                'pinned' => $pinned,
                'backups' => $this->formatBackupResponse($backups)
            ]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }
}

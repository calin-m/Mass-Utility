<?php
declare(strict_types=1);

/**
 * Project Mass - Asynchronous CLI Backup Worker
 *
 * Designed to execute database and file backups asynchronously from the CLI.
 * Keeps the ProgressTracker updated so the Web UI can query current percentages.
 */

// 1. Enforce CLI execution bounds (relaxed to allow CGI SAPI binary invocation under CLI context)
if (isset($_SERVER['REQUEST_METHOD']) || isset($_SERVER['HTTP_HOST'])) {
    header('HTTP/1.1 403 Forbidden');
    die("Error: Forbidden access. CLI execution only.\n");
}

// 2. Bootstrap PrestaShop Core
$configPath = __DIR__ . '/../../../config/config.inc.php';
if (!file_exists($configPath)) {
    $configPath = __DIR__ . '/../../../../config/config.inc.php';
}
if (file_exists($configPath)) {
    require_once $configPath;
} else {
    // Environmental mocks for standalone testing/dev
    if (!defined('_DB_PREFIX_')) {
        define('_DB_PREFIX_', 'ps_');
    }
    if (!defined('_PS_MODULE_DIR_')) {
        define('_PS_MODULE_DIR_', dirname(__DIR__) . '/');
    }
    if (!defined('_PS_ROOT_DIR_')) {
        define('_PS_ROOT_DIR_', dirname(dirname(__DIR__)) . '/');
    }
    if (!defined('_PS_VERSION_')) {
        define('_PS_VERSION_', '8.1.4');
    }

    if (!class_exists('Configuration')) {
        class Configuration {
            private static array $storage = [];
            public static function get($key) {
                if (array_key_exists($key, self::$storage)) {
                    return self::$storage[$key];
                }
                if ($key === 'PM_SECURE_TOKEN') {
                    return 'mock_token_for_testing';
                }
                return false;
            }
            public static function updateValue($key, $value) {
                self::$storage[$key] = (string)$value;
                return true;
            }
        }
    }

    if (!class_exists('Db')) {
        class Db {
            private static ?Db $instance = null;
            public static function getInstance($use_new_connection = false) {
                if (self::$instance === null) {
                    self::$instance = new self();
                }
                return self::$instance;
            }
            public function getValue($sql, $use_cache = true) {
                if (stripos($sql, 'SELECT VERSION()') !== false) {
                    return '8.0.35-Mock';
                }
                return '0';
            }
            public function executeS($sql, $array = true, $use_cache = true) {
                return [];
            }
            public function execute($sql, $use_cache = true) {
                return true;
            }
        }
    }

    if (!class_exists('Tools')) {
        class Tools {
            public static function getValue($key, $default = false) {
                if (isset($_GET[$key])) {
                    return $_GET[$key];
                }
                if (isset($_POST[$key])) {
                    return $_POST[$key];
                }
                return $default;
            }
        }
    }
}

// Load Services
require_once __DIR__ . '/../src/Service/BridgeLogger.php';
require_once __DIR__ . '/../src/Service/SettingsManager.php';
require_once __DIR__ . '/../src/Service/ResourceMonitor.php';
require_once __DIR__ . '/../src/Service/BridgeProgressTracker.php';
require_once __DIR__ . '/../src/Service/TableBackupManager.php';
require_once __DIR__ . '/../src/Service/FileBackupEngine.php';

use MassUtility\Service\BridgeLogger;
use MassUtility\Service\SettingsManager;
use MassUtility\Service\ResourceMonitor;
use MassUtility\Service\BridgeProgressTracker;
use MassUtility\Service\TableBackupManager;
use MassUtility\Service\FileBackupEngine;

// 3. Parse input arguments
$options = getopt('', ['type:', 'job_id:', 'token:', 'profile:', 'tables:']);
$type = $options['type'] ?? '';
$jobId = $options['job_id'] ?? '';
$token = $options['token'] ?? '';
$profile = $options['profile'] ?? 'full';
$tablesRaw = $options['tables'] ?? '';

if (empty($type) || empty($jobId)) {
    die("Error: Missing mandatory parameters.\nUsage: php cli_backup_worker.php --type=<database|file> --job_id=<job_id> --token=<token> [--profile=<profile>] [--tables=<tables>]\n");
}

// 4. Token Check
$secureToken = \Configuration::get('PM_SECURE_TOKEN');
if (empty($secureToken)) {
    $secureToken = bin2hex(random_bytes(32));
    \Configuration::updateValue('PM_SECURE_TOKEN', $secureToken);
}

if (!hash_equals($secureToken, $token)) {
    die("Error: Invalid security execution token provided.\n");
}

$logger = new BridgeLogger();
$settingsManager = new SettingsManager();
$resourceMonitor = new ResourceMonitor();
$progressTracker = new BridgeProgressTracker();

$logger->log("CLI Backup Worker started for Job ID: {$jobId}, Type: {$type}", 'INFO');

try {
    if ($type === 'database') {
        $backupManager = new TableBackupManager($logger);
        
        $customTables = null;
        if (!empty($tablesRaw)) {
            $customTables = array_filter(array_map('trim', explode(',', $tablesRaw)));
        }
        
        $baseName = $backupManager->createBackup($customTables, $jobId, $progressTracker);
        $total = count($customTables ?: $backupManager->getTargetTables());
        $progressTracker->updateProgress($jobId, $total, [
            'basename' => $baseName,
            'status' => 'completed'
        ]);
        $logger->log("CLI Database Backup completed successfully. Archive: {$baseName}", 'INFO');
        
    } elseif ($type === 'file') {
        $backupDir = _PS_MODULE_DIR_ . 'mass_utility/backups/files/';
        $fileEngine = new FileBackupEngine($logger, $backupDir, $settingsManager, $resourceMonitor);
        
        $sourceDir = _PS_ROOT_DIR_;
        $init = $fileEngine->initializeJob($sourceDir, $jobId, $profile);
        $totalFiles = $init['total_files'];
        
        // Update job in ProgressTracker
        $progressTracker->updateProgress($jobId, 0, [
            'total_items' => $totalFiles,
            'status_text' => "Archiving files: 0 of {$totalFiles}"
        ]);

        $jobFolder = $backupDir . $jobId . '/';
        $stateFile = $jobFolder . $jobId . '_state.json';
        $tarFile = $jobFolder . $jobId . '.tar';

        $execEnabled = function_exists('exec') && !in_array('exec', array_map('trim', explode(',', (string)ini_get('disable_functions'))), true);
        $nativeTarSuccess = false;

        if ($execEnabled && $totalFiles > 0) {
            // Check if tar tool is available in path
            $tarTestOut = [];
            $tarTestCode = -1;
            @exec('tar --version', $tarTestOut, $tarTestCode); // nosec
            
            if ($tarTestCode === 0) {
                $logger->log("Native tar tool detected. Attempting CLI fast-path compilation...", 'INFO');
                $progressTracker->updateProgress($jobId, 0, [
                    'status_text' => "Compiling archive via native command..."
                ]);

                $state = file_exists($stateFile) ? json_decode((string)file_get_contents($stateFile), true) : null;
                $files = isset($state['files']) ? $state['files'] : [];
                $listFile = $jobFolder . 'files_list.txt';

                if (!empty($files) && file_put_contents($listFile, implode("\n", $files)) !== false) {
                    $cmd = 'tar -cf ' . escapeshellarg($tarFile) . ' -C ' . escapeshellarg($sourceDir) . ' -T ' . escapeshellarg($listFile);
                    $tarOut = [];
                    $tarCode = -1;
                    $startTime = time();

                    @exec($cmd, $tarOut, $tarCode); // nosec

                    if (file_exists($listFile)) {
                        @unlink($listFile);
                    }

                    if ($tarCode === 0 && file_exists($tarFile)) {
                        $duration = time() - $startTime;
                        $logger->log("Native tar compilation completed successfully in {$duration}s.", 'INFO');

                        // Generate SHA256 sidecar file
                        $hash = hash_file('sha256', $tarFile);
                        file_put_contents($tarFile . '.sha256', $hash, LOCK_EX);

                        // Generate LOG sidecar file
                        $logContent = "File Backup Log for Job: " . $jobId . "\n";
                        $logContent .= "Profile: " . $profile . "\n";
                        $logContent .= "Total Files: " . $totalFiles . "\n";
                        $logContent .= "Duration: " . $duration . " seconds (compiled via native command)\n";
                        $logContent .= "--------------------------------------------------\n";
                        $logContent .= implode("\n", $files);
                        file_put_contents($tarFile . '.log', $logContent, LOCK_EX);

                        // Write duration metadata
                        file_put_contents($tarFile . '.metadata.json', json_encode(['duration' => $duration]), LOCK_EX);

                        // Update state JSON
                        if (is_array($state)) {
                            $state['status'] = 'completed';
                            $state['processed_files'] = $totalFiles;
                            $state['duration'] = $duration;
                            file_put_contents($stateFile, json_encode($state, JSON_PRETTY_PRINT), LOCK_EX);
                        }

                        $progressTracker->updateProgress($jobId, $totalFiles, [
                            'status' => 'completed',
                            'status_text' => "Archive compilation finished via native fast-path."
                        ]);

                        $nativeTarSuccess = true;
                    } else {
                        $logger->log("Native tar compilation command failed with code {$tarCode}.", 'WARNING');
                    }
                }
            }
        }

        if ($nativeTarSuccess) {
            $logger->log("CLI File Backup completed successfully via fast-path for Job ID: {$jobId}", 'INFO');
            exit(0);
        }

        $logger->log("Fast-path unavailable or failed. Commencing chunked PHP backup compiler...", 'INFO');
        $processed = 0;
        while (true) {
            if ($progressTracker->isCancelled($jobId)) {
                $jobFolder = $backupDir . $jobId . '/';
                if (is_dir($jobFolder)) {
                    $files = glob($jobFolder . '*');
                    if (is_array($files)) {
                        foreach ($files as $file) {
                            if (file_exists($file)) { @unlink($file); }
                        }
                    }
                    @rmdir($jobFolder);
                }
                $logger->log("CLI File Backup Job {$jobId} was cancelled by user.", 'INFO');
                exit(0);
            }

            $chunkResult = $fileEngine->processChunk($jobId);
            $processed = $chunkResult['processed'];
            
            $progressTracker->updateProgress($jobId, $processed, [
                'status_text' => "Archiving files: {$processed} of {$totalFiles}"
            ]);
            
            if ($chunkResult['status'] === 'completed') {
                $progressTracker->updateProgress($jobId, $processed, [
                    'status' => 'completed',
                    'status_text' => "Archive compilation finished."
                ]);
                break;
            }
        }
        
        $logger->log("CLI File Backup completed successfully for Job ID: {$jobId}", 'INFO');
    } else {
        throw new Exception("Unknown backup type: " . $type);
    }
} catch (\Throwable $e) {
    $errorMessage = $e->getMessage();
    if ($errorMessage === 'cancelled') {
        $logger->log("CLI Backup Worker was cancelled by user.", 'INFO');
        exit(0);
    }
    $progressTracker->failJob($jobId, $errorMessage);
    $logger->log("CLI Backup Worker failed: " . $errorMessage, 'ERROR');
    exit(1);
}

<?php
declare(strict_types=1);

namespace MassUtility\Controller\Api;

if (!defined('_PS_VERSION_')) {
    exit;
}

use Context;
use Configuration;
use Exception;
use Db;
use MassUtility\Service\ResourceMonitor;
use MassUtility\Service\BridgeLogger;
use MassUtility\Service\BridgeProgressTracker;
use Tools;
use ReflectionClass;

require_once __DIR__ . '/AbstractApiController.php';
require_once dirname(dirname(__DIR__)) . '/Service/BridgeProgressTracker.php';
require_once dirname(dirname(__DIR__)) . '/Service/TableBackupManager.php';
require_once dirname(dirname(__DIR__)) . '/Service/FileBackupEngine.php';

/**
 * Handles diagnostic and environmental polling.
 */
class SystemApiController extends AbstractApiController
{
    private BridgeLogger $logger;
    private ResourceMonitor $monitor;

    public function __construct(BridgeLogger $logger, ResourceMonitor $monitor)
    {
        $this->logger = $logger;
        $this->monitor = $monitor;
    }

    protected function getGDriveAuthDetails(): void
    {
        try {
            $redirectUri = Context::getContext()->link->getAdminLink('AdminModules', true) . '&configure=mass_utility&action=google_oauth_callback';
            $state = Tools::getAdminTokenLite('AdminModules');
            $this->sendJsonResponse([
                'success' => true,
                'redirect_uri' => $redirectUri,
                'state' => $state
            ]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }

    protected function getServerStatus(): void
    {
        try {
            $this->monitor->detectCoreParameters();
            
            // Fetch low load state to Hydrate current CPU and Memory usage
            $chunkSize = 0;
            $sleepDelay = 0;
            $loadState = $this->monitor->evaluateSystemLoad(0, $chunkSize, $sleepDelay);
            
            // Get memory usage
            $memUsage = (float)memory_get_usage(true);
            $memUsageFormatted = sprintf('%.2f MB', $memUsage / 1024 / 1024);
            
            // Re-evaluate Sandbox probe latency dynamically
            $probeSuccess = false;
            $probeLatency = 0.0;
            try {
                $probeStart = microtime(true);
                $probeSuccess = $this->monitor->executeSandboxProbe();
                $probeLatency = microtime(true) - $probeStart;
            } catch (Exception $e) {
                $probeSuccess = false;
            }
            
            // Fetch dynamic cgroup load percentage and hardware specifications
            $physCores = $this->monitor->getPhysicalCores();
            $cores = $this->monitor->getCores();
            $dbMaxConnections = $this->monitor->getDbMaxConnections();
            $memoryFloor = $this->monitor->getMemoryFloor();
            $cpuSpeed = $this->monitor->getCpuSpeedAllocation();
            
            $cpuLoad = 10.0;
            if (function_exists('sys_getloadavg')) {
                $load = sys_getloadavg();
                if (is_array($load) && isset($load[0])) {
                    $cpuLoad = min(($load[0] / max(1, $physCores)) * 100.0, 100.0);
                }
            }

            // High-cost Disk Audit Caching Loop (60 seconds TTL)
            $cacheFile = _PS_MODULE_DIR_ . 'mass_utility/.disk_audit_cache.json';
            $diskSpaceStatus = 'WARNING';
            $diskSpaceMessage = 'Checking...';
            
            require_once dirname(__DIR__) . '/../Service/TableBackupManager.php';
            $tbm = new \MassUtility\Service\TableBackupManager($this->logger, $this->monitor);
            $audits = [];
            
            if (file_exists($cacheFile) && (time() - filemtime($cacheFile) < 60)) {
                $cachedAudit = json_decode(file_get_contents($cacheFile), true);
                if (is_array($cachedAudit)) {
                    $diskSpaceStatus = $cachedAudit['status'] ?? 'WARNING';
                    $diskSpaceMessage = $cachedAudit['message'] ?? '';
                }
            } else {
                $audits = $tbm->runPreFlightAudits();
                $diskSpaceStatus = $audits['disk_space']['status'] ?? 'WARNING';
                $diskSpaceMessage = $audits['disk_space']['message'] ?? '';
                
                @file_put_contents($cacheFile, json_encode(['status' => $diskSpaceStatus, 'message' => $diskSpaceMessage]), LOCK_EX);
            }
            
            if (empty($audits)) {
                $audits = $tbm->runPreFlightAudits();
            }

            // Get MySQL version
            $mysqlVersion = 'Unknown';
            try {
                $mysqlVersion = Db::getInstance()->getValue('SELECT VERSION()');
            } catch (\Throwable $e) {}

            // Get php.ini limits
            $ini = [
                'max_execution_time' => ini_get('max_execution_time') ?: '0',
                'max_input_time' => ini_get('max_input_time') ?: '0',
                'default_socket_timeout' => ini_get('default_socket_timeout') ?: '0',
                'upload_max_filesize' => ini_get('upload_max_filesize') ?: '0',
                'post_max_size' => ini_get('post_max_size') ?: '0',
                'memory_limit' => ini_get('memory_limit') ?: '0',
                'session_gc_maxlifetime' => ini_get('session.gc_maxlifetime') ?: '0',
            ];

            // Get OpCache status
            $opcacheActive = false;
            $opcacheEnabled = 'DISABLED';
            if (function_exists('opcache_get_status')) {
                $status = @opcache_get_status(false);
                if (is_array($status) && !empty($status['opcache_enabled'])) {
                    $opcacheActive = true;
                    $opcacheEnabled = 'ENABLED';
                }
            }
            
            $this->sendJsonResponse([
                'success' => true,
                'cpu_load' => number_format($cpuLoad, 2) . '%',
                'load_state' => $loadState,
                'chunk_size' => $chunkSize,
                'sleep_delay' => number_format($sleepDelay / 1000, 2),
                'memory_usage' => $memUsageFormatted,
                'probe_latency' => number_format($probeLatency * 1000, 2) . ' ms',
                'probe_status' => $probeSuccess ? 'PASSED' : 'FAILED',
                'disk_space_status' => $diskSpaceStatus,
                'disk_space_message' => $diskSpaceMessage,
                'timestamp' => date('H:i:s'),
                
                // Enhanced environmental spec values
                'cores' => $cores,
                'db_max_connections' => $dbMaxConnections,
                'memory_floor' => $memoryFloor,
                'cpu_speed' => $cpuSpeed,
                'ps_version' => defined('_PS_VERSION_') ? _PS_VERSION_ : 'Unknown',
                'mysql_version' => $mysqlVersion,
                'php_version' => PHP_VERSION,
                'ini' => $ini,
                'opcache_active' => $opcacheActive,
                'opcache_enabled' => $opcacheEnabled,
                'probe_success' => $probeSuccess,
                'checklist' => $audits
            ]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }

    protected function setShopLive(): void
    {
        try {
            Configuration::updateValue('PS_SHOP_ENABLE', 1);
            $this->logger->log("Shop set to LIVE manually via HUD toggle.", 'INFO');
            $this->sendJsonResponse([
                'success' => true,
                'message' => 'Shop successfully set to LIVE.'
            ]);
        } catch (Exception $e) {
            $this->sendErrorResponse('Failed to toggle shop status: ' . $e->getMessage());
        }
    }

    protected function clearLogs(): void
    {
        try {
            $logPath = _PS_MODULE_DIR_ . 'mass_utility/logs/mass_utility.log';
            if (file_exists($logPath)) {
                @unlink($logPath);
            }
            $this->logger->log("Event Log explicitly cleared by user.");
            $this->sendJsonResponse(['success' => true, 'message' => 'Event logs cleared successfully.']);
        } catch (Exception $e) {
            $this->sendErrorResponse('Failed to clear logs: ' . $e->getMessage());
        }
    }

    protected function saveSettings(): void
    {
        try {
            require_once dirname(dirname(__DIR__)) . '/Service/SettingsManager.php';
            $settingsManager = new \MassUtility\Service\SettingsManager();
            $payload = json_decode(file_get_contents('php://input'), true) ?: $_POST;
            $settingsData = isset($payload['settings']) ? $payload['settings'] : $payload;
            if (is_string($settingsData)) {
                $settingsData = json_decode($settingsData, true);
            }
            if (is_array($settingsData)) {
                $settingsManager->updateSettings($settingsData);
            }
            $this->sendJsonResponse(['success' => true]);
        } catch (Exception $e) {
            $this->sendErrorResponse('Failed to update bridge settings: ' . $e->getMessage());
        }
    }

    protected function downloadLogs(): void
    {
        try {
            $logPath = _PS_MODULE_DIR_ . 'mass_utility/logs/mass_utility.log';
            if (!file_exists($logPath)) {
                $this->sendErrorResponse('Log file does not exist.');
            }

            header('Content-Type: text/plain');
            header('Content-Disposition: attachment; filename="mass_utility_event_log.txt"');
            header('Content-Length: ' . filesize($logPath));
            readfile($logPath);
            exit;
        } catch (Exception $e) {
            $this->sendErrorResponse('Failed to download logs: ' . $e->getMessage());
        }
    }
    protected function pollJobProgress(): void
    {
        try {
            $jobId = Tools::getValue('job_id');
            if (empty($jobId)) {
                throw new Exception('Missing job_id parameter.');
            }

            $progressTracker = new BridgeProgressTracker();
            $state = $progressTracker->getJobState($jobId);
            if ($state === null) {
                $this->sendJsonResponse([
                    'success' => false,
                    'error' => 'Job state not found or not initialized yet.'
                ]);
                return;
            }

            $response = [
                'success' => true,
                'job_id' => $state['job_id'],
                'type' => $state['type'],
                'status' => $state['status'],
                'progress' => $state['progress'],
                'processed_items' => $state['processed_items'],
                'total_items' => $state['total_items'],
                'error' => $state['error'],
                'status_text' => $state['status_text'] ?? '',
                'basename' => $state['basename'] ?? null
            ];

            // If completed or cancelled, attach the updated backup grid data
            if ($state['status'] === 'completed' || $state['status'] === 'cancelled') {
                if ($state['type'] === 'database') {
                    $tbm = new \MassUtility\Service\TableBackupManager($this->logger);
                    $backups = $tbm->getBackupList();
                    $response['backups'] = $this->formatBackupResponse($backups);
                } elseif ($state['type'] === 'file') {
                    $fileEngine = new \MassUtility\Service\FileBackupEngine($this->logger, _PS_MODULE_DIR_ . 'mass_utility/backups/files/');
                    $backups = $fileEngine->getBackupList();
                    $response['backups'] = $this->formatFileBackupsResponse($backups);
                }
                
                // Clean up job file since it's finished/cancelled
                $progressTracker->cleanJob($jobId);
            }

            $this->sendJsonResponse($response);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }

    protected function streamJobProgress(): void
    {
        try {
            $jobId = Tools::getValue('job_id');
            if (empty($jobId)) {
                throw new Exception('Missing job_id parameter.');
            }

            // Release session lock to prevent blocking concurrent requests
            if (session_status() === PHP_SESSION_ACTIVE) {
                session_write_close();
            }

            header('Content-Type: text/event-stream');
            header('Cache-Control: no-cache');
            header('Connection: keep-alive');
            header('X-Accel-Buffering: no');

            // Disable gzip compression if possible
            if (function_exists('apache_setenv')) {
                @apache_setenv('no-gzip', '1');
            }
            @ini_set('zlib.output_compression', '0');

            while (ob_get_level() > 0) {
                ob_end_flush();
            }
            ob_implicit_flush(true);

            $progressTracker = new BridgeProgressTracker();
            $lastProgress = -1.0;
            $lastStatusText = '';

            // Run loop for a max duration or until connection is closed / job completed/failed/cancelled
            $startTime = time();
            $timeout = 600; // 10 minutes max connection lifetime

            while (time() - $startTime < $timeout) {
                if (connection_aborted()) {
                    break;
                }

                $state = $progressTracker->getJobState($jobId);
                if ($state === null) {
                    echo "data: " . json_encode([
                        'success' => false,
                        'error' => 'Job state not found or not initialized yet.'
                    ]) . "\n\n";
                    if (ob_get_level() > 0) { ob_flush(); }
                    flush();
                    break;
                }

                $currentProgress = (float)$state['progress'];
                $currentStatusText = $state['status_text'] ?? '';
                $currentStatus = $state['status'];

                $response = [
                    'success' => true,
                    'job_id' => $state['job_id'],
                    'type' => $state['type'],
                    'status' => $state['status'],
                    'progress' => $state['progress'],
                    'processed_items' => $state['processed_items'],
                    'total_items' => $state['total_items'],
                    'error' => $state['error'],
                    'status_text' => $state['status_text'] ?? '',
                    'basename' => $state['basename'] ?? null
                ];

                $shouldSend = ($currentProgress !== $lastProgress) || ($currentStatusText !== $lastStatusText) || ($currentStatus === 'completed') || ($currentStatus === 'cancelled') || ($currentStatus === 'failed');

                if ($shouldSend) {
                    if ($currentStatus === 'completed' || $currentStatus === 'cancelled') {
                        if ($state['type'] === 'database') {
                        $tbm = new \MassUtility\Service\TableBackupManager($this->logger);
                        $backups = $tbm->getBackupList();
                        $response['backups'] = $this->formatBackupResponse($backups);
                    } elseif ($state['type'] === 'file') {
                        $fileEngine = new \MassUtility\Service\FileBackupEngine($this->logger, _PS_MODULE_DIR_ . 'mass_utility/backups/files/');
                        $backups = $fileEngine->getBackupList();
                        $response['backups'] = $this->formatFileBackupsResponse($backups);
                    }
                    
                    // Clean up job file since it's finished/cancelled
                    $progressTracker->cleanJob($jobId);
                    }

                    echo "data: " . json_encode($response) . "\n\n";
                    if (ob_get_level() > 0) { ob_flush(); }
                    flush();

                    if ($currentStatus === 'completed' || $currentStatus === 'cancelled' || $currentStatus === 'failed') {
                        break;
                    }

                    $lastProgress = $currentProgress;
                    $lastStatusText = $currentStatusText;
                }

                usleep(250000); // Check every 250ms
            }
            exit;
        } catch (Exception $e) {
            echo "data: " . json_encode(['success' => false, 'error' => $e->getMessage()]) . "\n\n";
            if (ob_get_level() > 0) { ob_flush(); }
            flush();
            exit;
        }
    }

    protected function cancelJob(): void
    {
        try {
            $jobId = Tools::getValue('job_id');
            if (empty($jobId)) {
                throw new Exception('Missing job_id parameter.');
            }

            $progressTracker = new BridgeProgressTracker();
            $state = $progressTracker->getJobState($jobId);
            if ($state === null) {
                throw new Exception('Job not found.');
            }

            $progressTracker->cancelJob($jobId);
            $this->logger->log("Cancellation request submitted for Job ID: " . $jobId, 'INFO');

            $this->sendJsonResponse([
                'success' => true,
                'message' => 'Job cancel request submitted.'
            ]);
        } catch (Exception $e) {
            $this->sendErrorResponse('Failed to cancel job: ' . $e->getMessage());
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
            
            if ($isLocal && $isCloud) {
                if ($defaultDownload === 'cloud') {
                    $sqlDownloadUrl = $adminModulesUrl . '&configure=mass_utility&action=download_from_drive&file=' . urlencode($b['basename']) . '&type=database&filename=' . urlencode($b['sql_filename']);
                    $logDownloadUrl = $b['log_filename'] ? $adminModulesUrl . '&configure=mass_utility&action=download_from_drive&file=' . urlencode($b['basename']) . '&type=database&filename=' . urlencode($b['log_filename']) : '#';
                } else {
                    $sqlDownloadUrl = $adminModulesUrl . '&configure=mass_utility&action=download_backup&file=' . urlencode($b['sql_filename']);
                    $logDownloadUrl = $b['log_filename'] ? $adminModulesUrl . '&configure=mass_utility&action=download_backup&file=' . urlencode($b['log_filename']) : '#';
                }
            } elseif ($isCloud) {
                $sqlDownloadUrl = $adminModulesUrl . '&configure=mass_utility&action=download_from_drive&file=' . urlencode($b['basename']) . '&type=database&filename=' . urlencode($b['sql_filename']);
                $logDownloadUrl = $b['log_filename'] ? $adminModulesUrl . '&configure=mass_utility&action=download_from_drive&file=' . urlencode($b['basename']) . '&type=database&filename=' . urlencode($b['log_filename']) : '#';
            } elseif ($isLocal) {
                $sqlDownloadUrl = $adminModulesUrl . '&configure=mass_utility&action=download_backup&file=' . urlencode($b['sql_filename']);
                $logDownloadUrl = $b['log_filename'] ? $adminModulesUrl . '&configure=mass_utility&action=download_backup&file=' . urlencode($b['log_filename']) : '#';
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

    private function formatFileBackupsResponse(array $backups): array
    {
        $adminModulesUrl = Context::getContext()->link->getAdminLink('AdminModules', true);
        $defaultDownload = Configuration::get('PM_GDRIVE_DEFAULT_DOWNLOAD') ?: 'cloud';
        $isGoogleDriveConnected = !empty(Configuration::get('PM_GD_REFRESH_TOKEN')) || !empty(Configuration::get('PM_GD_ACCESS_TOKEN'));
        if (!$isGoogleDriveConnected) {
            $defaultDownload = 'local';
        }

        foreach ($backups as &$b) {
            if (isset($b['duration']) && $b['duration'] !== null) {
                $b['duration'] = $this->formatDuration((int)$b['duration']);
            } else {
                $b['duration'] = null;
            }

            $isLocal = isset($b['is_local']) ? $b['is_local'] : true;
            $isCloud = isset($b['is_cloud']) ? $b['is_cloud'] : false;
            
            $archiveDownloadUrl = '#';
            $logDownloadUrl = '#';
            $logName = preg_replace('/\.tar$/', '', $b['basename']) . '.tar.log';
            
            if ($isLocal && $isCloud) {
                if ($defaultDownload === 'cloud') {
                    $archiveDownloadUrl = $adminModulesUrl . '&configure=mass_utility&action=download_from_drive&file=' . urlencode($b['basename']) . '&type=file&filename=' . urlencode($b['basename']);
                    $logDownloadUrl = $adminModulesUrl . '&configure=mass_utility&action=download_from_drive&file=' . urlencode($b['basename']) . '&type=file&filename=' . urlencode($logName);
                } else {
                    $archiveDownloadUrl = $adminModulesUrl . '&configure=mass_utility&action=download_file_backup&file=' . urlencode($b['basename']);
                    $logDownloadUrl = $adminModulesUrl . '&configure=mass_utility&action=download_file_backup_log&file=' . urlencode($b['basename']);
                }
            } elseif ($isCloud) {
                $archiveDownloadUrl = $adminModulesUrl . '&configure=mass_utility&action=download_from_drive&file=' . urlencode($b['basename']) . '&type=file&filename=' . urlencode($b['basename']);
                $logDownloadUrl = $adminModulesUrl . '&configure=mass_utility&action=download_from_drive&file=' . urlencode($b['basename']) . '&type=file&filename=' . urlencode($logName);
            } elseif ($isLocal) {
                $archiveDownloadUrl = $adminModulesUrl . '&configure=mass_utility&action=download_file_backup&file=' . urlencode($b['basename']);
                $logDownloadUrl = $adminModulesUrl . '&configure=mass_utility&action=download_file_backup_log&file=' . urlencode($b['basename']);
            }

            $b['archive_download_url'] = $archiveDownloadUrl;
            $b['log_download_url'] = $logDownloadUrl;
            $b['is_local'] = $isLocal;
            $b['is_cloud'] = $isCloud;
        }
        return $backups;
    }
}

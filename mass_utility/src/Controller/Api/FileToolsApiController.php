<?php
// @Arch[FileToolsApiController]

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
use MassUtility\Service\FileBackupEngine;
use MassUtility\Service\BridgeProgressTracker;
use Tools;

require_once __DIR__ . '/AbstractApiController.php';
require_once dirname(dirname(__DIR__)) . '/Service/BridgeProgressTracker.php';

/**
 * Handles iterative TAR archive creation of the physical `/public_html/` filesystem.
 */
class FileToolsApiController extends AbstractApiController
{
    private BridgeLogger $logger;
    private FileBackupEngine $fileBackupEngine;

    public function __construct(BridgeLogger $logger, FileBackupEngine $fileBackupEngine)
    {
        $this->logger = $logger;
        $this->fileBackupEngine = $fileBackupEngine;
    }

    protected function downloadFileBackup(): void
    {
        $file = trim((string)Tools::getValue('file'));
        $cleanFile = basename($file);
        if (!empty($cleanFile)) {
            $baseName = preg_replace('/(\.zip|\.tar\.gz|\.tar|\.log)$/i', '', $cleanFile);

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
                    $bDir . 'files/' . $baseName . '/' . $cleanFile,
                    $bDir . 'files/' . $baseName . '/' . $baseName . '.zip',
                    $bDir . 'files/' . $baseName . '/' . $baseName . '.tar.gz',
                    $bDir . 'files/' . $baseName . '/' . $baseName . '.tar',
                    $bDir . 'files/' . $cleanFile
                ];
                foreach ($candidatePaths as $filePath) {
                    if (file_exists($filePath) && is_file($filePath)) {
                        @clearstatcache(true, $filePath);
                        $this->logger->log("User downloaded file archive: " . basename($filePath), 'INFO');
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
        header('HTTP/1.1 404 Not Found');
        die('Access Denied or File Not Found');
    }

    protected function downloadFileBackupLog(): void
    {
        $file = trim((string)Tools::getValue('file'));
        $cleanFile = basename($file);
        if (!empty($cleanFile)) {
            $baseName = preg_replace('/(\.zip|\.tar\.gz|\.tar|\.log)$/i', '', $cleanFile);
            $logFileName = str_ends_with($cleanFile, '.log') ? $cleanFile : $cleanFile . '.log';

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
                    $bDir . 'files/' . $baseName . '/' . $baseName . '.log',
                    $bDir . 'files/' . $baseName . '/' . $logFileName,
                    $bDir . 'files/' . $logFileName
                ];
                foreach ($candidatePaths as $filePath) {
                    if (file_exists($filePath) && is_file($filePath)) {
                        @clearstatcache(true, $filePath);
                        $this->logger->log("User downloaded file backup log: " . basename($filePath), 'INFO');
                        while (ob_get_level()) {
                            @ob_end_clean();
                        }
                        header('Content-Description: File Transfer');
                        header('Content-Type: text/plain');
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
        header('HTTP/1.1 404 Not Found');
        die('Access Denied or Log Not Found');
    }

    protected function startFileBackup(): void
    {
        try {
            $profile = trim((string)Tools::getValue('profile', 'full'));
            $validProfiles = ['full', 'core', 'core_media', 'themes_modules', 'media'];
            if (!in_array($profile, $validProfiles, true)) {
                $profile = 'full';
            }

            $jobId = 'site_backup_' . $profile . '_' . date('Ymd_His') . '_' . uniqid();
            
            $progressTracker = new BridgeProgressTracker();
            $progressTracker->startJob($jobId, 'file', 0);
            $progressTracker->updateProgress($jobId, 0, ['status_text' => 'Scanning file system...']);

            $secureToken = Configuration::get('PM_SECURE_TOKEN');
            if (empty($secureToken)) {
                $secureToken = bin2hex(random_bytes(32));
                Configuration::updateValue('PM_SECURE_TOKEN', $secureToken);
            }

            $scriptPath = _PS_MODULE_DIR_ . 'mass_utility/bin/cli_backup_worker.php';
            $args = '--type=file --job_id=' . escapeshellarg($jobId) . ' --token=' . escapeshellarg($secureToken) . ' --profile=' . escapeshellarg($profile);

            $phpBinary = defined('PHP_BINARY') && PHP_BINARY ? PHP_BINARY : 'php';
            
            $isWindows = (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN');
            $requiredFunc = $isWindows ? 'popen' : 'exec';
            if (!function_exists($requiredFunc)) {
                throw new Exception("Required PHP command execution function '{$requiredFunc}' is disabled on this server.");
            }

            $logPath = _PS_MODULE_DIR_ . 'mass_utility/backups/worker_startup.log';
            @file_put_contents($logPath, "[" . date('Y-m-d H:i:s') . "] Spawning File worker for Job {$jobId}\n", FILE_APPEND | LOCK_EX);

            if ($isWindows) {
                pclose(popen("start /B \"\" " . escapeshellarg($phpBinary) . " " . escapeshellarg($scriptPath) . " " . $args, "r"));
            } else {
                exec(escapeshellarg($phpBinary) . " " . escapeshellarg($scriptPath) . " " . $args . " >> " . escapeshellarg($logPath) . " 2>&1 &"); // nosec
            }

            $this->logger->log("Triggered async File Backup. Job ID: " . $jobId . " Profile: " . $profile, 'INFO');

            $this->sendJsonResponse([
                'success' => true,
                'job_id' => $jobId,
                'status' => 'started'
            ]);
        } catch (Exception $e) {
            $this->logger->log("File backup launch failed: " . $e->getMessage(), 'ERROR');
            $this->sendErrorResponse($e->getMessage());
        }
    }


    protected function clearFileBackups(): void
    {
        try {
            $this->fileBackupEngine->clearAllBackups();
            $this->logger->log("Admin purged all local TAR file backups.", 'INFO');
            $this->sendJsonResponse(['success' => true, 'backups' => []]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }

    protected function deleteFileBackup(): void
    {
        try {
            $file = trim(Tools::getValue('file'));
            if (!preg_match('/^[a-zA-Z0-9_\-]+\.(zip|tar|tar\.gz)$/', $file)) {
                throw new Exception("Invalid archive filename.");
            }
            
            $baseName = preg_replace('/\.tar$/', '', $file);
            $folderPath = _PS_MODULE_DIR_ . 'mass_utility/backups/files/' . $baseName;
            $deleted = false;
            if (is_dir($folderPath)) {
                $files = glob($folderPath . '/*');
                if (is_array($files)) {
                    foreach ($files as $f) {
                        @unlink($f);
                    }
                }
                $deleted = @rmdir($folderPath);
            }

            if ($deleted) {
                $this->logger->log("Admin deleted file archive: {$file}", 'INFO');
            } else {
                throw new Exception("Archive file/folder not found.");
            }
            $this->sendJsonResponse(['success' => true, 'backups' => $this->formatBackups($this->fileBackupEngine->getBackupList())]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }
    protected function verifyBackupIntegrity(): void
    {
        try {
            $file = trim(Tools::getValue('file'));
            if (!preg_match('/^[a-zA-Z0-9_\-]+\.(zip|tar|tar\.gz)$/', $file)) {
                throw new Exception("Invalid archive filename.");
            }
            
            $baseName = preg_replace('/\.tar$/', '', $file);
            $filePath = _PS_MODULE_DIR_ . 'mass_utility/backups/files/' . $baseName . '/' . $file;
            if (!file_exists($filePath)) {
                throw new Exception("Archive file does not exist.");
            }
            if (!file_exists($filePath . '.sha256')) {
                throw new Exception("No integrity hash found for this archive.");
            }
            
            $storedHash = trim(file_get_contents($filePath . '.sha256'));
            $liveHash = hash_file('sha256', $filePath);
            
            if ($storedHash === $liveHash) {
                $this->sendJsonResponse(['success' => true, 'message' => "Integrity Verified. The archive is cryptographically sound."]);
            } else {
                $this->sendErrorResponse("CORRUPTION DETECTED. Live hash ({$liveHash}) does not match locked hash ({$storedHash}).");
            }
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }

    protected function getDirectoryTree(): void
    {
        try {
            $rootDir = _PS_ROOT_DIR_;
            $rootDir = rtrim(str_replace('\\', '/', $rootDir), '/') . '/';
            
            $exclusionsRaw = (string)(Configuration::get('PM_FILE_EXCLUSIONS') ?: '');
            $activeExclusions = array_filter(array_map('trim', explode("\n", $exclusionsRaw)));
            $normalizedExclusions = [];
            foreach ($activeExclusions as $ex) {
                $normalizedExclusions[] = '/' . trim($ex, '/') . '/';
            }

            $items = [];
            $dirs = glob($rootDir . '*', GLOB_ONLYDIR);
            if ($dirs) {
                foreach ($dirs as $dirPath) {
                    $dirPath = str_replace('\\', '/', $dirPath);
                    $name = basename($dirPath);
                    $relPath = '/' . $name . '/';
                    
                    $info = $this->getFolderInfo($dirPath, microtime(true) + 0.05);
                    
                    $items[] = [
                        'name' => $name,
                        'path' => $relPath,
                        'size_bytes' => $info['size'],
                        'size_formatted' => $this->formatSizeBytes($info['size']) . ($info['truncated'] ? '+' : ''),
                        'file_count' => $info['file_count'],
                        'is_excluded' => in_array($relPath, $normalizedExclusions, true)
                    ];
                    
                    // Special checks for subfolders
                    if ($name === 'var') {
                        foreach (['cache', 'logs'] as $sub) {
                            $subPath = $dirPath . '/' . $sub;
                            if (is_dir($subPath)) {
                                $subRel = '/var/' . $sub . '/';
                                $subInfo = $this->getFolderInfo($subPath, microtime(true) + 0.05);
                                $items[] = [
                                    'name' => 'var/' . $sub,
                                    'path' => $subRel,
                                    'size_bytes' => $subInfo['size'],
                                    'size_formatted' => $this->formatSizeBytes($subInfo['size']) . ($subInfo['truncated'] ? '+' : ''),
                                    'file_count' => $subInfo['file_count'],
                                    'is_excluded' => in_array($subRel, $normalizedExclusions, true)
                                ];
                            }
                        }
                    }
                    if ($name === 'img') {
                        $subPath = $dirPath . '/tmp';
                        if (is_dir($subPath)) {
                            $subRel = '/img/tmp/';
                            $subInfo = $this->getFolderInfo($subPath, microtime(true) + 0.05);
                            $items[] = [
                                'name' => 'img/tmp',
                                'path' => $subRel,
                                'size_bytes' => $subInfo['size'],
                                'size_formatted' => $this->formatSizeBytes($subInfo['size']) . ($subInfo['truncated'] ? '+' : ''),
                                'file_count' => $subInfo['file_count'],
                                'is_excluded' => in_array($subRel, $normalizedExclusions, true)
                            ];
                        }
                    }
                }
            }

            usort($items, function($a, $b) {
                return $b['size_bytes'] <=> $a['size_bytes'];
            });

            $this->sendJsonResponse([
                'success' => true,
                'directories' => $items,
                'exclusions' => $activeExclusions
            ]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }

    protected function saveExclusions(): void
    {
        try {
            $exclusionsJson = Tools::getValue('exclusions');
            $exclusions = json_decode((string)$exclusionsJson, true);
            
            if (!is_array($exclusions)) {
                throw new Exception('Invalid exclusions payload provided.');
            }
            
            $cleanExclusions = [];
            foreach ($exclusions as $ex) {
                $ex = trim((string)$ex);
                if ($ex !== '') {
                    $cleanExclusions[] = '/' . trim($ex, '/') . '/';
                }
            }
            
            $exclusionsStr = implode("\n", $cleanExclusions);
            Configuration::updateValue('PM_FILE_EXCLUSIONS', $exclusionsStr);
            
            $this->sendJsonResponse([
                'success' => true,
                'message' => 'Directory exclusions updated successfully.'
            ]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }

    private function getFolderInfo(string $path, float $endTime): array
    {
        $size = 0;
        $fileCount = 0;
        $isTruncated = false;

        $stack = [$path];
        while (!empty($stack)) {
            if (microtime(true) > $endTime) {
                $isTruncated = true;
                break;
            }
            $currentDir = array_pop($stack);
            $files = @scandir($currentDir);
            if ($files === false) {
                continue;
            }
            foreach ($files as $file) {
                if ($file === '.' || $file === '..') {
                    continue;
                }
                $fullPath = $currentDir . '/' . $file;
                if (is_link($fullPath)) {
                    continue;
                }
                if (is_dir($fullPath)) {
                    $stack[] = $fullPath;
                } else {
                    $size += @filesize($fullPath) ?: 0;
                    $fileCount++;
                }
            }
        }
        return [
            'size' => $size,
            'file_count' => $fileCount,
            'truncated' => $isTruncated
        ];
    }

    private function formatSizeBytes(int $bytes): string
    {
        if ($bytes <= 0) return '0 B';
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $i = (int)floor(log($bytes, 1024));
        return round($bytes / pow(1024, $i), 2) . ' ' . $units[$i];
    }

    private function formatBackups(array $backups): array
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
                    $archiveDownloadUrl = $buildUrl($adminModulesUrl, 'download_from_drive', $b['basename'], 'file');
                    $logDownloadUrl = $buildUrl($adminModulesUrl, 'download_from_drive', $logName, 'file');
                } else {
                    $archiveDownloadUrl = $buildUrl($adminModulesUrl, 'download_file_backup', $b['basename']);
                    $logDownloadUrl = $buildUrl($adminModulesUrl, 'download_file_backup_log', $b['basename']);
                }
            } elseif ($isCloud) {
                $archiveDownloadUrl = $buildUrl($adminModulesUrl, 'download_from_drive', $b['basename'], 'file');
                $logDownloadUrl = $buildUrl($adminModulesUrl, 'download_from_drive', $logName, 'file');
            } elseif ($isLocal) {
                $archiveDownloadUrl = $buildUrl($adminModulesUrl, 'download_file_backup', $b['basename']);
                $logDownloadUrl = $buildUrl($adminModulesUrl, 'download_file_backup_log', $b['basename']);
            }

            $b['archive_download_url'] = $archiveDownloadUrl;
            $b['log_download_url'] = $logDownloadUrl;
        }
        return $backups;
    }

    protected function getFileBackups(): void
    {
        try {
            $backups = $this->fileBackupEngine->getBackupList();
            $formatted = $this->formatBackups($backups);
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

    protected function togglePinFileBackup(): void
    {
        try {
            $file = Tools::getValue('file');
            if (empty($file)) {
                throw new Exception('Missing backup file name.');
            }
            $baseName = preg_replace('/\.tar$/', '', $file);
            $dir = _PS_MODULE_DIR_ . 'mass_utility/backups/files/' . $baseName . '/';
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
            
            $this->sendJsonResponse([
                'success' => true,
                'pinned' => $pinned,
                'backups' => $this->formatBackups($this->fileBackupEngine->getBackupList())
            ]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }
}

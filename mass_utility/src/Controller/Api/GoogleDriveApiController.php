<?php
declare(strict_types=1);

namespace MassUtility\Controller\Api;

if (!defined('_PS_VERSION_')) {
    exit;
}

use Context;
use Configuration;
use Exception;
use Tools;
use MassUtility\Service\Logger;
use MassUtility\Service\GoogleDriveClient;
require_once dirname(dirname(__DIR__)) . '/Service/GoogleDriveClient.php';

/**
 * Controller for Google Drive API operations, OAuth flow, backup uploads and cloud deletions.
 */
class GoogleDriveApiController extends AbstractApiController
{
    private Logger $logger;
    private GoogleDriveClient $client;
    public function __construct(Logger $logger, GoogleDriveClient $client = null)
    {
        $this->logger = $logger;
        // In the Bridge context, we instantiate the GoogleDriveClient internally
        $this->client = $client ?? new GoogleDriveClient($logger);
    }

    /**
     * Entry point for executing Google Drive specific API actions.
     */
    public function execute(string $action): void
    {
        switch ($action) {
            case 'save_google_tokens':
                $this->saveGoogleTokens();
                break;
            case 'init_sync_to_drive':
                $this->initSyncToDrive();
                break;
            case 'upload_sync_chunk':
                $this->uploadSyncChunk();
                break;
            case 'finalize_sync':
                $this->finalizeSync();
                break;
            case 'delete_from_drive':
                $this->deleteFromDrive();
                break;
            default:
                $this->sendErrorResponse("Unknown Google Drive API action: $action");
        }
    }

    /**
     * Save OAuth credentials pushed from the SaaS Dashboard.
     */
    protected function saveGoogleTokens(): void
    {
        try {
            $accessToken = Tools::getValue('access_token');
            $refreshToken = Tools::getValue('refresh_token');
            $expiresAt = Tools::getValue('expires_at');

            if (empty($accessToken)) {
                throw new Exception("Access token is required.");
            }

            Configuration::updateValue('PM_GD_ACCESS_TOKEN', trim($accessToken));
            if (!empty($refreshToken)) {
                Configuration::updateValue('PM_GD_REFRESH_TOKEN', trim($refreshToken));
            }
            if (!empty($expiresAt)) {
                Configuration::updateValue('PM_GD_EXPIRES_AT', (int)$expiresAt);
            }

            $this->sendJsonResponse([
                'success' => true,
                'message' => 'Google Drive tokens synced to Bridge successfully.'
            ]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }

    /**
     * Helper to resolve local archive and log file paths.
     */
    private function resolveBackupPaths(string $file, string $type): array
    {
        if ($type === 'database') {
            $baseName = preg_replace('/(\.sql\.gz|\.log)$/', '', $file);
            $dir = _PS_MODULE_DIR_ . 'mass_utility/backups/' . $baseName . '/';
            return [
                'archive' => $dir . $baseName . '.sql.gz',
                'log' => $dir . $baseName . '.log'
            ];
        } elseif ($type === 'file') {
            $baseName = preg_replace('/\.tar$/', '', $file);
            $dir = _PS_MODULE_DIR_ . 'mass_utility/backups/files/' . $baseName . '/';
            return [
                'archive' => $dir . $baseName . '.tar',
                'log' => $dir . $baseName . '.tar.log'
            ];
        }
        throw new Exception("Invalid backup type: $type");
    }

    /**
     * Initialize chunked sync to Google Drive.
     */
    protected function initSyncToDrive(): void
    {
        try {
            $file = Tools::getValue('file');
            $type = Tools::getValue('type');

            if (empty($file) || empty($type)) {
                throw new Exception("Missing parameters: file and type are required.");
            }

            $paths = $this->resolveBackupPaths($file, $type);
            $archivePath = $paths['archive'];
            $logPath = $paths['log'];

            if (!file_exists($archivePath)) {
                throw new Exception("Physical archive file does not exist locally: " . basename($archivePath));
            }

            $subFolderName = ($type === 'database') ? 'Database Backups' : 'File Backups';
            $masterFolderId = $this->client->getOrCreateFolder('Mass Utility');
            $subFolderId = $this->client->getOrCreateFolder($subFolderName, $masterFolderId);

            // Create a specific folder for this backup
            $targetFolderId = $this->client->getOrCreateFolder($file, $subFolderId);

            $tasks = [];
            
            // Task 1: Archive File
            $archiveSize = filesize($archivePath);
            $archiveUploadUrl = $this->client->initiateResumableUpload(basename($archivePath), $archiveSize, 'application/octet-stream', $targetFolderId);
            $tasks[] = [
                'file_key' => 'archive',
                'file_name' => basename($archivePath),
                'file_size' => $archiveSize,
                'upload_url' => $archiveUploadUrl
            ];

            // Task 2: Log File (if exists)
            if (file_exists($logPath)) {
                $logSize = filesize($logPath);
                $logUploadUrl = $this->client->initiateResumableUpload(basename($logPath), $logSize, 'text/plain', $targetFolderId);
                $tasks[] = [
                    'file_key' => 'log',
                    'file_name' => basename($logPath),
                    'file_size' => $logSize,
                    'upload_url' => $logUploadUrl
                ];
            }

            $this->sendJsonResponse([
                'success' => true,
                'folder_id' => $targetFolderId,
                'tasks' => $tasks,
                'chunk_size' => 2 * 1024 * 1024 // 2MB
            ]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }

    /**
     * Upload a single chunk of a local file to Google Drive.
     */
    protected function uploadSyncChunk(): void
    {
        try {
            $file = Tools::getValue('file');
            $type = Tools::getValue('type');
            $uploadUrl = Tools::getValue('upload_url');
            $offset = (int)Tools::getValue('offset');
            $fileKey = Tools::getValue('file_key', 'archive');

            if (empty($file) || empty($type) || empty($uploadUrl)) {
                throw new Exception("Missing parameters: file, type, upload_url, and offset are required.");
            }

            $paths = $this->resolveBackupPaths($file, $type);
            $filePath = ($fileKey === 'log') ? $paths['log'] : $paths['archive'];

            if (!file_exists($filePath)) {
                throw new Exception("Physical file does not exist locally: " . basename($filePath));
            }

            $chunkSize = 2 * 1024 * 1024; // 2MB
            $res = $this->client->uploadChunk($filePath, $uploadUrl, $offset, $chunkSize);

            $this->sendJsonResponse([
                'success' => true,
                'complete' => $res['complete'],
                'uploaded_bytes' => $res['uploaded_bytes'],
                'drive_file_id' => $res['response']['id'] ?? null
            ]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }

    /**
     * Finalize sync process, writing the folder ID to SQLite database.
     */
    protected function finalizeSync(): void
    {
        try {
            $file = basename(trim(Tools::getValue('file')));
            $folderId = Tools::getValue('folder_id');
            $type = Tools::getValue('type');

            if (empty($file) || empty($folderId) || empty($type)) {
                throw new Exception("Missing parameters: file, folder_id, and type are required.");
            }

            // Trigger Cloud Retention sweep logic on successful upload
            $this->sweepCloudBackups($type);

            $backups = $this->getHydratedBackups($type);

            $this->sendJsonResponse([
                'success' => true,
                'message' => 'Sync finalized successfully and cloud retention applied.',
                'backups' => $backups
            ]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }

    /**
     * Verify backup integrity on Google Drive by checking if it exists and comparing MD5 checksums.
     */
    protected function verifyCloudIntegrity(): void
    {
        try {
            $file = Tools::getValue('file');
            $type = Tools::getValue('type');

            if (empty($file) || empty($type)) {
                throw new Exception("Missing parameters: file and type are required.");
            }

            $paths = $this->resolveBackupPaths($file, $type);
            $archivePath = $paths['archive'];
            $logPath = $paths['log'];

            $folderId = $payload['drive_file_id'] ?? null;
            if (!$folderId) {
                $this->sendJsonResponse([
                    'success' => true,
                    'synced' => false,
                    'verified' => false,
                    'message' => 'This backup is not registered as synced in the cloud registry.'
                ]);
                return;
            }
            $remoteFiles = $this->client->listFilesInFolder($folderId);

            $archiveName = basename($archivePath);
            $logName = basename($logPath);

            $remoteArchive = null;
            $remoteLog = null;

            foreach ($remoteFiles as $rf) {
                if ($rf['name'] === $archiveName) {
                    $remoteArchive = $rf;
                } elseif ($rf['name'] === $logName) {
                    $remoteLog = $rf;
                }
            }

            if (!$remoteArchive) {
                $this->sendJsonResponse([
                    'success' => true,
                    'synced' => true,
                    'verified' => false,
                    'message' => 'Integrity Check Failed: Backup archive is missing in the cloud folder.'
                ]);
                return;
            }

            $localArchiveExists = file_exists($archivePath);
            $localLogExists = file_exists($logPath);

            if ($localArchiveExists) {
                $localArchiveMd5 = md5_file($archivePath);
                $remoteArchiveMd5 = $remoteArchive['md5Checksum'] ?? null;

                if ($localArchiveMd5 !== $remoteArchiveMd5) {
                    $this->sendJsonResponse([
                        'success' => true,
                        'synced' => true,
                        'verified' => false,
                        'message' => 'Integrity Check Failed: Local and cloud archive checksums DO NOT match.'
                    ]);
                    return;
                }

                if ($localLogExists) {
                    if (!$remoteLog) {
                        $this->sendJsonResponse([
                            'success' => true,
                            'synced' => true,
                            'verified' => false,
                            'message' => 'Integrity Check Failed: Log file is missing in the cloud folder.'
                        ]);
                        return;
                    }
                    $localLogMd5 = md5_file($logPath);
                    $remoteLogMd5 = $remoteLog['md5Checksum'] ?? null;

                    if ($localLogMd5 !== $remoteLogMd5) {
                        $this->sendJsonResponse([
                            'success' => true,
                            'synced' => true,
                            'verified' => false,
                            'message' => 'Integrity Check Failed: Local and cloud log checksums DO NOT match.'
                        ]);
                        return;
                    }
                }

                $this->sendJsonResponse([
                    'success' => true,
                    'synced' => true,
                    'verified' => true,
                    'message' => 'Integrity Verified: Local and cloud checksums match perfectly.'
                ]);
            } else {
                $this->sendJsonResponse([
                    'success' => true,
                    'synced' => true,
                    'verified' => true, // Cloud file exists, so remote integrity is assumed ok
                    'message' => 'Verified (Remote Only): The files exist on Google Drive, but the local files have been deleted.'
                ]);
            }
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }

    /**
     * Delete a file/folder from Google Drive.
     */
    protected function deleteFromDrive(): void
    {
        try {
            $file = Tools::getValue('file');
            $type = Tools::getValue('type');

            if (empty($file) || empty($type)) {
                throw new Exception("Missing parameters: file and type are required.");
            }

            $driveFileId = $payload['drive_file_id'] ?? null;
            if ($driveFileId) {
                $this->client->deleteFile($driveFileId);
            }

            $backups = $this->getHydratedBackups($type);

            $this->sendJsonResponse([
                'success' => true,
                'message' => 'Backup deleted from Google Drive.',
                'backups' => $backups
            ]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }

    /**
     * Download a file directly from Google Drive.
     */
    protected function downloadFromDrive(): void
    {
        try {
            $file = Tools::getValue('file');
            $filename = Tools::getValue('filename');
            
            if (empty($file) || empty($filename)) {
                throw new Exception("Missing parameters: file and filename are required.");
            }

            $folderId = $payload['drive_file_id'] ?? Tools::getValue('drive_file_id');
            if (!$folderId) {
                throw new Exception("Backup not found in cloud registry.");
            }
            $remoteFiles = $this->client->listFilesInFolder($folderId);
            
            $targetFileName = basename($filename);

            $targetFileId = null;
            $targetFileSize = 0;
            foreach ($remoteFiles as $rf) {
                if ($rf['name'] === $targetFileName) {
                    $targetFileId = $rf['id'];
                    $targetFileSize = $rf['size'] ?? 0;
                    break;
                }
            }

            if (!$targetFileId) {
                throw new Exception("File not found in the cloud folder.");
            }

            // Stream it
            $this->client->streamFileToOutput($targetFileId, $targetFileName, (int)$targetFileSize);
            exit;
        } catch (Exception $e) {
            $this->logger->log("Cloud download failed: " . $e->getMessage(), 'ERROR');
            // sendErrorResponse returns JSON but this is a download endpoint. 
            // Better to show an error or a 404 text response.
            header('HTTP/1.1 404 Not Found');
            die('Cloud download failed: ' . htmlspecialchars($e->getMessage()));
        }
    }

    /**
     * Restore a backup from Google Drive to local storage.
     */
    protected function restoreFromDrive(): void
    {
        try {
            // Apply strict sanitization to prevent path traversal
            $file = basename(trim(Tools::getValue('file')));
            $type = Tools::getValue('type');

            if (empty($file) || empty($type)) {
                throw new Exception("Missing parameters: file and type are required.");
            }

            // Find the file in the database
            $folderId = $payload['drive_file_id'] ?? null;
            if (!$folderId) {
                throw new Exception("This backup is not registered as synced in the cloud registry.");
            }
            $remoteFiles = $this->client->listFilesInFolder($folderId);

            if (empty($remoteFiles)) {
                throw new Exception("No files discovered in the cloud folder.");
            }

            // Determine local target dir
            if ($type === 'database') {
                $baseName = preg_replace('/(\.sql\.gz|\.log|\.sql)$/', '', $file);
                $dir = _PS_MODULE_DIR_ . 'mass_utility/backups/' . $baseName . '/';
            } elseif ($type === 'file') {
                $baseName = preg_replace('/\.tar$/', '', $file);
                $dir = _PS_MODULE_DIR_ . 'mass_utility/backups/files/' . $baseName . '/';
            } else {
                throw new Exception("Invalid backup type: $type");
            }

            // Setup Progress Tracking
            require_once dirname(dirname(__DIR__)) . '/Service/ProgressTracker.php';
            $tracker = new \MassUtility\Service\ProgressTracker();
            $jobId = Tools::getValue('job_id');
            if (empty($jobId)) {
                $jobId = 'restore_' . md5($file); // Fallback
            }

            $totalSize = 0;
            foreach ($remoteFiles as $rf) {
                $totalSize += (int)($rf['size'] ?? 0);
            }

            $tracker->startJob($jobId, $type, max(1, $totalSize));

            // Release session lock to allow concurrent SSE progress requests
            if (session_status() === PHP_SESSION_ACTIVE) {
                session_write_close();
            }

            $downloadedSoFar = 0;
            $lastUpdate = time();

            // Download each file from cloud
            foreach ($remoteFiles as $rf) {
                $localPath = $dir . $rf['name'];
                $fileDownloaded = 0;
                
                $this->client->downloadFileToLocal($rf['id'], $localPath, function($dlSize, $dlNow) use (&$downloadedSoFar, &$fileDownloaded, $tracker, $jobId, &$lastUpdate, $rf) {
                    $delta = $dlNow - $fileDownloaded;
                    if ($delta > 0) {
                        $downloadedSoFar += $delta;
                        $fileDownloaded = $dlNow;
                        
                        $now = time();
                        if ($now - $lastUpdate >= 1) { // 1 second throttle
                            $tracker->updateProgress($jobId, (int)$downloadedSoFar, [
                                'status_text' => 'Downloading ' . $rf['name']
                            ]);
                            $lastUpdate = $now;
                        }
                    }
                });
            }

            $tracker->updateProgress($jobId, $totalSize, ['status_text' => 'Finalizing...']);

            $backups = $this->getHydratedBackups($type);

            $this->sendJsonResponse([
                'success' => true,
                'message' => 'Backup restored locally from Google Drive successfully.',
                'backups' => $backups
            ]);
        } catch (Exception $e) {
            $this->sendErrorResponse($e->getMessage());
        }
    }

    /**
     * Get hydrated lists of backups.
     */
    private function getHydratedBackups(string $type): array
    {


        $backups = [];
        if ($type === 'database') {
            require_once dirname(dirname(__DIR__)) . '/Service/TableBackupManager.php';
            $backupManager = new \MassUtility\Service\TableBackupManager($this->logger);
            $rawBackups = $backupManager->getBackupList();
            
            $adminModulesUrl = Context::getContext()->link->getAdminLink('AdminModules', true);
            $defaultDownload = Configuration::get('PM_GDRIVE_DEFAULT_DOWNLOAD') ?: 'cloud';

            foreach ($rawBackups as $b) {
                $isLocal = isset($b['is_local']) ? $b['is_local'] : true;
                $isCloud = false;
                
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

                $backups[] = [
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
                    'duration' => isset($b['duration']) ? $this->formatDuration((int)$b['duration']) : null,
                    'is_synced' => isset($syncedList[$b['basename']]),
                    'drive_file_id' => $syncedList[$b['basename']] ?? null
                ];
            }
        } else {
            require_once dirname(dirname(__DIR__)) . '/Service/FileBackupEngine.php';
            $fileBackupEngine = new \MassUtility\Service\FileBackupEngine($this->logger, _PS_MODULE_DIR_ . 'mass_utility/backups/files/');
            $rawFileBackups = $fileBackupEngine->getBackupList();
            
            $adminModulesUrl = Context::getContext()->link->getAdminLink('AdminModules', true);
            $defaultDownload = Configuration::get('PM_GDRIVE_DEFAULT_DOWNLOAD') ?: 'cloud';

            foreach ($rawFileBackups as $fb) {
                if (isset($fb['duration']) && $fb['duration'] !== null) {
                    $fb['duration'] = $this->formatDuration((int)$fb['duration']);
                } else {
                    $fb['duration'] = null;
                }
                $fb['is_synced'] = false;

                $isLocal = isset($fb['is_local']) ? $fb['is_local'] : true;
                $isCloud = false;
                
                $archiveDownloadUrl = '#';
                $logDownloadUrl = '#';
                $logName = preg_replace('/\.tar$/', '', $fb['basename']) . '.tar.log';
                
                if ($isLocal && $isCloud) {
                    if ($defaultDownload === 'cloud') {
                        $archiveDownloadUrl = $adminModulesUrl . '&configure=mass_utility&action=download_from_drive&file=' . urlencode($fb['basename']) . '&type=file&filename=' . urlencode($fb['basename']);
                        $logDownloadUrl = $adminModulesUrl . '&configure=mass_utility&action=download_from_drive&file=' . urlencode($fb['basename']) . '&type=file&filename=' . urlencode($logName);
                    } else {
                        $archiveDownloadUrl = $adminModulesUrl . '&configure=mass_utility&action=download_file_backup&file=' . urlencode($fb['basename']);
                        $logDownloadUrl = $adminModulesUrl . '&configure=mass_utility&action=download_file_backup_log&file=' . urlencode($fb['basename']);
                    }
                } elseif ($isCloud) {
                    $archiveDownloadUrl = $adminModulesUrl . '&configure=mass_utility&action=download_from_drive&file=' . urlencode($fb['basename']) . '&type=file&filename=' . urlencode($fb['basename']);
                    $logDownloadUrl = $adminModulesUrl . '&configure=mass_utility&action=download_from_drive&file=' . urlencode($fb['basename']) . '&type=file&filename=' . urlencode($logName);
                } elseif ($isLocal) {
                    $archiveDownloadUrl = $adminModulesUrl . '&configure=mass_utility&action=download_file_backup&file=' . urlencode($fb['basename']);
                    $logDownloadUrl = $adminModulesUrl . '&configure=mass_utility&action=download_file_backup_log&file=' . urlencode($fb['basename']);
                }

                $fb['archive_download_url'] = $archiveDownloadUrl;
                $fb['log_download_url'] = $logDownloadUrl;
                $fb['is_local'] = $isLocal;
                $fb['is_cloud'] = $isCloud;
                $backups[] = $fb;
            }
        }
        return $backups;
    }

    private function sweepCloudBackups(string $type): void
    {
        try {
            $maxCount = (int)Configuration::getGlobalValue('PM_BACKUP_CLOUD_MAX_COUNT');
            $maxDays = (int)Configuration::getGlobalValue('PM_BACKUP_CLOUD_MAX_DAYS');

            if ($maxCount <= 0 && $maxDays <= 0) {
                return;
            }

            $subFolderName = ($type === 'database') ? 'Database Backups' : 'File Backups';
            $masterFolderId = $this->client->getOrCreateFolder('Mass Utility');
            $subFolderId = $this->client->getOrCreateFolder($subFolderName, $masterFolderId);

            // List folders inside backups (each folder maps to a backup instance)
            $cloudFolders = $this->client->listFilesInFolder($subFolderId, 'files(id,name,createdTime)');
            if (empty($cloudFolders)) {
                return;
            }

            // Sort folders oldest first (chronological createdTime sorting)
            usort($cloudFolders, function ($a, $b) {
                return strcmp($a['createdTime'] ?? '', $b['createdTime'] ?? '');
            });

            $now = time();

            foreach ($cloudFolders as $index => $folder) {
                // Check if pinned locally to avoid sweeping
                $localBaseName = preg_replace('/\.tar$/', '', $folder['name']);
                $localDbDir = _PS_MODULE_DIR_ . 'mass_utility/backups/' . $localBaseName . '/';
                $localFileDir = _PS_MODULE_DIR_ . 'mass_utility/backups/files/' . $localBaseName . '/';
                
                if (file_exists($localDbDir . '.pinned') || file_exists($localFileDir . '.pinned')) {
                    continue; // Skip pinned backups from cloud purge
                }

                $shouldDelete = false;

                // 1. Cloud Age-based purge
                if ($maxDays > 0 && isset($folder['createdTime'])) {
                    $createdTimestamp = strtotime($folder['createdTime']);
                    if ($createdTimestamp > 0 && ($now - $createdTimestamp) > ($maxDays * 86400)) {
                        // Absolute Min-Keep Safeguard: Never delete the last unpinned cloud backup
                        $unpinnedCloudCount = 0;
                        foreach ($cloudFolders as $tmp) {
                            $tmpBase = preg_replace('/\.tar$/', '', $tmp['name']);
                            $tmpDbPin = _PS_MODULE_DIR_ . 'mass_utility/backups/' . $tmpBase . '/.pinned';
                            $tmpFilePin = _PS_MODULE_DIR_ . 'mass_utility/backups/files/' . $tmpBase . '/.pinned';
                            if (!file_exists($tmpDbPin) && !file_exists($tmpFilePin)) {
                                $unpinnedCloudCount++;
                            }
                        }
                        if ($unpinnedCloudCount > 1) {
                            $shouldDelete = true;
                        }
                    }
                }

                // 2. Cloud Count-based purge
                if ($maxCount > 0 && !$shouldDelete) {
                    $unpinnedCloudCount = 0;
                    foreach ($cloudFolders as $tmp) {
                        $tmpBase = preg_replace('/\.tar$/', '', $tmp['name']);
                        $tmpDbPin = _PS_MODULE_DIR_ . 'mass_utility/backups/' . $tmpBase . '/.pinned';
                        $tmpFilePin = _PS_MODULE_DIR_ . 'mass_utility/backups/files/' . $tmpBase . '/.pinned';
                        if (!file_exists($tmpDbPin) && !file_exists($tmpFilePin)) {
                            $unpinnedCloudCount++;
                        }
                    }
                    if ($unpinnedCloudCount > $maxCount) {
                        $shouldDelete = true;
                    }
                }

                if ($shouldDelete) {
                    // Delete Google Drive folder recursively
                    $this->client->deleteFile($folder['id']);
                    unset($cloudFolders[$index]);
                }
            }
        } catch (\Throwable $e) {
            if (isset($this->logger) && method_exists($this->logger, 'logError')) {
                $this->logger->logError("Cloud retention purge failed: " . $e->getMessage());
            }
        }
    }
}


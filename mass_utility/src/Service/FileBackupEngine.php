<?php
declare(strict_types=1);

namespace MassUtility\Service;

use Exception;

/**
 * Iterative, chunk-based TAR engine to bypass CloudLinux LVE timeout clamps.
 */
class FileBackupEngine
{
    private BridgeLogger $logger;
    private string $backupDir;
    private SettingsManager $settingsManager;
    private ResourceMonitor $resourceMonitor;

    public function __construct(BridgeLogger $logger, string $backupDir, SettingsManager $settingsManager = null, ?ResourceMonitor $resourceMonitor = null)
    {
        $this->logger = $logger;
        $this->backupDir = rtrim($backupDir, '/\\') . '/';
        $this->settingsManager = $settingsManager ?? new SettingsManager();
        $this->resourceMonitor = $resourceMonitor ?? new ResourceMonitor();
        
        if (!is_dir($this->backupDir)) {
            if (!mkdir($this->backupDir, 0755, true) && !is_dir($this->backupDir)) {
                throw new Exception("Could not create backup directory: " . $this->backupDir);
            }
        }
    }

    /**
     * Initializes the backup state by scanning all files in the target directory.
     * @param string $sourceDir The directory to backup (e.g. _PS_ROOT_DIR_)
     * @param string $jobId Unique identifier for the backup job
     */
    public function initializeJob(string $sourceDir, string $jobId, string $profile = 'full'): array
    {
        $individualBackupDir = $this->backupDir . $jobId . '/';
        if (!is_dir($individualBackupDir)) {
            if (!mkdir($individualBackupDir, 0755, true) && !is_dir($individualBackupDir)) {
                throw new Exception("Could not create backup directory: " . $individualBackupDir);
            }
        }

        $stateFile = $individualBackupDir . $jobId . '_state.json';
        $tarFile = $individualBackupDir . $jobId . '.tar';

        // Clean up previous runs if any
        if (file_exists($stateFile)) { unlink($stateFile); }
        if (file_exists($tarFile)) { unlink($tarFile); }

        $files = $this->scanDirectory($sourceDir, $profile);
        
        $state = [
            'job_id' => $jobId,
            'profile' => $profile,
            'source_dir' => rtrim($sourceDir, '/\\') . '/',
            'tar_file' => $tarFile,
            'total_files' => count($files),
            'processed_files' => 0,
            'files' => $files,
            'status' => 'pending',
            'start_time' => time()
        ];

        file_put_contents($stateFile, json_encode($state, JSON_PRETTY_PRINT), LOCK_EX);
        $this->logger->log("Initialized File Backup Job: {$jobId}. Discovered " . count($files) . " files.", 'INFO');

        return [
            'total_files' => $state['total_files'],
            'processed' => 0,
            'status' => 'initialized'
        ];
    }

    /**
     * Processes a chunk of files, adding them to the ZIP archive.
     * Uses a hybrid limit: Max files per chunk, OR Max cumulative raw bytes per chunk,
     * to ensure the progress bar ticks smoothly while maximizing I/O bandwidth.
     */
    public function processChunk(string $jobId, int $maxFilesPerChunk = 4000, int $maxBytesPerChunk = 62914560): array
    {
        $stateFile = $this->backupDir . $jobId . '/' . $jobId . '_state.json';
        if (!file_exists($stateFile)) {
            throw new Exception("Backup state file not found for Job: {$jobId}");
        }

        $state = json_decode(file_get_contents($stateFile), true);
        if ($state['status'] === 'completed') {
            return ['status' => 'completed', 'progress' => 100];
        }

        $tarPath = $state['tar_file'];
        
        // Open tar (APPEND mode)
        $fp = fopen($tarPath, 'ab');
        if ($fp === false) {
            throw new Exception("Cannot open <$tarPath> for appending");
        }

        $processedThisChunk = 0;
        $bytesThisChunk = 0;
        $startIndex = $state['processed_files'];
        $totalFiles = $state['total_files'];
        $sourceDir = $state['source_dir'];

        $governorMode = strtolower((string)$this->settingsManager->getSetting(SettingsManager::PM_GOVERNOR_MODE));

        if ($governorMode === 'auto') {
            $dummyChunk = 0;
            $sleepDelay = 0;
            $systemState = $this->resourceMonitor->evaluateSystemLoad(0, $dummyChunk, $sleepDelay);
            
            $isCli = (php_sapi_name() === 'cli' || empty($_SERVER['REQUEST_METHOD']));
            
            if ($systemState === 'CRITICAL') {
                if ($isCli) {
                    $maxFilesPerChunk = 1000;
                    $maxBytesPerChunk = 20971520; // 20MB
                    usleep(200000); // 0.2s safety pause
                } else {
                    $maxFilesPerChunk = 500;
                    $maxBytesPerChunk = 5242880; // 5MB
                    usleep($sleepDelay); // Up to 1s safety pause
                }
            } elseif ($systemState === 'HIGH') {
                if ($isCli) {
                    $maxFilesPerChunk = 2500;
                    $maxBytesPerChunk = 41943040; // 40MB
                    usleep(100000); // 0.1s safety pause
                } else {
                    $maxFilesPerChunk = 1500;
                    $maxBytesPerChunk = 15728640; // 15MB
                    usleep($sleepDelay);
                }
            } elseif ($systemState === 'MEDIUM') {
                $maxFilesPerChunk = 4000;
                $maxBytesPerChunk = 31457280; // 30MB
            } else {
                // LOW load state - scale up to maximum throughput
                $maxFilesPerChunk = 10000;
                $maxBytesPerChunk = 104857600; // 100MB
            }
        } else {
            // Manual overrides
            $manualMb = (int)$this->settingsManager->getSetting(SettingsManager::PM_FILE_CHUNK_MB);
            if ($manualMb > 0) {
                $maxBytesPerChunk = $manualMb * 1048576; // Convert MB to bytes
            }
        }

        // Hybrid Loop: Run until we hit the file cap or the byte cap
        while ($processedThisChunk < $maxFilesPerChunk && $bytesThisChunk < $maxBytesPerChunk && $startIndex < $totalFiles) {
            $filePath = $state['files'][$startIndex];
            $fullPath = $sourceDir . $filePath;

            if (is_file($fullPath) && is_readable($fullPath)) {
                $fileSize = filesize($fullPath);
                $bytesThisChunk += $fileSize;
                
                // Write TAR Header
                $this->writeTarHeader($fp, $filePath, $fileSize, filemtime($fullPath) ?: time());
                
                // Write File Content using native C-level buffer
                $inFp = fopen($fullPath, 'rb');
                if ($inFp) {
                    stream_copy_to_stream($inFp, $fp);
                    fclose($inFp);
                }
                
                // Pad to 512-byte boundary
                $padding = 512 - ($fileSize % 512);
                if ($padding < 512) {
                    fwrite($fp, str_repeat("\0", $padding));
                }
            }

            $startIndex++;
            $processedThisChunk++;
        }

        // Update state
        $state['processed_files'] = $startIndex;
        if ($startIndex >= $totalFiles) {
            $state['status'] = 'completed';
            if (isset($state['start_time'])) {
                $state['duration'] = time() - $state['start_time'];
                file_put_contents($tarPath . '.metadata.json', json_encode(['duration' => $state['duration']]), LOCK_EX);
            }
            
            // Write End of TAR archive (two 512-byte blocks of nulls)
            fwrite($fp, str_repeat("\0", 1024));
            fclose($fp);
            $fp = null;
            
            // [TX-152] Generate .sha256 sidecar file when backup completes
            if (file_exists($tarPath)) {
                $hash = hash_file('sha256', $tarPath);
                file_put_contents($tarPath . '.sha256', $hash, LOCK_EX);
            }
            
            // [TX-306] Generate .log sidecar file when backup completes
            if (isset($state['files']) && is_array($state['files'])) {
                $logContent = "File Backup Log for Job: " . $jobId . "\n";
                $logContent .= "Profile: " . $state['profile'] . "\n";
                $logContent .= "Total Files: " . $state['total_files'] . "\n";
                $logContent .= "Duration: " . $state['duration'] . " seconds\n";
                $logContent .= "--------------------------------------------------\n";
                $logContent .= implode("\n", $state['files']);
                file_put_contents($tarPath . '.log', $logContent, LOCK_EX);
            }
        } else {
            $state['status'] = 'processing';
        }

        if ($fp) {
            fclose($fp);
        }

        file_put_contents($stateFile, json_encode($state, JSON_PRETTY_PRINT), LOCK_EX);

        return [
            'status' => $state['status'],
            'progress' => round(($startIndex / $totalFiles) * 100),
            'processed' => $startIndex,
            'total' => $totalFiles,
            'processed_this_chunk' => $processedThisChunk,
            'duration' => $state['duration'] ?? null
        ];
    }

    /**
     * Writes a POSIX TAR header to the file pointer.
     */
    private function writeTarHeader($fp, string $filePath, int $fileSize, int $mtime): void
    {
        $filePath = str_replace('\\', '/', ltrim($filePath, '/\\')); // Ensure forward slashes
        $name = substr($filePath, 0, 100);
        $prefix = "";
        
        if (strlen($filePath) > 100) {
            // Basic prefix handling for paths up to 255 chars
            $slashPos = strpos($filePath, '/', strlen($filePath) - 100);
            if ($slashPos !== false && $slashPos <= 155) {
                $prefix = substr($filePath, 0, $slashPos);
                $name = substr($filePath, $slashPos + 1);
            } else {
                $prefix = substr($filePath, 0, 155);
                $name = substr($filePath, 155, 100);
            }
        }

        $mode = sprintf("%07o", 0644);
        $uid = sprintf("%07o", 0);
        $gid = sprintf("%07o", 0);
        $size = sprintf("%011o", $fileSize);
        $mtimeStr = sprintf("%011o", $mtime);
        $chksum = "        ";
        $typeflag = "0"; // Regular file
        $linkname = str_repeat("\0", 100);
        $magic = "ustar  \0";
        $uname = "root";
        $gname = "root";
        $devmajor = "";
        $devminor = "";

        $header = pack("a100a8a8a8a12a12a8a1a100a8a32a32a8a8a155",
            $name, $mode, $uid, $gid, $size, $mtimeStr, $chksum, $typeflag,
            $linkname, $magic, $uname, $gname, $devmajor, $devminor, $prefix
        );

        $header = str_pad($header, 512, "\0");

        $checksum = 0;
        for ($i = 0; $i < 512; $i++) {
            $checksum += ord($header[$i]);
        }
        $chksum = sprintf("%06o\0 ", $checksum);

        $header = substr_replace($header, $chksum, 148, 8);
        fwrite($fp, $header);
    }

    /**
     * Recursively scan a directory and return a flat list of relative file paths.
     */
    private function scanDirectory(string $dir, string $profile = 'full'): array
    {
        $dir = rtrim($dir, '/\\') . '/';
        if (!is_dir($dir)) {
            throw new Exception("Source directory does not exist: {$dir}");
        }

        // Determine which subdirectories to scan or scan the whole root.
        $subdirsToScan = [];
        $profileExclusions = [];

        switch ($profile) {
            case 'themes_modules':
                $subdirsToScan = ['themes', 'modules'];
                break;
            case 'media':
                $subdirsToScan = ['img', 'upload', 'download'];
                break;
            case 'core':
                $profileExclusions = ['img/', 'themes/', 'modules/', 'upload/', 'download/'];
                break;
            case 'core_media':
                $profileExclusions = ['themes/', 'modules/'];
                break;
            case 'full':
            default:
                break;
        }

        $files = [];

        // Apply Exclusions from Settings
        $exclusionsRaw = $this->settingsManager->getSetting(SettingsManager::PM_FILE_EXCLUSIONS) ?? '';
        $exclusions = array_filter(array_map('trim', explode("\n", $exclusionsRaw)));

        $backupsDir = strtolower(str_replace('\\', '/', realpath(dirname($this->backupDir)) ?: dirname($this->backupDir))) . '/';

        if (!empty($subdirsToScan)) {
            foreach ($subdirsToScan as $subdir) {
                $targetDir = $dir . $subdir . '/';
                if (!is_dir($targetDir)) {
                    continue;
                }
                $iterator = new \RecursiveIteratorIterator(
                    new \RecursiveDirectoryIterator($targetDir, \RecursiveDirectoryIterator::SKIP_DOTS),
                    \RecursiveIteratorIterator::LEAVES_ONLY
                );
                foreach ($iterator as $file) {
                    $absPath = strtolower(str_replace('\\', '/', $file->getPathname()));
                    if (strpos($absPath, $backupsDir) === 0) {
                        continue;
                    }

                    // For subdirs, the relative path must still be relative to the root $dir!
                    $relPath = str_replace($dir, '', $file->getPathname());
                    $relPath = str_replace('\\', '/', $relPath);

                    $skip = false;
                    // Check global exclusions
                    foreach ($exclusions as $exclusion) {
                        if ($exclusion !== '' && strpos('/' . ltrim($relPath, '/'), $exclusion) === 0) {
                            $skip = true;
                            break;
                        }
                    }
                    if ($skip) {
                        continue;
                    }

                    $files[] = $relPath;
                }
            }
        } else {
            // Scan root directory
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($dir, \RecursiveDirectoryIterator::SKIP_DOTS),
                \RecursiveIteratorIterator::LEAVES_ONLY
            );
            foreach ($iterator as $file) {
                $absPath = strtolower(str_replace('\\', '/', $file->getPathname()));
                if (strpos($absPath, $backupsDir) === 0) {
                    continue;
                }

                $relPath = str_replace($dir, '', $file->getPathname());
                $relPath = str_replace('\\', '/', $relPath);

                $skip = false;
                // Check profile-specific exclusions
                foreach ($profileExclusions as $pe) {
                    if (strpos($relPath, $pe) === 0) {
                        $skip = true;
                        break;
                    }
                }
                if ($skip) {
                    continue;
                }

                // Check global exclusions
                foreach ($exclusions as $exclusion) {
                    if ($exclusion !== '' && strpos('/' . ltrim($relPath, '/'), $exclusion) === 0) {
                        $skip = true;
                        break;
                    }
                }
                if ($skip) {
                    continue;
                }

                $files[] = $relPath;
            }
        }

        return $files;
    }

    /**
     * Retrieves a list of all finished archives.
     */
    public function getBackupList(): array
    {
        $list = [];
        $localMap = [];

        if (!is_dir($this->backupDir)) return $list;

        $dirs = glob($this->backupDir . 'site_backup_*', GLOB_ONLYDIR);
        if (is_array($dirs)) {
            foreach ($dirs as $dir) {
                $baseName = basename($dir);
                $tarFile = $dir . '/' . $baseName . '.tar';
                
                if (file_exists($tarFile)) {
                    @clearstatcache(true, $tarFile);
                    
                    $hash = null;
                    if (file_exists($tarFile . '.sha256')) {
                        $hash = trim(file_get_contents($tarFile . '.sha256'));
                    }
                    
                    $duration = null;
                    if (file_exists($tarFile . '.metadata.json')) {
                        $metadata = json_decode(file_get_contents($tarFile . '.metadata.json'), true);
                        if (is_array($metadata) && isset($metadata['duration'])) {
                            $duration = (int)$metadata['duration'];
                        }
                    }
                    
                    $hasLog = file_exists($tarFile . '.log');
                    
                    $list[] = [
                        'basename' => $baseName . '.tar',
                        'size' => round(filesize($tarFile) / 1048576, 2) . ' MB',
                        'timestamp' => filemtime($tarFile),
                        'hash' => $hash,
                        'duration' => $duration,
                        'has_log' => $hasLog,
                        'is_local' => true,
                        'is_cloud' => false,
                        'is_pinned' => file_exists($dir . '/.pinned')
                    ];
                    $localMap[$baseName . '.tar'] = true;
                }
            }
        }
        
        // Sort newest first
        usort($list, function($a, $b) {
            return $b['timestamp'] <=> $a['timestamp'];
        });

        return $list;
    }

    /**
     * Clears all zip files and state json files from the directory.
     */
    public function clearAllBackups(): void
    {
        if (!is_dir($this->backupDir)) return;
        $this->deleteDirectoryContents($this->backupDir);
    }

    /**
     * Recursively delete directory contents without deleting the root dir itself.
     */
    private function deleteDirectoryContents(string $dir): void
    {
        $files = scandir($dir);
        if (!is_array($files)) return;

        foreach ($files as $file) {
            if ($file === '.' || $file === '..') {
                continue;
            }
            $path = rtrim($dir, '/\\') . '/' . $file;
            if (is_dir($path)) {
                $this->deleteDirectoryContents($path);
                @rmdir($path);
            } else {
                @unlink($path);
            }
        }
    }

    public function deleteBackupFolder(string $baseName): bool
    {
        $baseName = basename($baseName);
        $folderPath = $this->backupDir . $baseName;
        if (is_dir($folderPath)) {
            $files = glob($folderPath . '/*');
            if (is_array($files)) {
                foreach ($files as $f) {
                    if (file_exists($f)) {
                        @unlink($f);
                    }
                }
            }
            return @rmdir($folderPath);
        }
        return false;
    }

    /**
     * Purges old file backups chronologically based on settings.
     */
    public function purgeOldBackups(): void
    {
        try {
            $maxCount = (int)$this->settingsManager->getSetting(SettingsManager::PM_BACKUP_MAX_COUNT);
            $maxDays = (int)$this->settingsManager->getSetting(SettingsManager::PM_BACKUP_MAX_DAYS);

            if ($maxCount <= 0 && $maxDays <= 0) {
                return;
            }

            $backups = $this->getBackupList();
            if (empty($backups)) {
                return;
            }

            // Sort oldest first
            usort($backups, function ($a, $b) {
                return $a['timestamp'] <=> $b['timestamp'];
            });

            $now = time();

            foreach ($backups as $index => $b) {
                $basename = preg_replace('/\.tar$/', '', $b['basename']);
                $folderPath = $this->backupDir . $basename . '/';
                
                if (file_exists($folderPath . '.pinned')) {
                    continue; // Skip pinned backups from retention sweep
                }

                $shouldDelete = false;

                // 1. Age-based
                if ($maxDays > 0) {
                    $ageSeconds = $now - $b['timestamp'];
                    $maxSeconds = $maxDays * 86400;
                    if ($ageSeconds > $maxSeconds) {
                        // Absolute Min-Keep Safeguard: Never delete the last unpinned backup
                        $unpinnedCount = 0;
                        foreach ($backups as $tmp) {
                            $tmpBase = preg_replace('/\.tar$/', '', $tmp['basename']);
                            $tmpPath = $this->backupDir . $tmpBase . '/';
                            if (is_dir($tmpPath) && !file_exists($tmpPath . '.pinned')) {
                                $unpinnedCount++;
                            }
                        }
                        if ($unpinnedCount > 1) {
                            $shouldDelete = true;
                        }
                    }
                }

                // 2. Count-based
                if ($maxCount > 0 && !$shouldDelete) {
                    $unpinnedCount = 0;
                    foreach ($backups as $tmp) {
                        $tmpBase = preg_replace('/\.tar$/', '', $tmp['basename']);
                        $tmpPath = $this->backupDir . $tmpBase . '/';
                        if (is_dir($tmpPath) && !file_exists($tmpPath . '.pinned')) {
                            $unpinnedCount++;
                        }
                    }
                    if ($unpinnedCount > $maxCount) {
                        $shouldDelete = true;
                    }
                }

                if ($shouldDelete) {
                    $this->deleteBackupFolder($basename);
                    $this->logger->log("Retention Policy: Automatically deleted local file backup '{$basename}' to satisfy retention limits.", 'INFO');
                    unset($backups[$index]);
                }
            }
        } catch (\Throwable $e) {
            $this->logger->log("File backup retention purge failed: " . $e->getMessage(), 'ERROR');
        }
    }
}

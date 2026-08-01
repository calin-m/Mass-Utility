<?php
// @Arch[BridgeProgressTracker]

declare(strict_types=1);

namespace MassUtility\Service;

if (!defined('_PS_VERSION_')) {
    exit;
}

/**
 * BridgeProgressTracker handles job execution state and percent tracking for asynchronous background processes on the Bridge side.
 */
class BridgeProgressTracker
{
    private string $backupDir;

    public function __construct()
    {
        $this->backupDir = _PS_MODULE_DIR_ . 'mass_utility/backups/';
        if (!is_dir($this->backupDir)) {
            @mkdir($this->backupDir, 0755, true);
        }
    }

    /**
     * Get target JSON state path for a jobId.
     */
    private function getFilePath(string $jobId): string
    {
        $safeJobId = preg_replace('/[^a-zA-Z0-9_-]/', '', $jobId);
        return $this->backupDir . 'job_' . $safeJobId . '.json';
    }

    /**
     * Start tracking a new background job.
     */
    public function startJob(string $jobId, string $type, int $totalItems): bool
    {
        $data = [
            'job_id' => $jobId,
            'type' => $type,
            'status' => 'running',
            'progress' => 0.0,
            'processed_items' => 0,
            'total_items' => $totalItems,
            'started_at' => time(),
            'updated_at' => time(),
            'error' => null,
        ];
        return $this->writeState($jobId, $data);
    }

    /**
     * Update progress metrics for a running job.
     */
    public function updateProgress(string $jobId, int $processedItems, ?array $additionalData = null): bool
    {
        return $this->atomicUpdateState($jobId, function ($data) use ($jobId, $processedItems, $additionalData) {
            if (!is_array($data)) {
                $data = [
                    'job_id' => $jobId,
                    'type' => 'file',
                    'total_items' => 1,
                    'processed_items' => 0,
                    'progress' => 0,
                    'status' => 'running'
                ];
            }
            $total = max(1, (int)($data['total_items'] ?? 1));
            $progress = min(100.0, round(($processedItems / $total) * 100.0, 2));

            $data['processed_items'] = $processedItems;
            $data['progress'] = $progress;
            $data['updated_at'] = time();

            $totalItems = (int)($data['total_items'] ?? 0);
            if ($totalItems > 0 && $processedItems >= $totalItems) {
                $data['status'] = 'completed';
            }

            if ($additionalData !== null) {
                $data = array_merge($data, $additionalData);
            }

            return $data;
        });
    }

    /**
     * Mark a job as failed with an error message.
     */
    public function failJob(string $jobId, string $errorMessage): bool
    {
        return $this->atomicUpdateState($jobId, function ($data) use ($jobId, $errorMessage) {
            if (!$data) {
                $data = [
                    'job_id' => $jobId,
                    'type' => 'unknown',
                    'total_items' => 0,
                    'processed_items' => 0,
                    'progress' => 0.0,
                    'started_at' => time(),
                ];
            }

            $data['status'] = 'failed';
            $data['error'] = $errorMessage;
            $data['updated_at'] = time();

            return $data;
        });
    }

    /**
     * Retrieve current tracking state for a job.
     */
    public function getJobState(string $jobId): ?array
    {
        $filePath = $this->getFilePath($jobId);
        if (!file_exists($filePath)) {
            return null;
        }

        $content = @file_get_contents($filePath);
        if (!$content) {
            return null;
        }

        return json_decode($content, true);
    }

    /**
     * Safely write tracking state to disk. Used for creating initial states.
     */
    private function writeState(string $jobId, array $data): bool
    {
        $filePath = $this->getFilePath($jobId);
        $json = json_encode($data, JSON_PRETTY_PRINT);
        return @file_put_contents($filePath, $json, LOCK_EX) !== false;
    }

    /**
     * Atomically read, modify, and write the state to prevent TOCTOU concurrency bugs.
     */
    private function atomicUpdateState(string $jobId, callable $modifier): bool
    {
        $filePath = $this->getFilePath($jobId);
        
        if (!file_exists($filePath)) {
            // If it doesn't exist, try to create it first so we can lock it
            @touch($filePath);
        }

        $fp = @fopen($filePath, 'c+');
        if (!$fp) {
            return false;
        }

        if (flock($fp, LOCK_EX)) {
            $content = stream_get_contents($fp);
            $data = $content ? json_decode($content, true) : null;
            
            if (!$data && filesize($filePath) > 0) {
                // Parse error or invalid JSON, return false
                flock($fp, LOCK_UN);
                fclose($fp);
                return false;
            }

            $modifiedData = $modifier($data);
            
            if ($modifiedData === false) {
                 // Modifier indicated failure or no-op
                 flock($fp, LOCK_UN);
                 fclose($fp);
                 return false;
            }

            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, json_encode($modifiedData, JSON_PRETTY_PRINT));
            fflush($fp);
            
            flock($fp, LOCK_UN);
            fclose($fp);
            return true;
        }
        
        fclose($fp);
        return false;
    }

    /**
     * Mark a job as cancelled.
     */
    public function cancelJob(string $jobId): bool
    {
        return $this->atomicUpdateState($jobId, function ($data) {
            if (!$data) {
                return false;
            }
            $data['status'] = 'cancelled';
            $data['updated_at'] = time();
            return $data;
        });
    }

    /**
     * Check if a job has been cancelled.
     */
    public function isCancelled(string $jobId): bool
    {
        $data = $this->getJobState($jobId);
        return $data !== null && ($data['status'] ?? '') === 'cancelled';
    }

    /**
     * Purge a tracking state file from disk.
     */
    public function cleanJob(string $jobId): bool
    {
        $filePath = $this->getFilePath($jobId);
        if (file_exists($filePath)) {
            return @unlink($filePath);
        }
        return false;
    }
}

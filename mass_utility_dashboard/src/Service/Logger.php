<?php
declare(strict_types=1);

namespace MassUtility\SaaS\Service;

/**
 * Centralized flat-file logging service.
 */
class Logger
{
    private string $logPath;

    public function __construct()
    {
        // Place logs folder inside the standalone SaaS dashboard directory
        $this->logPath = dirname(dirname(__DIR__)) . '/logs/saas.log';
        $logDir = dirname($this->logPath);
        if (!is_dir($logDir)) {
            try {
                $success = mkdir($logDir, 0755, true);
                if (!$success && !is_dir($logDir)) {
                    error_log('MassUtility: Failed to create logs directory at ' . $logDir);
                }
            } catch (\Throwable $e) {
                if (!is_dir($logDir)) {
                    error_log('MassUtility: Exception creating logs directory - ' . $e->getMessage());
                }
            }
        }
    }

    /**
     * Log a message with a specific severity level
     */
    public function log(string $message, string $level = 'INFO'): void
    {
        $timestamp = date('Y-m-d H:i:s');
        $formatted = sprintf("[%s] [%s] %s\n", $timestamp, strtoupper($level), $message);
        
        try {
            $result = file_put_contents($this->logPath, $formatted, FILE_APPEND | LOCK_EX);
            if ($result === false) {
                error_log('MassUtility: Failed to write to log file: ' . $this->logPath);
            }
        } catch (\Throwable $e) {
            error_log('MassUtility: Exception writing to log file - ' . $e->getMessage());
        }
    }

    /**
     * Log an error message
     */
    public function logError(string $message): void
    {
        $this->log($message, 'ERROR');
    }

    /**
     * Retrieve the most recent log events, properly chunked and reversed.
     * Prevents browser UI crashing on massive logs by paging the last N events.
     */
    public function getRecentLogsReversed(int $maxEvents = 150): string
    {
        if (!file_exists($this->logPath) || !is_readable($this->logPath) || filesize($this->logPath) === 0) {
            return '';
        }

        try {
            $fp = fopen($this->logPath, 'r');
        } catch (\Throwable $e) {
            return '';
        }
        
        if (!$fp) {
            return '';
        }

        $chunkSize = 8192;
        $fileSize = filesize($this->logPath);
        $pos = $fileSize;
        $buffer = '';
        $events = [];

        while ($pos > 0) {
            $readSize = min($chunkSize, $pos);
            $pos -= $readSize;
            fseek($fp, $pos);
            $chunk = fread($fp, $readSize);
            
            $buffer = $chunk . $buffer;
            
            if (preg_match_all('/(?=^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\])/m', $buffer, $matches, PREG_OFFSET_CAPTURE)) {
                $offsets = [];
                foreach ($matches[0] as $match) {
                    $offsets[] = $match[1];
                }
                
                $startIndex = ($pos > 0) ? 1 : 0;
                
                if (count($offsets) - $startIndex > 0) {
                    for ($i = count($offsets) - 1; $i >= $startIndex; $i--) {
                        $startOffset = $offsets[$i];
                        $eventStr = substr($buffer, $startOffset);
                        $events[] = $eventStr;
                        $buffer = substr($buffer, 0, $startOffset);
                        
                        if (count($events) >= $maxEvents) {
                            break 2;
                        }
                    }
                }
            }
        }
        
        if (is_resource($fp)) {
            fclose($fp);
        }
        
        if ($pos === 0 && trim($buffer) !== '' && count($events) < $maxEvents) {
            $events[] = $buffer;
        }

        return implode("", $events);
    }
}

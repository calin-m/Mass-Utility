<?php
declare(strict_types=1);

namespace MassUtility\Service;

use Db;
use Exception;

/**
 * A lightweight diagnostics engine to poll server health and cgroup constraints.
 */
class ResourceMonitor
{
    private int $cores = 1;
    private int $physicalCores = 1;
    private int $dbMaxConnections = 151;
    private float $memoryFloor = 134217728.0; // Default 128MB
    private float $safetyPercentage = 0.50;
    private string $storageTier = 'SATA_SSD';
    private int $fpmMaxChildren = 20;

    // Telemetry Decimation & Gating Variables
    private int $loopModulo = 10;
    private array $metricCache = [];
    private bool $isCacheStale = true;

    private static ?array $cachedParameters = null;

    public function __construct()
    {
        if (self::$cachedParameters !== null) {
            $this->cores = self::$cachedParameters['cores'];
            $this->physicalCores = self::$cachedParameters['physicalCores'];
            $this->dbMaxConnections = self::$cachedParameters['dbMaxConnections'];
            $this->memoryFloor = self::$cachedParameters['memoryFloor'];
            $this->storageTier = self::$cachedParameters['storageTier'];
            $this->fpmMaxChildren = self::$cachedParameters['fpmMaxChildren'];
        } else {
            $this->detectCoreParameters();
            self::$cachedParameters = [
                'cores' => $this->cores,
                'physicalCores' => $this->physicalCores,
                'dbMaxConnections' => $this->dbMaxConnections,
                'memoryFloor' => $this->memoryFloor,
                'storageTier' => $this->storageTier,
                'fpmMaxChildren' => $this->fpmMaxChildren
            ];
        }
    }

    /**
     * Phase -1: Profiling the host environment and calculating ceilings
     */
    public function detectCoreParameters(): void
    {
        // 1. Detect physical server cores
        $physCores = 1;
        if (is_readable('/proc/cpuinfo')) {
            $cpuinfo = file_get_contents('/proc/cpuinfo');
            preg_match_all('/^processor/m', $cpuinfo, $matches);
            if (!empty($matches[0])) {
                $physCores = count($matches[0]);
            }
        } elseif (function_exists('shell_exec')) {
            $nproc = trim((string)shell_exec('nproc')); // nosec
            if (is_numeric($nproc)) {
                $physCores = (int)$nproc;
            }
        }
        
        if ($physCores === 1 && is_readable('/sys/devices/system/cpu/online')) {
            $online = trim((string)@file_get_contents('/sys/devices/system/cpu/online'));
            if (preg_match('/^([0-9]+)-([0-9]+)$/', $online, $m)) {
                $physCores = ((int)$m[2] - (int)$m[1]) + 1;
            }
        }
        
        if ($physCores === 1) {
            $procEnv = getenv('NUMBER_OF_PROCESSORS');
            if ($procEnv !== false && is_numeric($procEnv)) {
                $physCores = (int)$procEnv;
            }
        }
        
        $this->physicalCores = max(1, $physCores);

        // 2. Query CloudLinux LVE Cgroup quotas first for dynamic virtual cores limit
        $detectedCores = 0;
        try {
            if (is_readable('/sys/fs/cgroup/cpu/cpu.cfs_quota_us') && is_readable('/sys/fs/cgroup/cpu/cpu.cfs_period_us')) {
                $quota = (float)trim((string)@file_get_contents('/sys/fs/cgroup/cpu/cpu.cfs_quota_us'));
                $period = (float)trim((string)@file_get_contents('/sys/fs/cgroup/cpu/cpu.cfs_period_us'));
                if ($quota > 0 && $period > 0) {
                    $detectedCores = (int)ceil($quota / $period);
                }
            }
        } catch (\Throwable $e) {
            $detectedCores = 0;
        }

        if ($detectedCores > 0 && $detectedCores < 32) {
            $this->cores = $detectedCores;
        } else {
            // Fallback: Clamp to your CloudLinux LVE business pack allocation (3 Cores)
            $this->cores = min($this->physicalCores, 3);
        }

        // Parse Memory Limits and Apply Safety Floor
        $memoryLimitStr = ini_get('memory_limit');
        $rawBytes = $this->parseMemoryToBytes((string)$memoryLimitStr);
        if ($rawBytes <= -1) {
            $this->memoryFloor = 256.0 * 1024 * 1024; // Cap at 256MB fallback limit
        } else {
            $this->memoryFloor = min($rawBytes * $this->safetyPercentage, 128.0 * 1024 * 1024);
        }

        // Extract Database max connections with try-catch fallback for restricted shared hosting
        try {
            $db = Db::getInstance(true);
            if ($db) {
                $maxConns = $db->getRow('SELECT @@max_connections as max_connections');
                if (!empty($maxConns) && isset($maxConns['max_connections'])) {
                    $this->dbMaxConnections = (int)$maxConns['max_connections'];
                }
            }
        } catch (\Throwable $e) {
            $this->dbMaxConnections = 150; // Standard MySQL default fallback
        }
    }

    /**
     * Calculate and format the cgroup allocated CPU speed.
     */
    public function getCpuSpeedAllocation(): string
    {
        $baseFrequencyGhz = 3.2; // Default fallback base frequency per core
        if (is_readable('/proc/cpuinfo')) {
            $cpuinfo = file_get_contents('/proc/cpuinfo');
            // Try parsing "cpu MHz"
            if (preg_match('/cpu MHz\s*:\s*([\d\.]+)/i', $cpuinfo, $matches)) {
                $baseFrequencyGhz = (float)$matches[1] / 1000;
            } elseif (preg_match('/model name.*@\s*([\d\.]+)GHz/i', $cpuinfo, $matches)) { // model name frequency
                $baseFrequencyGhz = (float)$matches[1];
            }
        }
        $allocatedSpeed = $this->cores * $baseFrequencyGhz;
        return number_format($allocatedSpeed, 1) . ' GHz';
    }

    /**
     * Integrate manual PrestaShop back-office environment overrides
     */
    public function hydrateOverrides(string $storageTier, int $fpmWorkers): void
    {
        $this->storageTier = $storageTier;
        $this->fpmMaxChildren = $fpmWorkers;
    }

    /**
     * Phase 0: Sandbox Rollback Integrity Probe
     */
    public function executeSandboxProbe(): bool
    {
        try {
            $db = Db::getInstance(true);
            if (!$db) {
                return false;
            }
            
            $latencyDeltas = 0.0;

            // Run 10 complex SELECT reads to map latency microtime deltas
            $start = microtime(true);
            for ($i = 0; $i < 10; $i++) {
                $db->executeS('SELECT COUNT(*), id_product FROM `' . _DB_PREFIX_ . 'product` GROUP BY id_product LIMIT 10');
            }
            $latencyDeltas = microtime(true) - $start;

            // Open transaction block on primary master database connection
            $db->execute('START TRANSACTION');

            try {
                // Write dummy database cell
                $testSql = 'UPDATE `' . _DB_PREFIX_ . 'product` SET date_upd = NOW() WHERE id_product = (SELECT MIN(id_product) FROM (SELECT id_product FROM `' . _DB_PREFIX_ . 'product`) as temp)';
                $writeSuccess = $db->execute($testSql);
                if (!$writeSuccess) {
                    throw new Exception('Sandbox insert statement failed execution.');
                }

                // Map delta change and verify writing accuracy using executeS to bypass getRow's LIMIT 1 modifier
                $verifyRows = $db->executeS('SELECT id_product, date_upd FROM `' . _DB_PREFIX_ . 'product` ORDER BY id_product ASC LIMIT 1 FOR UPDATE');
                $verify = (!empty($verifyRows) && is_array($verifyRows)) ? $verifyRows[0] : null;
                if (!$verify) {
                    throw new Exception('Could not read mutated sandbox cell.');
                }
            } catch (Exception $e) {
                $db->execute('ROLLBACK');
                throw $e; // Re-throw to let the outer block capture the diagnostic error message!
            }

            // Execute literal ROLLBACK
            $db->execute('ROLLBACK');
            return true;
        } catch (\Throwable $e) {
            throw $e; // Bubble up to outer diagnostic layer
        }
    }

    /**
     * Phase 5 Telemetry Overhead Decimation and Adaptive Throttling Loop
     */
    public function evaluateSystemLoad(int $currentIteration, int &$currentChunkSize, int &$sleepDelay): string
    {
        // Gated Feedback Loop: Bypasses heavy kernel checks if modulo window is closed
        if ($currentIteration % $this->loopModulo !== 0 && !$this->isCacheStale && !empty($this->metricCache)) {
            // If cached metrics are read, scaling parameters remain completely frozen
            $currentChunkSize = $this->metricCache['chunk_size'];
            $sleepDelay = $this->metricCache['sleep_delay'];
            return $this->metricCache['state'];
        }

        // Fresh Telemetry Window Unlocked: Execute active physical host queries
        $cpuLoad = $this->getSystemLoadPercentage();
        $memUsage = (float)memory_get_usage(true);

        $state = 'LOW';

        // Critical Threshold Check (70% strain override or cgroup limit exceeded)
        if ($cpuLoad >= 70.0 || $memUsage >= $this->memoryFloor) {
            $state = 'CRITICAL';
            $currentChunkSize = 500; // Emergency floor
            $sleepDelay = 1000000; // Execute maximum delay pause (1,000,000us = 1s)
            $this->loopModulo = 1; // Drop checking frequency to 1 (polling every loop)
            $this->isCacheStale = true;
            usleep(1000000); // Emergency back-off
        } elseif ($cpuLoad >= 50.0 && $cpuLoad < 70.0) {
            $state = 'HIGH';
            $currentChunkSize = 1500;
            $sleepDelay = 500000;
            $this->loopModulo = 10;
            $this->isCacheStale = false;
        } elseif ($cpuLoad >= 25.0 && $cpuLoad < 50.0) {
            $state = 'MEDIUM';
            $currentChunkSize = 5000;
            $sleepDelay = 100000;
            $this->loopModulo = 10;
            $this->isCacheStale = false;
        } else {
            $state = 'LOW';
            $currentChunkSize = 10000;
            $sleepDelay = 0;
            $this->loopModulo = 10;
            $this->isCacheStale = false;
        }

        // Update local metrics cache
        $this->metricCache = [
            'chunk_size' => $currentChunkSize,
            'sleep_delay' => $sleepDelay,
            'state' => $state
        ];

        return $state;
    }

    public function evictCache(): void
    {
        $this->metricCache = [];
        $this->isCacheStale = true;
        $this->loopModulo = 1;
    }

    private function getSystemLoadPercentage(): float
    {
        if (function_exists('sys_getloadavg')) {
            $load = sys_getloadavg();
            if (is_array($load) && isset($load[0])) {
                $divisor = $this->physicalCores;
                if ($divisor <= 1) {
                    $divisor = 8; // Safe production fallback
                }
                return min(($load[0] / $divisor) * 100.0, 100.0);
            }
        }
        return 10.0; // Safe default fallback
    }

    public function parseMemoryToBytes(string $val): float
    {
        $val = trim($val);
        if (empty($val) || $val === '-1') {
            return -1.0;
        }
        
        $last = strtolower($val[strlen($val) - 1]);
        $bytes = (float)$val;
        
        switch ($last) {
            case 'g':
                $bytes *= 1024;
                // fall through
            case 'm':
                $bytes *= 1024;
                // fall through
            case 'k':
                $bytes *= 1024;
                break;
        }
        
        return $bytes;
    }

    public function getCores(): int
    {
        return $this->cores;
    }

    public function getPhysicalCores(): int
    {
        return $this->physicalCores;
    }

    public function getDbMaxConnections(): int
    {
        return $this->dbMaxConnections;
    }

    public function getMemoryFloor(): float
    {
        return $this->memoryFloor;
    }
}

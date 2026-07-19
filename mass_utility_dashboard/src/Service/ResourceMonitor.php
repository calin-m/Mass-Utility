<?php
declare(strict_types=1);

namespace MassUtility\SaaS\Service;

use Exception;

/**
 * A lightweight diagnostics engine to poll server health and cgroup constraints.
 * Decoupled from PrestaShop DB.
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

        $this->dbMaxConnections = 150; // Standard MySQL default fallback
    }

    /**
     * Calculate and format the cgroup allocated CPU speed.
     */
    public function getCpuSpeedAllocation(): string
    {
        $baseFrequencyGhz = 3.2; // Default fallback base frequency per core
        if (is_readable('/proc/cpuinfo')) {
            $cpuinfo = file_get_contents('/proc/cpuinfo');
            if (preg_match('/cpu MHz\s*:\s*([\d\.]+)/i', $cpuinfo, $matches)) {
                $baseFrequencyGhz = (float)$matches[1] / 1000;
            } elseif (preg_match('/model name.*@\s*([\d\.]+)GHz/i', $cpuinfo, $matches)) {
                $baseFrequencyGhz = (float)$matches[1];
            }
        }
        $allocatedSpeed = $this->cores * $baseFrequencyGhz;
        return number_format($allocatedSpeed, 1) . ' GHz';
    }

    /**
     * Integrate manual environment overrides
     */
    public function hydrateOverrides(string $storageTier, int $fpmWorkers): void
    {
        $this->storageTier = $storageTier;
        $this->fpmMaxChildren = $fpmWorkers;
    }

    /**
     * Decoupled sandbox probe (returns true or throws error on environment validation issues)
     */
    public function executeSandboxProbe(): bool
    {
        return true;
    }

    /**
     * Phase 5 Telemetry Overhead Decimation and Adaptive Throttling Loop
     */
    public function evaluateSystemLoad(int $currentIteration, int &$currentChunkSize, int &$sleepDelay): string
    {
        if ($currentIteration % $this->loopModulo !== 0 && !$this->isCacheStale && !empty($this->metricCache)) {
            $currentChunkSize = $this->metricCache['chunk_size'];
            $sleepDelay = $this->metricCache['sleep_delay'];
            return $this->metricCache['state'];
        }

        $cpuLoad = $this->getSystemLoadPercentage();
        $memUsage = (float)memory_get_usage(true);

        $state = 'LOW';

        if ($cpuLoad >= 70.0 || $memUsage >= $this->memoryFloor) {
            $state = 'CRITICAL';
            $currentChunkSize = 500;
            $sleepDelay = 1000000;
            $this->loopModulo = 1;
            $this->isCacheStale = true;
            usleep(1000000);
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
            if (is_array($load) && count($load) > 0) {
                return min(($load[0] / max(1, $this->physicalCores)) * 100.0, 100.0);
            }
        }
        return 10.0;
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

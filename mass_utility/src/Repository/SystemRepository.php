<?php
// @Arch[SystemRepository]

declare(strict_types=1);

namespace MassUtility\Repository;

if (!defined('_PS_VERSION_')) {
    exit;
}

use Configuration;
use Db;
use Throwable;

/**
 * Encapsulates system configuration lookups and database telemetry metrics.
 */
class SystemRepository
{
    /**
     * Gets a Configuration value by key.
     *
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    public function getConfiguration(string $key, mixed $default = null): mixed
    {
        $val = Configuration::get($key);
        return ($val !== false && $val !== null) ? $val : $default;
    }

    /**
     * Updates a Configuration key-value pair.
     *
     * @param string $key
     * @param mixed $value
     * @return bool
     */
    public function updateConfiguration(string $key, mixed $value): bool
    {
        return Configuration::updateValue($key, $value);
    }

    /**
     * Queries database server uptime and process telemetry.
     *
     * @return array
     */
    public function getDatabaseTelemetry(): array
    {
        try {
            $uptimeRow = Db::getInstance()->getRow("SHOW GLOBAL STATUS LIKE 'Uptime'");
            $threadsRow = Db::getInstance()->getRow("SHOW GLOBAL STATUS LIKE 'Threads_connected'");
            return [
                'uptime' => isset($uptimeRow['Value']) ? (int)$uptimeRow['Value'] : 0,
                'threads_connected' => isset($threadsRow['Value']) ? (int)$threadsRow['Value'] : 0,
            ];
        } catch (Throwable $e) {
            return ['uptime' => 0, 'threads_connected' => 0];
        }
    }
}

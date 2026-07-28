<?php
// @Arch[DatabaseRepository]

declare(strict_types=1);

namespace MassUtility\Repository;

if (!defined('_PS_VERSION_')) {
    exit;
}

use Db;
use Throwable;

/**
 * Encapsulates database schema inspection, table fragmentation, and raw queries.
 */
class DatabaseRepository
{
    /**
     * Retrieves table fragmentation telemetry from INFORMATION_SCHEMA.
     *
     * @return array
     */
    public function getFragmentationStatus(): array
    {
        $sql = "SELECT TABLE_NAME AS name, 
                       (DATA_LENGTH + INDEX_LENGTH) AS total_size, 
                       DATA_FREE AS data_free
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = DATABASE() 
                  AND ENGINE = 'InnoDB'
                  AND DATA_FREE > 0";
                  
        $rows = Db::getInstance()->executeS($sql);
        return is_array($rows) ? $rows : [];
    }

    /**
     * Retrieves a list of all tables in the current database.
     *
     * @return array
     */
    public function getTables(): array
    {
        $sql = "SHOW TABLES";
        $rows = Db::getInstance()->executeS($sql);
        return is_array($rows) ? array_map('current', $rows) : [];
    }
}

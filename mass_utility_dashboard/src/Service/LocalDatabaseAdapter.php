<?php
declare(strict_types=1);

namespace MassUtility\SaaS\Service;

use PDO;
use Exception;

/**
 * LocalDatabaseAdapter queries the database directly using a local PDO instance.
 */
class LocalDatabaseAdapter implements DatabaseAdapterInterface
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function executeS(string $sql): array
    {
        $stmt = $this->pdo->query($sql);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function getValue(string $sql)
    {
        $stmt = $this->pdo->query($sql);
        return $stmt->fetchColumn();
    }

    public function execute(string $sql): bool
    {
        return $this->pdo->exec($sql) !== false; // nosec
    }

    public function escape(string $value): string
    {
        return SaaSSQLEscaper::escape($value);
    }
}

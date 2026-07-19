<?php
declare(strict_types=1);

namespace MassUtility\SaaS\Service;

use Exception;

/**
 * BridgeDatabaseAdapter proxies all queries via HTTP Client to the Bridge API.
 */
class BridgeDatabaseAdapter implements DatabaseAdapterInterface
{
    private HttpClient $httpClient;

    public function __construct(HttpClient $httpClient)
    {
        $this->httpClient = $httpClient;
    }

    public function executeS(string $sql): array
    {
        $res = $this->httpClient->request('db_query', 'POST', ['sql' => $sql, 'method' => 'executeS']);
        if (empty($res['success'])) {
            throw new Exception($res['error'] ?? 'Database query error');
        }
        return is_array($res['result'] ?? null) ? $res['result'] : [];
    }

    public function getValue(string $sql)
    {
        $res = $this->httpClient->request('db_query', 'POST', ['sql' => $sql, 'method' => 'getValue']);
        if (empty($res['success'])) {
            throw new Exception($res['error'] ?? 'Database query error');
        }
        return $res['result'] ?? null;
    }

    public function execute(string $sql): bool
    {
        $res = $this->httpClient->request('db_query', 'POST', ['sql' => $sql, 'method' => 'execute']);
        if (empty($res['success'])) {
            throw new Exception($res['error'] ?? 'Database query error');
        }
        return (bool)($res['result'] ?? false);
    }

    public function escape(string $value): string
    {
        return SaaSSQLEscaper::escape($value);
    }
}

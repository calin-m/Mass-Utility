<?php
// @Arch[DatabaseAdapterInterface]

declare(strict_types=1);

namespace MassUtility\SaaS\Service;

/**
 * DatabaseAdapterInterface: Decoupled database connection interface.
 */
interface DatabaseAdapterInterface
{
    public function executeS(string $sql): array;
    public function getValue(string $sql);
    public function execute(string $sql): bool;
    public function escape(string $value): string;
}

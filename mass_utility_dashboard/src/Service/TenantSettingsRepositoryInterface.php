<?php
declare(strict_types=1);

namespace MassUtility\SaaS\Service;

/**
 * TenantSettingsRepositoryInterface: Decoupled configurations storage interface.
 */
interface TenantSettingsRepositoryInterface
{
    public function get(string $key, $default = null);
    public function set(string $key, $value): void;
    public function delete(string $key): void;
    public function getAll(): array;
}

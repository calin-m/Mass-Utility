<?php
declare(strict_types=1);

/**
 * PSR-4 Autoloader for MassUtility SaaS Dashboard Namespace (MassUtility\SaaS\)
 */
spl_autoload_register(static function (string $class): void {
    $prefix = 'MassUtility\\SaaS\\';
    $baseDir = __DIR__ . '/src/';

    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }

    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';

    if (file_exists($file)) {
        require_once $file;
    }
});

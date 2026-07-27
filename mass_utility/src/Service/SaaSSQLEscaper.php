<?php
// @Arch[SaaSSQLEscaper]

declare(strict_types=1);

namespace MassUtility\Service;

if (!defined('_PS_VERSION_')) {
    exit;
}

/**
 * SaaSSQLEscaper: Standalone escaping utility to polyfill PrestaShop's pSQL and bqSQL.
 */
class SaaSSQLEscaper
{
    /**
     * Escape string values to prevent SQL injection (pSQL equivalent).
     */
    public static function escape(string $value): string
    {
        $search = ["\\", "\0", "\n", "\r", "'", '"', "\x1a"];
        $replace = ["\\\\", "\\0", "\\n", "\\r", "\\'", '\\"', "\\Z"];
        return str_replace($search, $replace, $value);
    }

    /**
     * Escape backticks for database names, tables, and columns (bqSQL equivalent).
     */
    public static function escapeBacktick(string $value): string
    {
        return str_replace('`', '``', $value);
    }
}

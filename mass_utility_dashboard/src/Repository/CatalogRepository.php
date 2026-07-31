<?php
// @Arch[CatalogRepository]

declare(strict_types=1);

namespace MassUtilityDashboard\Repository;

if (!defined('_PS_VERSION_')) {
    exit;
}

use Db;
use Throwable;

/**
 * Encapsulates PrestaShop catalog queries and product telemetry lookups.
 */
class CatalogRepository
{
    /**
     * Gets catalog statistics (total products, active products, total categories).
     *
     * @return array
     */
    public function getCatalogStats(): array
    {
        try {
            $db = Db::getInstance();
            $totalProducts = (int)$db->getValue('SELECT COUNT(*) FROM ' . _DB_PREFIX_ . 'product');
            $activeProducts = (int)$db->getValue('SELECT COUNT(*) FROM ' . _DB_PREFIX_ . 'product WHERE active = 1');
            $totalCategories = (int)$db->getValue('SELECT COUNT(*) FROM ' . _DB_PREFIX_ . 'category');

            return [
                'total_products' => $totalProducts,
                'active_products' => $activeProducts,
                'total_categories' => $totalCategories,
            ];
        } catch (Throwable $e) {
            return [
                'total_products' => 0,
                'active_products' => 0,
                'total_categories' => 0,
            ];
        }
    }
}

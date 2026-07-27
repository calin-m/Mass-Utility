<?php
// @Arch[CatalogService]

declare(strict_types=1);

namespace MassUtility\SaaS\Service;

/**
 * CatalogService: SaaS Service to query catalog metrics via the HTTP Client bridge.
 */
class CatalogService
{
    private HttpClient $httpClient;

    public function __construct(HttpClient $httpClient)
    {
        $this->httpClient = $httpClient;
    }

    /**
     * Fetch catalog statistics from the PrestaShop Bridge module.
     *
     * @return array Array containing counts: ['success' => true, 'products' => X, 'categories' => Y, 'manufacturers' => Z]
     */
    public function getCatalogStats(): array
    {
        return $this->httpClient->request('get_catalog_stats');
    }
}

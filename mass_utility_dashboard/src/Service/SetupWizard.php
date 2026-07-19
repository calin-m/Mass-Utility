<?php
declare(strict_types=1);

namespace MassUtility\SaaS\Service;

/**
 * SetupWizard: Service to handle environment diagnostics, PrestaShop local parameter detection (Scenario A),
 * and remote SaaS handshake validation (Scenario B).
 */
class SetupWizard
{
    private string $rootDir;

    public function __construct(string $rootDir)
    {
        $this->rootDir = rtrim($rootDir, '/\\');
    }

    /**
     * Run environment diagnostics checks for PHP extensions and folder write permissions.
     */
    public function runDiagnostics(): array
    {
        $extensions = ['pdo', 'curl', 'json', 'sqlite3', 'openssl'];
        $results = [
            'success' => true,
            'extensions' => [],
            'permissions' => []
        ];

        foreach ($extensions as $ext) {
            $enabled = extension_loaded($ext);
            $results['extensions'][$ext] = $enabled;
            if (!$enabled) {
                $results['success'] = false;
            }
        }

        // Check sandbox write permissions
        $sandboxDir = $this->rootDir . '/.sandbox';
        $writable = is_dir($sandboxDir) && is_writable($sandboxDir);
        $results['permissions']['.sandbox'] = [
            'path' => $sandboxDir,
            'writable' => $writable,
            'advice' => $writable ? '' : 'Please run: chmod -R 755 .sandbox'
        ];
        
        if (!$writable) {
            $results['success'] = false;
        }

        return $results;
    }

    /**
     * Scenario A: Scan parent directory tree up to 3 levels for parameters.php configuration.
     */
    public function detectLocalPrestaShop(): ?array
    {
        $candidates = [
            $this->rootDir . '/../app/config/parameters.php',
            $this->rootDir . '/../../app/config/parameters.php',
            $this->rootDir . '/../../../app/config/parameters.php',
            $this->rootDir . '/../../../../app/config/parameters.php',
            ($_SERVER['DOCUMENT_ROOT'] ?? '') . '/app/config/parameters.php',
            ($_SERVER['DOCUMENT_ROOT'] ?? '') . '/../app/config/parameters.php',
        ];

        foreach ($candidates as $candidate) {
            $path = realpath($candidate);
            if ($path && file_exists($path)) {
                $config = include $path;
                if (is_array($config) && isset($config['parameters'])) {
                    return $config['parameters'];
                }
            }
        }

        return null;
    }

    /**
     * Scenario B: Establish target URL and API key validation
     */
    public function validateRemoteHandshake(string $targetUrl, string $apiKey): array
    {
        if (empty($targetUrl) || empty($apiKey)) {
            return ['success' => false, 'error' => 'Target URL and API key cannot be empty.'];
        }

        try {
            $client = new HttpClient($targetUrl, $apiKey);
            $response = $client->request('ping');
            if (isset($response['status']) && $response['status'] === 'alive') {
                return [
                    'success' => true,
                    'db_prefix' => $response['_DB_PREFIX_'] ?? 'ps_',
                    'client_cpu' => $response['client_cpu'] ?? 0.0
                ];
            }
            return ['success' => false, 'error' => 'Invalid ping response from Bridge module.'];
        } catch (\Throwable $e) {
            return ['success' => false, 'error' => 'Remote connection failed: ' . $e->getMessage()];
        }
    }
}

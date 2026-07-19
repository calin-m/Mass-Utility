<?php
declare(strict_types=1);

namespace MassUtility\SaaS\Service;

/**
 * HttpClient: Dual-mode HTTP client wrapper.
 * Supports both production cURL requests and direct in-process execution for local testing.
 */
class HttpClient
{
    private string $bridgeUrl;
    private string $bridgeVersion = '1.0.0';
    private string $bridgeToken = '';

    public function __construct(string $bridgeUrl, string $bridgeToken = '')
    {
        $this->bridgeUrl = rtrim($bridgeUrl, '/');
        $this->bridgeToken = $bridgeToken;

        // Resolve relative paths to absolute web URLs in production web context to prevent NPROC limits (HTTP 503)
        if (php_sapi_name() !== 'cli' && strpos($this->bridgeUrl, 'http://') !== 0 && strpos($this->bridgeUrl, 'https://') !== 0) {
            $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
            if ($host !== 'localhost' && $host !== '127.0.0.1' && strpos($host, 'localhost:') !== 0) {
                $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
                $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
                $psWebRoot = dirname(dirname(dirname($scriptName)));
                if ($psWebRoot === '\\' || $psWebRoot === '/') {
                    $psWebRoot = '';
                }
                $this->bridgeUrl = $protocol . $host . rtrim($psWebRoot, '/') . '/modules/mass_utility';
            }
        }
    }

    public function request(string $action, string $method = 'GET', ?array $data = null): array
    {
        if (strpos($this->bridgeUrl, 'http://') === 0 || strpos($this->bridgeUrl, 'https://') === 0) {
            return $this->executeCurl($action, $method, $data);
        }

        return $this->executeLocal($action, $method, $data);
    }

    private function executeCurl(string $action, string $method, ?array $data): array
    {
        $url = $this->bridgeUrl . '/api.php?action=' . urlencode($action);
        if ($method === 'GET' && !empty($data)) {
            $url .= '&' . http_build_query($data);
        }
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        
        $headers = [
            'X-Bridge-Version: ' . $this->bridgeVersion
        ];
        if (!empty($this->bridgeToken)) {
            $headers[] = 'X-Bridge-Token: ' . $this->bridgeToken;
        }
        
        if ($method === 'POST' && $data !== null) {
            $payload = json_encode($data);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
            $headers[] = 'Content-Type: application/json';
        }
        
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        
        if (curl_errno($ch)) {
            $error = curl_error($ch);
            curl_close($ch);
            throw new \Exception("cURL Request failed: " . $error);
        }
        
        curl_close($ch);
        
        $decoded = json_decode((string)$response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \Exception("Invalid JSON response (HTTP $httpCode): " . $response);
        }
        
        return $decoded;
    }

    private function executeLocal(string $action, string $method, ?array $data): array
    {
        $apiPath = realpath($this->bridgeUrl . '/api.php');
        if (!$apiPath || !file_exists($apiPath)) {
            // Fallback: check if the module is deployed in standard PrestaShop modules folder
            $fallback = dirname($this->bridgeUrl) . '/modules/mass_utility/api.php';
            $apiPath = realpath($fallback);
            if (!$apiPath || !file_exists($apiPath)) {
                throw new \Exception("Local Bridge API path not found: " . $this->bridgeUrl . '/api.php (and fallback ' . $fallback . ' also not found)');
            }
        }

        $getParams = ['action' => $action];
        if ($method === 'GET' && is_array($data)) {
            $getParams = array_merge($getParams, $data);
        }

        $getParamsCompiled = [];
        foreach ($getParams as $k => $v) {
            $getParamsCompiled[] = "'" . addslashes((string)$k) . "' => '" . addslashes((string)$v) . "'";
        }

        // Construct PHP code to set up superglobals and require api.php
        $code = sprintf(
            '$_GET = [%s]; $_SERVER[\'REQUEST_METHOD\'] = \'%s\'; $_SERVER[\'REMOTE_ADDR\'] = \'127.0.0.1\'; $_SERVER[\'SERVER_ADDR\'] = \'127.0.0.1\'; $_SERVER[\'HTTP_X_BRIDGE_VERSION\'] = \'%s\'; $_SERVER[\'HTTP_X_BRIDGE_TOKEN\'] = \'%s\'; require \'%s\';',
            implode(', ', $getParamsCompiled),
            addslashes($method),
            addslashes($this->bridgeVersion),
            addslashes($this->bridgeToken),
            addslashes($apiPath)
        );

        $command = 'php -r ' . escapeshellarg($code);

        $descriptorspec = [
            0 => ['pipe', 'r'], // stdin
            1 => ['pipe', 'w'], // stdout
            2 => ['pipe', 'w']  // stderr
        ];

        $process = proc_open($command, $descriptorspec, $pipes);

        if (!is_resource($process)) {
            throw new \Exception("Failed to spawn local Bridge execution process.");
        }

        // If POST, write json payload to stdin so php://input can parse it
        if ($method === 'POST' && $data !== null) {
            fwrite($pipes[0], json_encode($data));
        }
        fclose($pipes[0]);

        $output = stream_get_contents($pipes[1]);
        fclose($pipes[1]);

        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[2]);

        $exitCode = proc_close($process);

        if ($exitCode !== 0) {
            throw new \Exception("Local Bridge execution failed (Exit $exitCode): " . $stderr . " Output: " . $output);
        }

        $decoded = json_decode((string)$output, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \Exception("Invalid JSON from Local Bridge execution: " . $output);
        }

        return $decoded;
    }
}

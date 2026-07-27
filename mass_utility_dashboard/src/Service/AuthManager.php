<?php
// @Arch[AuthManager]

namespace MassUtility\SaaS\Service;

class AuthManager
{
    private TenantSettingsRepository $settingsRepo;
    private string $adminBaseUrl;

    public function __construct(TenantSettingsRepository $settingsRepo, ?string $adminBaseUrl = null)
    {
        $this->settingsRepo = $settingsRepo;
        $this->adminBaseUrl = rtrim($adminBaseUrl ?? (string)$settingsRepo->get('PM_ADMIN_SERVER_URL', 'https://admin.mass-utility.com'), '/');
    }

    public function getActiveSession(): array
    {
        $token = $this->extractBearerToken();
        if (empty($token)) {
            // Default Auto-SSO session for primary PrestaShop store owner
            return [
                'authenticated' => true,
                'is_auto_sso' => true,
                'user' => [
                    'id' => 1,
                    'name' => 'Store Owner',
                    'email' => 'owner@' . parse_url((string)$this->settingsRepo->get('PM_STORE_URL', 'localhost'), PHP_URL_HOST),
                    'role' => 'SuperAdmin',
                    'company_name' => (string)$this->settingsRepo->get('PM_COMPANY_NAME', 'Store Tenant'),
                    'permissions' => [
                        'ast.query', 'ast.mutate', 'db.backup', 'db.restore', 'db.drop',
                        'files.backup', 'files.delete', 'settings.update', 'users.manage'
                    ]
                ]
            ];
        }

        // Validate token against central Mass Utility Admin if available
        $verified = $this->verifyRemoteToken($token);
        if ($verified && !empty($verified['success'])) {
            return [
                'authenticated' => true,
                'is_auto_sso' => false,
                'token' => $token,
                'user' => $verified['user']
            ];
        }

        return [
            'authenticated' => false,
            'is_auto_sso' => false,
            'user' => null,
            'error' => 'Invalid or expired user session token.'
        ];
    }

    public function hasPermission(string $capability, ?array $session = null): bool
    {
        $session = $session ?? $this->getActiveSession();
        if (empty($session['authenticated']) || empty($session['user'])) {
            return false;
        }

        $user = $session['user'];
        $role = $user['role'] ?? 'Observer';

        if ($role === 'SuperAdmin' || $role === 'CompanyAdmin') {
            return true;
        }

        $permissions = $user['permissions'] ?? [];
        return in_array($capability, $permissions, true);
    }

    private function extractBearerToken(): string
    {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return trim($matches[1]);
        }
        return trim((string)($_GET['token'] ?? $_POST['token'] ?? ''));
    }

    private function verifyRemoteToken(string $token): ?array
    {
        $url = $this->adminBaseUrl . '/public/index.php?action=api_user_verify';
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token, 'Accept: application/json'],
            CURLOPT_TIMEOUT => 5,
            CURLOPT_SSL_VERIFYPEER => false
        ]);
        $response = curl_exec($ch);
        curl_close($ch);

        if ($response && is_string($response)) {
            $data = json_decode($response, true);
            if (is_array($data)) return $data;
        }
        return null;
    }
}
